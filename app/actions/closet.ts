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
    const [user, products, completedCount, blogPosts, authMetaRows] = await Promise.all([
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
      }),
      prisma.$queryRawUnsafe<any[]>(
        `SELECT raw_user_meta_data FROM auth.users WHERE id = $1::uuid;`,
        userId
      ).catch(() => [])
    ]);

    const authMeta = authMetaRows?.[0]?.raw_user_meta_data || {};

    let activeUser = user;
    if (!activeUser) {
      // 🌟 Tự động phục hồi/khởi tạo người dùng nếu có ID hợp lệ để không bao giờ bị lỗi 404 khi truy cập link tủ đồ
      try {
        activeUser = await prisma.user.create({
          data: {
            id: userId,
            email: `${userId}@cloop.vn`,
            name: "Thành viên CLOOP",
            password: "supabase_auth_managed",
            walletBalance: 0,
            cloopCoins: 100,
            role: "USER"
          },
          select: {
            id: true,
            name: true,
            avatar: true,
            rating: true,
            reviewCount: true,
            completedOrders: true,
            createdAt: true
          }
        });
      } catch {
        activeUser = await prisma.user.findUnique({
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
        });
      }
    }

    if (!activeUser) {
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

    const joinDateObj = activeUser.createdAt ? new Date(activeUser.createdAt) : new Date();
    const joinDateStr = `${String(joinDateObj.getMonth() + 1).padStart(2, '0')}/${joinDateObj.getFullYear()}`;

    const ownerInfo: ClosetUserProfile = {
      id: activeUser.id,
      name: activeUser.name || authMeta.name || "Thành viên CLOOP",
      avatar: activeUser.avatar || authMeta.avatar_url || authMeta.avatar || null,
      joinDate: joinDateStr,
      bio: authMeta.bio || "Mình là một người yêu thời trang vintage và những chuyến đi. Mình tin rằng mỗi món đồ đều có một câu chuyện đẹp để kể lại.",
      quote: authMeta.quote || "Lưu giữ ký ức qua từng chiếc váy.",
      coverImage: authMeta.coverImage || null,
      location: authMeta.location || products[0]?.province || "Nghệ An, Việt Nam",
      todaysMemory: authMeta.todaysMemory || "Hôm nay mình vừa thêm đồ mới vào tủ đồ CLOOP. Cùng chia sẻ để sống xanh!",
      rating: activeUser.rating !== undefined ? Number(activeUser.rating) : 5.0,
      completedOrders: Math.max(activeUser.completedOrders || 0, completedCount),
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
  location?: string;
  bio?: string;
  quote?: string;
  todaysMemory?: string;
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

    // 2. Cập nhật trực tiếp raw_user_meta_data trong auth.users để đồng bộ tức thì
    try {
      const metaPayload: Record<string, any> = {};
      if (data.name) {
        metaPayload.name = data.name;
        metaPayload.full_name = data.name;
      }
      if (data.location) metaPayload.location = data.location;
      if (data.quote) metaPayload.quote = data.quote;
      if (data.bio) metaPayload.bio = data.bio;
      if (data.todaysMemory) metaPayload.todaysMemory = data.todaysMemory;
      if (data.avatar !== undefined) {
        metaPayload.avatar = data.avatar;
        metaPayload.avatar_url = data.avatar;
      }

      await prisma.$executeRawUnsafe(
        `UPDATE auth.users SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || $1::jsonb WHERE id = $2::uuid;`,
        JSON.stringify(metaPayload),
        data.userId
      );
    } catch (dbMetaErr) {
      console.warn("Direct auth.users metadata update fallback in closet:", dbMetaErr);
    }

    try {
      const { createClient } = await import("@/src/utils/supabase/server");
      const supabase = await createClient();
      await supabase.auth.updateUser({
        data: {
          name: data.name,
          location: data.location || undefined,
          quote: data.quote || undefined,
          bio: data.bio || undefined,
          todaysMemory: data.todaysMemory || undefined,
          avatar: data.avatar || undefined,
        }
      });
    } catch (sbErr) {
      console.warn("Supabase user metadata sync warning:", sbErr);
    }

    revalidatePath(`/closet/${data.userId}`);
    revalidatePath(`/my-closet/profile`);
    revalidatePath(`/my-closet`);
    revalidatePath(`/`, "layout");
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

export async function getMyClosetMobileDataAction() {
  try {
    const { createClient } = await import("@/src/utils/supabase/server");
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return { success: true, isLoggedIn: false };
    }

    const userId = user.id;

    const [dbUser, products, rentalsAsOwner, rentalsAsRenter, authMetaRows] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          rating: true,
          reviewCount: true,
          completedOrders: true,
          cloopCoins: true,
          walletBalance: true,
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
      prisma.rentalHistory.findMany({
        where: { product: { userId } },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          product: {
            select: { id: true, title: true, images: { take: 1, select: { url: true } } }
          },
          invoice: true
        }
      }),
      prisma.rentalHistory.findMany({
        where: { renterId: userId },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          product: {
            select: { id: true, title: true, images: { take: 1, select: { url: true } } }
          },
          invoice: true
        }
      }),
      prisma.$queryRawUnsafe<any[]>(
        `SELECT raw_user_meta_data FROM auth.users WHERE id = $1::uuid;`,
        userId
      ).catch(() => [])
    ]);

    const authMeta = authMetaRows?.[0]?.raw_user_meta_data || {};

    let co2Saved = 0;
    let waterSaved = 0;
    products.forEach((p) => {
      const rentListing = p.listings.find(l => l.listingType === "RENT");
      const basePrice = rentListing?.basePrice ? Number(rentListing.basePrice) : 250000;
      co2Saved += Math.round((basePrice / 50000) * 5.8 * 10) / 10;
      waterSaved += Math.round((basePrice / 50000) * 2000);
    });

    const formattedProducts = products.map((p) => {
      const rentListing = p.listings.find(l => l.listingType === "RENT");
      const sellListing = p.listings.find(l => l.listingType === "SELL" || l.listingType === "RECYCLE");
      const primaryImg = p.images[0]?.url || "/1.1.jpg";

      return {
        id: p.id,
        title: p.title,
        image: primaryImg,
        category: p.category || "Dạ hội & Tiệc",
        occasion: p.occasion || "Tiệc cưới",
        size: p.size || "M",
        material: p.material || "Lụa",
        condition: p.condition || "GOOD",
        rentalPrice: rentListing ? Number(rentListing.basePrice) : 0,
        salePrice: sellListing ? Number(sellListing.basePrice) : 0,
        deposit: rentListing ? Number(rentListing.depositAmount || 0) : 0,
        status: p.status || "ON_MARKET",
        createdAt: p.createdAt.toISOString()
      };
    });

    return {
      success: true,
      isLoggedIn: true,
      user: {
        id: userId,
        name: dbUser?.name || authMeta.name || authMeta.full_name || user.email?.split("@")[0] || "Thành viên CLOOP",
        email: dbUser?.email || user.email || "",
        avatar: dbUser?.avatar || authMeta.avatar || authMeta.avatar_url || null,
        bio: authMeta.bio || "Thành viên cộng đồng thời trang tuần hoàn CLOOP.",
        quote: authMeta.quote || "Lưu giữ ký ức qua từng chiếc váy.",
        location: authMeta.location || "Hà Nội, Việt Nam",
        phone: authMeta.phone || "",
        pickupAddress: authMeta.pickup_address || authMeta.location || "",
        cloopCoins: dbUser?.cloopCoins ?? 120,
        walletBalance: dbUser?.walletBalance ?? 0,
        rating: Number(dbUser?.rating ?? 5.0),
        completedOrders: dbUser?.completedOrders ?? 0,
        joinDate: dbUser?.createdAt ? new Date(dbUser.createdAt).toLocaleDateString("vi-VN") : "2026"
      },
      stats: {
        totalItems: products.length,
        co2Saved: co2Saved || (products.length * 5.8),
        waterSaved: waterSaved || (products.length * 2000),
        greenPoints: dbUser?.cloopCoins ?? 120
      },
      myProducts: formattedProducts,
      ordersAsLender: rentalsAsOwner.map(r => ({
        id: r.id,
        status: r.status,
        startDate: r.start_date ? new Date(r.start_date).toLocaleDateString("vi-VN") : "",
        endDate: r.end_date ? new Date(r.end_date).toLocaleDateString("vi-VN") : "",
        productTitle: r.product?.title || "Trang phục tiệc",
        productImage: r.product?.images?.[0]?.url || "/1.1.jpg",
        amount: r.invoice?.amount || r.invoice?.rentalFee || 0,
        depositAmount: r.invoice?.depositAmount || 0,
        createdAt: r.createdAt ? new Date(r.createdAt).toLocaleDateString("vi-VN") : ""
      })),
      ordersAsRenter: rentalsAsRenter.map(r => ({
        id: r.id,
        status: r.status,
        startDate: r.start_date ? new Date(r.start_date).toLocaleDateString("vi-VN") : "",
        endDate: r.end_date ? new Date(r.end_date).toLocaleDateString("vi-VN") : "",
        productTitle: r.product?.title || "Trang phục tiệc",
        productImage: r.product?.images?.[0]?.url || "/1.1.jpg",
        amount: r.invoice?.amount || r.invoice?.rentalFee || 0,
        depositAmount: r.invoice?.depositAmount || 0,
        createdAt: r.createdAt ? new Date(r.createdAt).toLocaleDateString("vi-VN") : ""
      }))
    };
  } catch (error: any) {
    console.error("Lỗi getMyClosetMobileDataAction:", error);
    return { success: false, error: error.message || "Lỗi nạp dữ liệu cá nhân" };
  }
}

