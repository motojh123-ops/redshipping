/**
 * بوابة التحويل + الشاشة الشجرية (§6 — التسجيلات الصوتية ⭐ رقم 2 و 4):
 * 1) Prospect يُضاف من الـ CRM فقط ولا يظهر في جدول المرجعيات إطلاقًا
 * 2) بعد Accept Offer يظهر في /clients?status=active&full=tree بشجرة الفروع
 * 3) رفع مستند رسمي بتاريخ صلاحية → محرك التنبيهات يطلق إنذار للعميل
 * 4) PATCH الاعتمادات الرسمية يستمر
 * Usage: node scripts/verify-masters-clients.cjs [apiBaseUrl]
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

  // 1) Prospect من الـ CRM فقط (التسجيل 2 + 4 ⭐)
  const p = await api('POST', '/clients', token, {
    name: `Gate Test ${stamp}`,
    nameAr: `اختبار البوابة ${stamp}`,
    companyTypeId: typesArr[0]?.id,
    industrySectorId: sectorsArr[0]?.id,
    city: 'القاهرة',
    country: 'مصر',
    type: 'lead',
  });
  const cl = p.json?.data || p.json;
  log(p.status === 201 && cl?.status === 'prospect', 'prospect created in CRM only', `status=${cl?.status}`);
  if (!cl?.id) { console.log('   body:', JSON.stringify(p.json).slice(0, 250)); return; }

  // 2) البوابة: ممنوع يظهر في المرجعيات قبل الـ Confirm (⭐)
  const before = await api('GET', '/clients?status=active&full=tree', token);
  const arrB = Array.isArray(before.json) ? before.json : before.json?.data || [];
  log(
    !arrB.some((x) => x.id === cl.id),
    'GATE: prospect NOT visible in Masters clients (فاستحالة يضاف قبل الكونفرم ⭐)',
  );

  // 3) فرع + عرض + قبول → ترقية
  const br = await api('POST', `/clients/${cl.id}/branches`, token, {
    name: 'مخزن البوابة',
    city: 'القاهرة',
    isLoadingAddress: true,
  });
  const branch = br.json?.data || br.json;
  log(br.status === 201 && !!branch?.id, 'branch + loading address created');

  const off = await api('POST', '/quotations', token, {
    clientId: cl.id,
    serviceTypes: ['shipping'],
    shipmentType: 'fcl',
    incoterm: 'FOB',
    items: [],
  });
  const q = off.json?.data || off.json;
  const acc = await api('POST', `/quotations/${q.id}/accept`, token);
  const shp = acc.json?.data || acc.json;
  log(acc.status === 201 && !!shp?.jobFileNumber, 'offer accepted → Operation Job', shp?.jobFileNumber);

  // 4) ظهور شجري في شاشة المرجعيات (full=tree)
  const after = await api('GET', '/clients?status=active&full=tree', token);
  const arrA = Array.isArray(after.json) ? after.json : after.json?.data || [];
  const row = arrA.find((x) => x.id === cl.id);
  log(
    !!row && row.status === 'active' && Array.isArray(row.branches) && row.branches.length > 0 && !!row.companyType,
    'Masters tree row present (status + branches + companyType)',
    `branches=${row?.branches?.length} type=${row?.companyType?.nameEn || row?.companyType?.code}`,
  );

  // 5) رفع مستند رسمي بتاريخ صلاحية (⭐ Attachments + Validity)
  const doc = await api('POST', '/masters/documents', token, {
    entityType: 'client',
    entityId: cl.id,
    category: 'commercial_reg',
    fileName: `gate-test-${stamp}.pdf`,
    mimeType: 'application/pdf',
    dataBase64: 'JVBERi0xLjQKJcOkw7zDtsOz',
    expiryDate: new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10),
  });
  const docRow = doc.json?.data || doc.json;
  log(doc.status === 201 && !!docRow?.id, 'official document uploaded with expiry date', docRow?.category);

  // 6) محرك التنبيهات بيطلق إنذار للعميل (⭐ Alerts System)
  const alerts = await api('GET', '/masters/expiry-alerts', token);
  const arrAl = Array.isArray(alerts.json) ? alerts.json : alerts.json?.data || [];
  const hit = arrAl.find((a) => a.entityType === 'client' && a.entityId === cl.id);
  log(!!hit, 'Alerts engine fires for this client doc expiry', hit ? `${hit.labelAr} — ${hit.daysRemaining}d (${hit.level})` : 'NO ALERT');

  // 7) استكمال الاعتمادات (PATCH — §6-أ)
  const pat = await api('PATCH', `/clients/${cl.id}`, token, {
    commercialReg: 'CR-GATE-1',
    taxCardNumber: 'TAX-GATE-1',
    importerRegistryNumber: 'IMP-GATE-1',
  });
  const one = await api('GET', `/clients/${cl.id}`, token);
  const c1 = one.json?.data || one.json;
  log(
    c1?.commercialReg === 'CR-GATE-1' && c1?.taxCardNumber === 'TAX-GATE-1' && c1?.importerRegistryNumber === 'IMP-GATE-1',
    'registrations PATCH persisted (§6-أ)',
    c1?.commercialReg,
  );

  console.log(failures === 0 ? '\nALL GATE CHECKS PASSED ✅' : `\n${failures} CHECK(S) FAILED ❌`);
  console.log('\nCleanup → node scripts/cleanup-verify-client.cjs --all-test');
}

main().catch((e) => console.error('VERIFY ERROR:', e.message));
