import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

interface CsrfToken {
  token: string;
  createdAt: number;
}

// In-memory store for CSRF tokens (in production, use Redis or session store)
const csrfTokens = new Map<string, CsrfToken>();

const TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

/**
 * Generate a new CSRF token
 */
export const generateCsrfToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Store CSRF token for a session/user
 */
export const storeCsrfToken = (sessionId: string): string => {
  const token = generateCsrfToken();
  csrfTokens.set(sessionId, {
    token,
    createdAt: Date.now(),
  });
  return token;
};

/**
 * Verify CSRF token
 */
export const verifyCsrfToken = (sessionId: string, token: string): boolean => {
  const stored = csrfTokens.get(sessionId);

  if (!stored) {
    return false;
  }

  // Check expiry
  if (Date.now() - stored.createdAt > TOKEN_EXPIRY) {
    csrfTokens.delete(sessionId);
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(stored.token),
    Buffer.from(token)
  );
};

/**
 * CSRF protection middleware
 */
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  // Skip CSRF check for safe methods
  if (SAFE_METHODS.includes(req.method)) {
    return next();
  }

  // Get session ID from cookie or header
  const sessionId = req.header('x-session-id') || req.cookies?.sessionId;

  if (!sessionId) {
    return res.status(403).json({
      error: 'CSRF protection',
      message: 'Session ID required for state-changing requests',
    });
  }

  // Get CSRF token from header or body
  const token = req.header('x-csrf-token') || req.body?.csrfToken;

  if (!token) {
    return res.status(403).json({
      error: 'CSRF protection',
      message: 'CSRF token required',
    });
  }

  // Verify token
  if (!verifyCsrfToken(sessionId, token)) {
    return res.status(403).json({
      error: 'CSRF protection',
      message: 'Invalid or expired CSRF token',
    });
  }

  next();
};

/**
 * Middleware to attach CSRF token to response
 */
export const attachCsrfToken = (req: Request, res: Response, next: NextFunction) => {
  const sessionId = req.header('x-session-id') || req.cookies?.sessionId || `session-${Date.now()}`;
  const token = storeCsrfToken(sessionId);

  res.setHeader('x-csrf-token', token);
  (req as any).csrfToken = token;
  (req as any).sessionId = sessionId;

  next();
};

/**
 * Clean up expired tokens periodically
 */
export const cleanupExpiredTokens = () => {
  const now = Date.now();
  for (const [sessionId, data] of csrfTokens.entries()) {
    if (now - data.createdAt > TOKEN_EXPIRY) {
      csrfTokens.delete(sessionId);
    }
  }
};

// Run cleanup every hour
setInterval(cleanupExpiredTokens, 60 * 60 * 1000);
