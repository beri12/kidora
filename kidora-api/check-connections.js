const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.$queryRaw`SELECT count(*) as count FROM pg_stat_activity WHERE datname = 'kidora'`;
  console.log('Active connections to kidora:', result);

  const details = await prisma.$queryRaw`SELECT pid, state, query, backend_start FROM pg_stat_activity WHERE datname = 'kidora' ORDER BY backend_start ASC`;
  console.log('Connection details:', details);
}

main().finally(() => prisma.$disconnect());