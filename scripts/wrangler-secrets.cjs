/**
 * Set Worker secrets via wrangler itself (handles the versioned-scripts
 * flow: creates + deploys a new version automatically). Values are piped
 * to wrangler's stdin byte-exact (no trailing newline, no shell quoting).
 * Env needed: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, CI=true
 * Usage: node scripts/wrangler-secrets.cjs
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const envPath = path.join(__dirname, '..', 'apps', 'api', '.env');
const env = {};
for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  if (line.trim().startsWith('#')) continue;
  const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const wanted = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET', 'ETA_CLIENT_ID', 'ETA_CLIENT_SECRET'];

let failures = 0;
for (const name of wanted) {
  const value = env[name];
  if (!value) {
    console.log(`SKIP ${name} (not in apps/api/.env)`);
    continue;
  }
  const tmpFile = path.join(os.tmpdir(), `cf-sec-${name}.txt`);
  fs.writeFileSync(tmpFile, value, 'utf8'); // exact bytes, no trailing newline

  const r = spawnSync('npx', ['--yes', 'wrangler', 'secret', 'put', name], {
    input: fs.readFileSync(tmpFile),
    encoding: 'utf8',
    shell: true,
    env: process.env,
  });
  const out = `${r.stdout || ''}\n${r.stderr || ''}`;
  const successLine = out
    .split(/\r?\n/)
    .filter((l) => /Success|deployed|version/i.test(l))
    .slice(0, 3)
    .join(' | ');
  const ok = r.status === 0;
  if (!ok) failures += 1;
  console.log(`${name} → exit ${r.status} ${ok ? successLine || 'OK' : out.slice(0, 300)}`);
  fs.unlinkSync(tmpFile);
}

console.log(failures === 0 ? 'ALL SECRETS SET' : `FAILURES: ${failures}`);
process.exit(failures === 0 ? 0 : 1);
