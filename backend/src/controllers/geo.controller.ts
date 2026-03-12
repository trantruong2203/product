/**
 * GEO Controller for the SaaS API
 * Uses proper architecture: API creates jobs, worker processes them, API returns results
 */

import { Request, Response, NextFunction } from 'express';
import { eq, and, desc, asc, gte } from 'drizzle-orm';
import db from '../db/index.js';
import { runs, prompts, responses, projects, aiEngines, competitors } from '../db/schema.js';
import { addRunPromptJob } from '../services/queue.service.js';
import { ScanRequest, ScanResponse, EngineResult, GEOScore, BrandMention } from '../types/dto.js';
import { EntityExtractor } from '../services/entityExtractor.js';
import { CompetitorDetector } from '../services/competitorDetector.js';
import { GEOCalculator } from '../services/geoCalculator.js';
import { SentimentAnalyzer } from '../services/sentimentAnalyzer.js';
import { MentionPositionDetector } from '../services/mentionPositionDetector.js';

export const runAnalysis = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { prompt, brand, competitors, engines }: ScanRequest = req.body;
    const userId = (req as Request & { user?: { id: string } }).user!.id;

    if (!prompt || !brand) {
      return res.status(400).json({
        success: false,
        message: 'Prompt and brand are required'
      });
    }

    // Get user's project (assuming first project for demo)
    const userProjects = await db.select().from(projects).where(eq(projects.userId, userId));
    if (userProjects.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No projects found for user'
      });
    }

    const projectId = userProjects[0].id;

    // Create a prompt record
    const [newPrompt] = await db.insert(prompts).values({
      projectId,
      query: prompt,
      language: 'en',
      isActive: true,
    }).returning();

    // Get available engines
    const availableEngines = await db.select().from(aiEngines).where(eq(aiEngines.isActive, true));

    // Use specified engines or all available ones
    const engineList = engines && engines.length > 0
      ? availableEngines.filter(e => engines.includes(e.name))
      : availableEngines;

    if (engineList.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid engines specified or available'
      });
    }

    // Create run records and queue jobs
    const runPromises = engineList.map(async (engine) => {
      const [newRun] = await db.insert(runs).values({
        promptId: newPrompt.id,
        engineId: engine.id,
        status: 'PENDING',
      }).returning();

      // Add job to queue
      await addRunPromptJob({
        runId: newRun.id,
        promptId: newPrompt.id,
        engineId: engine.id,
        prompt,
        engineName: engine.name,
      });

      return {
        runId: newRun.id,
        engine: engine.name,
        status: 'QUEUED'
      };
    });

    const queuedRuns = await Promise.all(runPromises);

    res.json({
      success: true,
      data: {
        promptId: newPrompt.id,
        runs: queuedRuns,
        message: `Analysis queued for ${queuedRuns.length} engines`
      }
    });
  } catch (error) {
    next(error);
  }
};

// Endpoint to get analysis results after processing
export const getAnalysisResults = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const promptId = typeof req.params.promptId === 'string' ? req.params.promptId : req.params.promptId?.[0] ?? '';
    const userId = (req as Request & { user?: { id: string } }).user!.id;

    console.log(`[GEO] getAnalysisResults called for promptId: ${promptId}, userId: ${userId}`);

    // Verify user owns the prompt
    const userProjects = await db.select().from(projects).where(eq(projects.userId, userId));
    const projectIds = userProjects.map(p => p.id);
    console.log(`[GEO] User projects: ${projectIds.join(', ')}`);

    const promptData = await db.select()
      .from(prompts)
      .where(and(eq(prompts.id, promptId)));

    console.log(`[GEO] Prompt query result:`, promptData);

    if (promptData.length === 0) {
      console.log(`[GEO] Prompt not found for promptId: ${promptId}`);
      return res.status(404).json({
        success: false,
        message: 'Prompt not found'
      });
    }

    // Verify user owns this prompt's project
    if (!projectIds.includes(promptData[0].projectId)) {
      console.log(`[GEO] Access denied - prompt projectId: ${promptData[0].projectId} not in user projects`);
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Get all runs for this prompt with proper filtering
    const runsData = await db.select()
      .from(runs)
      .innerJoin(aiEngines, eq(runs.engineId, aiEngines.id))
      .where(and(
        eq(runs.promptId, promptId),
        eq(runs.status, 'COMPLETED')
      ));

    console.log(`[GEO] All runs for promptId: ${promptId}:`, runsData.map(r => ({
      runId: r.Run.id,
      status: r.Run.status,
      engine: r.AIEngine.name,
      finishedAt: r.Run.finishedAt
    })));

    // Get responses for completed runs
    const completedRuns = runsData;

    console.log(`[GEO] Completed runs count: ${completedRuns.length}`);

    if (completedRuns.length === 0) {
      console.log(`[GEO] No completed runs for promptId: ${promptId}`);
      return res.json({
        success: true,
        data: {
          engineResults: [],
          geoScore: 0,
          brandMentions: 0,
          competitorMentions: 0,
          sentiment: 'NEUTRAL',
          status: 'NO_COMPLETED_RUNS'
        }
      });
    }

    console.log(`[GEO] Found ${completedRuns.length} completed runs for promptId: ${promptId}`);

    // Get all responses for completed runs
    const engineResults: EngineResult[] = [];
    for (const runData of completedRuns) {
      const responseData = await db.select()
        .from(responses)
        .where(eq(responses.runId, runData.Run.id));

      console.log(`[GEO] Response query for runId ${runData.Run.id}:`, {
        found: responseData.length > 0,
        responseId: responseData[0]?.id,
        textLength: responseData[0]?.responseText?.length || 0,
        hasHtml: !!responseData[0]?.responseHtml
      });

      if (responseData.length === 0) {
        console.warn(`[GEO] No response found for completed run ${runData.Run.id}`);
      }

      engineResults.push({
        engine: runData.AIEngine.name,
        engineId: runData.AIEngine.id,
        prompt: promptData[0].query,
        responseText: responseData[0]?.responseText || '',
        responseHtml: responseData[0]?.responseHtml || '',
        timestamp: runData.Run.finishedAt,
        success: runData.Run.status === 'COMPLETED',
        error: runData.Run.error || null
      });
    }

    // Get project info for brand/competitor details
    const project = userProjects.find(p => p.id === promptData[0].projectId);
    if (!project) {
      throw new Error('Project not found for prompt');
    }

    // Process results and calculate GEO score
    const brand = project.brandName;
    const competitorsList = await db.select()
      .from(competitors)
      .where(eq(competitors.projectId, project.id));
    const competitorNames = competitorsList.map(c => c.name);

    const { geoScore, brandMentions, competitorMentions } = await processResults(
      engineResults,
      brand,
      competitorNames
    );

    const scanResponse: ScanResponse = {
      engineResults,
      geoScore: geoScore.totalScore,
      brandMentions: brandMentions.length,
      competitorMentions: competitorMentions.length,
      sentiment: geoScore.details.sentimentScore > 60 ? 'POSITIVE' :
                 geoScore.details.sentimentScore < 40 ? 'NEGATIVE' : 'NEUTRAL'
    };

    console.log(`[GEO] Returning results for promptId: ${promptId}`, {
      geoScore: scanResponse.geoScore,
      brandMentions: scanResponse.brandMentions,
      competitorMentions: scanResponse.competitorMentions,
      sentiment: scanResponse.sentiment,
      engineCount: scanResponse.engineResults.length,
      engineResults: scanResponse.engineResults.map(e => ({
        engine: e.engine,
        success: e.success,
        textLength: e.responseText?.length || 0
      }))
    });

    res.json({
      success: true,
      data: scanResponse
    });
  } catch (error) {
    next(error);
  }
};

