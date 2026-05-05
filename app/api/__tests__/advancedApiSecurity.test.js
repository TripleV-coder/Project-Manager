import { getTokenFromRequest } from '@/lib/authCookie';
import connectDB from '@/lib/mongodb';
import { authenticateRequest, serializeAuthenticatedUser } from '@/lib/requestAuth';
import User from '@/models/User';

// Mock NextResponse.json to avoid jsdom getSetCookie incompatibility
jest.mock('next/server', () => {
  const _headers = new Map();
  return {
    NextResponse: {
      json: (body, init = {}) => {
        const status = init.status || 200;
        const responseHeaders = new Map();
        return {
          status,
          ok: status >= 200 && status < 300,
          headers: {
            get: (name) => responseHeaders.get(name.toLowerCase()),
            set: (name, value) => responseHeaders.set(name.toLowerCase(), value),
            append: (name, value) => {
              const key = name.toLowerCase();
              const existing = responseHeaders.get(key);
              responseHeaders.set(key, existing ? `${existing}, ${value}` : value);
            },
            forEach: (cb) => responseHeaders.forEach(cb),
          },
          json: async () => body,
          cookies: {
            set: (name, value, opts = {}) => {
              const parts = [`${name}=${value}`];
              if (opts.httpOnly) parts.push('HttpOnly');
              if (opts.secure) parts.push('Secure');
              if (opts.sameSite) parts.push(`SameSite=${opts.sameSite}`);
              if (opts.path) parts.push(`Path=${opts.path}`);
              if (opts.maxAge !== undefined) parts.push(`Max-Age=${opts.maxAge}`);
              responseHeaders.set('set-cookie', parts.join('; '));
            },
            delete: (name) => {
              responseHeaders.set(
                'set-cookie',
                `${name}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`
              );
            },
          },
        };
      },
    },
  };
});

import { GET as getInit } from '@/app/api/init/route';
import { GET as getMe } from '@/app/api/auth/me/route';
import { POST as postLogout } from '@/app/api/auth/logout/route';

jest.mock('@/lib/mongodb', () => jest.fn());
jest.mock('@/lib/requestAuth', () => ({
  authenticateRequest: jest.fn(),
  serializeAuthenticatedUser: jest.fn(),
  clearAuthCookies: jest.requireActual('@/lib/requestAuth').clearAuthCookies,
}));
jest.mock('@/models/User', () => ({
  __esModule: true,
  default: {
    countDocuments: jest.fn(),
    findByIdAndUpdate: jest.fn().mockResolvedValue(null),
  },
}));

describe('Auth Route Security', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    connectDB.mockResolvedValue(undefined);
  });

  test('getTokenFromRequest falls back to HttpOnly cookie when bearer token is a session marker', () => {
    const request = {
      headers: {
        get: jest.fn((name) => {
          if (name === 'authorization') {
            return 'Bearer cookie-authenticated';
          }

          if (name === 'cookie') {
            return 'auth_token=header.payload.signature; theme=dark';
          }

          return null;
        }),
      },
    };

    expect(getTokenFromRequest(request)).toBe('header.payload.signature');
  });

  test('GET /api/init reports first-admin state without authenticating', async () => {
    User.countDocuments.mockResolvedValue(0);

    const response = await getInit(new Request('http://localhost/api/init'));
    const payload = await response.json();

    expect(payload).toEqual({
      hasAdmin: false,
      needsFirstAdmin: true,
      user: null,
    });
    expect(authenticateRequest).not.toHaveBeenCalled();
  });

  test('GET /api/init returns the authenticated user when a session exists', async () => {
    const user = { _id: 'user-1' };

    User.countDocuments.mockResolvedValue(2);
    authenticateRequest.mockResolvedValue(user);
    serializeAuthenticatedUser.mockReturnValue({ id: 'user-1', email: 'admin@example.com' });

    const response = await getInit(
      new Request('http://localhost/api/init', {
        headers: {
          cookie: 'auth_token=header.payload.signature',
        },
      })
    );
    const payload = await response.json();

    expect(authenticateRequest).toHaveBeenCalled();
    expect(payload.user).toEqual({ id: 'user-1', email: 'admin@example.com' });
  });

  test('GET /api/auth/me rejects anonymous requests', async () => {
    authenticateRequest.mockResolvedValue(null);

    const response = await getMe(new Request('http://localhost/api/auth/me'));
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error).toBe('Non authentifié');
  });

  test('POST /api/auth/logout clears the auth cookie', async () => {
    const response = await postLogout(
      new Request('http://localhost/api/auth/logout', { method: 'POST' })
    );
    const payload = await response.json();
    const setCookie = response.headers.get('Set-Cookie');

    expect(payload.success).toBe(true);
    expect(setCookie).toContain('auth_token=');
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('Max-Age=0');
  });
});
