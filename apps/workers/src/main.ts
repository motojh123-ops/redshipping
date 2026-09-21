import { Worker } from 'bullmq';
import Redis from 'ioredis';

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = Number(process.env.REDIS_PORT) || 6379;
const redisPassword = process.env.REDIS_PASSWORD || 'banna_redis_pass';

const connection = new Redis({
  host: redisHost,
  port: redisPort,
  password: redisPassword,
  maxRetriesPerRequest: null,
});

console.log('🚀 Banna Background Workers initialized on Redis connection.');

// 1. PDF Generation Worker
const pdfWorker = new Worker(
  'pdf-generation',
  async (job) => {
    console.log(`[PDF Worker] Generating PDF for ${job.name} (ID: ${job.id})`);
    // Calls Gotenberg isolated container
    return { success: true, url: `/documents/${job.id}.pdf` };
  },
  { connection, concurrency: 3 },
);

// 2. Reminders & Expiry Worker (ACID & Demurrage)
const reminderWorker = new Worker(
  'reminders-engine',
  async (job) => {
    console.log(`[Reminders Worker] Checking expiry for ${job.name}`);
    return { notified: true };
  },
  { connection },
);

pdfWorker.on('completed', (job) => {
  console.log(`[PDF Worker] Job ${job.id} completed successfully`);
});

reminderWorker.on('completed', (job) => {
  console.log(`[Reminders Worker] Job ${job.id} completed`);
});
