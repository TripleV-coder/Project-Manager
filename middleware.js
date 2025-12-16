import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// Public routes (no authentication required)
const publicRoutes = [
  '/login',
  '/first-admin',
  '/first-login-reset',
  '/api/check',
  '/api/init',
  '/api/auth/first-admin',
  '/api/auth/login',
  '/api/auth/first-login-reset',
  '/api/health',
  '/welcome'
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

  // ==========================================
  // SECURITY HEADERS
  // ==========================================

  // Content Security Policy
  // Note: 'unsafe-inline' and 'unsafe-eval' are required for Next.js development mode
  // In production, we still need 'unsafe-inline' for inline styles (Tailwind CSS)
  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || 'http://localhost:4000';
  const isDev = process.env.NODE_ENV !== 'production';

  // Build script-src based on environment
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
      isDev ? "" : "upgrade-insecure-requests"
    ].filter(Boolean).join('; ')
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
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  );

  // CORS
  const origin = request.headers.get('origin');
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];

  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, PATCH, OPTIONS'
    );
    response.headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Requested-With'
    );
  }

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 200, headers: response.headers });
  }

  // ==========================================
  // HTTPS Redirect
  // ==========================================
  if (process.env.NODE_ENV === 'production' && request.headers.get('x-forwarded-proto') === 'http') {
    return NextResponse.redirect(
      new URL(request.url.replace('http://', 'https://')),
      { status: 301 }
    );
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
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return response;
  }

  // API routes: verify JWT token
  if (pathname.startsWith('/api')) {
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Non autorisé', message: 'Token manquant' },
        { status: 401, headers: response.headers }
      );
    }

    const token = authHeader.substring(7);

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

  // Frontend routes: check auth cookie or localStorage token
  const authCookie = request.cookies.get('auth_token');

  if (!authCookie) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return response;
}

// Configure matcher
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)'
  ]
};
