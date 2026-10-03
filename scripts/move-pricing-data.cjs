/**
 * One-shot data migration: MOVE all pricing data out of the masters
 * charge_items table into the pricing-owned tables.
 *  1. tariff squatter rows (notes containing 'tariff:{json}') → tariffs,
 *     then the squatter charge item is DELETED from masters.
 *  2. default prices of real charge items → item_default_rates.
 * Run AFTER migration 20260930120000_pricing_module_tariffs and BEFORE
 * migration 20260930130000_masters_price_free (which drops the columns).
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

const prisma = new PrismaClient({ adapter: new PrismaNeon(new Pool({ connectionString: env.DATABASE_URL })) });
const TARIFF_KEY = 'tariff:';

(async () => {
  const all = await prisma.chargeItem.findMany();
  const squatters = all.filter((c) => (c.notes || '').includes(TARIFF_KEY));
  const realItems = all.filter((c) => !(c.notes || '').includes(TARIFF_KEY));

  // 1. move tariff squatters → tariffs, delete from masters
  for (const s of squatters) {
    let meta = {};
    try {
      const line = (s.notes || '').split('\n').find((l) => l.startsWith(TARIFF_KEY));
      if (line) meta = JSON.parse(line.slice(TARIFF_KEY.length));
    } catch {
      /* defaults below */
    }
    const remarks = (s.notes || '')
      .split('\n')
      .filter((l) => l && !l.startsWith(TARIFF_KEY))
      .join(' ');
    const d = (v) => (v ? new Date(v) : null);
    const created = await prisma.tariff.create({
      data: {
        companyId: s.companyId,
        category: meta.category || 'ocean',
        carrierCode: meta.carrierCode || s.code,
        carrierName: s.nameEn,
        originPortCode: meta.originPortCode || '—',
        originPortName: meta.originPortName || '—',
        destinationPortCode: meta.destinationPortCode || '—',
        destinationPortName: meta.destinationPortName || '—',
        containerType: meta.containerType || '40HQ',
        currency: s.defaultCurrency || 'USD',
        buyRate: s.defaultPrice ?? 0,
        sellRate: s.defaultSellPrice ?? s.defaultPrice ?? 0,
        transitDaysEstimated: meta.transitDaysEstimated || 25,
        freeDaysAllowed: meta.freeDaysAllowed || 14,
        validFrom: d(meta.validFrom),
        validTo: d(meta.validTo),
        remarks: remarks || null,
        isActive: s.isActive,
      },
    });
    await prisma.chargeItem.delete({ where: { id: s.id } });
    console.log(`TARIFF MOVED: ${s.code} (${s.nameEn}) → tariff ${created.id.slice(0, 8)} | masters row deleted`);
  }

  // 2. move real charge item default prices → item_default_rates
  let moved = 0;
  for (const ci of realItems) {
    const buy = ci.defaultPrice;
    const sell = ci.defaultSellPrice ?? ci.defaultPrice;
    if (buy === null && sell === null) continue;
    await prisma.itemDefaultRate.upsert({
      where: { chargeItemId: ci.id },
      create: {
        companyId: ci.companyId,
        chargeItemId: ci.id,
        currency: ci.defaultCurrency || 'USD',
        buyRate: buy ?? 0,
        sellRate: sell ?? 0,
      },
      update: { currency: ci.defaultCurrency || 'USD', buyRate: buy ?? 0, sellRate: sell ?? 0 },
    });
    moved += 1;
  }
  console.log(`ITEM RATES MOVED: ${moved} → item_default_rates`);

  const t = await prisma.tariff.count();
  const r = await prisma.itemDefaultRate.count();
  console.log(`VERIFY: tariffs=${t} | item_default_rates=${r}`);
  await prisma.$disconnect();
  process.exit(0);
})().catch((e) => {
  console.error('MOVE ERROR:', e.message);
  process.exit(1);
});
