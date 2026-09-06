// Next.js runs register() once when the server boots.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { assertEnvValid } = await import('@/lib/envValidation');
    assertEnvValid();

    if (process.env.SENTRY_DSN) {
      const Sentry = await import('@sentry/nextjs');
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        debug: false,
      });
    }
  }

  if (process.env.NEXT_RUNTIME === 'edge' && process.env.SENTRY_DSN) {
    const Sentry = await import('@sentry/nextjs');
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      debug: false,
    });
  }
}

// Required by @sentry/nextjs to capture errors from nested React Server
// Components. A no-op (Sentry.captureRequestError silently no-ops when
// Sentry.init was never called, i.e. SENTRY_DSN unset) rather than a
// conditional export, so the SDK's own build-time check for this hook
// always finds it and doesn't warn about "outdated configuration".
export const onRequestError = async (...args) => {
  if (!process.env.SENTRY_DSN) return;
  const Sentry = await import('@sentry/nextjs');
  Sentry.captureRequestError(...args);
};
