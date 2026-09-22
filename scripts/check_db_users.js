const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const users = await p.user.findMany({
    include: { company: true },
  });
  console.log('PostgreSQL Users:', users.map(u => ({ id: u.id, email: u.email, companyId: u.companyId, companyName: u.company?.name })));
}

main().finally(() => p.$disconnect());
