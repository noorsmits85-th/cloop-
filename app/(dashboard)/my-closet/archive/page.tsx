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
    <div className="min-h-screen bg-[#FAF9F5] py-8 px-4 sm:px-8 text-stone-800 antialiased font-ui">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col border-b border-stone-200/60 pb-6">
          <h1 className="text-2xl font-bold tracking-tight text-[#183A2D]">Kho lưu trữ</h1>
          <p className="text-stone-500 text-sm mt-1">Lịch sử các món đồ đã hoàn thành sứ mệnh tuần hoàn.</p>
        </div>
        
        <ArchiveClientUI 
          initialItems={initialFetch.data} 
          initialNextCursor={initialFetch.nextCursor} 
        />
      </div>
    </div>
  );
}
