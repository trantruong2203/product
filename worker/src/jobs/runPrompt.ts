import { Job } from "bullmq";
import db from "../config/database.js";
import {
  runs,
  prompts,
  projects,
  competitors,
  responses,
  aiEngines,
} from "../db/schema.js";
import { eq } from "drizzle-orm";
import { getEngine } from "../engines/EngineFactory.js";
import { parseResponse } from "../services/parser.service.js";
import { htmlToMarkdown } from "../services/markdownConverter.js";
import { analyzeAndStoreSentiment } from "../services/sentiment.service.js";

export interface RunPromptJobData {
  runId: string;
  promptId: string;
  engineId: string;
  prompt: string;
  engineName: string;
}

export async function runPromptJob(job: Job<RunPromptJobData>): Promise<void> {
  let { runId, promptId, engineId, prompt, engineName } = job.data;

  console.log(`Processing run ${runId} for engine ${engineName || 'unknown'}`);

  try {
    // Get engineName from database if not provided in job data
    if (!engineName && engineId) {
      const engineData = await db
        .select({ name: aiEngines.name })
        .from(aiEngines)
        .where(eq(aiEngines.id, engineId))
        .limit(1);
      
      if (engineData.length > 0) {
        engineName = engineData[0].name;
        console.log(`[DEBUG] Fetched engineName from DB: ${engineName}`);
      }
    }

    if (!engineName) {
      throw new Error(`Cannot determine engineName for run ${runId}: missing in job data and engine lookup failed`);
    }

    await db
      .update(runs)
      .set({
        status: "RUNNING",
        startedAt: new Date(),
      })
      .where(eq(runs.id, runId));

    const engine = getEngine(engineName);
    await engine.initialize();

    const { text: responseText, html: responseHtml } =
      await engine.query(prompt);

    // Take screenshot after getting response
    console.log("📸 Taking screenshot...");
    const screenshot = await engine.takeScreenshot();

    // Convert raw HTML → clean Markdown (preserves Perplexity citations [1][2][3])
    const responseMarkdown =
      htmlToMarkdown(responseHtml, engineName) || responseText;

    console.log(
      `Got response for run ${runId}, markdown length: ${responseMarkdown.length}`,
    );

    const [response] = await db
      .insert(responses)
      .values({
        runId,
        responseText: responseMarkdown, // Markdown sạch cho Junior AI đọc
        responseHtml, // Raw HTML backup để debug
        screenshot, // Base64 screenshot
      })
      .returning();

    await db
      .update(runs)
      .set({
        status: "COMPLETED",
        finishedAt: new Date(),
      })
      .where(eq(runs.id, runId));

    const promptData = await db
      .select()
      .from(prompts)
      .where(eq(prompts.id, promptId));

    const promptRecord = promptData[0];
    console.log(`[DEBUG] promptRecord: ${promptRecord ? JSON.stringify({ id: promptRecord.id, projectId: promptRecord.projectId }) : 'null/undefined'}`);

    if (promptRecord) {
      console.log(`[DEBUG] Prompt found: ${promptRecord.id}, projectId: ${promptRecord.projectId}`);

      const projectData = await db
        .select()
        .from(projects)
        .where(eq(projects.id, promptRecord.projectId));

      const projectRecord = projectData[0];
      console.log(`[DEBUG] projectRecord: ${projectRecord ? JSON.stringify({ id: projectRecord.id, brandName: projectRecord.brandName }) : 'null/undefined'}`);

      if (projectRecord) {
        const competitorsData = await db
          .select()
          .from(competitors)
          .where(eq(competitors.projectId, projectRecord.id));

        const competitorNames = competitorsData.map(
          (c: { name: string }) => c.name,
        );
        const competitorDomains = competitorsData.map(
          (c: { domain: string }) => c.domain,
        );

        try {
          console.log(`[PARSER] Starting parseResponse for responseId: ${response.id}`);
          await parseResponse({
            responseId: response.id,
            responseText: responseMarkdown, // use Markdown which preserves newlines for position detection
            brandName: projectRecord.brandName,
            domain: projectRecord.domain,
            competitorNames,
            competitorDomains,
          });
          console.log(`[PARSER] parseResponse completed for responseId: ${response.id}`);
        } catch (parseError) {
          console.error(`[PARSER] Error parsing response ${response.id}:`, parseError);
          // Continue anyway - don't fail the whole job
        }

        try {
          console.log(`[SENTIMENT] Starting sentiment analysis for responseId: ${response.id}`);
          await analyzeAndStoreSentiment({
            responseId: response.id,
            text: responseMarkdown,
            modelVersion: "lexicon-v1",
          });
          console.log(`[SENTIMENT] Sentiment analysis completed for responseId: ${response.id}`);
        } catch (sentimentError) {
          console.error(`[SENTIMENT] Error analyzing sentiment for ${response.id}:`, sentimentError);
          // Continue anyway - don't fail the whole job
        }
      }
    }

    await engine.cleanup();
    console.log(`Completed run ${runId}`);
  } catch (error) {
    console.error(`Error processing run ${runId}:`, error);

    await db
      .update(runs)
      .set({
        status: "FAILED",
        finishedAt: new Date(),
        error: error instanceof Error ? error.message : "Unknown error",
      })
      .where(eq(runs.id, runId));

    throw error;
  }
}
