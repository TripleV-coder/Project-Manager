jest.mock('@/lib/mongodb', () => jest.fn());
jest.mock('@/lib/requestAuth', () => ({ authenticateRequest: jest.fn() }));
jest.mock('@/lib/apiMiddleware', () => ({
  applyRateLimit: jest.fn(),
  applyUserRateLimit: jest.fn(),
  // Plain object rather than `new Response(...)`: the jsdom test env's global
  // `Response` polyfill (jest.setup.js) only implements the static `.json()`
  // helper — its constructor ignores `init`, so a real Response would never
  // carry a `.status`. Same landmine noted in tests/api/two-factor-verify.test.js.
  handleRateLimitError: jest.fn(() => ({ status: 429 })),
  validateRequestSize: jest.fn(async () => ({ valid: true })),
}));

import { withApiProtection } from '@/lib/withApiProtection';
import { authenticateRequest } from '@/lib/requestAuth';
import { applyRateLimit, applyUserRateLimit } from '@/lib/apiMiddleware';

const baseReq = { method: 'GET', url: 'http://x/api/things', headers: { get: () => null } };

beforeEach(() => {
  jest.clearAllMocks();
  // Default to "allowed" so tests that don't care about pass 2 (e.g. the
  // pass-1-fails case, or requireAuth:false) don't need their own stub —
  // applyUserRateLimit is only ever reached past pass 1 + successful auth.
  applyUserRateLimit.mockResolvedValue({ allowed: true });
});

test('rate limit is checked before authentication', async () => {
  applyRateLimit.mockResolvedValue({ allowed: false, resetTime: 60 });
  const handler = jest.fn();
  const wrapped = withApiProtection(handler, { requireAuth: true });

  const res = await wrapped(baseReq, {});

  expect(res.status).toBe(429);
  expect(authenticateRequest).not.toHaveBeenCalled();
  expect(handler).not.toHaveBeenCalled();
});

test('authenticated request still rate-limited per user after auth passes', async () => {
  applyRateLimit.mockResolvedValue({ allowed: true });
  authenticateRequest.mockResolvedValue({ _id: 'u1', role_id: { permissions: {} } });
  const handler = jest.fn(async () => new Response('ok'));
  const wrapped = withApiProtection(handler, { requireAuth: true });

  await wrapped(baseReq, {});

  // Pass 1: IP-only (no userId), plain (undoubled) preset config. Called
  // exactly once — the IP-keyed counter must be incremented only here.
  expect(applyRateLimit).toHaveBeenCalledTimes(1);
  expect(applyRateLimit).toHaveBeenNthCalledWith(1, baseReq, null, expect.any(Object));
  expect(applyRateLimit.mock.calls[0][2].max).toBe(1000); // global preset max, undoubled

  // Pass 2: per-user-only limit, plain preset config, no IP re-check.
  expect(applyUserRateLimit).toHaveBeenCalledTimes(1);
  expect(applyUserRateLimit).toHaveBeenNthCalledWith(1, 'u1', expect.any(Object));
  expect(applyUserRateLimit.mock.calls[0][1].max).toBe(1000);

  expect(handler).toHaveBeenCalled();
});

test('requireAuth: false still gets the pass-1 IP-only rate limit but skips auth entirely', async () => {
  // Mirrors app/api/auth/2fa/verify/route.js, which calls withApiProtection
  // with { requireAuth: false } and does its own manual auth inside the
  // handler. That route must be unaffected by this change except for also
  // gaining the new pass-1 IP limit.
  applyRateLimit.mockResolvedValue({ allowed: true });
  const handler = jest.fn(async () => new Response('ok'));
  const wrapped = withApiProtection(handler, { requireAuth: false });

  await wrapped(baseReq, {});

  expect(applyRateLimit).toHaveBeenCalledTimes(1);
  expect(applyRateLimit).toHaveBeenCalledWith(baseReq, null, expect.any(Object));
  expect(applyUserRateLimit).not.toHaveBeenCalled();
  expect(authenticateRequest).not.toHaveBeenCalled();
  expect(handler).toHaveBeenCalledWith(baseReq, expect.objectContaining({ user: null }));
});
