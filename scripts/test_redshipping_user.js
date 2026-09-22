async function testRedShippingLogin() {
  const loginRes = await fetch('http://localhost:4000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@redshipping.com',
      password: 'password123',
    }),
  });
  const loginData = await loginRes.json();
  console.log('Login Status:', loginRes.status);
  console.log('User companyId:', loginData.data?.user?.companyId);

  const token = loginData.data?.accessToken;

  // GET clients
  const getRes = await fetch('http://localhost:4000/api/v1/clients', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const getData = await getRes.json();
  console.log('GET clients status:', getRes.status, 'Count:', Array.isArray(getData.data) ? getData.data.length : 'error');

  // POST client
  const postRes = await fetch('http://localhost:4000/api/v1/clients', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: 'شركة تجريبية للتحقق النهائي',
      type: 'lead',
      category: 'استيراد وتصدير',
      city: 'الإسكندرية',
    }),
  });
  const postData = await postRes.json();
  console.log('POST client status:', postRes.status, 'Client name:', postData.data?.name, 'CompanyId:', postData.data?.companyId);
}

testRedShippingLogin().catch(console.error);
