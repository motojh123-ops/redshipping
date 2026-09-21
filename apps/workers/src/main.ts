import { Worker } from 'bullmq';
import Redis from 'ioredis';
import pino from 'pino';
import { config } from './config/index.js';
import { processPdfJob } from './processors/pdf-generation.processor.js';
import { processReminderJob } from './processors/reminders.processor.js';
import { GotenbergService } from './services/gotenberg.service.js';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined,
});

logger.info(
  { host: config.redis.host, port: config.redis.port },
  '🚀 Banna Background Workers initializing on Redis connection'
);

const connection = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  maxRetriesPerRequest: null,
});

connection.on('error', (err) => {
  logger.error({ err }, 'Redis connection error in workers');
});

// Check Gotenberg readiness asynchronously
GotenbergService.checkHealth().then((healthy) => {
  if (healthy) {
    logger.info({ url: config.gotenberg.url }, '✅ Connected to Gotenberg PDF rendering engine');
  } else {
    logger.warn({ url: config.gotenberg.url }, '⚠️ Gotenberg service not reachable yet at configured URL');
  }
});

// 1. PDF Generation Worker (concurrency 3 as mandated by architecture review)
export const pdfWorker = new Worker(
  config.queues.pdf,
  async (job) => {
    logger.info({ jobId: job.id, docType: job.data.documentType, docId: job.data.documentId }, 'Processing PDF generation');
    return await processPdfJob(job);
  },
  {
    connection,
    concurrency: 3,
  }
);

pdfWorker.on('completed', (job, result) => {
  logger.info({ jobId: job.id, file: result.fileName, bytes: result.sizeBytes }, 'PDF generation completed');
});

pdfWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err: err.message }, 'PDF generation failed');
});

// 2. Reminders & Expiry Worker (ACID & Demurrage)
export const remindersWorker = new Worker(
  config.queues.reminders,
  async (job) => {
    logger.info({ jobId: job.id, type: job.data.type }, 'Processing reminder check');
    return await processReminderJob(job);
  },
  {
    connection,
    concurrency: 5,
  }
);

remindersWorker.on('completed', (job, result) => {
  logger.info({ jobId: job.id, type: result.type, alertLevel: result.alertLevel, message: result.message }, 'Reminder check completed');
});

remindersWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err: err.message }, 'Reminder check failed');
});

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  logger.info(`Received ${signal}, closing workers...`);
  await Promise.all([
    pdfWorker.close(),
    remindersWorker.close(),
  ]);
  await connection.quit();
  logger.info('Workers gracefully stopped.');
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
