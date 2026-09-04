import Project from '@/models/Project';
import ProjectRole from '@/models/ProjectRole';
import Task from '@/models/Task';
import Deliverable from '@/models/Deliverable';
import Sprint from '@/models/Sprint';
import Comment from '@/models/Comment';
import {
  isGlobalProjectReader,
  isSystemAdmin,
  isProjectMember,
  canAccessProject,
  canAccessProjectOrAssignedWork,
  canUseProjectPermission,
  getAccessibleProjectIds,
  resolveProjectIdForEntity,
  buildAccessibleEntityConditions,
  canViewTask,
  validateTaskCommandChain,
  canSeeBudgets,
  omitProjectBudget,
  redactProjectForAssignee,
} from '@/lib/projectAccess';

const chain = (value) => ({
  select: jest.fn().mockReturnThis(),
  lean: jest.fn().mockResolvedValue(value),
  sort: jest.fn().mockReturnThis(),
});

const admin = {
  _id: 'admin-1',
  role_id: { permissions: { adminConfig: true, voirTousProjets: true, gererSprints: true } },
};

const chefSystem = {
  _id: 'chef-1',
  role_id: { permissions: { gererSprints: true, voirSesProjets: true } },
};

const outsiderWithSprintPerm = {
  _id: 'outsider-1',
  role_id: { permissions: { gererSprints: true, voirSesProjets: true } },
};

