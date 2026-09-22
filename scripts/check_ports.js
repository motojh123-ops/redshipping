const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const ports = await p.port.findMany();
  console.log('Ports in DB:', ports.map(x => ({ id: x.id, code: x.code, name: x.nameEn })));
}

main().finally(() => p.$disconnect());
