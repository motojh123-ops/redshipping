/** Inspect the raw value/type neon() returns for a timestamptz column */
const fs = require('fs');
const path = require('path');
const { neon } = require(path.join(__dirname, '..', 'node_modules', '@neondatabase', 'serverless'));

const env = {};
for (const line of fs.readFileSync(path.join(__dirname, '..', 'apps', 'api', '.env'), 'utf8').split(/\r?\n/)) {
  if (line.trim().startsWith('#')) continue;
  const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

(async () => {
  const sql = neon(env.DATABASE_URL);
  const r = await sql('SELECT created_at FROM charge_items LIMIT 1', [], {
    arrayMode: true,
    fullResults: true,
  });
  const v = r.rows[0][0];
  console.log('raw value:', v);
  console.log('typeof:', typeof v, '| ctor:', v && v.constructor && v.constructor.name);
  console.log('fields type:', r.fields[0] && r.fields[0].dataTypeName);
  process.exit(0);
})().catch((e) => {
  console.error('ERR:', e.message);
  process.exit(1);
});
