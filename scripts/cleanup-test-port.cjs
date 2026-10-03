/** cleanup the orphan E2E test port left by verify-port-atlas (before DELETE existed) */
const fs = require('fs');
const path = require('path');

async function main() {
  const base = 'https://redshipping-api.omarabdelfattah460.workers.dev/api/v1';
  const loginRes = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@banna-logistics.com', password: 'password123' }),
  });
  const loginJson = await loginRes.json();
  const token = loginJson?.data?.accessToken || loginJson?.accessToken;
  const auth = { Authorization: `Bearer ${token}` };

  const listRes = await fetch(`${base}/masters/ports`, { headers: auth });
  const listJson = await listRes.json();
  const list = Array.isArray(listJson) ? listJson : listJson?.data || [];
  const orphans = list.filter((p) => p.companyId && p.nameEn === 'E2E Linked Port');
  for (const o of orphans) {
    const del = await fetch(`${base}/masters/ports/${o.id}`, { method: 'DELETE', headers: auth });
    console.log('deleted orphan port', o.code, '→', del.status);
  }
  console.log('orphans cleaned:', orphans.length);
}
main().catch((e) => console.error('CLEANUP ERROR:', e.message));
