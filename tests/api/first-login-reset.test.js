/**
 * Regression: POST /api/auth/first-login-reset must accept a `pwd`-scoped
 * step-up token (the normal path once login/2fa-verify stop handing out a
 * full session to must-change-password users), while still allowing a full
 * session as a back-compat fallback during rollout. This closes the last
 * leg of the 2FA/must-change-password bypass.
 *
 * Kept in its own file (rather than folded into tests/api/auth-flow.test.js)
 * because this route needs its own fresh mocks for `@/models/User`
 * (`findById`), `@/lib/userSecurity`, and `@/lib/requestAuth` that would
 * otherwise conflict with the mocks already established at the top of
 * auth-flow.test.js for the login/2fa/logout/refresh routes.
 */
jest.mock('@/lib/mongodb', () => jest.fn());
jest.mock('@/lib/auditService', () => ({ logActivity: jest.fn() }));
jest.mock('@/lib/apiMiddleware', () => ({
  applyRateLimit: jest.fn(() => ({ allowed: true })),
  handleRateLimitError: jest.fn(() => ({ status: 429 })),
}));
jest.mock('@/lib/userSecurity', () => ({ revokeUserSessions: jest.fn() }));
jest.mock('@/lib/auth', () => ({
  ...jest.requireActual('@/lib/auth'),
  verifyPassword: jest.fn().mockResolvedValue(true),
  hashPassword: jest.fn().mockResolvedValue('$2a$12$new'),
}));
jest.mock('@/lib/requestAuth', () => ({
  ...jest.requireActual('@/lib/requestAuth'),
  authenticateRequest: jest.fn().mockResolvedValue(null),
  issueAuthTokens: jest.fn(),
  serializeAuthenticatedUser: jest.fn((u) => ({ id: u._id })),
}));
jest.mock('@/models/User', () => ({ __esModule: true, default: { findById: jest.fn() } }));
// jest.setup.js's fallback `global.Response` polyfill has no real constructor
// (no headers/body support), which breaks NextResponse's real
// `extends Response` construction in this jsdom test env. Stub NextResponse
// itself instead — same pattern already used by tests/api/auth.test.js,
// tests/api/two-factor-bypass.test.js and tests/api/two-factor-verify.test.js
// for the same reason.
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((body, init) => ({
      status: init?.status || 200,
      json: async () => body,
    })),
  },
}));

import { POST as reset } from '@/app/api/auth/first-login-reset/route';
import { createStepUpToken, STEP_UP_SCOPE } from '@/lib/auth/stepUp';
import { issueAuthTokens } from '@/lib/requestAuth';
import User from '@/models/User';

const strongPw = {
  new_password: 'StrongPass123!',
  new_password_confirm: 'StrongPass123!',
  temporary_password: 'Temp123!',
};

function resetReq(token, body = strongPw) {
  return {
    headers: { get: (n) => (n === 'authorization' && token ? `Bearer ${token}` : null) },
    json: async () => body,
  };
}
function mustChangeUser() {
  return {
    _id: 'u1',
    password: '$2a$12$old',
    must_change_password: true,
    first_login: true,
    tokenVersion: 0,
    password_history: [],
    save: jest.fn().mockResolvedValue(undefined),
    role_id: { nom: 'Membre' },
  };
}

beforeEach(() => jest.clearAllMocks());

describe('POST /api/auth/first-login-reset', () => {
  test('rejects when neither step-up token nor session is present', async () => {
    const res = await reset(resetReq(null));
    expect(res.status).toBe(401);
  });

  test('accepts a pwd step-up token + correct temp password and issues a session', async () => {
    User.findById.mockReturnValue({
      select: () => ({ populate: () => Promise.resolve(mustChangeUser()) }),
    });
    const token = await createStepUpToken(
      { _id: 'u1', tokenVersion: 0 },
      STEP_UP_SCOPE.PASSWORD_CHANGE,
      15
    );
    const res = await reset(resetReq(token));
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(issueAuthTokens).toHaveBeenCalled();
  });

  test('rejects a 2fa-scoped token (wrong scope)', async () => {
    const token = await createStepUpToken(
      { _id: 'u1', tokenVersion: 0 },
      STEP_UP_SCOPE.TWO_FACTOR,
      15
    );
    const res = await reset(resetReq(token));
    expect(res.status).toBe(401);
  });
});
