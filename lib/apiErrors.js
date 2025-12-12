/**
 * Centralized API Error Handling
 * Provides granular, user-friendly error messages for debugging and user feedback
 */

export class APIError extends Error {
  constructor(message, statusCode, code, details = null) {
    super(message);
    this.name = 'APIError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export class ValidationError extends APIError {
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends APIError {
  constructor(message = 'Authentication required', details = null) {
    super(message, 401, 'AUTHENTICATION_ERROR', details);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends APIError {
  constructor(message = 'Access denied', details = null) {
    super(message, 403, 'AUTHORIZATION_ERROR', details);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends APIError {
  constructor(message = 'Resource not found', details = null) {
    super(message, 404, 'NOT_FOUND', details);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends APIError {
  constructor(message = 'Resource conflict', details = null) {
    super(message, 409, 'CONFLICT', details);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends APIError {
  constructor(message = 'Too many requests', retryAfter = null) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', { retryAfter });
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

export class ServerError extends APIError {
  constructor(message = 'Internal server error', details = null) {
    super(message, 500, 'SERVER_ERROR', details);
    this.name = 'ServerError';
  }
}

export class ServiceUnavailableError extends APIError {
  constructor(message = 'Service temporarily unavailable', retryAfter = null) {
    super(message, 503, 'SERVICE_UNAVAILABLE', { retryAfter });
    this.name = 'ServiceUnavailableError';
    this.retryAfter = retryAfter;
  }
}

/**
 * Parse API error response and return appropriate error object
 */
export function parseAPIError(error, defaultMessage = 'An error occurred') {
  // Network error
  if (!error.statusCode && error.message) {
    return new APIError(error.message || defaultMessage, 0, 'NETWORK_ERROR');
  }

  const { statusCode, code, message, details } = error;

  switch (statusCode) {
    case 400:
      return new ValidationError(message || 'Invalid request', details);
    case 401:
      return new AuthenticationError(message || 'Authentication required', details);
    case 403:
      return new AuthorizationError(message || 'Access denied', details);
    case 404:
      return new NotFoundError(message || 'Resource not found', details);
    case 409:
      return new ConflictError(message || 'Resource conflict', details);
    case 429:
      return new RateLimitError(message || 'Too many requests', details?.retryAfter);
    case 503:
      return new ServiceUnavailableError(message || 'Service unavailable', details?.retryAfter);
    case 500:
    default:
      return new ServerError(message || defaultMessage, details);
  }
}

/**
 * Get user-friendly error message
 */
export function getErrorMessage(error) {
  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof APIError) {
    return error.message;
  }

  if (error.response?.data?.error) {
    return error.response.data.error;
  }

  if (error.message) {
    return error.message;
  }

  return 'An unexpected error occurred. Please try again.';
}

/**
 * Handle API response and throw appropriate error
 */
export async function handleAPIResponse(response) {
  if (response.ok) {
    return response;
  }

  let data;
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  const error = {
    statusCode: response.status,
    code: data.code || `HTTP_${response.status}`,
    message: data.error || data.message || `HTTP ${response.status}`,
    details: data.details || null
  };

  throw parseAPIError(error);
}

/**
 * Safe fetch wrapper with error handling
 */
export async function safeFetch(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      signal: options.signal || AbortSignal.timeout(30000) // 30 second timeout
    });

    return handleAPIResponse(response);
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }

    if (error.name === 'AbortError') {
      throw new APIError('Request timeout', 0, 'REQUEST_TIMEOUT');
    }

    throw new APIError(error.message || 'Network error', 0, 'NETWORK_ERROR');
  }
}
