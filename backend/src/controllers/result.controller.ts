import { Request, Response, NextFunction } from 'express';
import db, { runs, prompts, aiEngines, projects, responses, citations, competitors } from '../db/index.js';
import { eq, and, desc, asc, gte } from 'drizzle-orm';
import { AppError } from '../middleware/errorHandler.js';
import type { AuthRequest } from '../middleware/authenticate.js';

export const getProjectResults = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { projectId } = req.params;
    const userId = req.user!.id;

    const projectList = await db.select().from(projects)
      .where(and(eq(projects.id, projectId as string  ), eq(projects.userId, userId)));

    const project = projectList[0];

    if (!project) {
      throw new AppError('Project not found', 404);
    }

    const runsData = await db.select().from(runs)
      .innerJoin(prompts, eq(runs.promptId, prompts.id))
      .innerJoin(aiEngines, eq(runs.engineId, aiEngines.id))
      .where(and(eq(prompts.projectId, projectId as string), eq(runs.status, 'COMPLETED')))
      .orderBy(desc(runs.finishedAt))
      .limit(100);

    const runsWithDetails = await Promise.all(
      runsData.map(async (r) => {
        const responsesData = await db.select().from(responses).where(eq(responses.runId, r.Run.id as string));
        const responsesWithCitations = await Promise.all(
          responsesData.map(async (resp) => {
            const citationsData = await db.select().from(citations).where(eq(citations.responseId, resp.id));
            return { ...resp, citations: citationsData };
          })
        );
        return {
          ...r.Run as any,
          prompt: r.Prompt.id,
          engine: r.AIEngine.id,
          responses: responsesWithCitations,
        };
      })
    );

    const brandCitations = runsWithDetails.flatMap(run =>
      run.responses.flatMap(response =>
        response.citations.filter(c => 
          c.brand.toLowerCase() === project.brandName.toLowerCase()
        )
      )
    );

    const competitorsList = await db.select().from(competitors).where(eq(competitors.projectId, projectId as string));
    const competitorNames = competitorsList.map(c => c.name.toLowerCase());

    const competitorMentions = runsWithDetails.flatMap(run =>
      run.responses.flatMap(response =>
        response.citations.filter(c => 
          competitorNames.includes(c.brand.toLowerCase())
        )
      )
    );

    const promptsData = await db.select().from(prompts)
      .where(and(eq(prompts.projectId, projectId as string), eq(prompts.isActive, true)));

    const totalPrompts = promptsData.length;
    const citedPrompts = new Set(
      brandCitations.map(c => c.responseId)
    ).size;

    const citationRate = totalPrompts > 0 ? (citedPrompts / totalPrompts) * 100 : 0;
    const promptCoverage = runsWithDetails.length > 0 ? (brandCitations.length / runsWithDetails.length) * 100 : 0;

    const avgPosition = brandCitations.length > 0
      ? brandCitations.reduce((sum, c) => sum + (c.position || 0), 0) / brandCitations.length
      : 0;
    const avgPositionScore = Math.max(0, 100 - avgPosition * 10);

    const visibilityScore = (citationRate * 0.5) + (promptCoverage * 0.3) + (avgPositionScore * 0.2);

    res.json({
      success: true,
      data: {
        visibilityScore: Math.round(visibilityScore * 100) / 100,
        citationRate: Math.round(citationRate * 100) / 100,
        promptCoverage: Math.round(promptCoverage * 100) / 100,
        avgPosition: Math.round(avgPosition * 100) / 100,
        totalRuns: runsWithDetails.length,
        totalCitations: brandCitations.length,
        competitorMentions: competitorMentions.length,
        recentRuns: runsWithDetails.slice(0, 10),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getProjectHistory = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { projectId } = req.params;
    const userId = req.user!.id;
    const { days = '30' } = req.query;

    const projectList = await db.select().from(projects)
      .where(and(eq(projects.id, projectId as string), eq(projects.userId, userId)));

    const project = projectList[0];

    if (!project) {
      throw new AppError('Project not found', 404);
    }

    const daysNum = parseInt(days as string, 10);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);

    const runsData = await db.select().from(runs)
      .innerJoin(prompts, eq(runs.promptId, prompts.id))
      .innerJoin(aiEngines, eq(runs.engineId, aiEngines.id))
      .where(and(
        eq(prompts.projectId, projectId as string),
        eq(runs.status, 'COMPLETED'),
        gte(runs.finishedAt, startDate)
      ))
      .orderBy(asc(runs.finishedAt));

    const runsWithDetails = await Promise.all(
      runsData.map(async (r) => {
        const responsesData = await db.select().from(responses).where(eq(responses.runId, r.Run.id as string));
        const responsesWithCitations = await Promise.all(
          responsesData.map(async (resp) => {
            const citationsData = await db.select().from(citations).where(eq(citations.responseId, resp.id));
            return { ...resp, citations: citationsData };
          })
        );
        return {
          ...r.Run as any,
          prompt: r.Prompt.id,
          engine: r.AIEngine.id,
          responses: responsesWithCitations,
        };
      })
    );

    const historyMap = new Map<string, { date: string; score: number; citations: number }>();

    for (const run of runsWithDetails) {
      if (!run.finishedAt) continue;
      
      const dateKey = run.finishedAt.toISOString().split('T')[0];
      
      const brandCitations = run.responses.flatMap(r => 
        r.citations.filter(c => 
          c.brand.toLowerCase() === project.brandName.toLowerCase()
        )
      );

      const citationRate = run.responses.length > 0 
        ? (brandCitations.length / run.responses.length) * 100 
        : 0;

      const existing = historyMap.get(dateKey) || { date: dateKey, score: 0, citations: 0 };
      existing.score = (existing.score + citationRate) / 2;
      existing.citations += brandCitations.length;
      
      historyMap.set(dateKey, existing);
    }

    const history = Array.from(historyMap.values()).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    next(error);
  }
};

