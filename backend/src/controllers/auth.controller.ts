import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { config } from '../config/index.js';
import { AppError } from '../middleware/errorHandler.js';
import type { RegisterInput, LoginInput } from '../validations/index.js';
import type { AuthRequest } from '../middleware/authenticate.js';
import { db } from '../db/index.js';

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

    const jwtOptions: SignOptions = {
      expiresIn: config.jwt.expiresIn as `${number}d`,
    };

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      config.jwt.secret,
      jwtOptions
    );

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
      throw new AppError('Invalid credentials', 401);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new AppError('Invalid credentials', 401);
    }

    const jwtOptions: SignOptions = {
      expiresIn: config.jwt.expiresIn as `${number}d`,
    };

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      config.jwt.secret,
      jwtOptions
    );

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
