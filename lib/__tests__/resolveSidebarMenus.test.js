import Project from '@/models/Project';
import { ALL_MENUS } from '@/lib/permissions';
import { resolveSidebarMenus, serializeUserWithProjectMenus } from '@/lib/resolveSidebarMenus';

const chain = (value) => ({
  select: jest.fn().mockReturnThis(),
  populate: jest.fn().mockReturnThis(),
  lean: jest.fn().mockResolvedValue(value),
});

const systemMenus = Object.fromEntries(ALL_MENUS.map((menu) => [menu, true]));
systemMenus.admin = false;
systemMenus.budget = true;

const memberUser = {
  _id: 'member-1',
  role_id: {
    permissions: { voirSesProjets: true, deplacerTaches: true },
    visibleMenus: systemMenus,
  },
};

describe('resolveSidebarMenus', () => {
  beforeEach(() => {
    Project.find.mockImplementation(() => chain([]));
  });

  test('admin keeps system menus without querying projects', async () => {
    const admin = {
      _id: 'admin-1',
      role_id: {
        permissions: { adminConfig: true },
        visibleMenus: { ...systemMenus, admin: true },
      },
    };
    const menus = await resolveSidebarMenus(admin);
    expect(menus.admin).toBe(true);
    expect(Project.find).not.toHaveBeenCalled();
  });

  test('project lead keeps system menus', async () => {
    Project.find.mockImplementation(() =>
      chain([
        {
          chef_projet: 'member-1',
          product_owner: 'po-1',
          créé_par: 'other',
          membres: [],
        },
      ])
    );

    const menus = await resolveSidebarMenus(memberUser);
    expect(menus.budget).toBe(true);
    expect(menus.tasks).toBe(true);
  });

  test('member without project role keeps system menus', async () => {
    Project.find.mockImplementation(() =>
      chain([
        {
          chef_projet: 'chef-1',
          product_owner: 'po-1',
          créé_par: 'chef-1',
          membres: [{ user_id: 'member-1' }],
        },
      ])
    );

    const menus = await resolveSidebarMenus(memberUser);
    expect(menus.budget).toBe(true);
  });

  test('member ANDs system menus with project-role menus', async () => {
    Project.find.mockImplementation(() =>
      chain([
        {
          chef_projet: 'chef-1',
          product_owner: 'po-1',
          créé_par: 'chef-1',
          membres: [
            {
              user_id: 'member-1',
              project_role_id: {
                visibleMenus: {
                  tasks: true,
                  kanban: true,
                  comments: true,
                  budget: false,
                  admin: false,
                },
              },
            },
          ],
        },
      ])
    );

    const menus = await resolveSidebarMenus(memberUser);
    expect(menus.tasks).toBe(true);
    expect(menus.kanban).toBe(true);
    expect(menus.budget).toBe(false);
    expect(menus.sprints).toBe(false);
    expect(menus.admin).toBe(false);
  });

  test('serializeUserWithProjectMenus overlays visibleMenus on role and role_id', async () => {
    const serialized = await serializeUserWithProjectMenus(memberUser, (user) => ({
      id: user._id,
      role: { visibleMenus: { tasks: true, budget: true } },
      role_id: { visibleMenus: { tasks: true, budget: true } },
    }));

    expect(serialized.role.visibleMenus).toEqual(expect.any(Object));
    expect(serialized.role_id.visibleMenus).toBe(serialized.role.visibleMenus);
  });
});
