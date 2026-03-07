import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import type { CreateCompetitorInput } from '../validations/index.js';

export const createCompetitor = async (
  req: Request<{ projectId: string }, {}, CreateCompetitorInput>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { projectId } = req.params;
    const authReq = req as Request<{ projectId: string }, {}, CreateCompetitorInput> & { user: { id: string } };
    const userId = authReq.user!.id;

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
    });

    if (!project) {
      throw new AppError('Project not found', 404);
    }

    const competitor = await prisma.competitor.create({
      data: {
        projectId,
        name: req.body.name,
        domain: req.body.domain,
      },
    });

    res.status(201).json({
      success: true,
      data: competitor,
    });
  } catch (error) {
    next(error);
  }
};

export const getCompetitors = async (
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

    const competitors = await prisma.competitor.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: competitors,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCompetitor = async (
  req: Request<{ projectId: string; competitorId: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { projectId, competitorId } = req.params;
    const authReq = req as Request<{ projectId: string; competitorId: string }> & { user: { id: string } };
    const userId = authReq.user!.id;

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
    });

    if (!project) {
      throw new AppError('Project not found', 404);
    }

    const competitor = await prisma.competitor.findFirst({
      where: { id: competitorId, projectId },
    });

    if (!competitor) {
      throw new AppError('Competitor not found', 404);
    }

    await prisma.competitor.delete({
      where: { id: competitorId },
    });

    res.json({
      success: true,
      message: 'Competitor deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
