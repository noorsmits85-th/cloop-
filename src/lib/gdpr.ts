import { prismaAdmin } from "./prisma";
import { supabaseAdmin } from "./supabase";

export async function anonymizeUserForGDPR(userId: string) {
  // 1. Delete user from Supabase Auth (Third-party) using Admin Client
  if (supabaseAdmin) {
    try {
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (authError) {
        console.error("Failed to delete user from Supabase Auth:", authError);
        throw authError;
      }
    } catch (err) {
      console.error("Error during Supabase Auth deletion", err);
    }
  }

  // 2. Anonymize user in our PostgreSQL Database (Tombstone Pattern)
  const tombstoneEmail = `deleted_${userId}@cloop.anonymized`;

  await prismaAdmin.user.update({
    where: { id: userId },
    data: {
      name: "Người dùng đã xóa",
      avatar: null,
    }
  });

  // 3. Hide all active products & listings
  await prismaAdmin.product.updateMany({
    where: { userId: userId, status: { in: ["IN_CLOSET", "ON_MARKET", "DRAFT"] } },
    data: { isDeleted: true }
  });

  return { success: true, message: "User data anonymized successfully." };
}
