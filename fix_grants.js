const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    await prisma.$executeRawUnsafe('GRANT USAGE ON SCHEMA public TO anon, authenticated;');
    await prisma.$executeRawUnsafe('GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO anon, authenticated;');
    await prisma.$executeRawUnsafe('GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;');
    
    await prisma.$executeRawUnsafe("NOTIFY pgrst, 'reload schema';");
    console.log('Grants executed successfully and schema reloaded!');
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

run();
