import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export function useTopClosets() {
  const [topClosets, setTopClosets] = useState<any[]>([]);

  useEffect(() => {
    async function fetchTopClosets() {
      try {
        const { data: reviewsData } = await supabase.from("Review").select("*").eq("type", "RENTER_TO_OWNER");
        if (!reviewsData || reviewsData.length === 0) {
          setTopClosets([]);
          return;
        }

        const grouped: Record<string, number[]> = {};
        reviewsData.forEach((r: any) => {
          if (!grouped[r.revieweeId]) grouped[r.revieweeId] = [];
          grouped[r.revieweeId].push(r.rating);
        });

        const ranked = Object.entries(grouped)
          .map(([userId, ratings]) => ({
            userId,
            avgRating: ratings.reduce((a, b) => a + b, 0) / ratings.length,
            reviewCount: ratings.length
          }))
          .sort((a, b) => b.avgRating - a.avgRating)
          .slice(0, 8);

        const userIds = ranked.map((r) => r.userId);
        
        let allTopUsers: any[] = [];
        if (userIds.length > 0) {
          // Giữ nguyên truy vấn 2 bảng "User" và "users" bằng Promise.all
          const [res1, res2] = await Promise.all([
            supabase.from("User").select("id, name, avatar").in("id", userIds),
            supabase.from("users").select("id, name, avatar").in("id", userIds)
          ]);
          allTopUsers = [...(res1.data || []), ...(res2.data || [])];
        }

        const merged = ranked.map((r) => {
          const u = allTopUsers.find((u: any) => u.id === r.userId);
          // Giữ nguyên fallback "Thành viên CLOOP"
          return { ...r, name: u?.name || "Thành viên CLOOP", avatar: u?.avatar || null };
        });

        setTopClosets(merged);
      } catch (err) {
        // Giữ nguyên nội dung log lỗi
        console.error("❌ Lỗi tải danh sách Top Tủ Đồ Uy Tín:", err);
      }
    }
    fetchTopClosets();
  }, []);

  return { topClosets };
}