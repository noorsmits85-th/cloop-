import { PrismaClient, UserRole, GenderCategory, ItemCondition } from '@prisma/client';
import crypto from 'node:crypto';

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SECURITY_BLOCK: Seeding is strictly prohibited in production.');
  }

  console.log('Seeding local development database...');
  const seedPassword = process.env.SEED_DEFAULT_PASSWORD || `scrypt_local_${crypto.randomUUID()}`;

  // Delete all existing data in local development only
  await prisma.blogInteraction.deleteMany();
  await prisma.blogPost.deleteMany();
  await prisma.review.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.rentalHistory.deleteMany();
  await prisma.listing.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.productLifecycle.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();

  // 1. Create Users
  const admin = await prisma.user.create({
    data: {
      name: 'Admin CLOOP',
      email: 'admin@cloop.local',
      password: seedPassword,
      role: UserRole.ADMIN,
      isVerified: true,
      rating: 5.0
    }
  });

  await prisma.user.create({
    data: {
      name: 'Trang Thuê Đồ',
      email: 'user@cloop.local',
      password: seedPassword,
      role: UserRole.USER,
      isVerified: true,
      rating: 4.8
    }
  });

  // 2. Create Products
  await prisma.product.create({
    data: {
      title: 'Đầm dạ hội đỏ đun sang trọng',
      description: 'Phù hợp đi tiệc, đám cưới, sự kiện cuối năm. Đã giặt hấp sạch sẽ.',
      size: 'M',
      gender: GenderCategory.FEMALE,
      condition: ItemCondition.EXCELLENT,
      category: 'DRESSES',
      brand: 'Zara',
      color: 'Đỏ đun',
      occasion: 'Đi tiệc, Sự kiện',
      province: 'Nghệ An',
      specificAddress: 'TP Vinh',
      userId: admin.id,
      images: {
        create: [
          { url: '/1.1.jpg', isPrimary: true, sortOrder: 0 },
          { url: '/1.2.jpg', isPrimary: false, sortOrder: 1 }
        ]
      },
      listings: {
        create: [
          {
            listingType: 'RENT',
            basePrice: 150000,
            deposit: 500000,
            minDays: 2
          }
        ]
      }
    }
  });

  console.log('Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
