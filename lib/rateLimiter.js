import rateLimit from 'express-rate-limit';

// Rate limiter for general API routes
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    error: 'Trop de requêtes depuis cette adresse IP, veuillez réessayer plus tard.',
    retryAfter: 900
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Trop de requêtes',
      message: 'Vous avez dépassé la limite de requêtes. Réessayez dans 15 minutes.',
      retryAfter: 900
    });
  }
});

// Strict rate limiter for authentication
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Only 5 attempts
  skipSuccessfulRequests: true,
  message: {
    error: 'Trop de tentatives de connexion',
    message: 'Compte temporairement bloqué. Réessayez dans 15 minutes.'
  },
  handler: (req, res) => {
    res.status(429).json({
      error: 'Trop de tentatives',
      message: 'Trop de tentatives de connexion échouées. Compte bloqué pendant 15 minutes.',
      retryAfter: 900
    });
  }
});

// Rate limiter for file uploads
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 uploads per hour
  message: {
    error: 'Limite d\'upload atteinte',
    message: 'Vous avez atteint la limite d\'uploads. Réessayez dans 1 heure.'
  }
});

export default apiLimiter;
