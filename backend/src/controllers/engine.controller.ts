import { Request, Response, NextFunction } from 'express';
import db from '../db/index.js';
import {aiEngines} from '../db/schema.js'
import { eq, asc } from 'drizzle-orm';

export const getEngines = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const engines = await db.select().from(aiEngines).orderBy(asc(aiEngines.name));

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

    const engineList = await db.select().from(aiEngines).where(eq(aiEngines.id, id));
    const engine = engineList[0];

    if (!engine) {
      return res.status(404).json({
        success: false,
        message: 'Engine not found',
      });
    }

    const [updated] = await db.update(aiEngines)
      .set({ isActive: !engine.isActive })
      .where(eq(aiEngines.id, id))
      .returning();

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};
