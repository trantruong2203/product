import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';

export const getEngines = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const engines = await prisma.aIEngine.findMany({
      orderBy: { name: 'asc' },
    });

    res.json({
      success: true,
      data: engines,
    });
  } catch (error) {
    next(error);
  }
};

export const toggleEngine = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const engine = await prisma.aIEngine.findUnique({
      where: { id },
    });

    if (!engine) {
      return res.status(404).json({
        success: false,
        message: 'Engine not found',
      });
    }

    const updated = await prisma.aIEngine.update({
      where: { id },
      data: { isActive: !engine.isActive },
    });

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};
