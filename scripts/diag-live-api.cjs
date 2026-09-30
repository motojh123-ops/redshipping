/** Diagnose the live API after deploy: health + raw login response + a masters probe */
async function main() {
  const base = process.argv[2] || 'https://redshipping-api.omarabdelfattah460.workers.dev/api/v1';

  const health = await fetch(`${base}/health`);
  console.log('HEALTH status:', health.status);
  console.log('HEALTH raw:', (await health.text()).slice(0, 300));

  const login = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@banna-logistics.com', password: 'password123' }),
  });
  console.log('LOGIN status:', login.status);
  console.log('LOGIN raw:', (await login.text()).slice(0, 500));
}

main().catch((e) => console.error('DIAG ERROR:', e.message));
