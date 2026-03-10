import "dotenv/config";
import db from "./src/config/database.js";
import {
  citations,
  responses,
  runs,
  prompts,
  projects,
  competitors,
} from "./src/db/schema.js";
import { eq, desc } from "drizzle-orm";
import { parseResponse } from "./src/services/parser.service.js";

async function main() {
  console.log("Fetching ALL responses...");
  const recentResponses = await db.select().from(responses);

  console.log(`Found ${recentResponses.length} responses to re-parse.`);

  for (const response of recentResponses) {
    // Delete old citations for this response
    await db.delete(citations).where(eq(citations.responseId, response.id));

    const runRecord = (
      await db.select().from(runs).where(eq(runs.id, response.runId))
    )[0];
    if (!runRecord) continue;

    const promptRecord = (
      await db.select().from(prompts).where(eq(prompts.id, runRecord.promptId))
    )[0];
    if (!promptRecord) continue;

    const projectRecord = (
      await db
        .select()
        .from(projects)
        .where(eq(projects.id, promptRecord.projectId))
    )[0];
    if (!projectRecord) continue;

    const competitorsData = await db
      .select()
      .from(competitors)
      .where(eq(competitors.projectId, projectRecord.id));

    const competitorNames = competitorsData.map((c) => c.name);
    const competitorDomains = competitorsData.map((c) => c.domain);

    await parseResponse({
      responseId: response.id,
      responseText: response.responseText, // this in DB is already the Markdown format!
      brandName: projectRecord.brandName,
      domain: projectRecord.domain,
      competitorNames,
      competitorDomains,
    });
  }

  console.log("Finished re-parsing!");
  process.exit(0);
}

main().catch(console.error);
