/**
 * Regression: lib/rateLimitRedis.js's checkRateLimitByIP must key its bucket
 * on the trust-boundary-hardened IP from lib/rateLimit.js's getClientIP —
 * not by re-deriving it from the raw leftmost X-Forwarded-For hop, which is
 * fully attacker-controlled and would let an attacker get a fresh
 * rate-limit bucket on every request whenever REDIS_URL is configured
 * (the documented production/multi-instance setup).
 *
 * REDIS_URL is intentionally left unset in these tests so checkRateLimit
 * falls back to rateLimitRedis.js's own in-memory store — no real Redis
 * needed, and the fallback path shares the exact same key-derivation code
 * we're testing.
 */
const ORIGINAL_ENV = process.env.NODE_ENV;

function reqWith(xff) {
  return { headers: { get: (n) => (n === 'x-forwarded-for' ? xff : null) } };
}

afterEach(() => {
  process.env.NODE_ENV = ORIGINAL_ENV;
  delete process.env.TRUSTED_PROXY_COUNT;
  delete process.env.REDIS_URL;
  jest.resetModules();
});

test('checkRateLimitByIP keys on the hardened rightmost-hop IP, not the spoofable leftmost XFF value', async () => {
  process.env.NODE_ENV = 'production';
  delete process.env.REDIS_URL;
  const { checkRateLimitByIP } = require('@/lib/rateLimitRedis');
  const config = { windowMs: 60000, max: 10 };

  // Two different attacker-controlled leftmost hops, but the SAME real
  // (trusted, rightmost) client IP appended by our own proxy.
  const r1 = await checkRateLimitByIP(reqWith('1.1.1.1, 198.51.100.7'), 'test-ns-shared', config);
  const r2 = await checkRateLimitByIP(reqWith('9.9.9.9, 198.51.100.7'), 'test-ns-shared', config);

  // If checkRateLimitByIP were still trusting the leftmost hop, these two
  // requests would land in different buckets (count 1 each) — a fresh
  // counter on every request. They must instead share one bucket.
  expect(r1.count).toBe(1);
  expect(r2.count).toBe(2);
});

test('checkRateLimitByIP gives different real client IPs independent buckets', async () => {
  process.env.NODE_ENV = 'production';
  delete process.env.REDIS_URL;
  const { checkRateLimitByIP } = require('@/lib/rateLimitRedis');
  const config = { windowMs: 60000, max: 10 };

  const r1 = await checkRateLimitByIP(reqWith('evil, 203.0.113.1'), 'test-ns-distinct', config);
  const r2 = await checkRateLimitByIP(reqWith('evil, 203.0.113.2'), 'test-ns-distinct', config);

  expect(r1.count).toBe(1);
  expect(r2.count).toBe(1);
});
