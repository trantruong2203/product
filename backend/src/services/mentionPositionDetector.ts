/**
 * Mention Position Detection Service for GEO SaaS
 */

import { BrandMention } from '../types/dto.js';

export class MentionPositionDetector {
  /**
   * Analyze and update positions of brand mentions in text
   */
  analyzeMentionPositions(mentions: BrandMention[], totalLength: number): BrandMention[] {
    return mentions.map(mention => {
      return {
        ...mention,
        position: this.calculatePosition(mention, totalLength),
      };
    });
  }

  /**
   * Calculate the relative position of a mention in the text (0-1 scale)
   */
  private calculatePosition(mention: BrandMention, totalLength: number): number {
    // Use paragraph and sentence indices for position calculation
    // Earlier mentions = lower position value = higher prominence
    if (totalLength === 0) {
      return (mention.paragraphIndex + 1) / 100;
    }

    // Estimate character position based on paragraph and sentence indices
    // Assume ~100 chars per sentence on average
    const estimatedCharPosition = (mention.paragraphIndex * 500) + (mention.sentenceIndex * 100) + mention.position;
    const relativePosition = Math.min(1, estimatedCharPosition / totalLength);
    
    return Math.max(0, Math.min(1, relativePosition));
  }

  /**
   * Determine if a mention is in a prominent position (beginning of text)
   */
  isProminentPosition(mention: BrandMention, totalLength: number): boolean {
    return this.calculatePosition(mention, totalLength) < 0.2; // Top 20%
  }

  /**
   * Determine if a mention is in a featured position (first paragraph)
   */
  isFeaturedPosition(mention: BrandMention): boolean {
    return mention.paragraphIndex === 0;
  }

  /**
   * Analyze position-based scoring factors
   */
  getPositionFactors(mention: BrandMention, totalLength: number): {
    prominence: number; // 0-1
    featured: boolean;
    early: boolean;
  } {
    const position = this.calculatePosition(mention, totalLength);

    return {
      prominence: Math.max(0, 1 - position), // Earlier = higher score
      featured: this.isFeaturedPosition(mention),
      early: position < 0.1, // In first 10%
    };
  }
}