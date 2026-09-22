const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const p = new PrismaClient();

async function main() {
  const company = await p.company.findFirst({
    where: { name: 'Banna Freight & Logistics Egypt' },
  });

  if (!company) {
    console.error('Company not found!');
    return;
  }

  const passwordHash = await bcrypt.hash('password123', 10);

  const usersToSync = [
    { email: 'admin@redshipping.com', name: 'عمر السيد (مدير عام)', role: 'company_admin' },
    { email: 'sales@redshipping.com', name: 'أحمد الشريف (مسؤول مبيعات)', role: 'sales_rep' },
    { email: 'ops@redshipping.com', name: 'سارة حسين (مسؤولة عمليات وتخليص)', role: 'ops_officer' },
    { email: 'accountant@redshipping.com', name: 'سامي كمال (المدير المالي)', role: 'accountant' },
    { email: 'admin@banna-logistics.com', name: 'Omar Banna (مدير عام)', role: 'company_admin' },
  ];

  for (const u of usersToSync) {
    const existing = await p.user.findFirst({ where: { email: u.email } });
    if (existing) {
      await p.user.update({
        where: { id: existing.id },
        data: {
          companyId: company.id,
          passwordHash,
          isActive: true,
          role: u.role,
        },
      });
      console.log(`Updated user ${u.email} -> company ${company.id}`);
    } else {
      await p.user.create({
        data: {
          companyId: company.id,
          email: u.email,
          name: u.name,
          role: u.role,
          passwordHash,
          isActive: true,
        },
      });
      console.log(`Created user ${u.email} -> company ${company.id}`);
    }
  }

  console.log('All admin and redshipping users synced to PostgreSQL with companyId:', company.id);
}

main()
  .catch(console.error)
  .finally(() => p.$disconnect());
