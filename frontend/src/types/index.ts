export interface User {
  id: string;
  email: string;
  name?: string;
  plan: string;
  createdAt?: string;
}

export interface Project {
  id: string;
  userId: string;
  domain: string;
  brandName: string;
  country: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  competitors: Competitor[];
  prompts: Prompt[];
  _count: {
    prompts: number;
    competitors: number;
    runs: number;
  };
}

export interface Competitor {
  id: string;
  projectId: string;
  name: string;
  domain: string;
  createdAt: string;
}

export interface Prompt {
  id: string;
  projectId: string;
  query: string;
  language: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AIEngine {
  id: string;
  name: string;
  domain: string;
  isActive: boolean;
}

export interface Run {
  id: string;
  promptId: string;
  engineId: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  startedAt?: string;
  finishedAt?: string;
  error?: string;
  createdAt: string;
  prompt: Prompt;
  engine: AIEngine;
}

export interface ProjectResults {
  visibilityScore: number;
  citationRate: number;
  promptCoverage: number;
  avgPosition: number;
  totalRuns: number;
  totalCitations: number;
  competitorMentions: number;
  recentRuns: Run[];
}

export interface HistoryData {
  date: string;
  score: number;
  citations: number;
}

export interface CompetitorComparison {
  name: string;
  domain: string;
  citations: number;
}

export interface PromptRanking {
  promptId: string;
  promptQuery: string;
  engineId: string;
  engineName: string;
  brand: string;
  rank: number;
  mentions: number;
  avgPosition: number;
}

export type SourceType = 'OWN' | 'COMPETITOR' | 'THIRD_PARTY';
export type AlertStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';
export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH';
export type ScheduleFrequency = 'DAILY' | 'WEEKLY';
export type RecommendationStatus = 'OPEN' | 'ACCEPTED' | 'DONE' | 'DISMISSED';
export type RecommendationPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface SoMSeriesRow {
  bucket: string;
  keyword: string;
  engine: string;
  totals: {
    mentionsAllBrands: number;
    responses: number;
  };
  brands: Array<{
    name: string;
    mentions: number;
    som: number;
  }>;
}

export interface SoMResponse {
  projectId: string;
  window: {
    from: string;
    to: string;
    granularity: 'day' | 'week';
  };
  series: SoMSeriesRow[];
}

export interface CitationItem {
  id: string;
  runId: string;
  responseId: string;
  keyword: string;
  engine: string;
  brand: string;
  url: string | null;
  hostname: string | null;
  path: string | null;
  sourceType: SourceType | null;
  isValid: boolean | null;
  httpStatus: number | null;
  mentionedBrand: boolean;
  mentionedBrandName: string | null;
  mentionedBrandIsPrimary: boolean;
  linkedBrandName: string | null;
  linkedBrandType: SourceType | null;
  createdAt: string;
}

export interface CitationsResponse {
  items: CitationItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}

export interface AlertItem {
  id: string;
  type: string;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  description: string;
  evidence?: Record<string, unknown> | null;
  createdAt: string;
}

export interface AlertsResponse {
  items: AlertItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}

export interface ScanSchedule {
  id: string;
  frequency: ScheduleFrequency;
  dayOfWeek?: number | null;
  timeOfDay: string;
  timezone: string;
  engines: string[];
  isActive: boolean;
  createdAt: string;
}

export interface SentimentResponse {
  distribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  avgSentimentScore: number;
  series: Array<{
    bucket: string;
    positive: number;
    neutral: number;
    negative: number;
  }>;
}

export interface NarrativeResponse {
  topNarratives: Array<{ tag: string; count: number; share: number }>;
  byEngine: Array<{ engine: string; tag: string; count: number }>;
}

export interface RecommendationItem {
  id: string;
  type: string;
  priority: RecommendationPriority;
  status: RecommendationStatus;
  title: string;
  reason: string;
  suggestedAction: string;
  evidence?: Record<string, unknown> | null;
  keyword?: string | null;
  createdAt: string;
}

export interface RecommendationsResponse {
  items: RecommendationItem[];
}

export interface ContentGapResponse {
  missingTopics: string[];
  formatGaps: string[];
  sourcePreference: Array<{ domain: string; count: number }>;
}

export interface DashboardTableRow {
  keyword: string;
  aiModel: string;
  brandMention: boolean;
  citationLink: string | null;
  sentimentScore: number;
  suggestedAction: string;
}

export interface DashboardTableResponse {
  rows: DashboardTableRow[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}
