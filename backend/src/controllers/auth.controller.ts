import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../middleware/errorHandler.js';
import type { RegisterInput, LoginInput } from '../validations/index.js';
import type { AuthRequest } from '../middleware/authenticate.js';
import { db } from '../db/index.js';
import { recordFailedLogin, clearLoginAttempts } from '../middleware/accountLockout.js';
import { blacklistToken, generateToken } from '../middleware/authenticate.js';
import { logSecurityEvent, getClientIp } from '../utils/securityAudit.js';

export const register = async (
  req: Request<{}, {}, RegisterInput>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password, name } = req.body;

    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      logger.warn('User registration failed', 'Email already registered', {
        email,
        ipAddress: getClientIp(req),
      });
      logSecurityEvent({
        type: 'LOGIN_FAILED',
        email,
        ipAddress: getClientIp(req),
        userAgent: req.headers['user-agent'],
        endpoint: '/api/auth/register',
        details: { reason: 'Email already registered' },
        severity: 'MEDIUM',
      });
      throw new AppError('Email already registered', 400);
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const [user] = await db.insert(users).values({
      email,
      password: hashedPassword,
      name,
    }).returning({
      id: users.id,
      email: users.email,
      name: users.name,
      plan: users.plan,
      createdAt: users.createdAt,
    });

    const token = generateToken(user.id, user.email);

    logger.info('User registered', `New user created: ${user.email}`, {
      userId: user.id,
      email: user.email,
      ipAddress: getClientIp(req),
    });

    logSecurityEvent({
      type: 'LOGIN_SUCCESS',
      userId: user.id,
      email: user.email,
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
      endpoint: '/api/auth/register',
      severity: 'LOW',
    });

    res.status(201).json({
      success: true,
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (
  req: Request<{}, {}, LoginInput>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;

    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) {
      recordFailedLogin(email);
      logger.warn('Login failed', 'User not found', {
        email,
        ipAddress: getClientIp(req),
      });
      logSecurityEvent({
        type: 'LOGIN_FAILED',
        email,
        ipAddress: getClientIp(req),
        userAgent: req.headers['user-agent'],
        endpoint: '/api/auth/login',
        details: { reason: 'User not found' },
        severity: 'MEDIUM',
      });
      throw new AppError('Invalid credentials', 401);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      recordFailedLogin(email);
      logger.warn('Login failed', 'Invalid password', {
        userId: user.id,
        email,
        ipAddress: getClientIp(req),
      });
      logSecurityEvent({
        type: 'LOGIN_FAILED',
        userId: user.id,
        email,
        ipAddress: getClientIp(req),
        userAgent: req.headers['user-agent'],
        endpoint: '/api/auth/login',
        details: { reason: 'Invalid password' },
        severity: 'MEDIUM',
      });
      throw new AppError('Invalid credentials', 401);
    }

    // Clear login attempts on successful login
    clearLoginAttempts(email);

    const token = generateToken(user.id, user.email);

    logger.info('User logged in', `User login successful: ${email}`, {
      userId: user.id,
      email,
      ipAddress: getClientIp(req),
    });

    logSecurityEvent({
      type: 'LOGIN_SUCCESS',
      userId: user.id,
      email,
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
      endpoint: '/api/auth/login',
      severity: 'LOW',
    });

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          plan: user.plan,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = (req as any).token;
    if (token) {
      blacklistToken(token);
    }

    logger.info('User logged out', `User logout: ${req.user?.email}`, {
      userId: req.user?.id,
      email: req.user?.email,
      ipAddress: getClientIp(req),
    });

    logSecurityEvent({
      type: 'LOGOUT',
      userId: req.user?.id,
      email: req.user?.email,
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
      endpoint: '/api/auth/logout',
      severity: 'LOW',
    });

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const newToken = generateToken(req.user.id, req.user.email);

    logger.debug('Token refreshed', `Token refresh for user: ${req.user.email}`, {
      userId: req.user.id,
      email: req.user.email,
    });

    logSecurityEvent({
      type: 'TOKEN_REFRESH',
      userId: req.user.id,
      email: req.user.email,
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
      endpoint: '/api/auth/refresh',
      severity: 'LOW',
    });

    res.json({
      success: true,
      data: {
        token: newToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, req.user!.id),
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

