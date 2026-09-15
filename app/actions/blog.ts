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

    // Nếu có productId, kiểm tra sản phẩm có tồn tại không
    let validatedProductId: string | null = null;
    if (input.productId) {
      const product = await prisma.product.findUnique({
        where: { id: input.productId },
        select: { id: true },
      });
      if (product) {
        validatedProductId = product.id;
      }
    }

    const post = await prisma.blogPost.create({
      data: {
        title: input.title.trim(),
        content: input.content.trim(),
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
