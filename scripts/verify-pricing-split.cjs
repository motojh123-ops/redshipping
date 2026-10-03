/**
 * Live verification for the pricing/masters separation:
 * - GET /pricing/tariffs       → lane tariffs (incl. the migrated Maersk one)
 * - GET /pricing/item-rates    → 15 default rates owned by pricing
 * - GET /masters/charge-items  → MUST NOT contain any price fields
 * Usage: node scripts/verify-pricing-split.cjs [apiBaseUrl]
 */
async function main() {
  const base = process.argv[2] || 'https://redshipping-api.omarabdelfattah460.workers.dev/api/v1';

  const loginRes = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@banna-logistics.com', password: 'password123' }),
  });
  const loginJson = await loginRes.json();
  const token = loginJson?.data?.accessToken || loginJson?.accessToken;
  if (!token) return console.log('LOGIN FAILED', loginRes.status);
  const auth = { Authorization: `Bearer ${token}` };

  const tRes = await fetch(`${base}/pricing/tariffs`, { headers: auth });
  const tJson = await tRes.json();
  const tariffs = Array.isArray(tJson) ? tJson : tJson?.data;
  console.log('PRICING /tariffs:', tRes.status, '→', Array.isArray(tariffs) ? tariffs.length + ' tariff(s)' : JSON.stringify(tJson).slice(0, 150));
  if (Array.isArray(tariffs)) {
    tariffs.forEach((t) =>
      console.log(`  - ${t.carrierCode} ${t.originPortCode}→${t.destinationPortCode} buy=${t.buyRate} sell=${t.sellRate} margin=${t.profitMarginPercent}%`),
    );
  }

  const rRes = await fetch(`${base}/pricing/item-rates`, { headers: auth });
  const rJson = await rRes.json();
  const rates = Array.isArray(rJson) ? rJson : rJson?.data;
  console.log('PRICING /item-rates:', rRes.status, '→', Array.isArray(rates) ? rates.length + ' rate(s)' : JSON.stringify(rJson).slice(0, 150));
  if (Array.isArray(rates) && rates[0]) console.log('  sample:', rates[0].chargeItemCode, rates[0].buyRate, rates[0].currency);

  const mRes = await fetch(`${base}/masters/charge-items`, { headers: auth });
  const mJson = await mRes.json();
  const items = Array.isArray(mJson) ? mJson : mJson?.data;
  console.log('MASTERS /charge-items:', mRes.status, '→', Array.isArray(items) ? items.length + ' item(s)' : JSON.stringify(mJson).slice(0, 150));
  if (Array.isArray(items) && items[0]) {
    const keys = Object.keys(items[0]);
    const priceKeys = keys.filter((k) => /price|currency/i.test(k) && k !== 'defaultRate');
    console.log('  price fields in masters response:', priceKeys.length ? priceKeys.join(',') : 'NONE ✓ (price-free)');
    console.log('  has defaultRate relation?', keys.includes('defaultRate') ? 'yes' : 'no (lean rows ✓)');
  }
}

main().catch((e) => console.error('VERIFY ERROR:', e.message));
