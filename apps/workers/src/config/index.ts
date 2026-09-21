import path from 'path';

export const config = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || 'banna_redis_pass',
  },
  gotenberg: {
    url: process.env.GOTENBERG_URL || 'http://localhost:3000',
    timeoutMs: Number(process.env.GOTENBERG_TIMEOUT_MS) || 30000,
  },
  storage: {
    documentsDir: process.env.DOCUMENTS_DIR || path.resolve(process.cwd(), 'uploads/documents'),
  },
  queues: {
    pdf: 'pdf-generation',
    reminders: 'reminders-engine',
  },
};
