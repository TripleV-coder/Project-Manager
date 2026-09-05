/**
 * Regression: POST /api/auth/2fa/verify must consume a `2fa`-scoped step-up
 * token (never a full session, never a `pwd`-scoped token) — this closes the
 * other half of the 2FA-bypass vulnerability covered on the login side by
 * tests/api/two-factor-bypass.test.js.
 *
 * Kept in its own file (rather than appended to two-factor-bypass.test.js)
 * because this route needs fresh mocks for `@/models/User` (`findById`),
 * `@/lib/twoFactorAuth`, and `@/lib/withApiProtection` that would otherwise
 * fight the mocks already established at the top of two-factor-bypass.test.js
 * for the login route (which mocks `User.findOne` only, and never touches
 * withApiProtection/twoFactorAuth).
 */
jest.mock('@/lib/withApiProtection', () => ({
  withApiProtection: (h) => h,
}));
jest.mock('@/lib/twoFactorAuth', () => ({
  verifyTwoFactorToken: jest.fn(() => true),
  verifyBackupCode: jest.fn(() => ({ valid: true, remainingCodes: [] })),
}));
// The per-user rate limit added to close the "no account-side TOTP brute-
// force cap" gap (withApiProtection's own pass 2 never runs here because
// this route uses requireAuth: false). Defaults to "allowed" so existing
// tests that don't care about it don't need their own stub.
jest.mock('@/lib/apiMiddleware', () => ({
  applyUserRateLimit: jest.fn(async () => ({ allowed: true })),
  handleRateLimitError: jest.fn(() => ({ status: 429 })),
}));
jest.mock('@/lib/auditService', () => ({ logActivity: jest.fn() }));
jest.mock('@/lib/requestAuth', () => ({
  ...jest.requireActual('@/lib/requestAuth'),
  issueAuthTokens: jest.fn(),
  serializeAuthenticatedUser: jest.fn((u) => ({ id: u._id, email: u.email })),
}));
jest.mock('@/models/User', () => ({ __esModule: true, default: {} }));
// jest.setup.js's fallback `global.Response` polyfill has no real constructor
// (no headers/body support), which breaks NextResponse's real
// `extends Response` construction in this jsdom test env. Stub NextResponse
// itself instead — same pattern already used by tests/api/auth.test.js and
// tests/api/two-factor-bypass.test.js for the same reason.
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((body, init) => ({
      status: init?.status || 200,
      json: async () => body,
    })),
  },
}));

const { createStepUpToken, verifyStepUpToken, STEP_UP_SCOPE } = require('@/lib/auth/stepUp');
const { issueAuthTokens } = require('@/lib/requestAuth');
const User = require('@/models/User').default;

function twoFAReq(token, body = { token: '123456' }) {
  return {
    method: 'POST',
    url: 'http://localhost/api/auth/2fa/verify',
    headers: { get: (n) => (n === 'authorization' ? `Bearer ${token}` : null) },
    json: async () => body,
  };
}

function mockUser(overrides = {}) {
  return {
    _id: 'u1',
    email: 'a@b.com',
    status: 'Actif',
    tokenVersion: 0,
    twoFactorEnabled: true,
    twoFactorSecret: 's',
    save: jest.fn(),
    role_id: { nom: 'Membre', permissions: {} },
    ...overrides,
  };
}

beforeEach(() => jest.clearAllMocks());

describe('POST /api/auth/2fa/verify', () => {
  test('rejects a request with no step-up token', async () => {
    const { POST } = require('@/app/api/auth/2fa/verify/route');
    const res = await POST(twoFAReq('garbage'));
    expect(res.status).toBe(401);
  });

  test('accepts a valid 2fa step-up token and issues a session', async () => {
    User.findById = jest.fn().mockReturnValue({
      select: () => ({ populate: () => Promise.resolve(mockUser()) }),
    });
    const token = await createStepUpToken(
      { _id: 'u1', tokenVersion: 0 },
      STEP_UP_SCOPE.TWO_FACTOR,
      5
    );
    const { POST } = require('@/app/api/auth/2fa/verify/route');
    const res = await POST(twoFAReq(token));
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(issueAuthTokens).toHaveBeenCalled();
  });

  test('rejects a pwd-scoped token (wrong scope)', async () => {
    const token = await createStepUpToken(
      { _id: 'u1', tokenVersion: 0 },
      STEP_UP_SCOPE.PASSWORD_CHANGE,
      5
    );
    const { POST } = require('@/app/api/auth/2fa/verify/route');
    const res = await POST(twoFAReq(token));
    expect(res.status).toBe(401);
  });

  test('rejects when tokenVersion no longer matches (session invalidated)', async () => {
    User.findById = jest.fn().mockReturnValue({
      select: () => ({ populate: () => Promise.resolve(mockUser({ tokenVersion: 1 })) }),
    });
    const token = await createStepUpToken(
      { _id: 'u1', tokenVersion: 0 },
      STEP_UP_SCOPE.TWO_FACTOR,
      5
    );
    const { POST } = require('@/app/api/auth/2fa/verify/route');
    const res = await POST(twoFAReq(token));
    expect(res.status).toBe(401);
  });

  test('must-change-password user gets a pwd step-up token, not a session', async () => {
    User.findById = jest.fn().mockReturnValue({
      select: () => ({
        populate: () => Promise.resolve(mockUser({ must_change_password: true })),
      }),
    });
    const token = await createStepUpToken(
      { _id: 'u1', tokenVersion: 0 },
      STEP_UP_SCOPE.TWO_FACTOR,
      5
    );
    const { POST } = require('@/app/api/auth/2fa/verify/route');
    const res = await POST(twoFAReq(token));
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.requirePasswordChange).toBe(true);
    expect(issueAuthTokens).not.toHaveBeenCalled();
    const claims = await verifyStepUpToken(data.tempToken, STEP_UP_SCOPE.PASSWORD_CHANGE);
    expect(claims?.userId).toBe('u1');
  });

  test('per-user rate limit blocks repeated guesses against the same account', async () => {
    const { applyUserRateLimit } = require('@/lib/apiMiddleware');
    applyUserRateLimit.mockResolvedValueOnce({ allowed: false, resetTime: 60 });

    User.findById = jest.fn().mockReturnValue({
      select: () => ({ populate: () => Promise.resolve(mockUser()) }),
    });
    const token = await createStepUpToken(
      { _id: 'u1', tokenVersion: 0 },
      STEP_UP_SCOPE.TWO_FACTOR,
      5
    );
    const { POST } = require('@/app/api/auth/2fa/verify/route');
    const res = await POST(twoFAReq(token));

    expect(res.status).toBe(429);
    expect(applyUserRateLimit).toHaveBeenCalledWith('u1', expect.any(Object));
  });
});
