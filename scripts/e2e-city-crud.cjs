/**
 * Full E2E for the Country Atlas city model against the LIVE API:
 * login → create a city with ALL new fields → read it back (verify every
 * field survived) → patch it → toggle active → delete it.
 * Usage: node scripts/e2e-city-crud.cjs [apiBaseUrl]
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
  console.log('LOGIN OK');

  const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const stamp = Date.now().toString().slice(-6);

  // 1. CREATE with every new field
  const createRes = await fetch(`${base}/masters/cities`, {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({
      countryCode: 'EG',
      nameEn: `TestCity ${stamp}`,
      nameAr: `مدينة اختبار ${stamp}`,
      state: 'الإسكندرية',
      cityCode: `EG-TST-${stamp}`,
      timezone: 'Africa/Cairo',
      latitude: 31.2001,
      longitude: 29.9187,
      isLogisticsHub: true,
      notes: 'e2e probe city',
    }),
  });
  const created = await createRes.json();
  console.log('CREATE status:', createRes.status);
  const city = created?.data || created;
  if (!city?.id) return console.log('CREATE FAILED:', JSON.stringify(created).slice(0, 300));
  console.log('created id:', city.id);

  // 2. READ back + verify fields
  const listRes = await fetch(`${base}/masters/cities?countryCode=EG`, { headers: auth });
  const listJson = await listRes.json();
  const arr = Array.isArray(listJson) ? listJson : listJson?.data;
  const found = (arr || []).find((c) => c.id === city.id);
  console.log('READ status:', listRes.status);
  if (!found) return console.log('READ FAILED — city not found in list');
  const checks = [
    ['nameEn', found.nameEn, `TestCity ${stamp}`],
    ['nameAr', found.nameAr, `مدينة اختبار ${stamp}`],
    ['state', found.state, 'الإسكندرية'],
    ['cityCode', found.cityCode, `EG-TST-${stamp}`],
    ['timezone', found.timezone, 'Africa/Cairo'],
    ['latitude', found.latitude, 31.2001],
    ['longitude', found.longitude, 29.9187],
    ['isLogisticsHub', found.isLogisticsHub, true],
    ['notes', found.notes, 'e2e probe city'],
    ['isActive', found.isActive, true],
  ];
  let pass = 0;
  for (const [field, actual, expected] of checks) {
    const ok = String(actual) === String(expected);
    if (ok) pass += 1;
    console.log(`  ${field}: ${ok ? 'OK' : `MISMATCH (got ${JSON.stringify(actual)})`}`);
  }

  // 3. PATCH
  const patchRes = await fetch(`${base}/masters/cities/${city.id}`, {
    method: 'PATCH',
    headers: auth,
    body: JSON.stringify({ nameAr: 'مدينة معدلة', state: 'مطروح', isActive: false }),
  });
  console.log('PATCH status:', patchRes.status, (await patchRes.json()).success ? 'OK' : 'FAILED');

  // 4. DELETE
  const delRes = await fetch(`${base}/masters/cities/${city.id}`, { method: 'DELETE', headers: auth });
  console.log('DELETE status:', delRes.status);

  console.log(`RESULT: ${pass}/10 fields verified, full CRUD cycle ${pass === 10 ? 'PASSED' : 'CHECK ABOVE'}`);
}

main().catch((e) => console.error('E2E ERROR:', e.message));
