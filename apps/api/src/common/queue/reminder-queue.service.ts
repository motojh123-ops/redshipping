import { Inject, Injectable, Logger, Optional, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import type { RedisOptions } from 'ioredis';

export type ReminderType = 'acid_expiry' | 'demurrage_warning' | 'eta_alert';

export interface ReminderJobPayload {
  type: ReminderType;
  tenantId?: string;
  acidData?: {
    dossierId: string;
    acidNumber: string;
    expiryDate: string;
    clientName?: string;
    shipmentRef?: string;
  };
  demurrageData?: {
    containerNumber: string;
    shipmentRef: string;
    dischargeDate: string;
    freeDays: number;
  };
  etaData?: {
    shipmentId: string;
    trackingNumber: string;
    portOfDischarge: string;
    eta: string;
    clientName?: string;
  };
}

/**
 * Enqueues reminder jobs to the BullMQ `reminders-engine` queue consumed by
 * apps/workers. Fail-soft by design: if Redis is not reachable (e.g. local dev
 * without the docker stack), enqueueing is skipped with a warning and the API
 * request that triggered it still succeeds.
 */
@Injectable()
export class ReminderQueueService implements OnModuleDestroy {
  private readonly logger = new Logger(ReminderQueueService.name);
  private queue: Queue<ReminderJobPayload> | null = null;
  private redisUnavailable = false;

  constructor(
    @Optional() @Inject('QUEUE_REDIS_CONNECTION') connection: RedisOptions | null,
  ) {
    if (!connection) {
      this.logger.warn('REDIS_HOST not configured — reminder jobs disabled (fail-soft)');
      this.redisUnavailable = true;
      return;
    }

    try {
      this.queue = new Queue<ReminderJobPayload>('reminders-engine', {
        connection,
      });
      this.queue.client.then(
        () => this.logger.log('Connected to Redis — reminder jobs enabled'),
        () => {
          this.logger.warn('Redis unreachable — reminder jobs will be skipped (fail-soft)');
          this.redisUnavailable = true;
        },
      );
    } catch (err: any) {
      this.logger.warn(`Reminder queue disabled: ${err?.message}`);
      this.redisUnavailable = true;
    }
  }

  async enqueueReminder(payload: ReminderJobPayload, opts?: { delayMs?: number }): Promise<void> {
    if (!this.queue || this.redisUnavailable) {
      this.logger.warn(`Reminder job skipped (queue unavailable): ${payload.type}`);
      return;
    }
    try {
      await this.queue.add(payload.type, payload, {
        delay: opts?.delayMs,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 250,
        jobId: payload.type === 'acid_expiry'
          ? `acid-${payload.acidData?.dossierId}` // dedupe per dossier
          : undefined,
      });
      this.logger.log(`Reminder job enqueued: ${payload.type}${opts?.delayMs ? ` (delay ${opts.delayMs}ms)` : ''}`);
    } catch (err: any) {
      this.logger.warn(`Failed to enqueue reminder job: ${err?.message}`);
    }
  }

  async onModuleDestroy() {
    if (this.queue) await this.queue.close().catch(() => undefined);
  }
}
