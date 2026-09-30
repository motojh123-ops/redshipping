import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';

/** Detects failures caused by a reaped/stale WebSocket (Neon closes idle
 *  sockets while a Cloudflare Workers isolate sleeps between requests). */
const isStaleConnectionError = (e: any) =>
  typeof e?.message === 'string' &&
  /connection (terminated|closed)|socket (hung|closed)|went away/i.test(e.message);

/**
 * PrismaNeon with a single automatic retry on a brand-new Pool when a query
 * lands on a stale WebSocket connection. The failed query never reached the
 * database (the socket was already dead), so the retry is idempotent-safe.
 */
class ResilientPrismaNeon extends PrismaNeon {
  private readonly makePool: () => Pool;

  constructor(makePool: () => Pool) {
    super(makePool());
    this.makePool = makePool;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async performIO(query: any): Promise<any> {
    try {
      return await super.performIO(query);
    } catch (e: any) {
      if (!isStaleConnectionError(e)) throw e;
      try {
        await (this.client as unknown as Pool).end();
      } catch {
        /* the old pool is already dead — nothing to close */
      }
      (this as any).client = this.makePool();
      return super.performIO(query);
    }
  }
}

function getPrismaOptions() {
  const connectionString = process.env.DATABASE_URL;
  if (connectionString && connectionString.includes('neon.tech')) {
    try {
      if (typeof (globalThis as any).WebSocket === 'undefined') {
        try {
          neonConfig.webSocketConstructor = require('ws');
        } catch (_) {}
      }
      const makePool = () => new Pool({ connectionString });
      const adapter = new ResilientPrismaNeon(makePool);
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
   *
   * ⚠️ NOT usable with the Neon HTTP adapter (transactions are unsupported in
   * HTTP mode) — only works with engine-based deployments (local dev).
   * Currently unused by any module; do not call from Workers-served code paths.
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
