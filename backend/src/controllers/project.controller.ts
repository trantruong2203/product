import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import type { CreateProjectInput, UpdateProjectInput } from '../validations/index.js';

export const createProject = async (
  req: Request<{}, {}, CreateProjectInput>,
  res: Response,
  next: NextFunction
) => {
  try {
    const authReq = req as Request<{}, {}, CreateProjectInput & { user: { id: string } }>;
    const { domain, brandName, country } = req.body;
    const userId = authReq.user!.id;

    const project = await prisma.project.create({
      data: {
        userId,
        domain,
        brandName,
        country: country || 'US',
      },
      include: {
        _count: {
          select: {
            prompts: true,
            competitors: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: project,
    });
  } catch (error) {
    next(error);
  }
};

export const getProjects = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authReq = req as Request & { user: { id: string } };
    const userId = authReq.user!.id;

    const projects = await prisma.project.findMany({
      where: { userId },
      include: {
        _count: {
          select: {
            prompts: true,
            competitors: true,
            runs: true,
          },
        },
        prompts: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: projects,
    });
  } catch (error) {
    next(error);
  }
};

export const getProject = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const authReq = req as Request<{ id: string }> & { user: { id: string } };
    const userId = authReq.user!.id;

    const project = await prisma.project.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        competitors: true,
        prompts: {
          where: { isActive: true },
        },
        _count: {
          select: {
            prompts: true,
            competitors: true,
            runs: true,
          },
        },
      },
    });

    if (!project) {
      throw new AppError('Project not found', 404);
    }

    res.json({
      success: true,
      data: project,
    });
  } catch (error) {
    next(error);
  }
};

export const updateProject = async (
  req: Request<{ id: string }, {}, UpdateProjectInput>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const authReq = req as Request<{ id: string }, {}, UpdateProjectInput> & { user: { id: string } };
    const userId = authReq.user!.id;

    const existingProject = await prisma.project.findFirst({
      where: { id, userId },
    });

    if (!existingProject) {
      throw new AppError('Project not found', 404);
    }

    const project = await prisma.project.update({
      where: { id },
      data: req.body,
      include: {
        _count: {
          select: {
            prompts: true,
            competitors: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: project,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteProject = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const authReq = req as Request<{ id: string }> & { user: { id: string } };
    const userId = authReq.user!.id;

    const existingProject = await prisma.project.findFirst({
      where: { id, userId },
    });

    if (!existingProject) {
      throw new AppError('Project not found', 404);
    }

    await prisma.project.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Project deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
