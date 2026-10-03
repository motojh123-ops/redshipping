/**
 * Live verification: port form ↔ atlas wiring + Port Types library
 * 1. port-types library → 8 defaults incl. land_crossing & freezone (self-healed)
 * 2. add an atlas city (EG), then a port LINKED to it via cityId
 * 3. read the port back → cityRef shows the linked city + type label
 * 4. country filter returns the port (atlas drill-down source)
 * Usage: node scripts/verify-port-atlas.cjs [apiBaseUrl]
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
  if (!token) return console.log('LOGIN FAILED');
  const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // 1. port types library
  const ptRes = await fetch(`${base}/masters/libraries/port-types`, { headers: auth });
  const ptJson = await ptRes.json();
  const types = Array.isArray(ptJson) ? ptJson : ptJson?.data || [];
  console.log('PORT TYPES LIBRARY:', ptRes.status, '→', types.length, 'types');
  console.log('  codes:', types.map((t) => t.code).join(','));

  // 2. city + linked port
  const cityRes = await fetch(`${base}/masters/cities`, {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ countryCode: 'EG', nameEn: `PortLinkCity ${Date.now().toString().slice(-5)}`, nameAr: 'مدينة ربط ميناء' }),
  });
  const cityJson = await cityRes.json();
  const city = cityJson?.data || cityJson;
  if (!city?.id) return console.log('CITY CREATE FAILED:', JSON.stringify(cityJson).slice(0, 150));
  console.log('ATLAS CITY:', cityRes.status, 'id=' + city.id.slice(0, 8), `(${city.countryCode})`);

  const portRes = await fetch(`${base}/masters/ports`, {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({
      code: `EG${Date.now().toString(36).toUpperCase().slice(-3)}P`.slice(0, 5),
      nameEn: 'E2E Linked Port',
      nameAr: 'ميناء ربط اختباري',
      countryCode: 'EG',
      portType: 'sea',
      cityId: city.id,
    }),
  });
  const portJson = await portRes.json();
  const port = portJson?.data || portJson;
  console.log('PORT CREATE (with cityId):', portRes.status, port?.id ? 'id=' + port.id.slice(0, 8) : JSON.stringify(portJson).slice(0, 150));

  // 3. read back with cityRef
  const listRes = await fetch(`${base}/masters/ports?countryCode=EG`, { headers: auth });
  const listJson = await listRes.json();
  const list = Array.isArray(listJson) ? listJson : listJson?.data || [];
  const found = list.find((p) => p.id === port?.id);
  console.log('READ-BACK via atlas country filter:', found ? 'FOUND' : 'NOT FOUND');
  console.log('  linked city (cityRef):', found?.cityRef?.nameAr || found?.cityRef?.nameEn || '—');
  console.log('  port type ref:', found?.portTypeRef?.nameAr || found?.portTypeRef?.nameEn || found?.portType);

  // consistency check: city from another country must be rejected
  const badRes = await fetch(`${base}/masters/ports`, {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ code: 'XX999', nameEn: 'Bad Country Port', countryCode: 'SA', cityId: city.id }),
  });
  console.log('COUNTRY/CITY MISMATCH REJECTED:', badRes.status, '(expected 400)');

  // cleanup
  if (port?.id) {
    const dp = await fetch(`${base}/masters/ports/${port.id}`, { method: 'DELETE', headers: { Authorization: auth.Authorization } });
    console.log('cleanup port:', dp.status);
  }
  const dc = await fetch(`${base}/masters/cities/${city.id}`, { method: 'DELETE', headers: { Authorization: auth.Authorization } });
  console.log('cleanup city:', dc.status);
}

main().catch((e) => console.error('VERIFY ERROR:', e.message));
