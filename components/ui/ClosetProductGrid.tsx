"use client";

import { useState } from "react";
import Image from "next/image";
import { getClosetProducts } from "@/app/actions/closet";
import { bumpProductAction } from "@/app/actions/product";
import Countdown from "react-countdown";
import { ArrowUpCircle, CheckCircle2 } from "lucide-react";

export default function ClosetProductGrid({ initialProducts, initialHasMore, userId, currentUserId }: { initialProducts: any[], initialHasMore: boolean, userId: string, currentUserId: string | null }) {
  const [products, setProducts] = useState(initialProducts);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const isOwner = userId === currentUserId;

  const loadMore = async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    const nextPage = page + 1;
    const { products: newProducts, hasMore: more } = await getClosetProducts(userId, nextPage, 12);
    setProducts(prev => [...prev, ...newProducts]);
    setHasMore(more);
    setPage(nextPage);
    setLoading(false);
  };

  const handleBump = async (productId: string) => {
    const res = await bumpProductAction(productId);
    if (!res.success) {
      alert(res.error);
    } else {
      // Optimistic update
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, lastBumpedAt: new Date().toISOString() } : p));
      alert("Đẩy đồ thành công!");
    }
  };

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {products.map((product) => {
          const now = new Date();
          const lastBumped = new Date(product.lastBumpedAt);
          const nextBumpTime = new Date(lastBumped.getTime() + 60 * 60 * 1000); // 1 hour cooldown
          const canBump = now >= nextBumpTime;

          return (
            <div key={product.id} className="bg-white rounded-xl shadow-sm overflow-hidden border border-stone-200">
              <div className="relative aspect-square bg-stone-100">
                {product.images?.[0]?.url ? (
                  <Image src={product.images[0].url} alt={product.title} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-stone-400">No Image</div>
                )}
                {product.status === "PENDING" && (
                  <div className="absolute top-2 left-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full">Đang chờ duyệt</div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-stone-800 line-clamp-1">{product.title}</h3>
                <p className="text-sm text-stone-500 mt-1">{product.size} • {product.condition}</p>
                
                {isOwner && (
                  <div className="mt-4">
                    {canBump ? (
                      <button 
                        onClick={() => handleBump(product.id)}
                        className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg font-medium transition-colors"
                      >
                        <ArrowUpCircle size={18} /> Đẩy Lên Top
                      </button>
                    ) : (
                      <button disabled className="w-full flex items-center justify-center gap-2 bg-stone-100 text-stone-400 py-2 rounded-lg font-medium cursor-not-allowed">
                        <Countdown 
                          date={nextBumpTime} 
                          renderer={({ hours, minutes, seconds }) => (
                            <span>Chờ {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}</span>
                          )} 
                          onComplete={() => {
                            // Force re-render when countdown finishes
                            setProducts(prev => [...prev]);
                          }}
                        />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {hasMore && (
        <div className="mt-8 flex justify-center">
          <button 
            onClick={loadMore} 
            disabled={loading}
            className="px-6 py-2 border border-stone-300 rounded-full text-stone-700 font-medium hover:bg-stone-50 transition-colors"
          >
            {loading ? "Đang tải..." : "Xem thêm"}
          </button>
        </div>
      )}
    </div>
  );
}
