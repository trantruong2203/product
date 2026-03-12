import db, { responseAnalysis } from "../config/database.js";

export type Sentiment = "POSITIVE" | "NEUTRAL" | "NEGATIVE";

export interface AnalyzeSentimentInput {
  responseId: string;
  text: string;
  modelVersion?: string;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function scoreText(text: string): { sentiment: Sentiment; sentimentScore: number; narrativeTags: string[] } {
  const normalized = text.toLowerCase();

  const positiveLexicon = [
    "best",
    "excellent",
    "great",
    "strong",
    "trusted",
    "leader",
    "recommended",
    "high quality",
    "affordable",
    "specialist",
  ];

  const negativeLexicon = [
    "worst",
    "bad",
    "weak",
    "poor",
    "expensive",
    "unreliable",
    "avoid",
    "limited",
    "outdated",
  ];

  const narrativeCandidates: Array<{ tag: string; pattern: RegExp }> = [
    { tag: "affordable", pattern: /\baffordable|budget|low cost\b/i },
    { tag: "high-end", pattern: /\bhigh[- ]?end|premium|enterprise\b/i },
    { tag: "ai-specialist", pattern: /\bai specialist|ai-focused|automation expert\b/i },
    { tag: "trusted", pattern: /\btrusted|reliable|credible\b/i },
  ];

  const positiveHits = positiveLexicon.filter((w) => normalized.includes(w)).length;
  const negativeHits = negativeLexicon.filter((w) => normalized.includes(w)).length;

  const raw = positiveHits - negativeHits;
  const sentimentScore = clamp(raw / 5, -1, 1);

  const sentiment: Sentiment =
    sentimentScore > 0.2 ? "POSITIVE" : sentimentScore < -0.2 ? "NEGATIVE" : "NEUTRAL";

  const narrativeTags = narrativeCandidates
    .filter((c) => c.pattern.test(text))
    .map((c) => c.tag);

  return { sentiment, sentimentScore, narrativeTags };
}

export async function analyzeAndStoreSentiment(input: AnalyzeSentimentInput): Promise<void> {
  const { responseId, text, modelVersion } = input;

  const { sentiment, sentimentScore, narrativeTags } = scoreText(text);

  await db.insert(responseAnalysis).values({
    responseId,
    sentiment,
    sentimentScore,
    narrativeTags,
    modelVersion: modelVersion ?? "lexicon-v1",
  });
}
