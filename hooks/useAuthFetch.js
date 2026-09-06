'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { clearAuthSession, hasAuthSessionMarker } from '@/lib/client-auth';
import { AuthRedirectError, fetchWithRefresh } from '@/lib/auth-fetch';

export function useAuthFetch() {
  const router = useRouter();

  const authFetch = useCallback(
    async (url, options = {}) => {
      if (!hasAuthSessionMarker()) {
        router.push('/login');
        throw new AuthRedirectError();
      }

      return fetchWithRefresh(url, options, () => {
        clearAuthSession();
        router.push('/login');
        throw new AuthRedirectError();
      });
    },
    [router]
  );

  return { authFetch };
}
