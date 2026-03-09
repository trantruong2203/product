export function normalizeText(text: string): string {
  return text
    .replace(/\r/g, "")
    .replace(/\t/g, " ")
    .replace(/[^\w\s\n]/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
}

export interface Mention {
  position: number | null
  confidence: number
  context: string
}

/**
 * Detect brand mentions + ranking inference
 */
export function detectBrandMentions(
  text: string,
  brandName: string,
  domain: string
): Mention[] {

  const mentions: Mention[] = []

  const normalizedText = normalizeText(text)

  const lines = normalizedText.split("\n")

  const brand = normalizeText(brandName)

  const brandWords = brand.split(" ").filter(w => w.length > 2)

  const rankings = extractRankings(normalizedText)

  for (let i = 0; i < lines.length; i++) {

    const line = lines[i]

    if (!line) continue

    if (
      brandWords.some(w => line.includes(w)) ||
      (domain && line.includes(domain))
    ) {

      let position: number | null = null

      const rankingMatch = rankings.find(r =>
        line.includes(normalizeText(r.name))
      )

      if (rankingMatch) {
        position = rankingMatch.position
      } else {
        position = inferPositionFromSentence(lines, i)
      }

      mentions.push({
        position,
        confidence: calculateConfidence(line, brand),
        context: line
      })
    }
  }

  return mentions
}

/**
 * Detect ranking from numbered lists
 */
export function extractRankings(
  text: string
): Array<{ position: number; name: string }> {

  const rankings: Array<{ position: number; name: string }> = []

  const numberedPattern = /^(\d+)[\.\)]\s*([^\n]+)/gm

  let match

  while ((match = numberedPattern.exec(text)) !== null) {

    const pos = parseInt(match[1], 10)

    if (pos <= 20) {

      rankings.push({
        position: pos,
        name: match[2].trim()
      })
    }
  }

  return rankings
}

/**
 * Infer ranking when no numbered list
 */
function inferPositionFromSentence(lines: string[], index: number): number {

  const rankingWords = [
    "best",
    "top",
    "leading",
    "recommended",
    "popular"
  ]

  const line = lines[index]

  if (rankingWords.some(w => line.includes(w))) {
    return 1
  }

  return index + 1
}

/**
 * Confidence scoring
 */
function calculateConfidence(text: string, brand: string): number {

  const normalized = normalizeText(text)

  if (normalized.includes(brand)) {
    return 1
  }

  const words = brand.split(" ")

  if (words.some(w => normalized.includes(w))) {
    return 0.8
  }

  return 0.5
}

/**
 * Legacy position detector (safe fallback)
 */
export function detectPosition(
  text: string,
  mentionIndex: number
): number | null {

  const start = Math.max(0, mentionIndex - 120)

  const end = Math.min(text.length, mentionIndex + 120)

  const context = text.slice(start, end)

  const rankMatch = context.match(/(^|\n)\s*(\d+)[\.\)]/)

  if (rankMatch) {

    const rank = parseInt(rankMatch[2], 10)

    if (rank <= 20) {
      return rank
    }
  }

  return null
}