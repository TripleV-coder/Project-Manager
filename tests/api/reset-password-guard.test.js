jest.mock('@/lib/withApiProtection', () => ({ withApiProtection: (h) => h }));
jest.mock('@/lib/userSecurity', () => ({
  assignTemporaryPassword: jest.fn().mockResolvedValue('Temp123!'),
  sendTemporaryPasswordEmail: jest.fn(),
  revokeUserSessions: jest.fn(),
}));
jest.mock('@/lib/auditService', () => ({ logActivity: jest.fn() }));
jest.mock('@/models/User', () => ({ __esModule: true, default: { findById: jest.fn() } }));
// jest.setup.js's fallback `global.Response` polyfill has no real constructor
// (no headers/body support), which breaks NextResponse's real
// `extends Response` construction in this jsdom test env. Stub NextResponse
// itself instead — same pattern already used by tests/api/two-factor-bypass.test.js.
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((body, init) => ({
      status: init?.status || 200,
      json: async () => body,
    })),
  },
}));

import { PUT } from '@/app/api/users/[id]/reset-password/route';
import User from '@/models/User';

test('a user-manager cannot reset an adminConfig account', async () => {
  User.findById.mockReturnValue({
    populate: () => Promise.resolve({ _id: 't', role_id: { permissions: { adminConfig: true } } }),
  });
  const req = { headers: { get: () => null }, url: 'http://x' };
  const ctx = {
    user: { _id: 'm', role_id: { permissions: { gererUtilisateurs: true } } },
    params: { id: 't' },
  };

  const res = await PUT(req, ctx);
  expect(res.status).toBe(403);
});
