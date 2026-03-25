import { Worker } from "bullmq";
import { config } from "./config/index.js";
import { runPromptJob, RunPromptJobData } from "./jobs/runPrompt.js";
import { browserPool } from "./browsers/browserPool.js";
import { startHealthServer } from "./healthServer.js";
import { recordJobComplete, recordJobFailed, updateMemoryMetrics } from "./metrics.js";
import db from "./config/database.js";
import { runs } from "./db/schema.js";
import { eq } from "drizzle-orm";

// Memory threshold for automatic cleanup (in MB)
const MEMORY_THRESHOLD_MB = parseInt(process.env.MEMORY_THRESHOLD_MB || "1500", 10);

const redisUrl = new URL(config.redis.url);
const workerConcurrency = Number(process.env.WORKER_CONCURRENCY || "1");
const connection = {
  host: redisUrl.hostname || "localhost",
  port: parseInt(redisUrl.port, 10) || 6379,
  password: redisUrl.password || undefined,
};

const runPromptWorker = new Worker<RunPromptJobData>(
  "run_prompt",
  async (job) => {
    const startTime = Date.now();
    await runPromptJob(job);

    // Record job completion metrics
    const durationSeconds = (Date.now() - startTime) / 1000;
    const engine = job.data.engineName || "unknown";
    recordJobComplete(engine, durationSeconds, 0); // Response length tracked separately
  },
  {
    connection,
    concurrency: Number.isFinite(workerConcurrency) && workerConcurrency > 0
      ? workerConcurrency
      : 1,
    limiter: {
      max: 10,
      duration: 1000,
    },
    // Long-running jobs need extended stalled interval (default is 30s)
    stalledInterval: 60000, // Check every 60s
    maxStalledCount: 2,    // Allow 2 stalled attempts before failing
  },
);

console.log(
  `[Worker] Started (concurrency=${Number.isFinite(workerConcurrency) && workerConcurrency > 0 ? workerConcurrency : 1}, memory threshold=${MEMORY_THRESHOLD_MB}MB)`,
);

// Memory monitoring
function logMemoryStats(): void {
  const memory = process.memoryUsage();
  const heapUsedMB = Math.round(memory.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(memory.heapTotal / 1024 / 1024);
  const rssMB = Math.round(memory.rss / 1024 / 1024);
  const browserStats = browserPool.getMemoryStats();
  
  console.log(`[Memory] Heap: ${heapUsedMB}MB/${heapTotalMB}MB, RSS: ${rssMB}MB, Browser contexts: ${browserStats.contexts}/${browserStats.maxContexts}`);
  
  // Update Prometheus metrics
  updateMemoryMetrics();
  
  // Auto cleanup if memory exceeds threshold
  if (heapUsedMB > MEMORY_THRESHOLD_MB) {
    console.warn(`[Memory] WARNING: Heap usage (${heapUsedMB}MB) exceeds threshold (${MEMORY_THRESHOLD_MB}MB)`);
    console.log(`[Memory] Initiating emergency cleanup...`);
    
    // Close all browser contexts to free memory
    browserPool.closeAll().then(() => {
      console.log(`[Memory] Emergency cleanup complete`);
    }).catch((err) => {
      console.error(`[Memory] Emergency cleanup failed:`, err);
    });
  }
}

// Log memory stats every 30 seconds
setInterval(logMemoryStats, 30000);

// Initial memory log
logMemoryStats();

runPromptWorker.on("completed", (job) => {
  console.log(`[Worker] Job ${job.id} completed`);
});

runPromptWorker.on("failed", async (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed:`, err.message);
  
  // Record failure metrics
  const engine = job?.data?.engineName || "unknown";
  recordJobFailed(engine, err.name || "unknown");
  
  // When job fails (including stalled), update Run to FAILED so frontend can refresh
  if (job?.data?.runId) {
    try {
      await db
        .update(runs)
        .set({
          status: "FAILED",
          finishedAt: new Date(),
          error: err?.message || "Job failed",
        })
        .where(eq(runs.id, job.data.runId));
      console.log(`[Worker] Updated run ${job.data.runId} to FAILED`);
    } catch (e) {
      console.error(`[Worker] Failed to update run ${job.data.runId}:`, e);
    }
  }
});

runPromptWorker.on("error", (err) => {
  console.error("[Worker] Worker error:", err);
});

// Global error handlers
process.on("uncaughtException", async (error) => {
  console.error("[Fatal] Uncaught exception:", error);
  await gracefulShutdown("uncaughtException");
});

process.on("unhandledRejection", async (reason, promise) => {
  console.error("[Fatal] Unhandled rejection:", reason);
  await gracefulShutdown("unhandledRejection");
});

// Graceful shutdown
async function gracefulShutdown(signal: string): Promise<void> {
  console.log(`[Shutdown] Received ${signal}, starting graceful shutdown...`);
  
  // 1. Stop accepting new jobs
  runPromptWorker.pause();
  
  // 2. Close browser pool first
  try {
    await browserPool.closeAll();
    console.log("[Shutdown] Browser pool closed");
  } catch (error) {
    console.error("[Shutdown] Error closing browser pool:", error);
  }
  
  // 3. Close worker (waits for current jobs)
  try {
    await runPromptWorker.close();
    console.log("[Shutdown] Worker closed");
  } catch (error) {
    console.error("[Shutdown] Error closing worker:", error);
  }
  
  // 4. Close database connection
  try {
    await db.$client.end();
    console.log("[Shutdown] Database connection closed");
  } catch (error) {
    console.error("[Shutdown] Error closing database:", error);
  }
  
  console.log("[Shutdown] Graceful shutdown complete");
  process.exit(1);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Start health check server on port 8080 (configurable via HEALTH_PORT env var)
startHealthServer();

// Export for health checks
export { runPromptWorker, browserPool };

