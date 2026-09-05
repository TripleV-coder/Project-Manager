import { promises as fs } from 'fs';
import path from 'path';
import { ALL_PERMISSIONS } from '@/lib/permissions';

const read = (relativePath) => fs.readFile(path.join(process.cwd(), relativePath), 'utf8');

describe('Audit RBAC — protections branchées dans les routes', () => {
  test('ALL_PERMISSIONS has 23 real keys and no phantom gererProjets/gererCommentaires', () => {
    expect(ALL_PERMISSIONS).toHaveLength(23);
    expect(ALL_PERMISSIONS).not.toContain('gererProjets');
    expect(ALL_PERMISSIONS).not.toContain('gererCommentaires');
  });

  test('POST /api/projects requires creerProjet and seeds project roles', async () => {
    const src = await read('app/api/projects/route.js');
    expect(src).toMatch(/requiredPermissions:\s*\['creerProjet',\s*'adminConfig'\]/);
    expect(src).toMatch(/initializeProjectRoles/);
    expect(src).toMatch(/isGlobalProjectReader/);
    expect(src).not.toMatch(/includes\('admin'\)/);
  });

  test('files/upload requires gererFichiers and project membership', async () => {
    const src = await read('app/api/files/upload/route.js');
    expect(src).toMatch(/requiredPermissions:\s*\['gererFichiers',\s*'adminConfig'\]/);
    expect(src).toMatch(/canUseProjectPermission\(user, projectId, 'gererFichiers'\)/);
    expect(src).toMatch(/resolveProjectIdForEntity/);
    expect(src).toMatch(/projet_id:\s*projectId/);
  });

  test('sprints are scoped by accessible projects on list and mutations', async () => {
    const list = await read('app/api/sprints/route.js');
    expect(list).toMatch(/getAccessibleProjectIds/);
    expect(list).toMatch(/canUseProjectPermission\(user, body\.projet_id, 'gererSprints'\)/);

    const byId = await read('app/api/sprints/[id]/route.js');
    expect(byId).toMatch(/canAccessProject/);
    expect(byId).toMatch(/canUseProjectPermission\(user, sprint\.projet_id, 'gererSprints'\)/);

    const start = await read('app/api/sprints/[id]/start/route.js');
    expect(start).toMatch(/withApiProtection/);
    expect(start).toMatch(/canUseProjectPermission\(user, sprint\.projet_id, 'gererSprints'\)/);

    const end = await read('app/api/sprints/[id]/end/route.js');
    expect(end).toMatch(/withApiProtection/);
    expect(end).toMatch(/canUseProjectPermission\(user, sprint\.projet_id, 'gererSprints'\)/);
  });

  test('GET /api/roles requires adminConfig', async () => {
    const src = await read('app/api/roles/route.js');
    expect(src).toMatch(/requiredPermissions:\s*\['adminConfig'\]/);
  });

  test('comments are scoped to the related project and use commenter', async () => {
    const src = await read('app/api/comments/route.js');
    expect(src).toMatch(/buildAccessibleEntityConditions/);
    expect(src).toMatch(/canUseProjectPermission\(user, projectId, 'commenter'\)/);
    expect(src).not.toMatch(/gererCommentaires/);

    const byId = await read('app/api/comments/[id]/route.js');
    expect(byId).toMatch(/canUseProjectPermission\(user, projectId, 'commenter'\)/);
    expect(byId).not.toMatch(/gererCommentaires/);
  });

  test('deliverables no longer use the nonexistent gererProjets key', async () => {
    const src = await read('app/api/deliverables/route.js');
    expect(src).not.toMatch(/gererProjets/);
    expect(src).toMatch(
      /canUseProjectPermission\(user, body\.projet_id, \[\s*'modifierCharteProjet',\s*'validerLivrable',?\s*\]\)/
    );
    expect(src).toMatch(/getAccessibleProjectIds/);
  });

  test('audit routes sit behind withApiProtection + voirAudit', async () => {
    const files = [
      'app/api/audit/route.js',
      'app/api/audit/export/route.js',
      'app/api/audit/actions/route.js',
      'app/api/audit/stats/route.js',
      'app/api/audit/summary/route.js',
      'app/api/audit/user/[userId]/route.js',
    ];
    for (const file of files) {
      const src = await read(file);
      expect(src).toMatch(/withApiProtection/);
      expect(src).toMatch(/voirAudit/);
      expect(src).toMatch(/rateLimitPreset:\s*'sensitive'/);
    }
  });

  test('first-admin seeds the 10 system roles and default templates', async () => {
    const src = await read('app/api/auth/first-admin/route.js');
    expect(src).toMatch(/ensurePredefinedSystemRoles/);
    expect(src).toMatch(/ensureDefaultProjectTemplates/);
    expect(src).not.toMatch(/initializeProjectRoles\(\)/);
  });

  test('timesheets mutations require project-level saisirTemps', async () => {
    const src = await read('app/api/timesheets/route.js');
    expect(src).toMatch(/canUseProjectPermission\(user, task\.projet_id, 'saisirTemps'\)/);
    expect(src).toMatch(/getAccessibleProjectIds/);
  });

  test('task assignment is limited to the project roster and assignees can still see their work', async () => {
    const createSrc = await read('app/api/tasks/route.js');
    expect(createSrc).toMatch(/validateTaskCommandChain/);
    expect(createSrc).toMatch(/assigné_à: user\._id/);
    expect(createSrc).toMatch(/notifyTaskAssigned/);

    const formSrc = await read('hooks/useItemFormData.js');
    expect(formSrc).toMatch(/extractAssignableUsers/);
    expect(formSrc).not.toMatch(/\/api\/users\?limit/);

    const moveSrc = await read('app/api/tasks/[id]/move/route.js');
    expect(moveSrc).toMatch(/isSameUser\(task\.assigné_à, user\._id\)/);
  });

  test('GET /api/users is available to chefs (gererMembresProjet) without exposing full admin fields', async () => {
    const src = await read('app/api/users/route.js');
    expect(src).toMatch(/gererMembresProjet/);
    expect(src).toMatch(/creerProjet/);
    expect(src).toMatch(/status: 'Actif'/);
  });

  test('project roles come from ProjectRole of that project, not system Role', async () => {
    const src = await read('app/api/projects/[id]/roles/route.js');
    expect(src).toMatch(/initializeProjectRoles/);
    expect(src).toMatch(/ProjectRole\.find\(\{ project_id: projectId \}\)/);

    const page = await read('app/dashboard/projects/[id]/page.js');
    expect(page).toMatch(/\/api\/projects\/\$\{projectId\}\/roles/);
    expect(page).not.toMatch(/authFetch\('\/api\/roles'/);

    const put = await read('app/api/projects/[id]/route.js');
    expect(put).toMatch(/pas un rôle système/);
    expect(put).toMatch(/!member\.project_role_id/);
    expect(put).not.toMatch(/roleIds\.length > 0/);
  });

  test('files upload accepts projet_id / deliverable_id aliases and exposes download/delete/folder', async () => {
    const upload = await read('app/api/files/upload/route.js');
    expect(upload).toMatch(/formData\.get\('projet_id'\)/);
    expect(upload).toMatch(/deliverable_id/);
    expect(upload).toMatch(/entity_type = 'projet'/);

    const list = await read('app/api/files/route.js');
    expect(list).toMatch(/projet_id/);
    expect(list).toMatch(/canAccessProjectOrAssignedWork/);

    const download = await read('app/api/files/[id]/download/route.js');
    expect(download).toMatch(/canAccessProjectOrAssignedWork/);

    const del = await read('app/api/files/[id]/route.js');
    expect(del).toMatch(/export const DELETE/);
    expect(del).toMatch(/gererFichiers/);

    const folder = await read('app/api/files/folder/route.js');
    expect(folder).toMatch(/application\/x-directory/);
  });

  test('UI-called status/read/budget/template routes exist with RBAC', async () => {
    const notif = await read('app/api/notifications/[id]/read/route.js');
    expect(notif).toMatch(/export \{ PUT \}/);

    const tsStatus = await read('app/api/timesheets/[id]/status/route.js');
    expect(tsStatus).toMatch(/timesheetStatusSchema/);
    expect(tsStatus).toMatch(/voirTempsPasses/);

    const expStatus = await read('app/api/expenses/[id]/status/route.js');
    expect(expStatus).toMatch(/expenseStatusSchema/);
    expect(expStatus).toMatch(/modifierBudget/);

    const budget = await read('app/api/budget/projects/[id]/route.js');
    expect(budget).toMatch(/modifierBudget/);

    const initTpl = await read('app/api/init-default-template/route.js');
    expect(initTpl).toMatch(/ensureDefaultProjectTemplates/);

    const timesheets = await read('app/api/timesheets/route.js');
    expect(timesheets).toMatch(/tâche_id/);
    expect(timesheets).toMatch(/utilisateur/);

    const expenses = await read('app/api/expenses/route.js');
    expect(expenses).toMatch(/project_id/);
    expect(expenses).toMatch(/voirBudget/);
    expect(expenses).toMatch(/canUseProjectPermission\(user, projectId, 'voirBudget'\)/);
    expect(expenses).toMatch(/populate\('saisi_par'/);
    expect(expenses).toMatch(/sort\(\{ date_dépense:/);
    expect(expenses).not.toMatch(/populate\('soumis_par'/);
  });

  test('SharePoint routes persist config and call the Graph service instead of returning 501', async () => {
    const config = await read('app/api/sharepoint/config/route.js');
    expect(config).toMatch(/SharePointConfig\.getConfig/);
    expect(config).toMatch(/SharePointConfig\.updateConfig/);
    expect(config).not.toMatch(/501/);

    const testConn = await read('app/api/sharepoint/test/route.js');
    expect(testConn).toMatch(/testConnectionWithConfig/);
    expect(testConn).not.toMatch(/501/);

    const sync = await read('app/api/sharepoint/sync/route.js');
    expect(sync).toMatch(/syncAllProjects/);
    expect(sync).not.toMatch(/501/);
  });

  test('sidebar menus on /api/auth/me merge the project role', async () => {
    const src = await read('app/api/auth/me/route.js');
    expect(src).toMatch(/serializeUserWithProjectMenus/);
  });

  test('assignee outside the roster does not receive the full project or sprint payload', async () => {
    const project = await read('app/api/projects/[id]/route.js');
    expect(project).toMatch(/redactProjectForAssignee/);
    expect(project).toMatch(/canAccessProject\(user, projectId\)/);

    const sprint = await read('app/api/sprints/[id]/route.js');
    expect(sprint).toMatch(/isSameUser\(task\.assigné_à, user\._id\)/);

    const roles = await read('app/api/projects/[id]/roles/route.js');
    expect(roles).toMatch(/canAccessProject\(user, projectId\)/);
    expect(roles).not.toMatch(/canAccessProjectOrAssignedWork/);
  });

  test('remaining authenticated routes sit behind withApiProtection', async () => {
    const files = [
      'app/api/activity/route.js',
      'app/api/notifications/read-all/route.js',
      'app/api/project-templates/route.js',
      'app/api/push/subscribe/route.js',
      'app/api/push/unsubscribe/route.js',
      'app/api/users/[id]/reset-password/route.js',
    ];
    for (const file of files) {
      const src = await read(file);
      expect(src).toMatch(/withApiProtection/);
      expect(src).not.toMatch(/authenticateRequest/);
    }

    const vapid = await read('app/api/push/vapid-key/route.js');
    expect(vapid).toMatch(/withApiProtection/);
    expect(vapid).toMatch(/requireAuth:\s*false/);
  });
});
