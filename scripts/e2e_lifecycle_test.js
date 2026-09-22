/**
 * Full End-to-End Business Lifecycle Test
 * Tests: Login → Client → Quotation → Shipment → Invoice → Dashboard KPIs
 */

const BASE = 'http://localhost:4000/api/v1';
let token = '';
let companyId = '';
let clientId = '';
let quotationId = '';
let shipmentId = '';
let invoiceId = '';

async function api(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  return { status: res.status, data: json.data || json, raw: json };
}

function pass(step, msg) { console.log(`✅ [${step}] ${msg}`); }
function fail(step, msg, detail) { console.error(`❌ [${step}] ${msg}`, detail || ''); }

async function run() {
  console.log('\n' + '='.repeat(70));
  console.log('🚢 RED SHIPPING — FULL E2E BUSINESS LIFECYCLE TEST');
  console.log('='.repeat(70) + '\n');

  // ──────────────────────────────────────────────
  // STEP 1: LOGIN
  // ──────────────────────────────────────────────
  const login = await api('POST', '/auth/login', {
    email: 'admin@banna-logistics.com',
    password: 'password123',
  });
  if (login.status === 200 && login.data.accessToken) {
    token = login.data.accessToken;
    companyId = login.data.user.companyId;
    pass('1-LOGIN', `Logged in as ${login.data.user.name} | Company: ${login.data.user.companyName} | UUID: ${companyId}`);
  } else {
    fail('1-LOGIN', 'Login failed', login.raw);
    return;
  }

  // ──────────────────────────────────────────────
  // STEP 2: ADD CLIENT
  // ──────────────────────────────────────────────
  const newClient = await api('POST', '/clients', {
    name: 'شركة الأهرام للصناعات الهندسية',
    tradeName: 'الأهرام للمعدات',
    taxNumber: `EG-TAX-${Date.now().toString().slice(-6)}`,
    commercialReg: 'CR-ALEX-5544',
    category: 'مصانع ومعدات ثقيلة',
    city: 'الإسكندرية',
    address: 'المنطقة الصناعية برج العرب',
    type: 'actual',
    contacts: [{
      name: 'م. طارق رضوان',
      title: 'مدير المشتريات',
      mobile: '+201209998888',
      email: 'tarek@alahram.com',
      isPrimary: true,
    }],
  });
  if (newClient.status === 201 && newClient.data.id) {
    clientId = newClient.data.id;
    pass('2-CLIENT', `Created: "${newClient.data.name}" | Status: ${newClient.data.status} | ID: ${clientId} | Contacts: ${newClient.data.contacts?.length || 0}`);
  } else {
    fail('2-CLIENT', 'Client creation failed', newClient.raw);
    return;
  }

  // Verify client appears in list
  const clientList = await api('GET', '/clients');
  const found = Array.isArray(clientList.data) && clientList.data.some(c => c.id === clientId);
  if (found) {
    pass('2-CLIENT-LIST', `Client found in list. Total clients: ${clientList.data.length}`);
  } else {
    fail('2-CLIENT-LIST', 'Client NOT found in list');
  }

  // ──────────────────────────────────────────────
  // STEP 3: CREATE QUOTATION
  // ──────────────────────────────────────────────
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 14);

  const newQuote = await api('POST', '/quotations', {
    clientId,
    shipmentType: 'fcl',
    incoterm: 'FOB',
    originPortId: 'CNSHA',
    destinationPortId: 'EGALY',
    currency: 'USD',
    validUntil: validUntil.toISOString(),
    estimatedTransitDays: 25,
    notes: 'عرض سعر تجريبي - شحنة معدات صناعية',
    items: [
      { description: 'نولون شحن بحري Ocean Freight 40HQ', costRate: 2400, sellRate: 2900, quantity: 2, unit: 'container', currency: 'USD' },
      { description: 'مصاريف تفريغ ومناولة THC', costRate: 250, sellRate: 320, quantity: 2, unit: 'container', currency: 'USD' },
      { description: 'تخليص جمركي Customs Clearance', costRate: 100, sellRate: 170, quantity: 1, unit: 'shipment', currency: 'USD' },
    ],
  });
  if (newQuote.status === 201 && newQuote.data.id) {
    quotationId = newQuote.data.id;
    pass('3-QUOTATION', `Created: #${newQuote.data.quotationNumber} | Cost: $${newQuote.data.totalCost} | Sell: $${newQuote.data.totalSell} | Profit: $${newQuote.data.totalProfit} | Items: ${newQuote.data.items?.length}`);
  } else {
    fail('3-QUOTATION', 'Quotation creation failed', newQuote.raw);
  }

  // Verify quotation in list
  const quoteList = await api('GET', '/quotations');
  if (Array.isArray(quoteList.data) && quoteList.data.length > 0) {
    pass('3-QUOTATION-LIST', `Total quotations: ${quoteList.data.length}`);
  }

  // ──────────────────────────────────────────────
  // STEP 4: ACCEPT QUOTATION → CREATE SHIPMENT
  // ──────────────────────────────────────────────
  let shipmentFromQuote = null;
  if (quotationId) {
    const accept = await api('POST', `/quotations/${quotationId}/accept`);
    if ((accept.status === 200 || accept.status === 201) && accept.data) {
      shipmentId = accept.data.id || accept.data.shipmentId;
      shipmentFromQuote = accept.data;
      pass('4-ACCEPT-QUOTE', `Quotation accepted → Shipment created: #${accept.data.jobFileNumber || shipmentId}`);
    } else {
      // Try manual shipment creation
      console.log('   ℹ️  Accept endpoint returned:', accept.status, '- trying manual shipment creation...');
    }
  }

  // If no shipment from accept, create manually
  if (!shipmentId) {
    const newShipment = await api('POST', '/shipments', {
      clientId,
      shipmentType: 'fcl',
      incoterm: 'FOB',
      originPortId: 'CNSHA',
      destinationPortId: 'EGALY',
      blNumber: `MEDU${Date.now().toString().slice(-8)}`,
      vesselName: 'MSC PALOMA',
      voyageNumber: 'V.2609E',
      etd: '2026-10-01',
      eta: '2026-10-25',
      freeDaysAllowed: 14,
      cargoDescription: '2x 40HQ معدات صناعية ثقيلة',
      grossWeightKg: 38000,
      volumeCbm: 128,
      packageCount: 46,
      packageType: 'Wooden Crates',
      containers: [{
        containerNumber: 'MSKU8899001',
        containerType: 'HQ_40',
        sealNumber: 'EGY-SEAL-99771',
      }],
    });
    if (newShipment.status === 201 && newShipment.data.id) {
      shipmentId = newShipment.data.id;
      pass('4-SHIPMENT', `Created: #${newShipment.data.jobFileNumber} | B/L: ${newShipment.data.blNumber} | Stage: ${newShipment.data.currentStage} | Containers: ${newShipment.data.containers?.length || 0}`);
    } else {
      fail('4-SHIPMENT', 'Shipment creation failed', newShipment.raw);
    }
  }

  // Verify shipments list
  const shipList = await api('GET', '/shipments');
  if (Array.isArray(shipList.data)) {
    pass('4-SHIPMENT-LIST', `Total shipments: ${shipList.data.length}`);
  }

  // ──────────────────────────────────────────────
  // STEP 5: CREATE CUSTOMS DOSSIER (ACID)
  // ──────────────────────────────────────────────
  if (shipmentId) {
    const acid = await api('POST', `/customs/${shipmentId}`, {
      acidNumber: `20260921${Date.now().toString().slice(-11)}`,
      acidIssueDate: new Date().toISOString(),
      acidExpiryDate: new Date(Date.now() + 90 * 86400000).toISOString(),
      customsCertificateNumber: 'CERT-ALEX-2026-TEST',
      customsValueDeclared: 75000,
      dutiesPaid: 3750,
      vatPaid: 10500,
      status: 'acid_issued',
      notes: 'NAFEZA ACID test - منظومة نافذة',
    });
    if (acid.status === 201 && acid.data) {
      pass('5-CUSTOMS', `ACID Dossier: ${acid.data.acidNumber || 'created'} | Status: ${acid.data.status}`);
    } else {
      console.log(`   ℹ️  Customs creation returned: ${acid.status} -`, JSON.stringify(acid.raw).slice(0, 200));
    }
  }

  // ──────────────────────────────────────────────
  // STEP 6: CREATE INVOICE
  // ──────────────────────────────────────────────
  if (shipmentId) {
    const inv = await api('POST', '/invoices', {
      shipmentId,
      clientId,
      invoiceType: 'client_freight',
      currency: 'USD',
      exchangeRate: 49.5,
      subtotal: 6530,
      taxAmount: 63,
      total: 6593,
      issueDate: new Date().toISOString(),
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString(),
      notes: 'فاتورة نولون وتخليص - E2E Test',
      items: [
        { description: 'Ocean Freight 2x 40HQ (Shanghai → Alexandria)', quantity: 2, unitPrice: 2900, totalPrice: 5800, currency: 'USD' },
        { description: 'THC Destination', quantity: 2, unitPrice: 280, totalPrice: 560, currency: 'USD' },
        { description: 'Customs Clearance', quantity: 1, unitPrice: 170, totalPrice: 170, currency: 'USD' },
      ],
    });
    if (inv.status === 201 && inv.data) {
      invoiceId = inv.data.id;
      pass('6-INVOICE', `Created: #${inv.data.invoiceNumber} | Total: $${inv.data.total} | Status: ${inv.data.status} | Items: ${inv.data.items?.length || '?'}`);
    } else {
      fail('6-INVOICE', 'Invoice creation failed', JSON.stringify(inv.raw).slice(0, 300));
    }
  }

  // Verify invoices list
  const invList = await api('GET', '/invoices');
  if (Array.isArray(invList.data)) {
    pass('6-INVOICE-LIST', `Total invoices: ${invList.data.length}`);
  }

  // ──────────────────────────────────────────────
  // STEP 7: DASHBOARD KPIs
  // ──────────────────────────────────────────────
  const kpi = await api('GET', '/reports/kpi-summary');
  if (kpi.status === 200 && kpi.data) {
    pass('7-DASHBOARD', `KPIs → Active Shipments: ${kpi.data.activeShipmentsCount} | Revenue: ${kpi.data.totalRevenueEgp.toLocaleString()} EGP | Margin: ${kpi.data.averageProfitMarginPercent}% | Growth: +${kpi.data.monthlyGrowthPercent}%`);
  } else {
    console.log(`   ℹ️  KPI endpoint returned: ${kpi.status}`);
  }

  // ──────────────────────────────────────────────
  // FINAL: DATABASE AUDIT
  // ──────────────────────────────────────────────
  console.log('\n' + '='.repeat(70));
  console.log('🔍 FINAL DATABASE COUNTS (via API)');
  console.log('='.repeat(70));
  
  const counts = {
    clients: (await api('GET', '/clients')).data?.length || 0,
    quotations: (await api('GET', '/quotations')).data?.length || 0,
    shipments: (await api('GET', '/shipments')).data?.length || 0,
    invoices: (await api('GET', '/invoices')).data?.length || 0,
    customs: (await api('GET', '/customs')).data?.length || 0,
  };

  for (const [k, v] of Object.entries(counts)) {
    console.log(`   ✓ ${k.padEnd(15)} ${v}`);
  }

  console.log('\n🎉 END-TO-END BUSINESS LIFECYCLE TEST COMPLETE!\n');
}

run().catch(err => {
  console.error('💥 Fatal error:', err.message);
  process.exit(1);
});
