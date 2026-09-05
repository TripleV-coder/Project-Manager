import { createLogger } from '@/lib/logger';
const log = createLogger('env-validation');
/**
 * Environment Variables Validation
 * Ensures all required environment variables are set before application starts
 *
 * Usage: Import this module at the top of your main entry point
 */

const requiredEnvVars = [
  {
    name: 'JWT_SECRET',
    description: 'Secret key for JWT token signing (min 32 characters)',
    validator: (value) => value && value.length >= 32,
  },
  {
    name: 'MONGO_URL',
    description: 'MongoDB connection string',
    validator: (value) =>
      value && (value.startsWith('mongodb://') || value.startsWith('mongodb+srv://')),
  },
];

const productionRequired = [
  {
    name: 'SECRETS_ENCRYPTION_KEY',
    description: 'AES-256 key for stored DB secrets (64 hex chars or ≥32 char passphrase)',
    validator: (v) => v && (/^[0-9a-f]{64}$/i.test(v) || v.length >= 32),
  },
  {
    name: 'JWT_REFRESH_SECRET',
    description: 'Dedicated refresh-token secret (min 32 chars)',
    validator: (v) => v && v.length >= 32,
  },
  {
    name: 'ALLOWED_ORIGINS',
    description: 'Explicit CORS allowlist (no localhost in production)',
    validator: (v) => v && !v.includes('localhost'),
  },
];

const optionalEnvVars = [
  {
    name: 'NODE_ENV',
    description: 'Environment mode',
    default: 'development',
    validator: (value) => ['development', 'production', 'test'].includes(value),
  },
  {
    name: 'NEXT_PUBLIC_APP_URL',
    description: 'Application base URL',
    default: 'http://localhost:3000',
  },
  {
    name: 'NEXT_PUBLIC_SOCKET_SERVER_URL',
    description: 'Socket.io server URL',
    default: 'http://localhost:4000',
  },
  {
    name: 'ALLOWED_ORIGINS',
    description: 'Comma-separated list of allowed CORS origins',
    default: 'http://localhost:3000',
  },
  {
    name: 'SOCKET_PORT',
    description: 'Socket server port',
    default: '4000',
  },
];

/**
 * Validate environment variables and return results
 * @returns {Object} { valid: boolean, errors: string[], warnings: string[] }
 */
export function validateEnv() {
  const errors = [];
  const warnings = [];

  // Check required variables
  for (const envVar of requiredEnvVars) {
    const value = process.env[envVar.name];

    if (!value) {
      errors.push(`Missing required environment variable: ${envVar.name} - ${envVar.description}`);
      continue;
    }

    if (envVar.validator && !envVar.validator(value)) {
      errors.push(`Invalid value for ${envVar.name}: ${envVar.description}`);
    }
  }

  // Check optional variables and warn if using defaults
  for (const envVar of optionalEnvVars) {
    const value = process.env[envVar.name];

    if (!value && envVar.default) {
      if (process.env.NODE_ENV === 'production') {
        warnings.push(
          `${envVar.name} not set, using default: "${envVar.default}" - ${envVar.description}`
        );
      }
    }

    if (value && envVar.validator && !envVar.validator(value)) {
      warnings.push(`Unexpected value for ${envVar.name}: "${value}" - ${envVar.description}`);
    }
  }

  // Production-only required vars (warnings pre-production, hard errors in production)
  if (process.env.NODE_ENV === 'production') {
    for (const envVar of productionRequired) {
      const value = process.env[envVar.name];
      if (!value) {
        errors.push(
          `Missing required (production) env var: ${envVar.name} - ${envVar.description}`
        );
      } else if (envVar.validator && !envVar.validator(value)) {
        errors.push(`Invalid value for ${envVar.name}: ${envVar.description}`);
      }
    }
  } else {
    for (const envVar of productionRequired) {
      if (!process.env[envVar.name]) {
        warnings.push(`${envVar.name} not set — required before a production deploy`);
      }
    }
  }

  // Production-specific warnings
  if (process.env.NODE_ENV === 'production') {
    if (process.env.NEXT_PUBLIC_SOCKET_SERVER_URL?.includes('localhost')) {
      warnings.push('NEXT_PUBLIC_SOCKET_SERVER_URL contains localhost in production mode');
    }

    if (process.env.ALLOWED_ORIGINS?.includes('localhost')) {
      warnings.push('ALLOWED_ORIGINS contains localhost in production mode');
    }

    if (!process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URL.includes('localhost')) {
      warnings.push('NEXT_PUBLIC_APP_URL should be set to production URL');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate environment variables and throw if invalid
 * Call this during application startup
 */
export function assertEnvValid() {
  const result = validateEnv();

  // Log warnings
  if (result.warnings.length > 0) {
    log.warn('Environment variable warnings:');
    result.warnings.forEach((w) => log.warn(`  - ${w}`));
  }

  // Throw on errors
  if (!result.valid) {
    log.error('Environment validation failed:');
    result.errors.forEach((e) => log.error(`  - ${e}`));
    throw new Error(`Environment validation failed: ${result.errors.join(', ')}`);
  }

  if (process.env.NODE_ENV !== 'test') {
    log.info('Environment variables validated successfully');
  }
}

/**
 * Get environment info for debugging (safe to expose)
 */
export function getEnvInfo() {
  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    socketUrl: process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || 'http://localhost:4000',
    isProduction: process.env.NODE_ENV === 'production',
  };
}

export default {
  validateEnv,
  assertEnvValid,
  getEnvInfo,
};
