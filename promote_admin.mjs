import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    const user = await prisma.user.update({
      where: { email: 'th4212044@gmail.com' },
      data: { role: 'ADMIN' },
    });
    console.log('Promoted to ADMIN:', user.email);
  } catch (error) {
    console.error('Error promoting user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
