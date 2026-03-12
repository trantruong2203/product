import { Response, NextFunction } from 'express';
import { and, desc, eq, isNotNull } from 'drizzle-orm';
import db, {
  citations,
  projects,
  prompts,
  recommendations,
  responses,
  runs,
} from '../db/index.js';
import { AppError } from '../middleware/errorHandler.js';
import type { AuthRequest } from '../middleware/authenticate.js';
import { getRecommendationsSchema } from '../validations/index.js';

export const getProjectRecommendations = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { projectId } = req.params;
    const userId = req.user!.id;
    const parsed = getRecommendationsSchema.parse(req.query);

    const projectRows = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, projectId as string), eq(projects.userId, userId)));

    if (!projectRows[0]) {
      throw new AppError('Project not found', 404);
    }

    const conditions = [eq(recommendations.projectId, projectId as string)];

    if (parsed.status) {
      conditions.push(eq(recommendations.status, parsed.status));
    }

    if (parsed.priority) {
      conditions.push(eq(recommendations.priority, parsed.priority));
    }

    if (parsed.type) {
      conditions.push(eq(recommendations.type, parsed.type));
    }

    const rows = await db
      .select({
        id: recommendations.id,
        type: recommendations.type,
        priority: recommendations.priority,
        status: recommendations.status,
        title: recommendations.title,
        reason: recommendations.reason,
        suggestedAction: recommendations.suggestedAction,
        evidence: recommendations.evidence,
        keyword: recommendations.keyword,
        createdAt: recommendations.createdAt,
      })
      .from(recommendations)
      .where(and(...conditions))
      .orderBy(desc(recommendations.createdAt));

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
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateRecommendationStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { recommendationId } = req.params;
    const userId = req.user!.id;
    const { status } = req.body as {
      status: 'OPEN' | 'ACCEPTED' | 'DONE' | 'DISMISSED';
    };

    const recommendationRows = await db
      .select({
        id: recommendations.id,
        projectId: recommendations.projectId,
      })
      .from(recommendations)
      .where(eq(recommendations.id, recommendationId as string));

    const recommendation = recommendationRows[0];

    if (!recommendation) {
      throw new AppError('Recommendation not found', 404);
    }

    const projectRows = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, recommendation.projectId), eq(projects.userId, userId)));

    if (!projectRows[0]) {
      throw new AppError('Recommendation not found', 404);
    }

    const updatedRows = await db
      .update(recommendations)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(recommendations.id, recommendation.id))
      .returning({
        id: recommendations.id,
        type: recommendations.type,
        priority: recommendations.priority,
        status: recommendations.status,
        title: recommendations.title,
        reason: recommendations.reason,
        suggestedAction: recommendations.suggestedAction,
        evidence: recommendations.evidence,
        keyword: recommendations.keyword,
        createdAt: recommendations.createdAt,
        updatedAt: recommendations.updatedAt,
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

export const getProjectContentGap = async (
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

    const recRows = await db
      .select({
        title: recommendations.title,
        reason: recommendations.reason,
        suggestedAction: recommendations.suggestedAction,
        type: recommendations.type,
      })
      .from(recommendations)
      .where(eq(recommendations.projectId, projectId as string));

    const topicSet = new Set<string>();
    const formatSet = new Set<string>();

    for (const rec of recRows) {
      const combined = `${rec.title} ${rec.reason} ${rec.suggestedAction}`.toLowerCase();

      const quoted = [...combined.matchAll(/"([^"]+)"/g)].map((m) => m[1].trim());
      for (const q of quoted) {
        if (q.length >= 3) topicSet.add(q);
      }

      if (rec.type.toLowerCase().includes('faq') || combined.includes('faq')) {
        formatSet.add('faq');
      }
      if (combined.includes('schema') || combined.includes('structured data')) {
        formatSet.add('schema.org');
      }
      if (combined.includes('table') || rec.type.toLowerCase().includes('table')) {
        formatSet.add('table');
      }
      if (combined.includes('list') || combined.includes('bullet')) {
        formatSet.add('list');
      }
    }

    const citationRows = await db
      .select({
        hostname: citations.hostname,
      })
      .from(citations)
      .innerJoin(responses, eq(citations.responseId, responses.id))
      .innerJoin(runs, eq(responses.runId, runs.id))
      .innerJoin(prompts, eq(runs.promptId, prompts.id))
      .where(and(eq(prompts.projectId, projectId as string), isNotNull(citations.hostname)));

    const domainCounts = new Map<string, number>();

    for (const row of citationRows) {
      if (!row.hostname) continue;
      domainCounts.set(row.hostname, (domainCounts.get(row.hostname) ?? 0) + 1);
    }

    const sourcePreference = [...domainCounts.entries()]
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    res.json({
      success: true,
      data: {
        missingTopics: [...topicSet].slice(0, 20),
        formatGaps: [...formatSet],
        sourcePreference,
      },
    });
  } catch (error) {
    next(error);
  }
};
