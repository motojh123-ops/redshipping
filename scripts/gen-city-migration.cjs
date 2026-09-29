/**
 * One-shot helper: generate the city_atlas_expansion migration SQL
 * by diffing the LIVE database (datasource URL from apps/api/.env)
 * against apps/api/prisma/schema.prisma — no interactive prompts.
 * Run from repo root:  node scripts/gen-city-migration.cjs
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const apiDir = path.join(__dirname, '..', 'apps', 'api');
const outFile = path.join(
  apiDir,
  'prisma',
  'migrations',
  '20260930120000_city_atlas_expansion',
  'migration.sql'
);

const sql = execSync(
  'npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script',
  { cwd: apiDir, encoding: 'utf8' }
);

if (!sql || !sql.trim()) {
  console.log('NO_DIFF (database already matches schema)');
  process.exit(1);
}

fs.writeFileSync(outFile, sql, 'utf8');
console.log('WROTE ' + outFile + ' (' + sql.length + ' chars)');
console.log('--- migration.sql ---');
console.log(sql);
