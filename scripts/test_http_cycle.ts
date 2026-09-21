import axios from 'axios';

const API_BASE = 'http://localhost:4000/api/v1';

async function testHttpCycle() {
  console.log('--- 1. Authenticating via API ---');
  const loginRes = await axios.post(`${API_BASE}/auth/login`, {
    email: 'admin@banna-logistics.com',
    password: 'password123',
  });
  const token = loginRes.data.data.accessToken;
  console.log('Auth success! User:', loginRes.data.data.user.email);

  const authAxios = axios.create({
    baseURL: API_BASE,
    headers: { Authorization: `Bearer ${token}` },
  });

  console.log('\n--- 2. Add Container to Shipment BAN-2026-0001 ---');
  const containerRes = await authAxios.post('/shipments/BAN-2026-0001/containers', {
    containerNumber: 'MSKU7712349',
    containerType: '40HQ',
    sealNumber: 'EGY-SEAL-7712',
    tareWeightKg: 3850,
    cargoWeightKg: 22400,
    status: 'on_board',
  });
  console.log('Container added:', containerRes.data.data?.containerNumber || containerRes.data);

  console.log('\n--- 3. Create Egyptian NAFEZA ACID Customs Dossier for BAN-2026-0001 ---');
  const customsRes = await authAxios.post('/customs/BAN-2026-0001', {
    acidNumber: '2026092177665544332',
    acidIssueDate: new Date().toISOString(),
    acidExpiryDate: new Date(Date.now() + 90 * 86400000).toISOString(),
    customsCertificateNumber: 'CERT-EGALY-2026-991',
    customsValueDeclared: 78500,
    dutiesPaid: 12500,
    vatPaid: 10990,
    status: 'acid_issued',
    notes: 'Approved by Egyptian Customs Authority Alexandria Logistics Center (MTS)',
  });
  console.log('Customs dossier created:', customsRes.data.data?.acidNumber || customsRes.data.acidNumber || customsRes.data);

  console.log('\n--- 4. Verify Customs Dossier List via GET /customs ---');
  const listCustoms = await authAxios.get('/customs');
  console.log('Customs count:', listCustoms.data.data?.length ?? listCustoms.data?.length);

  console.log('\n--- 5. Create Commercial Invoice for BAN-2026-0001 ---');
  const invoiceRes = await authAxios.post('/invoices', {
    shipmentId: 'BAN-2026-0001',
    clientId: 'Petrojet Petroleum Projects',
    invoiceType: 'CLIENT_FREIGHT',
    currency: 'USD',
    exchangeRate: 1.0,
    items: [
      {
        description: 'Ocean Freight 1x40HQ Shanghai to Alexandria Port',
        quantity: 1,
        unitPrice: 3800,
        currency: 'USD',
      },
      {
        description: 'Terminal Handling Charges (THC) - Alexandria Port',
        quantity: 1,
        unitPrice: 320,
        currency: 'USD',
      },
      {
        description: 'Customs Clearance & Documentation Processing',
        quantity: 1,
        unitPrice: 450,
        currency: 'USD',
      },
    ],
    notes: 'Payment terms: Net 30 days. Remit to Banna Logistics USD Account at CIB Egypt.',
  });
  const invoiceData = invoiceRes.data.data || invoiceRes.data;
  console.log('Invoice created successfully:', invoiceData.invoiceNumber, 'Total:', invoiceData.total, invoiceData.currency);

  console.log('\n--- 6. Verify Invoices List via GET /invoices ---');
  const listInvoices = await authAxios.get('/invoices');
  const invoices = listInvoices.data.data || listInvoices.data;
  console.log('Total live invoices in PostgreSQL:', invoices.length);
  for (const inv of invoices) {
    console.log(` - ${inv.invoiceNumber} | Client: ${inv.client?.name} | Shipment: ${inv.shipment?.jobFileNumber || 'N/A'} | Total: ${inv.total} ${inv.currency} | Status: ${inv.status}`);
  }

  console.log('\n=== ALL API HTTP ENDPOINTS SUCCEEDED IN REAL PERSISTENT MODE! ===');
}

testHttpCycle().catch((err) => {
  console.error('HTTP test failed:', err.response?.data || err.message);
  process.exit(1);
});
