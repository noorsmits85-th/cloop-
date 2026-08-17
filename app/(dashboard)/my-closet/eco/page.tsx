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
    .select("carbon_saved, water_saved, items_recycled, cloopLeaves")
    .eq("id", userId)
    .single();

  return (
    <div className="min-h-screen bg-[#FAF9F5] py-10 px-4 sm:px-8 text-stone-800 antialiased">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col mb-6">
          <h1 className="text-xl font-bold tracking-tight text-[#183A2D] uppercase font-mono">Thành tích ECO</h1>
          <p className="text-stone-500 text-xs mt-1">Dấu chân sinh thái của bạn khi sử dụng thời trang tuần hoàn.</p>
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
