import { Response, NextFunction } from 'express';
import { and, desc, eq, gte, ilike, inArray, lte, sql } from 'drizzle-orm';
import db, {
  aiEngines,
  citations,
  projects,
  prompts,
  recommendations,
  responseAnalysis,
  responses,
  runs,
} from '../db/index.js';
import { AppError } from '../middleware/errorHandler.js';
import type { AuthRequest } from '../middleware/authenticate.js';
import { getDashboardTableSchema } from '../validations/index.js';

function parseDateInput(value: string | undefined, fallback: Date): Date {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

export const getProjectDashboardTable = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { projectId } = req.params;
    const userId = req.user!.id;
    const parsed = getDashboardTableSchema.parse(req.query);

    const page = parsed.page ?? 1;
    const pageSize = parsed.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    const now = new Date();
    const defaultFrom = new Date(now);
    defaultFrom.setUTCDate(defaultFrom.getUTCDate() - 30);

    const from = parseDateInput(parsed.from, defaultFrom);
    const to = parseDateInput(parsed.to, now);

    const projectRows = await db
      .select({ id: projects.id, brandName: projects.brandName })
      .from(projects)
      .where(and(eq(projects.id, projectId as string), eq(projects.userId, userId)));

    const project = projectRows[0];

    if (!project) {
      throw new AppError('Project not found', 404);
    }

    const conditions = [
      eq(prompts.projectId, projectId as string),
      gte(runs.createdAt, from),
      lte(runs.createdAt, to),
    ];

    if (parsed.keyword) {
      conditions.push(ilike(prompts.query, `%${parsed.keyword}%`));
    }

    if (parsed.engine) {
      conditions.push(ilike(aiEngines.name, `%${parsed.engine}%`));
    }

    const whereClause = and(...conditions);

    const totalRows = await db
      .select({ count: sql<number>`count(*)` })
      .from(runs)
      .innerJoin(prompts, eq(runs.promptId, prompts.id))
      .innerJoin(aiEngines, eq(runs.engineId, aiEngines.id))
      .where(whereClause);

    const total = Number(totalRows[0]?.count ?? 0);

    const runRows = await db
      .select({
        runId: runs.id,
        keyword: prompts.query,
        aiModel: aiEngines.name,
        runCreatedAt: runs.createdAt,
      })
      .from(runs)
      .innerJoin(prompts, eq(runs.promptId, prompts.id))
      .innerJoin(aiEngines, eq(runs.engineId, aiEngines.id))
      .where(whereClause)
      .orderBy(desc(runs.createdAt))
      .limit(pageSize)
      .offset(offset);

    const runIds = runRows.map((r) => r.runId);

    const responseRows = runIds.length
      ? await db
          .select({
            id: responses.id,
            runId: responses.runId,
            createdAt: responses.createdAt,
          })
          .from(responses)
          .where(inArray(responses.runId, runIds))
          .orderBy(desc(responses.createdAt))
      : [];

    const responseByRun = new Map<string, { id: string; createdAt: Date }>();
    for (const row of responseRows) {
      if (!responseByRun.has(row.runId)) {
        responseByRun.set(row.runId, { id: row.id, createdAt: row.createdAt });
      }
    }

    const responseIds = [...responseByRun.values()].map((r) => r.id);

    const sentimentRows = responseIds.length
      ? await db
          .select({
            responseId: responseAnalysis.responseId,
            sentimentScore: responseAnalysis.sentimentScore,
          })
          .from(responseAnalysis)
          .where(inArray(responseAnalysis.responseId, responseIds))
      : [];

    const sentimentByResponse = new Map<string, number>();
    for (const row of sentimentRows) {
      sentimentByResponse.set(row.responseId, row.sentimentScore);
    }

    const citationRows = responseIds.length
      ? await db
          .select({
            responseId: citations.responseId,
            brand: citations.brand,
            mentionedBrand: citations.mentionedBrand,
            url: citations.url,
            createdAt: citations.createdAt,
          })
          .from(citations)
          .where(inArray(citations.responseId, responseIds))
          .orderBy(desc(citations.createdAt))
      : [];

    const citationsByResponse = new Map<
      string,
      Array<{
        brand: string;
        mentionedBrand: boolean;
        url: string | null;
      }>
    >();

    for (const row of citationRows) {
      if (!citationsByResponse.has(row.responseId)) {
        citationsByResponse.set(row.responseId, []);
      }
      citationsByResponse.get(row.responseId)!.push({
        brand: row.brand,
        mentionedBrand: row.mentionedBrand,
        url: row.url,
      });
    }

    const recommendationRows = await db
      .select({
        keyword: recommendations.keyword,
        suggestedAction: recommendations.suggestedAction,
        createdAt: recommendations.createdAt,
      })
      .from(recommendations)
      .where(eq(recommendations.projectId, projectId as string))
      .orderBy(desc(recommendations.createdAt));

    const recommendationByKeyword = new Map<string, string>();
    for (const row of recommendationRows) {
      const key = (row.keyword || '').trim().toLowerCase();
      if (!key) continue;
      if (!recommendationByKeyword.has(key)) {
        recommendationByKeyword.set(key, row.suggestedAction);
      }
    }

    const rows = runRows.map((run) => {
      const response = responseByRun.get(run.runId);
      const responseId = response?.id;

      const responseCitations = responseId
        ? (citationsByResponse.get(responseId) ?? [])
        : [];

      const brandMention = responseCitations.some(
        (c) =>
          c.mentionedBrand &&
          c.brand.toLowerCase() === project.brandName.toLowerCase()
      );

      const citationLink =
        responseCitations.find((c) => c.url)?.url ?? null;

      const sentimentScore = responseId
        ? sentimentByResponse.get(responseId) ?? 0
        : 0;

      const suggestedAction =
        recommendationByKeyword.get(run.keyword.trim().toLowerCase()) ?? '';

      return {
        keyword: run.keyword,
        aiModel: run.aiModel,
        brandMention,
        citationLink,
        sentimentScore,
        suggestedAction,
      };
    });

    res.json({
      success: true,
      data: {
        rows,
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
