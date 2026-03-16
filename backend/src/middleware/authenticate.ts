import { Request, Response, NextFunction } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config/index.js';
import db, { users } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { AppError } from './errorHandler.js';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

// Token blacklist for logout (in production, use Redis)
const tokenBlacklist = new Set<string>();

/**
 * Add token to blacklist (for logout)
 */
export const blacklistToken = (token: string): void => {
  tokenBlacklist.add(token);
};

/**
 * Check if token is blacklisted
 */
export const isTokenBlacklisted = (token: string): boolean => {
  return tokenBlacklist.has(token);
};

/**
 * Generate new JWT token
 */
export const generateToken = (userId: string, email: string): string => {
  const jwtOptions: SignOptions = {
    expiresIn: config.jwt.expiresIn as `${number}d`,
  };

  return jwt.sign(
    { userId, email },
    config.jwt.secret,
    jwtOptions
  );
};

/**
 * Main authentication middleware
 */
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No token provided', 401);
    }

    const token = authHeader.split(' ')[1];

    // Check if token is blacklisted
    if (isTokenBlacklisted(token)) {
      throw new AppError('Token has been revoked', 401);
    }

    const decoded = jwt.verify(token, config.jwt.secret) as { userId: string; email: string };

    const userList = await db.select({
      id: users.id,
      email: users.email,
      plan: users.plan,
    }).from(users).where(eq(users.id, decoded.userId));

    const user = userList[0];

    if (!user) {
      throw new AppError('User not found', 401);
    }

    req.user = { id: user.id, email: user.email };
    (req as any).token = token;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new AppError('Invalid token', 401));
    }
    if (error instanceof jwt.TokenExpiredError) {
      return next(new AppError('Token expired', 401));
    }
    next(error);
  }
};

/**
 * Optional authentication - doesn't fail if no token
 */
export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];

    if (isTokenBlacklisted(token)) {
      return next();
    }

    const decoded = jwt.verify(token, config.jwt.secret) as { userId: string; email: string };

    const userList = await db.select({
      id: users.id,
      email: users.email,
    }).from(users).where(eq(users.id, decoded.userId));

    const user = userList[0];
    if (user) {
      req.user = { id: user.id, email: user.email };
    }
  } catch {
    // Silently fail for optional auth
  }

  next();
};

