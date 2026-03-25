/**
 * Unified Parser Utilities for GEO Scoring
 * Consolidated from parser.service.ts and sentiment.service.ts
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface Mention {
  position: number | null;
  confidence: number;
  context: string;
  contextLines?: string[];
}

export interface Citation {
  url: string;
  position: number;
  brandName: string;
  domain: string;
  isValid?: boolean;
  httpStatus?: number;
}

export interface CompetitorMention {
  name: string;
  domain: string;
  position: number | null;
  context: string;
}

export type Sentiment = "POSITIVE" | "NEUTRAL" | "NEGATIVE";

export interface SentimentResult {
  sentiment: Sentiment;
  sentimentScore: number;
  narrativeTags: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Text Normalization
// ─────────────────────────────────────────────────────────────────────────────

export function normalizeText(text: string): string {
  return (
    text
      .replace(/\r/g, "")
      .replace(/\t/g, " ")
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .replace(/\s+/g, " ")
      .toLowerCase()
      .trim()
  );
}

export function normalizeHostname(value: string): string {
  return value.toLowerCase().replace(/^www\./, "");
}

// ─────────────────────────────────────────────────────────────────────────────
// Brand Mention Detection
// ─────────────────────────────────────────────────────────────────────────────

export function detectBrandMentions(
  text: string,
  brandName: string,
  domain: string,
): Mention[] {
  const mentions: Mention[] = [];

  const rawText = text.replace(/\r/g, "");
  const originalLines = rawText.split("\n");
  const brand = normalizeText(brandName);

  const brandWords = brand.split(" ").filter((w) => w.length > 2);
  const rankings = extractRankings(rawText);

  for (let i = 0; i < originalLines.length; i++) {
    const origLine = originalLines[i];
    const line = normalizeText(origLine);
    if (!line) continue;

    const hasBrandMatch = matchesBrand(line, brand, brandWords);
    const hasDomainMatch = domain ? line.includes(normalizeText(domain)) : false;

    if (!hasBrandMatch && !hasDomainMatch) continue;

    const rankingMatch = rankings.find((r) => line.includes(normalizeText(r.name)));

    let position: number | null = null;

    if (rankingMatch) {
      position = rankingMatch.position;
    } else {
      position = inferPositionFromContext(originalLines, i);
    }

    const confidence = calculateConfidence(line, brand, brandWords);
    if (confidence === 0) continue;

    mentions.push({
      position,
      confidence,
      context: origLine,
      contextLines: extractContextLines(originalLines, i, 2),
    });
  }

  return mentions;
}

// ─────────────────────────────────────────────────────────────────────────────
// Ranking Extraction
// ─────────────────────────────────────────────────────────────────────────────

export function extractRankings(
  text: string,
): Array<{ position: number; name: string }> {
  const rankings: Array<{ position: number; name: string }> = [];
  const numberedPattern =
    /^(?:#+\s*)?\[?(\d+)[.)\]\uFE0F\u20E3]*\s+(?:[*_]+)?([^\n*_:\-\[]+)/gm;

  let match: RegExpExecArray | null;
  while ((match = numberedPattern.exec(text)) !== null) {
    const pos = parseInt(match[1], 10);
    if (pos <= 20) {
      rankings.push({ position: pos, name: match[2].trim() });
    }
  }

  return rankings;
}

// ─────────────────────────────────────────────────────────────────────────────
// Position Inference
// ─────────────────────────────────────────────────────────────────────────────

function inferPositionFromContext(
  lines: string[],
  index: number,
): number | null {
  for (let offset = -1; offset <= 1; offset++) {
    const targetLine = lines[index + offset];
    if (!targetLine) continue;
    const match = targetLine.match(
      /^\s*(?:#+\s*)?\[?(\d+)[.)\]\uFE0F\u20E3]*\s/,
    );
    if (match) return parseInt(match[1], 10);
  }

  const implicitPosition = detectImplicitRanking(lines, index);
  if (implicitPosition !== null) return implicitPosition;

  return null;
}

function detectImplicitRanking(lines: string[], index: number): number | null {
  for (let offset = -1; offset <= 1; offset++) {
    const targetLine = lines[index + offset];
    if (!targetLine) continue;

    const normalized = normalizeText(targetLine);

    const ordinalMatch = normalized.match(
      /\b(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)\b/i,
    );
    if (ordinalMatch) {
      const ordinalMap: Record<string, number> = {
        first: 1, second: 2, third: 3, fourth: 4, fifth: 5,
        sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10,
      };
      return ordinalMap[ordinalMatch[1].toLowerCase()] || null;
    }

    if (/\b(best|top|leading|most recommended|premier|superior)\b/i.test(normalized)) {
      return 1;
    }

    if (/\b(second best|runner up|alternative|next best)\b/i.test(normalized)) {
      return 2;
    }
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Brand Matching (Word Boundary)
// ─────────────────────────────────────────────────────────────────────────────

function wordBoundaryRegex(word: string): RegExp {
  const escaped = escapeRegex(word);
  return new RegExp(`(?<!\\p{L})${escaped}(?!\\p{L})`, "iu");
}

function matchesBrand(
  line: string,
  brand: string,
  brandWords: string[],
): boolean {
  if (wordBoundaryRegex(brand).test(line)) return true;
  if (brandWords.length > 1) {
    return brandWords.every((w) => wordBoundaryRegex(w).test(line));
  }
  return false;
}

function calculateConfidence(
  line: string,
  brand: string,
  brandWords: string[],
): number {
  if (wordBoundaryRegex(brand).test(line)) return 1.0;

  const significantWords = brandWords.filter((w) => w.length > 3);
  if (significantWords.length === 0) return 0.0;

  const matchedWords = significantWords.filter((w) =>
    wordBoundaryRegex(w).test(line),
  );

  if (matchedWords.length === significantWords.length) return 0.85;
  if (matchedWords.length > 0) return 0.6;

  return 0.0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Competitor Detection
// ─────────────────────────────────────────────────────────────────────────────

export function detectCompetitorMentions(
  text: string,
  competitors: Array<{ name: string; domain: string }>,
): CompetitorMention[] {
  const mentions: CompetitorMention[] = [];
  const lines = text.split("\n");

  for (const competitor of competitors) {
    const competitorMentions = detectBrandMentions(
      text,
      competitor.name,
      competitor.domain,
    );

    for (const mention of competitorMentions) {
      mentions.push({
        name: competitor.name,
        domain: competitor.domain,
        position: mention.position,
        context: mention.context,
      });
    }
  }

  return mentions;
}

// ─────────────────────────────────────────────────────────────────────────────
// Citation Extraction
// ─────────────────────────────────────────────────────────────────────────────

export function extractCitations(text: string): Citation[] {
  const urls = extractUrls(text);
  const rankings = extractRankings(text);

  return urls.map((url, idx) => ({
    url,
    position: rankings[idx]?.position ?? idx + 1,
    brandName: "",
    domain: parseHostname(url) || "",
  }));
}

function extractUrls(text: string): string[] {
  const matches = text.match(/https?:\/\/[^\s)\]]+/gi) || [];
  const unique = new Set(matches.map((u) => u.replace(/[.,;!?]+$/, "")));
  return [...unique];
}

function parseHostname(url: string | null): string | null {
  if (!url) return null;
  try {
    return normalizeHostname(new URL(url).hostname);
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Citation Validation
// ─────────────────────────────────────────────────────────────────────────────

export interface ValidationResult {
  url: string;
  isValid: boolean;
  httpStatus: number | null;
  isRedirected: boolean;
  finalUrl: string | null;
}

const MAX_CONCURRENT = 5;

export async function validateCitations(
  citations: Citation[],
): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];
  const semaphore = { permits: MAX_CONCURRENT, queue: [] as (() => void)[] };

  const acquire = async () => {
    if (semaphore.permits > 0) {
      semaphore.permits--;
      return;
    }
    return new Promise<void>((resolve) => {
      semaphore.queue.push(resolve);
    });
  };

  const release = () => {
    semaphore.permits++;
    const next = semaphore.queue.shift();
    if (next) {
      semaphore.permits--;
      next();
    }
  };

  const validate = async (citation: Citation): Promise<ValidationResult> => {
    await acquire();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);

      let httpStatus: number | null = null;
      let isValid = false;
      let finalUrl: string | null = null;

      try {
        const res = await fetch(citation.url, {
          method: "HEAD",
          signal: controller.signal,
          redirect: "follow",
        });
        httpStatus = res.status;
        isValid = res.ok;
        finalUrl = res.url;
      } catch {
        isValid = false;
      }

      clearTimeout(timer);

      return {
        url: citation.url,
        isValid,
        httpStatus,
        isRedirected: finalUrl !== citation.url,
        finalUrl,
      };
    } finally {
      release();
    }
  };

  // Process in batches
  const BATCH_SIZE = 10;
  for (let i = 0; i < citations.length; i += BATCH_SIZE) {
    const batch = citations.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(batch.map(validate));
    results.push(...batchResults);
  }

  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// Brand Density Calculation
// ─────────────────────────────────────────────────────────────────────────────

export function calculateBrandDensity(text: string, brandName: string): number {
  const normalizedText = normalizeText(text);
  const normalizedBrand = normalizeText(brandName);
  const brandWords = normalizedBrand.split(" ").filter((w) => w.length > 2);

  if (brandWords.length === 0) return 0;

  let matches = 0;
  for (const word of brandWords) {
    const regex = new RegExp(`(?<!\\p{L})${escapeRegex(word)}(?!\\p{L})`, "iu");
    const found = (normalizedText.match(regex) || []).length;
    matches += found;
  }

  const wordCount = normalizedText.split(/\s+/).length;
  return wordCount > 0 ? matches / wordCount : 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sentiment Analysis
// ─────────────────────────────────────────────────────────────────────────────

export function analyzeSentiment(text: string): SentimentResult {
  const normalized = text.toLowerCase();

  const positiveLexicon = [
    "best", "excellent", "great", "outstanding", "exceptional", "superb",
    "fantastic", "amazing", "wonderful", "perfect", "superior", "premium",
    "trusted", "reliable", "credible", "leader", "leading", "recommended",
    "popular", "preferred", "high quality", "quality", "affordable",
    "efficient", "effective", "powerful", "innovative", "expert",
    "professional", "authoritative",
  ];

  const negativeLexicon = [
    "worst", "bad", "terrible", "awful", "horrible", "poor", "mediocre",
    "subpar", "inferior", "unreliable", "unstable", "buggy", "broken",
    "avoid", "not recommended", "overpriced", "expensive", "limited",
    "outdated", "obsolete", "disappointing", "confusing", "difficult",
    "slow", "fail", "failure",
  ];

  const narrativeCandidates = [
    { tag: "affordable", pattern: /\baffordable|budget|low cost|cheap\b/i },
    { tag: "high-end", pattern: /\bhigh[- ]?end|premium|enterprise|luxury\b/i },
    { tag: "ai-specialist", pattern: /\bai specialist|ai-focused|automation\b/i },
    { tag: "trusted", pattern: /\btrusted|reliable|credible|dependable\b/i },
    { tag: "innovative", pattern: /\binnovative|cutting-edge|modern|advanced\b/i },
    { tag: "user-friendly", pattern: /\buser-friendly|easy to use|intuitive\b/i },
  ];

  let positiveHits = 0;
  let negativeHits = 0;

  for (const word of positiveLexicon) {
    const regex = new RegExp(`\\b${escapeRegex(word)}\\b`, "gi");
    const matches = normalized.match(regex) || [];

    for (const match of matches) {
      const wordIndex = normalized.indexOf(match.toLowerCase());
      const contextBefore = normalized.substring(Math.max(0, wordIndex - 50), wordIndex);
      const isNegated = /\b(not|no|don't|doesn't|can't|won't|fails?\s+to)\s*$/.test(contextBefore);

      if (isNegated) negativeHits++;
      else positiveHits++;
    }
  }

  for (const word of negativeLexicon) {
    const regex = new RegExp(`\\b${escapeRegex(word)}\\b`, "gi");
    const matches = normalized.match(regex) || [];

    for (const match of matches) {
      const wordIndex = normalized.indexOf(match.toLowerCase());
      const contextBefore = normalized.substring(Math.max(0, wordIndex - 50), wordIndex);
      const isNegated = /\b(not|no|don't|doesn't|can't|won't|fails?\s+to)\s*$/.test(contextBefore);

      if (isNegated) positiveHits++;
      else negativeHits++;
    }
  }

  const totalHits = positiveHits + negativeHits;
  let sentimentScore: number;

  if (totalHits === 0) {
    sentimentScore = 0;
  } else {
    sentimentScore = (positiveHits - negativeHits) / totalHits;
  }

  sentimentScore = Math.max(-1, Math.min(1, sentimentScore));

  const sentiment: Sentiment =
    sentimentScore > 0.2 ? "POSITIVE" :
    sentimentScore < -0.2 ? "NEGATIVE" : "NEUTRAL";

  const narrativeTags = narrativeCandidates
    .filter((c) => c.pattern.test(text))
    .map((c) => c.tag);

  return { sentiment, sentimentScore, narrativeTags };
}

// ─────────────────────────────────────────────────────────────────────────────
// GEO Score Calculation
// ─────────────────────────────────────────────────────────────────────────────

export interface GeoScoreInput {
  brandMentions: Mention[];
  competitorMentions: CompetitorMention[];
  citations: Citation[];
  validCitations: number;
  text: string;
  sentimentScore: number;
}

export interface GeoScoreResult {
  score: number;
  brandMentionPosition: number;
  brandMentionFrequency: number;
  citationCount: number;
  citationValidity: number;
  competitorMentions: number;
  contentLength: number;
  sentiment: number;
}

export function calculateGeoScore(input: GeoScoreInput): GeoScoreResult {
  const {
    brandMentions,
    competitorMentions,
    citations,
    validCitations,
    text,
    sentimentScore,
  } = input;

  // Brand mention position (lower is better, position 1 = 1.0)
  const firstBrandPosition = brandMentions.length > 0 && brandMentions[0].position !== null
    ? Math.max(0.1, 1 - (brandMentions[0].position - 1) * 0.1)
    : 0.3;
  const brandMentionPosition = firstBrandPosition;

  // Brand mention frequency (normalized)
  const brandMentionFrequency = Math.min(1, brandMentions.length / 10);

  // Citation count (normalized, optimal 3-5)
  const citationCount = citations.length > 0
    ? Math.min(1, citations.length / 5)
    : 0;

  // Citation validity ratio
  const citationValidity = citations.length > 0
    ? validCitations / citations.length
    : 0;

  // Competitor mentions (some is good, too many is bad)
  const competitorCount = competitorMentions.length;
  const competitorMentionsScore = competitorCount > 0 && competitorCount <= 3
    ? competitorCount / 3
    : competitorCount > 3
      ? Math.max(0, 1 - (competitorCount - 3) * 0.1)
      : 0;

  // Content length (optimal 500-2000 chars)
  const textLength = text.length;
  const contentLengthScore = textLength < 100
    ? 0.2
    : textLength > 2000
      ? Math.max(0.3, 1 - (textLength - 2000) / 2000)
      : 0.8 + (Math.min(textLength, 1500) / 1500) * 0.2;

  // Sentiment (positive is better)
  const sentiment = (sentimentScore + 1) / 2; // Normalize -1..1 to 0..1

  // Weighted score
  const weights = {
    brandMentionPosition: 0.25,
    brandMentionFrequency: 0.20,
    citationCount: 0.15,
    citationValidity: 0.15,
    competitorMentions: 0.10,
    contentLength: 0.08,
    sentiment: 0.07,
  };

  const score =
    brandMentionPosition * weights.brandMentionPosition +
    brandMentionFrequency * weights.brandMentionFrequency +
    citationCount * weights.citationCount +
    citationValidity * weights.citationValidity +
    competitorMentionsScore * weights.competitorMentions +
    contentLengthScore * weights.contentLength +
    sentiment * weights.sentiment;

  return {
    score: Math.round(score * 1000) / 1000,
    brandMentionPosition,
    brandMentionFrequency,
    citationCount,
    citationValidity,
    competitorMentions: competitorMentionsScore,
    contentLength: contentLengthScore,
    sentiment,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function extractContextLines(
  lines: string[],
  index: number,
  radius: number = 2,
): string[] {
  const start = Math.max(0, index - radius);
  const end = Math.min(lines.length, index + radius + 1);
  return lines.slice(start, end);
}

export function detectPosition(
  text: string,
  mentionIndex: number,
): number | null {
  const start = Math.max(0, mentionIndex - 120);
  const end = Math.min(text.length, mentionIndex + 120);
  const context = text.slice(start, end);
  const rankMatch = context.match(/(^|\n)\s*(\d+)[.)]/);
  if (rankMatch) {
    const rank = parseInt(rankMatch[2], 10);
    if (rank <= 20) return rank;
  }
  return null;
}
