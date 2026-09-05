import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { getTokenFromRequest } from '@/lib/authCookie';

// Public routes (no authentication required)
const publicRoutes = [
  '/login',
  '/first-admin',
  // NOT '/first-login-reset' — no such page exists (app/first-login/page.js
  // is the real page; '/api/auth/first-login-reset' below is the API route).
  '/first-login',
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
  //
  // Task 4.2 (2026-09-05) investigated wiring a per-request nonce into
  // script-src with 'strict-dynamic' (the setup this file used to have) and
  // found it CANNOT work for this app, so it was deliberately dropped rather
  // than left silently broken. Evidence:
  //   - Next 14.2.35 DOES have a built-in mechanism to auto-nonce its own
  //     framework bootstrap scripts — it reads
  //     req.headers['content-security-policy'] on the *incoming request*
  //     (not the response!) and extracts the nonce
  //     (node_modules/next/dist/server/app-render/get-script-nonce-from-header.js,
  //     called from node_modules/next/dist/server/app-render/app-render.js
  //     ~line 572: "Get the nonce from the incoming request if it has one").
  //     That alone would be wireable by also forwarding the CSP onto the
  //     request via NextResponse.next({ request: { headers } }).
  //   - BUT that mechanism only runs during a live, per-request render. A
  //     `npm run build` of this app shows nearly every route — /dashboard and
  //     all of its sibling pages — is prerendered STATIC ("○"), not dynamic
  //     ("ƒ"), because none of them call headers()/cookies()/searchParams.
  //     Static HTML is generated once at build time, with no request (and
  //     therefore no nonce) in scope.
  //   - Confirmed empirically on the actual build output: every prerendered
  //     page under .next/server/app/**.html (dashboard.html and ~25 sibling
  //     dashboard pages, 500+ <script> tags total, including the inline
  //     `self.__next_f.push(...)` RSC-hydration payload scripts every App
  //     Router page ships) has ZERO `nonce` attributes.
  //   - With 'strict-dynamic' present, browsers that support it ignore 'self'
  //     entirely, so every one of those un-nonced scripts — including the
  //     framework's own bootstrap chunks AND the inline hydration payload
  //     React needs to hydrate the page — would be blocked. That's not a
  //     partial degradation, it's a broken app on nearly every route.
  //   - Dropping only 'strict-dynamic' (keeping 'nonce-X') doesn't fix it
  //     either: per the CSP3 spec, the mere presence of a nonce/hash source
  //     in a directive silently disables 'unsafe-inline' for that directive,
  //     so the un-nonced inline hydration scripts would still be blocked.
  //   - Fixing this properly would mean forcing every route to dynamic
  //     rendering (a real perf/infra trade-off) or a template-level nonce
  //     injection strategy — both out of scope for this task.
  // Decision: relax script-src to 'self' 'unsafe-inline', the same trade-off
  // already accepted below for style-src (Tailwind/Radix inline styles).
  // This still blocks loading arbitrary third-party script origins; it does
  // not protect against inline-script injection.
  // TODO(Task 6.5): move this rationale into docs/DEPLOYMENT.md once that
  // file exists.
  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || 'http://localhost:4000';
  const isDev = process.env.NODE_ENV !== 'production';

  const scriptSrc = isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self' 'unsafe-inline'";

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
  // Deprecated header; modern guidance is to disable the legacy auditor.
  response.headers.set('X-XSS-Protection', '0');

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

    // Forward identity to the route handler on the REQUEST (not the response —
    // that would leak it to the browser and it wouldn't reach the handler).
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', decoded.userId || decoded.sub || '');
    requestHeaders.set('x-user-role', decoded.role || 'user');

    const authedResponse = NextResponse.next({ request: { headers: requestHeaders } });
    // Re-apply the security headers we set on `response` onto the new response.
    response.headers.forEach((value, key) => authedResponse.headers.set(key, value));
    return authedResponse;
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
