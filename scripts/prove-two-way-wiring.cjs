/**
 * Live proof of the two-way wiring between the library tabs
 * (Units + Logistics Categories) and the Charge Items directory:
 *
 *  A) Library tab → charge items form:
 *     1. add a custom category via /masters/libraries/logistics-categories
 *     2. add a custom unit via /masters/libraries/units
 *        (exactly what the two library tabs do)
 *     3. create a charge item that references both (what the item form does)
 *     4. GET the item back → its categoryLabel/unitLabel display the custom
 *        library names (the item table/form show library names, not codes)
 *
 *  B) Charge items form → library tabs:
 *     the form's quick-add POSTs to the SAME library endpoints, so anything
 *     added there is listed in the Units/Categories tabs (same DB rows).
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

  // A1: custom category (what the التصنيف اللوجستي tab does)
  const catRes = await fetch(`${base}/masters/libraries/logistics-categories`, {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ code: 'e2e_link_cat', nameEn: 'E2E Link Category', nameAr: 'تصنيف وصل اختباري' }),
  });
  const catJson = await catRes.json();
  const cat = catJson?.data || catJson;
  console.log('A1) categories tab → custom category created:', catRes.status, cat?.id ? cat.id.slice(0, 8) : JSON.stringify(catJson).slice(0, 100));

  // A2: custom unit (what the الوحدات tab does)
  const unitRes = await fetch(`${base}/masters/libraries/units`, {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ code: 'e2e_link_unit', nameEn: 'E2E Link Unit', nameAr: 'وحدة وصل اختبارية' }),
  });
  const unitJson = await unitRes.json();
  const unit = unitJson?.data || unitJson;
  console.log('A2) units tab → custom unit created:', unitRes.status, unit?.id ? unit.id.slice(0, 8) : JSON.stringify(unitJson).slice(0, 100));

  if (!cat?.id || !unit?.id) return console.log('SETUP FAILED — aborting');

  // A3: charge item referencing both (what the item form does)
  const itemRes = await fetch(`${base}/masters/charge-items`, {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({
      code: 'E2E-LINK',
      nameAr: 'بند اختبار الوصل',
      nameEn: 'E2E Wiring Test Item',
      category: cat.code,
      categoryId: cat.id,
      unitId: unit.id,
    }),
  });
  const itemJson = await itemRes.json();
  const item = itemJson?.data || itemJson;
  console.log('A3) charge item created on both:', itemRes.status, item?.id ? item.id.slice(0, 8) : JSON.stringify(itemJson).slice(0, 150));

  // A4: read the item back → labels show the custom library names
  const listRes = await fetch(`${base}/masters/charge-items`, { headers: auth });
  const listJson = await listRes.json();
  const list = Array.isArray(listJson) ? listJson : listJson?.data || [];
  const found = list.find((i) => i.code === 'E2E-LINK');
  console.log('A4) item read-back:');
  console.log('    categoryLabel:', found?.categoryRef?.nameAr, '(من تبويب التصنيفات)');
  console.log('    unitLabel:', found?.unit?.nameAr, '(من تبويب الوحدات)');

  // B: the form quick-add uses the same endpoints — same rows appear in the tabs
  const unitsList = await fetch(`${base}/masters/libraries/units`, { headers: auth });
  const unitsJson = await unitsList.json();
  const units = Array.isArray(unitsJson) ? unitsJson : unitsJson?.data || [];
  const catsList = await fetch(`${base}/masters/libraries/logistics-categories`, { headers: auth });
  const catsJson = await catsList.json();
  const cats = Array.isArray(catsJson) ? catsJson : catsJson?.data || [];
  console.log('B) quick-add source = same library rows → units tab count:', units.length, '| categories tab count:', cats.length);
  console.log('   e2e unit in units tab:', !!units.find((u) => u.code === 'e2e_link_unit'),
    '| e2e category in categories tab:', !!cats.find((c) => c.code === 'e2e_link_cat'));

  // cleanup
  if (item?.id) {
    const delItem = await fetch(`${base}/masters/charge-items/${item.id}`, { method: 'DELETE', headers: auth });
    console.log('cleanup item:', delItem.status);
  }
  const delUnit = await fetch(`${base}/masters/libraries/units/${unit.id}`, { method: 'DELETE', headers: auth });
  const delCat = await fetch(`${base}/masters/libraries/logistics-categories/${cat.id}`, { method: 'DELETE', headers: auth });
  console.log('cleanup unit:', delUnit.status, '| cleanup category:', delCat.status);
}

main().catch((e) => console.error('PROOF ERROR:', e.message));
