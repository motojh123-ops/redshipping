import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';

/** Detects failures caused by a reaped/stale WebSocket or an ended Pool
 *  (Neon closes idle sockets while a Cloudflare Workers isolate sleeps between requests). */
const isStaleConnectionError = (e: any) =>
  typeof e?.message === 'string' &&
  /connection (terminated|closed)|socket (hung|closed)|went away|calling end on the pool|terminating connection/i.test(
    e.message,
  );

/**
 * PrismaNeon with automatic Pool replacement and single retry when a query
 * lands on a stale WebSocket connection or an ended Pool.
 * Key invariant: replace `this.client` SYNCHRONOUSLY before any async cleanup
 * so concurrent/subsequent requests never see an ended Pool.
 */
class ResilientPrismaNeon extends PrismaNeon {
  private readonly makePool: () => Pool;

  constructor(makePool: () => Pool) {
    super(makePool());
    this.makePool = makePool;
  }

  private rotatePool(failedPool: unknown) {
    // Only rotate if another concurrent query hasn't already replaced the pool
    if ((this as any).client === failedPool) {
      (this as any).client = this.makePool();
      try {
        // Fire-and-forget: never await .end() on a dead WebSocket in Workers
        void (failedPool as Pool).end().catch(() => {});
      } catch {
        /* ignore */
      }
    }
  }

  private ensureActivePool() {
    const cur: any = (this as any).client;
    if (!cur || cur.ended || cur._ending) {
      (this as any).client = this.makePool();
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async performIO(query: any): Promise<any> {
    this.ensureActivePool();
    const poolUsed = (this as any).client;
    try {
      return await super.performIO(query);
    } catch (e: any) {
      if (!isStaleConnectionError(e)) throw e;
      this.rotatePool(poolUsed);
      return super.performIO(query);
    }
  }

  async transactionContext(): Promise<any> {
    this.ensureActivePool();
    const poolUsed = (this as any).client;
    try {
      return await super.transactionContext();
    } catch (e: any) {
      if (!isStaleConnectionError(e)) throw e;
      this.rotatePool(poolUsed);
      return super.transactionContext();
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
