'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { clearAuthSession, hasAuthSessionMarker } from '@/lib/client-auth';
import { AuthRedirectError } from '@/lib/auth-fetch';

export function useAuthFetch() {
  const router = useRouter();

  const authFetch = useCallback(
    async (url, options = {}) => {
      if (!hasAuthSessionMarker()) {
        router.push('/login');
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
        clearAuthSession();
        router.push('/login');
        throw new AuthRedirectError();
      }

      return response;
    },
    [router]
  );

  return { authFetch };
}
