import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for authentication routes
 * Prevents brute force attacks on login/register
 * 
 * Config:
 * - 15 minute window
 * - 20 requests max per IP
 * - Returns clean JSON error on limit exceeded
 */
export function createAuthLimiter() {
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // 20 requests per windowMs
    message: {
      error: 'Too many authentication attempts. Please try again later.',
      retryAfter: '15 minutes'
    },
    standardHeaders: true, // Enable X-RateLimit-* headers for clients
    legacyHeaders: false, // Disable RateLimit-* headers
    skip: (req) => {
      // Skip health check and public routes
      return req.path === '/healthz';
    },
    handler: (req, res) => {
      res.status(429).json({
        error: 'Too many authentication attempts. Please try again later.',
        retryAfter: '15 minutes'
      });
    }
  });
}

export default { createAuthLimiter };
