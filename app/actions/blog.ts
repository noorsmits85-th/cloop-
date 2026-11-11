"use server";

import { prisma } from "@/src/lib/prisma";
import { requireUser } from "@/src/lib/auth";
import { revalidatePath } from "next/cache";

export interface UserClosetItemForBlog {
  id: string;
  title: string;
  size: string;
  category: string;
  price: number;
  imageUrl: string;
}

/**
 * Lấy danh sách trang phục trong tủ đồ của người dùng hiện tại để gắn thẻ vào bài viết Blog/Ký ức
 */
export async function getUserClosetItemsForBlogAction(): Promise<{
  success: boolean;
  items?: UserClosetItemForBlog[];
  error?: string;
}> {
  try {
    const userAuth = await requireUser();
    const userId = userAuth.id;

    const products = await prisma.product.findMany({
      where: {
        userId,
        isDeleted: false,
      },
      select: {
        id: true,
        title: true,
        size: true,
        category: true,
        images: {
          select: { url: true, isPrimary: true },
          orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
          take: 1,
        },
        listings: {
          where: { isDeleted: false },
          select: { basePrice: true, listingType: true },
          take: 2,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const items: UserClosetItemForBlog[] = products.map((p) => {
      const rentalListing = p.listings.find((l) => l.listingType === "RENT");
      const saleListing = p.listings.find((l) => l.listingType === "SELL");
      const price = rentalListing?.basePrice || saleListing?.basePrice || 0;
      const imageUrl = p.images[0]?.url || "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=600";

      return {
        id: p.id,
        title: p.title,
        size: p.size,
        category: p.category,
        price,
        imageUrl,
      };
    });

    return { success: true, items };
  } catch (error: any) {
    console.error("getUserClosetItemsForBlogAction error:", error);
    return { success: false, items: [], error: error?.message || "Không thể tải tủ đồ" };
  }
}

export interface CreateBlogPostInput {
  title: string;
  content: string;
  coverImage: string;
  productId?: string | null;
  location?: string;
}

const BLOG_ZERO_WIDTH_REGEX = /[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g;
const BLOG_PHONE_REGEX = /(?:(?:\+?84|0)[\s._\-()\/]*[35789](?:[\s._\-()\/]*\d){8})\b|\b0\d(?:[\s._\-]*\d){8,9}\b/g;
const BLOG_EMAIL_REGEX = /[a-zA-Z0-9._%+-]+\s*(?:@|\(at\)|\[at\])\s*[a-zA-Z0-9.-]+\s*(?:\.|\(dot\)|\[dot\])\s*[a-zA-Z]{2,}/gi;
const BLOG_SOLICIT_NORM_REGEX = /\b(z[\s._\-]*a[\s._\-]*l[\s._\-]*o|zalo\.me|telegram|t\.me\/|facebook|fb\.com|instagram|thue\s+ngoai|giao\s+dich\s+ngoai|khong\s+qua\s+san|chuyen\s+khoan\s+rieng|ck\s+rieng|lien\s+he\s+rieng|ket\s+ban\s+zalo|add\s+zalo)\b/i;

function hasBlogOffPlatformContact(raw?: string | null): boolean {
  if (!raw || typeof raw !== "string") return false;
  const cleaned = raw.replace(BLOG_ZERO_WIDTH_REGEX, "");
  const norm = cleaned
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
  BLOG_PHONE_REGEX.lastIndex = 0;
  BLOG_EMAIL_REGEX.lastIndex = 0;
  if (BLOG_PHONE_REGEX.test(cleaned)) return true;
  if (BLOG_EMAIL_REGEX.test(cleaned)) return true;
  if (BLOG_SOLICIT_NORM_REGEX.test(norm)) return true;
  return false;
}

function scrubBlogContactText(raw?: string | null): string {
  if (!raw || typeof raw !== "string") return "";
  return raw
    .replace(BLOG_ZERO_WIDTH_REGEX, "")
    .replace(BLOG_EMAIL_REGEX, "[Đã ẩn Email bảo mật]")
    .replace(BLOG_PHONE_REGEX, "[Đã ẩn SĐT bảo mật]")
    .replace(/\b(z[\s._\-]*a[\s._\-]*l[\s._\-]*o|telegram|facebook|instagram|thuê\s+ngoài|thue\s+ngoai|giao\s+dịch\s+ngoài|giao\s+dich\s+ngoai|không\s+qua\s+sàn|khong\s+qua\s+san)\b/gi, "[Liên hệ qua CLOOP]");
}

/**
 * Đăng bài viết / Ký ức thời trang mới và liên kết với trang phục trong tủ đồ
 */
export async function createBlogPostAction(input: CreateBlogPostInput): Promise<{
  success: boolean;
  blogId?: string;
  error?: string;
}> {
  try {
    const userAuth = await requireUser();
    const userId = userAuth.id;

    if (!input.title || !input.title.trim()) {
      return { success: false, error: "Tiêu đề câu chuyện không được để trống." };
    }
    if (!input.content || !input.content.trim()) {
      return { success: false, error: "Nội dung câu chuyện không được để trống." };
    }
    if (!input.coverImage) {
      return { success: false, error: "Cần ít nhất một ảnh đại diện cho câu chuyện." };
    }

    if (
      hasBlogOffPlatformContact(input.title) ||
      hasBlogOffPlatformContact(input.content) ||
      hasBlogOffPlatformContact(input.location)
    ) {
      return {
        success: false,
        error:
          "Chính sách An toàn CLOOP: Bài viết không được chứa số điện thoại, email, tài khoản mạng xã hội (Zalo/FB/IG) hoặc nội dung giao dịch ngoài sàn.",
      };
    }

    // Nếu có productId, kiểm tra sản phẩm có tồn tại và thuộc quyền sở hữu của user hiện tại không
    let validatedProductId: string | null = null;
    if (input.productId) {
      const product = await prisma.product.findFirst({
        where: { id: input.productId, userId, isDeleted: false },
        select: { id: true },
      });
      if (!product) {
        return { success: false, error: "Trang phục gắn thẻ không tồn tại hoặc không thuộc tủ đồ của bạn." };
      }
      validatedProductId = product.id;
    }

    const post = await prisma.blogPost.create({
      data: {
        title: scrubBlogContactText(input.title.trim()),
        content: scrubBlogContactText(input.content.trim()),
        cover_image: input.coverImage,
        productId: validatedProductId,
        userId: userId,
        status: "PUBLIC",
        isPinned: false,
      },
    });

    revalidatePath("/blog");
    revalidatePath(`/closet/${userId}`);
    revalidatePath("/my-closet/items");

    return { success: true, blogId: post.id };
  } catch (error: any) {
    console.error("createBlogPostAction error:", error);
    return { success: false, error: error?.message || "Lỗi khi đăng bài viết." };
  }
}

/**
 * Bật / tắt trạng thái hiển thị Lookbook liên kết với sản phẩm
 */
export async function toggleBlogPostStatusAction(
  productId: string,
  currentlyHidden: boolean
): Promise<{ success: boolean; newStatus?: string; error?: string }> {
  try {
    const userAuth = await requireUser();
    const newStatus = currentlyHidden ? "PUBLIC" : "HIDDEN";

    const blog = await prisma.blogPost.findFirst({
      where: {
        productId,
        userId: userAuth.id,
      },
    });

    if (!blog) {
      return { success: false, error: "Không tìm thấy bài viết Lookbook cho sản phẩm này." };
    }

    await prisma.blogPost.update({
      where: { id: blog.id },
      data: { status: newStatus },
    });

    revalidatePath("/blog");
    revalidatePath(`/closet/${userAuth.id}`);
    revalidatePath("/my-closet/items");

    return { success: true, newStatus };
  } catch (error: any) {
    console.error("toggleBlogPostStatusAction error:", error);
    return { success: false, error: error?.message || "Không thể cập nhật trạng thái Lookbook." };
  }
}

/**
 * Lấy danh sách bài viết công khai trên Bảo Tàng Ký Ức (/blog) qua Prisma Server-side
 * Tuyệt đối không lộ email, số điện thoại, số dư ví hoặc địa chỉ nhà riêng (specificAddress)
 */
export async function getPublicBlogFeedAction() {
  try {
    const posts = await prisma.blogPost.findMany({
      where: {
        isDeleted: false,
        status: { not: "HIDDEN" },
      },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      take: 40,
      select: {
        id: true,
        title: true,
        content: true,
        cover_image: true,
        productId: true,
        userId: true,
        status: true,
        isPinned: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            isVerified: true,
          },
        },
        product: {
          select: {
            id: true,
            title: true,
            size: true,
            images: {
              select: { url: true, isPrimary: true },
              orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
              take: 3,
            },
            listings: {
              where: { isDeleted: false },
              select: { basePrice: true, listingType: true },
              take: 2,
            },
          },
        },
      },
    });

    return {
      success: true,
      posts: posts
        .filter((b): b is NonNullable<typeof b> => Boolean(b && b.status !== "HIDDEN" && !(b as any).isDeleted))
        .map((b) => ({
          id: b.id,
          title: scrubBlogContactText(b.title),
          content: scrubBlogContactText(b.content),
          cover_image: b.cover_image,
          productId: b.productId,
          userId: b.userId,
          status: b.status,
          isPinned: b.isPinned,
          createdAt: b.createdAt instanceof Date ? b.createdAt.toISOString() : String(b.createdAt || ""),
          author: b.user
            ? {
                id: b.user.id,
                name: scrubBlogContactText(b.user.name || "Thành viên CLOOP"),
                avatar: b.user.avatar || "/logo2.png",
                isVip: Boolean(b.user.isVerified),
              }
            : null,
          product: b.product
            ? {
                id: b.product.id,
                title: scrubBlogContactText(b.product.title),
                size: b.product.size,
                ProductImage: b.product.images,
                Listing: b.product.listings,
              }
            : null,
        })),
    };
  } catch (error: any) {
    console.error("getPublicBlogFeedAction error:", error);
    return { success: false, posts: [] };
  }
}

/**
 * Lấy dữ liệu Sổ Nhật Ký Ký Ức của một chủ tủ đồ (/closet/[userId]/memories) qua Prisma Server-side
 */
export async function getUserMemoriesDiaryAction(targetUserId: string) {
  try {
    if (!targetUserId || typeof targetUserId !== "string") {
      return { success: false, userName: "Thành viên CLOOP", memories: [] };
    }

    const [owner, blogPosts] = await Promise.all([
      prisma.user.findUnique({
        where: { id: targetUserId },
        select: { name: true },
      }),
      prisma.blogPost.findMany({
        where: {
          userId: targetUserId,
          isDeleted: false,
          status: "PUBLIC",
        },
        orderBy: { createdAt: "desc" },
        take: 30,
        select: {
          id: true,
          title: true,
          content: true,
          cover_image: true,
          productId: true,
          createdAt: true,
          product: {
            select: {
              images: {
                select: { url: true },
                orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
              },
            },
          },
        },
      }),
    ]);

    return {
      success: true,
      userName: scrubBlogContactText(owner?.name || "Thành viên CLOOP"),
      memories: blogPosts.map((b) => ({
        id: b.id,
        title: scrubBlogContactText(b.title),
        content: scrubBlogContactText(b.content),
        coverImage: b.cover_image,
        productId: b.productId || "",
        createdAt: b.createdAt.toISOString(),
        productImages: b.product?.images.map((img) => img.url) || [],
      })),
    };
  } catch (error: any) {
    console.error("getUserMemoriesDiaryAction error:", error);
    return { success: false, userName: "Thành viên CLOOP", memories: [] };
  }
}

