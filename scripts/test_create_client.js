async function testCreateClient() {
  const loginRes = await fetch('http://localhost:4000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@banna-logistics.com',
      password: 'password123',
    }),
  });
  const loginData = await loginRes.json();
  const token = loginData.data?.accessToken;

  const createRes = await fetch('http://localhost:4000/api/v1/clients', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: 'شركة بلح للتجارة',
      type: 'lead',
      category: 'مصنع ومستورد خامات',
      city: 'مدينة 6 أكتوبر / الجيزة',
      address: 'المنطقة الصناعية',
      notes: 'عميل تجريبي للتأكد من قاعدة البيانات',
      contactName: 'أحمد محمود',
      contactMobile: '+201011112222',
      contactEmail: 'ahmed@balah.com',
    }),
  });

  const createData = await createRes.json();
  console.log('Create Client Status:', createRes.status);
  console.log('Created Client:', JSON.stringify(createData, null, 2));
}

testCreateClient().catch(console.error);
