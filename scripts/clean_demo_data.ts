import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanDemoData() {
  console.log('--- Cleaning any demo data from PostgreSQL ---');
  const deletedClients = await prisma.client.deleteMany({
    where: {
      OR: [
        { name: { contains: 'Al-Ahram', mode: 'insensitive' } },
        { tradeName: { contains: 'Al-Ahram', mode: 'insensitive' } },
        { name: { contains: 'الأهرام' } },
        { tradeName: { contains: 'الأهرام' } },
      ],
    },
  });
  console.log(`Deleted demo clients: ${deletedClients.count}`);

  const clients = await prisma.client.findMany({
    select: { id: true, name: true, tradeName: true },
  });
  console.log('Current real clients in PostgreSQL:', clients);
}

cleanDemoData()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
