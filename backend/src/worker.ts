import { Worker } from "bullmq";
import { config } from "./config/index.js";
import { QUEUE_NAMES } from "./services/queue.service.js";
import { processRunPromptJob } from "./services/run.processor.js";

const redisUrl = new URL(config.redis.url);
const connection = {
  host: redisUrl.hostname || "localhost",
  port: parseInt(redisUrl.port, 10) || 6379,
  password: redisUrl.password || undefined,
};

const runPromptWorker = new Worker(
  QUEUE_NAMES.RUN_PROMPT,
  async (job) => {
    console.log(`Processing job ${job.id}:`, job.data);
    await processRunPromptJob(job.data);
  },
  {
    connection,
    concurrency: 5,
    limiter: {
      max: 10,
      duration: 1000,
    },
  },
);

runPromptWorker.on("completed", (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

runPromptWorker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message);
});

runPromptWorker.on("error", (err) => {
  console.error("Worker error:", err);
});

console.log("Run Prompt Worker started...");

process.on("SIGTERM", async () => {
  console.log("SIGTERM received, closing worker...");
  await runPromptWorker.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, closing worker...");
  await runPromptWorker.close();
  process.exit(0);
});
