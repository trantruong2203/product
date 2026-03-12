/**
 * Mention position detection module for GEO SaaS
 */

import { BrandMention } from "../types/index.js";

export class MentionPositionDetector {
  /**
   * Detect and analyze the position of mentions in the text
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
    // If we have character position in the full text
    if (mention.context && totalLength > 0) {
      // This is a simplified approach - in reality, you'd need to know the character position
      // in the full text to calculate accurate position
      const avgCharPerWord = 5; // Average characters per word estimate
      const approxPosition = (mention.sentenceIndex * 20 + mention.position) / (totalLength / avgCharPerWord);
      return Math.min(1, Math.max(0, approxPosition));
    }

    // Use sentence and paragraph indices as position indicators
    return (mention.sentenceIndex + 1) / 100; // Normalize to 0-1 scale
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