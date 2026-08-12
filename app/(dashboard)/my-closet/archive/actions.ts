"use server";
import { requireUser } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { revalidatePath } from "next/cache";
import { canCreateListing, validateListingTransition } from "@/src/lib/stateMachine";

export async function fetchArchivedListings(cursor?: string) {
  const user = await requireUser();
  if (!user) throw new Error("Unauthorized");

  const take = 20;
  
  let parsedCursor = undefined;
  if (cursor) {
    try {
      const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
      if (decoded.id && decoded.updatedAt) {
        parsedCursor = {
          updatedAt_id: {
            updatedAt: new Date(decoded.updatedAt),
            id: decoded.id
          }
        };
      }
    } catch (e) {
      console.warn("Invalid cursor format");
    }
  }

  const listings = await prisma.listing.findMany({
    where: {
      product: { userId: user.id },
      status: { in: ['SOLD', 'HIDDEN', 'RECYCLED'] }
    },
    take: take + 1, // Fetch 1 extra to check if there is a next page
    cursor: parsedCursor,
    orderBy: [
      { updatedAt: 'desc' },
      { id: 'desc' }
    ],
    include: {
      product: {
        include: { images: { where: { isPrimary: true }, take: 1 } }
      }
    }
  });

  let nextCursor: string | undefined = undefined;
  if (listings.length > take) {
    const nextItem = listings.pop(); // Remove the extra item
    nextCursor = Buffer.from(JSON.stringify({ 
      id: nextItem!.id, 
      updatedAt: nextItem!.updatedAt.toISOString() 
    })).toString('base64');
  }

  const mapped = listings.map(listing => {
    let statusMapped: "sold" | "hidden" | "cancelled" = "hidden";
    if (listing.status === "SOLD") statusMapped = "sold";
    
    // Fallback to snapshot if product info was overwritten
    const snap = listing.snapshot as any;
    
    return {
      id: listing.id,
      name: snap?.title || listing.product.title,
      image: snap?.image || listing.product.images[0]?.url || "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&q=80&w=400",
      archivedDate: listing.updatedAt.toLocaleDateString('vi-VN'),
      price: listing.salePrice || listing.basePrice || 0,
      status: statusMapped
    };
  });

  return { data: mapped, nextCursor };
}

export async function getArchivedItemDetail(itemId: string) {
  const user = await requireUser();
  if (!user) throw new Error("Unauthorized");

  const detail = await prisma.listing.findFirst({
    where: {
      id: itemId,
      product: { userId: user.id },
      status: { in: ['SOLD', 'HIDDEN', 'RECYCLED'] }
    },
    include: { 
      product: {
        include: {
          images: { where: { isPrimary: true }, take: 1 }
        }
      } 
    }
  });

  if (!detail) {
    throw new Error("Không tìm thấy hồ sơ lưu trữ.");
  }

  const p = detail.product;
  const price = detail.salePrice || detail.basePrice || 0;
  
  // Tính toán phí nền tảng (giả định 5% cho đồ bán)
  let platformFee = 0;
  if (detail.status === "SOLD" && detail.listingType === "SELL") {
    platformFee = Math.round(price * 0.05);
  }
  
  const netToWallet = price - platformFee;

  let reason = "Đã được cất vào kho";
  if (detail.status === "SOLD") reason = "Đã bán thành công";
  if (detail.status === "HIDDEN") reason = "Chủ động gỡ xuống";

  return {
    id: detail.id,
    status: detail.status === "SOLD" ? "sold" : "hidden",
    snapshot: {
      name: detail.snapshot ? (detail.snapshot as any).title : p.title,
      image: detail.snapshot && (detail.snapshot as any).image ? (detail.snapshot as any).image : (p.images[0]?.url || "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&q=80&w=400"),
      category: detail.snapshot ? (detail.snapshot as any).category : p.category,
      size: detail.snapshot ? (detail.snapshot as any).size : p.size,
      brand: detail.snapshot ? (detail.snapshot as any).brand : (p.brand || "Không rõ"),
      condition: detail.snapshot ? (detail.snapshot as any).condition : p.condition
    },
    timeline: {
      publishDate: detail.createdAt.toLocaleDateString('vi-VN'),
      archiveDate: detail.updatedAt.toLocaleDateString('vi-VN'),
      reason: reason,
      partner: null // Có thể join bảng Transaction sau nếu schema hỗ trợ
    },
    financials: {
      listingPrice: price,
      platformFee: platformFee,
      netToWallet: netToWallet
    }
  };
}

export async function relistArchivedItem(itemId: string, newPrice: number) {
  const user = await requireUser();
  if (!user) throw new Error("Unauthorized");

  // 1. Tìm bản ghi gốc
  const oldListing = await prisma.listing.findFirst({
    where: {
      id: itemId,
      product: { userId: user.id }
    },
    include: { product: { include: { images: true } } }
  });

  if (!oldListing) throw new Error("Không tìm thấy bản ghi gốc");

  // XÁC THỰC STATE MACHINE
  if (!canCreateListing(oldListing.product.status)) {
    throw new Error(`Không thể đăng bán lại! Trạng thái món đồ hiện tại: ${oldListing.product.status}. Đồ phải ở trạng thái IN_CLOSET mới được phép đăng bán.`);
  }

  // 2. Chạy Transaction để đảm bảo tính toàn vẹn dữ liệu
  await prisma.$transaction(async (tx) => {
    // a. Lưu snapshot trạng thái hiện tại vào bản ghi cũ để KHÓA LỊCH SỬ
    // Xác thực trạng thái giao dịch cũ trước khi đóng
    if (oldListing.status === "AVAILABLE" || oldListing.status === "RESERVED") {
       await tx.listing.update({
         where: { id: oldListing.id },
         data: { status: "HIDDEN" }
       });
    }

    await tx.listing.update({
      where: { id: oldListing.id },
      data: {
        snapshot: {
          title: oldListing.product.title,
          image: oldListing.product.images[0]?.url,
          category: oldListing.product.category,
          size: oldListing.product.size,
          brand: oldListing.product.brand,
          condition: oldListing.product.condition
        }
      }
    });

    // Cập nhật trạng thái của Product sang ON_MARKET
    await tx.product.update({
      where: { id: oldListing.product.id },
      data: { status: "ON_MARKET" }
    });

    // b. Tạo phiên giao dịch (Listing) mới trỏ về Product cũ
    await tx.listing.create({
      data: {
        productId: oldListing.product.id,
        listingType: oldListing.listingType,
        status: "AVAILABLE",
        basePrice: newPrice,
        salePrice: newPrice
      }
    });

    // c. Ghi log ProductLifecycle để theo dõi vòng đời mới
    await tx.productLifecycle.create({
      data: {
        productId: oldListing.product.id,
        eventType: "CREATED",
        userId: user.id,
        notes: "Đăng bán lại từ kho lưu trữ"
      }
    });
  });

  // Revalidate cache để trang danh sách cập nhật lại
  revalidatePath('/my-closet/archive');
  revalidatePath('/my-closet');
  
  return { success: true };
}
