import { Request, Response, NextFunction } from 'express';
import db from '../db/index.js';
import { projects, competitors, prompts } from '../db/schema.js'
import { eq, and, desc } from 'drizzle-orm';
import { AppError } from '../middleware/errorHandler.js';
import type { AuthRequest } from '../middleware/authenticate.js';
import { generateProjectPrompts } from '../services/promptGenerator.js';

export const createProject = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { domain, brandName, country, keywords = [] } = req.body;
    const userId = req.user!.id;

    const [project] = await db.insert(projects).values({
      userId,
      domain,
      brandName,
      country: country || 'US',
      keywords,
    }).returning();

    // Auto-generate 100 prompts for the project
    const generatedPrompts = generateProjectPrompts({
      brandName,
      domain,
      keywords,
      country: country || 'US',
    });

    // Insert prompts in batches
    const batchSize = 50;
    for (let i = 0; i < generatedPrompts.length; i += batchSize) {
      const batch = generatedPrompts.slice(i, i + batchSize);
      const values = batch.map((p) => ({
        projectId: project.id,
        query: p.query,
        language: p.language || 'en',
        isActive: true,
      }));
      await db.insert(prompts).values(values);
    }

    const promptsList = await db.select().from(prompts).where(eq(prompts.projectId, project.id as string));
    const competitorsList = await db.select().from(competitors).where(eq(competitors.projectId, project.id as string));

    res.status(201).json({
      success: true,
      data: {
        ...project,
        _count: {
          prompts: promptsList.length,
          competitors: competitorsList.length,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getProjects = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;

    const projectsList = await db.select().from(projects)
      .where(eq(projects.userId, userId))
      .orderBy(desc(projects.createdAt));

    const projectsWithCounts = await Promise.all(
      projectsList.map(async (project) => {
        const promptsList = await db.select().from(prompts).where(eq(prompts.projectId, project.id));
        const competitorsList = await db.select().from(competitors).where(eq(competitors.projectId, project.id));
        
        const recentPrompts = await db.select().from(prompts)
          .where(eq(prompts.projectId, project.id))
          .limit(5)
          .orderBy(desc(prompts.createdAt));

        return {
          ...project,
          _count: {
            prompts: promptsList.length,
            competitors: competitorsList.length,
            runs: 0,
          },
          prompts: recentPrompts,
        };
      })
    );

    res.json({
      success: true,
      data: projectsWithCounts,
    });
  } catch (error) {
    next(error);
  }
};

export const getProject = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const projectList = await db.select().from(projects)
      .where(and(eq(projects.id, id as string), eq(projects.userId, userId)));

    const project = projectList[0];

    if (!project) {
      throw new AppError('Project not found', 404);
    }

    const competitorsList = await db.select().from(competitors).where(eq(competitors.projectId, id as string));
    const promptsList = await db.select().from(prompts)
      .where(and(eq(prompts.projectId, id as string), eq(prompts.isActive, true)));

    const promptsAll = await db.select().from(prompts).where(eq(prompts.projectId, id as string));
    const competitorsAll = await db.select().from(competitors).where(eq(competitors.projectId, id as string));

    res.json({
      success: true,
      data: {
        ...project,
        competitors: competitorsList,
        prompts: promptsList,
        _count: {
          prompts: promptsAll.length,
          competitors: competitorsAll.length,
          runs: 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateProject = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const existingList = await db.select().from(projects)
      .where(and(eq(projects.id, id as string), eq(projects.userId, userId)));

    const existingProject = existingList[0];

    if (!existingProject) {
      throw new AppError('Project not found', 404);
    }

    const [project] = await db.update(projects)
      .set(req.body)
      .where(eq(projects.id, id as string))
      .returning();

    const promptsList = await db.select().from(prompts).where(eq(prompts.projectId, project.id as string));
    const competitorsList = await db.select().from(competitors).where(eq(competitors.projectId, project.id as string));

    res.json({
      success: true,
      data: {
        ...project,
        _count: {
          prompts: promptsList.length,
          competitors: competitorsList.length,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteProject = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const existingList = await db.select().from(projects)
      .where(and(eq(projects.id, id as string), eq(projects.userId, userId)));

    const existingProject = existingList[0];

    if (!existingProject) {
      throw new AppError('Project not found', 404);
    }

    await db.delete(projects).where(eq(projects.id, id as string));

    res.json({
      success: true,
      message: 'Project deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
