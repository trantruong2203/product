import { Response, NextFunction } from "express";
import db, {
  runs,
  prompts,
  aiEngines,
  projects,
  responses,
  citations,
  competitors,
} from "../db/index.js";
import { eq, and, desc, asc, gte } from "drizzle-orm";
import { AppError } from "../middleware/errorHandler.js";
import type { AuthRequest } from "../middleware/authenticate.js";

// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────────────────

interface CitationRow {
  id: string;
  responseId: string;
  brand: string;
  domain: string;
  position: number | null;
  confidence: number | null;
  context: string | null;
}

interface ResponseRow {
  id: string;
  runId: string;
  citations: CitationRow[];
}

interface RunRow {
  id: string;
  promptId: string;
  engineId: string;
  finishedAt: Date | null;
  responses: ResponseRow[];
}

/**
 * Given a citation, trace it back to its promptId via responseId → runId → promptId.
 * Returns null if the chain is broken.
 */
function traceToPromptId(
  citation: CitationRow,
  allRuns: RunRow[],
): string | null {
  for (const run of allRuns) {
    if (run.responses.some((r) => r.id === citation.responseId)) {
      return run.promptId;
    }
  }
  return null;
}

/**
 * FIX #3: Exponential decay position score.
 * Position 1 → 100, 2 → 75, 3 → 56, 5 → 32, 10 → ~8
 * Reflects real GEO value (being #1 vs #2 matters far more than #9 vs #10).
 */
function positionScore(avgPosition: number): number {
  if (avgPosition <= 0) return 0;
  return Math.round(100 * Math.pow(0.75, avgPosition - 1));
}

/**
 * FIX #4: Weighted brand citation score incorporating confidence.
 */
