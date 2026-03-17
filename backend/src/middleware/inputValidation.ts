import { Request, Response, NextFunction } from 'express';

/**
 * Sanitize string input to prevent injection attacks
 */
export const sanitizeString = (input: string): string => {
  if (typeof input !== 'string') return input;

  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/["']/g, '') // Remove quotes
    .trim();
};

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
};

/**
 * Validate URL format
 */
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Input validation middleware
 */
export const validateInput = (req: Request, res: Response, next: NextFunction) => {
  // Sanitize string fields in body
  if (req.body && typeof req.body === 'object') {
    for (const [key, value] of Object.entries(req.body)) {
      if (typeof value === 'string') {
        (req.body as any)[key] = sanitizeString(value);
      }
    }
  }

  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    for (const [key, value] of Object.entries(req.query)) {
      if (typeof value === 'string') {
        (req.query as any)[key] = sanitizeString(value);
      }
    }
  }

  next();
};

/**
 * Validate request size to prevent DoS attacks
 */
export const validateRequestSize = (maxSize: string = '10mb') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.header('content-length') || '0', 10);
    const maxBytes = parseSize(maxSize);

    if (contentLength > maxBytes) {
      return res.status(413).json({
        error: 'Payload too large',
        message: `Request size exceeds maximum of ${maxSize}`,
      });
    }

    next();
  };
};

/**
 * Parse size string (e.g., "10mb" -> bytes)
 */
function parseSize(size: string): number {
  const units: Record<string, number> = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
  };

  const match = size.toLowerCase().match(/^(\d+)(b|kb|mb|gb)?$/);
  if (!match) return 10 * 1024 * 1024; // Default 10mb

  const value = parseInt(match[1], 10);
  const unit = match[2] || 'b';
  return value * (units[unit] || 1);
}
