import { Response, NextFunction } from 'express';
import { and, eq, gte, ilike, lte } from 'drizzle-orm';
import db, {
  aiEngines,
  projects,
  prompts,
  responseAnalysis,
  responses,
  runs,
} from '../db/index.js';
import { AppError } from '../middleware/errorHandler.js';
import type { AuthRequest } from '../middleware/authenticate.js';
import { getSoMSchema } from '../validations/index.js';

function toDayBucket(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseDateInput(value: string | undefined, fallback: Date): Date {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

export const getProjectSentiment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { projectId } = req.params;
    const userId = req.user!.id;
    const parsed = getSoMSchema.parse(req.query);

    const now = new Date();
    const defaultFrom = new Date(now);
    defaultFrom.setUTCDate(defaultFrom.getUTCDate() - 30);

    const from = parseDateInput(parsed.from, defaultFrom);
    const to = parseDateInput(parsed.to, now);

    const projectRows = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, projectId as string), eq(projects.userId, userId)));

    if (!projectRows[0]) {
      throw new AppError('Project not found', 404);
    }

    const conditions = [
      eq(prompts.projectId, projectId as string),
      gte(responseAnalysis.createdAt, from),
      lte(responseAnalysis.createdAt, to),
    ];

    if (parsed.keyword) {
      conditions.push(ilike(prompts.query, `%${parsed.keyword}%`));
    }

    if (parsed.engine) {
      conditions.push(ilike(aiEngines.name, `%${parsed.engine}%`));
    }

    const rows = await db
      .select({
        createdAt: responseAnalysis.createdAt,
        sentiment: responseAnalysis.sentiment,
        sentimentScore: responseAnalysis.sentimentScore,
      })
      .from(responseAnalysis)
      .innerJoin(responses, eq(responseAnalysis.responseId, responses.id))
      .innerJoin(runs, eq(responses.runId, runs.id))
      .innerJoin(prompts, eq(runs.promptId, prompts.id))
      .innerJoin(aiEngines, eq(runs.engineId, aiEngines.id))
      .where(and(...conditions));

    let positive = 0;
    let neutral = 0;
    let negative = 0;
    let scoreTotal = 0;

    const seriesMap = new Map<
      string,
      { positive: number; neutral: number; negative: number }
    >();

    for (const row of rows) {
      const bucket = toDayBucket(row.createdAt);
      if (!seriesMap.has(bucket)) {
        seriesMap.set(bucket, { positive: 0, neutral: 0, negative: 0 });
      }

      const bucketRow = seriesMap.get(bucket)!;

      if (row.sentiment === 'POSITIVE') {
        positive += 1;
        bucketRow.positive += 1;
      } else if (row.sentiment === 'NEGATIVE') {
        negative += 1;
        bucketRow.negative += 1;
      } else {
        neutral += 1;
        bucketRow.neutral += 1;
      }

      scoreTotal += row.sentimentScore;
    }

    const avgSentimentScore =
      rows.length > 0 ? Math.round((scoreTotal / rows.length) * 1000) / 1000 : 0;

    const series = [...seriesMap.entries()]
      .map(([bucket, value]) => ({ bucket, ...value }))
      .sort((a, b) => a.bucket.localeCompare(b.bucket));

    res.json({
      success: true,
      data: {
        distribution: {
          positive,
          neutral,
          negative,
        },
        avgSentimentScore,
        series,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getProjectNarratives = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { projectId } = req.params;
    const userId = req.user!.id;
    const parsed = getSoMSchema.parse(req.query);

    const now = new Date();
    const defaultFrom = new Date(now);
    defaultFrom.setUTCDate(defaultFrom.getUTCDate() - 30);

    const from = parseDateInput(parsed.from, defaultFrom);
    const to = parseDateInput(parsed.to, now);

    const projectRows = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, projectId as string), eq(projects.userId, userId)));

    if (!projectRows[0]) {
      throw new AppError('Project not found', 404);
    }

    const conditions = [
      eq(prompts.projectId, projectId as string),
      gte(responseAnalysis.createdAt, from),
      lte(responseAnalysis.createdAt, to),
    ];

    if (parsed.keyword) {
      conditions.push(ilike(prompts.query, `%${parsed.keyword}%`));
    }

    if (parsed.engine) {
      conditions.push(ilike(aiEngines.name, `%${parsed.engine}%`));
    }

    const rows = await db
      .select({
        engine: aiEngines.name,
        narrativeTags: responseAnalysis.narrativeTags,
      })
      .from(responseAnalysis)
      .innerJoin(responses, eq(responseAnalysis.responseId, responses.id))
      .innerJoin(runs, eq(responses.runId, runs.id))
      .innerJoin(prompts, eq(runs.promptId, prompts.id))
      .innerJoin(aiEngines, eq(runs.engineId, aiEngines.id))
      .where(and(...conditions));

    const tagCounts = new Map<string, number>();
    const engineTagCounts = new Map<string, number>();

    for (const row of rows) {
      for (const tag of row.narrativeTags ?? []) {
        const normalizedTag = tag.trim();
        if (!normalizedTag) continue;

        tagCounts.set(normalizedTag, (tagCounts.get(normalizedTag) ?? 0) + 1);

        const engineKey = `${row.engine}::${normalizedTag}`;
        engineTagCounts.set(engineKey, (engineTagCounts.get(engineKey) ?? 0) + 1);
      }
    }

    const totalTagMentions = [...tagCounts.values()].reduce((sum, n) => sum + n, 0);

    const topNarratives = [...tagCounts.entries()]
      .map(([tag, count]) => ({
        tag,
        count,
        share:
          totalTagMentions > 0
            ? Math.round((count / totalTagMentions) * 10000) / 100
            : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    const byEngine = [...engineTagCounts.entries()]
      .map(([key, count]) => {
        const [engine, tag] = key.split('::');
        return { engine, tag, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 50);

    res.json({
      success: true,
      data: {
        topNarratives,
        byEngine,
      },
    });
  } catch (error) {
    next(error);
  }
};
