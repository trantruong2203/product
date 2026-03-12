/**
 * Script xoá sạch BullMQ queues trong Redis (waiting/active/delayed/failed/completed).
 * Cách dùng: npx tsx src/scripts/clearQueues.ts
 */
import { Queue } from "bullmq";
import { config } from "../config/index.js";
import { QUEUE_NAMES } from "../services/queue.service.js";

function getConnection() {
  const redisUrl = new URL(config.redis.url);
  return {
    host: redisUrl.hostname || "localhost",
    port: Number.parseInt(redisUrl.port, 10) || 6379,
    password: redisUrl.password || undefined,
  };
}

async function clearQueue(name: string) {
  const queue = new Queue(name, { connection: getConnection() });

  try {
    const before = await queue.getJobCounts(
      "waiting",
      "active",
      "delayed",
      "paused",
      "completed",
      "failed",
    );
    console.log(`\n📦 Queue ${name} before:`, before);

    // Force obliterate: removes all jobs and related data.
    await queue.obliterate({ force: true });

    const after = await queue.getJobCounts(
      "waiting",
      "active",
      "delayed",
      "paused",
      "completed",
      "failed",
    );
    console.log(`🧹 Queue ${name} after:`, after);
  } finally {
    await queue.close();
  }
}

async function main() {
  console.log("🗑️  Clearing BullMQ queues...");
  const names = Object.values(QUEUE_NAMES);
  for (const name of names) {
    await clearQueue(name);
  }
  console.log("\n🎉 Done. All queues cleared.");
}

void (async () => {
  try {
    await main();
    process.exit(0);
  } catch (err) {
    console.error("❌ Failed to clear queues:", err);
    process.exit(1);
  }
})();

