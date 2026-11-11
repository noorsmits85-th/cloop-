import { useState, useEffect } from "react";
import { getShopProductsAction } from "@/app/actions/product";

export function useTopClosets() {
  const [topClosets, setTopClosets] = useState<any[]>([]);

  useEffect(() => {
    async function fetchTopClosets() {
      try {
        const items = await getShopProductsAction({});
        const ownerMap = new Map<string, { userId: string; name: string; avatar: string | null; count: number }>();
        (items || []).forEach((item: any) => {
          if (!item.userId) return;
          const existing = ownerMap.get(item.userId);
          if (existing) {
            existing.count += 1;
          } else {
            ownerMap.set(item.userId, {
              userId: item.userId,
              name: item.ownerName || "Thành viên CLOOP",
              avatar: item.ownerAvatar || null,
              count: 1,
            });
          }
        });
        setTopClosets(
          Array.from(ownerMap.values())
            .slice(0, 8)
            .map((u) => ({
              userId: u.userId,
              name: u.name,
              avatar: u.avatar,
              avgRating: 5.0,
              reviewCount: u.count,
            }))
        );
      } catch (err) {
        console.error("Lỗi tải danh sách Top Tủ Đồ Uy Tín:", err);
      }
    }
    fetchTopClosets();
  }, []);

  return { topClosets };
}
