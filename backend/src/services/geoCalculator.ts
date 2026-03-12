/**
 * GEO Score Calculation Service
 */

import { BrandMention, GEOScore } from '../types/dto.js';

export class GEOCalculator {
  /**
   * Calculate comprehensive GEO score (0-100)
   */
  calculateScore(
    brandMentions: BrandMention[],
    competitorMentions: BrandMention[],
    responseLength: number
  ): GEOScore {
    const brandPresence = this.calculateBrandPresence(brandMentions);
    const authority = this.calculateAuthority(brandMentions);
    const competitor = this.calculateCompetitorComparison(brandMentions, competitorMentions);
    const visibility = this.calculateVisibility(brandMentions, responseLength);

    // Weighted final score
    const totalScore = Math.round(
      brandPresence * 0.35 +
      authority * 0.25 +
      competitor * 0.20 +
      visibility * 0.20
    );

    return {
      totalScore: Math.min(100, totalScore),
      components: { brandPresence, authority, competitor, visibility },
      details: {
        totalMentions: brandMentions.length,
        avgPosition: this.getAveragePosition(brandMentions),
        authorityMentions: brandMentions.filter(m => m.isAuthority).length,
        featuredMentions: brandMentions.filter(m => m.isFeatured).length,
        competitorMentions: competitorMentions.length,
        sentimentScore: this.getSentimentScore(brandMentions),
      },
      engineScores: {},
    };
  }

  /**
   * Brand Presence Score (0-100)
   * Based on mention frequency, position, and type
   */
  private calculateBrandPresence(mentions: BrandMention[]): number {
    if (mentions.length === 0) return 0;

    // Frequency score (logarithmic scale)
    const frequencyScore = Math.min(100, 20 * Math.log2(mentions.length + 1));

    // Position score (exponential decay)
    const avgPosition = this.getAveragePosition(mentions);
    const positionScore = this.calculatePositionScore(avgPosition);

    // Type bonus
    const directMentions = mentions.filter(m => m.type === 'DIRECT').length;
    const typeScore = (directMentions / mentions.length) * 30;

    return Math.min(100, frequencyScore + positionScore + typeScore);
  }

  /**
   * Authority Score (0-100)
   * Based on authority mentions and sentiment
   */
  private calculateAuthority(mentions: BrandMention[]): number {
    if (mentions.length === 0) return 0;

    const authorityMentions = mentions.filter(m => m.isAuthority);
    const authorityScore = (authorityMentions.length / mentions.length) * 50;

    const sentimentScore = this.getSentimentScore(mentions) * 50;

    return Math.min(100, authorityScore + sentimentScore);
  }

  /**
   * Competitor Comparison Score (0-100)
   * Ratio of brand mentions to competitor mentions
   */
  private calculateCompetitorComparison(
    brandMentions: BrandMention[],
    competitorMentions: BrandMention[]
  ): number {
    const brandCount = brandMentions.length;
    const competitorCount = competitorMentions.length;
    const total = brandCount + competitorCount;

    if (total === 0) return 100; // No mentions = neutral

    const ratio = brandCount / total;
    return Math.round(ratio * 100);
  }

  /**
   * Visibility Score (0-100)
   * Based on featured placement and paragraph coverage
   */
  private calculateVisibility(
    mentions: BrandMention[],
    responseLength: number
  ): number {
    if (mentions.length === 0) return 0;

    // Featured mentions (first paragraph)
    const featuredMentions = mentions.filter(m => m.isFeatured);
    const featuredScore = Math.min(50, featuredMentions.length * 25);

    // Paragraph coverage
    const uniqueParagraphs = new Set(mentions.map(m => m.paragraphIndex)).size;
    const coverageScore = Math.min(50, uniqueParagraphs * 10);

    return featuredScore + coverageScore;
  }

  private calculatePositionScore(avgPosition: number): number {
    if (avgPosition <= 0) return 0;
    return Math.round(100 * Math.pow(0.85, avgPosition - 1));
  }

  private getAveragePosition(mentions: BrandMention[]): number {
    const positions = mentions.map(m => m.position).filter(p => p > 0);
    if (positions.length === 0) return 0;
    return positions.reduce((a, b) => a + b, 0) / positions.length;
  }

  private getSentimentScore(mentions: BrandMention[]): number {
    if (mentions.length === 0) return 50; // Neutral

    const sentimentValues = mentions.map(m => {
      switch (m.sentiment) {
        case 'POSITIVE': return 1;
        case 'NEGATIVE': return -1;
        default: return 0;
      }
    });
    const avg = sentimentValues.reduce((a, b) => a + b, 0) / sentimentValues.length;
    return Math.round((avg + 1) * 50); // -1 to 1 -> 0 to 100
  }
}