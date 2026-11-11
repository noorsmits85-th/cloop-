"use server";

import { prisma } from "@/src/lib/prisma";
import { requireUser } from "@/src/lib/auth";
import { revalidatePath } from "next/cache";
import { maskPublicAddress } from "@/src/utils/shipping";
import { settleCompletedRentalOrder } from "@/lib/settlement-engine";

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
    if (!cleanId || cleanId.length < 2) {
      return { success: false, error: "Người dùng không tồn tại" };
    }

    // 1. Tìm user theo id hoặc tên hiển thị chính xác (TUYỆT ĐỐI KHÔNG cho phép startsWith email để chống dò quét Email Prefix Oracle)
    const activeUser = await prisma.user.findFirst({
      where: {
        OR: [
          { id: cleanId },
          { name: { equals: cleanId, mode: "insensitive" } }
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

    if (!activeUser) {
      return { success: false, error: "Người dùng không tồn tại" };
    }

    const targetUserId = activeUser.id;

    const [products, completedCount, blogPosts, authMetaRows] = await Promise.all([
      prisma.product.findMany({
        where: {
          userId: targetUserId,
          isDeleted: false,
          status: "ON_MARKET",
          listings: {
            some: {
              isDeleted: false,
              status: "AVAILABLE"
            }
          }
        },
        orderBy: { createdAt: "desc" },
        include: {
          images: {
            select: { url: true, isPrimary: true },
            orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }]
          },
          listings: {
            where: { isDeleted: false, status: "AVAILABLE" }
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
    });

    const joinDateObj = activeUser.createdAt ? new Date(activeUser.createdAt) : new Date();
    const joinDateStr = `${String(joinDateObj.getMonth() + 1).padStart(2, '0')}/${joinDateObj.getFullYear()}`;
    
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
      name: scrubPublicText(activeUser.name || authMeta.name || "Thành viên CLOOP"),
      avatar: activeUser.avatar || authMeta.avatar_url || authMeta.avatar || null,
      joinDate: joinDateStr,
      bio: scrubPublicText(authMeta.bio || "Mình là một người yêu thời trang vintage và những chuyến đi. Mình tin rằng mỗi món đồ đều có một câu chuyện đẹp để kể lại."),
      quote: scrubPublicText(authMeta.quote || "Lưu giữ ký ức qua từng chiếc váy."),
      coverImage: authMeta.coverImage || null,
      location: userLoc,
      todaysMemory: scrubPublicText(authMeta.todaysMemory || "Hôm nay mình vừa thêm đồ mới vào tủ đồ CLOOP. Cùng chia sẻ để sống xanh!"),
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
            title: scrubPublicText(b.title),
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
    return { success: false, error: "Lỗi tải tủ đồ." };
  }
}

export async function updateClosetProfileAction(data: {
  userId?: string;
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
    const user = await requireUser();
    const targetUserId = user.id;

    const cleanName = data.name?.trim().slice(0, 80);

    const existingUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { name: true, isVerified: true }
    });

    // 🛡️ BẢO MẬT ĐỊNH DANH BANK-KYC: Nếu tài khoản đã xác thực danh tính (isVerified) và đã có tên gốc,
    // không cho phép tự ý đổi họ tên pháp lý để lách đối chiếu chủ tài khoản ngân hàng.
    const allowNameUpdate = Boolean(
      cleanName && (!existingUser?.isVerified || !existingUser?.name?.trim())
    );

    // 1. Cập nhật bảng Prisma User
    await prisma.user.update({
      where: { id: targetUserId },
      data: {
        ...(allowNameUpdate && { name: cleanName }),
        ...(data.avatar !== undefined && { avatar: data.avatar })
      }
    });

    // 2. Cập nhật trực tiếp raw_user_meta_data trong auth.users để đồng bộ tức thì (Giới hạn độ dài chống JSONB Bloat)
    try {
      const metaPayload: Record<string, any> = {};
      if (allowNameUpdate && cleanName) {
        metaPayload.name = cleanName;
        metaPayload.full_name = cleanName;
      }
      if (data.phone) metaPayload.phone = data.phone.trim().slice(0, 20);
      if (data.location) metaPayload.location = data.location.slice(0, 200);
      if (data.quote) metaPayload.quote = data.quote.slice(0, 200);
      if (data.bio) metaPayload.bio = data.bio.slice(0, 500);
      if (data.todaysMemory) metaPayload.todaysMemory = data.todaysMemory.slice(0, 300);
      if (data.avatar !== undefined) {
        metaPayload.avatar = data.avatar;
        metaPayload.avatar_url = data.avatar;
      }
      if (data.provinceId !== undefined && data.provinceId !== "") metaPayload.province_id = Number(data.provinceId);
      if (data.districtId !== undefined && data.districtId !== "") metaPayload.district_id = Number(data.districtId);
      if (data.wardCode !== undefined) metaPayload.ward_code = String(data.wardCode).slice(0, 30);
      if (data.province) metaPayload.province = data.province.slice(0, 100);
      if (data.district) metaPayload.district = data.district.slice(0, 100);
      if (data.ward) metaPayload.ward = data.ward.slice(0, 100);
      if (data.specificAddress) metaPayload.specific_address = data.specificAddress.slice(0, 250);
      if (data.addressNote !== undefined) metaPayload.address_note = data.addressNote.slice(0, 250);
      if (data.pickupAddress) metaPayload.pickup_address = data.pickupAddress.slice(0, 300);
      if (data.fullAddress) metaPayload.full_address = data.fullAddress.slice(0, 300);

      await prisma.$executeRawUnsafe(
        `UPDATE auth.users SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || $1::jsonb WHERE id = $2::uuid;`,
        JSON.stringify(metaPayload),
        targetUserId
      );
    } catch (dbMetaErr) {
      console.warn("Direct auth.users metadata update fallback in closet:", dbMetaErr);
    }

    // 3. Cập nhật Supabase Session
    try {
      const { createClient } = await import("@/src/utils/supabase/server");
      const supabase = await createClient();
      await supabase.auth.updateUser({
        data: {
          ...(allowNameUpdate && cleanName ? { name: cleanName, full_name: cleanName } : {}),
          location: data.location ? data.location.slice(0, 200) : undefined,
          quote: data.quote ? data.quote.slice(0, 200) : undefined,
          bio: data.bio ? data.bio.slice(0, 500) : undefined,
          todaysMemory: data.todaysMemory ? data.todaysMemory.slice(0, 300) : undefined,
          avatar: data.avatar || undefined,
          phone: data.phone?.trim().slice(0, 20) || undefined,
          province_id: data.provinceId ? Number(data.provinceId) : undefined,
          district_id: data.districtId ? Number(data.districtId) : undefined,
          ward_code: data.wardCode ? String(data.wardCode).slice(0, 30) : undefined,
          province: data.province ? data.province.slice(0, 100) : undefined,
          district: data.district ? data.district.slice(0, 100) : undefined,
          ward: data.ward ? data.ward.slice(0, 100) : undefined,
          specific_address: data.specificAddress ? data.specificAddress.slice(0, 250) : undefined,
          address_note: data.addressNote ? data.addressNote.slice(0, 250) : undefined,
          pickup_address: data.pickupAddress ? data.pickupAddress.slice(0, 300) : undefined,
          full_address: data.fullAddress ? data.fullAddress.slice(0, 300) : undefined,
        }
      });
    } catch (sbErr) {
      console.warn("Supabase user metadata sync warning:", sbErr);
    }

    // 🛡️ BẢO MẬT: Tuyệt đối KHÔNG tự động sửa tên chủ thẻ trong các lệnh rút tiền đang PENDING khi đổi tên hồ sơ.

    // 5. Xóa sạch bộ nhớ đệm xác thực để request tiếp theo có dữ liệu mới ngay lập tức (0ms)
    try {
      const { clearUserAuthCache } = await import("@/src/lib/auth");
      clearUserAuthCache(targetUserId);
    } catch (_) {}

    revalidatePath(`/closet/${targetUserId}`);
    revalidatePath(`/my-closet/profile`);
    revalidatePath(`/my-closet`);
    revalidatePath(`/admin/payments`);
    revalidatePath(`/app`);
    revalidatePath(`/`, "layout");
    return { success: true };
  } catch (err: any) {
    console.error("Lỗi updateClosetProfileAction:", err);
    return { success: false, error: "Không thể cập nhật hồ sơ." };
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
    const user = await requireUser();
    const authUserId = user.id;

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
    const existingUser = await prisma.user.findUnique({
      where: { id: authUserId },
      select: { name: true, isVerified: true }
    });
    const canSetInitialName = Boolean(
      data.name?.trim() && (!existingUser?.isVerified || !existingUser?.name?.trim())
    );

    if (data.name?.trim()) {
      // Lưu tên người nhận giao hàng riêng, tuyệt đối không ghi đè tên định danh đã khóa
      metaPayload.recipient_name = data.name.trim().slice(0, 80);
      if (canSetInitialName) {
        metaPayload.name = data.name.trim().slice(0, 80);
        metaPayload.full_name = data.name.trim().slice(0, 80);
      }
    }
    if (data.phone?.trim()) {
      metaPayload.contact_phone = data.phone.trim().slice(0, 20);
    }

    if (canSetInitialName && data.name?.trim()) {
      try {
        await prisma.user.update({
          where: { id: authUserId },
          data: { name: data.name.trim().slice(0, 80) }
        });
      } catch (_) {}
    }

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
      const { createClient } = await import("@/src/utils/supabase/server");
      const supabase = await createClient();
      await supabase.auth.updateUser({ data: metaPayload });
    } catch (_) {}

    try {
      const { clearUserAuthCache } = await import("@/src/lib/auth");
      clearUserAuthCache(authUserId);
    } catch (_) {}

    revalidatePath("/my-closet");
    revalidatePath("/my-closet/profile");
    revalidatePath("/admin/payments");
    revalidatePath("/app");

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
    return { success: false, error: "Không thể lưu địa chỉ GHN" };
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

function maskCounterpartyPhone(phone?: string | null): string {
  if (!phone || typeof phone !== "string") return "Đã ẩn bảo mật qua CLOOP";
  const cleaned = phone.trim();
  if (cleaned.length < 7) return "Đã ẩn bảo mật qua CLOOP";
  return cleaned.slice(0, 3) + "****" + cleaned.slice(-3);
}

function scrubPublicText(raw?: string | null): string {
  if (!raw || typeof raw !== "string") return "";
  return raw
    .replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g, "")
    .replace(/[a-zA-Z0-9._%+-]+\s*(?:@|\(at\)|\[at\])\s*[a-zA-Z0-9.-]+\s*(?:\.|\(dot\)|\[dot\])\s*[a-zA-Z]{2,}/gi, "[Đã ẩn Email bảo mật]")
    .replace(/(?:(?:\+?84|0)[\s._\-()\/]*[35789](?:[\s._\-()\/]*\d){8})\b/g, "[Đã ẩn SĐT bảo mật]")
    .replace(/\b0\d(?:[\s._\-]*\d){8,9}\b/g, "[Đã ẩn SĐT bảo mật]")
    .replace(/\b(z[\s._\-]*a[\s._\-]*l[\s._\-]*o|telegram|facebook|instagram|thuê\s+ngoài|thue\s+ngoai|giao\s+dịch\s+ngoài|giao\s+dich\s+ngoai|không\s+qua\s+sàn|khong\s+qua\s+san)\b/gi, "[Liên hệ qua CLOOP]");
}

export async function getClosetProducts(userId: string, page: number = 1, take: number = 12) {
  const safePage = Math.max(1, Math.floor(Number(page) || 1));
  const safeTake = Math.min(50, Math.max(1, Math.floor(Number(take) || 12)));
  const skip = (safePage - 1) * safeTake;

  const whereClause = {
    userId,
    isDeleted: false,
    status: "ON_MARKET" as const,
  };

  const products = await prisma.product.findMany({
    where: whereClause,
    orderBy: { lastBumpedAt: "desc" },
    skip,
    take: safeTake,
    select: {
      id: true,
      userId: true,
      title: true,
      description: true,
      category: true,
      occasion: true,
      size: true,
      condition: true,
      material: true,
      color: true,
      province: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      lastBumpedAt: true,
      images: {
        select: {
          id: true,
          url: true,
          isPrimary: true,
          sortOrder: true,
        },
        orderBy: { sortOrder: "asc" },
        take: 1,
      },
      listings: {
        where: {
          isDeleted: false,
          status: { not: "HIDDEN" },
        },
        select: {
          id: true,
          productId: true,
          listingType: true,
          basePrice: true,
          salePrice: true,
          deposit: true,
          minDays: true,
          pricing_tiers: true,
          turnaround_days: true,
          greenPoints: true,
          status: true,
          createdAt: true,
        },
      },
    },
  });

  const totalCount = await prisma.product.count({
    where: whereClause,
  });

  // Hậu kiểm DTO công khai (đảm bảo loại bỏ hoàn toàn tọa độ GPS, địa chỉ chi tiết và snapshot ngay cả khi mock trả về dư trường)
  const sanitizedProducts = products.map((item: any) => {
    const {
      specificAddress: _specificAddress,
      latitude: _latitude,
      longitude: _longitude,
      districtId: _districtId,
      wardCode: _wardCode,
      ...rest
    } = item;

    const cleanListings = Array.isArray(rest.listings)
      ? rest.listings
          .filter((l: any) => !l?.isDeleted && l?.status !== "HIDDEN")
          .map((l: any) => {
            const { snapshot: _snapshot, ...listingRest } = l;
            return { ...listingRest, snapshot: undefined };
          })
      : [];

    return {
      ...rest,
      title: rest.title ? scrubPublicText(rest.title) : rest.title,
      description: rest.description ? scrubPublicText(rest.description) : rest.description,
      specificAddress: undefined,
      latitude: undefined,
      longitude: undefined,
      districtId: undefined,
      wardCode: undefined,
      listings: cleanListings,
    };
  });

  return {
    products: sanitizedProducts,
    hasMore: skip + products.length < totalCount,
  };
}

export async function getMyClosetMobileDataAction(_clientUserId?: string) {
  try {
    let user: any = null;
    try {
      user = await requireUser();
    } catch {
      return { success: true, isLoggedIn: false };
    }

    if (!user?.id) {
      return { success: true, isLoggedIn: false };
    }

    const userId = user.id;

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
        where: { product: { userId }, isDeleted: false },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          product: {
            select: {
              id: true,
              title: true,
              size: true,
              material: true,
              category: true,
              province: true,
              specificAddress: true,
              images: { select: { url: true } }
            }
          },
          invoice: true
        }
      }),
      prisma.rentalHistory.findMany({
        where: { renterId: userId, isDeleted: false },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          product: {
            select: {
              id: true,
              title: true,
              size: true,
              material: true,
              category: true,
              province: true,
              specificAddress: true,
              images: { select: { url: true } }
            }
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
        boostExpiresAt: p.boostExpiresAt ? p.boostExpiresAt.toISOString() : null,
        isBoostActive: Boolean(p.boostExpiresAt && new Date(p.boostExpiresAt) > new Date()),
        boostScore: p.boostScore || 0,
        lastBumpedAt: p.lastBumpedAt ? p.lastBumpedAt.toISOString() : null,
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
      : (authMeta.location && authMeta.location !== "Hà Nội, Việt Nam" 
          ? authMeta.location 
          : (computedFullAddress || authMeta.pickup_address || authMeta.full_address || ""));

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
        location: computedLocation || computedFullAddress || "Chưa cập nhật địa chỉ",
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
      ordersAsLender: rentalsAsOwner.map(r => {
        const primaryImg = r.product?.images?.[0]?.url || "https://res.cloudinary.com/dfqbxmgqi/image/upload/v1790530424/cloop_mobile_closet/pt4xccwmvrjsrnhrgnib.png";
        const rentalFee = r.invoice?.rentalFee || (r.invoice?.amount ? Math.max(0, r.invoice.amount - (r.invoice.depositAmount || 0)) : 0);
        const depositAmount = r.invoice?.depositAmount || 0;
        const totalAmount = r.invoice?.amount || (rentalFee + depositAmount);
        const isOverdue = Boolean(r.end_date && new Date(r.end_date) < new Date() && r.status !== "LENDER_COMPLETED" && r.status !== "CANCELLED");

        return {
          id: r.id,
          orderCode: r.invoice?.orderCode ? String(r.invoice.orderCode) : r.id.slice(-6).toUpperCase(),
          status: r.status,
          startDate: r.start_date ? new Date(r.start_date).toLocaleDateString("vi-VN") : "",
          endDate: r.end_date ? new Date(r.end_date).toLocaleDateString("vi-VN") : "",
          rawStartDate: r.start_date ? r.start_date.toISOString() : null,
          rawEndDate: r.end_date ? r.end_date.toISOString() : null,
          isOverdue,
          productTitle: r.product?.title || "Trang phục tiệc",
          productImage: primaryImg,
          productSize: r.product?.size || "M",
          productCategory: r.product?.category || "Trang phục",
          productMaterial: r.product?.material || "Cao cấp",
          productLocation: maskPublicAddress(r.product?.specificAddress || r.product?.province, "Hà Nội"),
          amount: totalAmount,
          rentalFee,
          depositAmount,
          shippingFee: r.invoice?.shippingFeeCollected || 0,
          renterName: r.renter_name || "Khách thuê",
          // 🛡️ CHÍNH SÁCH KHÓA CHẶT LIÊN HỆ NGOÀI SÀN: Luôn mask số điện thoại ở mọi trạng thái đơn hàng
          renterPhone: maskCounterpartyPhone(r.renter_phone),
          ownerName: r.owner_name || "Chủ đồ CLOOP",
          ownerPhone: maskCounterpartyPhone(r.owner_phone),
          shippingCode: r.shippingCode || `GHN${r.id.slice(-8).toUpperCase()}VN`,
          createdAt: r.createdAt ? new Date(r.createdAt).toLocaleDateString("vi-VN") : ""
        };
      }),
      ordersAsRenter: rentalsAsRenter.map(r => {
        const primaryImg = r.product?.images?.[0]?.url || "https://res.cloudinary.com/dfqbxmgqi/image/upload/v1790530424/cloop_mobile_closet/pt4xccwmvrjsrnhrgnib.png";
        const rentalFee = r.invoice?.rentalFee || (r.invoice?.amount ? Math.max(0, r.invoice.amount - (r.invoice.depositAmount || 0)) : 0);
        const depositAmount = r.invoice?.depositAmount || 0;
        const totalAmount = r.invoice?.amount || (rentalFee + depositAmount);
        const isOverdue = Boolean(r.end_date && new Date(r.end_date) < new Date() && r.status !== "LENDER_COMPLETED" && r.status !== "CANCELLED");

        return {
          id: r.id,
          orderCode: r.invoice?.orderCode ? String(r.invoice.orderCode) : r.id.slice(-6).toUpperCase(),
          status: r.status,
          startDate: r.start_date ? new Date(r.start_date).toLocaleDateString("vi-VN") : "",
          endDate: r.end_date ? new Date(r.end_date).toLocaleDateString("vi-VN") : "",
          rawStartDate: r.start_date ? r.start_date.toISOString() : null,
          rawEndDate: r.end_date ? r.end_date.toISOString() : null,
          isOverdue,
          productTitle: r.product?.title || "Trang phục tiệc",
          productImage: primaryImg,
          productSize: r.product?.size || "M",
          productCategory: r.product?.category || "Trang phục",
          productMaterial: r.product?.material || "Cao cấp",
          productLocation: maskPublicAddress(r.product?.specificAddress || r.product?.province, "Hà Nội"),
          amount: totalAmount,
          rentalFee,
          depositAmount,
          shippingFee: r.invoice?.shippingFeeCollected || 0,
          renterName: r.renter_name || "Khách thuê",
          // 🛡️ CHÍNH SÁCH KHÓA CHẶT LIÊN HỆ NGOÀI SÀN: Luôn mask số điện thoại ở mọi trạng thái đơn hàng
          renterPhone: maskCounterpartyPhone(r.renter_phone),
          ownerName: r.owner_name || "Chủ đồ CLOOP",
          ownerPhone: maskCounterpartyPhone(r.owner_phone),
          shippingCode: r.shippingCode || `GHN${r.id.slice(-8).toUpperCase()}VN`,
          createdAt: r.createdAt ? new Date(r.createdAt).toLocaleDateString("vi-VN") : ""
        };
      })
    };
  } catch (error: any) {
    console.error("Lỗi getMyClosetMobileDataAction:", error);
    return { success: false, error: "Lỗi nạp dữ liệu cá nhân" };
  }
}

// ==========================================
// 🛡️ CHUYỂN TRẠNG THÁI ĐƠN HÀNG TRÊN APP MOBILE (1 CHẠM TỨC THÌ)
// ==========================================
export async function advanceMobileOrderStatusAction({
  orderId,
  action,
  clientUserId: _clientUserId
}: {
  orderId: string;
  action:
    | "APPROVE_ORDER"
    | "HANDOVER_SHIPPER"
    | "CONFIRM_RECEIVED"
    | "INITIATE_RETURN"
    | "CONFIRM_RETURNED"
    | "CONFIRM_RETURN"
    | "COMPLETE_ORDER";
  clientUserId?: string;
}) {
  try {
    if (!orderId) {
      return { success: false, error: "Thiếu mã đơn hàng" };
    }

    const user = await requireUser();

    const rental = await prisma.rentalHistory.findUnique({
      where: { id: orderId },
      include: { product: true, invoice: true }
    });

    if (!rental) {
      return { success: false, error: "Không tìm thấy đơn hàng" };
    }

    const isOwnerOrAdmin =
      rental.ownerId === user.id ||
      rental.product?.userId === user.id ||
      user.role === "ADMIN";
    const isRenterOrAdmin =
      rental.renterId === user.id ||
      user.role === "ADMIN";

    const ownerActions = new Set(["APPROVE_ORDER", "HANDOVER_SHIPPER", "CONFIRM_RETURN", "COMPLETE_ORDER"]);
    const renterActions = new Set(["CONFIRM_RECEIVED", "INITIATE_RETURN", "CONFIRM_RETURNED"]);

    if (ownerActions.has(action) && !isOwnerOrAdmin) {
      return { success: false, error: "Bạn không có quyền thực hiện thao tác này." };
    }

    if (renterActions.has(action) && !isRenterOrAdmin) {
      return { success: false, error: "Bạn không có quyền thực hiện thao tác này." };
    }

    if (!ownerActions.has(action) && !renterActions.has(action)) {
      return { success: false, error: "Bạn không có quyền thực hiện thao tác này." };
    }

    // Bắt buộc hóa đơn đã PAID trước khi cho phép chuyển trạng thái qua PENDING
    if (rental.invoice?.status !== "PAID") {
      return { success: false, error: "Đơn hàng chưa được thanh toán thành công." };
    }

    // 🛡️ CHỐT CHẶN MÁY TRẠNG THÁI (STATE MACHINE GUARD): Cấm đảo ngược đơn đã hoàn tất hoặc đã hủy
    if (rental.status === "LENDER_COMPLETED" || rental.status === "CANCELLED") {
      return { success: false, error: "Đơn hàng đã đóng, không thể thay đổi trạng thái." };
    }

    const now = new Date();
    let nextStatus: typeof rental.status = rental.status;

    if (action === "APPROVE_ORDER") {
      if (rental.status !== "PENDING_APPROVAL") {
        return { success: false, error: "Chỉ có thể xác nhận chuẩn bị đồ khi đơn đang ở trạng thái chờ xử lý (PENDING_APPROVAL)." };
      }
      nextStatus = "OWNER_PACKED";
      await prisma.$transaction(async (tx) => {
        const updated = await tx.rentalHistory.updateMany({
          where: { id: orderId, status: "PENDING_APPROVAL" },
          data: { status: "OWNER_PACKED" }
        });
        if (updated.count === 0) {
          throw new Error("STATE_CONFLICT");
        }
        await tx.auditLog.create({
          data: {
            adminId: user.id,
            action: "MOBILE_ORDER_APPROVE",
            targetType: "RENTAL_HISTORY",
            targetId: orderId,
            beforeStatus: "PENDING_APPROVAL",
            afterStatus: "OWNER_PACKED",
          }
        });
      });
    } else if (action === "HANDOVER_SHIPPER") {
      if (rental.status !== "OWNER_PACKED") {
        return { success: false, error: "Chỉ có thể bàn giao vận chuyển sau khi chủ tủ đã xác nhận đóng gói (OWNER_PACKED)." };
      }
      nextStatus = "LENDER_SHIPPED";
      await prisma.$transaction(async (tx) => {
        const updated = await tx.rentalHistory.updateMany({
          where: { id: orderId, status: "OWNER_PACKED" },
          data: { status: "LENDER_SHIPPED" }
        });
        if (updated.count === 0) {
          throw new Error("STATE_CONFLICT");
        }
        await tx.auditLog.create({
          data: {
            adminId: user.id,
            action: "MOBILE_ORDER_HANDOVER_SHIPPER",
            targetType: "RENTAL_HISTORY",
            targetId: orderId,
            beforeStatus: "OWNER_PACKED",
            afterStatus: "LENDER_SHIPPED",
          }
        });
      });
    } else if (action === "CONFIRM_RECEIVED") {
      if (rental.status !== "LENDER_SHIPPED") {
        return { success: false, error: "Chỉ có thể xác nhận nhận đồ sau khi đơn hàng đã được bàn giao vận chuyển (LENDER_SHIPPED)." };
      }
      nextStatus = "BORROWER_RECEIVED";
      await prisma.$transaction(async (tx) => {
        const updated = await tx.rentalHistory.updateMany({
          where: { id: orderId, status: "LENDER_SHIPPED" },
          data: { status: "BORROWER_RECEIVED" }
        });
        if (updated.count === 0) {
          throw new Error("STATE_CONFLICT");
        }
        await tx.auditLog.create({
          data: {
            adminId: user.id,
            action: "MOBILE_ORDER_CONFIRM_RECEIVED",
            targetType: "RENTAL_HISTORY",
            targetId: orderId,
            beforeStatus: "LENDER_SHIPPED",
            afterStatus: "BORROWER_RECEIVED",
          }
        });
      });
    } else if (action === "INITIATE_RETURN" || action === "CONFIRM_RETURNED") {
      if (rental.status !== "BORROWER_RECEIVED") {
        return { success: false, error: "Chỉ có thể báo trả đồ sau khi đã xác nhận nhận đồ (BORROWER_RECEIVED)." };
      }
      nextStatus = "BORROWER_RETURNED";
      await prisma.$transaction(async (tx) => {
        const updated = await tx.rentalHistory.updateMany({
          where: { id: orderId, status: "BORROWER_RECEIVED" },
          data: {
            status: "BORROWER_RETURNED",
            actual_return_date: rental.shippingCode === "SELF_PICKUP" ? now : null
          }
        });
        if (updated.count === 0) {
          throw new Error("STATE_CONFLICT");
        }

        await tx.shipment.upsert({
          where: {
            rentalId_direction: {
              rentalId: rental.id,
              direction: "RETURN",
            },
          },
          update: {
            status: "IN_TRANSIT",
            shippingFeeCollected: 0,
            bookedByUserId: user.id,
          },
          create: {
            rentalId: rental.id,
            direction: "RETURN",
            provider: rental.shippingCode === "SELF_PICKUP" ? "SELF_PICKUP" : "GHN",
            status: rental.shippingCode === "SELF_PICKUP" ? "DELIVERED" : "IN_TRANSIT",
            clientOrderCode: `${rental.id.slice(0, 8).toUpperCase()}-RETURN`,
            shippingFeeCollected: 0,
            pickupAddress: {
              name: rental.renter_name || "Khách thuê CLOOP",
              phone: rental.renter_phone || "",
            },
            deliveryAddress: {
              name: rental.owner_name || "Chủ tủ CLOOP",
              phone: rental.owner_phone || "",
              province: rental.product?.province || "Hà Nội",
              districtId: rental.product?.districtId || undefined,
              wardCode: rental.product?.wardCode || undefined,
              specificAddress: rental.product?.specificAddress || "",
            },
            bookedByUserId: user.id,
            trackingCode: `GHN-RET-${rental.id.slice(0, 6).toUpperCase()}`,
          },
        });

        await tx.auditLog.create({
          data: {
            adminId: user.id,
            action: "MOBILE_ORDER_INITIATE_RETURN",
            targetType: "RENTAL_HISTORY",
            targetId: orderId,
            beforeStatus: "BORROWER_RECEIVED",
            afterStatus: "BORROWER_RETURNED",
          }
        });
      });
    } else if (action === "CONFIRM_RETURN") {
      if (rental.status !== "BORROWER_RETURNED") {
        return { success: false, error: "Chỉ có thể xác nhận nhận lại đồ khi khách thuê đã báo gửi trả (BORROWER_RETURNED)." };
      }
      nextStatus = "BORROWER_RETURNED";
      await prisma.$transaction(async (tx) => {
        const updated = await tx.rentalHistory.updateMany({
          where: { id: orderId, status: "BORROWER_RETURNED" },
          data: {
            status: "BORROWER_RETURNED",
            actual_return_date: now
          }
        });
        if (updated.count === 0) {
          throw new Error("STATE_CONFLICT");
        }

        await tx.shipment.updateMany({
          where: { rentalId: orderId, direction: "RETURN" },
          data: { status: "DELIVERED", updatedAt: now }
        });

        await tx.auditLog.create({
          data: {
            adminId: user.id,
            action: "MOBILE_ORDER_CONFIRM_RETURN",
            targetType: "RENTAL_HISTORY",
            targetId: orderId,
            beforeStatus: "BORROWER_RETURNED",
            afterStatus: "BORROWER_RETURNED",
          }
        });
      });
    } else if (action === "COMPLETE_ORDER") {
      if (rental.status !== "BORROWER_RETURNED") {
        return {
          success: false,
          error: "Chỉ được quyết toán hoàn tất khi đơn hàng đang ở trạng thái đã trả đồ (BORROWER_RETURNED)."
        };
      }

      nextStatus = "LENDER_COMPLETED" as typeof rental.status;
      await settleCompletedRentalOrder(orderId, {
        actorId: user.id,
        actorRole: user.role === "ADMIN" ? "ADMIN" : "OWNER"
      });
    }

    try {
      revalidatePath("/app");
      revalidatePath("/my-closet/orders");
      revalidatePath("/my-closet");
      revalidatePath("/shop");
    } catch (_) {}

    return {
      success: true,
      newStatus: nextStatus,
      message: action === "CONFIRM_RECEIVED"
        ? "Đã xác nhận nhận đồ thành công!"
        : action === "CONFIRM_RETURNED" || action === "INITIATE_RETURN"
        ? "Đã báo gửi trả đồ thành công!"
        : action === "COMPLETE_ORDER"
        ? "Đã hoàn tất đơn hàng và hoàn cọc thành công!"
        : "Đã cập nhật trạng thái đơn hàng thành công!"
    };
  } catch (err: any) {
    console.error("Lỗi advanceMobileOrderStatusAction:", err);
    return { success: false, error: "Không thể cập nhật đơn hàng" };
  }
}
