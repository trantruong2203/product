export type SourceType = 'OWN' | 'COMPETITOR' | 'THIRD_PARTY';
export type AlertStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';
export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH';
export type ScheduleFrequency = 'DAILY' | 'WEEKLY';
export type Sentiment = 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
export type RecommendationStatus = 'OPEN' | 'ACCEPTED' | 'DONE' | 'DISMISSED';
export type RecommendationPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface TimeWindowQuery {
  from?: string;
  to?: string;
  keyword?: string;
  engine?: string;
}

export interface GetSoMQuery extends TimeWindowQuery {
  granularity?: 'day' | 'week';
}

export interface SoMBrandRow {
  name: string;
  mentions: number;
  som: number;
}

export interface SoMSeriesRow {
  bucket: string;
  keyword: string;
  engine: string;
  totals: {
    mentionsAllBrands: number;
    responses: number;
  };
  brands: SoMBrandRow[];
  totals: {
    mentionsAllBrands: number;
    responses: number;
  };
}

export interface GetSoMResponse {
  projectId: string;
  window: {
    from: string;
    to: string;
    granularity: 'day' | 'week';
  };
  series: SoMSeriesRow[];
}

export interface GetCitationsQuery extends TimeWindowQuery {
  sourceType?: SourceType;
  isValid?: boolean;
  page?: number;
  pageSize?: number;
}

export interface CitationDto {
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
  createdAt: string;
}

export interface CitationsResponse {
  items: CitationDto[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}

export interface CitationSummaryResponse {
  totals: {
    all: number;
    own: number;
    competitor: number;
    thirdParty: number;
    invalidLinks: number;
  };
  topDomains: Array<{ hostname: string; count: number }>;
}

export interface GetAlertsQuery {
  status?: AlertStatus;
  severity?: AlertSeverity;
  type?: string;
  page?: number;
  pageSize?: number;
}

export interface AlertDto {
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
  items: AlertDto[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}

export interface UpdateAlertStatusInput {
  status: AlertStatus;
}

export interface ScanScheduleDto {
  id: string;
  frequency: ScheduleFrequency;
  dayOfWeek?: number | null;
  timeOfDay: string;
  timezone: string;
  engines: string[];
  isActive: boolean;
  createdAt: string;
}

export interface CreateScheduleInput {
  frequency: ScheduleFrequency;
  dayOfWeek?: number;
  timeOfDay: string;
  timezone: string;
  engines: string[];
}

export interface UpdateScheduleInput {
  frequency?: ScheduleFrequency;
  dayOfWeek?: number | null;
  timeOfDay?: string;
  timezone?: string;
  engines?: string[];
  isActive?: boolean;
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

export interface RecommendationDto {
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

export interface GetRecommendationsQuery {
  status?: RecommendationStatus;
  priority?: RecommendationPriority;
  type?: string;
}

export interface RecommendationsResponse {
  items: RecommendationDto[];
}

export interface UpdateRecommendationStatusInput {
  status: RecommendationStatus;
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
