import { Worker, JobsOptions, type Job } from 'bullmq';
import pino from 'pino';
import { config } from './config/index.js';
import { processReminderJob } from './processors/reminders.processor.js';
import { processPdfJob } from './processors/pdf-generation.processor.js';
import type { ReminderJobData, ReminderJobResult, PdfJobData, PdfJobResult } from './queues/queue.types.js';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const connection = {
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  maxRetriesPerRequest: null,
};

let shuttingDown = false;

function startWorker<TData, TResult>(
  name: string,
  processor: (job: Job<TData, TResult>) => Promise<TResult>,
): Worker<TData, TResult> {
  const worker = new Worker<TData, TResult>(
    name,
    async (job) => {
      logger.info({ queue: name, jobId: job.id, type: (job.data as any)?.type }, 'Job started');
      const result = await processor(job);
      logger.info({ queue: name, jobId: job.id }, 'Job completed');
      return result;
    },
    {
      connection,
      concurrency: 5,
      // Failed jobs stay visible in BullMQ for inspection instead of being retried forever
      limiter: { max: 50, duration: 1000 },
    },
  );

  worker.on('failed', (job, err) => {
    logger.error({ queue: name, jobId: job?.id, err: err.message }, 'Job failed');
  });

  return worker;
}

async function main() {
  logger.info('Starting Banna workers...');

  const reminderWorker = startWorker<ReminderJobData, ReminderJobResult>(
    config.queues.reminders,
    (job) => processReminderJob(job as Job<ReminderJobData, ReminderJobResult>),
  );

  const pdfWorker = startWorker<PdfJobData, PdfJobResult>(
    config.queues.pdf,
    (job) => processPdfJob(job as Job<PdfJobData, PdfJobResult>),
  );

  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'Shutting down workers...');
    await Promise.allSettled([reminderWorker.close(), pdfWorker.close()]);
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  logger.info({ queues: [config.queues.reminders, config.queues.pdf] }, 'Workers ready and waiting for jobs');
}

main().catch((err) => {
  logger.error({ err: err?.message || err }, 'Workers failed to start');
  process.exit(1);
});
