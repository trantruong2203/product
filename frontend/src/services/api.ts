import axios from "axios";

const API_URL = "/api";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export const authAPI = {
  register: (data: { email: string; password: string; name?: string }) =>
    api.post("/auth/register", data),
  login: (data: { email: string; password: string }) =>
    api.post("/auth/login", data),
  getMe: () => api.get("/auth/me"),
};

export const projectsAPI = {
  getAll: () => api.get("/projects"),
  getById: (id: string) => api.get(`/projects/${id}`),
  create: (data: {
    domain: string;
    brandName: string;
    country?: string;
    language?: string;
    keywords?: string[];
  }) => api.post("/projects", data),
  update: (
    id: string,
    data: {
      domain?: string;
      brandName?: string;
      country?: string;
      isActive?: boolean;
    },
  ) => api.put(`/projects/${id}`, data),
  delete: (id: string) => api.delete(`/projects/${id}`),
};

export const promptsAPI = {
  getByProject: (projectId: string) => api.get(`/prompts/${projectId}`),
  create: (projectId: string, data: { query: string; language?: string }) =>
    api.post(`/prompts/${projectId}`, data),
  delete: (projectId: string, promptId: string) =>
    api.delete(`/prompts/${projectId}/${promptId}`),
};

export const competitorsAPI = {
  getByProject: (projectId: string) =>
    api.get(`/projects/${projectId}/competitors`),
  create: (projectId: string, data: { name: string; domain: string }) =>
    api.post(`/projects/${projectId}/competitors`, data),
  delete: (projectId: string, competitorId: string) =>
    api.delete(`/projects/${projectId}/competitors/${competitorId}`),
};

export const runsAPI = {
  trigger: (data: { promptIds?: string[]; engineIds?: string[] }) =>
    api.post("/runs/run", data),
  getAll: () => api.get("/runs"),
  getById: (id: string) => api.get(`/runs/${id}`),
  getProjectRunStatus: (projectId: string) =>
    api.get(`/runs/projects/${projectId}/status`),
};

export const resultsAPI = {
  getProjectResults: (projectId: string) => api.get(`/results/${projectId}`),
  getHistory: (projectId: string, days?: number) =>
    api.get(`/results/${projectId}/history?days=${days || 30}`),
  getCompetitors: (projectId: string) =>
    api.get(`/results/${projectId}/competitors`),
  getRankings: (projectId: string, engineId?: string) =>
    api.get(
      `/results/${projectId}/rankings${engineId ? `?engineId=${engineId}` : ""}`,
    ),
};

export const enginesAPI = {
  getAll: () => api.get("/engines"),
  toggle: (id: string) => api.put(`/engines/${id}/toggle`),
};

export const geoAPI = {
  // GEO Analysis
  runScan: (data: {
    prompt: string;
    brand: string;
    competitors: string[];
    engines?: string[];
  }) => api.post('/geo/scan', data),

  // Get analysis results (with polling support)
  getAnalysisResults: (promptId: string) =>
    api.get(`/geo/results/${promptId}`),

  // Dashboard Table (main GEO spec table)
  getDashboardTable: (
    projectId: string,
    params?: {
      page?: number;
      pageSize?: number;
      keyword?: string;
      engine?: string;
      from?: string;
      to?: string;
    },
  ) => api.get(`/dashboard/projects/${projectId}/table`, { params }),

  // Share of Model
  getSoM: (
    projectId: string,
    params?: {
      granularity?: "day" | "week";
      from?: string;
      to?: string;
      keyword?: string;
      engine?: string;
    },
  ) => api.get(`/som/projects/${projectId}`, { params }),

  // Citations
  getCitations: (
    projectId: string,
    params?: {
      page?: number;
      pageSize?: number;
      keyword?: string;
      engine?: string;
      sourceType?: string;
      isValid?: boolean;
      from?: string;
      to?: string;
    },
  ) => api.get(`/citations/projects/${projectId}`, { params }),
  getCitationSummary: (
    projectId: string,
    params?: { keyword?: string; engine?: string; from?: string; to?: string },
  ) => api.get(`/citations/projects/${projectId}/summary`, { params }),

  // Sentiment & Narratives
  getSentiment: (
    projectId: string,
    params?: { from?: string; to?: string; keyword?: string; engine?: string },
  ) => api.get(`/analysis/projects/${projectId}/sentiment`, { params }),
  getNarratives: (
    projectId: string,
    params?: { from?: string; to?: string; keyword?: string; engine?: string },
  ) => api.get(`/analysis/projects/${projectId}/narratives`, { params }),

  // Alerts
  getAlerts: (
    projectId: string,
    params?: {
      page?: number;
      pageSize?: number;
      status?: string;
      severity?: string;
      type?: string;
    },
  ) => api.get(`/alerts/projects/${projectId}`, { params }),
  updateAlertStatus: (
    alertId: string,
    status: "OPEN" | "ACKNOWLEDGED" | "RESOLVED",
  ) => api.patch(`/alerts/${alertId}/status`, { status }),

  // Recommendations & Content Gap
  getRecommendations: (
    projectId: string,
    params?: { status?: string; priority?: string; type?: string },
  ) => api.get(`/recommendations/projects/${projectId}`, { params }),
  updateRecommendationStatus: (
    recommendationId: string,
    status: "OPEN" | "ACCEPTED" | "DONE" | "DISMISSED",
  ) => api.patch(`/recommendations/${recommendationId}/status`, { status }),
  getContentGap: (projectId: string) =>
    api.get(`/recommendations/projects/${projectId}/content-gap`),

  // Scan Schedules
  getSchedules: (projectId: string) =>
    api.get(`/schedules/projects/${projectId}`),
  createSchedule: (
    projectId: string,
    data: {
      frequency: "DAILY" | "WEEKLY";
      dayOfWeek?: number;
      timeOfDay: string;
      timezone: string;
      engines: string[];
    },
  ) => api.post(`/schedules/projects/${projectId}`, data),
  updateSchedule: (
    scheduleId: string,
    data: {
      frequency?: "DAILY" | "WEEKLY";
      dayOfWeek?: number | null;
      timeOfDay?: string;
      timezone?: string;
      engines?: string[];
      isActive?: boolean;
    },
  ) => api.patch(`/schedules/${scheduleId}`, data),
};