function weightedCitationTotal(brandCitations: CitationRow[]): number {
  return brandCitations.reduce((sum, c) => sum + (c.confidence ?? 1), 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/projects/:projectId/results
// ─────────────────────────────────────────────────────────────────────────────

export const getProjectResults = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { projectId } = req.params;
    const userId = req.user!.id;

    const projectList = await db
      .select()
      .from(projects)
      .where(
        and(eq(projects.id, projectId as string), eq(projects.userId, userId)),
      );

    const project = projectList[0];
    if (!project) throw new AppError("Project not found", 404);

    // Fetch completed runs for this project
    const runsData = await db
      .select()
      .from(runs)
      .innerJoin(prompts, eq(runs.promptId, prompts.id))
      .innerJoin(aiEngines, eq(runs.engineId, aiEngines.id))
      .where(
        and(
          eq(prompts.projectId, projectId as string),
          eq(runs.status, "COMPLETED"),
        ),
      )
      .orderBy(desc(runs.finishedAt))
      .limit(200);

    // Hydrate runs with responses + citations
    const runsWithDetails: RunRow[] = await Promise.all(
      runsData.map(async (r) => {
        const responsesData = await db
          .select()
          .from(responses)
          .where(eq(responses.runId, r.Run.id as string));

        const responsesWithCitations: ResponseRow[] = await Promise.all(
          responsesData.map(async (resp) => {
            const citationsData = await db
              .select()
              .from(citations)
              .where(eq(citations.responseId, resp.id));
            return {
              id: resp.id,
              runId: resp.runId,
              citations: citationsData as CitationRow[],
            };
          }),
        );

        return {
          id: r.Run.id,
          promptId: r.Run.promptId,
          engineId: r.Run.engineId,
          finishedAt: r.Run.finishedAt,
          responses: responsesWithCitations,
        };
      }),
    );

    // All citations for main brand
    const brandCitations: CitationRow[] = runsWithDetails.flatMap((run) =>
      run.responses.flatMap((resp) =>
        resp.citations.filter(
          (c) => c.brand.toLowerCase() === project.brandName.toLowerCase(),
        ),
      ),
    );

    // Competitors
    const competitorsList = await db
      .select()
      .from(competitors)
      .where(eq(competitors.projectId, projectId as string));
    const competitorNames = competitorsList.map((c) => c.name.toLowerCase());

    const competitorMentions: CitationRow[] = runsWithDetails.flatMap((run) =>
      run.responses.flatMap((resp) =>
        resp.citations.filter((c) =>
          competitorNames.includes(c.brand.toLowerCase()),
        ),
      ),
    );

    // Active prompts
    const promptsData = await db
      .select()
      .from(prompts)
      .where(
        and(
          eq(prompts.projectId, projectId as string),
          eq(prompts.isActive, true),
        ),
      );
    const totalPrompts = promptsData.length;
    const engineCount = new Set(runsWithDetails.map((r) => r.engineId)).size;

    // ── FIX #1: citationRate — count unique promptIds that have ≥1 brand mention ──
    const citedPromptIds = new Set<string>();
    for (const citation of brandCitations) {
      const pid = traceToPromptId(citation, runsWithDetails);
      if (pid) citedPromptIds.add(pid);
    }
    const citationRate =
      totalPrompts > 0 ? (citedPromptIds.size / totalPrompts) * 100 : 0;

    // ── FIX #2: promptCoverage — % of prompts mentioned at least once (same set) ──
    const promptCoverage = citationRate; // Same concept, kept separate for clarity/future divergence

    // ── FIX #3: avgPosition + exponential decay score ──
    const positionedCitations = brandCitations.filter(
      (c) => c.position !== null,
    );
    const avgPosition =
      positionedCitations.length > 0
        ? positionedCitations.reduce(
            (sum, c) => sum + (c.position as number),
            0,
          ) / positionedCitations.length
        : 0;
    const avgPositionScore = positionScore(avgPosition);

    // ── FIX #4: confidence-weighted score ──
    const maxPossibleWeight = totalPrompts * Math.max(engineCount, 1); // max ideal citations
    const weightedTotal = weightedCitationTotal(brandCitations);
    const confidenceScore =
      maxPossibleWeight > 0
        ? Math.min(100, (weightedTotal / maxPossibleWeight) * 100)
        : 0;

    // ── Final visibility score (updated weights) ──
    const visibilityScore =
      citationRate * 0.35 +
      promptCoverage * 0.25 +
      avgPositionScore * 0.25 +
      confidenceScore * 0.15;

    res.json({
      success: true,
      data: {
        visibilityScore: Math.round(visibilityScore * 100) / 100,
        citationRate: Math.round(citationRate * 100) / 100,
        promptCoverage: Math.round(promptCoverage * 100) / 100,
        avgPosition: Math.round(avgPosition * 100) / 100,
        avgPositionScore: Math.round(avgPositionScore * 100) / 100,
        confidenceScore: Math.round(confidenceScore * 100) / 100,
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

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/projects/:projectId/history
// ─────────────────────────────────────────────────────────────────────────────

export const getProjectHistory = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { projectId } = req.params;
    const userId = req.user!.id;
    const { days = "30" } = req.query;

    const projectList = await db
      .select()
      .from(projects)
      .where(
        and(eq(projects.id, projectId as string), eq(projects.userId, userId)),
      );

    const project = projectList[0];
    if (!project) throw new AppError("Project not found", 404);

    const daysNum = parseInt(days as string, 10);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);

    const runsData = await db
      .select()
      .from(runs)
      .innerJoin(prompts, eq(runs.promptId, prompts.id))
      .innerJoin(aiEngines, eq(runs.engineId, aiEngines.id))
      .where(
        and(
          eq(prompts.projectId, projectId as string),
          eq(runs.status, "COMPLETED"),
          gte(runs.finishedAt, startDate),
        ),
      )
      .orderBy(asc(runs.finishedAt));

    const runsWithDetails: RunRow[] = await Promise.all(
      runsData.map(async (r) => {
        const responsesData = await db
          .select()
          .from(responses)
          .where(eq(responses.runId, r.Run.id as string));

        const responsesWithCitations: ResponseRow[] = await Promise.all(
          responsesData.map(async (resp) => {
            const citationsData = await db
              .select()
              .from(citations)
              .where(eq(citations.responseId, resp.id));
            return {
              id: resp.id,
              runId: resp.runId,
              citations: citationsData as CitationRow[],
            };
          }),
        );

        return {
          id: r.Run.id,
          promptId: r.Run.promptId,
          engineId: r.Run.engineId,
          finishedAt: r.Run.finishedAt,
          responses: responsesWithCitations,
        };
      }),
    );

    // ── FIX #5: Correct daily aggregation — accumulate then average ──
    type DayBucket = {
      date: string;
      totalScore: number;
      count: number;
      citations: number;
    };

    const historyMap = new Map<string, DayBucket>();

    for (const run of runsWithDetails) {
      if (!run.finishedAt) continue;

      const dateKey = run.finishedAt.toISOString().split("T")[0];

      const brandCitationsForRun: CitationRow[] = run.responses.flatMap((r) =>
        r.citations.filter(
          (c) => c.brand.toLowerCase() === project.brandName.toLowerCase(),
        ),
      );

      // Score for this individual run = citation presence rate across its responses
      const runCitationRate =
        run.responses.length > 0
          ? (brandCitationsForRun.length / run.responses.length) * 100
          : 0;

      if (!historyMap.has(dateKey)) {
        historyMap.set(dateKey, {
          date: dateKey,
          totalScore: 0,
          count: 0,
          citations: 0,
        });
      }

      const bucket = historyMap.get(dateKey)!;
      bucket.totalScore += runCitationRate; // accumulate
      bucket.count += 1; // track count
      bucket.citations += brandCitationsForRun.length;
    }

    // Compute true average per day
    const history = Array.from(historyMap.values())
      .map((d) => ({
        date: d.date,
        score: Math.round((d.totalScore / d.count) * 100) / 100,
        citations: d.citations,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    res.json({ success: true, data: history });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/projects/:projectId/competitor-comparison
// ─────────────────────────────────────────────────────────────────────────────

export const getCompetitorComparison = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { projectId } = req.params;
    const userId = req.user!.id;

    const projectList = await db
      .select()
      .from(projects)
      .where(
        and(eq(projects.id, projectId as string), eq(projects.userId, userId)),
      );

    const project = projectList[0];
    if (!project) throw new AppError("Project not found", 404);

    const competitorsData = await db
      .select()
      .from(competitors)
      .where(eq(competitors.projectId, projectId as string));

    const runsData = await db
      .select()
      .from(runs)
      .innerJoin(prompts, eq(runs.promptId, prompts.id))
      .where(
        and(
          eq(prompts.projectId, projectId as string),
          eq(runs.status, "COMPLETED"),
        ),
      );

    const runsWithResponses: RunRow[] = await Promise.all(
      runsData.map(async (r) => {
        const responsesData = await db
          .select()
          .from(responses)
          .where(eq(responses.runId, r.Run.id as string));

        const responsesWithCitations: ResponseRow[] = await Promise.all(
          responsesData.map(async (resp) => {
            const citationsData = await db
              .select()
              .from(citations)
              .where(eq(citations.responseId, resp.id));
            return {
              id: resp.id,
              runId: resp.runId,
              citations: citationsData as CitationRow[],
            };
          }),
        );

        return {
          id: r.Run.id,
          promptId: r.Run.promptId,
          engineId: r.Run.engineId,
          finishedAt: r.Run.finishedAt,
          responses: responsesWithCitations,
        };
      }),
    );

    const countCitations = (
      brandNameOrDomain: string,
      isDomain = false,
    ): number =>
      runsWithResponses.flatMap((run) =>
        run.responses.flatMap((resp) =>
          resp.citations.filter((c) =>
            isDomain
              ? c.domain?.includes(brandNameOrDomain)
              : c.brand.toLowerCase() === brandNameOrDomain.toLowerCase(),
          ),
        ),
      ).length;

    const brandCitationCount = countCitations(project.brandName);

    const competitorData = competitorsData.map((competitor) => ({
      name: competitor.name,
      domain: competitor.domain,
      citations:
        countCitations(competitor.name) +
        countCitations(competitor.domain, true),
    }));

    res.json({
      success: true,
      data: [
        {
          name: project.brandName,
          domain: project.domain,
          citations: brandCitationCount,
        },
        ...competitorData,
      ],
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/projects/:projectId/prompt-rankings
// ─────────────────────────────────────────────────────────────────────────────

export const getPromptRankings = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { projectId } = req.params;
    const userId = req.user!.id;
    const { engineId } = req.query;

    const projectList = await db
      .select()
      .from(projects)
      .where(
        and(eq(projects.id, projectId as string), eq(projects.userId, userId)),
      );

    const project = projectList[0];
    if (!project) throw new AppError("Project not found", 404);

    const promptsData = await db
      .select()
      .from(prompts)
      .where(eq(prompts.projectId, projectId as string));

    const whereConditions: any[] = [
      eq(prompts.projectId, projectId as string),
      eq(runs.status, "COMPLETED"),
    ];
    if (engineId) whereConditions.push(eq(runs.engineId, engineId as string));

    const runsData = await db
      .select()
      .from(runs)
      .innerJoin(prompts, eq(runs.promptId, prompts.id))
      .innerJoin(aiEngines, eq(runs.engineId, aiEngines.id))
      .where(and(...whereConditions));

    // Fetch all responses + citations in bulk
    const allResponses = await db
      .select()
      .from(responses)
      .innerJoin(runs, eq(responses.runId, runs.id))
      .innerJoin(prompts, eq(runs.promptId, prompts.id))
      .where(
        and(
          eq(prompts.projectId, projectId as string),
          eq(runs.status, "COMPLETED"),
          engineId ? eq(runs.engineId, engineId as string) : undefined,
        ),
      );

    const responseIds = allResponses.map((r) => r.Response.id);
    const allCitations =
      responseIds.length > 0
        ? (await db.select().from(citations)).filter((c) =>
            responseIds.includes(c.responseId),
          )
        : [];

    // All brands to rank
    const competitorsData = await db
      .select()
      .from(competitors)
      .where(eq(competitors.projectId, projectId as string));
    const allBrands = [
      { name: project.brandName, isMain: true },
      ...competitorsData.map((c) => ({ name: c.name, isMain: false })),
    ];

    // Group citations by (promptId, engineId, brand) → collect positions + count
    type CitationGroup = { positions: number[]; weightedCount: number };
    const citationGroups = new Map<string, CitationGroup>();

    for (const citation of allCitations) {
      const response = allResponses.find(
        (r) => r.Response.id === citation.responseId,
      );
      if (!response) continue;

      const run = runsData.find((r) => r.Run.id === response.Response.runId);
      if (!run) continue;

      const key = `${run.Prompt.id}|${run.AIEngine.id}|${citation.brand.toLowerCase()}`;
      if (!citationGroups.has(key)) {
        citationGroups.set(key, { positions: [], weightedCount: 0 });
      }

      const group = citationGroups.get(key)!;
      if (citation.position !== null && citation.position !== undefined) {
        group.positions.push(citation.position);
      }
      group.weightedCount += citation.confidence ?? 1;
    }

    // Build ranking entries
    type RankingEntry = {
      promptId: string;
      promptQuery: string;
      engineId: string;
      engineName: string;
      brand: string;
      rank: number;
      mentions: number;
      avgPosition: number | null;
      posScore: number;
    };

    const rankingMap = new Map<string, RankingEntry>();

    for (const [key, data] of citationGroups) {
      const [promptId, engineIdKey, brand] = key.split("|");
      const prompt = promptsData.find((p) => p.id === promptId);
      const engine = runsData.find(
        (r) => r.Prompt.id === promptId && r.AIEngine.id === engineIdKey,
      )?.AIEngine;

      if (!prompt || !engine) continue;

      const avgPos =
        data.positions.length > 0
          ? data.positions.reduce((a, b) => a + b, 0) / data.positions.length
          : null;

      rankingMap.set(key, {
        promptId,
        promptQuery: prompt.query,
        engineId: engine.id,
        engineName: engine.name,
        brand,
        rank: 0, // assigned below
        mentions: Math.round(data.weightedCount * 100) / 100, // weighted count
        avgPosition: avgPos !== null ? Math.round(avgPos * 100) / 100 : null,
        posScore: avgPos !== null ? positionScore(avgPos) : 0,
      });
    }

    // Assign ranks per (prompt, engine) group — brand with best posScore gets rank 1
    const promptEngineGroups = new Map<
      string,
      Array<{ key: string; posScore: number; avgPosition: number | null }>
    >();

    for (const [key, data] of rankingMap) {
      const groupKey = `${data.promptId}|${data.engineId}`;
      if (!promptEngineGroups.has(groupKey))
        promptEngineGroups.set(groupKey, []);
      promptEngineGroups
        .get(groupKey)!
        .push({ key, posScore: data.posScore, avgPosition: data.avgPosition });
    }

    const finalRankings: RankingEntry[] = [];

    for (const [, brands] of promptEngineGroups) {
      // Higher posScore = better rank; null position goes to end
      brands.sort((a, b) => {
        if (a.avgPosition === null && b.avgPosition === null) return 0;
        if (a.avgPosition === null) return 1;
        if (b.avgPosition === null) return -1;
        return a.avgPosition - b.avgPosition; // lower position number = better rank
      });

      brands.forEach((b, i) => {
        const entry = rankingMap.get(b.key);
        if (entry) finalRankings.push({ ...entry, rank: i + 1 });
      });
    }

    finalRankings.sort((a, b) => {
      if (a.promptQuery !== b.promptQuery)
        return a.promptQuery.localeCompare(b.promptQuery);
      return a.rank - b.rank;
    });

    res.json({ success: true, data: finalRankings });
  } catch (error) {
    next(error);
  }
};
