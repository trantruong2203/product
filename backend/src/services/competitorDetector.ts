/**
 * Competitor detection service for GEO SaaS
 */

import { BrandMention } from '../types/dto.js';

export class CompetitorDetector {
  /**
   * Detect competitor mentions in text
   */
  detectCompetitorMentions(
    text: string,
    competitorNames: string[]
  ): BrandMention[] {
    const mentions: BrandMention[] = [];
    const sentences = this.splitIntoSentences(text);
    const paragraphs = this.splitIntoParagraphs(text);

    sentences.forEach((sentence, sentenceIndex) => {
      const paragraphIndex = this.findParagraphIndex(sentence, paragraphs);

      competitorNames.forEach(competitor => {
        const matches = this.findCompetitorMatches(sentence, competitor);
        matches.forEach(match => {
          mentions.push({
            brand: match.matchedText,
            brandNormalized: competitor,
            type: match.isDirect ? 'DIRECT' : 'INDIRECT',
            position: match.position,
            paragraphIndex,
            sentenceIndex,
            context: sentence,
            confidence: match.confidence,
            sentiment: 'NEUTRAL', // Will be analyzed separately
            isAuthority: this.detectAuthority(sentence),
            isFeatured: paragraphIndex === 0,
          });
        });
      });
    });

    return mentions;
  }

  private findCompetitorMatches(
    sentence: string,
    competitor: string
  ): { matchedText: string; position: number; confidence: number; isDirect: boolean }[] {
    const matches: { matchedText: string; position: number; confidence: number; isDirect: boolean }[] = [];
    const variations = this.getCompetitorVariations(competitor);

    // Direct matching
    variations.forEach(variation => {
      const index = sentence.toLowerCase().indexOf(variation.toLowerCase());
      if (index !== -1) {
        matches.push({
          matchedText: sentence.substring(index, index + variation.length),
          position: index + 1,
          confidence: 1.0,
          isDirect: true,
        });
      }
    });

    // Fuzzy matching for partial mentions
    const words = sentence.split(/\s+/);
    const brandWords = competitor.split(/\s+/);

    for (let i = 0; i <= words.length - brandWords.length; i++) {
      const segment = words.slice(i, i + brandWords.length).join(' ');
      const similarity = this.calculateSimilarity(segment, competitor);

      if (similarity > 0.7) {
        matches.push({
          matchedText: segment,
          position: i + 1,
          confidence: similarity,
          isDirect: similarity > 0.9,
        });
      }
    }

    return matches;
  }

  private getCompetitorVariations(competitor: string): string[] {
    // Generate common variations of a competitor name
    const variations = [competitor];

    // Add common variations
    variations.push(competitor.replace(/\s+/g, '-'));
    variations.push(competitor.replace(/\s+/g, '_'));
    variations.push(competitor.toLowerCase());
    variations.push(competitor.toUpperCase());

    // Add variations with common suffixes/prefixes
    if (!competitor.includes('.')) {
      variations.push(competitor + '.com');
      variations.push(competitor + '.io');
      variations.push(competitor + '.ai');
    }

    return variations;
  }

  private calculateSimilarity(str1: string, str2: string): number {
    // Levenshtein distance-based similarity
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1;

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2[i - 1] === str1[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // deletion
            matrix[i - 1][j] + 1      // insertion (was wrong: matrix[i - 1][j - 1] + 1)
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  private splitIntoSentences(text: string): string[] {
    return text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  }

  private splitIntoParagraphs(text: string): string[] {
    return text.split(/\n\n+/).filter(p => p.trim().length > 0);
  }

  private findParagraphIndex(sentence: string, paragraphs: string[]): number {
    for (let i = 0; i < paragraphs.length; i++) {
      if (paragraphs[i].includes(sentence)) {
        return i;
      }
    }
    return 0;
  }

  private detectAuthority(sentence: string): boolean {
    const authorityIndicators = [
      'according to', 'states that', 'reports that', 'says that',
      'published by', 'created by', 'founded by', 'led by',
      'headquartered in', 'based in', 'located in',
    ];
    const lowerSentence = sentence.toLowerCase();
    return authorityIndicators.some(indicator => lowerSentence.includes(indicator));
  }
}