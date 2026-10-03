/**
 * One-shot backfill: ensure the legacy category codes exist in the masters
 * logistics-categories library, then link every charge item that still has
 * no categoryId to its matching library category (by code, tenant-scoped).
 * Run once against the live DB. Usage: node scripts/link-charge-categories.cjs
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

const CATEGORIES = [
  { code: 'freight', nameEn: 'Ocean Freight', nameAr: 'نولون بحري' },
  { code: 'origin_charges', nameEn: 'Origin Charges', nameAr: 'مصاريف ميناء المنشأ' },
  { code: 'destination_charges', nameEn: 'Destination Charges', nameAr: 'مصاريف ميناء الوصول' },
  { code: 'customs_clearance', nameEn: 'Customs Clearance', nameAr: 'تخليص جمركي' },
  { code: 'inland_haulage', nameEn: 'Inland Haulage', nameAr: 'نقل بري داخلي' },
  { code: 'other', nameEn: 'Other', nameAr: 'أخرى' },
];

(async () => {
  const companies = await prisma.company.findMany({ select: { id: true } });
  for (const company of companies) {
    // ensure categories exist
    const catMap = new Map();
    for (const c of CATEGORIES) {
      let cat = await prisma.logisticsCategory.findFirst({ where: { companyId: company.id, code: c.code } });
      if (!cat) {
        cat = await prisma.logisticsCategory.create({ data: { companyId: company.id, ...c } });
        console.log(`seeded category: ${c.code}`);
      }
      catMap.set(c.code, cat.id);
    }
    // link items
    const unlinked = await prisma.chargeItem.findMany({
      where: { companyId: company.id, categoryId: null },
      select: { id: true, category: true },
    });
    let linked = 0;
    for (const item of unlinked) {
      const catId = catMap.get(item.category);
      if (!catId) continue;
      await prisma.chargeItem.update({ where: { id: item.id }, data: { categoryId: catId } });
      linked += 1;
    }
    console.log(`company ${company.id.slice(0, 8)}: linked ${linked}/${unlinked.length} items`);
  }
  await prisma.$disconnect();
  process.exit(0);
})().catch((e) => {
  console.error('BACKFILL ERROR:', e.message);
  process.exit(1);
});
