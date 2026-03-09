import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const createProjectSchema = z.object({
  domain: z.string().url('Invalid domain URL'),
  brandName: z.string().min(1, 'Brand name is required'),
  country: z.string().optional().default('US'),
  keywords: z.array(z.string()).optional().default([]),
});

export const updateProjectSchema = z.object({
  domain: z.string().url('Invalid domain URL').optional(),
  brandName: z.string().min(1, 'Brand name is required').optional(),
  country: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export const createCompetitorSchema = z.object({
  name: z.string().min(1, 'Competitor name is required'),
  domain: z.string().url('Invalid domain URL'),
});

export const createPromptSchema = z.object({
  query: z.string().min(1, 'Prompt query is required'),
  language: z.string().optional().default('en'),
});

export const runPromptSchema = z.object({
  promptIds: z.array(z.string()).optional(),
  engineIds: z.array(z.string()).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type CreateCompetitorInput = z.infer<typeof createCompetitorSchema>;
export type CreatePromptInput = z.infer<typeof createPromptSchema>;
export type RunPromptInput = z.infer<typeof runPromptSchema>;
