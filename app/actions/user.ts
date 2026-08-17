"use server";

import { requireUser } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateUserProfile(data: { name?: string; bio?: string; avatar_url?: string }) {
  try {
    const userAuth = await requireUser();

    // Cập nhật thông tin User trong DB
    await prisma.user.update({
      where: { id: userAuth.id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.bio && { bio: data.bio }),
        ...(data.avatar_url && { avatar: data.avatar_url })
      }
    });

    // Dọn dẹp bộ nhớ đệm (Cache Invalidation)
    try {
      revalidatePath("/my-closet/profile");
      revalidatePath(`/closet/${userAuth.id}`);
    } catch (e) {
      console.error("Cache purge failed:", e);
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error updating user profile:", error);
    return { success: false, error: error.message || "Không thể cập nhật hồ sơ." };
  }
}
