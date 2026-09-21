import 'dotenv/config';
import { PrismaClient, UserRole, ClientStatus, VendorType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

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

  // 8. Create Demo Client
  let client = await prisma.client.findFirst({
    where: { companyId: company.id, name: 'Al-Ahram Food Industries' },
  });

  if (!client) {
    client = await prisma.client.create({
      data: {
        companyId: company.id,
        name: 'Al-Ahram Food Industries',
        tradeName: 'الأهرام للصناعات الغذائية',
        taxNumber: 'EG-TAX-28394721',
        commercialReg: 'CR-2021-8372',
        status: ClientStatus.active,
        salesRepId: salesUser?.id,
        category: 'مصنع ومستورد مواد غذائية',
        address: 'المنطقة الصناعية الثالثة، مدينة 6 أكتوبر، الجيزة',
        city: 'القاهرة / الجيزة',
        country: 'Egypt',
        contacts: {
          create: [
            {
              companyId: company.id,
              name: 'أحمد محمد الشريف',
              title: 'مدير المشتريات وسلاسل الإمداد',
              phone: '+20 2 3833 0000',
              mobile: '+20 100 123 4567',
              email: 'ahmed@alahram-foods.com',
              isPrimary: true,
            },
            {
              companyId: company.id,
              name: 'محمود فتحي',
              title: 'المدير المالي',
              phone: '+20 2 3833 0001',
              mobile: '+20 122 345 6789',
              email: 'mahmoud@alahram-foods.com',
              isPrimary: false,
            },
          ],
        },
      },
    });
    console.log('✅ Created demo client: Al-Ahram Food Industries');
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
