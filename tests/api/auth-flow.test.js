/**
 * Tests d'intégration API — Authentification complète
 * Couvre : login, logout, refresh, 2FA, lockout, timing equalization
 *
 * Note: several of these behaviors also have dedicated regression files
 * (tests/api/two-factor-bypass.test.js, tests/api/two-factor-verify.test.js).
 * Some overlap with those is expected — this file exercises the same real
 * behaviors from the auth-flow describe blocks named below, using its own
 * mock conventions (User.findOne/findById module mocks declared up front).
 */
jest.mock('@/lib/mongodb', () => jest.fn());
jest.mock('@/lib/requestAuth', () => ({
  authenticateRequest: jest.fn(),
  createUserAccessToken: jest.fn().mockResolvedValue('mock-token'),
  issueAuthTokens: jest.fn(),
  serializeAuthenticatedUser: jest.fn((u) => ({ _id: u._id, email: u.email })),
  clearAuthCookies: jest.fn((response) => {
    response.headers.append('Set-Cookie', 'auth_token=; Max-Age=0');
    response.headers.append('Set-Cookie', 'refresh_token=; Max-Age=0');
    return response;
  }),
  getBearerToken: jest.fn((request) => {
    const header = request.headers.get('authorization');
    if (!header?.startsWith('Bearer ')) return null;
    const token = header.slice(7).trim();
    return ['', 'null', 'undefined', 'cookie-authenticated'].includes(token) ? null : token;
  }),
}));
jest.mock('@/lib/apiMiddleware', () => ({
  applyRateLimit: jest.fn(() => ({ allowed: true })),
  handleRateLimitError: jest.fn(() => ({ status: 429 })),
}));
jest.mock('@/lib/auditService', () => ({
  logActivity: jest.fn(),
}));
jest.mock('@/lib/auditNotificationService', () => ({
  notifyAboutFailedLogins: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/lib/auth', () => ({
  hashPassword: jest.fn().mockResolvedValue('$2a$12$hashedpassword'),
  verifyPassword: jest.fn(),
}));
jest.mock('@/lib/authCookie', () => ({
  getTokenFromRequest: jest.fn(),
}));
jest.mock('@/models/User', () => ({
  findOne: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
}));
// 2fa/verify route wraps its handler in withApiProtection purely for the
// rate-limit preset — bypass it entirely (same pattern as
// tests/api/two-factor-verify.test.js) so this file only has to mock the
// pieces this describe block actually cares about.
jest.mock('@/lib/withApiProtection', () => ({
  withApiProtection: (h) => h,
}));
jest.mock('@/lib/twoFactorAuth', () => ({
  verifyTwoFactorToken: jest.fn(),
  verifyBackupCode: jest.fn(),
}));
// refresh route: mock the token verification helpers, drive User.findById
// (already mocked above) per test.
jest.mock('@/lib/auth/refresh', () => ({
  getRefreshTokenFromRequest: jest.fn(),
  verifyRefreshToken: jest.fn(),
}));
// jest.setup.js's fallback `global.Response` polyfill has no real constructor
// (no headers/body support), which breaks NextResponse's real
// `extends Response` construction in this jsdom test env. Stub NextResponse
// itself instead — same pattern already used by tests/api/two-factor-bypass.test.js
// and tests/api/two-factor-verify.test.js for the same reason. This stub also
// backs a minimal mutable Headers-like object so routes that call
// `response.headers.append(...)` (logout's cookie clearing) don't blow up.
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((body, init) => {
      const cookies = [];
      return {
        status: init?.status || 200,
        json: async () => body,
        headers: {
          append: (name, value) => {
            if (name.toLowerCase() === 'set-cookie') cookies.push(value);
          },
          set: () => {},
          get: (name) => (name.toLowerCase() === 'set-cookie' ? cookies.join('\n') : null),
        },
        _cookies: cookies,
      };
    }),
  },
}));

