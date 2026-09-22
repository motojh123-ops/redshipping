async function testApi() {
  try {
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
    console.log('User:', loginData.data?.user?.email, 'Company:', loginData.data?.user?.companyId);

    const token = loginData.data?.accessToken;
    if (!token) {
      console.log('Failed to obtain token:', loginData);
      return;
    }

    // Shipments
    const shipRes = await fetch('http://localhost:4000/api/v1/shipments', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const shipData = await shipRes.json();
    console.log('Shipments count:', Array.isArray(shipData.data) ? shipData.data.length : 'error');

    // Invoices
    const invRes = await fetch('http://localhost:4000/api/v1/invoices', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const invData = await invRes.json();
    console.log('Invoices count:', Array.isArray(invData.data) ? invData.data.length : 'error');

    // Clients
    const clientRes = await fetch('http://localhost:4000/api/v1/clients', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const clientData = await clientRes.json();
    console.log('Clients count:', Array.isArray(clientData.data) ? clientData.data.length : 'error');
  } catch (err) {
    console.error('Test error:', err);
  }
}

testApi();
