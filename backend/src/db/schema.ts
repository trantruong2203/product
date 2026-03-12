import { pgTable, text, timestamp, boolean, integer, real, pgEnum, index } from 'drizzle-orm/pg-core';

export const planEnum = pgEnum('Plan', ['FREE', 'STARTER', 'PRO', 'ENTERPRISE']);
export const runStatusEnum = pgEnum('RunStatus', ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED']);

export const users = pgTable('User', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  name: text('name'),
  plan: planEnum('plan').notNull().default('FREE'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});

export const projects = pgTable('Project', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('userId').notNull(),
  domain: text('domain').notNull(),
  brandName: text('brandName').notNull(),
  country: text('country').notNull().default('US'),
  language: text('language').notNull().default('en'),
  keywords: text('keywords').array().notNull().default([]),
  isActive: boolean('isActive').notNull().default(true),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
}, (table) => {
  return {
    userIdIdx: index('Project_userId_idx').on(table.userId),
    domainIdx: index('Project_domain_idx').on(table.domain),
  };
});

export const competitors = pgTable('Competitor', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('projectId').notNull(),
  name: text('name').notNull(),
  domain: text('domain').notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
}, (table) => {
  return {
    projectIdIdx: index('Competitor_projectId_idx').on(table.projectId),
  };
});

export const prompts = pgTable('Prompt', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('projectId').notNull(),
  query: text('query').notNull(),
  language: text('language').notNull().default('en'),
  isActive: boolean('isActive').notNull().default(true),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
}, (table) => {
  return {
    projectIdIdx: index('Prompt_projectId_idx').on(table.projectId),
  };
});

export const aiEngines = pgTable('AIEngine', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull().unique(),
  domain: text('domain').notNull(),
  isActive: boolean('isActive').notNull().default(true),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
}, (table) => {
  return {
    nameIdx: index('AIEngine_name_idx').on(table.name),
  };
});

export const runs = pgTable('Run', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  promptId: text('promptId').notNull(),
  engineId: text('engineId').notNull(),
  status: runStatusEnum('status').notNull().default('PENDING'),
  startedAt: timestamp('startedAt'),
  finishedAt: timestamp('finishedAt'),
  error: text('error'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
}, (table) => {
  return {
    promptIdIdx: index('Run_promptId_idx').on(table.promptId),
    engineIdIdx: index('Run_engineId_idx').on(table.engineId),
    statusIdx: index('Run_status_idx').on(table.status),
    startedAtIdx: index('Run_startedAt_idx').on(table.startedAt),
  };
});

export const responses = pgTable('Response', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  runId: text('runId').notNull(),
  responseText: text('responseText').notNull(),
  responseHtml: text('responseHtml'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
}, (table) => {
  return {
    runIdIdx: index('Response_runId_idx').on(table.runId),
  };
});

export const sourceTypeEnum = pgEnum('SourceType', ['OWN', 'COMPETITOR', 'THIRD_PARTY']);

