import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';

function getPrismaOptions() {
  const connectionString = process.env.DATABASE_URL;
  if (connectionString && connectionString.includes('neon.tech')) {
    try {
      if (typeof (globalThis as any).WebSocket === 'undefined') {
        try {
          neonConfig.webSocketConstructor = require('ws');
        } catch (_) {}
      }
      const pool = new Pool({ connectionString });
      const adapter = new PrismaNeon(pool);
      return { adapter };
    } catch (err: any) {
      console.warn('Neon adapter init error, falling back:', err?.message);
    }
  }
  return {};
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super(getPrismaOptions());
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Connected to PostgreSQL 16 database successfully.');
    } catch (err: any) {
      this.logger.warn(`PostgreSQL connection deferred: ${err.message}. Server starting in Resilient API mode.`);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Disconnected from PostgreSQL database.');
  }

  /**
   * Executes an operation inside a PostgreSQL transaction with tenant RLS context set.
   * Mandated by Architecture Review v3 to prevent cross-tenant leakage.
   */
  async withTenant<T>(
    tenantId: string,
    operation: (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>,
  ): Promise<T> {
    return this.$transaction(async (tx) => {
      // Set PostgreSQL session variable for current transaction only
      await tx.$executeRawUnsafe(`SET LOCAL app.current_tenant_id = '${tenantId}'`);
      return operation(tx as any);
    });
  }
}
