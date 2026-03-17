import { Worker } from "bullmq";
import { config } from "./config/index.js";
import { runPromptJob, RunPromptJobData } from "./jobs/runPrompt.js";
import { browserPool } from "./browsers/browserPool.js";
import db from "./config/database.js";
import { runs } from "./db/schema.js";
import { eq } from "drizzle-orm";

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
    await runPromptJob(job);
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
  },
);

console.log(
  `Worker started (concurrency=${Number.isFinite(workerConcurrency) && workerConcurrency > 0 ? workerConcurrency : 1}), waiting for jobs...`,
);

runPromptWorker.on("completed", (job) => {
  console.log(`Job ${job.id} completed`);
});

runPromptWorker.on("failed", async (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message);
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
  console.error("Worker error:", err);
});

process.on("SIGTERM", async () => {
  console.log("Shutting down workers...");
  await runPromptWorker.close();
  await browserPool.closeAll();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("Shutting down workers...");
  await runPromptWorker.close();
  await browserPool.closeAll();
  process.exit(0);
});

