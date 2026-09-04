/**
 * Regression: the login step-up token must not be usable as a session,
 * and 2FA must not be skippable via the must-change-password path.
 */
jest.mock('@/lib/mongodb', () => jest.fn());
jest.mock('@/lib/apiMiddleware', () => ({
  applyRateLimit: jest.fn(() => ({ allowed: true })),
  handleRateLimitError: jest.fn(() => ({ status: 429 })),
}));
jest.mock('@/lib/auditService', () => ({ logActivity: jest.fn() }));
jest.mock('@/lib/auditNotificationService', () => ({ notifyAboutFailedLogins: jest.fn() }));
jest.mock('@/lib/auth', () => ({
  hashPassword: jest.fn().mockResolvedValue('$2a$12$x'),
  verifyPassword: jest.fn().mockResolvedValue(true),
}));
jest.mock('@/lib/requestAuth', () => ({
  ...jest.requireActual('@/lib/requestAuth'),
  issueAuthTokens: jest.fn(),
  serializeAuthenticatedUser: jest.fn((u) => ({ id: u._id, email: u.email })),
}));
jest.mock('@/models/User', () => ({ __esModule: true, default: { findOne: jest.fn() } }));
// jest.setup.js's fallback `global.Response` polyfill has no real constructor
// (no headers/body support), which breaks NextResponse's real
// `extends Response` construction in this jsdom test env. Stub NextResponse
// itself instead — same pattern already used by tests/api/auth.test.js and
// tests/integration/projects.test.js for the same reason.
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((body, init) => ({
      status: init?.status || 200,
      json: async () => body,
    })),
  },
}));

import { POST as login } from '@/app/api/auth/login/route';
import { issueAuthTokens } from '@/lib/requestAuth';
import { verifyStepUpToken, STEP_UP_SCOPE } from '@/lib/auth/stepUp';
import User from '@/models/User';

function mockUser(overrides = {}) {
  return {
    _id: 'u1',
    email: 'a@b.com',
    password: '$2a$12$x',
    status: 'Actif',
    tokenVersion: 0,
    failedLoginAttempts: 0,
    save: jest.fn().mockResolvedValue(undefined),
    role_id: { nom: 'Membre', permissions: {} },
    ...overrides,
  };
}
function req(body) {
  return { headers: { get: () => null }, json: async () => body };
}

beforeEach(() => jest.clearAllMocks());

test('2FA user gets a 2fa-scoped step-up token and NO cookies', async () => {
  User.findOne.mockReturnValue({
    select: () => ({ populate: () => Promise.resolve(mockUser({ twoFactorEnabled: true })) }),
  });
  const res = await login(req({ email: 'a@b.com', password: 'pw' }));
  const data = await res.json();

  expect(data.requires2FA).toBe(true);
  expect(issueAuthTokens).not.toHaveBeenCalled();
  const claims = await verifyStepUpToken(data.tempToken, STEP_UP_SCOPE.TWO_FACTOR);
  expect(claims?.userId).toBe('u1');
});

test('2FA + must-change user still goes through 2FA (no full session)', async () => {
  User.findOne.mockReturnValue({
    select: () => ({
      populate: () =>
        Promise.resolve(mockUser({ twoFactorEnabled: true, must_change_password: true })),
    }),
  });
  const res = await login(req({ email: 'a@b.com', password: 'pw' }));
  const data = await res.json();

  expect(data.requires2FA).toBe(true);
  expect(issueAuthTokens).not.toHaveBeenCalled();
});

test('must-change (no 2FA) gets a pwd-scoped step-up token and NO cookies', async () => {
  User.findOne.mockReturnValue({
    select: () => ({
      populate: () => Promise.resolve(mockUser({ must_change_password: true })),
    }),
  });
  const res = await login(req({ email: 'a@b.com', password: 'pw' }));
  const data = await res.json();

  expect(data.requirePasswordChange).toBe(true);
  expect(issueAuthTokens).not.toHaveBeenCalled();
  const claims = await verifyStepUpToken(data.tempToken, STEP_UP_SCOPE.PASSWORD_CHANGE);
  expect(claims?.userId).toBe('u1');
});

test('normal user gets a full session', async () => {
  User.findOne.mockReturnValue({
    select: () => ({ populate: () => Promise.resolve(mockUser()) }),
  });
  const res = await login(req({ email: 'a@b.com', password: 'pw' }));
  const data = await res.json();

  expect(data.requirePasswordChange).toBe(false);
  expect(issueAuthTokens).toHaveBeenCalledTimes(1);
});
