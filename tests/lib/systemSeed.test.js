import Role from '@/models/Role';
import ProjectTemplate from '@/models/ProjectTemplate';
import { ALL_MENUS, ALL_PERMISSIONS } from '@/lib/permissions';
import { ensureDefaultProjectTemplates, ensurePredefinedSystemRoles } from '@/lib/systemSeed';

const chain = (value) => ({
  sort: jest.fn().mockReturnThis(),
  lean: jest.fn().mockResolvedValue(value),
});

describe('systemSeed', () => {
  test('ensurePredefinedSystemRoles upserts exactly 10 roles with full permission keys', async () => {
    Role.findOneAndUpdate.mockResolvedValue({});
    Role.find.mockImplementation(() => chain(new Array(10).fill({ nom: 'role' })));

    const roles = await ensurePredefinedSystemRoles();

    expect(Role.findOneAndUpdate).toHaveBeenCalledTimes(10);
    expect(roles).toHaveLength(10);

    const names = Role.findOneAndUpdate.mock.calls.map((call) => call[0].nom);
    expect(names).toEqual(
      expect.arrayContaining([
        'Super Administrateur',
        'Administrateur',
        'Chef de Projet',
        'Product Owner',
        'Membre Équipe',
        'Observateur',
        'Invité',
      ])
    );

    const superAdmin = Role.findOneAndUpdate.mock.calls.find(
      (call) => call[0].nom === 'Super Administrateur'
    );
    expect(Object.keys(superAdmin[1].$set.permissions)).toHaveLength(ALL_PERMISSIONS.length);
    expect(superAdmin[1].$set.permissions.creerProjet).toBe(true);
    expect(superAdmin[1].$set.permissions.adminConfig).toBe(true);
    expect(Object.keys(superAdmin[1].$set.visibleMenus)).toHaveLength(ALL_MENUS.length);
    expect(superAdmin[1].$set.visibleMenus.admin).toBe(true);
    expect(superAdmin[2]).toEqual(
      expect.objectContaining({ upsert: true, new: true, setDefaultsOnInsert: true })
    );
  });

  test('ensureDefaultProjectTemplates is a no-op without createdBy', async () => {
    await expect(ensureDefaultProjectTemplates()).resolves.toEqual([]);
    expect(ProjectTemplate.findOneAndUpdate).not.toHaveBeenCalled();
  });

  test('ensureDefaultProjectTemplates upserts the default templates', async () => {
    ProjectTemplate.findOneAndUpdate.mockResolvedValue({});
    ProjectTemplate.find.mockImplementation(() =>
      chain([{ nom: 'Projet Agile standard' }, { nom: 'Projet gouvernance' }])
    );

    const templates = await ensureDefaultProjectTemplates('user-1');
    expect(ProjectTemplate.findOneAndUpdate).toHaveBeenCalledTimes(2);
    expect(templates).toHaveLength(2);
    expect(ProjectTemplate.findOneAndUpdate.mock.calls[0][2]).toEqual(
      expect.objectContaining({ upsert: true, setDefaultsOnInsert: true })
    );
  });
});
