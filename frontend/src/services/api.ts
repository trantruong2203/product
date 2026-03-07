import axios from 'axios';

const API_URL = '/api';

const token = localStorage.getItem('token');

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

if (token) {
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data: { email: string; password: string; name?: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

export const projectsAPI = {
  getAll: () => api.get('/projects'),
  getById: (id: string) => api.get(`/projects/${id}`),
  create: (data: { domain: string; brandName: string; country?: string }) =>
    api.post('/projects', data),
  update: (id: string, data: { domain?: string; brandName?: string; country?: string; isActive?: boolean }) =>
    api.put(`/projects/${id}`, data),
  delete: (id: string) => api.delete(`/projects/${id}`),
};

export const promptsAPI = {
  getByProject: (projectId: string) => api.get(`/prompts/${projectId}`),
  create: (projectId: string, data: { query: string; language?: string }) =>
    api.post('/prompts', { ...data, projectId }),
  delete: (projectId: string, promptId: string) => api.delete(`/prompts/${projectId}/${promptId}`),
};

export const competitorsAPI = {
  getByProject: (projectId: string) => api.get(`/projects/${projectId}/competitors`),
  create: (projectId: string, data: { name: string; domain: string }) =>
    api.post(`/projects/${projectId}/competitors`, data),
  delete: (projectId: string, competitorId: string) =>
    api.delete(`/projects/${projectId}/competitors/${competitorId}`),
};

export const runsAPI = {
  trigger: (data: { promptIds?: string[]; engineIds?: string[] }) =>
    api.post('/runs/run', data),
  getAll: () => api.get('/runs'),
  getById: (id: string) => api.get(`/runs/${id}`),
};

export const resultsAPI = {
  getProjectResults: (projectId: string) => api.get(`/results/${projectId}`),
  getHistory: (projectId: string, days?: number) =>
    api.get(`/results/${projectId}/history?days=${days || 30}`),
  getCompetitors: (projectId: string) => api.get(`/results/${projectId}/competitors`),
};

export const enginesAPI = {
  getAll: () => api.get('/engines'),
  toggle: (id: string) => api.put(`/engines/${id}/toggle`),
};
