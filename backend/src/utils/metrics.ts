import { Counter, Histogram, Gauge, register } from 'prom-client';

/**
 * Prometheus metrics for monitoring
 */

// Request metrics
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
});

export const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

export const httpRequestErrors = new Counter({
  name: 'http_request_errors_total',
  help: 'Total number of HTTP request errors',
  labelNames: ['method', 'route', 'error_type'],
});

// Authentication metrics
export const authLoginAttempts = new Counter({
  name: 'auth_login_attempts_total',
  help: 'Total number of login attempts',
  labelNames: ['status'], // success, failed, locked
});

export const authTokenRefresh = new Counter({
  name: 'auth_token_refresh_total',
  help: 'Total number of token refreshes',
});

export const authActiveUsers = new Gauge({
  name: 'auth_active_users',
  help: 'Number of currently active users',
});

// Database metrics
export const dbQueryDuration = new Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
});

export const dbQueryErrors = new Counter({
  name: 'db_query_errors_total',
  help: 'Total number of database query errors',
  labelNames: ['operation', 'table', 'error_type'],
});

export const dbConnectionPoolSize = new Gauge({
  name: 'db_connection_pool_size',
  help: 'Current database connection pool size',
});

export const dbConnectionPoolAvailable = new Gauge({
  name: 'db_connection_pool_available',
  help: 'Available connections in database pool',
});

// Cache metrics
export const cacheHits = new Counter({
  name: 'cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['cache_type'],
});

export const cacheMisses = new Counter({
  name: 'cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['cache_type'],
});

export const cacheSize = new Gauge({
  name: 'cache_size_bytes',
  help: 'Current cache size in bytes',
  labelNames: ['cache_type'],
});

// Job queue metrics
export const jobQueueDepth = new Gauge({
  name: 'job_queue_depth',
  help: 'Number of jobs in queue',
  labelNames: ['queue_name'],
});

export const jobProcessingDuration = new Histogram({
  name: 'job_processing_duration_seconds',
  help: 'Duration of job processing in seconds',
  labelNames: ['queue_name', 'status'],
  buckets: [1, 5, 10, 30, 60, 300],
});

export const jobErrors = new Counter({
  name: 'job_errors_total',
  help: 'Total number of job processing errors',
  labelNames: ['queue_name', 'error_type'],
});

// Security metrics
export const securityEvents = new Counter({
  name: 'security_events_total',
  help: 'Total number of security events',
  labelNames: ['event_type', 'severity'],
});

export const rateLimitViolations = new Counter({
  name: 'rate_limit_violations_total',
  help: 'Total number of rate limit violations',
  labelNames: ['endpoint'],
});

export const csrfViolations = new Counter({
  name: 'csrf_violations_total',
  help: 'Total number of CSRF violations',
});

export const accountLockouts = new Counter({
  name: 'account_lockouts_total',
  help: 'Total number of account lockouts',
});

// System metrics
export const processUptime = new Gauge({
  name: 'process_uptime_seconds',
  help: 'Process uptime in seconds',
});

export const processMemoryUsage = new Gauge({
  name: 'process_memory_usage_bytes',
  help: 'Process memory usage in bytes',
  labelNames: ['type'], // heap_used, heap_total, external, rss
});

export const processCpuUsage = new Gauge({
  name: 'process_cpu_usage_percent',
  help: 'Process CPU usage percentage',
});

/**
 * Middleware to track HTTP request metrics
 */
export const metricsMiddleware = (req: any, res: any, next: any) => {
  const start = Date.now();
  const route = req.route?.path || req.path || 'unknown';

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const statusCode = res.statusCode;

    httpRequestDuration.labels(req.method, route, statusCode).observe(duration);
    httpRequestTotal.labels(req.method, route, statusCode).inc();

    if (statusCode >= 400) {
      const errorType = statusCode >= 500 ? 'server_error' : 'client_error';
      httpRequestErrors.labels(req.method, route, errorType).inc();
    }
  });

  next();
};

/**
 * Update system metrics
 */
export const updateSystemMetrics = (): void => {
  const uptime = process.uptime();
  const memUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();

  processUptime.set(uptime);
  processMemoryUsage.labels('heap_used').set(memUsage.heapUsed);
  processMemoryUsage.labels('heap_total').set(memUsage.heapTotal);
  processMemoryUsage.labels('external').set(memUsage.external);
  processMemoryUsage.labels('rss').set(memUsage.rss);
  processCpuUsage.set((cpuUsage.user + cpuUsage.system) / 1000000);
};

/**
 * Start periodic system metrics collection
 */
export const startMetricsCollection = (intervalMs: number = 10000): NodeJS.Timer => {
  return setInterval(updateSystemMetrics, intervalMs);
};

/**
 * Get Prometheus metrics endpoint
 */
export const getMetricsEndpoint = async (): Promise<string> => {
  return register.metrics();
};

/**
 * Get metrics in JSON format
 */
export const getMetricsJson = async (): Promise<Record<string, any>> => {
  const metrics = await register.metrics();
  const lines = metrics.split('\n');
  const result: Record<string, any> = {};

  for (const line of lines) {
    if (line.startsWith('#') || !line.trim()) continue;

    const match = line.match(/^([a-z_]+)\{?([^}]*)\}?\s+(.+)$/);
    if (match) {
      const [, name, labels, value] = match;
      if (!result[name]) {
        result[name] = [];
      }
      result[name].push({
        labels: parseLabels(labels),
        value: parseFloat(value),
      });
    }
  }

  return result;
};

/**
 * Parse Prometheus labels
 */
function parseLabels(labelStr: string): Record<string, string> {
  const labels: Record<string, string> = {};
  if (!labelStr) return labels;

  const matches = labelStr.matchAll(/([a-z_]+)="([^"]*)"/g);
  for (const match of matches) {
    labels[match[1]] = match[2];
  }

  return labels;
}
