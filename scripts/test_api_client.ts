async function testApi() {
  const loginRes = await fetch('http://localhost:4000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@banna-logistics.com',
      password: 'password123',
    }),
  });

  const loginData = await loginRes.json();
  console.log('Login Response Status:', loginRes.status);
  console.log('Login Result:', JSON.stringify(loginData, null, 2));

  if (!loginData.data?.accessToken) {
    console.log('No access token returned!');
    return;
  }

  const token = loginData.data.accessToken;

  // Test GET shipments
  const shipRes = await fetch('http://localhost:4000/api/v1/shipments', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const shipData = await shipRes.json();
  console.log('Shipments status:', shipRes.status, 'Count:', Array.isArray(shipData.data) ? shipData.data.length : 'not array');
  if (Array.isArray(shipData.data)) {
    console.log('Shipments sample:', shipData.data.map((s: any) => ({ id: s.id, jobFile: s.jobFileNumber, client: s.client?.name })));
  }

  // Test GET invoices
  const invRes = await fetch('http://localhost:4000/api/v1/invoices', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const invData = await invRes.json();
  console.log('Invoices status:', invRes.status, 'Count:', Array.isArray(invData.data) ? invData.data.length : 'not array');
  if (Array.isArray(invData.data)) {
    console.log('Invoices sample:', invData.data.map((i: any) => ({ id: i.id, invNum: i.invoiceNumber, total: i.total })));
  }

  // Test GET clients
  const clientRes = await fetch('http://localhost:4000/api/v1/clients', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const clientData = await clientRes.json();
  console.log('Clients status:', clientRes.status, 'Count:', Array.isArray(clientData.data) ? clientData.data.length : 'not array');
}

testApi().catch(console.error);
