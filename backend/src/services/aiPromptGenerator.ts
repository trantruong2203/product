/**
 * AI-Powered GEO Prompt Generator
 *
 * Uses OpenAI to generate 10 high-quality, contextually-aware search prompts
 * tailored specifically to the project's brand, domain, keywords, and competitors.
 *
 * Falls back to the template-based generator if AI call fails (no downtime risk).
 */

import OpenAI from "openai";
import {
  generateProjectPrompts,
  GeneratedPrompt,
  PromptGeneratorOptions,
} from "./promptGenerator.js";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface AIPromptGeneratorOptions extends PromptGeneratorOptions {
  /**
   * Brief description of the business / product to give AI more context.
   * Example: "We sell premium handmade leather wallets targeting professionals."
   */
  businessDescription?: string;
  /** Target market / country context. Default: 'global' */
  market?: string;
}

export interface AIGeneratedPrompt extends GeneratedPrompt {
  /** Indicates whether this prompt was created by AI or the template fallback */
  source: "ai" | "template";
}

// ─────────────────────────────────────────────────────────────────────────────
// OpenAI client (lazy-init to avoid crashing if key is missing)
// ─────────────────────────────────────────────────────────────────────────────

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  return new OpenAI({ apiKey });
}

// ─────────────────────────────────────────────────────────────────────────────
// System prompt
// ─────────────────────────────────────────────────────────────────────────────

function buildSystemPrompt(): string {
  return `You are a GEO (Generative Engine Optimization) expert.
Your job is to generate search queries that real users type into AI search engines
like ChatGPT, Perplexity, Gemini, and Claude to find products or brands.

Rules:
- Write queries in natural, conversational language (how a real person would ask an AI)
- PROMPT LANGUAGE: Use the EXACT language requested. If Vietnamese is requested, the queries MUST be in Vietnamese.
- MARKET CONTEXT: Use local nuances, slang, and search trends specific to the target market/country. 
- For Vietnamese market: Use phrases like "nên mua", "review thực tế", "so sánh", "chỗ nào bán giá tốt"...
- Each query must be distinct and cover a different intent
- Avoid repetition, filler words, and keyword stuffing
- Return ONLY a valid JSON array, no explanation`;
}

// ─────────────────────────────────────────────────────────────────────────────
// User prompt builder
// ─────────────────────────────────────────────────────────────────────────────

function buildUserPrompt(options: AIPromptGeneratorOptions): string {
  const {
    brandName,
    domain,
    keywords = [],
    competitors = [],
    language = "en",
    businessDescription,
    market = "global",
  } = options;

  const lang = language === "vi" ? "Vietnamese" : "English";
  const keywordStr =
    keywords.length > 0 ? keywords.join(", ") : "not specified";
  const competitorStr =
    competitors.length > 0 ? competitors.join(", ") : "not specified";
  const descStr = businessDescription
    ? `\nBusiness description: ${businessDescription}`
    : "";

  return `Generate exactly 10 search queries for a GEO visibility tracking project.

Project details:
- Brand name: ${brandName}
- Website: ${domain}
- Main keywords / products: ${keywordStr}
- Known competitors: ${competitorStr}
- Target market: ${market}
- STRICT LANGUAGE REQUIREMENT: ${lang}${descStr}

Required intent coverage (one query per slot):
1. Brand authority – e.g. "Is [brand] a good brand?" (Translate/adapt to ${lang})
2. Brand + primary keyword – commercial intent (How people search in ${market})
3. Brand + primary keyword – review / trust (Use natural local phrasing)
4. Comparison vs first competitor
5. Comparison vs second competitor
6. Buying guide – no brand mentioned
7. Problem-solving – specific pain point the product solves
8. Use-case specific – a concrete scenario
9. Best-in-category – no brand (measures organic AI visibility in ${market})
10. Purchase intent – where/how to buy (local stores or platforms in ${market})

Return a JSON array with exactly 10 objects. Each object must have:
{
  "slot": <number 1-10>,
  "query": "<the search query strictly in ${lang}>",
  "intent": "<one of: brand | commercial | informational | comparison | problem-solving>",
  "category": "<short label, e.g. brand-authority | brand-product | comparison | buying-guide | problem-solving | use-case | category-ranking | purchase-intent>"
}

Return ONLY the JSON array. No markdown, no explanation.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Parser
// ─────────────────────────────────────────────────────────────────────────────

interface RawAIPrompt {
  slot: number;
  query: string;
  intent: string;
  category: string;
}

const VALID_INTENTS = new Set([
  "brand",
  "commercial",
  "informational",
  "comparison",
  "problem-solving",
]);

function parseAIResponse(
  raw: string,
  language: string,
): AIGeneratedPrompt[] | null {
  try {
    // Strip potential markdown code fences
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/, "")
      .trim();

    const parsed: RawAIPrompt[] = JSON.parse(cleaned);

    if (!Array.isArray(parsed) || parsed.length === 0) return null;

    return parsed
      .slice(0, 10)
      .map((item, idx) => ({
        slot: item.slot ?? idx + 1,
        query: String(item.query ?? "").trim(),
        intent: VALID_INTENTS.has(item.intent)
          ? (item.intent as GeneratedPrompt["intent"])
          : "informational",
        category: String(item.category ?? "general").trim(),
        language,
        source: "ai" as const,
      }))
      .filter((p) => p.query.length > 0);
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate 10 AI-powered GEO prompts.
 * Automatically falls back to template generator if OpeAI call fails.
 */
export async function generateAIPrompts(
  options: AIPromptGeneratorOptions,
): Promise<AIGeneratedPrompt[]> {
  const language = options.language ?? "en";

  try {
    const client = getOpenAIClient();

    console.log(
      `[aiPromptGenerator] Calling OpenAI for brand="${options.brandName}"...`,
    );

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini", // Fast + cheap; upgrade to gpt-4o for higher quality
      temperature: 0.7,
      max_tokens: 1000,
      messages: [
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content: buildUserPrompt(options) },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? "";
    const prompts = parseAIResponse(raw, language);

    if (!prompts || prompts.length < 5) {
      console.warn(
        "[aiPromptGenerator] AI response invalid or too short — falling back to templates",
      );
      return templateFallback(options);
    }

    console.log(`[aiPromptGenerator] ✓ Generated ${prompts.length} AI prompts`);
    return prompts;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(
      `[aiPromptGenerator] OpenAI error: ${msg} — falling back to templates`,
    );
    return templateFallback(options);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Fallback
// ─────────────────────────────────────────────────────────────────────────────

function templateFallback(
  options: AIPromptGeneratorOptions,
): AIGeneratedPrompt[] {
  console.log("[aiPromptGenerator] Using template-based fallback");
  return generateProjectPrompts(options).map((p) => ({
    ...p,
    source: "template" as const,
  }));
}
