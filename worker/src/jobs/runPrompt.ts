import { Job } from "bullmq";
import db from "../config/database.js";
import {
  runs,
  prompts,
  projects,
  competitors,
  responses,
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
  const { runId, promptId, engineId, prompt, engineName } = job.data;

  console.log(`Processing run ${runId} for engine ${engineName}`);

  try {
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

    if (promptRecord) {
      const projectData = await db
        .select()
        .from(projects)
        .where(eq(projects.id, promptRecord.projectId));

      const projectRecord = projectData[0];

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
