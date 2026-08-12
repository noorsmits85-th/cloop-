import React from "react";
import { supabase } from "@/lib/supabase";
import { ArchiveClient } from "../_components/ArchiveClient";

export const revalidate = 0;

export default async function ArchivePage() {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;

  if (!userId) {
    return <div className="p-10 text-center">Vui lòng đăng nhập</div>;
  }

  // Fetch deleted/archived items (giả lập: isShopHidden = true, deleted = true)
  const { data: archivedItems } = await supabase
    .from("products")
    .select("*")
    .eq("userId", userId)
    .eq("isShopHidden", true);

  return (
    <div className="min-h-screen bg-[#FAF9F5] py-10 px-4 sm:px-8 text-stone-800 antialiased">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col mb-6">
          <h1 className="text-xl font-bold tracking-tight text-[#183A2D] uppercase font-mono">Kho lưu trữ</h1>
          <p className="text-stone-500 text-xs mt-1">Nơi lưu giữ những sản phẩm đã ẩn hoặc tái chế.</p>
        </div>
        
        <ArchiveClient initialItems={archivedItems || []} />
      </div>
    </div>
  );
}
