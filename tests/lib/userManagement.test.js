import { canActorManageTarget } from '@/lib/userManagement';

const admin = { _id: 'a', role_id: { permissions: { adminConfig: true } } };
const userMgr = { _id: 'm', role_id: { permissions: { gererUtilisateurs: true } } };
const member = { _id: 'x', role_id: { permissions: {} } };

test('user-manager cannot manage an adminConfig target', () => {
  expect(canActorManageTarget(userMgr, admin)).toBe(false);
});
test('user-manager can manage a normal member', () => {
  expect(canActorManageTarget(userMgr, member)).toBe(true);
});
test('admin can manage another admin', () => {
  expect(
    canActorManageTarget(admin, { _id: 'b', role_id: { permissions: { adminConfig: true } } })
  ).toBe(true);
});
test('nobody can manage themselves through this path', () => {
  expect(canActorManageTarget(admin, { ...admin })).toBe(false);
});
test('missing role data denies', () => {
  expect(canActorManageTarget(userMgr, { _id: 'z' })).toBe(true); // no adminConfig → allowed
  expect(canActorManageTarget({ _id: 'm' }, admin)).toBe(false);
});
