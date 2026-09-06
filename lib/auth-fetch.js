'use client';

import { clearAuthSession, hasAuthSessionMarker } from '@/lib/client-auth';

export class AuthRedirectError extends Error {
  constructor() {
    super('Authentication required');
    this.name = 'AuthRedirectError';
  }
}

// Endpoints whose own 401 means "this auth attempt itself failed" — not
// "your access token expired." Attempting a refresh-and-retry on a 401 from
// one of these would either recurse into itself (/api/auth/refresh) or
// misinterpret a login/logout failure as an access-token expiry.
// (Defensive: today nothing calls these three through authFetch/useAuthFetch —
// they're fetched directly — but keep the guard for whoever wires them up next.)
const NO_REFRESH_RETRY_PATHS = ['/api/auth/refresh', '/api/auth/login', '/api/auth/logout'];

function isRefreshExemptUrl(url) {
  const raw = typeof url === 'string' ? url : String(url);
  let path;
  try {
    path = new URL(raw, typeof window !== 'undefined' ? window.location.origin : 'http://localhost')
      .pathname;
  } catch {
    path = raw;
  }
  return NO_REFRESH_RETRY_PATHS.some((exempt) => path === exempt || path.startsWith(`${exempt}/`));
}

// Module-level in-flight refresh promise. When multiple callers (authFetch or
// useAuthFetch, across the whole app) hit a 401 around the same time (e.g. a
// dashboard firing several parallel requests), only ONE of them should
// actually call /api/auth/refresh — the refresh_token cookie is single-use
// and rotated on every successful call, so a second concurrent call
// presenting the same (now-stale) refresh token would be treated as reuse
// and would revoke the session the first call just obtained. Every other
// 401 must await this SAME promise instead of starting its own refresh.
let inFlightRefresh = null;

async function refreshAccessToken() {
  if (!inFlightRefresh) {
    // Assign before the async body can run any cleanup: if fetch() were to
    // throw *synchronously* (not just return a rejected promise — e.g. a
    // shadowed/undefined `fetch`), an async function's own try/catch/finally
    // still unwinds synchronously up to that point, so a finally living
    // *inside* this IIFE could null `inFlightRefresh` before this outer
    // assignment even runs — and the assignment would then immediately
    // overwrite that null with the (already-settled, unrecoverable) promise,
    // wedging every future 401 into refreshed=false with no network call
    // ever attempted again. Resetting by identity from the outside closes
    // that gap regardless of how the promise inside settles.
    const started = (async () => {
      try {
        const response = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'same-origin',
        });
        return response.ok;
      } catch {
        // Network failure, timeout, etc. — treat exactly like a failed
        // refresh (redirect to login), never let this escape as a raw
        // rejection that callers checking `instanceof AuthRedirectError`
        // wouldn't recognize.
        return false;
      }
    })();
    inFlightRefresh = started;
    started.finally(() => {
      if (inFlightRefresh === started) {
        inFlightRefresh = null;
      }
    });
  }

  return inFlightRefresh;
}

/**
 * Core authenticated-fetch-with-refresh-and-retry logic, shared by
 * `authFetch` (module-level, redirects via `window.location`) and
 * `useAuthFetch` (hook, redirects via the App Router's `router.push`) so the
 * refresh/retry/dedup behavior only exists once.
 * @param {string} url
 * @param {object} options
 * @param {() => void} onUnauthorized - called when the session is
 *   unrecoverable (exempt-path 401, failed refresh, or a 401 on the retry);
 *   must itself throw (or otherwise never return) — the caller's redirect
 *   side effect lives here.
 */
export async function fetchWithRefresh(url, options, onUnauthorized) {
  const response = await fetch(url, {
    ...options,
    credentials: 'same-origin',
    headers: {
      ...options.headers,
    },
  });

  if (response.status !== 401) {
    return response;
  }

  if (isRefreshExemptUrl(url)) {
    onUnauthorized();
    throw new AuthRedirectError();
  }

  const refreshed = await refreshAccessToken();

  if (!refreshed) {
    onUnauthorized();
    throw new AuthRedirectError();
  }

  const retryResponse = await fetch(url, {
    ...options,
    credentials: 'same-origin',
    headers: {
      ...options.headers,
    },
  });

  if (retryResponse.status === 401) {
    onUnauthorized();
    throw new AuthRedirectError();
  }

  return retryResponse;
}

function redirectToLogin() {
  if (typeof window !== 'undefined') {
    clearAuthSession();
    window.location.href = '/login';
  }
  throw new AuthRedirectError();
}

export async function authFetch(url, options = {}) {
  if (typeof window !== 'undefined' && !hasAuthSessionMarker()) {
    window.location.href = '/login';
    throw new AuthRedirectError();
  }

  return fetchWithRefresh(url, options, redirectToLogin);
}
