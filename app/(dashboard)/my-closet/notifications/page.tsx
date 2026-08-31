import { Suspense } from "react";
import { getUserNotificationsAction } from "@/app/actions/notification";
import { NotificationsClient } from "./NotificationsClient";
import { requireUser } from "@/src/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  try {
    await requireUser();
  } catch (error) {
    redirect("/login");
  }

  const res = await getUserNotificationsAction();
  const notifications = res.success ? res.notifications : [];
  const unreadCount = res.success ? res.unreadCount : 0;

  return (
    <Suspense
      fallback={
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-[#183A2D] border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <NotificationsClient
        initialNotifications={notifications}
        initialUnreadCount={unreadCount}
      />
    </Suspense>
  );
}
