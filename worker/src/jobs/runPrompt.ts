import { Job } from "bullmq";
import db, { runs, prompts, projects, competitors, responses, citations, responseAnalysis } from "../config/database.js";
import { eq } from "drizzle-orm";
import { getEngine } from "../engines/EngineFactory.js";
import { htmlToMarkdown } from "../services/markdownConverter.js";
import {
  detectBrandMentions,
  detectCompetitorMentions,
  extractCitations,
  validateCitations,
  analyzeSentiment,
  calculateGeoScore,
  normalizeHostname,
  type Mention,
  type CompetitorMention,
  type Citation,
} from "../utils/parser.js";

export interface RunPromptJobData {
  runId: string;
  promptId: string;
  engineId: string;
  prompt: string;
  engineName: string;
}

interface BrandContext {
  name: string;
  domain: string;
  isMain: boolean;
}

function parseHostname(url: string | null): string | null {
  if (!url) return null;
  try {
    return normalizeHostname(new URL(url).hostname);
  } catch {
    return null;
  }
}

function extractUrls(text: string): string[] {
  const matches = text.match(/https?:\/\/[^\s)\]]+/gi) || [];
  const unique = new Set(matches.map((u) => u.replace(/[.,;!?]+$/, "")));
  return [...unique];
}

function detectSourceType(
  hostname: string | null,
  ownDomain: string,
  competitorDomains: string[],
): "OWN" | "COMPETITOR" | "THIRD_PARTY" | null {
  if (!hostname) return null;
  const own = normalizeHostname(ownDomain);
  if (hostname.includes(own) || own.includes(hostname)) return "OWN";

  const isCompetitor = competitorDomains
    .filter(Boolean)
    .map(normalizeHostname)
    .some((d) => d && (hostname.includes(d) || d.includes(hostname)));

  return isCompetitor ? "COMPETITOR" : "THIRD_PARTY";
}

function resolveBrandForUrl(
  hostname: string | null,
  brandName: string,
  ownDomain: string,
  competitorNames: string[],
  competitorDomains: string[],
): string | null {
  if (!hostname) return null;
  const own = normalizeHostname(ownDomain);
  if (hostname.includes(own) || own.includes(hostname)) return brandName;

  const competitorIndex = competitorDomains
    .map((d) => normalizeHostname(d || ""))
    .findIndex((d) => d && (hostname.includes(d) || d.includes(hostname)));

  return competitorIndex >= 0 ? competitorNames[competitorIndex] || hostname : hostname;
}

