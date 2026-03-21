// ─────────────────────────────────────────────────────────────────────────────
// Text normalization
// ─────────────────────────────────────────────────────────────────────────────

export function normalizeText(text: string): string {
  return (
    text
      .replace(/\r/g, "")
      .replace(/\t/g, " ")
      // Unicode-safe: chỉ xóa punctuation/ký tự đặc biệt, GIỮ LẠI chữ cái đa ngôn ngữ
      // \p{L} = mọi chữ cái (a-z, tiếng Việt, tiếng Nhật...), \p{N} = số, \s = khoảng trắng
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .replace(/\s+/g, " ")
      .toLowerCase()
      .trim()
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface Mention {
  position: number | null;
  confidence: number;
  context: string;
  contextLines?: string[];  // Extended: array of surrounding lines
}

/**
 * Extract surrounding lines for context (used in parser.service.ts)
 */
export function extractContextLines(
  lines: string[],
  index: number,
  radius: number = 2
): string[] {
  const start = Math.max(0, index - radius);
  const end = Math.min(lines.length, index + radius + 1);
  return lines.slice(start, end);
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

  const rawText = text.replace(/\r/g, "");
  const originalLines = rawText.split("\n");
  const brand = normalizeText(brandName);

  // Only use words long enough to be meaningful
  const brandWords = brand.split(" ").filter((w) => w.length > 2);

  const rankings = extractRankings(rawText);

  for (let i = 0; i < originalLines.length; i++) {
    const origLine = originalLines[i];
    const line = normalizeText(origLine);
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
      position = inferPositionFromContext(originalLines, i);
    }

    const confidence = calculateConfidence(line, brand, brandWords);
    if (confidence === 0) continue; // skip zero-confidence hits (false positives)

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
  // MATCHES: "1. Brand", "1) Brand", "[1] Brand", "## 1. Brand", "1️⃣ Brand", etc.
  // Ignores bold/italic markdown and trailing colons/dashes in the extracted name
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
// Position inference (FIX #6)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Infer position by looking for a numbered list marker in the surrounding
 * 2 lines. Also detects implicit rankings like "first", "second", "best", etc.
 * Returns null if no clear marker is found — null is better than a misleading guess.
 *
 * FIX #6: Old code returned `1` any time a line contained "best/top",
 * and returned `lineIndex + 1` otherwise — both meaningless.
 *
 * FIX #8: Added implicit ranking detection for prose descriptions
 * (e.g., "First option is Nike", "The best choice is Adidas")
 */
function inferPositionFromContext(
  lines: string[],
  index: number,
): number | null {
  // First, try explicit numbered list markers
  for (let offset = -1; offset <= 1; offset++) {
    const targetLine = lines[index + offset];
    if (!targetLine) continue;
    const match = targetLine.match(
      /^\s*(?:#+\s*)?\[?(\d+)[.)\]\uFE0F\u20E3]*\s/,
    );
    if (match) return parseInt(match[1], 10);
  }

  // FIX #8: Try implicit ranking detection in current line and nearby lines
  const implicitPosition = detectImplicitRanking(lines, index);
  if (implicitPosition !== null) return implicitPosition;

  return null;
}

/**
 * FIX #8: Detect implicit rankings from prose descriptions
 * Examples:
 * - "First option is Nike" → position 1
 * - "Second best choice is Adidas" → position 2
 * - "The best choice is Nike" → position 1
 * - "Top recommendation is Adidas" → position 1
 * - "Leading brand is Nike" → position 1
 */
function detectImplicitRanking(lines: string[], index: number): number | null {
  // Check current line and 1 line before/after for implicit ranking keywords
  for (let offset = -1; offset <= 1; offset++) {
    const targetLine = lines[index + offset];
    if (!targetLine) continue;

    const normalized = normalizeText(targetLine);

    // Ordinal numbers: "first", "second", "third", etc.
    const ordinalMatch = normalized.match(
      /\b(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)\b/i,
    );
    if (ordinalMatch) {
      const ordinalMap: Record<string, number> = {
        first: 1,
        second: 2,
        third: 3,
        fourth: 4,
        fifth: 5,
        sixth: 6,
        seventh: 7,
        eighth: 8,
        ninth: 9,
        tenth: 10,
      };
      return ordinalMap[ordinalMatch[1].toLowerCase()] || null;
    }

    // Superlatives: "best", "top", "leading", "most recommended"
    if (/\b(best|top|leading|most recommended|premier|superior)\b/i.test(normalized)) {
      return 1;
    }

    // "Second best", "runner up", "alternative"
    if (/\b(second best|runner up|alternative|next best)\b/i.test(normalized)) {
      return 2;
    }

    // "Third best", "honorable mention"
    if (/\b(third best|honorable mention)\b/i.test(normalized)) {
      return 3;
    }
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Brand matching helper (FIX #7 — word boundary)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Unicode-aware word boundary check.
 * JavaScript's \b does NOT work with Unicode chars like tiếng Việt.
 * This uses lookahead/lookbehind with \p{L} (letter) flag instead.
 */
function wordBoundaryRegex(word: string): RegExp {
  const escaped = escapeRegex(word);
  // (?<!\p{L}) = not preceded by a letter
  // (?!\p{L})  = not followed by a letter
  return new RegExp(`(?<!\\p{L})${escaped}(?!\\p{L})`, "iu");
}

/**
 * Returns true if the line contains the brand (whole-word match).
 * Unicode-safe: works with Vietnamese, Japanese, etc.
 */
function matchesBrand(
  line: string,
  brand: string,
  brandWords: string[],
): boolean {
  if (wordBoundaryRegex(brand).test(line)) return true;

  // Partial match: ALL significant words present
  if (brandWords.length > 1) {
    return brandWords.every((w) => wordBoundaryRegex(w).test(line));
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
  // Full exact match (Unicode word boundary)
  if (wordBoundaryRegex(brand).test(line)) return 1.0;

  // All significant words present as whole words
  const significantWords = brandWords.filter((w) => w.length > 3);

  if (significantWords.length === 0) {
    return 0.0;
  }

  const matchedWords = significantWords.filter((w) =>
    wordBoundaryRegex(w).test(line),
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
