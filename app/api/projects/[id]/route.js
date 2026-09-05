import { NextResponse } from 'next/server';
import projectService from '@/lib/services/projectService';
import { logActivity } from '@/lib/auditService';
import { withApiProtection } from '@/lib/withApiProtection';
import { APIResponse } from '@/lib/apiResponse';
import {
  canAccessProject,
  canAccessProjectOrAssignedWork,
  canUseProjectPermission,
  omitProjectBudget,
  redactProjectForAssignee,
} from '@/lib/projectAccess';
import ProjectRole from '@/models/ProjectRole';

export const GET = withApiProtection(async (request, context) => {
  const { user, params } = context;

  const projectId = params.id;
  const project = await projectService.getProjectById(projectId);

  if (!project) {
    return NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 });
  }

  if (!(await canAccessProjectOrAssignedWork(user, projectId))) {
    return APIResponse.forbidden();
  }

  const onRoster = await canAccessProject(user, projectId);
  const canSeeBudget = await canUseProjectPermission(user, projectId, 'voirBudget');
  let payload = canSeeBudget ? project : omitProjectBudget(project);
  if (!onRoster) {
    payload = redactProjectForAssignee(payload);
  }

  return NextResponse.json({ success: true, project: payload, data: payload });
});

export const PUT = withApiProtection(async (request, context) => {
  const { user, params } = context;

  const projectId = params.id;
  const data = await request.json();

  const project = await projectService.getProjectById(projectId);
  if (!project) {
    return NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 });
  }

  if (!(await canUseProjectPermission(user, projectId, 'modifierCharteProjet'))) {
    const memberOnlyUpdate = Object.keys(data).length === 1 && Array.isArray(data.membres);
    const canManageMembers = await canUseProjectPermission(user, projectId, [
      'gererMembresProjet',
      'modifierCharteProjet',
    ]);
    if (!(memberOnlyUpdate && canManageMembers)) {
      return APIResponse.forbidden('Accès refusé pour modifier ce projet');
    }
  }

  if (Array.isArray(data.membres)) {
    if (data.membres.some((member) => !member.project_role_id)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Chaque membre doit avoir un rôle projet de CE projet (pas un rôle système)',
        },
        { status: 422 }
      );
    }
    const roleIds = [...new Set(data.membres.map((member) => String(member.project_role_id)))];
    const roles = await ProjectRole.find({
      _id: { $in: roleIds },
      project_id: projectId,
    })
      .select('_id')
      .lean();
    if (roles.length !== roleIds.length) {
      return NextResponse.json(
        {
          success: false,
          error: 'Chaque membre doit avoir un rôle projet de CE projet (pas un rôle système)',
        },
        { status: 422 }
      );
    }
  }

  const updatedProject = await projectService.updateProject(projectId, data, user._id);
  if (!updatedProject) {
    return NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 });
  }

  await logActivity(
    user,
    'modification',
    'projet',
    projectId,
    `Modification du projet ${updatedProject.nom}`,
    {
      request,
      httpMethod: 'PUT',
      endpoint: `/projects/${projectId}`,
      httpStatus: 200,
    }
  );

  return NextResponse.json({ success: true, project: updatedProject, data: updatedProject });
});

export const DELETE = withApiProtection(async (request, context) => {
  const { user, params } = context;

  const projectId = params.id;

  if (!(await canUseProjectPermission(user, projectId, 'supprimerProjet'))) {
    return APIResponse.forbidden();
  }

  // Assuming a delete method or archive method
  await projectService.toggleArchiveProject(projectId, true);

  await logActivity(user, 'suppression', 'projet', projectId, `Archivage du projet ${projectId}`, {
    request,
    httpMethod: 'DELETE',
    endpoint: `/projects/${projectId}`,
    httpStatus: 200,
  });

  return NextResponse.json({ success: true });
});
