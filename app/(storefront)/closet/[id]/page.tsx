import { getClosetProfile, getClosetProducts } from "@/app/actions/closet";
import { createClient } from "@/src/utils/supabase/server";
import { notFound } from "next/navigation";
import Image from "next/image";
import { MapPin, Calendar, Star, ShieldCheck } from "lucide-react";
import ClosetProductGrid from "@/components/ui/ClosetProductGrid";
import ShareClosetButton from "@/components/ui/ShareClosetButton";

export default async function ClosetPage({ params }: { params: { id: string } }) {
  const profile = await getClosetProfile(params.id);
  
  if (!profile) {
    notFound();
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { products, hasMore } = await getClosetProducts(params.id, 1, 12);
  const joinDate = new Date(profile.createdAt).toLocaleDateString("vi-VN", { month: "long", year: "numeric" });

  return (
    <div className="min-h-screen bg-stone-50 pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Profile Header */}
        <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8 mb-8 border border-stone-200">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <div className="relative w-24 h-24 md:w-32 md:h-32 flex-shrink-0">
              <Image 
                src={profile.avatar || "https://ui-avatars.com/api/?name=" + (profile.name || "User")} 
                alt={profile.name || "User Avatar"} 
                fill 
                className="rounded-full object-cover border-4 border-stone-100"
              />
            </div>
            
            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col md:flex-row md:items-center gap-2 mb-2 justify-center md:justify-start">
                <h1 className="text-2xl md:text-3xl font-bold text-stone-900">{profile.name || "User"}</h1>
                <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full text-xs font-medium border border-blue-200">
                  <ShieldCheck size={14} /> Đã xác thực
                </span>
              </div>
              
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-stone-500 mb-6">
                <span className="flex items-center gap-1"><Calendar size={16} /> Tham gia {joinDate}</span>
                <span className="flex items-center gap-1"><Star size={16} className="text-yellow-400 fill-yellow-400" /> 5.0 (12 đánh giá)</span>
                <span className="flex items-center gap-1">📍 TP. Hồ Chí Minh</span>
              </div>

              <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                <div className="text-center px-4 py-2 bg-stone-50 rounded-lg">
                  <div className="font-bold text-lg text-stone-900">{profile.totalListings}</div>
                  <div className="text-xs text-stone-500 uppercase tracking-wide">Sản phẩm</div>
                </div>
                <div className="text-center px-4 py-2 bg-stone-50 rounded-lg">
                  <div className="font-bold text-lg text-stone-900">{profile.completedOrders}</div>
                  <div className="text-xs text-stone-500 uppercase tracking-wide">Lượt cho thuê</div>
                </div>
              </div>
            </div>

            <div className="flex-shrink-0 w-full md:w-auto">
              <ShareClosetButton url={`https://cloop.vn/closet/${profile.id}`} />
            </div>
          </div>
        </div>

        {/* Product Grid */}
        <div>
          <h2 className="text-xl font-bold text-stone-900 mb-6">Tủ đồ của {profile.name || "User"}</h2>
          <ClosetProductGrid 
            initialProducts={products} 
            initialHasMore={hasMore} 
            userId={profile.id} 
            currentUserId={user?.id || null} 
          />
        </div>
      </div>
    </div>
  );
}
