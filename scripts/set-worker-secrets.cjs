/**
 * Re-inject the Worker secrets (encrypted) after the vars were wiped by
 * `wrangler deploy`. Values are read from apps/api/.env — REDIS/GOTENBERG
 * are intentionally skipped (queue module self-disables, PDF gen optional).
 * Usage (with env vars set):
 *   node scripts/set-worker-secrets.cjs
 */
const fs = require('fs');
const path = require('path');

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const SCRIPT = 'redshipping-api';

if (!ACCOUNT_ID || !TOKEN) {
  console.error('Missing CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN env vars');
  process.exit(1);
}

const envPath = path.join(__dirname, '..', 'apps', 'api', '.env');
const env = {};
for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  if (line.trim().startsWith('#')) continue;
  const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const wanted = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET', 'ETA_CLIENT_ID', 'ETA_CLIENT_SECRET'];

(async () => {
  let allOk = true;
  for (const name of wanted) {
    const value = env[name];
    if (!value) {
      console.log(`SKIP ${name} (not present in apps/api/.env)`);
      continue;
    }
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/workers/scripts/${SCRIPT}/secrets`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, text: value, type: 'secret_text' }),
      }
    );
    const json = await res.json().catch(() => null);
    const ok = res.status < 400 && json && json.success;
    console.log(
      `${name} → HTTP ${res.status} ${ok ? 'OK' : JSON.stringify(json && (json.errors || json)).slice(0, 200)}`
    );
    if (!ok) allOk = false;
  }
  process.exit(allOk ? 0 : 1);
})();
