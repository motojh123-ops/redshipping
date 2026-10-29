/**
 * Cleanup: delete ALL auto-created verify test clients (name LIKE 'Prospect Test%').
 * Cascades remove their quotations, branches, contacts and shipment job files.
 * Usage: node scripts/cleanup-verify-client.cjs --all-test
 */
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.join(__dirname, '..', 'apps', 'api', '.env');
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}

async function main() {
  const clientId = process.argv[2];
  loadEnv();
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  try {
    if (clientId && clientId !== '--all-test') {
      const before = await prisma.client.findUnique({ where: { id: clientId }, include: { _count: { select: { quotations: true, branches: true, shipments: true } } } });
      if (!before) { console.log('Client already gone — nothing to clean'); return; }
      await prisma.client.delete({ where: { id: clientId } });
      console.log(`DELETED test client ${clientId} (had ${before._count.quotations} quotations, ${before._count.branches} branches, ${before._count.shipments} shipments — all cascaded)`);
      return;
    }
    // --all-test mode
    const tests = await prisma.client.findMany({
      where: {
        OR: [
          { name: { startsWith: 'Prospect Test' } },
          { name: { startsWith: 'Guard' } },
          { name: { startsWith: 'Gate Test' } },
          { name: { startsWith: 'شركة اختبار مستهدفة' } },
        ],
      },
      select: { id: true, name: true },
    });
    if (!tests.length) { console.log('No test clients found — DB is clean'); return; }
    for (const t of tests) {
      // المرفقات مخزنة polymorphic (entityType/entityId) — لازم تُمسح يدويًا قبل العميل
      await prisma.entityDocument.deleteMany({ where: { entityType: 'client', entityId: t.id } });
      await prisma.client.delete({ where: { id: t.id } });
      console.log(`DELETED ${t.name} (${t.id}) + cascaded children + documents`);
    }
    console.log(`Cleaned ${tests.length} test client(s)`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => { console.error('CLEANUP ERROR:', e.message); process.exit(1); });

