/**
 * Live verification — Clients & Ops module (جلسة 3 — وثيقة العملاء والعمليات).
 * Runs the full spec cycle against the deployed Worker:
 *   1. Login as seeded admin
 *   2. Company-types / industry-sectors libraries self-heal (6 + 11 defaults)
 *   3. Expiry-alerts feed responds (client docs + registries)
 *   4. Quick-entry prospect (§1/§2) — bilingual name + type + sector
 *   5. Branch + loading address (§5ب)
 *   6. New Offer with serviceTypes combo + POL/POD + goods/container (§4)
 *   7. Accept → Job File + AUTO-PROMOTION prospect→active (§3)
 * Usage: node scripts/verify-clients-ops.cjs [apiBaseUrl]
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
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

async function main() {
  // 1. Login
  const login = await api('POST', '/auth/login', null, {
    email: 'admin@banna-logistics.com',
    password: 'password123',
  });
  const token = login.json?.data?.accessToken || login.json?.accessToken || login.json?.data?.token;
  log(!!token, 'Login as seeded admin', `status ${login.status}`);
  if (!token) return;

  // 2. Reference libraries (self-healing seeds)
  const types = await api('GET', '/masters/libraries/company-types', token);
  const typesArr = Array.isArray(types.json) ? types.json : types.json?.data || [];
  log(types.status === 200 && typesArr.length >= 6, 'Company-types library seeded', `${typesArr.length} items`);

  const sectors = await api('GET', '/masters/libraries/industry-sectors', token);
  const sectorsArr = Array.isArray(sectors.json) ? sectors.json : sectors.json?.data || [];
  log(sectors.status === 200 && sectorsArr.length >= 11, 'Industry-sectors library seeded', `${sectorsArr.length} items`);

  // 3. Expiry alerts feed
  const alerts = await api('GET', '/masters/expiry-alerts', token);
  const alertsArr = Array.isArray(alerts.json) ? alerts.json : alerts.json?.data || [];
  log(alerts.status === 200 && Array.isArray(alertsArr), 'Expiry-alerts feed responds', `${alertsArr.length} alerts`);

  // 4. Quick-entry prospect (§1/§2)
  const stamp = Date.now().toString().slice(-6);
  const created = await api('POST', '/clients', token, {
    name: `Prospect Test ${stamp} Ltd`,
    nameAr: `شركة اختبار مستهدفة ${stamp}`,
    companyTypeId: typesArr[0]?.id,
    industrySectorId: sectorsArr[0]?.id,
    countryCode: 'EG',
    city: 'مدينة 6 أكتوبر',
    country: 'مصر',
    phone: '+201000000000',
    personInCharge: 'أ. اختبار',
    contactName: 'أ. اختبار',
    contactMobile: '+201000000000',
    notes: 'بيانات اختبار آلي — وحدة العملاء والعمليات',
    type: 'lead',
  });
  const client = created.json?.data || created.json;
  log(
    created.status === 201 && client?.status === 'prospect',
    'Quick-entry creates PROSPECT (§1/§2)',
    `status=${client?.status}`,
  );
  if (!client?.id) { console.log('   client body:', JSON.stringify(created.json).slice(0, 300)); return; }

  // 5. Branch + loading address (§5ب)
  const branch = await api('POST', `/clients/${client.id}/branches`, token, {
    name: 'مخزن أكتوبر',
    address: 'المنطقة الصناعية — طريق الواحات',
    city: 'مدينة 6 أكتوبر',
    isLoadingAddress: true,
  });
  const branchData = branch.json?.data || branch.json;
  log(branch.status === 201 && !!branchData?.id, 'Client branch + loading address (§5ب)', branchData?.name);

  // 6. New Offer (§4) — combo: shipping + clearance + transport
  const offer = await api('POST', '/quotations', token, {
    clientId: client.id,
    serviceTypes: ['shipping', 'clearance', 'transport'],
    originPortId: 'EGALY',
    destinationPortId: 'TRMRS',
    clearancePortId: 'EGALY',
    pickupBranchId: branchData?.id,
    goodsDescription: 'مواد غذائية معلبة — اختبار آلي',
    containerType: '40HQ',
    containerQty: 3,
    pricingNotes: 'نولون شامل THC — اختبار آلي للجلسة 3',
    shipmentType: 'fcl',
    incoterm: 'FOB',
    items: [],
  });
  const q = offer.json?.data || offer.json;
  log(
    offer.status === 201 && JSON.stringify(q?.serviceTypes) === JSON.stringify(['shipping', 'clearance', 'transport']),
    'New Offer with serviceTypes combo (§4)',
    `${q?.quotationNumber} services=[${q?.serviceTypes}] POL=${q?.originPortId}`,
  );
  if (!q?.id) { console.log('   offer body:', JSON.stringify(offer.json).slice(0, 300)); return; }

  // 7. Accept → Job File + AUTO-PROMOTION (§3)
  const accept = await api('POST', `/quotations/${q.id}/accept`, token);
  const shipment = accept.json?.data || accept.json;
  log(
    accept.status === 201 && !!shipment?.jobFileNumber,
    'Accept opens Operation Job File (§3)',
    shipment?.jobFileNumber,
  );

  const after = await api('GET', `/clients/${client.id}`, token);
  const afterClient = after.json?.data || after.json;
  log(
    afterClient?.status === 'active' && !!afterClient?.convertedAt,
    'AUTO-PROMOTION prospect → active (§1.2/§3)',
    `status=${afterClient?.status} convertedAt=${String(afterClient?.convertedAt || '').slice(0, 10)} branches=${afterClient?.branches?.length}`,
  );

  console.log(failures === 0 ? '\nALL CHECKS PASSED ✅' : `\n${failures} CHECK(S) FAILED ❌`);
}

main().catch((e) => console.error('VERIFY ERROR:', e.message));
