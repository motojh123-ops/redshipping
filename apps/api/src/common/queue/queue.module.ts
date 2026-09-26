import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import IORedis from 'ioredis';
import { ReminderQueueService } from './reminder-queue.service';

/**
 * Registers the shared Redis connection config used by BullMQ producers.
 * Registered only when REDIS_HOST is configured so local dev without Redis
 * keeps working (ReminderQueueService then runs in disabled mode).
 */
@Global()
@Module({
  providers: [
    {
      provide: 'QUEUE_REDIS_CONNECTION',
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        // Managed Redis providers (Render Key Value, Upstash, Redis Cloud…) expose
        // a single REDIS_URL connection string — parse it into ioredis options.
        const redisUrl = process.env.REDIS_URL || config.get<string>('REDIS_URL');
        if (redisUrl) {
          const parsed = new URL(redisUrl);
          return {
            host: parsed.hostname,
            port: Number(parsed.port || 6379),
            username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
            password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
            tls: parsed.protocol === 'rediss:' ? {} : undefined,
            maxRetriesPerRequest: null,
            enableOfflineQueue: false,
          };
        }

        const redisHost = process.env.REDIS_HOST || config.get('REDIS_HOST');
        if (!redisHost) return null;
        return {
          host: redisHost,
          port: Number(process.env.REDIS_PORT || config.get('REDIS_PORT')) || 6379,
          password: process.env.REDIS_PASSWORD || config.get('REDIS_PASSWORD') || 'banna_redis_pass',
          maxRetriesPerRequest: null,
          enableOfflineQueue: false,
        };
      },
    },
    ReminderQueueService,
  ],
  exports: [ReminderQueueService],
})
export class QueueModule {}
