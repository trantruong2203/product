import { z } from "zod";

const dateTimeString = z.string().datetime();
const hhmm = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid timeOfDay format (HH:mm)");

const sourceTypeSchema = z.enum(["OWN", "COMPETITOR", "THIRD_PARTY"]);
const alertStatusSchema = z.enum(["OPEN", "ACKNOWLEDGED", "RESOLVED"]);
const alertSeveritySchema = z.enum(["LOW", "MEDIUM", "HIGH"]);
const scheduleFrequencySchema = z.enum(["DAILY", "WEEKLY"]);
const recommendationStatusSchema = z.enum([
  "OPEN",
  "ACCEPTED",
  "DONE",
  "DISMISSED",
]);
const recommendationPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH"]);

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const createProjectSchema = z.object({
  domain: z.string().url("Invalid domain URL"),
  brandName: z.string().min(1, "Brand name is required"),
  country: z.string().optional().default("US"),
  language: z.string().optional().default("en"),
  keywords: z.array(z.string()).optional().default([]),
});

export const updateProjectSchema = z.object({
  domain: z.string().url("Invalid domain URL").optional(),
  brandName: z.string().min(1, "Brand name is required").optional(),
  country: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export const createCompetitorSchema = z.object({
  name: z.string().min(1, "Competitor name is required"),
  domain: z.string().url("Invalid domain URL"),
});

export const createPromptSchema = z.object({
  query: z.string().min(1, "Prompt query is required"),
  language: z.string().optional().default("en"),
});

export const runPromptSchema = z.object({
  promptIds: z.array(z.string()).optional(),
  engineIds: z.array(z.string()).optional(),
});

export const getSoMSchema = z.object({
  from: dateTimeString.optional(),
  to: dateTimeString.optional(),
  keyword: z.string().min(1).optional(),
  engine: z.string().min(1).optional(),
  granularity: z.enum(["day", "week"]).optional(),
});

export const getCitationsSchema = z.object({
  from: dateTimeString.optional(),
  to: dateTimeString.optional(),
  keyword: z.string().min(1).optional(),
  engine: z.string().min(1).optional(),
  sourceType: sourceTypeSchema.optional(),
  isValid: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});

export const getAlertsSchema = z.object({
  status: alertStatusSchema.optional(),
  severity: alertSeveritySchema.optional(),
  type: z.string().min(1).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});

export const updateAlertStatusSchema = z.object({
  status: alertStatusSchema,
});

export const createScheduleSchema = z
  .object({
    frequency: scheduleFrequencySchema,
    dayOfWeek: z.coerce.number().int().min(0).max(6).optional(),
    timeOfDay: hhmm,
    timezone: z.string().min(1),
    engines: z.array(z.string().min(1)).min(1),
  })
  .superRefine((val, ctx) => {
    if (val.frequency === "WEEKLY" && val.dayOfWeek === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dayOfWeek"],
        message: "dayOfWeek is required when frequency is WEEKLY",
      });
    }
  });

export const updateScheduleSchema = z
  .object({
    frequency: scheduleFrequencySchema.optional(),
    dayOfWeek: z.coerce.number().int().min(0).max(6).nullable().optional(),
    timeOfDay: hhmm.optional(),
    timezone: z.string().min(1).optional(),
    engines: z.array(z.string().min(1)).min(1).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field is required",
  });

export const getRecommendationsSchema = z.object({
  status: recommendationStatusSchema.optional(),
  priority: recommendationPrioritySchema.optional(),
  type: z.string().min(1).optional(),
});

export const updateRecommendationStatusSchema = z.object({
  status: recommendationStatusSchema,
});

export const getDashboardTableSchema = z.object({
  from: dateTimeString.optional(),
  to: dateTimeString.optional(),
  keyword: z.string().min(1).optional(),
  engine: z.string().min(1).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type CreateCompetitorInput = z.infer<typeof createCompetitorSchema>;
export type CreatePromptInput = z.infer<typeof createPromptSchema>;
export type RunPromptInput = z.infer<typeof runPromptSchema>;
export type GetSoMInput = z.infer<typeof getSoMSchema>;
export type GetCitationsInput = z.infer<typeof getCitationsSchema>;
export type GetAlertsInput = z.infer<typeof getAlertsSchema>;
export type UpdateAlertStatusInput = z.infer<typeof updateAlertStatusSchema>;
export type CreateScheduleInput = z.infer<typeof createScheduleSchema>;
export type UpdateScheduleInput = z.infer<typeof updateScheduleSchema>;
export type GetRecommendationsInput = z.infer<typeof getRecommendationsSchema>;
export type UpdateRecommendationStatusInput = z.infer<
  typeof updateRecommendationStatusSchema
>;
export type GetDashboardTableInput = z.infer<typeof getDashboardTableSchema>;