export const citations = pgTable('Citation', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  responseId: text('responseId').notNull(),
  brand: text('brand').notNull(),
  domain: text('domain'),
  url: text('url'),
  hostname: text('hostname'),
  path: text('path'),
  sourceType: sourceTypeEnum('sourceType'),
  isValid: boolean('isValid'),
  httpStatus: integer('httpStatus'),
  mentionedBrand: boolean('mentionedBrand').notNull().default(false),
  mentionedBrandName: text('mentionedBrandName'),
  mentionedBrandIsPrimary: boolean('mentionedBrandIsPrimary').notNull().default(false),
  linkedBrandName: text('linkedBrandName'),
  linkedBrandType: sourceTypeEnum('linkedBrandType'),
  position: integer('position'),
  confidence: real('confidence').notNull().default(1.0),
  context: text('context'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
}, (table) => {
  return {
    responseIdIdx: index('Citation_responseId_idx').on(table.responseId),
    brandIdx: index('Citation_brand_idx').on(table.brand),
    domainIdx: index('Citation_domain_idx').on(table.domain),
    hostnameIdx: index('Citation_hostname_idx').on(table.hostname),
    sourceTypeIdx: index('Citation_sourceType_idx').on(table.sourceType),
    isValidIdx: index('Citation_isValid_idx').on(table.isValid),
  };
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Competitor = typeof competitors.$inferSelect;
export type NewCompetitor = typeof competitors.$inferInsert;
export type Prompt = typeof prompts.$inferSelect;
export type NewPrompt = typeof prompts.$inferInsert;
export type AIEngine = typeof aiEngines.$inferSelect;
export type NewAIEngine = typeof aiEngines.$inferInsert;
export type Run = typeof runs.$inferSelect;
export type NewRun = typeof runs.$inferInsert;
export type Response = typeof responses.$inferSelect;
export type NewResponse = typeof responses.$inferInsert;
export type Citation = typeof citations.$inferSelect;
export type NewCitation = typeof citations.$inferInsert;

export const alertStatusEnum = pgEnum('AlertStatus', ['OPEN', 'ACKNOWLEDGED', 'RESOLVED']);
export const alertSeverityEnum = pgEnum('AlertSeverity', ['LOW', 'MEDIUM', 'HIGH']);

export const alerts = pgTable('Alert', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('projectId').notNull(),
  type: text('type').notNull(),
  severity: alertSeverityEnum('severity').notNull().default('MEDIUM'),
  status: alertStatusEnum('status').notNull().default('OPEN'),
  title: text('title').notNull(),
  description: text('description').notNull(),
  evidence: text('evidence'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
}, (table) => {
  return {
    projectIdIdx: index('Alert_projectId_idx').on(table.projectId),
    statusIdx: index('Alert_status_idx').on(table.status),
    severityIdx: index('Alert_severity_idx').on(table.severity),
  };
});

export const scheduleFrequencyEnum = pgEnum('ScheduleFrequency', ['DAILY', 'WEEKLY']);

export const scanSchedules = pgTable('ScanSchedule', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('projectId').notNull(),
  frequency: scheduleFrequencyEnum('frequency').notNull(),
  dayOfWeek: integer('dayOfWeek'),
  timeOfDay: text('timeOfDay').notNull(),
  timezone: text('timezone').notNull(),
  engines: text('engines').array().notNull().default([]),
  isActive: boolean('isActive').notNull().default(true),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
}, (table) => {
  return {
    projectIdIdx: index('ScanSchedule_projectId_idx').on(table.projectId),
    activeIdx: index('ScanSchedule_isActive_idx').on(table.isActive),
  };
});

export const sentimentEnum = pgEnum('Sentiment', ['POSITIVE', 'NEUTRAL', 'NEGATIVE']);

export const responseAnalysis = pgTable('ResponseAnalysis', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  responseId: text('responseId').notNull(),
  sentiment: sentimentEnum('sentiment').notNull(),
  sentimentScore: real('sentimentScore').notNull(),
  narrativeTags: text('narrativeTags').array().notNull().default([]),
  modelVersion: text('modelVersion'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
}, (table) => {
  return {
    responseIdIdx: index('ResponseAnalysis_responseId_idx').on(table.responseId),
    sentimentIdx: index('ResponseAnalysis_sentiment_idx').on(table.sentiment),
  };
});

export const recommendationStatusEnum = pgEnum('RecommendationStatus', ['OPEN', 'ACCEPTED', 'DONE', 'DISMISSED']);
export const recommendationPriorityEnum = pgEnum('RecommendationPriority', ['LOW', 'MEDIUM', 'HIGH']);

export const recommendations = pgTable('Recommendation', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('projectId').notNull(),
  keyword: text('keyword'),
  type: text('type').notNull(),
  priority: recommendationPriorityEnum('priority').notNull().default('MEDIUM'),
  status: recommendationStatusEnum('status').notNull().default('OPEN'),
  title: text('title').notNull(),
  reason: text('reason').notNull(),
  suggestedAction: text('suggestedAction').notNull(),
  evidence: text('evidence'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
}, (table) => {
  return {
    projectIdIdx: index('Recommendation_projectId_idx').on(table.projectId),
    statusIdx: index('Recommendation_status_idx').on(table.status),
    priorityIdx: index('Recommendation_priority_idx').on(table.priority),
    keywordIdx: index('Recommendation_keyword_idx').on(table.keyword),
  };
});

export type Alert = typeof alerts.$inferSelect;
export type NewAlert = typeof alerts.$inferInsert;
export type ScanSchedule = typeof scanSchedules.$inferSelect;
export type NewScanSchedule = typeof scanSchedules.$inferInsert;
export type ResponseAnalysis = typeof responseAnalysis.$inferSelect;
export type NewResponseAnalysis = typeof responseAnalysis.$inferInsert;
export type Recommendation = typeof recommendations.$inferSelect;
export type NewRecommendation = typeof recommendations.$inferInsert;
