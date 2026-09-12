"use server";

import { requireUser } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { createClient } from "@/src/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const ProfileUpdateSchema = z.object({
  name: z.string().trim().min(2, "Tên hiển thị tối thiểu 2 ký tự").max(60, "Tên hiển thị tối đa 60 ký tự"),
  username: z.string().trim().max(40, "Tên tài khoản tối đa 40 ký tự").optional().or(z.literal("")),
  location: z.string().trim().max(120, "Địa điểm tối đa 120 ký tự").optional().or(z.literal("")),
  quote: z.string().trim().max(250, "Châm ngôn tối đa 250 ký tự").optional().or(z.literal("")),
  bio: z.string().trim().max(800, "Tiểu sử tối đa 800 ký tự").optional().or(z.literal("")),
  todaysMemory: z.string().trim().max(800, "Kỷ niệm hôm nay tối đa 800 ký tự").optional().or(z.literal("")),
  avatar: z.string().url("URL ảnh không hợp lệ").optional().or(z.literal("")),
  coverImage: z.string().url("URL ảnh bìa không hợp lệ").optional().or(z.literal("")),
});

export type ProfileUpdateInput = z.infer<typeof ProfileUpdateSchema>;

export async function updateUserProfileWithValidation(input: ProfileUpdateInput) {
  try {
    const userAuth = await requireUser();
    if (!userAuth) {
      return { success: false, error: "Vui lòng đăng nhập để cập nhật hồ sơ." };
    }

    const validated = ProfileUpdateSchema.parse(input);

    // 1. Cập nhật User trong cơ sở dữ liệu Prisma
    await prisma.user.update({
      where: { id: userAuth.id },
      data: {
        ...(validated.name && { name: validated.name }),
        ...(validated.avatar && { avatar: validated.avatar }),
      },
    });

    // 2. Cập nhật bảng profiles trong Supabase qua Server Session
    try {
      const supabase = await createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("profiles") as any)
        .update({
          name: validated.name,
          username: validated.username || undefined,
          location: validated.location || undefined,
          quote: validated.quote || undefined,
          bio: validated.bio || undefined,
          todaysMemory: validated.todaysMemory || undefined,
          avatar: validated.avatar || undefined,
          avatar_url: validated.avatar || undefined,
          coverImage: validated.coverImage || undefined,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userAuth.id);
    } catch (sbErr) {
      console.warn("Supabase profiles table sync warning:", sbErr);
    }

    // 3. Cache Purge
    try {
      revalidatePath("/my-closet/profile");
      revalidatePath(`/closet/${userAuth.id}`);
      revalidatePath("/my-closet");
    } catch (e) {
      console.error("Cache purge failed:", e);
    }

    return { success: true };
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return { success: false, error: err.issues[0]?.message || "Dữ liệu không hợp lệ." };
    }
    const message = err instanceof Error ? err.message : "Không thể cập nhật hồ sơ.";
    return { success: false, error: message };
  }
}

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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Không thể cập nhật hồ sơ.";
    console.error("Error updating user profile:", error);
    return { success: false, error: message };
  }
}