describe('projectAccess', () => {
  beforeEach(() => {
    Project.findById.mockImplementation(() => chain(null));
    Project.find.mockImplementation(() => chain([]));
    ProjectRole.findById.mockImplementation(() => chain(null));
    Task.findById.mockImplementation(() => chain(null));
    Task.find.mockImplementation(() => chain([]));
    Deliverable.findById.mockImplementation(() => chain(null));
    Deliverable.find.mockImplementation(() => chain([]));
    Sprint.findById.mockImplementation(() => chain(null));
    Sprint.find.mockImplementation(() => chain([]));
    Comment.findById.mockImplementation(() => chain(null));
  });

  describe('isGlobalProjectReader / isSystemAdmin', () => {
    test('adminConfig grants global read and admin', () => {
      expect(isGlobalProjectReader(admin)).toBe(true);
      expect(isSystemAdmin(admin)).toBe(true);
    });

    test('voirTousProjets grants global read but not admin', () => {
      const viewer = { role_id: { permissions: { voirTousProjets: true } } };
      expect(isGlobalProjectReader(viewer)).toBe(true);
      expect(isSystemAdmin(viewer)).toBe(false);
    });

    test('restricted member is neither global reader nor admin', () => {
      expect(isGlobalProjectReader(chefSystem)).toBe(false);
      expect(isSystemAdmin(chefSystem)).toBe(false);
    });
  });

  describe('isProjectMember', () => {
    const project = {
      chef_projet: 'chef-1',
      product_owner: 'po-1',
      créé_par: 'creator-1',
      membres: [{ user_id: 'member-1' }],
    };

    test('matches chef, PO, creator and listed member', () => {
      expect(isProjectMember(project, 'chef-1')).toBe(true);
      expect(isProjectMember(project, 'po-1')).toBe(true);
      expect(isProjectMember(project, 'creator-1')).toBe(true);
      expect(isProjectMember(project, 'member-1')).toBe(true);
    });

    test('rejects outsider', () => {
      expect(isProjectMember(project, 'outsider-1')).toBe(false);
      expect(isProjectMember(null, 'chef-1')).toBe(false);
    });
  });

  describe('canAccessProject', () => {
    test('global readers skip membership lookup', async () => {
      await expect(canAccessProject(admin, 'p1')).resolves.toBe(true);
      expect(Project.findById).not.toHaveBeenCalled();
    });

    test('denies missing or archived projects', async () => {
      Project.findById.mockImplementation(() => chain(null));
      await expect(canAccessProject(chefSystem, 'missing')).resolves.toBe(false);

      Project.findById.mockImplementation(() =>
        chain({ archivé: true, chef_projet: 'chef-1', membres: [] })
      );
      await expect(canAccessProject(chefSystem, 'p1')).resolves.toBe(false);
    });

    test('allows listed members', async () => {
      Project.findById.mockImplementation(() =>
        chain({
          archivé: false,
          chef_projet: 'other',
          product_owner: 'other',
          créé_par: 'other',
          membres: [{ user_id: 'chef-1' }],
        })
      );
      await expect(canAccessProject(chefSystem, 'p1')).resolves.toBe(true);
    });
  });

  describe('canUseProjectPermission', () => {
    test('system admin bypasses project role', async () => {
      await expect(canUseProjectPermission(admin, 'p1', 'gererSprints')).resolves.toBe(true);
      expect(Project.findById).not.toHaveBeenCalled();
    });

    test('missing system permission is denied before project lookup', async () => {
      const user = { _id: 'chef-1', role_id: { permissions: { voirSesProjets: true } } };
      await expect(canUseProjectPermission(user, 'p1', 'gererSprints')).resolves.toBe(false);
      expect(Project.findById).not.toHaveBeenCalled();
    });

    test('outsider with system permission cannot mutate another project', async () => {
      Project.findById.mockImplementation(() =>
        chain({
          archivé: false,
          chef_projet: 'chef-1',
          product_owner: 'po-1',
          créé_par: 'creator-1',
          membres: [],
        })
      );
      await expect(
        canUseProjectPermission(outsiderWithSprintPerm, 'p1', 'gererSprints')
      ).resolves.toBe(false);
    });

    test('project lead with system permission is allowed', async () => {
      Project.findById.mockImplementation(() =>
        chain({
          archivé: false,
          chef_projet: 'chef-1',
          product_owner: 'po-1',
          créé_par: 'creator-1',
          membres: [],
        })
      );
      await expect(canUseProjectPermission(chefSystem, 'p1', 'gererSprints')).resolves.toBe(true);
    });

    test('member needs matching project-role permission', async () => {
      const member = {
        _id: 'member-1',
        role_id: { permissions: { gererSprints: true, commenter: true } },
      };
      Project.findById.mockImplementation(() =>
        chain({
          archivé: false,
          chef_projet: 'chef-1',
          membres: [{ user_id: 'member-1', project_role_id: 'pr-1' }],
        })
      );
      ProjectRole.findById.mockImplementation(() =>
        chain({ permissions: { gererSprints: false, commenter: true } })
      );

      await expect(canUseProjectPermission(member, 'p1', 'gererSprints')).resolves.toBe(false);
      await expect(canUseProjectPermission(member, 'p1', 'commenter')).resolves.toBe(true);
    });

    test('member without project_role_id is denied', async () => {
      const member = {
        _id: 'member-1',
        role_id: { permissions: { gererSprints: true } },
      };
      Project.findById.mockImplementation(() =>
        chain({
          archivé: false,
          chef_projet: 'chef-1',
          membres: [{ user_id: 'member-1' }],
        })
      );
      await expect(canUseProjectPermission(member, 'p1', 'gererSprints')).resolves.toBe(false);
    });
  });

  describe('resolveProjectIdForEntity', () => {
    test('resolves aliases for project, task, deliverable and sprint', async () => {
      Project.findById.mockImplementation(() => chain({ _id: 'p1' }));
      await expect(resolveProjectIdForEntity('project', 'p1')).resolves.toBe('p1');

      Task.findById.mockImplementation(() => chain({ projet_id: 'p1' }));
      await expect(resolveProjectIdForEntity('tâche', 't1')).resolves.toBe('p1');
      await expect(resolveProjectIdForEntity('task', 't1')).resolves.toBe('p1');

      Deliverable.findById.mockImplementation(() => chain({ projet_id: 'p1' }));
      await expect(resolveProjectIdForEntity('livrable', 'd1')).resolves.toBe('p1');

      Sprint.findById.mockImplementation(() => chain({ projet_id: 'p1' }));
      await expect(resolveProjectIdForEntity('sprint', 's1')).resolves.toBe('p1');
    });

    test('resolves nested comments', async () => {
      Comment.findById.mockImplementation(() => chain({ entity_type: 'tâche', entity_id: 't1' }));
      Task.findById.mockImplementation(() => chain({ projet_id: 'p1' }));
      await expect(resolveProjectIdForEntity('commentaire', 'c1')).resolves.toBe('p1');
    });

    test('returns null for unknown type or missing id', async () => {
      await expect(resolveProjectIdForEntity('unknown', 'x')).resolves.toBeNull();
      await expect(resolveProjectIdForEntity('projet', null)).resolves.toBeNull();
    });
  });

  describe('getAccessibleProjectIds / buildAccessibleEntityConditions', () => {
    test('global readers get a null sentinel (no filter)', async () => {
      await expect(getAccessibleProjectIds(admin)).resolves.toBeNull();
      await expect(buildAccessibleEntityConditions(admin)).resolves.toBeNull();
    });

    test('members get their project ids and entity conditions', async () => {
      Project.find.mockImplementation(() => chain([{ _id: 'p1' }]));
      Task.find.mockImplementation(() => chain([{ _id: 't1' }]));
      Deliverable.find.mockImplementation(() => chain([{ _id: 'd1' }]));
      Sprint.find.mockImplementation(() => chain([{ _id: 's1' }]));

      await expect(getAccessibleProjectIds(chefSystem)).resolves.toEqual(['p1']);

      const conditions = await buildAccessibleEntityConditions(chefSystem, 'tâche');
      expect(conditions).toEqual([
        { entity_type: { $in: ['tâche', 'tache', 'task'] }, entity_id: { $in: ['t1'] } },
      ]);
    });

    test('users without projects get an empty match', async () => {
      Project.find.mockImplementation(() => chain([]));
      const conditions = await buildAccessibleEntityConditions(chefSystem);
      expect(conditions).toEqual([{ entity_id: { $in: [] } }]);
    });
  });

  describe('command chain — assignment and visibility', () => {
    const project = {
      _id: 'p1',
      archivé: false,
      chef_projet: 'chef-1',
      product_owner: 'po-1',
      créé_par: 'chef-1',
      membres: [{ user_id: 'member-1' }],
    };

    test('assignee can view a task even without being listed as member in the payload', () => {
      const task = { assigné_à: 'outsider-1', projet_id: 'p1' };
      expect(canViewTask(outsiderWithSprintPerm, task, project)).toBe(true);
    });

    test('outsider who is not assignee cannot view', () => {
      const task = { assigné_à: 'member-1', projet_id: 'p1' };
      expect(canViewTask(outsiderWithSprintPerm, task, project)).toBe(false);
    });

    test('rejects assignment to someone outside the project', async () => {
      const error = await validateTaskCommandChain({ assigné_à: 'outsider-1' }, project);
      expect(error).toMatch(/membre/);
    });

    test('accepts assignment to a roster member', async () => {
      await expect(
        validateTaskCommandChain({ assigné_à: 'member-1' }, project)
      ).resolves.toBeNull();
    });

    test('rejects a sprint from another project', async () => {
      Sprint.findById.mockImplementation(() => chain({ projet_id: 'other-project' }));
      const error = await validateTaskCommandChain({ sprint_id: 's-other' }, project);
      expect(error).toMatch(/sprint/i);
    });
  });

  describe('budget visibility', () => {
    test('canSeeBudgets is true for admin and voirBudget, false otherwise', () => {
      expect(canSeeBudgets(admin)).toBe(true);
      expect(canSeeBudgets({ role_id: { permissions: { voirBudget: true } } })).toBe(true);
      expect(canSeeBudgets({ role_id: { permissions: { voirSesProjets: true } } })).toBe(false);
    });

    test('omitProjectBudget strips amounts without mutating other fields', () => {
      const project = { _id: 'p1', nom: 'Alpha', budget: { prévisionnel: 1000, réel: 200 } };
      expect(omitProjectBudget(project)).toEqual({ _id: 'p1', nom: 'Alpha' });
      expect(project.budget.prévisionnel).toBe(1000);
    });

    test('redactProjectForAssignee hides roster, budget and governance', () => {
      const project = {
        _id: 'p1',
        nom: 'Alpha',
        description: 'Desc',
        statut: 'En cours',
        priorité: 'Haute',
        membres: [{ user_id: 'u1' }],
        budget: { prévisionnel: 9000 },
        comite_pilotage: ['DG'],
        termes_de_reference: 'secret',
        chef_projet: 'chef-1',
      };
      expect(redactProjectForAssignee(project)).toEqual(
        expect.objectContaining({
          _id: 'p1',
          nom: 'Alpha',
          description: 'Desc',
          statut: 'En cours',
          assignee_limited: true,
        })
      );
      expect(redactProjectForAssignee(project).membres).toBeUndefined();
      expect(redactProjectForAssignee(project).budget).toBeUndefined();
      expect(redactProjectForAssignee(project).comite_pilotage).toBeUndefined();
    });
  });

  describe('canAccessProjectOrAssignedWork', () => {
    test('allows a non-member who has a task on the project', async () => {
      Project.findById.mockImplementation(() =>
        chain({
          archivé: false,
          chef_projet: 'other',
          product_owner: 'other',
          créé_par: 'other',
          membres: [],
        })
      );
      Task.exists.mockResolvedValue({ _id: 't1' });
      await expect(canAccessProjectOrAssignedWork(outsiderWithSprintPerm, 'p1')).resolves.toBe(
        true
      );
    });

    test('denies a non-member with no assigned task', async () => {
      Project.findById.mockImplementation(() =>
        chain({
          archivé: false,
          chef_projet: 'other',
          product_owner: 'other',
          créé_par: 'other',
          membres: [],
        })
      );
      Task.exists.mockResolvedValue(null);
      await expect(canAccessProjectOrAssignedWork(outsiderWithSprintPerm, 'p1')).resolves.toBe(
        false
      );
    });
  });
});
