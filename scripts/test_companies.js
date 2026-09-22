const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const companies = await p.company.findMany();
  console.log('Companies:', companies.map(c => ({ id: c.id, name: c.name })));
}

main().finally(() => p.$disconnect());