export const getCompetitorComparison = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { projectId } = req.params;
    const userId = req.user!.id;

    const projectList = await db.select().from(projects)
      .where(and(eq(projects.id, projectId as string), eq(projects.userId, userId)));

    const project = projectList[0];

    if (!project) {
      throw new AppError('Project not found', 404);
    }

    const competitorsData = await db.select().from(competitors).where(eq(competitors.projectId, projectId as string));

    const runsData = await db.select().from(runs)
      .innerJoin(prompts, eq(runs.promptId, prompts.id))
      .where(and(eq(prompts.projectId, projectId as string), eq(runs.status, 'COMPLETED')));

    const runsWithResponses = await Promise.all(
      runsData.map(async (r) => {
        const responsesData = await db.select().from(responses).where(eq(responses.runId, r.Run.id as string));
        const responsesWithCitations = await Promise.all(
          responsesData.map(async (resp) => {
            const citationsData = await db.select().from(citations).where(eq(citations.responseId, resp.id));
            return { ...resp, citations: citationsData };
          })
        );
        return {
          ...r.Run as any,
          prompt: r.Prompt.id,
          engine: r.Run.engineId,
          responses: responsesWithCitations as any,
        };
      })
    );

    const brandCitations = runsWithResponses.flatMap(run =>
      run.responses.flatMap(response =>
        response.citations.filter(c => 
          c.brand.toLowerCase() === project.brandName.toLowerCase()
        )
      )
    ).length;

    const competitorData = await Promise.all(
      competitorsData.map(async (competitor) => {
        const citations = runsWithResponses.flatMap(run =>
          run.responses.flatMap(response =>
            response.citations.filter(c => 
              c.brand.toLowerCase() === competitor.name.toLowerCase() ||
              (c.domain && c.domain.includes(competitor.domain))
            )
          )
        ).length;
        
        return {
          name: competitor.name,
          domain: competitor.domain,
          citations,
        };
      })
    );

    res.json({
      success: true,
      data: [
        { name: project.brandName, domain: project.domain, citations: brandCitations },
        ...competitorData,
      ],
    });
  } catch (error) {
    next(error);
  }
};
