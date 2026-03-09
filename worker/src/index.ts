import { Worker } from "bullmq";
import { config } from "./config/index.js";
import { runPromptJob, RunPromptJobData } from "./jobs/runPrompt.js";
import { browserPool } from "./browsers/browserPool.js";

const redisUrl = new URL(config.redis.url);
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
    concurrency: 2,
    limiter: {
      max: 10,
      duration: 1000,
    },
  },
);

runPromptWorker.on("completed", (job) => {
  console.log(`Job ${job.id} completed`);
});

runPromptWorker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message);
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

console.log("Worker started, waiting for jobs...");
