import { Queue } from "bullmq";
import { config } from "../config/index.js";

export const QUEUE_NAMES = {
  RUN_PROMPT: "run_prompt",
  PARSE_RESPONSE: "parse_response",
  RECHECK_FAILED: "recheck_failed",
} as const;

const redisUrl = new URL(config.redis.url);
const defaultQueueOptions = {
  connection: {
    host: redisUrl.hostname || "localhost",
    port: parseInt(redisUrl.port, 10) || 6379,
    password: redisUrl.password || undefined,
  },
};

let runPromptQueue: Queue | null = null;
let parseResponseQueue: Queue | null = null;
let recheckFailedQueue: Queue | null = null;

function getRunPromptQueue() {
  if (!runPromptQueue) {
    runPromptQueue = new Queue(QUEUE_NAMES.RUN_PROMPT, {
      connection: defaultQueueOptions.connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential" as const,
          delay: 5000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });
  }
  return runPromptQueue;
}

function getParseResponseQueue() {
  if (!parseResponseQueue) {
    parseResponseQueue = new Queue(QUEUE_NAMES.PARSE_RESPONSE, {
      connection: defaultQueueOptions.connection,
      defaultJobOptions: {
        attempts: 2,
        backoff: {
          type: "exponential" as const,
          delay: 3000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });
  }
  return parseResponseQueue;
}

function getRecheckFailedQueue() {
  if (!recheckFailedQueue) {
    recheckFailedQueue = new Queue(QUEUE_NAMES.RECHECK_FAILED, {
      connection: defaultQueueOptions.connection,
      defaultJobOptions: {
        attempts: 2,
        backoff: {
          type: "fixed" as const,
          delay: 60000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });
  }
  return recheckFailedQueue;
}

export async function addRunPromptJob(data: {
  runId: string;
  promptId: string;
  engineId: string;
  prompt: string;
  engineName: string;
}) {
  return getRunPromptQueue().add("run_prompt", data, {
    jobId: data.runId,
  });
}

export async function addParseResponseJob(data: {
  responseId: string;
  responseText: string;
  brandName: string;
  domain: string;
  competitorNames: string[];
  competitorDomains: string[];
}) {
  return getParseResponseQueue().add("parse_response", data);
}

export async function addRecheckFailedJob(data: {
  runId: string;
  reason: string;
}) {
  return getRecheckFailedQueue().add("recheck_failed", data, {
    delay: 300000,
  });
}

export async function closeQueues() {
  if (runPromptQueue) await runPromptQueue.close();
  if (parseResponseQueue) await parseResponseQueue.close();
  if (recheckFailedQueue) await recheckFailedQueue.close();
}
