/**
 * One-shot helper: generate a migration SQL by diffing the LIVE database
 * (datasource URL from apps/api/.env) against apps/api/prisma/schema.prisma.
 * Pass the target migration folder name as argv[2].
 * Usage: node scripts/gen-city-migration.cjs <migrationFolderName>
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const apiDir = path.join(__dirname, '..', 'apps', 'api');
const folderName = process.argv[2] || 'generated_migration';
const outFile = path.join(apiDir, 'prisma', 'migrations', folderName, 'migration.sql');

const sql = execSync(
  'npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script',
  { cwd: apiDir, encoding: 'utf8' }
);

if (!sql || !sql.trim()) {
  console.log('NO_DIFF (database already matches schema)');
  process.exit(1);
}

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, sql, 'utf8');
console.log('WROTE ' + outFile + ' (' + sql.length + ' chars)');
console.log('--- migration.sql ---');
console.log(sql);

