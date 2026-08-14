const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const queries = await prisma.$queryRaw`
    SELECT pid, query 
    FROM pg_stat_activity 
    WHERE state = 'active' 
      AND pid <> pg_backend_pid();
  `;
  
  console.log("Active Queries:", queries);
  
  for (const q of queries) {
    if (q.query.includes('pg_terminate_backend') || q.query.includes('pg_stat_activity')) continue;
    console.log(`Killing PID ${q.pid}`);
    await prisma.$queryRawUnsafe(`SELECT pg_terminate_backend(${q.pid})`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
