import { Request, Response, NextFunction } from 'express';
import db, { users } from '../db/index.js';
import { eq } from 'drizzle-orm';

interface LoginAttempt {
  email: string;
  attempts: number;
  lastAttempt: number;
  lockedUntil?: number;
}

// In-memory store for login attempts (in production, use Redis)
const loginAttempts = new Map<string, LoginAttempt>();

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
const ATTEMPT_WINDOW = 15 * 60 * 1000; // 15 minutes

/**
 * Check if account is locked due to failed login attempts
 */
export const checkAccountLockout = (req: Request, res: Response, next: NextFunction) => {
  const email = req.body.email?.toLowerCase();

  if (!email) {
    return next();
  }

  const attempt = loginAttempts.get(email);
  const now = Date.now();

  if (attempt && attempt.lockedUntil && attempt.lockedUntil > now) {
    const remainingTime = Math.ceil((attempt.lockedUntil - now) / 1000 / 60);
    return res.status(429).json({
      error: 'Account temporarily locked',
      message: `Too many failed login attempts. Try again in ${remainingTime} minutes.`,
      retryAfter: remainingTime * 60,
    });
  }

  // Reset attempts if window has passed
  if (attempt && now - attempt.lastAttempt > ATTEMPT_WINDOW) {
    loginAttempts.delete(email);
  }

  next();
};

/**
 * Record failed login attempt
 */
export const recordFailedLogin = (email: string) => {
  const normalizedEmail = email.toLowerCase();
  const now = Date.now();
  const attempt = loginAttempts.get(normalizedEmail);

  if (!attempt) {
    loginAttempts.set(normalizedEmail, {
      email: normalizedEmail,
      attempts: 1,
      lastAttempt: now,
    });
  } else {
    attempt.attempts += 1;
    attempt.lastAttempt = now;

    if (attempt.attempts >= MAX_ATTEMPTS) {
      attempt.lockedUntil = now + LOCKOUT_DURATION;
      console.warn(`Account locked: ${normalizedEmail} after ${attempt.attempts} failed attempts`);
    }
  }
};

/**
 * Clear login attempts on successful login
 */
export const clearLoginAttempts = (email: string) => {
  loginAttempts.delete(email.toLowerCase());
};

/**
 * Get account lockout status
 */
export const getAccountLockoutStatus = (email: string) => {
  const attempt = loginAttempts.get(email.toLowerCase());
  if (!attempt) return null;

  const now = Date.now();
  return {
    isLocked: attempt.lockedUntil ? attempt.lockedUntil > now : false,
    attempts: attempt.attempts,
    lockedUntil: attempt.lockedUntil,
    remainingTime: attempt.lockedUntil ? Math.max(0, attempt.lockedUntil - now) : null,
  };
};