import { SignJWT } from 'jose';
import { verifyPassword } from '@/lib/auth';
import { issueAuthTokens, authenticateRequest } from '@/lib/requestAuth';
import { notifyAboutFailedLogins } from '@/lib/auditNotificationService';
import { verifyTwoFactorToken } from '@/lib/twoFactorAuth';
import { createStepUpToken, STEP_UP_SCOPE } from '@/lib/auth/stepUp';
import { getRefreshTokenFromRequest, verifyRefreshToken } from '@/lib/auth/refresh';
import { POST as login } from '@/app/api/auth/login/route';
import { POST as verify2FA } from '@/app/api/auth/2fa/verify/route';
import { POST as logout } from '@/app/api/auth/logout/route';
import { POST as refresh } from '@/app/api/auth/refresh/route';
import User from '@/models/User';

const STEP_UP_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

function mockUser(overrides = {}) {
  return {
    _id: 'user123',
    email: 'test@test.com',
    password: '$2a$12$hashedpassword',
    status: 'Actif',
    tokenVersion: 0,
    failedLoginAttempts: 0,
    save: jest.fn().mockResolvedValue(undefined),
    incLoginAttempts: jest.fn().mockResolvedValue(undefined),
    resetLoginAttempts: jest.fn().mockResolvedValue(undefined),
    role_id: { permissions: {} },
    ...overrides,
  };
}

function loginReq(body) {
  return { headers: { get: () => null }, json: async () => body };
}

describe('POST /api/auth/login — Authentification', () => {
  beforeEach(() => jest.clearAllMocks());

  test('connecte un utilisateur avec des identifiants valides', async () => {
    User.findOne.mockReturnValue({
      select: jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockUser()),
      }),
    });
    verifyPassword.mockResolvedValueOnce(true);

    const res = await login(loginReq({ email: 'test@test.com', password: 'correct-password' }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.requirePasswordChange).toBe(false);
    expect(issueAuthTokens).toHaveBeenCalledTimes(1);
  });

  test('rejette un mot de passe incorrect', async () => {
    verifyPassword.mockResolvedValueOnce(false);
    const inc = jest.fn().mockResolvedValue(undefined);
    User.findOne.mockReturnValue({
      select: () => ({
        populate: () =>
          Promise.resolve(mockUser({ failedLoginAttempts: 0, incLoginAttempts: inc })),
      }),
    });

    const res = await login(loginReq({ email: 'test@test.com', password: 'wrong-password' }));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe('Identifiants invalides');
    expect(inc).toHaveBeenCalledTimes(1);
  });

  test('rejette un email inexistant (même message que mauvais mdp)', async () => {
    User.findOne.mockReturnValue({ select: () => ({ populate: () => Promise.resolve(null) }) });
    verifyPassword.mockResolvedValueOnce(false);

    const res = await login(loginReq({ email: 'ghost@test.com', password: 'whatever' }));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe('Identifiants invalides');
  });

  test('applique le lockout après 5 tentatives échouées (incLoginAttempts appelé)', async () => {
    verifyPassword.mockResolvedValueOnce(false);
    const inc = jest.fn().mockResolvedValue(undefined);
    // 4 prior failures -> this is the 5th, the lockout-triggering attempt.
    User.findOne.mockReturnValue({
      select: () => ({
        populate: () =>
          Promise.resolve(mockUser({ failedLoginAttempts: 4, incLoginAttempts: inc })),
      }),
    });

    const res = await login(loginReq({ email: 'test@test.com', password: 'wrong-password' }));

    expect(res.status).toBe(401);
    expect(inc).toHaveBeenCalledTimes(1);
  });

  test('utilise le dummy hash pour equalizer le timing quand l’email est inconnu', async () => {
    User.findOne.mockReturnValue({ select: () => ({ populate: () => Promise.resolve(null) }) });
    verifyPassword.mockResolvedValueOnce(false);

    await login(loginReq({ email: 'ghost@test.com', password: 'whatever' }));

    // hashPassword is mocked to always resolve '$2a$12$hashedpassword' (see
    // top-of-file mock) — the dummy-hash branch must run verifyPassword
    // against that value rather than skip the compare for unknown emails.
    expect(verifyPassword).toHaveBeenCalledWith('whatever', '$2a$12$hashedpassword');
  });

  test('applique MIN_LOGIN_DURATION_MS pour empêcher le timing attack', async () => {
    User.findOne.mockReturnValue({ select: () => ({ populate: () => Promise.resolve(null) }) });
    verifyPassword.mockResolvedValueOnce(false);

    const startedAt = Date.now();
    const res = await login(loginReq({ email: 'ghost@test.com', password: 'whatever' }));
    const elapsed = Date.now() - startedAt;

    expect(res.status).toBe(401);
    // Route floors the request at MIN_LOGIN_DURATION_MS = 350ms; allow a small
    // margin for scheduler jitter rather than asserting the exact constant.
    expect(elapsed).toBeGreaterThanOrEqual(330);
  }, 10000);

  test('notifie les admins après 5 tentatives échouées, pas avant', async () => {
    verifyPassword.mockResolvedValue(false);
    User.findOne.mockReturnValueOnce({
      select: () => ({
        populate: () => Promise.resolve(mockUser({ failedLoginAttempts: 2 })), // 3rd failure
      }),
    });
    await login(loginReq({ email: 'test@test.com', password: 'wrong-password' }));
    expect(notifyAboutFailedLogins).not.toHaveBeenCalled();

    User.findOne.mockReturnValueOnce({
      select: () => ({
        populate: () => Promise.resolve(mockUser({ failedLoginAttempts: 4 })), // 5th failure
      }),
    });
    await login(loginReq({ email: 'test@test.com', password: 'wrong-password' }));
    expect(notifyAboutFailedLogins).toHaveBeenCalledTimes(1);
    expect(notifyAboutFailedLogins).toHaveBeenCalledWith('user123', 5, 'unknown');
  });
});

