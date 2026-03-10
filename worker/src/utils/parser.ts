// ─────────────────────────────────────────────────────────────────────────────
// Text normalization
// ─────────────────────────────────────────────────────────────────────────────

export function normalizeText(text: string): string {
  return text
    .replace(/\r/g, "")
    .replace(/\t/g, " ")
    .replace(/[^\w\s\n]/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface Mention {
  position: number | null;
  confidence: number;
  context: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Brand mention detection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Detect all brand mentions in a response text.
 * Returns one Mention object per line where the brand is found.
 *
 * FIX #6: inferPositionFromSentence now only uses actual list context,
 *         returning null instead of guessing from line index.
 * FIX #7: calculateConfidence uses word-boundary regex to prevent
 *         short-brand false positives (e.g. "On" matching "on" everywhere).
 */
export function detectBrandMentions(
  text: string,
  brandName: string,
  domain: string,
): Mention[] {
  const mentions: Mention[] = [];

  const normalizedText = normalizeText(text);
  const lines = normalizedText.split("\n");
  const brand = normalizeText(brandName);

  // Only use words long enough to be meaningful
  const brandWords = brand.split(" ").filter((w) => w.length > 2);

  const rankings = extractRankings(normalizedText);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    const hasBrandMatch = matchesBrand(line, brand, brandWords);
    const hasDomainMatch = domain
      ? line.includes(normalizeText(domain))
      : false;

    if (!hasBrandMatch && !hasDomainMatch) continue;

    // Try explicit numbered-list ranking first
    const rankingMatch = rankings.find((r) =>
      line.includes(normalizeText(r.name)),
    );

    let position: number | null = null;

    if (rankingMatch) {
      position = rankingMatch.position;
    } else {
      // FIX #6: look for a list item marker in nearby lines only, never guess
      position = inferPositionFromContext(lines, i);
    }

    const confidence = calculateConfidence(line, brand, brandWords);
    if (confidence === 0) continue; // skip zero-confidence hits (false positives)

    mentions.push({
      position,
      confidence,
      context: line,
    });
  }

  return mentions;
}

// ─────────────────────────────────────────────────────────────────────────────
// Ranking extraction – numbered lists (unchanged, was correct)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract explicit numbered-list rankings from text.
 * E.g. "1. Nike", "2) Adidas"
 */
export function extractRankings(
  text: string,
): Array<{ position: number; name: string }> {
  const rankings: Array<{ position: number; name: string }> = [];
  const numberedPattern = /^(\d+)[.)]\s*([^\n]+)/gm;

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
// Position inference (FIX #6)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Infer position by looking for a numbered list marker in the surrounding
 * 2 lines. Returns null if no clear marker is found — null is better than
 * a misleading guess.
 *
 * FIX #6: Old code returned `1` any time a line contained "best/top",
 * and returned `lineIndex + 1` otherwise — both meaningless.
 */
function inferPositionFromContext(
  lines: string[],
  index: number,
): number | null {
  for (let offset = -1; offset <= 1; offset++) {
    const targetLine = lines[index + offset];
    if (!targetLine) continue;
    const match = targetLine.match(/^\s*(\d+)[.)]\s/);
    if (match) return parseInt(match[1], 10);
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Brand matching helper (FIX #7 — word boundary)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns true if the line contains the brand (whole-word match).
 * Uses word-boundary regex so short brands like "On" don't match "on" everywhere.
 */
function matchesBrand(
  line: string,
  brand: string,
  brandWords: string[],
): boolean {
  const escapedBrand = escapeRegex(brand);
  if (new RegExp(`\\b${escapedBrand}\\b`).test(line)) return true;

  // Partial match: ALL significant words present as whole words
  if (brandWords.length > 1) {
    return brandWords.every((w) =>
      new RegExp(`\\b${escapeRegex(w)}\\b`).test(line),
    );
  }

  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Confidence scoring (FIX #7)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate confidence that a line is a real mention of the brand.
 *
 * FIX #7:
 * - Old code used `includes()` which caused false positives for short brands.
 * - Now uses word-boundary regex for all matches.
 * - Short words (≤ 3 chars) are excluded from partial-match scoring.
 * - Returns 0 for no real match (caller should skip these).
 *
 * Levels:
 *  1.0  – full brand name matched as whole word(s)
 *  0.85 – all significant words matched as whole words
 *  0.6  – some significant words matched
 *  0.0  – no real match (false positive filtered out)
 */
function calculateConfidence(
  line: string,
  brand: string,
  brandWords: string[],
): number {
  const escapedBrand = escapeRegex(brand);

  // Full exact match (word boundary)
  if (new RegExp(`\\b${escapedBrand}\\b`).test(line)) return 1.0;

  // All significant words present as whole words
  const significantWords = brandWords.filter((w) => w.length > 3);

  if (significantWords.length === 0) {
    // Brand is a single short word — already failed full match above
    return 0.0;
  }

  const matchedWords = significantWords.filter((w) =>
    new RegExp(`\\b${escapeRegex(w)}\\b`).test(line),
  );

  if (matchedWords.length === significantWords.length) return 0.85;
  if (matchedWords.length > 0) return 0.6;

  return 0.0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Legacy position detector (kept for backward compatibility)
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
