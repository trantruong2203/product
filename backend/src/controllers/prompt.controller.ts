import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import type { CreatePromptInput } from '../validations/index.js';

export const createPrompt = async (
  req: Request<{ projectId: string }, {}, CreatePromptInput>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { projectId } = req.params;
    const authReq = req as Request<{ projectId: string }, {}, CreatePromptInput> & { user: { id: string } };
    const userId = authReq.user!.id;

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
    });

    if (!project) {
      throw new AppError('Project not found', 404);
    }

    const prompt = await prisma.prompt.create({
      data: {
        projectId,
        query: req.body.query,
        language: req.body.language || 'en',
      },
    });

    res.status(201).json({
      success: true,
      data: prompt,
    });
  } catch (error) {
    next(error);
  }
};

export const getPrompts = async (
  req: Request<{ projectId: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { projectId } = req.params;
    const authReq = req as Request<{ projectId: string }> & { user: { id: string } };
    const userId = authReq.user!.id;

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
    });

    if (!project) {
      throw new AppError('Project not found', 404);
    }

    const prompts = await prisma.prompt.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: prompts,
    });
  } catch (error) {
    next(error);
  }
};

export const deletePrompt = async (
  req: Request<{ projectId: string; promptId: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { projectId, promptId } = req.params;
    const authReq = req as Request<{ projectId: string; promptId: string }> & { user: { id: string } };
    const userId = authReq.user!.id;

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
    });

    if (!project) {
      throw new AppError('Project not found', 404);
    }

    const prompt = await prisma.prompt.findFirst({
      where: { id: promptId, projectId },
    });

    if (!prompt) {
      throw new AppError('Prompt not found', 404);
    }

    await prisma.prompt.delete({
      where: { id: promptId },
    });

    res.json({
      success: true,
      message: 'Prompt deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
