const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const result = await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema='public'`;
  console.log("CURRENT TABLES:");
  console.log(result.map(r => r.table_name));
}
main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
