"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { ExternalLink, Plus } from "lucide-react"; // Import icon mới

// Kết nối Supabase để lấy ID người dùng
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://notxrjsuukrrxdlboavo.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "temporary-placeholder-key";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface ClosetHeaderProps {
  onOpenUpload: () => void;
}

export default function ClosetHeader({ onOpenUpload }: ClosetHeaderProps) {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Tự động nhận diện ID của người dùng đang đăng nhập
    const fetchUser = async () => {
      let loggedInId = localStorage.getItem("cloop_user_id");
      if (loggedInId) {
        setUserId(loggedInId);
      } else {
        const { data } = await supabase.auth.getUser();
        if (data?.user?.id) {
          setUserId(data.user.id);
        }
      }
    };
    fetchUser();
  }, []);

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-[#E9E2D8] pb-5 gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#183A2D] font-serif">Tủ đồ của tôi</h1>
        <p className="text-xs text-gray-500 mt-1">Quản lý kho đồ tuần hoàn cá nhân, theo dõi trạng thái và tối ưu Green Points.</p>
      </div>
      
      <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
        {/* 🟢 LỐI TẮT 1 CHẠM: Nút xem hồ sơ Scrapbook công khai */}
        {userId && (
          <Link
            href={`/closet/${userId}`}
            className="w-full sm:w-auto bg-white border border-stone-200 hover:bg-stone-50 text-[#183A2D] font-bold text-xs px-5 py-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
          >
            <ExternalLink size={16} /> Hồ sơ công khai
          </Link>
        )}

        <button
          onClick={onOpenUpload}
          className="w-full sm:w-auto bg-[#183A2D] hover:opacity-90 text-[#FDFBF7] font-bold text-xs px-5 py-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
        >
          <Plus size={16} /> Đăng trang phục mới
        </button>
      </div>
    </div>
  );
}