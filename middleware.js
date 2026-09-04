import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { getTokenFromRequest } from '@/lib/authCookie';

// Public routes (no authentication required)
const publicRoutes = [
  '/login',
  '/first-admin',
  '/first-login-reset',
  '/api/check',
  '/api/init',
  '/api/health',
  '/api/auth/first-admin',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/first-login-reset',
  '/api/health',
  '/api/settings',
  '/api/settings/maintenance',
  '/welcome',
  '/maintenance',
];

// Synchronous JWT verification for middleware (Edge Runtime compatible)
async function verifyTokenMiddleware(token) {
  try {
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET not configured');
      return null;
    }
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (error) {
    return null;
  }
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Create response
  const response = NextResponse.next();

  // API Version header
  if (pathname.startsWith('/api')) {
    response.headers.set('X-API-Version', '1.1.0');
  }

  // ==========================================
  // SECURITY HEADERS
  // ==========================================

  // Content Security Policy
  // Production: nonce-based scripts (no unsafe-inline / unsafe-eval). Styles still
  // need 'unsafe-inline' because Tailwind & Radix emit inline style attributes — a
  // hash/nonce-based style policy is tracked for a follow-up. Development keeps
  // 'unsafe-eval' for HMR.
  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || 'http://localhost:4000';
  const isDev = process.env.NODE_ENV !== 'production';

  // Per-request nonce (16 random bytes -> base64). Exposed via x-nonce header so
  // server components / Script tags can read it.
  const nonceBytes = new Uint8Array(16);
  crypto.getRandomValues(nonceBytes);
  const nonce = Buffer.from(nonceBytes).toString('base64');
  response.headers.set('x-nonce', nonce);

  const scriptSrc = isDev
    ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval'`
    : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`;

  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      scriptSrc,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https: blob:",
      "font-src 'self' data:",
      `connect-src 'self' ${socketUrl} ws://localhost:* wss://localhost:*`,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      isDev ? '' : 'upgrade-insecure-requests',
    ]
      .filter(Boolean)
      .join('; ')
  );

  // XSS Protection
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // HSTS (Force HTTPS in production)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  // Referrer Policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions Policy
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // CORS — strict: in production ALLOWED_ORIGINS must be set explicitly.
  // Cross-origin requests with a non-matching Origin are rejected at the edge.
  const origin = request.headers.get('origin');
  const rawAllowed = process.env.ALLOWED_ORIGINS;
  const allowedOrigins = rawAllowed
    ? rawAllowed
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : isDev
      ? ['http://localhost:3000']
      : [];

  const isCrossOrigin =
    !!origin &&
    (() => {
      try {
        return new URL(origin).origin !== new URL(request.url).origin;
      } catch {
        return true;
      }
    })();

  if (isCrossOrigin) {
    if (allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Vary', 'Origin');
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      response.headers.set(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, DELETE, PATCH, OPTIONS'
      );
      response.headers.set(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, X-Requested-With'
      );
    } else {
      // Deny cross-origin from non-allowlisted origins (or when allowlist is empty)
      return new NextResponse(JSON.stringify({ error: 'Origin not allowed' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 200, headers: response.headers });
  }

  // ==========================================
  // HTTPS Redirect
  // ==========================================
  if (
    process.env.NODE_ENV === 'production' &&
    request.headers.get('x-forwarded-proto') === 'http'
  ) {
    return NextResponse.redirect(new URL(request.url.replace('http://', 'https://')), {
      status: 301,
    });
  }

  // ==========================================
  // ROOT REDIRECT
  // ==========================================
  if (request.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/welcome', request.url));
  }

  // ==========================================
  // AUTHENTICATION
  // ==========================================

  // Public routes: no verification needed
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return response;
  }

  // API routes: verify JWT token from Authorization header or HttpOnly cookie
  if (pathname.startsWith('/api')) {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json(
        { error: 'Non autorisé', message: 'Token manquant' },
        { status: 401, headers: response.headers }
      );
    }

    const decoded = await verifyTokenMiddleware(token);

    if (!decoded) {
      return NextResponse.json(
        { error: 'Non autorisé', message: 'Token invalide ou expiré' },
        { status: 401, headers: response.headers }
      );
    }

    // Add user info to response headers
    response.headers.set('x-user-id', decoded.userId || decoded.sub || '');
    response.headers.set('x-user-role', decoded.role || 'user');

    return response;
  }

  // Frontend routes: rely on HttpOnly auth cookie
  const authCookie = request.cookies.get('auth_token');

  if (!authCookie) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return response;
}

// Configure matcher
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)',
  ],
};
