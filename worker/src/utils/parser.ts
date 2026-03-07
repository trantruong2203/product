export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface Mention {
  position: number | null;
  confidence: number;
  context: string;
}

export function detectBrandMentions(
  text: string,
  brandName: string,
  domain: string
): Mention[] {
  const mentions: Mention[] = [];
  const normalizedBrand = normalizeText(brandName);
  const brandWords = normalizedBrand.split(' ').filter(w => w.length > 2);

  const regex = new RegExp(brandWords.join('|'), 'gi');
  let match;

  while ((match = regex.exec(text)) !== null) {
    const start = Math.max(0, match.index - 50);
    const end = Math.min(text.length, match.index + match[0].length + 50);
    const context = text.slice(start, end);
    const position = detectPosition(text, match.index);

    mentions.push({
      position,
      confidence: calculateConfidence(match[0], normalizedBrand),
      context,
    });
  }

  if (domain) {
    const domainParts = domain.replace(/^(https?:\/\/)?(www\.)?/, '').split('.');
    for (const part of domainParts) {
      if (part.length > 3) {
        const domainRegex = new RegExp(`\\b${part}\\b`, 'gi');
        let domainMatch: RegExpExecArray | null;
        while ((domainMatch = domainRegex.exec(text)) !== null) {
          if (!mentions.some(m => m.context.includes(domainMatch![0]))) {
            const start = Math.max(0, domainMatch.index - 50);
            const end = Math.min(text.length, domainMatch.index + domainMatch[0].length + 50);
            const context = text.slice(start, end);
            mentions.push({
              position: detectPosition(text, domainMatch.index),
              confidence: 0.7,
              context,
            });
          }
        }
      }
    }
  }

  return mentions;
}

function calculateConfidence(match: string, brand: string): number {
  const matchNorm = normalizeText(match);
  if (matchNorm === brand) return 1.0;
  if (brand.includes(matchNorm) || matchNorm.includes(brand)) return 0.8;
  return 0.5;
}

export function detectPosition(text: string, mentionIndex: number): number | null {
  const textBefore = text.slice(0, mentionIndex);
  const lines = textBefore.split(/\n/);
  const currentLine = lines[lines.length - 1];
  
  const numberMatch = currentLine.match(/(\d+)/);
  if (numberMatch) {
    return parseInt(numberMatch[1], 10);
  }

  const rankingKeywords = ['first', 'second', 'third', 'fourth', 'fifth', 'top', 'best', 'leading'];
  for (const keyword of rankingKeywords) {
    if (textBefore.toLowerCase().includes(keyword)) {
      return 1;
    }
  }

  return null;
}

export function extractRankings(text: string): Array<{ position: number; name: string }> {
  const rankings: Array<{ position: number; name: string }> = [];
  const numberedPattern = /^(\d+)[\.\)]\s*([A-Z][^\n]+)/gm;
  let match;

  while ((match = numberedPattern.exec(text)) !== null) {
    rankings.push({
      position: parseInt(match[1], 10),
      name: match[2].trim(),
    });
  }

  return rankings;
}
