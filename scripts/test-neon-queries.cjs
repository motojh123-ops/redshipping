/**
 * Reproduce the live Worker's deterministic failures locally using the SAME
 * adapter stack (neon serverless Pool + PrismaNeon) and the SAME DATABASE_URL.
 * Compares the routes that work on the worker (charge-items, libraries) with
 * the ones that fail (cities, vendors/drivers) to expose the real error.
 */
const fs = require('fs');
const path = require('path');
const { Pool } = require(path.join(__dirname, '..', 'node_modules', '@neondatabase', 'serverless'));
const { PrismaNeon } = require(path.join(__dirname, '..', 'apps', 'api', 'node_modules', '@prisma', 'adapter-neon'));
const { PrismaClient } = require(path.join(__dirname, '..', 'node_modules', '@prisma', 'client'));

const env = {};
for (const line of fs.readFileSync(path.join(__dirname, '..', 'apps', 'api', '.env'), 'utf8').split(/\r?\n/)) {
  if (line.trim().startsWith('#')) continue;
  const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const adapter = new PrismaNeon(new Pool({ connectionString: env.DATABASE_URL }));
const prisma = new PrismaClient({ adapter });

async function tryQuery(name, fn) {
  try {
    const r = await fn();
    console.log(`${name} → OK (${Array.isArray(r) ? r.length + ' rows' : typeof r})`);
  } catch (e) {
    console.log(`${name} → FAILED: ${e.message}`);
    if (e.meta) console.log('   meta:', JSON.stringify(e.meta).slice(0, 200));
  }
}

(async () => {
  const companies = await prisma.company.findMany({ select: { id: true, name: true } });
  console.log('companies:', companies.map((c) => `${c.name}:${c.id.slice(0, 8)}`).join(' | '));
  const tenantId = companies[0].id;

  await tryQuery('chargeItem.findMany (works on worker)', () =>
    prisma.chargeItem.findMany({ where: { companyId: tenantId } }));
  await tryQuery('measurementUnit.findMany (works on worker)', () =>
    prisma.measurementUnit.findMany({ where: { companyId: tenantId } }));
  await tryQuery('city.findMany (FAILS on worker)', () =>
    prisma.city.findMany({ where: { companyId: tenantId } }));
  await tryQuery('vendor.findMany (expiry-alerts part)', () =>
    prisma.vendor.findMany({ where: { companyId: tenantId, isActive: true } }));
  await tryQuery('driver.findMany (expiry-alerts part)', () =>
    prisma.driver.findMany({ where: { companyId: tenantId, isActive: true } }));

  await prisma.$disconnect();
  process.exit(0);
})().catch((e) => {
  console.error('SCRIPT ERROR:', e.message);
  process.exit(1);
});
