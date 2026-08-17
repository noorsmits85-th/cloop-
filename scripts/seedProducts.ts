import { PrismaClient, ItemCondition } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding products...');

  // Lấy một user làm chủ đồ
  const user = await prisma.user.findFirst();
  if (!user) {
    console.log('Không tìm thấy User nào. Vui lòng đăng nhập 1 lần để tạo User.');
    return;
  }

  const mockProducts = [
    {
      title: 'Váy lụa tơ tằm thiết kế',
      description: 'Váy lụa cao cấp, mặc 1 lần đi tiệc. Phù hợp dạ hội.',
      category: 'Váy dạ hội',
      size: 'M',
      condition: 'EXCELLENT' as ItemCondition,
      province: 'Hà Nội',
      brand: 'SIXDO',
      occasion: 'Đi tiệc, Sự kiện',
      userId: user.id,
      images: [
        'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500&q=80',
        'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500&q=80'
      ],
      rentPrice: 150000,
      sellPrice: 1200000
    },
    {
      title: 'Túi xách da thật đính đá',
      description: 'Túi xách nhỏ xinh, sang trọng. Mới 99%.',
      category: 'Túi xách',
      size: 'FreeSize',
      condition: 'EXCELLENT' as ItemCondition,
      province: 'TP. Hồ Chí Minh',
      brand: 'Charles & Keith',
      occasion: 'Đi tiệc, Dạo phố',
      userId: user.id,
      images: [
        'https://images.unsplash.com/photo-1584916201218-f4242ceb4809?w=500&q=80'
      ],
      rentPrice: 80000,
      sellPrice: 500000
    },
    {
      title: 'Áo khoác Tweed Vintage',
      description: 'Áo khoác dạ Tweed phong cách quý tộc.',
      category: 'Áo khoác',
      size: 'S',
      condition: 'GOOD' as ItemCondition,
      province: 'Đà Nẵng',
      brand: 'Vintage',
      occasion: 'Đi làm, Đi tiệc',
      userId: user.id,
      images: [
        'https://images.unsplash.com/photo-1548624149-19d45e4ab558?w=500&q=80'
      ],
      rentPrice: 120000,
      sellPrice: null // Chỉ cho thuê
    }
  ];

  for (const item of mockProducts) {
    const product = await prisma.product.create({
      data: {
        title: item.title,
        description: item.description,
        category: item.category,
        size: item.size,
        condition: item.condition,
        province: item.province,
        districtId: 1,
        wardCode: "00001",
        specificAddress: "Đường ABC",
        brand: item.brand,
        occasion: item.occasion,
        userId: item.userId,
      }
    });

    // Thêm ảnh
    for (const url of item.images) {
      await prisma.productImage.create({
        data: {
          productId: product.id,
          url: url
        }
      });
    }

    // Thêm Listing RENT
    if (item.rentPrice) {
      await prisma.listing.create({
        data: {
          productId: product.id,
          listingType: 'RENT',
          basePrice: item.rentPrice,
          deposit: item.sellPrice || item.rentPrice * 3, // Cọc bằng giá bán hoặc x3 giá thuê
          status: 'AVAILABLE'
        }
      });
    }

    // Thêm Listing SELL
    if (item.sellPrice) {
      await prisma.listing.create({
        data: {
          productId: product.id,
          listingType: 'SELL',
          basePrice: item.sellPrice,
          status: 'AVAILABLE'
        }
      });
    }

    console.log(`Đã tạo: ${item.title}`);
  }

  console.log('🎉 Seed hoàn tất!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
