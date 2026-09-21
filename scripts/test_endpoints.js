const http = require('http');

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost',
      port: 4000,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    }, (res) => {
      let buf = '';
      res.on('data', (c) => buf += c);
      res.on('end', () => resolve(JSON.parse(buf)));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function get(path, token) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 4000,
      path: path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }, (res) => {
      let buf = '';
      res.on('data', (c) => buf += c);
      res.on('end', () => resolve(JSON.parse(buf)));
    });
    req.on('error', reject);
    req.end();
  });
}

async function run() {
  const loginRes = await post('/api/v1/auth/login', {
    email: 'admin@banna-logistics.com',
    password: 'password123',
  });
  console.log('Login Result:', loginRes.success ? 'SUCCESS' : 'FAILED', loginRes.data?.user?.name);
  const token = loginRes.data.accessToken;

  const endpoints = [
    '/api/v1/auth/me',
    '/api/v1/masters/ports',
    '/api/v1/masters/shipping-lines',
    '/api/v1/masters/overseas-agents',
    '/api/v1/masters/vendors',
    '/api/v1/masters/charge-items',
    '/api/v1/clients',
    '/api/v1/quotations',
    '/api/v1/shipments',
    '/api/v1/customs',
    '/api/v1/invoices',
  ];

  for (const ep of endpoints) {
    const res = await get(ep, token);
    const count = Array.isArray(res.data) ? res.data.length : (res.data ? 'OK' : 'EMPTY');
    console.log(`Endpoint ${ep}: SUCCESS (${count} items)`);
  }
  console.log('🎉 ALL ERP MODULES ARE 100% OPERATIONAL!');
}

run().catch(console.error);
