import { NextResponse } from 'next/server';

export function middleware(request) {
  // Redirect root path to welcome
  if (request.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/welcome', request.url));
  }
}

export const config = {
  matcher: ['/'],
};
