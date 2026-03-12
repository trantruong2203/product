import { Response, NextFunction } from 'express';
import { and, asc, eq } from 'drizzle-orm';
import db, { projects, scanSchedules } from '../db/index.js';
import { AppError } from '../middleware/errorHandler.js';
import type { AuthRequest } from '../middleware/authenticate.js';

export const getProjectSchedules = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { projectId } = req.params;
    const userId = req.user!.id;

    const projectRows = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, projectId as string), eq(projects.userId, userId)));

    if (!projectRows[0]) {
      throw new AppError('Project not found', 404);
    }

    const scheduleRows = await db
      .select({
        id: scanSchedules.id,
        frequency: scanSchedules.frequency,
        dayOfWeek: scanSchedules.dayOfWeek,
        timeOfDay: scanSchedules.timeOfDay,
        timezone: scanSchedules.timezone,
        engines: scanSchedules.engines,
        isActive: scanSchedules.isActive,
        createdAt: scanSchedules.createdAt,
      })
      .from(scanSchedules)
      .where(eq(scanSchedules.projectId, projectId as string))
      .orderBy(asc(scanSchedules.createdAt));

    res.json({
      success: true,
      data: scheduleRows.map((row) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    next(error);
  }
};

export const createProjectSchedule = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { projectId } = req.params;
    const userId = req.user!.id;
    const {
      frequency,
      dayOfWeek,
      timeOfDay,
      timezone,
      engines,
    } = req.body as {
      frequency: 'DAILY' | 'WEEKLY';
      dayOfWeek?: number;
      timeOfDay: string;
      timezone: string;
      engines: string[];
    };

    const projectRows = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, projectId as string), eq(projects.userId, userId)));

    if (!projectRows[0]) {
      throw new AppError('Project not found', 404);
    }

    const insertedRows = await db
      .insert(scanSchedules)
      .values({
        projectId: projectId as string,
        frequency,
        dayOfWeek: frequency === 'WEEKLY' ? (dayOfWeek ?? null) : null,
        timeOfDay,
        timezone,
        engines,
        isActive: true,
      })
      .returning({
        id: scanSchedules.id,
        frequency: scanSchedules.frequency,
        dayOfWeek: scanSchedules.dayOfWeek,
        timeOfDay: scanSchedules.timeOfDay,
        timezone: scanSchedules.timezone,
        engines: scanSchedules.engines,
        isActive: scanSchedules.isActive,
        createdAt: scanSchedules.createdAt,
      });

    const created = insertedRows[0];

    res.status(201).json({
      success: true,
      data: {
        ...created,
        createdAt: created.createdAt.toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateSchedule = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { scheduleId } = req.params;
    const userId = req.user!.id;

    const {
      frequency,
      dayOfWeek,
      timeOfDay,
      timezone,
      engines,
      isActive,
    } = req.body as {
      frequency?: 'DAILY' | 'WEEKLY';
      dayOfWeek?: number | null;
      timeOfDay?: string;
      timezone?: string;
      engines?: string[];
      isActive?: boolean;
    };

    const scheduleRows = await db
      .select({
        id: scanSchedules.id,
        projectId: scanSchedules.projectId,
        frequency: scanSchedules.frequency,
      })
      .from(scanSchedules)
      .where(eq(scanSchedules.id, scheduleId as string));

    const existing = scheduleRows[0];

    if (!existing) {
      throw new AppError('Schedule not found', 404);
    }

    const projectRows = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, existing.projectId), eq(projects.userId, userId)));

    if (!projectRows[0]) {
      throw new AppError('Schedule not found', 404);
    }

    const nextFrequency = frequency ?? existing.frequency;

    const updateData: {
      frequency?: 'DAILY' | 'WEEKLY';
      dayOfWeek?: number | null;
      timeOfDay?: string;
      timezone?: string;
      engines?: string[];
      isActive?: boolean;
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };

    if (frequency !== undefined) updateData.frequency = frequency;
    if (timeOfDay !== undefined) updateData.timeOfDay = timeOfDay;
    if (timezone !== undefined) updateData.timezone = timezone;
    if (engines !== undefined) updateData.engines = engines;
    if (isActive !== undefined) updateData.isActive = isActive;

    if (nextFrequency === 'DAILY') {
      updateData.dayOfWeek = null;
    } else if (dayOfWeek !== undefined) {
      updateData.dayOfWeek = dayOfWeek;
    }

    const updatedRows = await db
      .update(scanSchedules)
      .set(updateData)
      .where(eq(scanSchedules.id, existing.id))
      .returning({
        id: scanSchedules.id,
        frequency: scanSchedules.frequency,
        dayOfWeek: scanSchedules.dayOfWeek,
        timeOfDay: scanSchedules.timeOfDay,
        timezone: scanSchedules.timezone,
        engines: scanSchedules.engines,
        isActive: scanSchedules.isActive,
        createdAt: scanSchedules.createdAt,
      });

    const updated = updatedRows[0];

    res.json({
      success: true,
      data: {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};
