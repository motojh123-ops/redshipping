async function testLegacyTenant() {
  // Test GET /clients with legacy tenant header 'comp-red-1'
  const res = await fetch('http://localhost:4000/api/v1/clients', {
    headers: {
      'x-tenant-id': 'comp-red-1',
    },
  });
  const data = await res.json();
  console.log('Legacy tenant GET /clients status:', res.status, 'Count:', Array.isArray(data.data) ? data.data.length : 'error');

  // Test POST /clients with legacy tenant header
  const postRes = await fetch('http://localhost:4000/api/v1/clients', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': 'comp-red-1',
    },
    body: JSON.stringify({
      name: 'شركة تجريبية جديدة',
      type: 'lead',
      category: 'استيراد وتصدير',
      city: 'الإسكندرية',
    }),
  });
  const postData = await postRes.json();
  console.log('Legacy tenant POST /clients status:', postRes.status, 'Client:', postData.data?.name, 'CompanyId:', postData.data?.companyId);
}

testLegacyTenant().catch(console.error);
