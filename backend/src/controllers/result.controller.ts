import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';

export const getProjectResults = async (
  req: Request<{ projectId: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { projectId } = req.params;
    const authReq = req as Request<{ projectId: string }> & { user: { id: string } };
    const userId = authReq.user!.id;

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
    });

    if (!project) {
      throw new AppError('Project not found', 404);
    }

    const runs = await prisma.run.findMany({
      where: {
        prompt: { projectId },
        status: 'COMPLETED',
      },
      include: {
        prompt: true,
        engine: true,
        responses: {
          include: {
            citations: true,
          },
        },
      },
      orderBy: { finishedAt: 'desc' },
      take: 100,
    });

    const brandCitations = runs.flatMap(run =>
      run.responses.flatMap(response =>
        response.citations.filter(c => 
          c.brand.toLowerCase() === project.brandName.toLowerCase()
        )
      )
    );

    const competitorIds = await prisma.competitor.findMany({
      where: { projectId },
      select: { name: true },
    });

    const competitorMentions = runs.flatMap(run =>
      run.responses.flatMap(response =>
        response.citations.filter(c => 
          competitorIds.some(comp => comp.name.toLowerCase() === c.brand.toLowerCase())
        )
      )
    );

    const totalPrompts = await prisma.prompt.count({
      where: { projectId, isActive: true },
    });

    const citedPrompts = new Set(
      brandCitations.map(c => c.responseId)
    ).size;

    const citationRate = totalPrompts > 0 ? (citedPrompts / totalPrompts) * 100 : 0;
    const promptCoverage = runs.length > 0 ? (brandCitations.length / runs.length) * 100 : 0;

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
        totalRuns: runs.length,
        totalCitations: brandCitations.length,
        competitorMentions: competitorMentions.length,
        recentRuns: runs.slice(0, 10),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getProjectHistory = async (
  req: Request<{ projectId: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { projectId } = req.params;
    const authReq = req as Request<{ projectId: string }> & { user: { id: string } };
    const userId = authReq.user!.id;
    const { days = '30' } = req.query;

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
    });

    if (!project) {
      throw new AppError('Project not found', 404);
    }

    const daysNum = parseInt(days as string, 10);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);

    const runs = await prisma.run.findMany({
      where: {
        prompt: { projectId },
        status: 'COMPLETED',
        finishedAt: { gte: startDate },
      },
      include: {
        prompt: true,
        engine: true,
        responses: {
          include: {
            citations: true,
          },
        },
      },
      orderBy: { finishedAt: 'asc' },
    });

    const historyMap = new Map<string, { date: string; score: number; citations: number }>();

    for (const run of runs) {
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
  req: Request<{ projectId: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { projectId } = req.params;
    const authReq = req as Request<{ projectId: string }> & { user: { id: string } };
    const userId = authReq.user!.id;

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
      include: { competitors: true },
    });

    if (!project) {
      throw new AppError('Project not found', 404);
    }

    const runs = await prisma.run.findMany({
      where: {
        prompt: { projectId },
        status: 'COMPLETED',
      },
      include: {
        responses: {
          include: {
            citations: true,
          },
        },
      },
    });

    const brandCitations = runs.flatMap(run =>
      run.responses.flatMap(response =>
        response.citations.filter(c => 
          c.brand.toLowerCase() === project.brandName.toLowerCase()
        )
      )
    ).length;

    const competitorData = await Promise.all(
      project.competitors.map(async (competitor) => {
        const citations = runs.flatMap(run =>
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
