/**
 * Probe the live API: login with the seeded admin and GET /masters/cities.
 * If the response rows contain the new atlas columns (state, cityCode,
 * timezone, latitude, longitude, isLogisticsHub, notes, updatedAt) the
 * Worker is running the NEW masters code; otherwise it is still old.
 * Usage: node scripts/probe-city-api.cjs [apiBaseUrl]
 */
async function main() {
  const base = process.argv[2] || 'https://redshipping-api.omarabdelfattah460.workers.dev/api/v1';

  const loginRes = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@banna-logistics.com', password: 'password123' }),
  });
  const loginJson = await loginRes.json().catch(() => null);
  console.log('LOGIN status:', loginRes.status);
  const token =
    loginJson?.data?.accessToken ||
    loginJson?.data?.access_token ||
    loginJson?.accessToken ||
    loginJson?.data?.token;
  if (!token) {
    console.log('LOGIN body:', JSON.stringify(loginJson).slice(0, 400));
    return;
  }

  const citiesRes = await fetch(`${base}/masters/cities`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const citiesJson = await citiesRes.json().catch(() => null);
  console.log('CITIES status:', citiesRes.status);
  const arr = Array.isArray(citiesJson) ? citiesJson : citiesJson?.data;
  if (Array.isArray(arr)) {
    console.log('cities count:', arr.length);
    if (arr[0]) {
      const keys = Object.keys(arr[0]).sort();
      console.log('row keys:', keys.join(','));
      console.log(
        keys.includes('state') && keys.includes('isLogisticsHub')
          ? 'VERDICT: NEW masters code is live (atlas expansion columns present)'
          : 'VERDICT: OLD masters code still live (atlas expansion columns MISSING)',
      );
    } else {
      console.log('VERDICT: no cities in tenant — cannot compare keys, but endpoint responds');
    }
  } else {
    console.log('CITIES body:', JSON.stringify(citiesJson).slice(0, 400));
  }

  // extra masters routes probe
  for (const p of ['/masters/charge-items', '/masters/expiry-alerts', '/masters/libraries/units']) {
    const r = await fetch(`${base}${p}`, { headers: { Authorization: `Bearer ${token}` } });
    const body = await r.text().catch(() => '');
    console.log(`PROBE ${p} → ${r.status} ${body.slice(0, 80).replace(/\s+/g, ' ')}`);
  }
}

main().catch((e) => console.error('PROBE ERROR:', e.message));
