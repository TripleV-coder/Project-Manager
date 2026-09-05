'use client';

import { clearAuthSession, hasAuthSessionMarker } from '@/lib/client-auth';

export class AuthRedirectError extends Error {
  constructor() {
    super('Authentication required');
    this.name = 'AuthRedirectError';
  }
}

export async function authFetch(url, options = {}) {
  if (typeof window !== 'undefined' && !hasAuthSessionMarker()) {
    window.location.href = '/login';
    throw new AuthRedirectError();
  }

  const response = await fetch(url, {
    ...options,
    credentials: 'same-origin',
    headers: {
      ...options.headers,
    },
  });

  if (response.status === 401) {
    if (typeof window !== 'undefined') {
      clearAuthSession();
      window.location.href = '/login';
    }
    throw new AuthRedirectError();
  }

  return response;
}
