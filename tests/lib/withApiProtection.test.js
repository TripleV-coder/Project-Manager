jest.mock('@/lib/mongodb', () => jest.fn());
jest.mock('@/lib/requestAuth', () => ({ authenticateRequest: jest.fn() }));
jest.mock('@/lib/apiMiddleware', () => ({
  applyRateLimit: jest.fn(),
  // Plain object rather than `new Response(...)`: the jsdom test env's global
  // `Response` polyfill (jest.setup.js) only implements the static `.json()`
  // helper — its constructor ignores `init`, so a real Response would never
  // carry a `.status`. Same landmine noted in tests/api/two-factor-verify.test.js.
  handleRateLimitError: jest.fn(() => ({ status: 429 })),
  validateRequestSize: jest.fn(async () => ({ valid: true })),
}));

import { withApiProtection } from '@/lib/withApiProtection';
import { authenticateRequest } from '@/lib/requestAuth';
import { applyRateLimit } from '@/lib/apiMiddleware';

const baseReq = { method: 'GET', url: 'http://x/api/things', headers: { get: () => null } };

beforeEach(() => jest.clearAllMocks());

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
  // mockResolvedValue (not "Once"): the two-pass implementation calls
  // applyRateLimit twice for an authenticated request (IP-only pass before
  // auth, combined IP+user pass after) — both calls must resolve allowed.
  applyRateLimit.mockResolvedValue({ allowed: true });
  authenticateRequest.mockResolvedValue({ _id: 'u1', role_id: { permissions: {} } });
  const handler = jest.fn(async () => new Response('ok'));
  const wrapped = withApiProtection(handler, { requireAuth: true });

  await wrapped(baseReq, {});

  expect(applyRateLimit).toHaveBeenCalledTimes(2);
  // Pass 1: IP-only (no userId), doubled headroom on `max`.
  expect(applyRateLimit).toHaveBeenNthCalledWith(
    1,
    baseReq,
    null,
    expect.objectContaining({ max: expect.any(Number) })
  );
  expect(applyRateLimit.mock.calls[0][2].max).toBe(2000); // global preset max (1000) * 2
  // Pass 2: combined IP + user, plain preset config (no doubling).
  expect(applyRateLimit).toHaveBeenNthCalledWith(2, baseReq, 'u1', expect.any(Object));
  expect(applyRateLimit.mock.calls[1][2].max).toBe(1000);
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
  expect(authenticateRequest).not.toHaveBeenCalled();
  expect(handler).toHaveBeenCalledWith(baseReq, expect.objectContaining({ user: null }));
});
