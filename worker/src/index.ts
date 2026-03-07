import { Worker } from 'bullmq';
import { config } from './config/index.js';
import { runPromptJob, RunPromptJobData } from './jobs/runPrompt.js';
import { browserPool } from './browsers/browserPool.js';

const connection = {
  host: config.redis.url.replace('redis://', '').split(':')[0] || 'localhost',
  port: parseInt(config.redis.url.split(':')[2] || '6379', 10),
};

const runPromptWorker = new Worker<RunPromptJobData>('run_prompt', async job => {
  await runPromptJob(job);
}, {
  connection,
  concurrency: 2,
  limiter: {
    max: 5,
    duration: 60000,
  },
});

runPromptWorker.on('completed', job => {
  console.log(`Job ${job.id} completed`);
});

runPromptWorker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message);
});

runPromptWorker.on('error', err => {
  console.error('Worker error:', err);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down workers...');
  await runPromptWorker.close();
  await browserPool.closeAll();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Shutting down workers...');
  await runPromptWorker.close();
  await browserPool.closeAll();
  process.exit(0);
});

console.log('Worker started, waiting for jobs...');
