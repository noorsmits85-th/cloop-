"use server";

import { prisma } from "@/src/lib/prisma";
import { requireUser } from "@/src/lib/auth";
import { revalidatePath } from "next/cache";

export interface FormattedClosetProduct {
  id: string;
  productId: string;
  title: string;
  image: string;
  type: "Thuê" | "Mua sắm";
  priceText: string;
  location: string;
  size: string;
  category?: string;
  createdAt: string;
}

export interface ClosetUserProfile {
  id: string;
  name: string;
  avatar: string | null;
  joinDate: string;
  bio: string;
  quote: string;
  coverImage: string | null;
  location: string;
  todaysMemory: string;
  rating: number;
  completedOrders: number;
  totalProducts: number;
}

export interface ClosetMemory {
  id: string;
  title: string;
  image: string;
  date: string;
}

export async function getClosetFullDataAction(userId: string) {
  try {
    const [user, products, completedCount, blogPosts] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          avatar: true,
          rating: true,
          reviewCount: true,
          completedOrders: true,
          createdAt: true
        }
      }),
      prisma.product.findMany({
        where: { userId, isDeleted: false },
        orderBy: { createdAt: "desc" },
        include: {
          images: {
            select: { url: true, isPrimary: true },
            orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }]
          },
          listings: {
            where: { isDeleted: false }
          }
        }
      }),
      prisma.rentalHistory.count({
        where: { ownerId: userId, status: "LENDER_COMPLETED" }
      }),
      prisma.blogPost.findMany({
        where: { userId, status: "PUBLIC" },
        orderBy: { createdAt: "desc" },
        take: 8
      })
    ]);

    if (!user) {
      return { success: false, error: "Người dùng không tồn tại" };
    }

    const PLACEHOLDER_IMG = "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=600";
    const formattedProducts: FormattedClosetProduct[] = [];

    products.forEach((item) => {
      const rentListing = item.listings.find(l => l.listingType === "RENT" && l.status === "AVAILABLE");
      const sellListing = item.listings.find(l => l.listingType === "SELL" && l.status === "AVAILABLE");

      const rentPrice = rentListing ? Number(rentListing.basePrice) : 0;
      const sellPrice = sellListing ? Number(sellListing.basePrice) : 0;
      const image = item.images[0]?.url || PLACEHOLDER_IMG;

      if (rentPrice > 0) {
        formattedProducts.push({
          id: `${item.id}-rent`,
          productId: item.id,
          title: item.title,
          image,
          type: "Thuê",
          priceText: `${rentPrice.toLocaleString()}đ / ngày`,
          location: item.province || "Nghệ An",
          size: item.size || "M",
          category: item.category,
          createdAt: item.createdAt.toISOString()
        });
      }

      if (sellPrice > 0) {
        formattedProducts.push({
          id: `${item.id}-sale`,
          productId: item.id,
          title: item.title,
          image,
          type: "Mua sắm",
          priceText: `${sellPrice.toLocaleString()}đ`,
          location: item.province || "Nghệ An",
          size: item.size || "M",
          category: item.category,
          createdAt: item.createdAt.toISOString()
        });
      }

      if (rentPrice === 0 && sellPrice === 0) {
        formattedProducts.push({
          id: `${item.id}-display`,
          productId: item.id,
          title: item.title,
          image,
          type: "Thuê",
          priceText: "Liên hệ thuê",
          location: item.province || "Nghệ An",
          size: item.size || "M",
          category: item.category,
          createdAt: item.createdAt.toISOString()
        });
      }
    });

    const joinDateObj = user.createdAt ? new Date(user.createdAt) : new Date();
    const joinDateStr = `${String(joinDateObj.getMonth() + 1).padStart(2, '0')}/${joinDateObj.getFullYear()}`;

    const ownerInfo: ClosetUserProfile = {
      id: user.id,
      name: user.name || "Thành viên CLOOP",
      avatar: user.avatar || null,
      joinDate: joinDateStr,
      bio: "Mình là một người yêu thời trang vintage và những chuyến đi. Mình tin rằng mỗi món đồ đều có một câu chuyện đẹp để kể lại.",
      quote: "Lưu giữ ký ức qua từng chiếc váy.",
      coverImage: null,
      location: products[0]?.province || "Nghệ An, Việt Nam",
      todaysMemory: "Hôm nay mình vừa thêm đồ mới vào tủ đồ CLOOP. Cùng chia sẻ để sống xanh!",
      rating: user.rating !== undefined ? Number(user.rating) : 5.0,
      completedOrders: Math.max(user.completedOrders || 0, completedCount),
      totalProducts: products.length
    };

    const mappedMemories: ClosetMemory[] = blogPosts.length > 0
      ? blogPosts.map(b => {
          const d = new Date(b.createdAt);
          return {
            id: b.id,
            title: b.title,
            image: b.cover_image || "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?q=80&w=400",
            date: `${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
          };
        })
      : [
          { id: '1', title: "Chuyến đi cùng chiếc váy hoa nhí đầu tiên", image: "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?q=80&w=400", date: "05.2025" },
          { id: '2', title: "Chiếc váy lụa mình đã mặc trong buổi hoàng hôn", image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=400", date: "04.2025" },
          { id: '3', title: "Nhận chiếc váy vintage mình yêu thích nhất", image: "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?q=80&w=400", date: "03.2025" },
          { id: '4', title: "Kỷ niệm đáng nhớ ngày khai trương CLOOP", image: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?q=80&w=400", date: "02.2025" }
        ];

    return {
      success: true,
      ownerInfo,
      products: formattedProducts,
      rawProductCount: products.length,
      memories: mappedMemories
    };
  } catch (err: any) {
    console.error("Lỗi getClosetFullDataAction:", err);
    return { success: false, error: err.message || "Lỗi tải tủ đồ." };
  }
}

export async function updateClosetProfileAction(data: {
  userId: string;
  name?: string;
  avatar?: string | null;
}) {
  try {
    const userAuth = await requireUser();
    if (userAuth.id !== data.userId) {
      return { success: false, error: "Không có quyền chỉnh sửa hồ sơ này." };
    }

    await prisma.user.update({
      where: { id: data.userId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.avatar !== undefined && { avatar: data.avatar })
      }
    });

    revalidatePath(`/closet/${data.userId}`);
    revalidatePath(`/my-closet/profile`);
    return { success: true };
  } catch (err: any) {
    console.error("Lỗi updateClosetProfileAction:", err);
    return { success: false, error: err.message || "Không thể cập nhật hồ sơ." };
  }
}

export async function getClosetProfile(userId: string) {
  const profile = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      avatar: true,
      createdAt: true,
      totalListings: true,
      completedOrders: true
    }
  });
  return profile;
}

export async function getClosetProducts(userId: string, page: number = 1, take: number = 12) {
  const skip = (page - 1) * take;
  const products = await prisma.product.findMany({
    where: { userId, isDeleted: false },
    orderBy: { lastBumpedAt: "desc" },
    skip,
    take,
    include: {
      images: {
        orderBy: { sortOrder: 'asc' },
        take: 1
      },
      listings: true
    }
  });

  const totalCount = await prisma.product.count({
    where: { userId, isDeleted: false }
  });

  return {
    products,
    hasMore: skip + products.length < totalCount
  };
}