function twoFAReq(token, body = { token: '123456' }) {
  return {
    headers: { get: (n) => (n === 'authorization' ? `Bearer ${token}` : null) },
    json: async () => body,
  };
}

function mockTwoFAUser(overrides = {}) {
  return {
    _id: 'u1',
    email: 'a@b.com',
    status: 'Actif',
    tokenVersion: 0,
    twoFactorEnabled: true,
    twoFactorSecret: 'secret',
    save: jest.fn().mockResolvedValue(undefined),
    role_id: { permissions: {} },
    ...overrides,
  };
}

describe('POST /api/auth/2fa — Double authentification', () => {
  beforeEach(() => jest.clearAllMocks());

  test('vérifie un code 2FA valide', async () => {
    User.findById.mockReturnValue({
      select: () => ({ populate: () => Promise.resolve(mockTwoFAUser()) }),
    });
    verifyTwoFactorToken.mockReturnValue(true);

    const token = await createStepUpToken(
      { _id: 'u1', tokenVersion: 0 },
      STEP_UP_SCOPE.TWO_FACTOR,
      5
    );
    const res = await verify2FA(twoFAReq(token, { token: '123456' }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(issueAuthTokens).toHaveBeenCalledTimes(1);
  });

  test('rejette un code 2FA invalide', async () => {
    User.findById.mockReturnValue({
      select: () => ({ populate: () => Promise.resolve(mockTwoFAUser()) }),
    });
    verifyTwoFactorToken.mockReturnValue(false);

    const token = await createStepUpToken(
      { _id: 'u1', tokenVersion: 0 },
      STEP_UP_SCOPE.TWO_FACTOR,
      5
    );
    const res = await verify2FA(twoFAReq(token, { token: '000000' }));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe('Code invalide');
    expect(issueAuthTokens).not.toHaveBeenCalled();
  });

  test('rejette un tempToken expiré', async () => {
    // Build a step-up JWT identical in shape to createStepUpToken's output,
    // but already expired — exercises the real expiry check inside
    // verifyStepUpToken (jwtVerify throws on `exp` in the past) rather than
    // waiting out a real 5-minute TTL.
    const expiredToken = await new SignJWT({
      userId: 'u1',
      scope: STEP_UP_SCOPE.TWO_FACTOR,
      stepUp: true,
      tokenVersion: 0,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(Math.floor(Date.now() / 1000) - 400)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 100)
      .sign(STEP_UP_SECRET);

    const res = await verify2FA(twoFAReq(expiredToken));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe('Session 2FA invalide ou expirée');
    expect(User.findById).not.toHaveBeenCalled();
  });
});

describe('POST /api/auth/logout — Déconnexion', () => {
  beforeEach(() => jest.clearAllMocks());

  test("déconnecte l'utilisateur et supprime les cookies", async () => {
    authenticateRequest.mockResolvedValue({ _id: 'user123' });
    User.findByIdAndUpdate.mockResolvedValue(undefined);

    const res = await logout({ headers: { get: () => null } });
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(res._cookies.some((c) => c.startsWith('auth_token=;'))).toBe(true);
    expect(res._cookies.some((c) => c.startsWith('refresh_token=;'))).toBe(true);
  });

  test('invalide le refresh token stocké (currentRefreshJti mis à null)', async () => {
    authenticateRequest.mockResolvedValue({ _id: 'user123' });
    User.findByIdAndUpdate.mockResolvedValue(undefined);

    await logout({ headers: { get: () => null } });

    expect(User.findByIdAndUpdate).toHaveBeenCalledWith('user123', { currentRefreshJti: null });
  });
});

function refreshReq() {
  return { headers: { get: () => null } };
}

function mockRefreshUser(overrides = {}) {
  return {
    _id: 'u1',
    status: 'Actif',
    tokenVersion: 0,
    currentRefreshJti: 'jti-current',
    save: jest.fn().mockResolvedValue(undefined),
    role_id: { permissions: {} },
    ...overrides,
  };
}

describe('POST /api/auth/refresh — Renouvellement du token', () => {
  beforeEach(() => jest.clearAllMocks());

  test('renouvelle le token avec un refresh token valide', async () => {
    getRefreshTokenFromRequest.mockReturnValue('valid-refresh-token');
    verifyRefreshToken.mockResolvedValue({ userId: 'u1', tokenVersion: 0, jti: 'jti-current' });
    User.findById.mockReturnValue({
      select: () => ({ populate: () => Promise.resolve(mockRefreshUser()) }),
    });

    const res = await refresh(refreshReq());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(issueAuthTokens).toHaveBeenCalledTimes(1);
  });

  test('rejette un refresh token invalide', async () => {
    getRefreshTokenFromRequest.mockReturnValue('garbage-token');
    verifyRefreshToken.mockResolvedValue(null);

    const res = await refresh(refreshReq());
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe('Refresh token invalide');
    expect(issueAuthTokens).not.toHaveBeenCalled();
  });

  test('invalide le refresh token précédent en cas de rejeu (rotation + bump tokenVersion)', async () => {
    getRefreshTokenFromRequest.mockReturnValue('stale-refresh-token');
    verifyRefreshToken.mockResolvedValue({ userId: 'u1', tokenVersion: 0, jti: 'stale-jti' });
    const user = mockRefreshUser({ currentRefreshJti: 'jti-current' }); // jti no longer matches
    User.findById.mockReturnValue({
      select: () => ({ populate: () => Promise.resolve(user) }),
    });

    const res = await refresh(refreshReq());
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe('Refresh token déjà consommé');
    expect(user.tokenVersion).toBe(1);
    expect(user.currentRefreshJti).toBeNull();
    expect(user.save).toHaveBeenCalledTimes(1);
    expect(issueAuthTokens).not.toHaveBeenCalled();
  });
});
