ALTER TABLE "Citation" ADD COLUMN "mentionedBrandName" text;--> statement-breakpoint
ALTER TABLE "Citation" ADD COLUMN "mentionedBrandIsPrimary" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "Citation" ADD COLUMN "linkedBrandName" text;--> statement-breakpoint
ALTER TABLE "Citation" ADD COLUMN "linkedBrandType" "SourceType";--> statement-breakpoint
ALTER TABLE "Project" ADD COLUMN "language" text DEFAULT 'en' NOT NULL;