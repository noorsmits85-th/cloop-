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
        ...(validated.avatar !== undefined && { avatar: validated.avatar }),
      },
    });

    // 2. Cập nhật trực tiếp raw_user_meta_data trong auth.users để đồng bộ tức thì
    try {
      const metaPayload: Record<string, any> = {
        name: validated.name,
        full_name: validated.name,
      };
      if (validated.username) metaPayload.username = validated.username;
      if (validated.location) metaPayload.location = validated.location;
      if (validated.quote) metaPayload.quote = validated.quote;
      if (validated.bio) metaPayload.bio = validated.bio;
      if (validated.todaysMemory) metaPayload.todaysMemory = validated.todaysMemory;
      if (validated.avatar) {
        metaPayload.avatar = validated.avatar;
        metaPayload.avatar_url = validated.avatar;
      }
      if (validated.coverImage) metaPayload.coverImage = validated.coverImage;

      await prisma.$executeRawUnsafe(
        `UPDATE auth.users SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || $1::jsonb WHERE id = $2::uuid;`,
        JSON.stringify(metaPayload),
        userAuth.id
      );
    } catch (dbMetaErr) {
      console.warn("Direct auth.users metadata update fallback:", dbMetaErr);
    }

    // Cập nhật session metadata trong Supabase
    try {
      const supabase = await createClient();
      await supabase.auth.updateUser({
        data: {
          name: validated.name,
          username: validated.username || undefined,
          location: validated.location || undefined,
          quote: validated.quote || undefined,
          bio: validated.bio || undefined,
          todaysMemory: validated.todaysMemory || undefined,
          avatar: validated.avatar || undefined,
          avatar_url: validated.avatar || undefined,
          coverImage: validated.coverImage || undefined,
        }
      });
    } catch (sbErr) {
      console.warn("Supabase user metadata sync warning:", sbErr);
    }

    // 3. Cache Purge
    try {
      const { clearUserAuthCache } = await import("@/src/lib/auth");
      clearUserAuthCache(userAuth.id);
    } catch (_) {}

    try {
      revalidatePath("/my-closet/profile");
      revalidatePath(`/closet/${userAuth.id}`);
      revalidatePath("/my-closet");
      revalidatePath("/admin/payments");
      revalidatePath("/app");
      revalidatePath("/", "layout");
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

    try {
      const { clearUserAuthCache } = await import("@/src/lib/auth");
      clearUserAuthCache(userAuth.id);
    } catch (_) {}

    // Dọn dẹp bộ nhớ đệm (Cache Invalidation)
    try {
      revalidatePath("/my-closet/profile");
      revalidatePath(`/closet/${userAuth.id}`);
      revalidatePath("/admin/payments");
      revalidatePath("/app");
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

import { isValidVietnamPhone, normalizeVietnamPhone } from "@/lib/validations/phone";

const SettingsSchema = z.object({
  pickup_address: z.string().trim().max(300, "Địa chỉ tối đa 300 ký tự").optional().or(z.literal("")),
  phone: z.string().trim().max(30, "Số điện thoại tối đa 30 ký tự").refine(val => {
    if (!val) return true;
    return isValidVietnamPhone(val);
  }, "Số điện thoại không đúng định dạng 10 số của các nhà mạng Việt Nam (03, 05, 07, 08, 09).").optional().or(z.literal("")),
  bank_name: z.string().trim().max(100, "Tên ngân hàng tối đa 100 ký tự").optional().or(z.literal("")),
  bank_account: z.string().trim().max(50, "Số tài khoản tối đa 50 ký tự").optional().or(z.literal("")),
  bank_owner: z.string().trim().max(100, "Tên chủ tài khoản tối đa 100 ký tự").optional().or(z.literal("")),
});

export type UserSettingsInput = z.infer<typeof SettingsSchema>;

export async function updateUserSettingsAction(input: UserSettingsInput) {
  try {
    const userAuth = await requireUser();
    if (!userAuth) {
      return { success: false, error: "Vui lòng đăng nhập để lưu cấu hình." };
    }

    const validated = SettingsSchema.parse(input);
    const normalizedPhone = validated.phone ? normalizeVietnamPhone(validated.phone) : undefined;
    const cleanBank = validated.bank_name?.trim();
    const cleanAccount = validated.bank_account?.trim().replace(/\s+/g, "");
    const cleanOwner = validated.bank_owner?.trim().toUpperCase();

    const metaPayload: Record<string, any> = {};
    if (validated.pickup_address !== undefined) {
      metaPayload.pickup_address = validated.pickup_address;
      metaPayload.full_address = validated.pickup_address;
      metaPayload.location = validated.pickup_address;
    }
    if (normalizedPhone !== undefined) {
      metaPayload.phone = normalizedPhone;
    }
    if (cleanBank) {
      metaPayload.bank_name = cleanBank;
      metaPayload.bankName = cleanBank;
    }
    if (cleanAccount) {
      metaPayload.bank_account = cleanAccount;
      metaPayload.bankAccountNumber = cleanAccount;
    }
    if (cleanOwner) {
      metaPayload.bank_owner = cleanOwner;
      metaPayload.bankAccountHolder = cleanOwner;
    }

    // 1. Cập nhật trực tiếp raw_user_meta_data trong auth.users
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE auth.users SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || $1::jsonb WHERE id = $2::uuid;`,
        JSON.stringify(metaPayload),
        userAuth.id
      );
    } catch (e) {
      console.warn("Direct auth.users metadata update in settings:", e);
    }

    // 2. Cập nhật Supabase Session
    try {
      const supabase = await createClient();
      await supabase.auth.updateUser({
        data: metaPayload
      });
    } catch (sbErr) {
      console.warn("Supabase user metadata sync warning:", sbErr);
    }

    // 3. Nếu đổi STK, đồng bộ ngay lập tức vào tất cả các yêu cầu rút tiền PENDING
    if (cleanAccount && cleanBank) {
      try {
        await prisma.withdrawalRequest.updateMany({
          where: { userId: userAuth.id, status: "PENDING" },
          data: {
            bankName: cleanBank,
            bankAccountNumber: cleanAccount,
            bankAccountHolder: cleanOwner || userAuth.name?.toUpperCase() || "CHỦ TÀI KHOẢN"
          }
        });
      } catch (wrErr) {
        console.warn("Sync pending withdrawals warning:", wrErr);
      }
    }

    // 4. Xóa auth cache để phản hồi tức thì
    try {
      const { clearUserAuthCache } = await import("@/src/lib/auth");
      clearUserAuthCache(userAuth.id);
    } catch (_) {}

    try {
      revalidatePath("/my-closet/settings");
      revalidatePath("/my-closet/wallet");
      revalidatePath("/my-closet/profile");
      revalidatePath("/my-closet");
      revalidatePath("/admin/payments");
      revalidatePath("/app");
    } catch (e) {
      console.error("Cache purge failed:", e);
    }

    return { success: true };
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return { success: false, error: err.issues[0]?.message || "Dữ liệu không hợp lệ." };
    }
    const message = err instanceof Error ? err.message : "Không thể lưu cài đặt.";
    return { success: false, error: message };
  }
}
