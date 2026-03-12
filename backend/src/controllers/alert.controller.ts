import { Response, NextFunction } from 'express';
import { and, desc, eq, sql } from 'drizzle-orm';
import db, { alerts, projects } from '../db/index.js';
import { AppError } from '../middleware/errorHandler.js';
import type { AuthRequest } from '../middleware/authenticate.js';
import { getAlertsSchema } from '../validations/index.js';

export const getProjectAlerts = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { projectId } = req.params;
    const userId = req.user!.id;
    const parsed = getAlertsSchema.parse(req.query);

    const page = parsed.page ?? 1;
    const pageSize = parsed.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    const projectList = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, projectId as string), eq(projects.userId, userId)));

    if (!projectList[0]) {
      throw new AppError('Project not found', 404);
    }

    const conditions = [eq(alerts.projectId, projectId as string)];

    if (parsed.status) {
      conditions.push(eq(alerts.status, parsed.status));
    }

    if (parsed.severity) {
      conditions.push(eq(alerts.severity, parsed.severity));
    }

    if (parsed.type) {
      conditions.push(eq(alerts.type, parsed.type));
    }

    const whereClause = and(...conditions);

    const totalRows = await db
      .select({ count: sql<number>`count(*)` })
      .from(alerts)
      .where(whereClause);

    const total = Number(totalRows[0]?.count ?? 0);

    const rows = await db
      .select({
        id: alerts.id,
        type: alerts.type,
        severity: alerts.severity,
        status: alerts.status,
        title: alerts.title,
        description: alerts.description,
        evidence: alerts.evidence,
        createdAt: alerts.createdAt,
      })
      .from(alerts)
      .where(whereClause)
      .orderBy(desc(alerts.createdAt))
      .limit(pageSize)
      .offset(offset);

    res.json({
      success: true,
      data: {
        items: rows.map((row) => {
          let evidence: Record<string, unknown> | null = null;
          if (row.evidence) {
            try {
              evidence = JSON.parse(row.evidence) as Record<string, unknown>;
            } catch {
              evidence = { raw: row.evidence };
            }
          }

          return {
            ...row,
            evidence,
            createdAt: row.createdAt.toISOString(),
          };
        }),
        pagination: {
          page,
          pageSize,
          total,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateAlertStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { alertId } = req.params;
    const userId = req.user!.id;
    const { status } = req.body as { status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' };

    const alertRows = await db
      .select({
        id: alerts.id,
        projectId: alerts.projectId,
        type: alerts.type,
        severity: alerts.severity,
        status: alerts.status,
        title: alerts.title,
        description: alerts.description,
        evidence: alerts.evidence,
        createdAt: alerts.createdAt,
        updatedAt: alerts.updatedAt,
      })
      .from(alerts)
      .where(eq(alerts.id, alertId as string));

    const alert = alertRows[0];

    if (!alert) {
      throw new AppError('Alert not found', 404);
    }

    const projectRows = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, alert.projectId), eq(projects.userId, userId)));

    if (!projectRows[0]) {
      throw new AppError('Alert not found', 404);
    }

    const updatedRows = await db
      .update(alerts)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(alerts.id, alert.id))
      .returning({
        id: alerts.id,
        type: alerts.type,
        severity: alerts.severity,
        status: alerts.status,
        title: alerts.title,
        description: alerts.description,
        evidence: alerts.evidence,
        createdAt: alerts.createdAt,
        updatedAt: alerts.updatedAt,
      });

    const updated = updatedRows[0];

    let evidence: Record<string, unknown> | null = null;
    if (updated.evidence) {
      try {
        evidence = JSON.parse(updated.evidence) as Record<string, unknown>;
      } catch {
        evidence = { raw: updated.evidence };
      }
    }

    res.json({
      success: true,
      data: {
        ...updated,
        evidence,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};
