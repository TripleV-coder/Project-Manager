'use client';

export const AUTH_SESSION_MARKER = 'cookie-authenticated';

export function markAuthSession(user = null) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem('pm_token', AUTH_SESSION_MARKER);

  if (user) {
    window.localStorage.setItem('pm_user', JSON.stringify(user));
  }

  window.dispatchEvent(new Event('auth-session-changed'));
}

export function clearAuthSession() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem('pm_token');
  window.localStorage.removeItem('pm_user');
  window.dispatchEvent(new Event('auth-session-changed'));
}

export function getLegacyAuthMarker() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem('pm_token');
}

export function hasAuthSessionMarker() {
  return getLegacyAuthMarker() === AUTH_SESSION_MARKER;
}
