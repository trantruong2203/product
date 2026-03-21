/**
 * Prometheus metrics for worker monitoring
 */

import { Counter, Histogram, Gauge, Registry, collectDefaultMetrics } from "prom-client";

// Create a custom registry
export const register = new Registry();

// Collect default metrics (CPU, memory, event loop, etc.)
collectDefaultMetrics({ register });

// Job counters
export const jobsTotal = new Counter({
  name: "worker_jobs_total",
  help: "Total number of jobs processed",
  labelNames: ["engine", "status"],
  registers: [register],
});

// Job duration histogram
export const jobDuration = new Histogram({
  name: "worker_job_duration_seconds",
  help: "Job processing duration in seconds",
  labelNames: ["engine"],
  buckets: [1, 5, 10, 30, 60, 120, 300, 600],
  registers: [register],
});

// Active browser contexts gauge
export const activeContexts = new Gauge({
  name: "worker_active_contexts",
  help: "Number of active browser contexts",
  labelNames: ["engine"],
  registers: [register],
});

// Error counter
export const errorsTotal = new Counter({
  name: "worker_errors_total",
  help: "Total number of errors",
  labelNames: ["type", "engine"],
  registers: [register],
});

// Response length histogram
export const responseLength = new Histogram({
  name: "worker_response_length_bytes",
  help: "Response text length in bytes",
  labelNames: ["engine"],
  buckets: [100, 500, 1000, 5000, 10000, 50000, 100000],
  registers: [register],
});

// Memory usage gauge
export const memoryUsageMB = new Gauge({
  name: "worker_memory_usage_mb",
  help: "Worker memory usage in MB",
  labelNames: ["type"],
  registers: [register],
});

// Browser launch counter
export const browserLaunches = new Counter({
  name: "worker_browser_launches_total",
  help: "Total number of browser launches",
  labelNames: ["engine", "status"],
  registers: [register],
});

/**
 * Update memory metrics
 */
export function updateMemoryMetrics(): void {
  const mem = process.memoryUsage();
  
  memoryUsageMB.labels("heap_used").set(Math.round(mem.heapUsed / 1024 / 1024));
  memoryUsageMB.labels("heap_total").set(Math.round(mem.heapTotal / 1024 / 1024));
  memoryUsageMB.labels("rss").set(Math.round(mem.rss / 1024 / 1024));
  memoryUsageMB.labels("external").set(Math.round(mem.external / 1024 / 1024));
}

/**
 * Record a completed job
 */
export function recordJobComplete(engine: string, durationSeconds: number, responseLengthBytes: number): void {
  jobsTotal.labels(engine, "completed").inc();
  jobDuration.labels(engine).observe(durationSeconds);
  responseLength.labels(engine).observe(responseLengthBytes);
}

/**
 * Record a failed job
 */
export function recordJobFailed(engine: string, errorType: string): void {
  jobsTotal.labels(engine, "failed").inc();
  errorsTotal.labels(errorType, engine).inc();
}

/**
 * Update active contexts count
 */
export function updateActiveContexts(engine: string, count: number): void {
  activeContexts.labels(engine).set(count);
}

/**
 * Record browser launch
 */
export function recordBrowserLaunch(engine: string, success: boolean): void {
  browserLaunches.labels(engine, success ? "success" : "failed").inc();
}
