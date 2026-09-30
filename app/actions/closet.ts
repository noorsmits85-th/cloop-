"use server";

import { prisma } from "@/src/lib/prisma";
import { requireUser } from "@/src/lib/auth";
import { revalidatePath } from "next/cache";
import { maskPublicAddress } from "@/src/utils/shipping";

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
  reviewCount?: number;
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
    const cleanId = (userId || "").trim().replace(/^@/, "");

    // 1. Tìm user theo id hoặc theo name/email
    let activeUser = await prisma.user.findFirst({
      where: {
        OR: [
          { id: cleanId },
          { name: { equals: cleanId, mode: "insensitive" } },
          { email: { startsWith: cleanId, mode: "insensitive" } }
        ]
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

    const targetUserId = activeUser?.id || cleanId;

    const [products, completedCount, blogPosts, authMetaRows] = await Promise.all([
      prisma.product.findMany({
        where: { userId: targetUserId, isDeleted: false },
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
        where: { ownerId: targetUserId, status: "LENDER_COMPLETED" }
      }),
      prisma.blogPost.findMany({
        where: { userId: targetUserId, status: "PUBLIC" },
        orderBy: { createdAt: "desc" },
        take: 8
      }),
      prisma.$queryRawUnsafe<any[]>(
        `SELECT raw_user_meta_data FROM auth.users WHERE id = $1::uuid;`,
        targetUserId
      ).catch(() => [])
    ]);

    const authMeta = authMetaRows?.[0]?.raw_user_meta_data || {};

    if (!activeUser) {
      // Tự động phục hồi/khởi tạo người dùng nếu có ID hợp lệ để không bao giờ bị lỗi 404 khi truy cập link tủ đồ
      try {
        activeUser = await prisma.user.create({
          data: {
            id: targetUserId,
            email: `${targetUserId}@cloop.vn`,
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
      const productLoc = maskPublicAddress(item.specificAddress || item.province, "Chưa cập nhật");

      if (rentPrice > 0) {
        formattedProducts.push({
          id: `${item.id}-rent`,
          productId: item.id,
          title: item.title,
          image,
          type: "Thuê",
          priceText: `${rentPrice.toLocaleString()}đ / ngày`,
          location: productLoc,
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
          location: productLoc,
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
          location: productLoc,
          size: item.size || "M",
          category: item.category,
          createdAt: item.createdAt.toISOString()
        });
      }
    });

    const joinDateObj = activeUser.createdAt ? new Date(activeUser.createdAt) : new Date();
    const joinDateStr = `${String(joinDateObj.getMonth() + 1).padStart(2, '0')}/${joinDateObj.getFullYear()}`;
    
    // 🛡️ ĐỒNG BỘ 100% NGUỒN ĐỊA CHỈ THEO CHUẨN GHN:
    // Ưu tiên 1: Địa chỉ trạm kho thực tế của các sản phẩm đang có trong tủ đồ (products[0].specificAddress / province)
    // Ưu tiên 2: Địa chỉ bưu tá GHN lấy hàng của tủ đồ (authMeta.pickup_address / full_address)
    // Ưu tiên 3: Tỉnh/Thành & Quận/Huyện GHN đã lưu (authMeta.district, authMeta.province)
    // Fallback: authMeta.location hoặc Việt Nam
    const ghnAddressCandidate = 
      products[0]?.specificAddress ||
      authMeta.pickup_address ||
      authMeta.full_address ||
      (authMeta.province ? [authMeta.district, authMeta.province].filter(Boolean).join(", ") : null) ||
      authMeta.location ||
      products[0]?.province;

    const userLoc = maskPublicAddress(ghnAddressCandidate, "Việt Nam");

    const ownerInfo: ClosetUserProfile = {
      id: activeUser.id,
      name: activeUser.name || authMeta.name || "Thành viên CLOOP",
      avatar: activeUser.avatar || authMeta.avatar_url || authMeta.avatar || null,
      joinDate: joinDateStr,
      bio: authMeta.bio || "Mình là một người yêu thời trang vintage và những chuyến đi. Mình tin rằng mỗi món đồ đều có một câu chuyện đẹp để kể lại.",
      quote: authMeta.quote || "Lưu giữ ký ức qua từng chiếc váy.",
      coverImage: authMeta.coverImage || null,
      location: userLoc,
      todaysMemory: authMeta.todaysMemory || "Hôm nay mình vừa thêm đồ mới vào tủ đồ CLOOP. Cùng chia sẻ để sống xanh!",
      rating: activeUser.rating !== undefined ? Number(activeUser.rating) : 5.0,
      reviewCount: activeUser.reviewCount ? Number(activeUser.reviewCount) : 0,
      completedOrders: Math.max(activeUser.completedOrders || 0, completedCount),
      totalProducts: products.length
    };

    const mappedMemories: ClosetMemory[] = blogPosts.length > 0
      ? blogPosts.map(b => {
          const d = new Date(b.createdAt);
          return {
            id: b.id,
            title: b.title,
            image: b.cover_image || products[0]?.images[0]?.url || "",
            date: `${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
          };
        })
      : [];

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
  phone?: string;
  provinceId?: number | string | null;
  districtId?: number | string | null;
  wardCode?: string | null;
  province?: string;
  district?: string;
  ward?: string;
  specificAddress?: string;
  addressNote?: string;
  pickupAddress?: string;
  fullAddress?: string;
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
      if (data.phone) metaPayload.phone = data.phone;
      if (data.location) metaPayload.location = data.location;
      if (data.quote) metaPayload.quote = data.quote;
      if (data.bio) metaPayload.bio = data.bio;
      if (data.todaysMemory) metaPayload.todaysMemory = data.todaysMemory;
      if (data.avatar !== undefined) {
        metaPayload.avatar = data.avatar;
        metaPayload.avatar_url = data.avatar;
      }
      if (data.provinceId !== undefined && data.provinceId !== "") metaPayload.province_id = Number(data.provinceId);
      if (data.districtId !== undefined && data.districtId !== "") metaPayload.district_id = Number(data.districtId);
      if (data.wardCode !== undefined) metaPayload.ward_code = String(data.wardCode);
      if (data.province) metaPayload.province = data.province;
      if (data.district) metaPayload.district = data.district;
      if (data.ward) metaPayload.ward = data.ward;
      if (data.specificAddress) metaPayload.specific_address = data.specificAddress;
      if (data.addressNote !== undefined) metaPayload.address_note = data.addressNote;
      if (data.pickupAddress) metaPayload.pickup_address = data.pickupAddress;
      if (data.fullAddress) metaPayload.full_address = data.fullAddress;

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
          phone: data.phone || undefined,
          province_id: data.provinceId ? Number(data.provinceId) : undefined,
          district_id: data.districtId ? Number(data.districtId) : undefined,
          ward_code: data.wardCode ? String(data.wardCode) : undefined,
          province: data.province || undefined,
          district: data.district || undefined,
          ward: data.ward || undefined,
          specific_address: data.specificAddress || undefined,
          address_note: data.addressNote || undefined,
          pickup_address: data.pickupAddress || undefined,
          full_address: data.fullAddress || undefined,
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

export async function saveUnifiedUserAddressAction(data: {
  userId?: string;
  name?: string;
  phone?: string;
  provinceId: number | string;
  districtId: number | string;
  wardCode: string;
  province: string;
  district: string;
  ward: string;
  specificAddress: string;
  addressNote?: string;
  fullAddress?: string;
}) {
  try {
    const { createClient } = await import("@/src/utils/supabase/server");
    const supabase = await createClient();
    let authUserId: string | null = null;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) authUserId = user.id;
    } catch (_) {}
    if (!authUserId) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) authUserId = session.user.id;
      } catch (_) {}
    }
    if (!authUserId && data.userId) {
      authUserId = data.userId;
    }

    const ghnParts = [data.specificAddress?.trim(), data.ward?.trim(), data.district?.trim(), data.province?.trim()].filter(Boolean);
    const fullAddr = data.fullAddress?.trim() || (ghnParts.join(", ") + (data.addressNote?.trim() ? ` (Ghi chú: ${data.addressNote.trim()})` : ""));
    const locationStr = [data.ward?.trim(), data.district?.trim(), data.province?.trim()].filter(Boolean).join(", ") || data.province?.trim() || "";

    const metaPayload: Record<string, any> = {
      province_id: data.provinceId ? Number(data.provinceId) : null,
      district_id: data.districtId ? Number(data.districtId) : null,
      ward_code: data.wardCode ? String(data.wardCode) : null,
      province: data.province?.trim() || "",
      district: data.district?.trim() || "",
      ward: data.ward?.trim() || "",
      specific_address: data.specificAddress?.trim() || "",
      address_note: data.addressNote?.trim() || "",
      pickup_address: fullAddr,
      full_address: fullAddr,
      location: locationStr
    };
    if (data.name?.trim()) {
      metaPayload.name = data.name.trim();
      metaPayload.full_name = data.name.trim();
    }
    if (data.phone?.trim()) {
      metaPayload.phone = data.phone.trim();
    }

    if (authUserId) {
      try {
        await prisma.$executeRawUnsafe(
          `UPDATE auth.users SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || $1::jsonb WHERE id = $2::uuid;`,
          JSON.stringify(metaPayload),
          authUserId
        );
      } catch (e) {
        console.warn("Raw update fallback in saveUnifiedUserAddressAction:", e);
      }
      try {
        await supabase.auth.updateUser({ data: metaPayload });
      } catch (_) {}
    }

    return { 
      success: true, 
      unifiedAddress: {
        provinceId: data.provinceId ? Number(data.provinceId) : "",
        districtId: data.districtId ? Number(data.districtId) : "",
        wardCode: data.wardCode ? String(data.wardCode) : "",
        province: data.province?.trim() || "",
        district: data.district?.trim() || "",
        ward: data.ward?.trim() || "",
        specificAddress: data.specificAddress?.trim() || "",
        addressNote: data.addressNote?.trim() || "",
        fullAddress: fullAddr,
        location: locationStr,
        recipientName: data.name?.trim() || "",
        phone: data.phone?.trim() || ""
      }
    };
  } catch (err: any) {
    console.error("Lỗi saveUnifiedUserAddressAction:", err);
    return { success: false, error: err.message || "Không thể lưu địa chỉ GHN" };
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

export async function getMyClosetMobileDataAction(clientUserId?: string) {
  try {
    const { createClient } = await import("@/src/utils/supabase/server");
    const supabase = await createClient();
    let authUser: any = null;

    // 1. Thử getUser()
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) authUser = user;
    } catch (_) {}

    // 2. Thử getSession()
    if (!authUser) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) authUser = session.user;
      } catch (_) {}
    }

    // 3. Phân tích token từ Cookies cục bộ
    if (!authUser) {
      try {
        const { cookies } = await import('next/headers');
        const cookieStore = await cookies();
        const allCookies = cookieStore.getAll();
        const authCookies = allCookies
          .filter(c => c.name.includes('-auth-token'))
          .sort((a, b) => a.name.localeCompare(b.name));
        if (authCookies.length > 0) {
          let rawVal = authCookies.map(c => c.value).join('');
          if (rawVal.startsWith('base64-')) {
            rawVal = Buffer.from(rawVal.slice(7), 'base64').toString('utf-8');
          }
          const parsed = JSON.parse(rawVal);
          const token = parsed?.access_token || (Array.isArray(parsed) ? parsed[0] : null);
          let extractedId = parsed?.user?.id;
          if (!extractedId && typeof token === 'string' && token.includes('.')) {
            const parts = token.split('.');
            if (parts.length >= 2) {
              const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
              extractedId = payload?.sub;
            }
          }
          if (extractedId) {
            authUser = { id: extractedId };
          }
        }
      } catch (_) {}
    }

    // 4. Nếu client gửi kèm clientUserId đã lưu trên điện thoại
    if (!authUser && clientUserId) {
      try {
        const existing = await prisma.user.findUnique({
          where: { id: clientUserId },
          select: { id: true }
        });
        if (existing) {
          authUser = { id: existing.id };
        }
      } catch (_) {}
    }

    if (!authUser?.id) {
      return { success: true, isLoggedIn: false };
    }

    const userId = authUser.id;

    const [dbUser, products, rentalsAsOwner, rentalsAsRenter, authMetaRows, withdrawals] = await Promise.all([
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
          pendingWithdrawalBalance: true,
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
      ).catch(() => []),
      prisma.withdrawalRequest.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          amount: true,
          bankName: true,
          bankAccountNumber: true,
          bankAccountHolder: true,
          status: true,
          adminNote: true,
          createdAt: true
        }
      }).catch(() => [])
    ]);

    const authMeta = authMetaRows?.[0]?.raw_user_meta_data || {};

    let co2Saved = 0;
    let waterSaved = 0;
    products.forEach((p) => {
      const rentListing = p.listings.find(l => l.listingType === "RENT");
      const basePrice = rentListing?.basePrice ? Number(rentListing.basePrice) : (p.listings[0]?.basePrice ? Number(p.listings[0].basePrice) : 0);
      if (basePrice > 0) {
        co2Saved += Math.round((basePrice / 50000) * 5.8 * 10) / 10;
        waterSaved += Math.round((basePrice / 50000) * 2000);
      }
    });

    const formattedProducts = products.map((p) => {
      const rentListing = p.listings.find(l => l.listingType === "RENT");
      const sellListing = p.listings.find(l => l.listingType === "SELL" || l.listingType === "RECYCLE");
      const primaryImg = p.images[0]?.url || "https://res.cloudinary.com/dfqbxmgqi/image/upload/v1790530424/cloop_mobile_closet/pt4xccwmvrjsrnhrgnib.png";

      const isShopHidden = p.listings.length > 0 && p.listings.every(l => l.status === "HIDDEN");
      const isRentalActive = p.listings.some(l => l.listingType === "RENT" && l.status === "AVAILABLE");
      const isSaleActive = p.listings.some(l => (l.listingType === "SELL" || l.listingType === "RECYCLE") && l.status === "AVAILABLE");

      return {
        id: p.id,
        title: p.title,
        image: primaryImg,
        images: p.images.map(img => img.url),
        category: p.category || "Dạ hội & Tiệc",
        occasion: p.occasion || "Tiệc cưới",
        size: p.size || "M",
        material: p.material || "Lụa",
        condition: p.condition || "GOOD",
        rentalPrice: rentListing ? Number(rentListing.basePrice) : 0,
        salePrice: sellListing ? Number(sellListing.basePrice) : 0,
        deposit: rentListing ? Number(rentListing.deposit || 0) : 0,
        province: p.province || "Hà Nội",
        location: p.province || "Hà Nội",
        districtId: p.districtId || null,
        wardCode: p.wardCode || null,
        pricingTiers: (rentListing?.pricing_tiers as any) || null,
        status: p.status || "ON_MARKET",
        isShopHidden,
        isRentalActive,
        isSaleActive,
        createdAt: p.createdAt.toISOString()
      };
    });

    const userProvince = authMeta.province || null;
    const userDistrict = authMeta.district || null;
    const userWard = authMeta.ward || null;
    const userSpecificAddr = authMeta.specific_address || authMeta.address || null;
    const userNote = authMeta.address_note || authMeta.note || "";
    const ghnParts = [userSpecificAddr, userWard, userDistrict, userProvince].filter(Boolean);
    const computedFullAddress = ghnParts.length > 0
      ? (ghnParts.join(", ") + (userNote ? ` (Ghi chú: ${userNote})` : ""))
      : (authMeta.full_address || authMeta.pickup_address || (authMeta.location && authMeta.location !== "Hà Nội, Việt Nam" ? authMeta.location : ""));
    const computedLocation = userProvince
      ? [userDistrict, userProvince].filter(Boolean).join(", ")
      : (authMeta.location && authMeta.location !== "Hà Nội, Việt Nam" ? authMeta.location : "");

    return {
      success: true,
      isLoggedIn: true,
      user: {
        id: userId,
        name: dbUser?.name || authMeta.name || authMeta.full_name || dbUser?.email?.split("@")[0] || "Thành viên CLOOP",
        email: dbUser?.email || authMeta.email || "",
        avatar: dbUser?.avatar || authMeta.avatar || authMeta.avatar_url || null,
        bio: authMeta.bio || "Thành viên cộng đồng thời trang tuần hoàn CLOOP.",
        quote: authMeta.quote || "Lưu giữ ký ức qua từng chiếc váy.",
        location: computedLocation || "Chưa cập nhật địa chỉ",
        phone: authMeta.phone || "",
        pickupAddress: computedFullAddress || "",
        fullAddress: computedFullAddress || "",
        provinceId: authMeta.province_id ? Number(authMeta.province_id) : null,
        districtId: authMeta.district_id ? Number(authMeta.district_id) : null,
        wardCode: authMeta.ward_code ? String(authMeta.ward_code) : null,
        province: userProvince,
        district: userDistrict,
        ward: userWard,
        specificAddress: userSpecificAddr,
        addressNote: userNote,
        cloopCoins: dbUser?.cloopCoins ?? 120,
        walletBalance: dbUser?.walletBalance ?? 0,
        pendingWithdrawalBalance: dbUser?.pendingWithdrawalBalance ?? 0,
        bankName: authMeta.bank_name || authMeta.bankName || (withdrawals?.[0]?.bankName) || "",
        bankAccount: authMeta.bank_account || authMeta.bankAccountNumber || (withdrawals?.[0]?.bankAccountNumber) || "",
        bankOwner: authMeta.bank_owner || authMeta.bankAccountHolder || (withdrawals?.[0]?.bankAccountHolder) || dbUser?.name || "",
        rating: Number(dbUser?.rating ?? 5.0),
        reviewCount: dbUser?.reviewCount ?? 0,
        completedOrders: dbUser?.completedOrders ?? 0,
        joinDate: dbUser?.createdAt ? new Date(dbUser.createdAt).toLocaleDateString("vi-VN") : "2026"
      },
      withdrawals: (withdrawals || []).map((w: any) => ({
        id: w.id,
        amount: w.amount,
        bankName: w.bankName,
        bankAccountNumber: w.bankAccountNumber,
        bankAccountHolder: w.bankAccountHolder,
        status: w.status,
        adminNote: w.adminNote,
        createdAt: w.createdAt ? new Date(w.createdAt).toLocaleDateString("vi-VN") : ""
      })),
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
        productImage: r.product?.images?.[0]?.url || "https://res.cloudinary.com/dfqbxmgqi/image/upload/v1790530424/cloop_mobile_closet/pt4xccwmvrjsrnhrgnib.png",
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
        productImage: r.product?.images?.[0]?.url || "https://res.cloudinary.com/dfqbxmgqi/image/upload/v1790530424/cloop_mobile_closet/pt4xccwmvrjsrnhrgnib.png",
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

