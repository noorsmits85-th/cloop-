import { getClosetFullDataAction } from "@/app/actions/closet";
import { requireUser } from "@/src/lib/auth";
import ClosetProfileClient from "./_components/ClosetProfileClient";
import { notFound } from "next/navigation";

export const revalidate = 0; // Dynamic server fetch - không cache cũ

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

  const res = await getClosetFullDataAction(userId);
  if (!res.success || !res.ownerInfo) {
    notFound();
  }

  const isCurrentUser = !!currentUserId && (
    currentUserId === userId || 
    currentUserId.toLowerCase() === userId.toLowerCase()
  );

  const ownerInfo = {
    ...res.ownerInfo,
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
    />
  );
}
