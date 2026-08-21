import React from "react";
import { supabase } from "@/lib/supabase";
import { EcoClient } from "../_components/EcoClient";

export const revalidate = 0;

export default async function EcoPage() {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;

  if (!userId) {
    return <div className="p-10 text-center">Vui lòng đăng nhập</div>;
  }

  // Fetch eco stats from user profile
  const { data: userProfile } = await supabase
    .from("profiles")
    .select("carbon_saved, water_saved, items_recycled, cloopCoins")
    .eq("id", userId)
    .single();

  return (
    <div className="min-h-screen bg-[#FAF9F5] py-8 px-4 sm:px-8 text-stone-800 antialiased">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase font-bold tracking-wider text-emerald-800 bg-emerald-50/90 px-3 py-0.5 rounded-full border border-emerald-200/60 font-ui">
              BỀN VỮNG & SINH THÁI
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-heading tracking-normal text-[#183A2D] mt-2">
            Thống Kê Sinh Thái ESG
          </h1>
          <p className="text-stone-500 text-xs sm:text-sm mt-1.5 font-body">
            Dấu chân sinh thái tích cực của bạn khi chia sẻ và tái sử dụng thời trang tuần hoàn.
          </p>
        </div>
        
        <EcoClient 
          carbonSaved={userProfile?.carbon_saved || 0} 
          waterSaved={userProfile?.water_saved || 0} 
          itemsRecycled={userProfile?.items_recycled || 0} 
        />
      </div>
    </div>
  );
}
