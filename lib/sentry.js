import { captureException } from '@sentry/nextjs';
import { createLogger } from '@/lib/logger';
const log = createLogger('sentry');

/**
 * Sentry error reporting utility
 * Wrapper around Sentry SDK with project-specific context
 */

/**
 * Report an error to Sentry with additional context
 */
export function reportError(error, context = {}) {
  if (process.env.NODE_ENV !== 'production') {
    log.error('[Sentry]', { error, context });
    return;
  }

  captureException(error, {
    tags: {
      component: context.component || 'unknown',
      action: context.action || 'unknown',
    },
    extra: {
      userId: context.userId,
      projectId: context.projectId,
      requestId: context.requestId,
      ...context.extra,
    },
  });
}

/**
 * Report an API error with request context
 */
export function reportApiError(error, request, context = {}) {
  const url = request?.url || 'unknown';
  const method = request?.method || 'unknown';
  const userId = request?.headers?.get('x-user-id') || 'anonymous';

  reportError(error, {
    component: 'api',
    action: `${method} ${url}`,
    userId,
    requestId: context.requestId,
    extra: {
      statusCode: context.statusCode,
      ...context.extra,
    },
  });
}

/**
 * Report a client-side error
 */
export function reportClientError(error, context = {}) {
  reportError(error, {
    component: context.component || 'client',
    action: context.action || 'render',
    extra: {
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      ...context.extra,
    },
  });
}

export default {
  reportError,
  reportApiError,
  reportClientError,
};
