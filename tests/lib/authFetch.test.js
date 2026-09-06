jest.mock('@/lib/client-auth', () => ({
  hasAuthSessionMarker: jest.fn(() => true),
  clearAuthSession: jest.fn(),
}));

import { authFetch, AuthRedirectError } from '@/lib/auth-fetch';
import { hasAuthSessionMarker, clearAuthSession } from '@/lib/client-auth';

function jsonResponse(status, body = {}) {
  return { status, ok: status >= 200 && status < 300, json: async () => body };
}

beforeEach(() => {
  jest.clearAllMocks();
  hasAuthSessionMarker.mockReturnValue(true);
  global.fetch = jest.fn();

  // jsdom's window.location can't be assigned to directly (navigation isn't
  // implemented) — swap it for a plain writable stand-in so authFetch's
  // `window.location.href = '/login'` redirects are observable. Referenced
  // via `global.window` (not bare `window`) because this repo's eslint
  // config doesn't give test files the browser globals.
  delete global.window.location;
  global.window.location = { href: '' };
});

test('a normal (non-401) response passes through unchanged, no refresh attempted', async () => {
  const ok = jsonResponse(200, { data: 'hi' });
  global.fetch.mockResolvedValueOnce(ok);

  const res = await authFetch('/api/things');

  expect(res).toBe(ok);
  expect(global.fetch).toHaveBeenCalledTimes(1);
  expect(global.fetch).toHaveBeenCalledWith(
    '/api/things',
    expect.objectContaining({ credentials: 'same-origin' })
  );
});

test('401 -> successful refresh -> successful retry: caller gets the retry response, refresh called once', async () => {
  const retryOk = jsonResponse(200, { data: 'after-refresh' });
  global.fetch
    .mockResolvedValueOnce(jsonResponse(401)) // original request
    .mockResolvedValueOnce(jsonResponse(200)) // /api/auth/refresh
    .mockResolvedValueOnce(retryOk); // retried original request

  const res = await authFetch('/api/things');

  expect(res).toBe(retryOk);
  expect(global.fetch).toHaveBeenCalledTimes(3);
  const refreshCalls = global.fetch.mock.calls.filter(([url]) => url === '/api/auth/refresh');
  expect(refreshCalls).toHaveLength(1);
  expect(refreshCalls[0][1]).toEqual(expect.objectContaining({ method: 'POST' }));
  expect(clearAuthSession).not.toHaveBeenCalled();
  expect(global.window.location.href).toBe('');
});

test('401 where refresh itself fails: session cleared, redirected to /login, AuthRedirectError thrown', async () => {
  global.fetch
    .mockResolvedValueOnce(jsonResponse(401)) // original request
    .mockResolvedValueOnce(jsonResponse(401)); // /api/auth/refresh fails

  await expect(authFetch('/api/things')).rejects.toThrow(AuthRedirectError);

  expect(global.fetch).toHaveBeenCalledTimes(2);
  expect(clearAuthSession).toHaveBeenCalledTimes(1);
  expect(global.window.location.href).toBe('/login');
});

test('401 -> refresh succeeds -> retry ALSO 401s: session cleared, redirected, no further retry loop', async () => {
  global.fetch
    .mockResolvedValueOnce(jsonResponse(401)) // original request
    .mockResolvedValueOnce(jsonResponse(200)) // /api/auth/refresh succeeds
    .mockResolvedValueOnce(jsonResponse(401)); // retried original request also 401s

  await expect(authFetch('/api/things')).rejects.toThrow(AuthRedirectError);

  // Exactly 3 calls total: original, refresh, one retry — no unbounded loop.
  expect(global.fetch).toHaveBeenCalledTimes(3);
  const thingsCalls = global.fetch.mock.calls.filter(([url]) => url === '/api/things');
  expect(thingsCalls).toHaveLength(2);
  const refreshCalls = global.fetch.mock.calls.filter(([url]) => url === '/api/auth/refresh');
  expect(refreshCalls).toHaveLength(1);
  expect(clearAuthSession).toHaveBeenCalledTimes(1);
  expect(global.window.location.href).toBe('/login');
});

test('concurrency: two parallel 401s dedupe to exactly one /api/auth/refresh call', async () => {
  // Two independent authFetch calls, each hitting a distinct endpoint that
  // 401s, resolving in the same tick. If each independently called
  // /api/auth/refresh, the second call would present the refresh cookie
  // rotated away by the first and the server would treat it as reuse,
  // revoking the session the first call just obtained. Only one real
  // refresh call must go out; the second authFetch must await the same
  // in-flight promise.
  let refreshCallCount = 0;
  global.fetch.mockImplementation((url) => {
    if (url === '/api/auth/refresh') {
      refreshCallCount += 1;
      return Promise.resolve(jsonResponse(200));
    }
    if (url === '/api/a' || url === '/api/b') {
      // First hit on either URL 401s; the retry (second hit) succeeds.
      const calls = global.fetch.mock.calls.filter(([u]) => u === url);
      if (calls.length <= 1) {
        return Promise.resolve(jsonResponse(401));
      }
      return Promise.resolve(jsonResponse(200, { url }));
    }
    return Promise.resolve(jsonResponse(200));
  });

  const [resA, resB] = await Promise.all([authFetch('/api/a'), authFetch('/api/b')]);

  expect(resA.status).toBe(200);
  expect(resB.status).toBe(200);
  expect(refreshCallCount).toBe(1);
  expect(clearAuthSession).not.toHaveBeenCalled();
});

