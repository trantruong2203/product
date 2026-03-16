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

  // FIX #10: Expanded lexicon (50+ words instead of 19)
  const positiveLexicon = [
    // Quality & Excellence
    "best", "excellent", "great", "outstanding", "exceptional", "superb", "fantastic",
    "amazing", "wonderful", "perfect", "superior", "premium", "top-tier", "world-class",
    // Trust & Reliability
    "trusted", "reliable", "credible", "dependable", "stable", "secure", "proven",
    "established", "reputable", "authentic",
    // Leadership & Recommendation
    "leader", "leading", "recommended", "recommended", "popular", "preferred", "dominant",
    "market leader", "industry leader",
    // Quality & Value
    "high quality", "quality", "excellent quality", "good value", "affordable", "cost-effective",
    "efficient", "effective", "powerful", "robust", "innovative", "cutting-edge",
    // Expertise
    "specialist", "expert", "professional", "skilled", "experienced", "knowledgeable",
    "authoritative", "comprehensive",
  ];

  const negativeLexicon = [
    // Poor Quality
    "worst", "bad", "terrible", "awful", "horrible", "poor", "mediocre", "subpar",
    "inferior", "weak", "inadequate", "insufficient",
    // Unreliability
    "unreliable", "unstable", "buggy", "broken", "faulty", "defective", "problematic",
    "inconsistent", "unpredictable",
    // Avoidance & Criticism
    "avoid", "avoid", "don't use", "not recommended", "skip", "overpriced", "expensive",
    "costly", "limited", "outdated", "obsolete", "deprecated", "abandoned",
    // Negative Sentiment
    "disappointing", "frustrating", "confusing", "complicated", "difficult", "slow",
    "sluggish", "laggy", "crash", "error", "fail", "failure",
  ];

  const narrativeCandidates: Array<{ tag: string; pattern: RegExp }> = [
    { tag: "affordable", pattern: /\baffordable|budget|low cost|cheap|economical\b/i },
    { tag: "high-end", pattern: /\bhigh[- ]?end|premium|enterprise|luxury|expensive\b/i },
    { tag: "ai-specialist", pattern: /\bai specialist|ai-focused|automation expert|ai-powered|machine learning\b/i },
    { tag: "trusted", pattern: /\btrusted|reliable|credible|dependable|secure\b/i },
    { tag: "innovative", pattern: /\binnovative|cutting-edge|modern|advanced|next-generation\b/i },
    { tag: "user-friendly", pattern: /\buser-friendly|easy to use|intuitive|simple|straightforward\b/i },
  ];

  // FIX #10: Add negation handling
  // Convert negations to flip sentiment
  const negationPatterns = [
    { pattern: /\bnot\s+(\w+)/gi, flip: true },
    { pattern: /\bno\s+(\w+)/gi, flip: true },
    { pattern: /\bdon't\s+(\w+)/gi, flip: true },
    { pattern: /\bdoesn't\s+(\w+)/gi, flip: true },
    { pattern: /\bcan't\s+(\w+)/gi, flip: true },
    { pattern: /\bwon't\s+(\w+)/gi, flip: true },
    { pattern: /\bfail(?:s|ed)?\s+to\s+(\w+)/gi, flip: true },
  ];

  let positiveHits = 0;
  let negativeHits = 0;

  // Count positive words with negation handling
  for (const word of positiveLexicon) {
    const regex = new RegExp(`\\b${word}\\b`, "gi");
    const matches = normalized.match(regex) || [];

    for (const match of matches) {
      // Check if this word is negated
      const wordIndex = normalized.indexOf(match.toLowerCase());
      const contextBefore = normalized.substring(Math.max(0, wordIndex - 50), wordIndex);

      const isNegated = /\b(not|no|don't|doesn't|can't|won't|fails?\s+to)\s*$/.test(contextBefore);

      if (isNegated) {
        negativeHits++;
      } else {
        positiveHits++;
      }
    }
  }

  // Count negative words with negation handling
  for (const word of negativeLexicon) {
    const regex = new RegExp(`\\b${word}\\b`, "gi");
    const matches = normalized.match(regex) || [];

    for (const match of matches) {
      // Check if this word is negated
      const wordIndex = normalized.indexOf(match.toLowerCase());
      const contextBefore = normalized.substring(Math.max(0, wordIndex - 50), wordIndex);

      const isNegated = /\b(not|no|don't|doesn't|can't|won't|fails?\s+to)\s*$/.test(contextBefore);

      if (isNegated) {
        positiveHits++;
      } else {
        negativeHits++;
      }
    }
  }

  // FIX #10: Better scoring formula
  // Use weighted average instead of arbitrary division by 5
  const totalHits = positiveHits + negativeHits;
  let sentimentScore: number;

  if (totalHits === 0) {
    sentimentScore = 0; // Neutral if no sentiment words found
  } else {
    // Score ranges from -1 (all negative) to +1 (all positive)
    sentimentScore = (positiveHits - negativeHits) / totalHits;
  }

  sentimentScore = clamp(sentimentScore, -1, 1);

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
