/**
 * Negative guard probes (طبقة الـ Logic debugging) — نضرب الـ API بحالات
 * غلط متعمدة ونتحقق إن كل guard بيرفضها بالحالة الصحيحة (400) بدل ما
 * يكمل بصمت ويفسد البيانات. ثم ننضف بيانات الاختبار.
 * Usage: node scripts/probe-clients-ops-guards.cjs [apiBaseUrl]
 */
const BASE = process.argv[2] || 'https://redshipping-api.omarabdelfattah460.workers.dev/api/v1';
let failures = 0;

const log = (ok, label, extra = '') => {
  console.log(`${ok ? '✓' : '✗'} ${label}${extra ? ' — ' + extra : ''}`);
  if (!ok) failures++;
};

async function api(method, path, token, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: res.status, json: await res.json().catch(() => null) };
}

async function main() {
  const login = await api('POST', '/auth/login', null, {
    email: 'admin@banna-logistics.com',
    password: 'password123',
  });
  const token = login.json?.data?.accessToken || login.json?.accessToken || login.json?.data?.token;
  log(!!token, 'Login as seeded admin');
  if (!token) return;

  const types = await api('GET', '/masters/libraries/company-types', token);
  const typesArr = Array.isArray(types.json) ? types.json : types.json?.data || [];
  const sectors = await api('GET', '/masters/libraries/industry-sectors', token);
  const sectorsArr = Array.isArray(sectors.json) ? sectors.json : sectors.json?.data || [];

  const stamp = Date.now().toString().slice(-6);

  // G1: مرجعية وهمية (UUID مش موجود في مكتبة أنواع الشركات)
  const g1 = await api('POST', '/clients', token, {
    name: `Guard A ${stamp}`,
    nameAr: `اختبار حماية أ ${stamp}`,
    companyTypeId: '00000000-0000-4000-8000-000000000000',
    industrySectorId: sectorsArr[0]?.id,
    type: 'lead',
  });
  log(
    g1.status === 400,
    'G1: fake companyTypeId rejected with 400',
    `got ${g1.status} — ${String(g1.json?.message || g1.json?.error?.message || '').slice(0, 70)}`,
  );

  // Setup: عميلان + فرع تحميل على A
  const a = await api('POST', '/clients', token, {
    name: `Guard A ${stamp}`,
    nameAr: `اختبار حماية أ ${stamp}`,
    companyTypeId: typesArr[0]?.id,
    industrySectorId: sectorsArr[0]?.id,
    city: 'القاهرة',
    country: 'مصر',
    phone: '+201000000111',
    type: 'lead',
  });
  const clientA = a.json?.data || a.json;
  log(a.status === 201 && !!clientA?.id, 'setup: client A created');

  const b = await api('POST', '/clients', token, {
    name: `Guard B ${stamp}`,
    nameAr: `اختبار حماية ب ${stamp}`,
    companyTypeId: typesArr[0]?.id,
    industrySectorId: sectorsArr[0]?.id,
    city: 'الإسكندرية',
    country: 'مصر',
    type: 'lead',
  });
  const clientB = b.json?.data || b.json;
  log(b.status === 201 && !!clientB?.id, 'setup: client B created');

  const br = await api('POST', `/clients/${clientA.id}/branches`, token, {
    name: 'مخزن الحماية',
    city: 'القاهرة',
    isLoadingAddress: true,
  });
  const branchA = br.json?.data || br.json;
  log(br.status === 201 && !!branchA?.id, 'setup: loading-address branch on A');

  // G2: أنواع خدمة غير صالحة بالكامل
  const g2 = await api('POST', '/quotations', token, {
    clientId: clientA.id,
    serviceTypes: ['banana'],
    shipmentType: 'fcl',
    incoterm: 'FOB',
    items: [],
  });
  log(g2.status === 400, 'G2: invalid serviceTypes rejected with 400', `got ${g2.status} — ${String(g2.json?.message || '').slice(0, 70)}`);

  // G3: فرع تحميل تابع لعميل آخر (tenant guard)
  const g3 = await api('POST', '/quotations', token, {
    clientId: clientB.id,
    serviceTypes: ['transport'],
    pickupBranchId: branchA.id,
    shipmentType: 'fcl',
    incoterm: 'FOB',
    items: [],
  });
  log(g3.status === 400, 'G3: cross-client pickup branch rejected with 400', `got ${g3.status} — ${String(g3.json?.message || '').slice(0, 70)}`);


  // G4: قبول مزدوج لنفس العرض
  const off = await api('POST', '/quotations', token, {
    clientId: clientA.id,
    serviceTypes: ['shipping'],
    shipmentType: 'fcl',
    incoterm: 'FOB',
    items: [],
  });
  const q1 = off.json?.data || off.json;
  log(off.status === 201 && !!q1?.id, 'setup: offer q1 for A', q1?.quotationNumber);

  const acc1 = await api('POST', `/quotations/${q1.id}/accept`, token);
  const shp = acc1.json?.data || acc1.json;
  log(acc1.status === 201 && !!shp?.jobFileNumber, 'accept q1 opens Job File', shp?.jobFileNumber);

  const acc2 = await api('POST', `/quotations/${q1.id}/accept`, token);
  log(acc2.status === 400, 'G4: double-accept rejected with 400', `got ${acc2.status} — ${String(acc2.json?.message || '').slice(0, 70)}`);

  // G5: حارس الترقية — قبول عرض تاني لعميل فعلي ما بيلغّيش مصدر التحويل
  const after1 = await api('GET', `/clients/${clientA.id}`, token);
  const cA1 = after1.json?.data || after1.json;
  log(cA1?.status === 'active' && cA1?.convertedFromQuotationId === q1.id, 'A promoted with conversion source q1', `status=${cA1?.status}`);

  const off2 = await api('POST', '/quotations', token, {
    clientId: clientA.id,
    serviceTypes: ['clearance'],
    shipmentType: 'fcl',
    incoterm: 'FOB',
    items: [],
  });
  const q2 = off2.json?.data || off2.json;
  await api('POST', `/quotations/${q2.id}/accept`, token);
  const after2 = await api('GET', `/clients/${clientA.id}`, token);
  const cA2 = after2.json?.data || after2.json;
  log(
    cA2?.status === 'active' && cA2?.convertedFromQuotationId === q1.id,
    'G5: re-accept on active client does NOT overwrite conversion source',
    `source=${String(cA2?.convertedFromQuotationId).slice(0, 8)} (expected q1=${String(q1.id).slice(0, 8)})`,
  );

  // G6: PATCH جزئي ما يمسحش باقي الحقول
  const pat = await api('PATCH', `/clients/${clientA.id}`, token, { phone: '+201234567890' });
  const after3 = await api('GET', `/clients/${clientA.id}`, token);
  const cA3 = after3.json?.data || after3.json;
  log(
    pat.status === 200 && cA3?.phone === '+201234567890' && cA3?.name === clientA.name && cA3?.city === 'القاهرة',
    'G6: partial PATCH touches phone ONLY (name + city intact)',
    `phone=${cA3?.phone} | name="${cA3?.name}" | city=${cA3?.city}`,
  );

  // G7: قيمة حالة غير صالحة
  const g7 = await api('PATCH', `/clients/${clientA.id}`, token, { status: 'banana' });
  log(g7.status === 400, 'G7: invalid status rejected with 400', `got ${g7.status} — ${String(g7.json?.message || '').slice(0, 70)}`);

  console.log(failures === 0 ? '\nALL GUARD PROBES PASSED ✅' : `\n${failures} PROBE(S) FAILED ❌`);
  console.log('\nCleanup → node scripts/cleanup-verify-client.cjs --all-test');
}

main().catch((e) => console.error('PROBE ERROR:', e.message));

