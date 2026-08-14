const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function main() {
  const sql = fs.readFileSync('prisma/migrations/20260814094500_normalize_naming/clean2.sql', 'utf8');
  console.log("Executing SQL migration manually...");
  
  // Execute the raw SQL
  await prisma.$executeRawUnsafe(sql);
  
  console.log("Migration executed successfully!");
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
