import React from "react";
import { supabase } from "@/lib/supabase";
import { SettingsClient } from "../_components/SettingsClient";

export const revalidate = 0;

export default async function SettingsPage() {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;

  if (!userId) {
    return <div className="p-10 text-center">Vui lòng đăng nhập</div>;
  }

  const { data: userProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  return (
    <div className="min-h-screen bg-[#FAF9F5] py-10 px-4 sm:px-8 text-stone-800 antialiased">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col mb-6">
          <h1 className="text-xl font-bold tracking-tight text-[#183A2D] uppercase font-mono">Cài đặt Cửa hàng</h1>
          <p className="text-stone-500 text-xs mt-1">Cấu hình địa chỉ kho lấy hàng và liên kết thanh toán.</p>
        </div>
        
        <SettingsClient userProfile={userProfile} />
      </div>
    </div>
  );
}
