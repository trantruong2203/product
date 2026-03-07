import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { addRunPromptJob } from '../services/queue.service';

export const triggerRun = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authReq = req as Request & { user: { id: string } };
    const userId = authReq.user!.id;
    const { promptIds, engineIds } = req.body;

    const prompts = await prisma.prompt.findMany({
      where: {
        id: promptIds ? { in: promptIds } : undefined,
        project: { userId },
        isActive: true,
      },
      include: { project: true },
    });

    const engines = await prisma.aIEngine.findMany({
      where: {
        id: engineIds ? { in: engineIds } : undefined,
        isActive: true,
      },
    });

    if (engines.length === 0) {
      throw new AppError('No valid engines found', 400);
    }

    const jobs = [];

    for (const prompt of prompts) {
      for (const engine of engines) {
        const run = await prisma.run.create({
          data: {
            promptId: prompt.id,
            engineId: engine.id,
            status: 'PENDING',
          },
        });

        jobs.push(
          addRunPromptJob({
            runId: run.id,
            promptId: prompt.id,
            engineId: engine.id,
            prompt: prompt.query,
            engineName: engine.name,
          })
        );
      }
    }

    await Promise.all(jobs);

    res.status(201).json({
      success: true,
      message: `Created ${jobs.length} jobs`,
      data: { jobsCreated: jobs.length },
    });
  } catch (error) {
    next(error);
  }
};

export const getRuns = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authReq = req as Request & { user: { id: string } };
    const userId = authReq.user!.id;

    const runs = await prisma.run.findMany({
      where: {
        prompt: { project: { userId } },
      },
      include: {
        prompt: {
          include: { project: true },
        },
        engine: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    res.json({
      success: true,
      data: runs,
    });
  } catch (error) {
    next(error);
  }
};

export const getRun = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const authReq = req as Request<{ id: string }> & { user: { id: string } };
    const userId = authReq.user!.id;

    const run = await prisma.run.findFirst({
      where: {
        id,
        prompt: { project: { userId } },
      },
      include: {
        prompt: {
          include: { project: true },
        },
        engine: true,
        responses: {
          include: {
            citations: true,
          },
        },
      },
    });

    if (!run) {
      throw new AppError('Run not found', 404);
    }

    res.json({
      success: true,
      data: run,
    });
  } catch (error) {
    next(error);
  }
};
