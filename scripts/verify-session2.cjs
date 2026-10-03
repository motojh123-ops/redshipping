/**
 * Live verification of the session-2 features:
 * 1. logistics-categories library (with the newly seeded legacy codes)
 * 2. charge items carry Arabic category labels (categoryRef linked)
 * 3. ports country filter (atlas linkage)
 * 4. documents endpoints (list empty for a vendor, upload/download/delete
 *    cycle with a tiny base64 payload)
 * Usage: node scripts/verify-session2.cjs [apiBaseUrl]
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
  console.log('LOGIN OK');

  // 1. categories library
  const catsRes = await fetch(`${base}/masters/libraries/logistics-categories`, { headers: auth });
  const catsJson = await catsRes.json();
  const cats = Array.isArray(catsJson) ? catsJson : catsJson?.data;
  console.log('CATEGORIES:', catsRes.status, '→', Array.isArray(cats) ? cats.length + ' items' : '??');
  if (Array.isArray(cats)) {
    console.log('  codes:', cats.map((c) => c.code).join(','));
    console.log('  Arabic sample:', cats.filter((c) => c.code === 'customs_clearance')[0]?.nameAr);
  }

  // 2. charge items → Arabic labels
  const itemsRes = await fetch(`${base}/masters/charge-items`, { headers: auth });
  const itemsJson = await itemsRes.json();
  const items = Array.isArray(itemsJson) ? itemsJson : itemsJson?.data;
  if (Array.isArray(items)) {
    const sample = items.find((i) => i.code === 'CUS-CLR');
    console.log('CHARGE ITEMS:', itemsRes.status, '→ sample CUS-CLR label:', sample?.categoryRef?.nameAr || 'MISSING');
  }

  // 3. ports country filter
  const portsRes = await fetch(`${base}/masters/ports?countryCode=EG`, { headers: auth });
  const portsJson = await portsRes.json();
  const ports = Array.isArray(portsJson) ? portsJson : portsJson?.data;
  const allEG = Array.isArray(ports) && ports.every((p) => p.countryCode === 'EG');
  console.log('PORTS ?countryCode=EG:', portsRes.status, '→', Array.isArray(ports) ? ports.length + ' ports, all EG: ' + allEG : '??');

  // 4. documents cycle on the first vendor
  const vendorsRes = await fetch(`${base}/masters/vendors`, { headers: auth });
  const vendorsJson = await vendorsRes.json();
  const vendors = Array.isArray(vendorsJson) ? vendorsJson : vendorsJson?.data;
  if (!Array.isArray(vendors) || !vendors[0]) {
    console.log('DOCS: no vendor found to test with — skipping cycle');
    return;
  }
  const vendor = vendors[0];
  const listRes = await fetch(`${base}/masters/documents?entityType=vendor&entityId=${vendor.id}`, { headers: auth });
  const listJson = await listRes.json();
  console.log('DOCS LIST:', listRes.status, '→', (Array.isArray(listJson) ? listJson : listJson?.data || []).length, 'docs for vendor', vendor.name);

  const upRes = await fetch(`${base}/masters/documents`, {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({
      entityType: 'vendor',
      entityId: vendor.id,
      category: 'commercial_reg',
      fileName: 'e2e-test.txt',
      mimeType: 'text/plain',
      dataBase64: Buffer.from('session-2 e2e attachment test').toString('base64'),
    }),
  });
  const upJson = await upRes.json();
  const doc = upJson?.data || upJson;
  console.log('DOCS UPLOAD:', upRes.status, doc?.id ? 'id=' + doc.id.slice(0, 8) : JSON.stringify(upJson).slice(0, 120));

  if (doc?.id) {
    const dlRes = await fetch(`${base}/masters/documents/${doc.id}/download`, { headers: auth });
    const dlJson = await dlRes.json();
    const payload = dlJson?.data || dlJson;
    const text = payload?.data ? Buffer.from(payload.data, 'base64').toString('utf8') : '';
    console.log('DOCS DOWNLOAD:', dlRes.status, '→ roundtrip:', text.includes('session-2 e2e') ? 'MATCHED ✓' : text.slice(0, 40));
    const delRes = await fetch(`${base}/masters/documents/${doc.id}`, { method: 'DELETE', headers: auth });
    console.log('DOCS DELETE:', delRes.status);
  }
}

main().catch((e) => console.error('VERIFY ERROR:', e.message));
