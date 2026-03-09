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
