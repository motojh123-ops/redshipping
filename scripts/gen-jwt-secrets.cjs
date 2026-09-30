/** One-shot: generate strong JWT secrets and write them into apps/api/.env */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const envPath = path.join(__dirname, '..', 'apps', 'api', '.env');
let content = fs.readFileSync(envPath, 'utf8');

const access = crypto.randomBytes(48).toString('hex');
const refresh = crypto.randomBytes(48).toString('hex');

content = content.replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${access}`);
content = content.replace(/^JWT_REFRESH_SECRET=.*$/m, `JWT_REFRESH_SECRET=${refresh}`);

fs.writeFileSync(envPath, content, 'utf8');
console.log('JWT secrets regenerated in apps/api/.env');
console.log('access length:', access.length, '| refresh length:', refresh.length);
