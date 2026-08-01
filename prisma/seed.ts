import { PrismaClient, UserRole, GenderCategory, ItemCondition } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Delete all existing data
  await prisma.blogInteraction.deleteMany()
  await prisma.blogPost.deleteMany()
  await prisma.review.deleteMany()
  await prisma.invoice.deleteMany()
  await prisma.rentalHistory.deleteMany()
  await prisma.listing.deleteMany()
  await prisma.productImage.deleteMany()
  await prisma.productLifecycle.deleteMany()
  await prisma.product.deleteMany()
  await prisma.user.deleteMany()

  // 1. Create Users
  const admin = await prisma.user.create({
    data: {
      email: 'admin@cloop.vn',
      password: 'password123', // In real app, this should be hashed
      name: 'Admin CLOOP',
      role: UserRole.ADMIN,
      isVerified: true,
      rating: 5.0
    }
  })

  const user1 = await prisma.user.create({
    data: {
      email: 'renter@cloop.vn',
      password: 'password123',
      name: 'Trang Thuê Đồ',
      role: UserRole.USER,
      isVerified: true,
      rating: 4.8
    }
  })

  // 2. Create Products
  const product1 = await prisma.product.create({
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
  })

  console.log('Seed completed successfully.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
