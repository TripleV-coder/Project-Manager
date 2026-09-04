const ORIGINAL_ENV = process.env.NODE_ENV;

function reqWith(headers) {
  return { headers: { get: (n) => headers[n.toLowerCase()] ?? null } };
}

afterEach(() => {
  process.env.NODE_ENV = ORIGINAL_ENV;
  delete process.env.TRUSTED_PROXY_COUNT;
  jest.resetModules();
});

test('dev: trusts leftmost x-forwarded-for (e2e helper contract)', () => {
  process.env.NODE_ENV = 'test';
  const { getClientIP } = require('@/lib/rateLimit');
  expect(getClientIP(reqWith({ 'x-forwarded-for': '203.0.113.9, 10.0.0.1' }))).toBe('203.0.113.9');
});

test('prod, 1 proxy: takes the entry our proxy appended, not the spoofed leftmost', () => {
  process.env.NODE_ENV = 'production';
  const { getClientIP } = require('@/lib/rateLimit');
  // attacker sent "1.1.1.1", our proxy appended the real client "198.51.100.7"
  expect(getClientIP(reqWith({ 'x-forwarded-for': '1.1.1.1, 198.51.100.7' }))).toBe('198.51.100.7');
});

test('prod, 2 proxies: TRUSTED_PROXY_COUNT=2 skips both trusted hops', () => {
  process.env.NODE_ENV = 'production';
  process.env.TRUSTED_PROXY_COUNT = '2';
  const { getClientIP } = require('@/lib/rateLimit');
  expect(getClientIP(reqWith({ 'x-forwarded-for': 'evil, 198.51.100.7, 10.0.0.2' }))).toBe(
    '198.51.100.7'
  );
});

test('prod: too few entries falls back to x-real-ip', () => {
  process.env.NODE_ENV = 'production';
  const { getClientIP } = require('@/lib/rateLimit');
  expect(getClientIP(reqWith({ 'x-real-ip': '198.51.100.7' }))).toBe('198.51.100.7');
});

test('prod: nothing usable returns "unknown"', () => {
  process.env.NODE_ENV = 'production';
  const { getClientIP } = require('@/lib/rateLimit');
  expect(getClientIP(reqWith({}))).toBe('unknown');
});
