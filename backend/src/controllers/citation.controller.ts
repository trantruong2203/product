import { Response, NextFunction } from 'express';
import { and, desc, eq, gte, ilike, lte, sql } from 'drizzle-orm';
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
import { getCitationsSchema } from '../validations/index.js';

export const getProjectCitations = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { projectId } = req.params;
    const userId = req.user!.id;

    const parsed = getCitationsSchema.parse(req.query);

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

    const conditions = [eq(prompts.projectId, projectId as string)];

    if (parsed.from) {
      conditions.push(gte(citations.createdAt, new Date(parsed.from)));
    }

    if (parsed.to) {
      conditions.push(lte(citations.createdAt, new Date(parsed.to)));
    }

    if (parsed.keyword) {
      conditions.push(ilike(prompts.query, `%${parsed.keyword}%`));
    }

    if (parsed.engine) {
      conditions.push(ilike(aiEngines.name, `%${parsed.engine}%`));
    }

    if (parsed.sourceType) {
      conditions.push(eq(citations.sourceType, parsed.sourceType));
    }

    if (parsed.isValid !== undefined) {
      conditions.push(eq(citations.isValid, parsed.isValid));
    }

    const whereClause = and(...conditions);

    const totalRows = await db
      .select({ count: sql<number>`count(*)` })
      .from(citations)
      .innerJoin(responses, eq(citations.responseId, responses.id))
      .innerJoin(runs, eq(responses.runId, runs.id))
      .innerJoin(prompts, eq(runs.promptId, prompts.id))
      .innerJoin(aiEngines, eq(runs.engineId, aiEngines.id))
      .where(whereClause);

    const total = Number(totalRows[0]?.count ?? 0);

    const rows = await db
      .select({
        id: citations.id,
        runId: runs.id,
        responseId: citations.responseId,
        keyword: prompts.query,
        engine: aiEngines.name,
        brand: citations.brand,
        url: citations.url,
        hostname: citations.hostname,
        path: citations.path,
        sourceType: citations.sourceType,
        isValid: citations.isValid,
        httpStatus: citations.httpStatus,
        mentionedBrand: citations.mentionedBrand,
        mentionedBrandName: citations.mentionedBrandName,
        mentionedBrandIsPrimary: citations.mentionedBrandIsPrimary,
        linkedBrandName: citations.linkedBrandName,
        linkedBrandType: citations.linkedBrandType,
        createdAt: citations.createdAt,
      })
      .from(citations)
      .innerJoin(responses, eq(citations.responseId, responses.id))
      .innerJoin(runs, eq(responses.runId, runs.id))
      .innerJoin(prompts, eq(runs.promptId, prompts.id))
      .innerJoin(aiEngines, eq(runs.engineId, aiEngines.id))
      .where(whereClause)
      .orderBy(desc(citations.createdAt))
      .limit(pageSize)
      .offset(offset);

    res.json({
      success: true,
      data: {
        items: rows.map((row) => ({
          ...row,
          createdAt: row.createdAt.toISOString(),
        })),
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

export const getProjectCitationSummary = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { projectId } = req.params;
    const userId = req.user!.id;

    const parsed = getCitationsSchema.parse(req.query);

    const projectList = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, projectId as string), eq(projects.userId, userId)));

    if (!projectList[0]) {
      throw new AppError('Project not found', 404);
    }

    const conditions = [eq(prompts.projectId, projectId as string)];

    if (parsed.from) {
      conditions.push(gte(citations.createdAt, new Date(parsed.from)));
    }

    if (parsed.to) {
      conditions.push(lte(citations.createdAt, new Date(parsed.to)));
    }

    if (parsed.keyword) {
      conditions.push(ilike(prompts.query, `%${parsed.keyword}%`));
    }

    if (parsed.engine) {
      conditions.push(ilike(aiEngines.name, `%${parsed.engine}%`));
    }

    if (parsed.sourceType) {
      conditions.push(eq(citations.sourceType, parsed.sourceType));
    }

    if (parsed.isValid !== undefined) {
      conditions.push(eq(citations.isValid, parsed.isValid));
    }

    const whereClause = and(...conditions);

    const aggregateRows = await db
      .select({
        all: sql<number>`count(*)`,
        own: sql<number>`sum(case when ${citations.sourceType} = 'OWN' then 1 else 0 end)`,
        competitor: sql<number>`sum(case when ${citations.sourceType} = 'COMPETITOR' then 1 else 0 end)`,
        thirdParty: sql<number>`sum(case when ${citations.sourceType} = 'THIRD_PARTY' then 1 else 0 end)`,
        invalidLinks: sql<number>`sum(case when ${citations.isValid} = false then 1 else 0 end)`,
      })
      .from(citations)
      .innerJoin(responses, eq(citations.responseId, responses.id))
      .innerJoin(runs, eq(responses.runId, runs.id))
      .innerJoin(prompts, eq(runs.promptId, prompts.id))
      .innerJoin(aiEngines, eq(runs.engineId, aiEngines.id))
      .where(whereClause);

    const topDomainsRows = await db
      .select({
        hostname: citations.hostname,
        count: sql<number>`count(*)`,
      })
      .from(citations)
      .innerJoin(responses, eq(citations.responseId, responses.id))
      .innerJoin(runs, eq(responses.runId, runs.id))
      .innerJoin(prompts, eq(runs.promptId, prompts.id))
      .innerJoin(aiEngines, eq(runs.engineId, aiEngines.id))
      .where(and(whereClause, sql`${citations.hostname} is not null`))
      .groupBy(citations.hostname)
      .orderBy(desc(sql`count(*)`))
      .limit(10);

    const agg = aggregateRows[0];

    res.json({
      success: true,
      data: {
        totals: {
          all: Number(agg?.all ?? 0),
          own: Number(agg?.own ?? 0),
          competitor: Number(agg?.competitor ?? 0),
          thirdParty: Number(agg?.thirdParty ?? 0),
          invalidLinks: Number(agg?.invalidLinks ?? 0),
        },
        topDomains: topDomainsRows
          .filter((row) => row.hostname)
          .map((row) => ({
            hostname: row.hostname as string,
            count: Number(row.count ?? 0),
          })),
      },
    });
  } catch (error) {
    next(error);
  }
};
