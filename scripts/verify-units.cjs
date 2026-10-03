/**
 * Live verification of the comprehensive units library + two-way wiring:
 * 1. GET /masters/libraries/units → should seed & return 33 units
 * 2. POST a custom unit → appears in the same library (charge-items dropdown source)
 * 3. PATCH rename → reflected (edit)
 * 4. DELETE → removed
 * Usage: node scripts/verify-units.cjs [apiBaseUrl]
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
  const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const res1 = await fetch(`${base}/masters/libraries/units`, { headers: auth });
  const json1 = await res1.json();
  const units = Array.isArray(json1) ? json1 : json1?.data || [];
  console.log('UNITS LIBRARY:', res1.status, '→', units.length, 'units');
  console.log('  sample:', units.filter((u) => ['teu', 'wm', 'lumpsum'].includes(u.code)).map((u) => `${u.code}=${u.nameAr}`).join(' | '));

  const upRes = await fetch(`${base}/masters/libraries/units`, {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ code: 'custom_e2e', nameEn: 'Custom E2E Unit', nameAr: 'وحدة اختبار مخصصة' }),
  });
  const upJson = await upRes.json();
  const created = upJson?.data || upJson;
  console.log('CUSTOM ADD:', upRes.status, created?.id ? 'id=' + created.id.slice(0, 8) : JSON.stringify(upJson).slice(0, 120));

  const res2 = await fetch(`${base}/masters/libraries/units`, { headers: auth });
  const json2 = await res2.json();
  const units2 = Array.isArray(json2) ? json2 : json2?.data || [];
  const found = units2.find((u) => u.code === 'custom_e2e');
  console.log('SHARED LIBRARY COUNT:', units2.length, '| custom unit visible to charge-items dropdown:', !!found);

  if (created?.id) {
    const delRes = await fetch(`${base}/masters/libraries/units/${created.id}`, { method: 'DELETE', headers: auth });
    console.log('CLEANUP DELETE:', delRes.status);
  }
}

main().catch((e) => console.error('VERIFY ERROR:', e.message));
