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
