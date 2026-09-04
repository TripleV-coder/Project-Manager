import {
  collectProjectRosterIds,
  extractAssignableUsers,
  isOnProjectRoster,
  isSameUser,
} from '@/lib/projectRoster';

describe('projectRoster — chaîne de commandement', () => {
  const project = {
    chef_projet: { _id: 'chef-1', nom_complet: 'Chef', email: 'chef@pm.test' },
    product_owner: { _id: 'po-1', nom_complet: 'PO', email: 'po@pm.test' },
    créé_par: 'chef-1',
    membres: [
      { user_id: { _id: 'member-1', nom_complet: 'Membre', email: 'm@pm.test' } },
      { user_id: { _id: 'chef-1', nom_complet: 'Chef', email: 'chef@pm.test' } },
    ],
  };

  test('roster includes chef, PO, creator and members without duplicates', () => {
    expect(collectProjectRosterIds(project).sort()).toEqual(['chef-1', 'member-1', 'po-1']);
  });

  test('isOnProjectRoster accepts members and rejects outsiders', () => {
    expect(isOnProjectRoster(project, 'member-1')).toBe(true);
    expect(isOnProjectRoster(project, 'outsider-1')).toBe(false);
  });

  test('extractAssignableUsers returns displayable stubs only', () => {
    const users = extractAssignableUsers(project);
    expect(users.map((u) => u._id).sort()).toEqual(['chef-1', 'member-1', 'po-1']);
    expect(users.find((u) => u._id === 'member-1').nom_complet).toBe('Membre');
  });

  test('isSameUser compares populated and raw ids', () => {
    expect(isSameUser({ _id: 'u1' }, 'u1')).toBe(true);
    expect(isSameUser('u1', { id: 'u2' })).toBe(false);
  });
});
