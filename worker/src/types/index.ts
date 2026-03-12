/**
 * Types for the GEO SaaS system
 */

export interface EngineResponse {
  engine: string;
  engineId: string;
  prompt: string;
  responseText: string;
  responseHtml: string;
  responseMarkdown: string;
  timestamp: Date;
  latency: number; // ms
  success: boolean;
  error?: string;
}

export interface BrandMention {
  brand: string;
  brandNormalized: string;
  type: 'DIRECT' | 'INDIRECT' | 'CONTEXTUAL';
  position: number; // 1-based position in response
  paragraphIndex: number;
  sentenceIndex: number;
  context: string;
  confidence: number; // 0-1
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  isAuthority: boolean; // Is brand cited as authority
  isFeatured: boolean; // Is in first paragraph/list
  url?: string;
}

export interface GEOScore {
  totalScore: number; // 0-100
  components: {
    brandPresence: number; // 0-100
    authority: number; // 0-100
    competitorComparison: number; // 0-100
    visibility: number; // 0-100
  };
  details: {
    totalMentions: number;
    avgPosition: number;
    authorityMentions: number;
    featuredMentions: number;
    competitorMentions: number;
    sentimentScore: number;
  };
  engineScores: Record<string, number>;
}

export interface ScanRequest {
  prompt: string;
  brand: string;
  competitors: string[];
  engines?: string[];
}

export interface ScanResponse {
  engineResults: EngineResponse[];
  geoScore: number;
  brandMentions: number;
  competitorMentions: number;
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
}