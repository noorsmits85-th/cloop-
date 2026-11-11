const { PrismaClient } = require('@prisma/client');
const crypto = require('node:crypto');
const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SECURITY_BLOCK: Mock seeding is prohibited in production.');
  }

  try {
    const seedPassword = process.env.SEED_DEFAULT_PASSWORD || `scrypt_mock_${crypto.randomUUID()}`;

    // 1. Tạo 1 User giả (chỉ dùng cho môi trường Local)
    const user = await prisma.user.create({
      data: {
        email: `mockuser_${Date.now()}@test.com`,
        name: 'Chủ Đồ Giả Lập',
        password: seedPassword,
      }
    });

    // 2. Tạo 1 Product giả
    const product = await prisma.product.create({
      data: {
        userId: user.id,
        title: 'Đầm Dạ Hội Ánh Kim 2027 (Mock Product)',
        description: 'Sản phẩm này được tạo tự động để test luồng Checkout.',
        size: 'M',
        gender: 'UNISEX',
        condition: 'EXCELLENT',
        category: 'Đầm',
        province: 'Hồ Chí Minh',
        specificAddress: 'Quận 1',
        listings: {
          create: {
            listingType: 'RENT',
            status: 'AVAILABLE',
            basePrice: 100000,
            deposit: 500000,
            turnaround_days: 2,
            pricing_tiers: [
              { days: 1, price: 100000, name: "Gói Hỏa Tốc", description: "Dành cho nhu cầu gấp" },
              { days: 3, price: 250000, name: "Gói Đi Tiệc", description: "Thong thả 3 ngày" },
              { days: 7, price: 500000, name: "Gói Nghỉ Dưỡng", description: "Du lịch dài ngày" }
            ]
          }
        },
        images: {
          create: {
            url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&auto=format&fit=crop',
            isPrimary: true
          }
        }
      }
    });

    console.log(`\nĐÃ TẠO THÀNH CÔNG SẢN PHẨM GIẢ LẬP!`);
    console.log(`URL Để Test Checkout: http://localhost:3000/checkout/${product.id}\n`);
  } catch (error) {
    console.error("Lỗi:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