async function storeAndAnalyze(params: {
  runId: string;
  promptId: string;
  responseText: string;
  html: string;
  brandName: string;
  domain: string;
  competitorNames: string[];
  competitorDomains: string[];
}): Promise<void> {
  const { runId, promptId, responseText, html, brandName, domain, competitorNames, competitorDomains } = params;

  // Detect brand mentions
  const allBrands: BrandContext[] = [
    { name: brandName, domain, isMain: true },
    ...competitorNames.map((name, idx) => ({
      name,
      domain: competitorDomains[idx] || "",
      isMain: false,
    })),
  ];

  const brandMentions: Mention[] = [];
  const competitorMentions: CompetitorMention[] = [];

  for (const brand of allBrands) {
    const mentions = detectBrandMentions(responseText, brand.name, brand.domain);
    for (const mention of mentions) {
      if (brand.isMain) {
        brandMentions.push(mention);
      } else {
        competitorMentions.push({
          name: brand.name,
          domain: brand.domain,
          position: mention.position,
          context: mention.context,
        });
      }
    }
  }

  // Extract and validate citations
  const rawCitations = extractCitations(responseText);
  const validatedResults = rawCitations.length > 0 ? await validateCitations(rawCitations) : [];

  const validCitations = validatedResults.filter((r) => r.isValid).length;

  // Build citation rows
  const citationRows: Array<typeof citations.$inferInsert> = [];
  const urls = extractUrls(responseText);

  for (const url of urls) {
    const hostname = parseHostname(url);
    const sourceType = detectSourceType(hostname, domain, competitorDomains);
    const linkedBrandName = resolveBrandForUrl(hostname, brandName, domain, competitorNames, competitorDomains);

    const isMentioned = rawCitations.some((c) => c.url === url);
    const validation = validatedResults.find((v) => v.url === url);

    citationRows.push({
      responseId: runId,
      brand: linkedBrandName ?? brandName,
      domain: hostname ?? null,
      url,
      hostname,
      path: url ? new URL(url).pathname : null,
      sourceType: sourceType ?? "THIRD_PARTY",
      mentionedBrand: isMentioned,
      mentionedBrandName: isMentioned ? linkedBrandName ?? brandName : null,
      mentionedBrandIsPrimary: isMentioned && linkedBrandName === brandName,
      linkedBrandName,
      linkedBrandType: sourceType ?? "THIRD_PARTY",
      position: null,
      confidence: isMentioned ? 1.0 : 0.6,
      isValid: validation?.isValid ?? false,
      httpStatus: validation?.httpStatus ?? null,
      context: null,
    });
  }

  // Sentiment analysis
  const sentimentResult = analyzeSentiment(responseText);

  // GEO score calculation
  const geoScore = calculateGeoScore({
    brandMentions,
    competitorMentions,
    citations: rawCitations,
    validCitations,
    text: responseText,
    sentimentScore: sentimentResult.sentimentScore,
  });

  // Store response with metrics
  await db.insert(responses).values({
    runId,
    responseText,
    responseHtml: html,
    screenshot: null,
    brandMentionCount: brandMentions.length,
    citationCount: citationRows.length,
    validCitationCount: validCitations,
    geoScore: geoScore.score,
  });

  // Store citations
  if (citationRows.length > 0) {
    await db.insert(citations).values(citationRows);
  }

  // Store sentiment analysis
  await db.insert(responseAnalysis).values({
    responseId: runId,
    sentiment: sentimentResult.sentiment,
    sentimentScore: sentimentResult.sentimentScore,
    narrativeTags: sentimentResult.narrativeTags,
    modelVersion: "lexicon-v1",
  });

  console.log(`[GEO] Response ${runId}: brand=${brandMentions.length}, citations=${citationRows.length}, valid=${validCitations}, geo=${geoScore.score}`);
}

export async function runPromptJob(job: Job<RunPromptJobData>): Promise<void> {
  let { runId, promptId, engineId, prompt, engineName } = job.data;

  console.log(`Processing run ${runId} for engine ${engineName || 'unknown'}`);

  try {
    // Get engineName from database if not provided
    if (!engineName && engineId) {
      const engineData = await db
        .select({ name: (await import("../db/schema.js")).aiEngines.name })
        .from((await import("../db/schema.js")).aiEngines)
        .where(eq((await import("../db/schema.js")).aiEngines.id, engineId))
        .limit(1);

      if (engineData.length > 0) {
        engineName = engineData[0].name;
      }
    }

    if (!engineName) {
      throw new Error(`Cannot determine engineName for run ${runId}`);
    }

    // Update run status
    await db
      .update(runs)
      .set({
        status: "RUNNING",
        startedAt: new Date(),
      })
      .where(eq(runs.id, runId));

    // Execute query
    const engine = getEngine(engineName);
    await engine.initialize();

    const { text: responseText, html: responseHtml } = await engine.query(prompt);

    // Convert to markdown
    const responseMarkdown = htmlToMarkdown(responseHtml, engineName) || responseText;

    console.log(`Got response for run ${runId}, length: ${responseMarkdown.length}`);

    // Get project context for analysis
    const promptData = await db.select().from(prompts).where(eq(prompts.id, promptId));
    const promptRecord = promptData[0];

    if (promptRecord) {
      const projectData = await db.select().from(projects).where(eq(projects.id, promptRecord.projectId));
      const projectRecord = projectData[0];

      if (projectRecord) {
        const competitorsData = await db.select().from(competitors).where(eq(competitors.projectId, projectRecord.id));

        const competitorNames = competitorsData.map((c: { name: string }) => c.name);
        const competitorDomains = competitorsData.map((c: { domain: string }) => c.domain);

        await storeAndAnalyze({
          runId,
          promptId,
          responseText: responseMarkdown,
          html: responseHtml,
          brandName: projectRecord.brandName,
          domain: projectRecord.domain,
          competitorNames,
          competitorDomains,
        });
      }
    }

    // Cleanup
    await engine.cleanup();

    // Update run status
    await db
      .update(runs)
      .set({
        status: "COMPLETED",
        finishedAt: new Date(),
      })
      .where(eq(runs.id, runId));

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