async function processResults(
  engineResults: EngineResult[],
  brand: string,
  competitors: string[]
): Promise<{
  geoScore: GEOScore;
  brandMentions: BrandMention[];
  competitorMentions: BrandMention[];
}> {
  const allBrandMentions: BrandMention[] = [];
  const allCompetitorMentions: BrandMention[] = [];
  let totalResponseLength = 0;

  console.log(`[GEO] Processing results for brand: ${brand}, competitors: ${competitors.join(', ')}`);

  // Process each engine's response
  for (const result of engineResults) {
    if (!result.success || !result.responseText) {
      console.warn(`[GEO] Skipping failed result from ${result.engine}: ${result.error}`);
      continue;
    }

    try {
      console.log(`[GEO] Processing ${result.engine} response (${result.responseText.length} chars)`);

      const extractor = new EntityExtractor();
      const competitorDetector = new CompetitorDetector();
      const positionDetector = new MentionPositionDetector();
      const sentimentAnalyzer = new SentimentAnalyzer();

      // Extract brand mentions
      const { brandMentions, competitorMentions } = extractor.extractBrandMentions(
        result.responseText,
        brand,
        competitors
      );

      console.log(`[GEO] Found ${brandMentions.length} brand mentions, ${competitorMentions.length} competitor mentions`);

      // Detect competitor mentions
      const additionalCompetitorMentions = competitorDetector.detectCompetitorMentions(
        result.responseText,
        competitors
      );

      // Combine competitor mentions (deduplicate)
      const combinedCompetitorMentions = [
        ...competitorMentions,
        ...additionalCompetitorMentions
      ].filter((mention, index, self) =>
        index === self.findIndex(m =>
          m.brand === mention.brand &&
          m.sentenceIndex === mention.sentenceIndex &&
          m.paragraphIndex === mention.paragraphIndex
        )
      );

      // Analyze sentiment for brand mentions
      for (const mention of brandMentions) {
        mention.sentiment = sentimentAnalyzer.analyzeSentiment(mention);
      }

      // Analyze sentiment for competitor mentions
      for (const mention of combinedCompetitorMentions) {
        mention.sentiment = sentimentAnalyzer.analyzeSentiment(mention);
      }

      // Analyze positions
      const positionedBrandMentions = positionDetector.analyzeMentionPositions(
        brandMentions,
        result.responseText.length
      );

      const positionedCompetitorMentions = positionDetector.analyzeMentionPositions(
        combinedCompetitorMentions,
        result.responseText.length
      );

      allBrandMentions.push(...positionedBrandMentions);
      allCompetitorMentions.push(...positionedCompetitorMentions);
      totalResponseLength += result.responseText.length;

      console.log(`[GEO] ${result.engine} processed successfully`);
    } catch (error) {
      console.error(`[GEO] Error processing ${result.engine}:`, error);
      // Continue processing other engines
    }
  }

  console.log(`[GEO] Total: ${allBrandMentions.length} brand mentions, ${allCompetitorMentions.length} competitor mentions`);

  // Calculate overall GEO score
  const calculator = new GEOCalculator();
  const geoScore = calculator.calculateScore(
    allBrandMentions,
    allCompetitorMentions,
    totalResponseLength
  );

  console.log(`[GEO] Final GEO Score: ${geoScore.totalScore}`);

  return {
    geoScore,
    brandMentions: allBrandMentions,
    competitorMentions: allCompetitorMentions
  };
}

export const getHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Implementation for getting historical data
    res.json({
      success: true,
      data: []
    });
  } catch (error) {
    next(error);
  }
};

export const getTrends = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Implementation for getting trends
    res.json({
      success: true,
      data: []
    });
  } catch (error) {
    next(error);
  }
};