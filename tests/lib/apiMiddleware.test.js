import { validateRequestSize } from '@/lib/apiMiddleware';

function req(method, headers) {
  return { method, headers: { get: (n) => headers[n.toLowerCase()] ?? null } };
}

test('accepts a body within the limit', async () => {
  const r = await validateRequestSize(req('POST', { 'content-length': '500' }), 1000);
  expect(r.valid).toBe(true);
});

test('rejects a body over the limit', async () => {
  const r = await validateRequestSize(req('POST', { 'content-length': '5000' }), 1000);
  expect(r.valid).toBe(false);
});

test('rejects a chunked POST with no content-length', async () => {
  const r = await validateRequestSize(req('POST', { 'transfer-encoding': 'chunked' }), 1000);
  expect(r.valid).toBe(false);
});

test('allows a GET with no content-length', async () => {
  const r = await validateRequestSize(req('GET', {}), 1000);
  expect(r.valid).toBe(true);
});
