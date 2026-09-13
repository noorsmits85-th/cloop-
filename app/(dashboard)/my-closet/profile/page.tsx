import React from "react";
import { requireUser } from "@/src/lib/auth";
import { calculateUserTrustScore } from "@/lib/trust-engine";
import { ProfileClient } from "../_components/ProfileClient";
import ReviewSection from "@/app/(storefront)/closet/[userId]/_components/ReviewSection";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ProfilePage() {
  let userAuth;
  try {
    userAuth = await requireUser();
  } catch (error) {
    // Không có session
  }

  if (!userAuth) {
    redirect("/login?next=/my-closet/profile");
  }

  const userId = userAuth.id;
  const meta = (userAuth as any).metadata || {};

  const userProfile = {
    id: userId,
    name: userAuth.name || meta.name || meta.full_name || "Thành viên CLOOP",
    username: meta.username || userId.substring(0, 8),
    location: meta.location || "Hà Nội, Việt Nam",
    quote: meta.quote || "Lưu giữ ký ức qua từng chiếc váy.",
    bio: meta.bio || "Mình là một người yêu thời trang vintage và những chuyến đi. Mình tin rằng mỗi món đồ đều có một câu chuyện đẹp để kể lại.",
    todaysMemory: meta.todaysMemory || "Hôm nay mình vừa cho thuê chiếc váy đầu tiên trên CLOOP. Một khởi đầu thật đáng nhớ!",
    avatar: userAuth.avatar || meta.avatar_url || meta.avatar || "",
    coverImage: meta.coverImage || "",
  };

  let trustBreakdown;
  try {
    trustBreakdown = await calculateUserTrustScore(userId);
  } catch (err) {
    console.warn("calculateUserTrustScore error fallback:", err);
  }

  return (
    <div className="min-h-screen bg-[#FAF9F5] py-8 px-4 sm:px-8 text-stone-800 antialiased">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase font-bold tracking-wider text-emerald-800 bg-emerald-50/90 px-3 py-0.5 rounded-full border border-emerald-200/60 font-ui">
              DANH TÍNH & ĐỘ TIN CẬY
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-heading tracking-normal text-[#183A2D] mt-2">
            Hồ Sơ & Uy Tín
          </h1>
          <p className="text-stone-500 text-xs sm:text-sm mt-1.5 font-body">
            Quản lý độ uy tín TrustScore, huy hiệu sinh thái và đánh giá cộng đồng từ các giao dịch.
          </p>
        </div>
        
        <ProfileClient 
          userProfile={userProfile || { id: userId, name: userAuth.name }} 
          trustBreakdown={trustBreakdown} 
        />

        {/* 🌟 ĐÁNH GIÁ CỘNG ĐỒNG ĐÃ NHẬN (LIÊN KẾT TRỰC TIẾP VỚI TỦ ĐỒ CÔNG KHAI) */}
        <div className="pt-2">
          <ReviewSection targetUserId={userId} />
        </div>
      </div>
    </div>
  );
}
