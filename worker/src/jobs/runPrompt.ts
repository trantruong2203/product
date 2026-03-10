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
import { getEngine } from "../engines/baseEngine.js";
import { parseResponse } from "../services/parser.service.js";

export interface RunPromptJobData {
  runId: string;
  promptId: string;
  engineId: string;
  prompt: string;
  engineName: string;
}

export async function runPromptJob(job: Job<RunPromptJobData>): Promise<void> {
  const { runId, promptId, prompt, engineName } = job.data;

  console.log(`Processing run ${runId} for engine ${engineName}`);

  try {
    await db
      .update(runs)
      .set({
        status: "RUNNING",
        startedAt: new Date(),
      })
      .where(eq(runs.id, runId));

    const promptData = await db
      .select()
      .from(prompts)
      .where(eq(prompts.id, promptId));

    const promptRecord = promptData[0];

    const projectRecord = promptRecord
      ? (
          await db
            .select()
            .from(projects)
            .where(eq(projects.id, promptRecord.projectId))
        )[0]
      : undefined;

    const engine = getEngine(engineName);
    await engine.initialize({
      country: projectRecord?.country,
      language: promptRecord?.language,
    });

    const responseText = await engine.query(prompt);
    console.log(
      `Got response for run ${runId}, length: ${responseText.length}`,
    );

    const [response] = await db
      .insert(responses)
      .values({
        runId,
        responseText,
        responseHtml: "",
      })
      .returning();

    await db
      .update(runs)
      .set({
        status: "COMPLETED",
        finishedAt: new Date(),
      })
      .where(eq(runs.id, runId));

    if (promptRecord && projectRecord) {
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

      await parseResponse({
        responseId: response.id,
        responseText,
        brandName: projectRecord.brandName,
        domain: projectRecord.domain,
        competitorNames,
        competitorDomains,
      });
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
