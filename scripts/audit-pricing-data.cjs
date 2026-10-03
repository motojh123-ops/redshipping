/** Pre-migration audit: tariff squatter rows & priced charge items in live DB */
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

const prisma = new PrismaClient({ adapter: new PrismaNeon(new Pool({ connectionString: env.DATABASE_URL })) });

(async () => {
  const all = await prisma.chargeItem.findMany({
    select: { id: true, code: true, nameEn: true, notes: true, defaultPrice: true, defaultSellPrice: true, defaultCurrency: true },
  });
  const squatters = all.filter((c) => (c.notes || '').includes('tariff:'));
  const priced = all.filter((c) => c.defaultPrice !== null || c.defaultSellPrice !== null);
  console.log('total charge items:', all.length);
  console.log('tariff squatter rows (tariff: in notes):', squatters.length);
  squatters.forEach((s) => console.log('  -', s.code, '|', s.nameEn, '| price:', String(s.defaultPrice), s.defaultCurrency));
  console.log('items with prices:', priced.length);
  console.log('sample:', priced.slice(0, 3).map((p) => `${p.code}=${String(p.defaultPrice)} ${p.defaultCurrency}`).join(', '));
  await prisma.$disconnect();
  process.exit(0);
})().catch((e) => {
  console.error('AUDIT ERROR:', e.message);
  process.exit(1);
});
