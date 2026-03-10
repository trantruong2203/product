import db, {
  runs,
  responses,
  prompts,
  projects,
  competitors,
} from "../db/index.js";
import { eq } from "drizzle-orm";
import { addParseResponseJob } from "./queue.service.js";

interface RunPromptJobData {
  runId: string;
  promptId: string;
  engineId: string;
  prompt: string;
  engineName: string;
}

export async function processRunPromptJob(data: RunPromptJobData) {
  const { runId, promptId, engineId, prompt, engineName } = data;

  try {
    console.log(
      `Processing run ${runId} for prompt: "${prompt}" with engine: ${engineName}`,
    );

    await db
      .update(runs)
      .set({ status: "RUNNING", startedAt: new Date() })
      .where(eq(runs.id, runId));

    const promptData = await db
      .select()
      .from(prompts)
      .innerJoin(projects, eq(prompts.projectId, projects.id))
      .where(eq(prompts.id, promptId));

    if (promptData.length === 0) {
      throw new Error("Prompt not found");
    }

    const promptRecord = promptData[0];
    const projectDomain = promptRecord.Project.domain;
    const brandName = promptRecord.Project.brandName;

    const competitorData = await db
      .select()
      .from(competitors)
      .where(eq(competitors.projectId, promptRecord.Prompt.projectId));

    const competitorNames = competitorData.map((c) => c.name);
    const competitorDomains = competitorData.map((c) => c.domain);

    const responseText = await callAIEngine(
      engineName,
      prompt,
      projectDomain,
      brandName,
      competitorNames,
      competitorDomains,
    );

    const [response] = await db
      .insert(responses)
      .values({
        runId,
        responseText,
      })
      .returning();

    await db
      .update(runs)
      .set({ status: "COMPLETED", finishedAt: new Date() })
      .where(eq(runs.id, runId));

    await addParseResponseJob({
      responseId: response.id,
      responseText,
      brandName,
      domain: projectDomain,
      competitorNames,
      competitorDomains,
    });

    console.log(`Run ${runId} completed successfully`);
  } catch (error: any) {
    console.error(`Run ${runId} failed:`, error.message);

    await db
      .update(runs)
      .set({ status: "FAILED", finishedAt: new Date(), error: error.message })
      .where(eq(runs.id, runId));

    throw error;
  }
}

async function callAIEngine(
  engineName: string,
  query: string,
  domain: string,
  brandName: string,
  competitorNames: string[],
  competitorDomains: string[],
): Promise<string> {
  const competitorsContext =
    competitorNames.length > 0
      ? `\n\nCompetitors to analyze: ${competitorNames.map((name, i) => `${name} (${competitorDomains[i]})`).join(", ")}`
      : "";

  const fullPrompt = `You are analyzing AI search visibility for ${brandName} (${domain}).${competitorsContext}

Query: "${query}"

Please provide a detailed response about how ${brandName} appears in AI search results for this query. Include:
1. Whether ${brandName} is mentioned
2. The context and sentiment of any mentions
3. How it compares to competitors
4. Any citations or sources referenced`;

  const engineUrl = getEngineUrl(engineName);
  const apiKey = getEngineApiKey(engineName);

  if (!apiKey) {
    throw new Error(`Missing API key for engine: ${engineName}`);
  }

  const response = await fetch(engineUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: getEngineModel(engineName),
      messages: [{ role: "user", content: fullPrompt }],
      temperature: 0.7,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `AI engine API error: ${response.status} ${response.statusText}`,
    );
  }

  const data = await response.json() as {
    choices?: Array<{ message: { content: string } }>;
  };

  if (data.choices && data.choices.length > 0) {
    return data.choices[0].message.content;
  }

  return JSON.stringify(data);
}

function getEngineUrl(engineName: string): string {
  const urls: Record<string, string> = {
    openai: "https://api.openai.com/v1/chat/completions",
    anthropic: "https://api.anthropic.com/v1/messages",
    google:
      "https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent",
    xai: "https://api.x.ai/v1/chat/completions",
  };
  return urls[engineName.toLowerCase()] || urls["openai"];
}

function getEngineApiKey(engineName: string): string {
  const envKeys: Record<string, string> = {
    openai: process.env.OPENAI_API_KEY || "",
    anthropic: process.env.ANTHROPIC_API_KEY || "",
    google: process.env.GOOGLE_API_KEY || "",
    xai: process.env.XAI_API_KEY || "",
  };
  return envKeys[engineName.toLowerCase()] || "";
}

function getEngineModel(engineName: string): string {
  const models: Record<string, string> = {
    openai: "gpt-4o",
    anthropic: "claude-3-5-sonnet-20241022",
    google: "gemini-pro",
    xai: "grok-2",
  };
  return models[engineName.toLowerCase()] || "gpt-4o";
}
