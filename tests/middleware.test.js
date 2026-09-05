import { middleware } from '@/middleware';

jest.mock('jose', () => ({
  jwtVerify: jest.fn(async () => ({ payload: { userId: 'u1', role: 'Admin' } })),
}));
jest.mock('@/lib/authCookie', () => ({ getTokenFromRequest: () => 'tok' }));

// This repo's jsdom test environment can't construct a real next/server
// NextResponse (its `.next()`/constructor path throws on a missing
// `getSetCookie` in the polyfilled Response/Headers). middleware.js isn't a
// route handler, so we can't reuse the route-handler mocking pattern as-is,
// but the same "mock next/server" idea applies: replace NextResponse with a
// minimal, faithful-enough stand-in built on the real (jsdom-provided)
// `Headers`, so the middleware's own header-setting logic is what's under
// test, not next's Response internals.
jest.mock('next/server', () => {
  class MockNextResponse {
    constructor(body, init = {}) {
      this.body = body;
      this.status = init.status || 200;
      this.headers =
        init.headers instanceof Headers ? init.headers : new Headers(init.headers || {});
    }
  }
  MockNextResponse.next = jest.fn(
    (init = {}) => new MockNextResponse(null, { headers: init.headers })
  );
  MockNextResponse.json = jest.fn((body, init = {}) => new MockNextResponse(body, init));
  MockNextResponse.redirect = jest.fn((url, init = {}) => {
    const status = typeof init === 'number' ? init : init.status || 307;
    return new MockNextResponse(null, { status, headers: { Location: String(url) } });
  });
  return { NextResponse: MockNextResponse };
});

function apiRequest(pathname) {
  const url = `http://localhost${pathname}`;
  return {
    nextUrl: { pathname },
    url,
    method: 'GET',
    headers: { get: (n) => (n === 'origin' ? null : null) },
    cookies: { get: () => ({ value: 'tok' }) },
  };
}

test('X-XSS-Protection is disabled', async () => {
  const res = await middleware(apiRequest('/api/projects'));
  expect(res.headers.get('X-XSS-Protection')).toBe('0');
});

test('x-user-id is not exposed on the response to the client', async () => {
  const res = await middleware(apiRequest('/api/projects'));
  expect(res.headers.get('x-user-id')).toBeNull();
  expect(res.headers.get('x-user-role')).toBeNull();
});
