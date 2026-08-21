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
    <div className="min-h-screen bg-[#FAF9F5] py-8 px-4 sm:px-8 text-stone-800 antialiased">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase font-bold tracking-wider text-emerald-800 bg-emerald-50/90 px-3 py-0.5 rounded-full border border-emerald-200/60 font-ui">
              HỆ THỐNG & CẤU HÌNH
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-heading tracking-normal text-[#183A2D] mt-2">
            Cài Đặt Tủ Đồ
          </h1>
          <p className="text-stone-500 text-xs sm:text-sm mt-1.5 font-body">
            Cấu hình địa chỉ kho lấy hàng, thông tin thanh toán ngân hàng và tùy chọn bảo mật.
          </p>
        </div>
        
        <SettingsClient userProfile={userProfile} />
      </div>
    </div>
  );
}
