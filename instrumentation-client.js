// Next.js's client-side instrumentation entry point (loaded in the browser
// before the app renders). Sentry's modern Next.js SDK expects its client
// init here rather than in the older sentry.client.config.js file.
import * as Sentry from '@sentry/nextjs';

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    debug: false,
  });
}

// Required by @sentry/nextjs to instrument App Router client-side
// navigations. Sentry.captureRouterTransitionStart silently no-ops when
// Sentry.init was never called above (NEXT_PUBLIC_SENTRY_DSN unset).
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