test.each(['/api/auth/refresh', '/api/auth/login', '/api/auth/logout'])(
  'excluded-URL guard: a 401 from %s does not trigger a nested refresh attempt',
  async (url) => {
    global.fetch.mockResolvedValueOnce(jsonResponse(401));

    await expect(authFetch(url)).rejects.toThrow(AuthRedirectError);

    // Only the single original call — no refresh, no retry.
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(clearAuthSession).toHaveBeenCalledTimes(1);
    expect(global.window.location.href).toBe('/login');
  }
);

test('exemption match is path-based, not substring: a query string containing an exempt path is not exempted', async () => {
  // Regression: the exemption check used to be `path.includes(exempt)`,
  // which would wrongly exempt e.g. /api/projects?redirect=/api/auth/login
  // from refresh-and-retry and log the user out instead.
  const retryOk = jsonResponse(200, { data: 'after-refresh' });
  global.fetch
    .mockResolvedValueOnce(jsonResponse(401)) // original request
    .mockResolvedValueOnce(jsonResponse(200)) // /api/auth/refresh
    .mockResolvedValueOnce(retryOk); // retried original request

  const res = await authFetch('/api/projects?redirect=/api/auth/login');

  expect(res).toBe(retryOk);
  const refreshCalls = global.fetch.mock.calls.filter(([url]) => url === '/api/auth/refresh');
  expect(refreshCalls).toHaveLength(1);
});

test('a network failure during refresh (fetch rejects) is treated as a failed refresh, not an uncaught error', async () => {
  global.fetch
    .mockResolvedValueOnce(jsonResponse(401)) // original request
    .mockRejectedValueOnce(new TypeError('Failed to fetch')); // /api/auth/refresh: network error

  await expect(authFetch('/api/things')).rejects.toThrow(AuthRedirectError);

  expect(clearAuthSession).toHaveBeenCalledTimes(1);
  expect(global.window.location.href).toBe('/login');
});

test('a SYNCHRONOUS throw from fetch() during refresh does not permanently wedge future refreshes', async () => {
  // Distinct from the async-rejection case above: if fetch() throws before
  // ever returning a promise (not just rejects), a finally living inside
  // the refresh IIFE could run and reset the module-level in-flight
  // reference before the outer assignment even completes, which would then
  // immediately overwrite that reset with the already-settled failure —
  // wedging every later 401 into "refreshed=false, no network call" forever.
  global.fetch
    .mockResolvedValueOnce(jsonResponse(401)) // original request
    .mockImplementationOnce(() => {
      throw new TypeError('fetch is not a function'); // /api/auth/refresh: synchronous throw
    });
  await expect(authFetch('/api/things')).rejects.toThrow(AuthRedirectError);
  expect(global.window.location.href).toBe('/login');

  // Reset the redirect marker to prove the SECOND call below is what sets it.
  global.window.location.href = '';

  const laterRetryOk = jsonResponse(200, { data: 'later' });
  global.fetch
    .mockResolvedValueOnce(jsonResponse(401))
    .mockResolvedValueOnce(jsonResponse(200))
    .mockResolvedValueOnce(laterRetryOk);
  const res = await authFetch('/api/things');

  expect(res).toBe(laterRetryOk);
  // Two real attempts on /api/auth/refresh total: the one that threw
  // synchronously, and this second, successful one. If the in-flight
  // reference had been wedged by the first, this second authFetch would
  // reuse the stale "false" result and never call fetch('/api/auth/refresh')
  // again — it would consume the queued 200 as its retry response instead
  // and fail this assertion.
  const refreshCalls = global.fetch.mock.calls.filter(([url]) => url === '/api/auth/refresh');
  expect(refreshCalls).toHaveLength(2);
  expect(global.window.location.href).toBe('');
});

test('two 401s that do NOT overlap each start their own refresh (the in-flight dedup does not get stuck)', async () => {
  // Pins the `finally { inFlightRefresh = null }` reset: if it were ever
  // removed or misordered, this second, later authFetch call would
  // silently reuse a stale (already-settled) promise instead of issuing a
  // real refresh, and every request after the first refresh would go
  // through unrefreshed.
  const firstRetryOk = jsonResponse(200, { data: 'first' });
  global.fetch
    .mockResolvedValueOnce(jsonResponse(401))
    .mockResolvedValueOnce(jsonResponse(200))
    .mockResolvedValueOnce(firstRetryOk);
  await authFetch('/api/things');

  const secondRetryOk = jsonResponse(200, { data: 'second' });
  global.fetch
    .mockResolvedValueOnce(jsonResponse(401))
    .mockResolvedValueOnce(jsonResponse(200))
    .mockResolvedValueOnce(secondRetryOk);
  const res = await authFetch('/api/things');

  expect(res).toBe(secondRetryOk);
  const refreshCalls = global.fetch.mock.calls.filter(([url]) => url === '/api/auth/refresh');
  expect(refreshCalls).toHaveLength(2);
});
