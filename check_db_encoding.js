const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkEncoding() {
  const blogs = await prisma.blogPost.findMany({ select: { title: true, content: true } });
  console.log("--- BLOGS ---");
  blogs.forEach(b => console.log(b.title?.substring(0, 50)));

  const products = await prisma.product.findMany({ select: { title: true, description: true } });
  console.log("--- PRODUCTS ---");
  products.forEach(p => console.log(p.title?.substring(0, 50)));

  const ledgers = await prisma.ledgerTransaction.findMany({ select: { description: true } });
  console.log("--- LEDGERS ---");
  ledgers.forEach(l => console.log(l.description?.substring(0, 50)));
}
checkEncoding().finally(() => prisma.$disconnect());
