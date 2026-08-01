const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.user.updateMany({
      where: { 
        email: { in: ['th4212044@gmail.com', 'noorsmits85@gmail.com'] }
      },
      data: { role: 'ADMIN' },
    });
    console.log('Successfully updated test accounts to ADMIN');
  } catch (error) {
    console.error('Failed to update users', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
