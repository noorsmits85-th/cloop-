import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkMissingImages() {
  const products = await prisma.product.findMany({
    where: {
      isDeleted: false,
      images: { none: {} }
    },
    select: { id: true, title: true, occasion: true, category: true }
  });

  console.log("Missing image products:", products);

  for (const p of products) {
    let fallbackImg = "/1.1.jpg";
    if (p.occasion === "Áo dài" || p.title.toLowerCase().includes("áo dài")) fallbackImg = "/anhbia.png";
    else if (p.occasion === "Vintage" || p.title.toLowerCase().includes("vintage")) fallbackImg = "/vintage_coat.jpg";
    else if (p.occasion === "Phụ kiện" || p.title.toLowerCase().includes("túi")) fallbackImg = "/step2_bag.jpg";
    else if (p.occasion === "Dạ hội" || p.title.toLowerCase().includes("dạ hội")) fallbackImg = "/evening_dress.jpg";

    await prisma.productImage.create({
      data: {
        productId: p.id,
        url: fallbackImg,
        isPrimary: true,
        sortOrder: 0,
        storageProvider: "cloudinary"
      }
    });
    console.log(`✅ Đã bổ sung ảnh lookbook cho sản phẩm "${p.title}" -> ${fallbackImg}`);
  }
}

checkMissingImages().finally(() => prisma.$disconnect());
