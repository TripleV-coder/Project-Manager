import { NextResponse } from 'next/server';

// Format de réponse standardisé pour toutes les APIs
export class APIResponse {
  static success(data, message = null, statusCode = 200, pagination = null) {
    const response = {
      success: true,
      data
    };

    if (message) {
      response.message = message;
    }

    if (pagination) {
      response.pagination = pagination;
    }

    return NextResponse.json(response, { status: statusCode });
  }

  static error(message, statusCode = 500, details = null, errorCode = null) {
    const response = {
      success: false,
      error: {
        message,
        code: errorCode || `ERROR_${statusCode}`
      }
    };

    if (details) {
      response.error.details = details;
    }

    return NextResponse.json(response, { status: statusCode });
  }

  static validationError(errors, statusCode = 400) {
    return NextResponse.json({
      success: false,
      error: {
        message: 'Erreur de validation',
        code: 'VALIDATION_ERROR',
        details: errors
      }
    }, { status: statusCode });
  }

  static unauthorized(message = 'Non authentifié') {
    return NextResponse.json({
      success: false,
      error: {
        message,
        code: 'UNAUTHORIZED'
      }
    }, { status: 401 });
  }

  static forbidden(message = 'Accès refusé') {
    return NextResponse.json({
      success: false,
      error: {
        message,
        code: 'FORBIDDEN'
      }
    }, { status: 403 });
  }

  static notFound(message = 'Ressource non trouvée') {
    return NextResponse.json({
      success: false,
      error: {
        message,
        code: 'NOT_FOUND'
      }
    }, { status: 404 });
  }

  static created(data, message = 'Créé avec succès') {
    return APIResponse.success(data, message, 201);
  }

  static noContent() {
    return new NextResponse(null, { status: 204 });
  }

  static withCORS(response, origin = '*') {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Max-Age', '3600');
    return response;
  }
}

/**
 * Generate a unique error ID for tracking
 */
function generateErrorId() {
  return `ERR_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`.toUpperCase();
}

// Helper pour gérer les erreurs de façon centralisée
export function handleError(error, context = '') {
  const errorId = generateErrorId();

  // Log full error server-side with error ID for tracking
  console.error(`[API Error ${errorId}${context ? ` - ${context}` : ''}]`, {
    message: error.message,
    name: error.name,
    stack: error.stack
  });

  if (error.name === 'CastError') {
    return APIResponse.error('ID invalide', 400, null, 'INVALID_ID');
  }

  if (error.name === 'ValidationError') {
    const details = Object.entries(error.errors).map(([field, err]) => ({
      field,
      message: err.message
    }));
    return APIResponse.validationError(details, 400);
  }

  if (error.name === 'MongoServerError') {
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return APIResponse.error(`${field} déjà utilisé`, 400, null, 'DUPLICATE_KEY');
    }
  }

  // In production, return generic error with tracking ID
  // In development, return full error details
  const isProduction = process.env.NODE_ENV === 'production';

  return APIResponse.error(
    isProduction ? `Une erreur s'est produite (ref: ${errorId})` : error.message,
    500,
    isProduction ? null : { stack: error.stack, errorId },
    'INTERNAL_SERVER_ERROR'
  );
}
