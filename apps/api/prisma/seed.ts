import 'dotenv/config';
import { PrismaClient, UserRole, ClientStatus, VendorType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://banna_admin:banna_secure_pass_2026@127.0.0.1:5432/banna_db?schema=public',
    },
  },
});

async function main() {
  console.log('🌱 Starting database seeding for Banna Freight ERP...');

  // 1. Create Demo Company (Tenant)
  let company = await prisma.company.findFirst({
    where: { name: 'Banna Freight & Logistics Egypt' },
  });

  if (!company) {
    company = await prisma.company.create({
      data: {
        name: 'Banna Freight & Logistics Egypt',
        commercialRegistration: 'CR-1049281',
        taxNumber: 'EG-928-182-441',
        phone: '+20 2 2794 8800',
        email: 'info@banna-logistics.com',
        address: '14 Al-Horreya St, Alexandria, Egypt',
        currencyDefault: 'USD',
        isActive: true,
      },
    });
    console.log(`✅ Created company: ${company.name} (${company.id})`);
  }

  // 2. Create Users
  const passwordHash = await bcrypt.hash('password123', 10);

  const users = [
    {
      name: 'Omar Banna (مدير عام)',
      email: 'admin@banna-logistics.com',
      role: UserRole.company_admin,
      phone: '+20 100 123 4567',
    },
    {
      name: 'Ahmed Mostafa (مسؤول مبيعات)',
      email: 'sales@banna-logistics.com',
      role: UserRole.sales_rep,
      phone: '+20 101 234 5678',
    },
    {
      name: 'Sara Hussein (مسؤولة عمليات وتخليص)',
      email: 'ops@banna-logistics.com',
      role: UserRole.ops_officer,
      phone: '+20 102 345 6789',
    },
    {
      name: 'Tamer Adel (محاسب مالي)',
      email: 'accountant@banna-logistics.com',
      role: UserRole.accountant,
      phone: '+20 103 456 7890',
    },
  ];

  for (const u of users) {
    const existing = await prisma.user.findFirst({
      where: { companyId: company.id, email: u.email },
    });
    if (!existing) {
      await prisma.user.create({
        data: {
          ...u,
          companyId: company.id,
          passwordHash,
          isActive: true,
        },
      });
      console.log(`✅ Created user: ${u.email} (${u.role})`);
    }
  }

  const salesUser = await prisma.user.findFirst({ where: { email: 'sales@banna-logistics.com' } });

  // 3. Create Ports (5 Egyptian + 10 Global Hubs)
  const ports = [
    // Egyptian Seaports & Dry Ports
    { code: 'EGALY', nameEn: 'Alexandria Port', nameAr: 'ميناء الإسكندرية البحري', countryCode: 'EG', portType: 'sea' },
    { code: 'EGPSD', nameEn: 'Port Said East Port', nameAr: 'ميناء شرق بورسعيد المحوري', countryCode: 'EG', portType: 'sea' },
    { code: 'EGPSW', nameEn: 'Port Said West Port', nameAr: 'ميناء غرب بورسعيد', countryCode: 'EG', portType: 'sea' },
    { code: 'EGDAM', nameEn: 'Damietta Port', nameAr: 'ميناء دمياط البحري', countryCode: 'EG', portType: 'sea' },
    { code: 'EGSOK', nameEn: 'Sokhna Port', nameAr: 'ميناء السخنة البحري (DP World)', countryCode: 'EG', portType: 'sea' },
    { code: 'EG6OC', nameEn: '6th of October Dry Port (ODP)', nameAr: 'ميناء 6 أكتوبر الجاف', countryCode: 'EG', portType: 'dry' },
    // Major Global Freight Hubs
    { code: 'CNSHA', nameEn: 'Shanghai Port', nameAr: 'ميناء شنغهاي', countryCode: 'CN', portType: 'sea' },
    { code: 'CNNGB', nameEn: 'Ningbo-Zhoushan Port', nameAr: 'ميناء نينغبو', countryCode: 'CN', portType: 'sea' },
    { code: 'CNQDG', nameEn: 'Qingdao Port', nameAr: 'ميناء تشينغداو', countryCode: 'CN', portType: 'sea' },
    { code: 'CNSZX', nameEn: 'Shenzhen Port', nameAr: 'ميناء شنتشن', countryCode: 'CN', portType: 'sea' },
    { code: 'AEJEA', nameEn: 'Jebel Ali Port (Dubai)', nameAr: 'ميناء جبل علي (دبي)', countryCode: 'AE', portType: 'sea' },
    { code: 'SGSIN', nameEn: 'Singapore Port', nameAr: 'ميناء سنغافورة', countryCode: 'SG', portType: 'sea' },
    { code: 'NLRTM', nameEn: 'Rotterdam Port', nameAr: 'ميناء روتردام', countryCode: 'NL', portType: 'sea' },
    { code: 'DEHAM', nameEn: 'Hamburg Port', nameAr: 'ميناء هامبورغ', countryCode: 'DE', portType: 'sea' },
    { code: 'KRPUS', nameEn: 'Busan Port', nameAr: 'ميناء بوسان', countryCode: 'KR', portType: 'sea' },
    { code: 'ESVLC', nameEn: 'Valencia Port', nameAr: 'ميناء فالنسيا', countryCode: 'ES', portType: 'sea' },
  ];

  for (const p of ports) {
    const existing = await prisma.port.findFirst({
      where: { code: p.code },
    });
    if (!existing) {
      await prisma.port.create({
        data: { ...p, companyId: company.id },
      });
    }
  }
  console.log('✅ Created 16 Egyptian & Global Ports');

  // 4. Create Shipping Lines (8 Top Global Carriers)
  const shippingLines = [
    { name: 'MSC (Mediterranean Shipping Company)', scac: 'MSCU', website: 'www.msc.com' },
    { name: 'Maersk Line (A.P. Moller)', scac: 'MAEU', website: 'www.maersk.com' },
    { name: 'CMA CGM Group', scac: 'CMDU', website: 'www.cma-cgm.com' },
    { name: 'Hapag-Lloyd', scac: 'HLCU', website: 'www.hapag-lloyd.com' },
    { name: 'COSCO Shipping Lines', scac: 'COSU', website: 'lines.coscoshipping.com' },
    { name: 'Ocean Network Express (ONE)', scac: 'ONEY', website: 'www.one-line.com' },
    { name: 'Evergreen Marine Corporation', scac: 'EGLV', website: 'www.evergreen-marine.com' },
    { name: 'Yang Ming Marine Transport', scac: 'YMLU', website: 'www.yangming.com' },
  ];

  for (const sl of shippingLines) {
    const existing = await prisma.shippingLine.findFirst({
      where: { companyId: company.id, name: sl.name },
    });
    if (!existing) {
      await prisma.shippingLine.create({
        data: { ...sl, companyId: company.id },
      });
    }
  }
  console.log('✅ Created 8 Major Shipping Lines');

  // 5. Create Overseas Agents (وكلاء الخارج)
  const agents = [
    { name: 'Ningbo Pacific Freight Forwarding Co.', countryCode: 'CN', city: 'Ningbo', contactPerson: 'Wang Lei', contactEmail: 'ops@ningbopacific.com' },
    { name: 'Gulf Maritime Logistics LLC', countryCode: 'AE', city: 'Dubai', contactPerson: 'Karim Al-Hashemi', contactEmail: 'info@gulfmaritime.ae' },
    { name: 'Hanseatic Global Transport GmbH', countryCode: 'DE', city: 'Hamburg', contactPerson: 'Klaus Becker', contactEmail: 'agency@hanseatic-gt.de' },
  ];

  for (const ag of agents) {
    const existing = await prisma.overseasAgent.findFirst({
      where: { companyId: company.id, name: ag.name },
    });
    if (!existing) {
      await prisma.overseasAgent.create({
        data: { ...ag, companyId: company.id },
      });
    }
  }
  console.log('✅ Created Overseas Agents');

  // 6. Create Vendors (شركات النقل والتخليص)
  const vendors = [
    { name: 'شركة النيل لنقل الحاويات الثقيلة', vendorType: VendorType.trucking, taxId: 'EG-TAX-382910', contactName: 'م. حسام السيد', contactPhone: '+20 100 882 1199' },
    { name: 'الفرسان للتخليص الجمركي وخدمات الموانئ', vendorType: VendorType.clearance, taxId: 'EG-TAX-992102', contactName: 'أ. محمود فراج', contactPhone: '+20 122 344 5566' },
  ];

  for (const vn of vendors) {
    const existing = await prisma.vendor.findFirst({
      where: { companyId: company.id, name: vn.name },
    });
    if (!existing) {
      await prisma.vendor.create({
        data: { ...vn, companyId: company.id },
      });
    }
  }
  console.log('✅ Created Local Vendors');

  // 7. Create 15 Standard Charge Items (البنود)
  const chargeItems = [
    { code: 'OFR', nameEn: 'Ocean Freight (FCL)', nameAr: 'نولون شحن بحري حاويات', category: 'freight', defaultCurrency: 'USD', defaultPrice: 2400 },
    { code: 'THC-DEST', nameEn: 'Terminal Handling - Destination (THC)', nameAr: 'مصاريف تفريغ ومناولة ميناء الوصول (THC)', category: 'destination_charges', defaultCurrency: 'USD', defaultPrice: 280 },
    { code: 'THC-ORIG', nameEn: 'Terminal Handling - Origin (THC)', nameAr: 'مصاريف شحن ومناولة ميناء المنشأ', category: 'origin_charges', defaultCurrency: 'USD', defaultPrice: 220 },
    { code: 'BL-FEE', nameEn: 'Bill of Lading Issuance Fee', nameAr: 'رسم إصدار بوليصة الشحن (B/L)', category: 'origin_charges', defaultCurrency: 'USD', defaultPrice: 75 },
    { code: 'CUS-CLR', nameEn: 'Customs Clearance Fee', nameAr: 'أتعاب التخليص الجمركي', category: 'customs_clearance', defaultCurrency: 'EGP', defaultPrice: 4500 },
    { code: 'ACID-REG', nameEn: 'ACID NAFEZA Filing & Registration', nameAr: 'رسوم التسجيل وإصدار رقم نافذة (ACID)', category: 'customs_clearance', defaultCurrency: 'EGP', defaultPrice: 1200 },
    { code: 'TRUCK-INL', nameEn: 'Inland Container Haulage (Port to Factory)', nameAr: 'نولون نقل بري (ميناء إلى مصنع العميل)', category: 'inland_haulage', defaultCurrency: 'EGP', defaultPrice: 14000 },
    { code: 'PORT-BOSTA', nameEn: 'Port Dues & Bosta', nameAr: 'رسوم الميناء وحوالة البوسطة', category: 'destination_charges', defaultCurrency: 'EGP', defaultPrice: 1800 },
    { code: 'INSPECT-46', nameEn: 'Customs Inspection & X-Ray Examination', nameAr: 'مصاريف الكشف والمعاينة وأشعة إكس (استمارة 46)', category: 'customs_clearance', defaultCurrency: 'EGP', defaultPrice: 3200 },
    { code: 'AGRI-QUAR', nameEn: 'Phytosanitary Inspection (الحجر الزراعي)', nameAr: 'رسوم الحجر الزراعي والبيطري', category: 'customs_clearance', defaultCurrency: 'EGP', defaultPrice: 2100 },
    { code: 'STEVEDORE', nameEn: 'Port Stevedoring & Labor Fee', nameAr: 'عمالة الميناء وعوائد تفريغ', category: 'destination_charges', defaultCurrency: 'EGP', defaultPrice: 950 },
    { code: 'DEMURR-GR', nameEn: 'Demurrage Guarantee Deposit', nameAr: 'تأمين حاويات وغرامات أرضيات', category: 'destination_charges', defaultCurrency: 'EGP', defaultPrice: 5000 },
    { code: 'STORAGE-PT', nameEn: 'Port Yard Storage Charges', nameAr: 'أرضيات ساحة الميناء', category: 'destination_charges', defaultCurrency: 'EGP', defaultPrice: 3400 },
    { code: 'INSUR-MAR', nameEn: 'Marine Cargo Insurance Policy', nameAr: 'وثيقة تأمين بحري على البضاعة', category: 'freight', defaultCurrency: 'USD', defaultPrice: 350 },
    { code: 'DOC-FORM46', nameEn: 'Customs Release Certificate Form 46', nameAr: 'رسوم طباعة استمارة 46 إفراج نهائي', category: 'customs_clearance', defaultCurrency: 'EGP', defaultPrice: 850 },
  ];

  for (const ci of chargeItems) {
    const existing = await prisma.chargeItem.findFirst({
      where: { companyId: company.id, code: ci.code },
    });
    if (!existing) {
      await prisma.chargeItem.create({
        data: {
          ...ci,
          companyId: company.id,
          showInPricing: true,
          showInQuotation: true,
          showInInvoice: true,
        },
      });
    }
  }
  console.log('✅ Created 15 Standard Charge Items (البنود)');

  // 8. Create Demo Clients (العملاء)
  const clients = [
    { name: 'Al-Ahram Food Industries', tradeName: 'الأهرام للصناعات الغذائية', status: ClientStatus.active, category: 'مصنع ومستورد مواد غذائية', city: 'الجيزة' },
    { name: 'Delta Chemicals & Polymers', tradeName: 'دلتا للكيماويات والبوليمرات', status: ClientStatus.active, category: 'استيراد وتوزيع خامات صناعية', city: 'الإسكندرية' },
  ];

  for (const cl of clients) {
    const existing = await prisma.client.findFirst({
      where: { companyId: company.id, name: cl.name },
    });
    if (!existing) {
      await prisma.client.create({
        data: { ...cl, companyId: company.id, salesRepId: salesUser?.id },
      });
    }
  }
  console.log('✅ Created Demo Clients');

  // 8b. Create Demo Drivers (السائقون) linked to the trucking vendor
  const truckingVendor = await prisma.vendor.findFirst({
    where: { companyId: company.id, vendorType: VendorType.trucking },
  });
  const drivers = [
    { name: 'محمود عبد الرحمن', phone: '+20 111 234 5601', nationalId: '30101011202345', licenseNumber: 'EG-DL-771201', truckPlate: 'ق ط ر 1234', trailerPlate: 'ق ط ر 5678', truckType: 'رأس دبلو 40 قدم' },
    { name: 'سيد كامل إبراهيم', phone: '+20 111 234 5602', nationalId: '30203021202346', licenseNumber: 'EG-DL-771202', truckPlate: 'ر ن ل 4321', trailerPlate: 'ر ن ل 8765', truckType: 'رأس دبلو 20 قدم' },
    { name: 'عادل مصطفى فهمي', phone: '+20 111 234 5603', nationalId: '30305031202347', licenseNumber: 'EG-DL-771203', truckPlate: 'ب س ن 9012', trailerPlate: 'ب س ن 3456', truckType: 'رأس تريلا 40 قدم' },
  ];

  for (const dr of drivers) {
    const existing = await prisma.driver.findFirst({
      where: { companyId: company.id, name: dr.name },
    });
    if (!existing) {
      await prisma.driver.create({
        data: { ...dr, vendorId: truckingVendor?.id, companyId: company.id },
      });
    }
  }
  console.log('✅ Created 3 Demo Drivers linked to the trucking vendor');

  // 9. Create Demo Shipments with ports, containers & full event timelines (ملفات الشحن)
  const ahramClient = await prisma.client.findFirst({ where: { companyId: company.id, name: 'Al-Ahram Food Industries' } });
  const deltaClient = await prisma.client.findFirst({ where: { companyId: company.id, name: 'Delta Chemicals & Polymers' } });
  const adminUser = await prisma.user.findFirst({ where: { companyId: company.id, email: 'admin@banna-logistics.com' } });
  const mscLine = await prisma.shippingLine.findFirst({ where: { companyId: company.id, scac: 'MSCU' } });
  const maerskLine = await prisma.shippingLine.findFirst({ where: { companyId: company.id, scac: 'MAEU' } });
  const cmaLine = await prisma.shippingLine.findFirst({ where: { companyId: company.id, scac: 'CMDU' } });
  const coscoLine = await prisma.shippingLine.findFirst({ where: { companyId: company.id, scac: 'COSU' } });
  const hapagLine = await prisma.shippingLine.findFirst({ where: { companyId: company.id, scac: 'HLCU' } });

  const portByCode = (code: string) => prisma.port.findFirst({ where: { code } });
  const portAlexandria = await portByCode('EGALY');
  const portSaidEast = await portByCode('EGPSD');
  const portDamietta = await portByCode('EGDAM');
  const portSokhna = await portByCode('EGSOK');
  const portShanghai = await portByCode('CNSHA');
  const portNingbo = await portByCode('CNNGB');
  const portJebelAli = await portByCode('AEJEA');
  const portRotterdam = await portByCode('NLRTM');

  const daysAgo = (n: number) => new Date(Date.now() - n * 86400000);
  const daysAhead = (n: number) => new Date(Date.now() + n * 86400000);

  // Builds a nested ShipmentEvent history following the real ShipmentStage flow
  const eventChain = (steps: { from: string | null; to: string; daysAgo: number; notes: string }[]) => ({
    create: steps.map((s) => ({
      companyId: company!.id,
      fromStage: s.from,
      toStage: s.to,
      changedById: adminUser?.id,
      notes: s.notes,
      eventAt: daysAgo(s.daysAgo),
    })),
  });

  const shipmentSpecs = [
    // 0001 — Reefer food import: arrived, discharged, customs documents submitted
    {
      companyId: company.id,
      jobFileNumber: 'BAN-2026-0001',
      clientId: ahramClient?.id,
      salesRepId: adminUser?.id,
      opsOfficerId: adminUser?.id,
      shippingLineId: mscLine?.id,
      shipmentType: 'fcl' as const,
      incoterm: 'FOB' as const,
      originPortId: portShanghai?.id,
      destinationPortId: portAlexandria?.id,
      currentStage: 'customs_submitted' as const,
      blNumber: 'MSCU8912839',
      vesselName: 'MSC TINA',
      voyageNumber: '2603W',
      etd: daysAgo(15),
      eta: daysAgo(4),
      ata: daysAgo(4),
      freeDaysAllowed: 21,
      cargoDescription: 'Frozen Foodstuffs & Raw Ingredients in Reefer 40HQ',
      grossWeightKg: 24500,
      volumeCbm: 68,
      packageCount: 940,
      packageType: 'CTN',
      containers: {
        create: [
          {
            companyId: company.id,
            containerNumber: 'MSKU8849120',
            containerType: 'HQ_40' as const,
            sealNumber: 'SL-99120',
            status: 'discharged' as const,
            dischargedAt: daysAgo(4),
            tareWeightKg: 3820,
            cargoWeightKg: 20680,
          },
        ],
      },
      events: eventChain([
        { from: null, to: 'booking_confirmed', daysAgo: 20, notes: 'تأكيد الحجز لدى الخط الملاحي MSC' },
        { from: 'booking_confirmed', to: 'in_transit', daysAgo: 15, notes: 'إبحار السفينة MSC TINA من ميناء شنغهاي' },
        { from: 'in_transit', to: 'arrived_destination', daysAgo: 4, notes: 'رسو السفينة وتفريغ الحاوية بميناء الإسكندرية' },
        { from: 'arrived_destination', to: 'customs_submitted', daysAgo: 3, notes: 'إيداع البيان الجمركي وبدء إجراءات التخليص' },
      ]),
    },
    // 0002 — Polymer import from Rotterdam, currently sailing
    {
      companyId: company.id,
      jobFileNumber: 'BAN-2026-0002',
      clientId: deltaClient?.id,
      salesRepId: adminUser?.id,
      opsOfficerId: adminUser?.id,
      shippingLineId: maerskLine?.id,
      shipmentType: 'fcl' as const,
      incoterm: 'CIF' as const,
      originPortId: portRotterdam?.id,
      destinationPortId: portAlexandria?.id,
      currentStage: 'in_transit' as const,
      blNumber: 'MAEU9041280',
      vesselName: 'MAERSK MC-KINNEY MOLLER',
      voyageNumber: '2604W',
      etd: daysAgo(5),
      eta: daysAhead(14),
      freeDaysAllowed: 14,
      cargoDescription: 'Polymer Raw Granules in 20GP Bags',
      grossWeightKg: 42000,
      volumeCbm: 54,
      packageCount: 1200,
      packageType: 'BAG',
      containers: {
        create: [
          {
            companyId: company.id,
            containerNumber: 'MAEU4410921',
            containerType: 'GP_20' as const,
            sealNumber: 'SL-33412',
            status: 'on_board' as const,
            tareWeightKg: 2200,
            cargoWeightKg: 19800,
          },
        ],
      },
      events: eventChain([
        { from: null, to: 'booking_confirmed', daysAgo: 9, notes: 'تأكيد الحجز لدى خط ميرسك' },
        { from: 'booking_confirmed', to: 'cargo_received', daysAgo: 7, notes: 'استلام الحاوية بساحة ميناء روتردام' },
        { from: 'cargo_received', to: 'in_transit', daysAgo: 5, notes: 'إبحار السفينة من ميناء روتردام' },
      ]),
    },
    // 0003 — Construction materials from Ningbo to Sokhna, sailing with 2 containers
    {
      companyId: company.id,
      jobFileNumber: 'BAN-2026-0003',
      clientId: ahramClient?.id,
      salesRepId: adminUser?.id,
      opsOfficerId: adminUser?.id,
      shippingLineId: cmaLine?.id,
      shipmentType: 'fcl' as const,
      incoterm: 'CFR' as const,
      originPortId: portNingbo?.id,
      destinationPortId: portSokhna?.id,
      currentStage: 'in_transit' as const,
      blNumber: 'CMAU1122334',
      vesselName: 'CMA CGM MARCO POLO',
      voyageNumber: '2607W',
      etd: daysAgo(8),
      eta: daysAhead(12),
      freeDaysAllowed: 14,
      cargoDescription: 'Ceramic Tiles & Construction Materials in 2x40HQ',
      grossWeightKg: 47800,
      volumeCbm: 116,
      packageCount: 1680,
      packageType: 'CTN',
      containers: {
        create: [
          {
            companyId: company.id,
            containerNumber: 'CMAU2210441',
            containerType: 'HQ_40' as const,
            sealNumber: 'SL-77811',
            status: 'on_board' as const,
            tareWeightKg: 3820,
            cargoWeightKg: 23900,
          },
          {
            companyId: company.id,
            containerNumber: 'CMAU2210512',
            containerType: 'HQ_40' as const,
            sealNumber: 'SL-77812',
            status: 'on_board' as const,
            tareWeightKg: 3820,
            cargoWeightKg: 23900,
          },
        ],
      },
      events: eventChain([
        { from: null, to: 'booking_confirmed', daysAgo: 14, notes: 'تأكيد الحجز لدى مجموعة CMA CGM' },
        { from: 'booking_confirmed', to: 'cargo_received', daysAgo: 10, notes: 'استلام الحاويتين بمعزل النقل بميناء نينغبو' },
        { from: 'cargo_received', to: 'in_transit', daysAgo: 8, notes: 'إبحار السفينة من ميناء نينغبو نحو السخنة' },
      ]),
    },
    // 0004 — Resins from Jebel Ali to Port Said East, discharged & under clearance
    {
      companyId: company.id,
      jobFileNumber: 'BAN-2026-0004',
      clientId: deltaClient?.id,
      salesRepId: adminUser?.id,
      opsOfficerId: adminUser?.id,
      shippingLineId: coscoLine?.id,
      shipmentType: 'fcl' as const,
      incoterm: 'FOB' as const,
      originPortId: portJebelAli?.id,
      destinationPortId: portSaidEast?.id,
      currentStage: 'clearance_in_progress' as const,
      blNumber: 'COSU6677881',
      vesselName: 'COSCO SHIPPING UNIVERSE',
      voyageNumber: '068W',
      etd: daysAgo(18),
      eta: daysAgo(2),
      ata: daysAgo(2),
      freeDaysAllowed: 10,
      cargoDescription: 'Industrial Polymer Resins in 3x20GP',
      grossWeightKg: 58200,
      volumeCbm: 84,
      packageCount: 2400,
      packageType: 'BAG',
      containers: {
        create: [
          {
            companyId: company.id,
            containerNumber: 'COSU8811002',
            containerType: 'GP_20' as const,
            sealNumber: 'SL-61002',
            status: 'discharged' as const,
            dischargedAt: daysAgo(2),
            tareWeightKg: 2200,
            cargoWeightKg: 19400,
          },
          {
            companyId: company.id,
            containerNumber: 'COSU8811033',
            containerType: 'GP_20' as const,
            sealNumber: 'SL-61033',
            status: 'discharged' as const,
            dischargedAt: daysAgo(2),
            tareWeightKg: 2200,
            cargoWeightKg: 19400,
          },
          {
            companyId: company.id,
            containerNumber: 'COSU8811077',
            containerType: 'GP_20' as const,
            sealNumber: 'SL-61077',
            status: 'discharged' as const,
            dischargedAt: daysAgo(2),
            tareWeightKg: 2200,
            cargoWeightKg: 19400,
          },
        ],
      },
      events: eventChain([
        { from: null, to: 'booking_confirmed', daysAgo: 24, notes: 'تأكيد الحجز لدى كوسكو للنقل البحري' },
        { from: 'booking_confirmed', to: 'cargo_received', daysAgo: 20, notes: 'استلام الحاويات بميناء جبل علي' },
        { from: 'cargo_received', to: 'in_transit', daysAgo: 18, notes: 'إبحار السفينة نحو غرب بورسعيد' },
        { from: 'in_transit', to: 'arrived_destination', daysAgo: 2, notes: 'الرسو والتفريغ بميناء شرق بورسعيد المحوري' },
        { from: 'arrived_destination', to: 'clearance_in_progress', daysAgo: 1, notes: 'بدء الكشف والتثمين بميناء غرب بورسعيد' },
      ]),
    },
    // 0005 — Solar equipment booking, awaiting vessel at origin
    {
      companyId: company.id,
      jobFileNumber: 'BAN-2026-0005',
      clientId: deltaClient?.id,
      salesRepId: adminUser?.id,
      opsOfficerId: adminUser?.id,
      shippingLineId: hapagLine?.id,
      shipmentType: 'fcl' as const,
      incoterm: 'FOB' as const,
      originPortId: portShanghai?.id,
      destinationPortId: portDamietta?.id,
      currentStage: 'booking_confirmed' as const,
      blNumber: 'HLCU3344556',
      vesselName: 'ANTWERPEN EXPRESS',
      voyageNumber: '2212W',
      etd: daysAhead(9),
      eta: daysAhead(31),
      freeDaysAllowed: 14,
      cargoDescription: 'Solar Panels & Inverters in 1x40HQ + 1x40GP',
      grossWeightKg: 19800,
      volumeCbm: 74,
      packageCount: 520,
      packageType: 'PLT',
      containers: {
        create: [
          {
            companyId: company.id,
            containerNumber: 'HLXU5522001',
            containerType: 'HQ_40' as const,
            sealNumber: 'SL-52001',
            status: 'booked' as const,
            tareWeightKg: 3820,
            cargoWeightKg: 15200,
          },
          {
            companyId: company.id,
            containerNumber: 'HLXU5522002',
            containerType: 'GP_40' as const,
            sealNumber: 'SL-52002',
            status: 'booked' as const,
            tareWeightKg: 3760,
            cargoWeightKg: 4600,
          },
        ],
      },
      events: eventChain([
        { from: null, to: 'booking_confirmed', daysAgo: 2, notes: 'تأكيد الحجز لدى خط هاباغ لويد' },
      ]),
    },
    // 0006 — Completed dairy import: delivered & empties returned
    {
      companyId: company.id,
      jobFileNumber: 'BAN-2026-0006',
      clientId: ahramClient?.id,
      salesRepId: adminUser?.id,
      opsOfficerId: adminUser?.id,
      shippingLineId: mscLine?.id,
      shipmentType: 'fcl' as const,
      incoterm: 'CIF' as const,
      originPortId: portShanghai?.id,
      destinationPortId: portAlexandria?.id,
      currentStage: 'delivered' as const,
      blNumber: 'MSCU9988776',
      vesselName: 'MSC IRINA',
      voyageNumber: '2598W',
      etd: daysAgo(48),
      eta: daysAgo(22),
      ata: daysAgo(22),
      freeDaysAllowed: 21,
      cargoDescription: 'Dairy Powders & Food Additives in 2x40RF',
      grossWeightKg: 44600,
      volumeCbm: 126,
      packageCount: 2100,
      packageType: 'CTN',
      containers: {
        create: [
          {
            companyId: company.id,
            containerNumber: 'MSKU9900112',
            containerType: 'RF_40' as const,
            sealNumber: 'SL-90112',
            status: 'delivered' as const,
            dischargedAt: daysAgo(22),
            tareWeightKg: 4100,
            cargoWeightKg: 21400,
          },
          {
            companyId: company.id,
            containerNumber: 'MSKU9900148',
            containerType: 'RF_40' as const,
            sealNumber: 'SL-90148',
            status: 'returned_empty' as const,
            dischargedAt: daysAgo(22),
            emptyReturnedAt: daysAgo(10),
            tareWeightKg: 4100,
            cargoWeightKg: 23200,
          },
        ],
      },
      events: eventChain([
        { from: null, to: 'booking_confirmed', daysAgo: 52, notes: 'تأكيد الحجز لدى الخط الملاحي MSC' },
        { from: 'booking_confirmed', to: 'cargo_received', daysAgo: 49, notes: 'استلام الحاويتين المبرّدتين بميناء شنغهاي' },
        { from: 'cargo_received', to: 'in_transit', daysAgo: 48, notes: 'إبحار السفينة MSC IRINA نحو الإسكندرية' },
        { from: 'in_transit', to: 'arrived_destination', daysAgo: 22, notes: 'الرسو والتفريغ بميناء الإسكندرية' },
        { from: 'arrived_destination', to: 'clearance_in_progress', daysAgo: 20, notes: 'الكشف والتثمين وسداد الرسوم الجمركية' },
        { from: 'clearance_in_progress', to: 'release_issued', daysAgo: 16, notes: 'صادر الإفراج النهائي - شهادة 46' },
        { from: 'release_issued', to: 'out_for_delivery', daysAgo: 14, notes: 'خروج الحاويات بالنقل البري إلى مصنع العميل' },
        { from: 'out_for_delivery', to: 'delivered', daysAgo: 12, notes: 'تم التسليم بمصنع العميل وإعادة الحاويات فارغة' },
      ]),
    },
  ];

  let createdCount = 0;
  let repairedCount = 0;
  for (const sh of shipmentSpecs) {
    if (!sh.clientId) continue; // skip if demo clients were not created
    const existing = await prisma.shipment.findFirst({
      where: { companyId: company.id, jobFileNumber: sh.jobFileNumber },
      include: { containers: true },
    });
    if (!existing) {
      await prisma.shipment.create({ data: sh as any });
      createdCount++;
      continue;
    }
    // Repair demo records created by test scripts (missing/incorrect ports, no containers, single sparse event)
    const patch: any = {};
    if (sh.originPortId) patch.originPortId = sh.originPortId;
    if (sh.destinationPortId) patch.destinationPortId = sh.destinationPortId;
    if (existing.containers.length === 0 && sh.containers.create.length > 0) {
      patch.containers = { create: sh.containers.create };
    }
    // Restore the realistic event history (and matching stage) when only a stub event exists
    const eventCount = await prisma.shipmentEvent.count({ where: { shipmentId: existing.id } });
    if (eventCount <= 1 && sh.events.create.length > 1) {
      patch.currentStage = sh.currentStage;
      patch.events = {
        deleteMany: {},
        create: sh.events.create,
      };
    }
    if (Object.keys(patch).length > 0) {
      await prisma.shipment.update({ where: { id: existing.id }, data: patch });
      repairedCount++;
    }
  }
  console.log(`✅ Demo Shipment Job Files: ${createdCount} created, ${repairedCount} repaired (ports, containers & event timelines)`);

  // 10. Create NAFEZA Customs Dossier with ACID (ملف نافذة — رقم القيد المسبق)
  // Attached to BAN-2026-0001 (customs_submitted) so the tracking portal shows a real ACID.
  const shipment0001 = await prisma.shipment.findFirst({
    where: { companyId: company.id, jobFileNumber: 'BAN-2026-0001' },
  });
  const brokerUser = await prisma.user.findFirst({
    where: { companyId: company.id, email: 'ops@banna-logistics.com' },
  });

  if (shipment0001) {
    const existingDossier = await prisma.customsDossier.findFirst({
      where: { shipmentId: shipment0001.id },
    });
    if (!existingDossier) {
      // 19-digit ACID (standard ACI manifest pattern), issued 6 days ago → 84 days of validity left
      const acidNumber = '2026092188441200377';
      await prisma.customsDossier.create({
        data: {
          companyId: company.id,
          shipmentId: shipment0001.id,
          acidNumber,
          acidIssueDate: daysAgo(6),
          acidExpiryDate: daysAhead(84),
          customsValueDeclared: 275000,
          status: 'acid_issued',
          customsBrokerId: brokerUser?.id,
          notes: 'تم إصدار رقم القيد المسبق ACID عبر منصة نافذة — بيان شحنة وارد ACI (بيانات تجريبية)',
        },
      });
      console.log(`✅ Created NAFEZA Customs Dossier for ${shipment0001.jobFileNumber} (ACID: ${acidNumber}, valid 84 days)`);
    }
  }

  console.log('🎉 Enterprise Database Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
