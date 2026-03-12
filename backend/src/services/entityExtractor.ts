/**
 * Brand extraction service for GEO SaaS
 */

import { BrandMention } from '../types/dto.js';

export class EntityExtractor {
  private brandVariations: Map<string, string[]> = new Map();

  constructor() {
    // Initialize brand variations
    this.initializeBrandVariations();
  }

  private initializeBrandVariations(): void {
    // This would typically load from a config or database
    // For now, we'll use a simple approach
  }

  /**
   * Extract all brand mentions with fuzzy matching
   */
  extractBrandMentions(
    text: string,
    brandName: string,
    competitorNames: string[]
  ): { brandMentions: BrandMention[]; competitorMentions: BrandMention[] } {
    // Normalize brand names for consistent comparison
    const normalizedBrand = this.normalizeBrandName(brandName);
    const normalizedCompetitors = competitorNames.map(c => this.normalizeBrandName(c));
    const brands = [{ original: brandName, normalized: normalizedBrand }, 
                    ...normalizedCompetitors.map((norm, idx) => ({ 
                      original: competitorNames[idx], 
                      normalized: norm 
                    }))];
    
    const mentions: BrandMention[] = [];

    // Normalize text for analysis
    const sentences = this.splitIntoSentences(text);
    const paragraphs = this.splitIntoParagraphs(text);

    sentences.forEach((sentence, sentenceIndex) => {
      const paragraphIndex = this.findParagraphIndex(sentence, paragraphs);

      brands.forEach(brand => {
        const matches = this.findBrandMatches(sentence, brand.original);
        matches.forEach(match => {
          mentions.push({
            brand: match.matchedText,
            brandNormalized: brand.normalized,
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

    return {
      brandMentions: mentions.filter(m => m.brandNormalized === normalizedBrand),
      competitorMentions: mentions.filter(m => m.brandNormalized !== normalizedBrand),
    };
  }

  private normalizeBrandName(brand: string): string {
    return brand.toLowerCase().trim();
  }

  private findBrandMatches(
    sentence: string,
    brand: string
  ): { matchedText: string; position: number; confidence: number; isDirect: boolean }[] {
    const matches: { matchedText: string; position: number; confidence: number; isDirect: boolean }[] = [];
    const variations = this.getBrandVariations(brand);

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
    const brandWords = brand.split(/\s+/);

    for (let i = 0; i <= words.length - brandWords.length; i++) {
      const segment = words.slice(i, i + brandWords.length).join(' ');
      const similarity = this.calculateSimilarity(segment, brand);

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

  private getBrandVariations(brand: string): string[] {
    // Generate common variations of a brand name
    const variations = [brand];

    // Add common variations
    variations.push(brand.replace(/\s+/g, '-'));
    variations.push(brand.replace(/\s+/g, '_'));
    variations.push(brand.toLowerCase());
    variations.push(brand.toUpperCase());

    // Add variations with common suffixes/prefixes
    if (!brand.includes('.')) {
      variations.push(brand + '.com');
      variations.push(brand + '.io');
      variations.push(brand + '.ai');
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
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j - 1] + 1
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