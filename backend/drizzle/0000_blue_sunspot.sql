CREATE TYPE "public"."AlertSeverity" AS ENUM('LOW', 'MEDIUM', 'HIGH');--> statement-breakpoint
CREATE TYPE "public"."AlertStatus" AS ENUM('OPEN', 'ACKNOWLEDGED', 'RESOLVED');--> statement-breakpoint
CREATE TYPE "public"."Plan" AS ENUM('FREE', 'STARTER', 'PRO', 'ENTERPRISE');--> statement-breakpoint
CREATE TYPE "public"."RecommendationPriority" AS ENUM('LOW', 'MEDIUM', 'HIGH');--> statement-breakpoint
CREATE TYPE "public"."RecommendationStatus" AS ENUM('OPEN', 'ACCEPTED', 'DONE', 'DISMISSED');--> statement-breakpoint
CREATE TYPE "public"."RunStatus" AS ENUM('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."ScheduleFrequency" AS ENUM('DAILY', 'WEEKLY');--> statement-breakpoint
CREATE TYPE "public"."Sentiment" AS ENUM('POSITIVE', 'NEUTRAL', 'NEGATIVE');--> statement-breakpoint
CREATE TYPE "public"."SourceType" AS ENUM('OWN', 'COMPETITOR', 'THIRD_PARTY');--> statement-breakpoint
CREATE TABLE "AIEngine" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"domain" text NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "AIEngine_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "Alert" (
	"id" text PRIMARY KEY NOT NULL,
	"projectId" text NOT NULL,
	"type" text NOT NULL,
	"severity" "AlertSeverity" DEFAULT 'MEDIUM' NOT NULL,
	"status" "AlertStatus" DEFAULT 'OPEN' NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"evidence" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Citation" (
	"id" text PRIMARY KEY NOT NULL,
	"responseId" text NOT NULL,
	"brand" text NOT NULL,
	"domain" text,
	"url" text,
	"hostname" text,
	"path" text,
	"sourceType" "SourceType",
	"isValid" boolean,
	"httpStatus" integer,
	"mentionedBrand" boolean DEFAULT false NOT NULL,
	"position" integer,
	"confidence" real DEFAULT 1 NOT NULL,
	"context" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Competitor" (
	"id" text PRIMARY KEY NOT NULL,
	"projectId" text NOT NULL,
	"name" text NOT NULL,
	"domain" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Project" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"domain" text NOT NULL,
	"brandName" text NOT NULL,
	"country" text DEFAULT 'US' NOT NULL,
	"keywords" text[] DEFAULT '{}' NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Prompt" (
	"id" text PRIMARY KEY NOT NULL,
	"projectId" text NOT NULL,
	"query" text NOT NULL,
	"language" text DEFAULT 'en' NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Recommendation" (
	"id" text PRIMARY KEY NOT NULL,
	"projectId" text NOT NULL,
	"keyword" text,
	"type" text NOT NULL,
	"priority" "RecommendationPriority" DEFAULT 'MEDIUM' NOT NULL,
	"status" "RecommendationStatus" DEFAULT 'OPEN' NOT NULL,
	"title" text NOT NULL,
	"reason" text NOT NULL,
	"suggestedAction" text NOT NULL,
	"evidence" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ResponseAnalysis" (
	"id" text PRIMARY KEY NOT NULL,
	"responseId" text NOT NULL,
	"sentiment" "Sentiment" NOT NULL,
	"sentimentScore" real NOT NULL,
	"narrativeTags" text[] DEFAULT '{}' NOT NULL,
	"modelVersion" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Response" (
	"id" text PRIMARY KEY NOT NULL,
	"runId" text NOT NULL,
	"responseText" text NOT NULL,
	"responseHtml" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Run" (
	"id" text PRIMARY KEY NOT NULL,
	"promptId" text NOT NULL,
	"engineId" text NOT NULL,
	"status" "RunStatus" DEFAULT 'PENDING' NOT NULL,
	"startedAt" timestamp,
	"finishedAt" timestamp,
	"error" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ScanSchedule" (
	"id" text PRIMARY KEY NOT NULL,
	"projectId" text NOT NULL,
	"frequency" "ScheduleFrequency" NOT NULL,
	"dayOfWeek" integer,
	"timeOfDay" text NOT NULL,
	"timezone" text NOT NULL,
	"engines" text[] DEFAULT '{}' NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "User" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"name" text,
	"plan" "Plan" DEFAULT 'FREE' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "User_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE INDEX "AIEngine_name_idx" ON "AIEngine" USING btree ("name");--> statement-breakpoint
CREATE INDEX "Alert_projectId_idx" ON "Alert" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "Alert_status_idx" ON "Alert" USING btree ("status");--> statement-breakpoint
CREATE INDEX "Alert_severity_idx" ON "Alert" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "Citation_responseId_idx" ON "Citation" USING btree ("responseId");--> statement-breakpoint
CREATE INDEX "Citation_brand_idx" ON "Citation" USING btree ("brand");--> statement-breakpoint
CREATE INDEX "Citation_domain_idx" ON "Citation" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "Citation_hostname_idx" ON "Citation" USING btree ("hostname");--> statement-breakpoint
CREATE INDEX "Citation_sourceType_idx" ON "Citation" USING btree ("sourceType");--> statement-breakpoint
CREATE INDEX "Citation_isValid_idx" ON "Citation" USING btree ("isValid");--> statement-breakpoint
CREATE INDEX "Competitor_projectId_idx" ON "Competitor" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "Project_userId_idx" ON "Project" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "Project_domain_idx" ON "Project" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "Prompt_projectId_idx" ON "Prompt" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "Recommendation_projectId_idx" ON "Recommendation" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "Recommendation_status_idx" ON "Recommendation" USING btree ("status");--> statement-breakpoint
CREATE INDEX "Recommendation_priority_idx" ON "Recommendation" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "Recommendation_keyword_idx" ON "Recommendation" USING btree ("keyword");--> statement-breakpoint
CREATE INDEX "ResponseAnalysis_responseId_idx" ON "ResponseAnalysis" USING btree ("responseId");--> statement-breakpoint
CREATE INDEX "ResponseAnalysis_sentiment_idx" ON "ResponseAnalysis" USING btree ("sentiment");--> statement-breakpoint
CREATE INDEX "Response_runId_idx" ON "Response" USING btree ("runId");--> statement-breakpoint
CREATE INDEX "Run_promptId_idx" ON "Run" USING btree ("promptId");--> statement-breakpoint
CREATE INDEX "Run_engineId_idx" ON "Run" USING btree ("engineId");--> statement-breakpoint
CREATE INDEX "Run_status_idx" ON "Run" USING btree ("status");--> statement-breakpoint
CREATE INDEX "Run_startedAt_idx" ON "Run" USING btree ("startedAt");--> statement-breakpoint
CREATE INDEX "ScanSchedule_projectId_idx" ON "ScanSchedule" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "ScanSchedule_isActive_idx" ON "ScanSchedule" USING btree ("isActive");