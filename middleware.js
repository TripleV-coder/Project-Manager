import { NextResponse } from 'next/server';

export function middleware(request) {
  // Enforce HTTPS in production
  if (process.env.NODE_ENV === 'production' && request.headers.get('x-forwarded-proto') === 'http') {
    return NextResponse.redirect(
      new URL(request.url.replace('http://', 'https://')),
      { status: 301 }
    );
  }

  // Redirect root path to welcome
  if (request.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/welcome', request.url));
  }
}

export const config = {
  matcher: ['/', '/:path*'],
};
