/**
 * Sentiment Analysis Module for GEO SaaS
 */

import { BrandMention } from "../types/index.js";

export class SentimentAnalyzer {
  private positiveWords: Set<string>;
  private negativeWords: Set<string>;

  constructor() {
    this.positiveWords = new Set([
      'excellent', 'outstanding', 'leading', 'innovative', 'reliable',
      'trusted', 'recommended', 'best', 'top', 'premier', 'superior',
      'exceptional', 'remarkable', 'impressive', 'notable', 'reputable',
      'dependable', 'quality', 'premium', 'award-winning', 'recognized',
      'established', 'successful', 'effective', 'efficient', 'advanced',
      'cutting-edge', 'revolutionary', 'groundbreaking', 'pioneering',
      'professional', 'expert', 'authoritative', 'credible', 'authentic',
      'genuine', 'original', 'proven', 'tested', 'certified', 'accredited',
      'affordable', 'competitive', 'cost-effective', 'value', 'beneficial',
      'advantageous', 'superior', 'optimal', 'ideal', 'perfect', 'flawless'
    ]);

    this.negativeWords = new Set([
      'poor', 'bad', 'worse', 'worst', 'problematic', 'issue',
      'concern', 'trouble', 'difficult', 'challenging', 'limited',
      'unreliable', 'untrustworthy', 'questionable', 'suspicious',
      'outdated', 'obsolete', 'deprecated', 'defunct', 'defective',
      'faulty', 'inadequate', 'insufficient', 'incomplete', 'incorrect',
      'false', 'misleading', 'deceptive', 'fraudulent', 'dishonest',
      'expensive', 'costly', 'overpriced', 'inefficient', 'ineffective',
      'slow', 'delayed', 'backlog', 'failure', 'defeat', 'loss',
      'weak', 'inferior', 'subpar', 'mediocre', 'average', 'ordinary',
      'common', 'basic', 'standard', 'minimal', 'insignificant', 'trivial'
    ]);
  }

  /**
   * Analyze sentiment of a brand mention
   */
  analyzeSentiment(mention: BrandMention): 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' {
    const context = mention.context.toLowerCase();
    const words = context.split(/\s+/);

    let positiveCount = 0;
    let negativeCount = 0;

    // Count sentiment words within 3 words of the mention
    const mentionIndex = this.findMentionIndex(context, mention.brand);

    for (let i = Math.max(0, mentionIndex - 3); i < Math.min(words.length, mentionIndex + 4); i++) {
      if (this.positiveWords.has(words[i]?.toLowerCase())) positiveCount++;
      if (this.negativeWords.has(words[i]?.toLowerCase())) negativeCount++;
    }

    if (positiveCount > negativeCount) return 'POSITIVE';
    if (negativeCount > positiveCount) return 'NEGATIVE';
    return 'NEUTRAL';
  }

  /**
   * Analyze sentiment for multiple mentions
   */
  analyzeSentiments(mentions: BrandMention[]): ('POSITIVE' | 'NEUTRAL' | 'NEGATIVE')[] {
    return mentions.map(mention => this.analyzeSentiment(mention));
  }

  /**
   * Calculate overall sentiment score from mentions
   */
  calculateOverallSentiment(mentions: BrandMention[]): 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' {
    if (mentions.length === 0) return 'NEUTRAL';

    const sentimentCounts = {
      positive: 0,
      neutral: 0,
      negative: 0
    };

    mentions.forEach(mention => {
      const sentiment = this.analyzeSentiment(mention);
      sentimentCounts[sentiment.toLowerCase() as keyof typeof sentimentCounts]++;
    });

    // Determine majority sentiment
    if (sentimentCounts.positive > sentimentCounts.negative && sentimentCounts.positive > sentimentCounts.neutral) {
      return 'POSITIVE';
    } else if (sentimentCounts.negative > sentimentCounts.positive && sentimentCounts.negative > sentimentCounts.neutral) {
      return 'NEGATIVE';
    } else {
      return 'NEUTRAL';
    }
  }

  private findMentionIndex(text: string, brand: string): number {
    const index = text.toLowerCase().indexOf(brand.toLowerCase());
    if (index === -1) return -1;

    // Count words up to the mention
    const beforeMention = text.substring(0, index);
    return beforeMention.split(/\s+/).length;
  }
}