import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Security headers middleware using helmet
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
});

/**
 * Global rate limiter - 100 requests per 15 minutes
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevelopment ? 10000 : 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    if (isDevelopment) return true;
    // Skip rate limiting for health checks
    return req.path === '/health';
  },
});

/**
 * Auth endpoint limiter - 5 requests per 15 minutes
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevelopment ? 1000 : 5,
  message: 'Too many login attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isDevelopment,
  skipSuccessfulRequests: true,
});

/**
 * API endpoint limiter - 30 requests per minute
 */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isDevelopment ? 10000 : 30,
  message: 'Too many API requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isDevelopment,
});

/**
 * HTTPS redirect middleware
 * Only redirect in production with proper x-forwarded-proto header
 * Skip in development/Docker to allow HTTP
 */
export const httpsRedirect = (req: Request, res: Response, next: NextFunction) => {
  const host = (req.header('host') || '').toLowerCase();
  const hostname = host.split(':')[0];
  const isLocalHost =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1';

  // Only enforce HTTPS in production AND when behind a reverse proxy (x-forwarded-proto header present)
  if (
    process.env.NODE_ENV === 'production' &&
    !isLocalHost &&
    req.header('x-forwarded-proto') &&
    req.header('x-forwarded-proto') !== 'https'
  ) {
    return res.redirect(301, `https://${req.header('host')}${req.url}`);
  }
  next();
};

/**
 * Request ID middleware for tracking
 */
export const requestId = (req: Request, res: Response, next: NextFunction) => {
  const id = req.header('x-request-id') || `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  (req as any).id = id;
  res.setHeader('x-request-id', id);
  next();
};
