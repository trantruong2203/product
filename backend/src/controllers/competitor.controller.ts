import { Request, Response, NextFunction } from 'express';
import db from '../db/index.js';
import { competitors, projects } from '../db/schema.js'
import { eq, and, desc } from 'drizzle-orm';
import { AppError } from '../middleware/errorHandler.js';
import type { AuthRequest } from '../middleware/authenticate.js';

export const createCompetitor = async (
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

    const [competitor] = await db.insert(competitors).values({
      projectId: projectId as string,
      name: req.body.name,
      domain: req.body.domain,
    }).returning();

    res.status(201).json({
      success: true,
      data: competitor,
    });
  } catch (error) {
    next(error);
  }
};

export const getCompetitors = async (
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

    const competitorsList = await db.select().from(competitors)
      .where(eq(competitors.projectId, projectId as string))
      .orderBy(desc(competitors.createdAt));

    res.json({
      success: true,
      data: competitorsList,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCompetitor = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { projectId, competitorId } = req.params;
    const userId = req.user!.id;

    const projectList = await db.select().from(projects)
      .where(and(eq(projects.id, projectId as string), eq(projects.userId, userId)));

    const project = projectList[0];

    if (!project) {
      throw new AppError('Project not found', 404);
    }

    const competitorList = await db.select().from(competitors)
      .where(and(eq(competitors.id, competitorId as string), eq(competitors.projectId, projectId as string)));

    const competitor = competitorList[0];

    if (!competitor) {
      throw new AppError('Competitor not found', 404);
    }

    await db.delete(competitors).where(eq(competitors.id, competitorId as string));

    res.json({
      success: true,
      message: 'Competitor deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
