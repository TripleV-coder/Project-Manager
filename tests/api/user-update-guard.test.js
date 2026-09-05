jest.mock('@/lib/withApiProtection', () => ({ withApiProtection: (h) => h }));
jest.mock('@/lib/validate', () => ({ validateBody: jest.fn() }));
jest.mock('@/lib/schemas', () => ({ updateUserSchema: {} }));
jest.mock('@/lib/auditService', () => ({ logActivity: jest.fn() }));
jest.mock('@/lib/userSecurity', () => ({ revokeUserSessions: jest.fn() }));
jest.mock('@/models/User', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
  },
}));
// jest.setup.js's fallback `global.Response` polyfill has no real constructor
// (no headers/body support), which breaks NextResponse's real
// `extends Response` construction in this jsdom test env. Stub NextResponse
// itself instead — same pattern already used by tests/api/reset-password-guard.test.js
// and tests/api/two-factor-bypass.test.js for the same reason.
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((body, init) => ({
      status: init?.status || 200,
      json: async () => body,
    })),
  },
}));

import { PUT, DELETE } from '@/app/api/users/[id]/route';
import User from '@/models/User';
import { validateBody } from '@/lib/validate';

const nonAdminActor = { _id: 'm', role_id: { permissions: { gererUtilisateurs: true } } };
const adminTarget = { _id: 't', role_id: { permissions: { adminConfig: true } } };

beforeEach(() => jest.clearAllMocks());

test('PUT: a user-manager cannot update an adminConfig account', async () => {
  User.findById.mockReturnValue({ populate: () => Promise.resolve(adminTarget) });

  const req = { headers: { get: () => null }, url: 'http://x' };
  const ctx = { user: nonAdminActor, params: { id: 't' } };

  const res = await PUT(req, ctx);

  expect(res.status).toBe(403);
  // The guard must short-circuit before the body is even validated.
  expect(validateBody).not.toHaveBeenCalled();
  expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
});

test('DELETE: a user-manager cannot delete an adminConfig account', async () => {
  User.findById.mockReturnValue({ populate: () => Promise.resolve(adminTarget) });

  const req = { headers: { get: () => null }, url: 'http://x' };
  const ctx = { user: nonAdminActor, params: { id: 't' } };

  const res = await DELETE(req, ctx);

  expect(res.status).toBe(403);
  expect(User.findByIdAndDelete).not.toHaveBeenCalled();
});
