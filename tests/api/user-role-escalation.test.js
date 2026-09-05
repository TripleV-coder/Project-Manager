/**
 * Regression: a `gererUtilisateurs`-only actor (no `adminConfig`) must not be
 * able to create a new user with an adminConfig role, nor promote an
 * existing non-admin user to one, by passing an arbitrary `role_id` in the
 * request body. `lib/userManagement.js`'s `canActorManageTarget` only guards
 * an already-admin EXISTING target — it does nothing for role assignment
 * itself, which is what this guard (`canActorAssignRole`, wired into both
 * routes) closes.
 */
jest.mock('@/lib/withApiProtection', () => ({ withApiProtection: (h) => h }));
jest.mock('@/lib/validate', () => ({ validateBody: jest.fn() }));
jest.mock('@/lib/schemas', () => ({ createUserSchema: {}, updateUserSchema: {} }));
jest.mock('@/lib/auditService', () => ({ logActivity: jest.fn() }));
jest.mock('@/lib/userSecurity', () => ({
  assignTemporaryPassword: jest.fn(async () => 'temp-pass'),
  sendTemporaryPasswordEmail: jest.fn(async () => {}),
  revokeUserSessions: jest.fn(async () => {}),
}));
jest.mock('@/lib/services/userService', () => ({
  __esModule: true,
  default: { getUsers: jest.fn() },
}));
jest.mock('@/models/User', () => {
  const ctor = jest.fn();
  ctor.findOne = jest.fn();
  ctor.findById = jest.fn();
  ctor.findByIdAndUpdate = jest.fn();
  ctor.findByIdAndDelete = jest.fn();
  return { __esModule: true, default: ctor };
});
jest.mock('@/models/Role', () => ({ __esModule: true, default: { findById: jest.fn() } }));
// jest.setup.js's fallback `global.Response` polyfill has no real constructor,
// which breaks NextResponse's real `extends Response` construction in this
// jsdom test env. Stub NextResponse itself — same pattern already used by
// tests/api/user-update-guard.test.js for the same reason.
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((body, init) => ({
      status: init?.status || 200,
      json: async () => body,
    })),
  },
}));

const { validateBody } = require('@/lib/validate');
const User = require('@/models/User').default;
const Role = require('@/models/Role').default;

const nonAdminActor = { _id: 'm', role_id: { permissions: { gererUtilisateurs: true } } };
const adminRole = { _id: 'r-admin', permissions: { adminConfig: true } };
const regularRole = { _id: 'r-member', permissions: {} };

beforeEach(() => jest.clearAllMocks());

describe('POST /api/users — role escalation guard', () => {
  test('a gererUtilisateurs-only actor cannot create a user with an adminConfig role', async () => {
    validateBody.mockResolvedValue({
      success: true,
      data: {
        nom_complet: 'New Admin',
        email: 'new-admin@example.com',
        role_id: 'r-admin',
        status: 'Actif',
      },
    });
    Role.findById.mockResolvedValue(adminRole);

    const { POST } = require('@/app/api/users/route');
    const req = { headers: { get: () => null }, url: 'http://x' };
    const res = await POST(req, { user: nonAdminActor });

    expect(res.status).toBe(403);
    expect(User.findOne).not.toHaveBeenCalled();
  });

  test('a gererUtilisateurs-only actor CAN create a user with a non-admin role', async () => {
    validateBody.mockResolvedValue({
      success: true,
      data: {
        nom_complet: 'New Member',
        email: 'new-member@example.com',
        role_id: 'r-member',
        status: 'Actif',
      },
    });
    Role.findById.mockResolvedValue(regularRole);
    User.findOne.mockResolvedValue(null);
    User.mockImplementation((data) => ({
      ...data,
      _id: 'new-user-1',
      save: jest.fn(async () => {}),
      populate: jest.fn(async function populate() {
        return this;
      }),
    }));

    const { POST } = require('@/app/api/users/route');
    const req = { headers: { get: () => null }, url: 'http://x' };
    const res = await POST(req, { user: nonAdminActor });

    expect(res.status).toBe(201);
  });
});

describe('PUT /api/users/[id] — role escalation guard', () => {
  test('a gererUtilisateurs-only actor cannot promote a non-admin user to an adminConfig role', async () => {
    const nonAdminTarget = { _id: 't', role_id: { permissions: {} } };
    User.findById.mockReturnValue({ populate: () => Promise.resolve(nonAdminTarget) });
    validateBody.mockResolvedValue({ success: true, data: { role_id: 'r-admin' } });
    Role.findById.mockResolvedValue(adminRole);

    const { PUT } = require('@/app/api/users/[id]/route');
    const req = { headers: { get: () => null }, url: 'http://x' };
    const res = await PUT(req, { user: nonAdminActor, params: { id: 't' } });

    expect(res.status).toBe(403);
    expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  test('a gererUtilisateurs-only actor CAN assign a non-admin role', async () => {
    const nonAdminTarget = { _id: 't', role_id: { permissions: {} }, status: 'Actif' };
    User.findById.mockReturnValue({ populate: () => Promise.resolve(nonAdminTarget) });
    validateBody.mockResolvedValue({ success: true, data: { role_id: 'r-member' } });
    Role.findById.mockResolvedValue(regularRole);
    User.findByIdAndUpdate.mockReturnValue({
      populate: () => Promise.resolve({ ...nonAdminTarget, role_id: regularRole }),
    });

    const { PUT } = require('@/app/api/users/[id]/route');
    const req = { headers: { get: () => null }, url: 'http://x' };
    const res = await PUT(req, { user: nonAdminActor, params: { id: 't' } });

    expect(res.status).toBe(200);
    expect(User.findByIdAndUpdate).toHaveBeenCalled();
  });
});
