import { getClosetFullDataAction } from "@/app/actions/closet";
import { getScrubbedReviewsAction } from "@/app/(dashboard)/my-closet/orders/actions";
import { requireUser } from "@/src/lib/auth";
import ClosetProfileClient from "./_components/ClosetProfileClient";
import { notFound } from "next/navigation";

export const revalidate = 60; // ⚡ SWR CACHE 60s (Giảm 90% DB query khi nhiều người xem tủ đồ)

export default async function ClosetProfilePage({ 
  params 
}: { 
  params: Promise<{ userId: string }> 
}) {
  const { userId } = await params;
  if (!userId) notFound();

  let currentUserId: string | null = null;
  let currentUserMeta: any = null;
  try {
    const userAuth = await requireUser();
    currentUserId = userAuth?.id || null;
    currentUserMeta = (userAuth as any)?.metadata || null;
  } catch {
    // Guest viewer
  }

  // ⚡ Song song hóa tải dữ liệu tủ đồ và danh sách đánh giá từ server
  const [res, reviewsRes] = await Promise.all([
    getClosetFullDataAction(userId),
    getScrubbedReviewsAction(userId, currentUserId || undefined).catch(() => ({ success: true, reviews: [] }))
  ]);

  if (!res.success || !res.ownerInfo) {
    notFound();
  }

  const isCurrentUser = !!currentUserId && (
    currentUserId === userId || 
    currentUserId.toLowerCase() === userId.toLowerCase()
  );

  const ownerInfo = {
    ...res.ownerInfo,
    ...(isCurrentUser && currentUserMeta?.name && { name: currentUserMeta.name }),
    ...(isCurrentUser && currentUserMeta?.avatar && { avatar: currentUserMeta.avatar }),
    ...(isCurrentUser && currentUserMeta?.location && { location: currentUserMeta.location }),
    ...(isCurrentUser && currentUserMeta?.bio && { bio: currentUserMeta.bio }),
    ...(isCurrentUser && currentUserMeta?.quote && { quote: currentUserMeta.quote }),
    ...(isCurrentUser && currentUserMeta?.todaysMemory && { todaysMemory: currentUserMeta.todaysMemory }),
  };

  return (
    <ClosetProfileClient
      userId={userId}
      initialOwnerInfo={ownerInfo}
      initialProducts={res.products || []}
      initialMemories={res.memories || []}
      rawProductCount={res.rawProductCount || 0}
      isCurrentUser={isCurrentUser}
      initialReviews={reviewsRes?.reviews || []}
      viewerId={currentUserId || undefined}
    />
  );
}
