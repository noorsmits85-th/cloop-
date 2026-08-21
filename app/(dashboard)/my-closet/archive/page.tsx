import React from "react";
import { requireUser } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { redirect } from "next/navigation";
import ArchiveClientUI from "./ArchiveClientUI";
import { fetchArchivedListings } from "./actions";

export default async function ArchivePage() {
  let userAuth;
  try {
    userAuth = await requireUser();
  } catch (error) {}

  if (!userAuth) {
    redirect("/login");
  }

  const initialFetch = await fetchArchivedListings();

  return (
    <div className="min-h-screen bg-[#FAF9F5] py-8 px-4 sm:px-8 text-stone-800 antialiased">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase font-bold tracking-wider text-emerald-800 bg-emerald-50/90 px-3 py-0.5 rounded-full border border-emerald-200/60 font-ui">
              LỊCH SỬ TUẦN HOÀN
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-heading tracking-normal text-[#183A2D] mt-2">
            Kho Lưu Trữ
          </h1>
          <p className="text-stone-500 text-xs sm:text-sm mt-1.5 font-body">
            Lịch sử và kỷ niệm các món đồ đã hoàn thành trọn vẹn sứ mệnh tuần hoàn.
          </p>
        </div>
        
        <ArchiveClientUI 
          initialItems={initialFetch.data} 
          initialNextCursor={initialFetch.nextCursor} 
        />
      </div>
    </div>
  );
}
