import { Request, Response, NextFunction } from 'express';
import db from '../db/index.js';
import {aiEngines} from '../db/schema.js'
import { eq, asc } from 'drizzle-orm';

const DEFAULT_ENGINES = [
  { name: "ChatGPT", domain: "chatgpt.com" },
  { name: "Gemini", domain: "gemini.google.com" },
  { name: "Claude", domain: "claude.ai" },
] as const;

export const getEngines = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let engines = await db.select().from(aiEngines).orderBy(asc(aiEngines.name));

    if (engines.length === 0) {
      for (const engine of DEFAULT_ENGINES) {
        await db.insert(aiEngines).values({
          name: engine.name,
          domain: engine.domain,
          isActive: true,
        }).onConflictDoNothing();
      }
      engines = await db.select().from(aiEngines).orderBy(asc(aiEngines.name));
    }

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
