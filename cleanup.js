const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ select: { id: true } });
  const userIds = users.map(u => u.id);
  
  const deleted = await prisma.product.deleteMany({
    where: {
      userId: { notIn: userIds }
    }
  });
  
  console.log(`Deleted ${deleted.count} orphaned products`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
