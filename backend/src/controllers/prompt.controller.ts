import { Request, Response, NextFunction } from 'express';
import db, { prompts, projects } from '../db/index.js';
import { eq, and, desc } from 'drizzle-orm';
import { AppError } from '../middleware/errorHandler.js';
import type { AuthRequest } from '../middleware/authenticate.js';

export const createPrompt = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { projectId } = req.params;
    const userId = req.user!.id;

    const projectList = await db.select().from(projects)
      .where(and(eq(projects.id, projectId as string), eq(projects.userId, userId)));

    const project = projectList[0];

    if (!project) {
      throw new AppError('Project not found', 404);
    }

    const [prompt] = await db.insert(prompts).values({
      projectId: projectId as string,
      query: req.body.query,
      language: req.body.language || 'en',
    }).returning();

    res.status(201).json({
      success: true,
      data: prompt,
    });
  } catch (error) {
    next(error);
  }
};

export const getPrompts = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { projectId } = req.params;
    const userId = req.user!.id;

    const projectList = await db.select().from(projects)
      .where(and(eq(projects.id, projectId as string), eq(projects.userId, userId)));

    const project = projectList[0];

    if (!project) {
      throw new AppError('Project not found', 404);
    }

    const promptsList = await db.select().from(prompts)
      .where(eq(prompts.projectId, projectId as string))
      .orderBy(desc(prompts.createdAt));

    res.json({
      success: true,
      data: promptsList,
    });
  } catch (error) {
    next(error);
  }
};

export const deletePrompt = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { projectId, promptId } = req.params;
    const userId = req.user!.id;

    const projectList = await db.select().from(projects)
      .where(and(eq(projects.id, projectId as string), eq(projects.userId, userId)));

    const project = projectList[0];

    if (!project) {
      throw new AppError('Project not found', 404);
    }

    const promptList = await db.select().from(prompts)
      .where(and(eq(prompts.id, promptId as string), eq(prompts.projectId, projectId as string)));

    const prompt = promptList[0];

    if (!prompt) {
      throw new AppError('Prompt not found', 404);
    }

    await db.delete(prompts).where(eq(prompts.id, promptId as string));

    res.json({
      success: true,
      message: 'Prompt deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
