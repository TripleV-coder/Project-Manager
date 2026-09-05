// @ts-check
/**
 * Structured logger backed by Pino.
 *
 * Public API is intentionally unchanged from the previous console-based
 * implementation: createLogger(context) returns { debug, info, warn, error }
 * each accepting (message, data?). The data object becomes structured fields
 * in the JSON output, which downstream log shippers (Loki, Datadog, ...)
 * can index. In development, pino-pretty renders human-readable output.
 *
 * Migration policy:
 *   - All NEW code should pass an object as the second argument.
 *   - Legacy callers passing a string still work — it's wrapped in { detail }.
 */
import pino from 'pino';

const isProd = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

const level = process.env.LOG_LEVEL || (isTest ? 'silent' : isProd ? 'info' : 'debug');

const baseConfig = {
  level,
  base: { service: 'project-manager' },
  redact: {
    // Best-effort redaction of common secret-bearing fields anywhere in the log
    paths: [
      'password',
      '*.password',
      'token',
      '*.token',
      'access_token',
      'refresh_token',
      'authorization',
      '*.authorization',
      'cookie',
      '*.cookie',
      'client_secret',
      '*.client_secret',
      'secret',
      '*.secret',
    ],
    censor: '[REDACTED]',
  },
  formatters: {
    /** @param {string} label */
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
};

// Next.js + pino-pretty transport uses a worker thread that can exit and then
// crash in-flight API handlers ("the worker has exited"). Stay on a sync stream.
const root = pino(baseConfig);

/**
 * @typedef {object} Logger
 * @property {(message: string, data?: unknown) => void} debug
 * @property {(message: string, data?: unknown) => void} info
 * @property {(message: string, data?: unknown) => void} warn
 * @property {(message: string, data?: unknown) => void} error
 * @property {(bindings: Record<string, unknown>) => Logger} child
 */

/**
 * Normalize a legacy positional `data` argument into a Pino bindings object.
 * @param {unknown} data
 * @returns {Record<string, unknown> | undefined}
 */
function asBindings(data) {
  if (data === undefined || data === null) return undefined;
  if (data instanceof Error) return { err: data };
  if (typeof data === 'object') return /** @type {Record<string, unknown>} */ (data);
  return { detail: data };
}

/**
 * @param {() => void} fn
 */
function safeCall(fn) {
  try {
    fn();
  } catch {
    // A dead pino worker must never abort an API request.
  }
}

/**
 * @param {import('pino').Logger} p
 * @returns {Logger}
 */
function wrap(p) {
  return {
    debug: (message, data) => {
      safeCall(() => {
        const b = asBindings(data);
        if (b) p.debug(b, message);
        else p.debug(message);
      });
    },
    info: (message, data) => {
      safeCall(() => {
        const b = asBindings(data);
        if (b) p.info(b, message);
        else p.info(message);
      });
    },
    warn: (message, data) => {
      safeCall(() => {
        const b = asBindings(data);
        if (b) p.warn(b, message);
        else p.warn(message);
      });
    },
    error: (message, data) => {
      safeCall(() => {
        const b = asBindings(data);
        if (b) p.error(b, message);
        else p.error(message);
      });
    },
    child: (bindings) => wrap(p.child(bindings)),
  };
}

/**
 * Create a logger bound to a context label (e.g. "auth", "sharepoint").
 * The context becomes a `context` field on every emitted log line.
 * @param {string | null} [context]
 * @returns {Logger}
 */
export function createLogger(context) {
  return wrap(context ? root.child({ context }) : root);
}

export const logger = createLogger(null);

export default logger;
