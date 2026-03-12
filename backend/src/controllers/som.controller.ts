import { Response, NextFunction } from 'express';
import { and, eq, gte, ilike, inArray, lte } from 'drizzle-orm';
import db, {
  aiEngines,
  citations,
  projects,
  prompts,
  responses,
  runs,
} from '../db/index.js';
import { AppError } from '../middleware/errorHandler.js';
import type { AuthRequest } from '../middleware/authenticate.js';
import { getSoMSchema } from '../validations/index.js';

interface SoMAccumulator {
  responseIds: Set<string>;
  brandResponses: Map<string, Set<string>>;
}

function toBucket(date: Date, granularity: 'day' | 'week'): string {
  const d = new Date(date);

  if (granularity === 'day') {
    return d.toISOString().slice(0, 10);
  }

  const day = d.getUTCDay();
  const diff = (day + 6) % 7;
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}

function parseDateInput(value: string | undefined, fallback: Date): Date {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

export const getProjectSoM = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { projectId } = req.params;
    const userId = req.user!.id;

    const parsed = getSoMSchema.parse(req.query);

    const granularity: 'day' | 'week' = parsed.granularity ?? 'day';
    const now = new Date();
    const defaultFrom = new Date(now);
    defaultFrom.setUTCDate(defaultFrom.getUTCDate() - 30);

    const from = parseDateInput(parsed.from, defaultFrom);
    const to = parseDateInput(parsed.to, now);

    const projectList = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, projectId as string), eq(projects.userId, userId)));

    if (!projectList[0]) {
      throw new AppError('Project not found', 404);
    }

    const conditions = [eq(prompts.projectId, projectId as string), gte(responses.createdAt, from), lte(responses.createdAt, to)];

    if (parsed.keyword) {
      conditions.push(ilike(prompts.query, `%${parsed.keyword}%`));
    }

    if (parsed.engine) {
      conditions.push(ilike(aiEngines.name, `%${parsed.engine}%`));
    }

    const responseRows = await db
      .select({
        responseId: responses.id,
        keyword: prompts.query,
        engine: aiEngines.name,
        createdAt: responses.createdAt,
      })
      .from(responses)
      .innerJoin(runs, eq(responses.runId, runs.id))
      .innerJoin(prompts, eq(runs.promptId, prompts.id))
      .innerJoin(aiEngines, eq(runs.engineId, aiEngines.id))
      .where(and(...conditions));

    const responseIds = responseRows.map((r) => r.responseId);

    const mentionRows = responseIds.length
      ? await db
          .select({
            responseId: citations.responseId,
            brand: citations.brand,
            keyword: prompts.query,
            engine: aiEngines.name,
          })
          .from(citations)
          .innerJoin(responses, eq(citations.responseId, responses.id))
          .innerJoin(runs, eq(responses.runId, runs.id))
          .innerJoin(prompts, eq(runs.promptId, prompts.id))
          .innerJoin(aiEngines, eq(runs.engineId, aiEngines.id))
          .where(
            and(
              inArray(citations.responseId, responseIds),
              eq(citations.mentionedBrand, true)
            )
          )
      : [];

    const grouped = new Map<string, SoMAccumulator>();

    for (const row of responseRows) {
      const bucket = toBucket(row.createdAt, granularity);
      const key = `${bucket}::${row.keyword}::${row.engine}`;

      if (!grouped.has(key)) {
        grouped.set(key, {
          responseIds: new Set<string>(),
          brandResponses: new Map<string, Set<string>>(),
        });
      }

      grouped.get(key)!.responseIds.add(row.responseId);
    }

    for (const row of mentionRows) {
      const bucket = toBucket(
        responseRows.find((r) => r.responseId === row.responseId)?.createdAt ?? from,
        granularity
      );
      const key = `${bucket}::${row.keyword}::${row.engine}`;
      const agg = grouped.get(key);
      if (!agg || !agg.responseIds.has(row.responseId)) continue;
      if (!agg.brandResponses.has(row.brand)) {
        agg.brandResponses.set(row.brand, new Set<string>());
      }
      agg.brandResponses.get(row.brand)!.add(row.responseId);
    }

    const series = [...grouped.entries()]
      .map(([key, agg]) => {
        const [bucket, keyword, engine] = key.split('::');

        const brands = [...agg.brandResponses.entries()].map(([name, responses]) => {
          const mentionResponses = responses.size;
          return {
            name,
            mentions: mentionResponses,
            som:
              agg.responseIds.size > 0
                ? Math.round((mentionResponses / agg.responseIds.size) * 10000) / 100
                : 0,
          };
        });

        brands.sort((a, b) => b.mentions - a.mentions);

        return {
          bucket,
          keyword,
          engine,
          totals: {
            mentionsAllBrands: [...agg.brandResponses.values()].reduce(
              (sum, set) => sum + set.size,
              0
            ),
            responses: agg.responseIds.size,
          },
          brands,
        };
      })
      .sort((a, b) => a.bucket.localeCompare(b.bucket));

    res.json({
      success: true,
      data: {
        projectId,
        window: {
          from: from.toISOString(),
          to: to.toISOString(),
          granularity,
        },
        series,
      },
    });
  } catch (error) {
    next(error);
  }
};
