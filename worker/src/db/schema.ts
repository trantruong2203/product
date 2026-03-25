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
  screenshot: text('screenshot'),
  // GEO metrics
  brandMentionCount: integer('brandMentionCount'),
  citationCount: integer('citationCount'),
  validCitationCount: integer('validCitationCount'),
  geoScore: real('geoScore'),
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

export type ResponseAnalysis = typeof responseAnalysis.$inferSelect;
export type NewResponseAnalysis = typeof responseAnalysis.$inferInsert;
