import { Queue, Worker, Job } from 'bullmq';
import { prisma } '
import { config } from '../config/index.js';

export const QUEUE_NAMES = {
  RUN_PROMPT: 'run_prompt',
  PARSE_RESPONSE: 'parse_response',
  RECHECK_FAILED: 'recheck_failed',
} as const;

const defaultQueueOptions = {
  connection: {
    host: config.redis.url.replace('redis://', '').split(':')[0] || 'localhost',
    port: parseInt(config.redis.url.split(':')[2] || '6379', 10),
  },
};

export const runPromptQueue = new Queue(QUEUE_NAMES.RUN_PROMPT, {
  connection: defaultQueueOptions.connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential' as const,
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

export const parseResponseQueue = new Queue(QUEUE_NAMES.PARSE_RESPONSE, {
  connection: defaultQueueOptions.connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'exponential' as const,
      delay: 3000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

export const recheckFailedQueue = new Queue(QUEUE_NAMES.RECHECK_FAILED, {
  connection: defaultQueueOptions.connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'fixed' as const,
      delay: 60000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

export async function addRunPromptJob(data: {
  runId: string;
  promptId: string;
  engineId: string;
  prompt: string;
  engineName: string;
}) {
  return runPromptQueue.add('run_prompt', data, {
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
  return parseResponseQueue.add('parse_response', data);
}

export async function addRecheckFailedJob(data: {
  runId: string;
  reason: string;
}) {
  return recheckFailedQueue.add('recheck_failed', data, {
    delay: 300000,
  });
}

export async function closeQueues() {
  await runPromptQueue.close();
  await parseResponseQueue.close();
  await recheckFailedQueue.close();
}
