import { PrismaClient, ItemCondition } from '@prisma/client';
const prisma = new PrismaClient();

async function seedRichOccasionProducts() {
  console.log("Seeding rich occasion products...");

  let user = await prisma.user.findFirst({
    where: { email: { not: "" } }
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: "elena.vance@cloop.vn",
        name: "Elena Vance (The Archive)",
        walletBalance: 0,
        cloopCoins: 1500,
        password: "hashed_password_123"
      }
    });
  }

  const items = [
    {
      title: "Đầm Lụa Tơ Tằm Cúp Ngực Dự Tiệc Cưới",
      description: "Thiết kế đầm lụa mềm mại, sang trọng thướt tha tôn dáng cô dâu phụ và khách dự tiệc cưới.",
      category: "Dạ hội",
      occasion: "Tiệc cưới",
      size: "M",
      brand: "LEINNÉ",
      province: "Hà Nội",
      rentPrice: 320000,
      image: "/evening_dress.jpg",
      isHighlighted: true
    },
    {
      title: "Set Dạ Tweed Ánh Kim Dạ Hội Quý Tộc",
      description: "Set áo dạ tweed dệt chỉ kim tuyến cao cấp phối cùng chân váy xếp ly xòe nhẹ.",
      category: "Dạ hội",
      occasion: "Tiệc cưới",
      size: "S",
      brand: "Chanel Vintage",
      province: "Hà Nội",
      rentPrice: 280000,
      image: "/step3_party.jpg",
      isHighlighted: false
    },
    {
      title: "Đầm Xẻ Tà Lụa Satin Đỏ Rượu Gala Night",
      description: "Thiết kế xẻ tà quyến rũ, khoe trọn đường cong và tỏa sáng dưới ánh đèn sân khấu.",
      category: "Dạ hội",
      occasion: "Dạ hội",
      size: "M",
      brand: "House of CB",
      province: "Hà Nội",
      rentPrice: 350000,
      image: "/1.1.jpg",
      isHighlighted: true
    },
    {
      title: "Áo Dài Gấm Tơ Tằm Dệt Thủ Công Di Sản",
      description: "Áo dài truyền thống chất liệu gấm tơ dệt thủ công sắc xảo, phom dáng thanh tao.",
      category: "Áo dài",
      occasion: "Áo dài",
      size: "M",
      brand: "CLOOP Heritage",
      province: "Hà Nội",
      rentPrice: 250000,
      image: "/anhbia.png",
      isHighlighted: true
    },
    {
      title: "Áo Dài Cách Tân Thêu Hoa Nổi Cao Cấp",
      description: "Áo dài lụa phối voan tơ thêu tay tinh tế, phom dáng hiện đại thanh lịch.",
      category: "Áo dài",
      occasion: "Áo dài",
      size: "S",
      brand: "Thiết Kế Việt",
      province: "TP. Hồ Chí Minh",
      rentPrice: 220000,
      image: "/hero_warm.jpg",
      isHighlighted: false
    },
    {
      title: "Blazer Dạ Dáng Dài Vintage Clean Luxury",
      description: "Blazer dáng suông vintage chất liệu dạ mịn cao cấp, phong cách quiet luxury thanh lịch.",
      category: "Vintage",
      occasion: "Vintage",
      size: "FreeSize",
      brand: "Yves Saint Laurent Vintage",
      province: "Đà Nẵng",
      rentPrice: 210000,
      image: "/vintage_coat.jpg",
      isHighlighted: true
    },
    {
      title: "Túi Xách Da Thật Archive Gold Hardware",
      description: "Túi xách da bê cao cấp phụ kiện mạ vàng vintage, hoàn thiện mọi outfit dự tiệc.",
      category: "Phụ kiện",
      occasion: "Phụ kiện",
      size: "FreeSize",
      brand: "Celine Archive",
      province: "Hà Nội",
      rentPrice: 180000,
      image: "/step2_bag.jpg",
      isHighlighted: true
    }
  ];

  for (const item of items) {
    const existing = await prisma.product.findFirst({
      where: { title: item.title, isDeleted: false }
    });

    if (!existing) {
      const prod = await prisma.product.create({
        data: {
          title: item.title,
          description: item.description,
          category: item.category,
          occasion: item.occasion,
          size: item.size,
          brand: item.brand,
          province: item.province,
          specificAddress: "Phố Huế, Hoàn Kiếm, Hà Nội",
          condition: ItemCondition.EXCELLENT,
          userId: user.id,
          isHighlighted: item.isHighlighted,
          status: "ON_MARKET",
        }
      });

      await prisma.productImage.create({
        data: {
          productId: prod.id,
          url: item.image,
          isPrimary: true,
          sortOrder: 0,
          storageProvider: "cloudinary"
        }
      });

      await prisma.listing.create({
        data: {
          productId: prod.id,
          listingType: "RENT",
          basePrice: item.rentPrice,
          deposit: item.rentPrice * 3,
          minDays: 1,
          status: "AVAILABLE"
        }
      });

      console.log(` ✅ Đã tạo sản phẩm: "${item.title}" [Dịp: ${item.occasion}]`);
    }
  }

  console.log("Seeding completed successfully!");
}

seedRichOccasionProducts().finally(() => prisma.$disconnect());
