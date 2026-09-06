jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));
jest.mock('@/lib/client-auth', () => ({
  hasAuthSessionMarker: jest.fn(() => true),
  clearAuthSession: jest.fn(),
}));

import { renderHook } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { useAuthFetch } from '@/hooks/useAuthFetch';
import { hasAuthSessionMarker, clearAuthSession } from '@/lib/client-auth';
import { AuthRedirectError } from '@/lib/auth-fetch';

function jsonResponse(status, body = {}) {
  return { status, ok: status >= 200 && status < 300, json: async () => body };
}

const push = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  hasAuthSessionMarker.mockReturnValue(true);
  useRouter.mockReturnValue({ push });
  global.fetch = jest.fn();

  // Same jsdom-navigation workaround as tests/lib/authFetch.test.js: lets us
  // assert this hook does NOT fall back to window.location, only router.push.
  delete global.window.location;
  global.window.location = { href: '' };
});

test('a normal (non-401) response passes through unchanged', async () => {
  const { result } = renderHook(() => useAuthFetch());
  const ok = jsonResponse(200, { data: 'hi' });
  global.fetch.mockResolvedValueOnce(ok);

  const res = await result.current.authFetch('/api/things');

  expect(res).toBe(ok);
  expect(push).not.toHaveBeenCalled();
});

test('this hook shares the same refresh-and-retry core as authFetch: 401 -> refresh -> retry succeeds', async () => {
  const { result } = renderHook(() => useAuthFetch());
  const retryOk = jsonResponse(200, { data: 'after-refresh' });
  global.fetch
    .mockResolvedValueOnce(jsonResponse(401)) // original request
    .mockResolvedValueOnce(jsonResponse(200)) // /api/auth/refresh
    .mockResolvedValueOnce(retryOk); // retried original request

  const res = await result.current.authFetch('/api/things');

  expect(res).toBe(retryOk);
  const refreshCalls = global.fetch.mock.calls.filter(([url]) => url === '/api/auth/refresh');
  expect(refreshCalls).toHaveLength(1);
  expect(push).not.toHaveBeenCalled();
  expect(clearAuthSession).not.toHaveBeenCalled();
});

test('when refresh fails, this hook redirects via router.push (not window.location)', async () => {
  const { result } = renderHook(() => useAuthFetch());
  global.fetch
    .mockResolvedValueOnce(jsonResponse(401)) // original request
    .mockResolvedValueOnce(jsonResponse(401)); // /api/auth/refresh fails

  await expect(result.current.authFetch('/api/things')).rejects.toThrow(AuthRedirectError);

  expect(clearAuthSession).toHaveBeenCalledTimes(1);
  expect(push).toHaveBeenCalledWith('/login');
  expect(global.window.location.href).toBe('');
});

test('no session marker: redirects immediately via router.push, no fetch attempted', async () => {
  hasAuthSessionMarker.mockReturnValue(false);
  const { result } = renderHook(() => useAuthFetch());

  await expect(result.current.authFetch('/api/things')).rejects.toThrow(AuthRedirectError);

  expect(global.fetch).not.toHaveBeenCalled();
  expect(push).toHaveBeenCalledWith('/login');
  expect(global.window.location.href).toBe('');
});
