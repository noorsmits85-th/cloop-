"use client";

import { useEffect, useState } from "react";
import { getScrubbedReviewsAction, submitReviewAction } from "@/app/(dashboard)/my-closet/orders/actions";
import { Lock, Star, Loader2, MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@supabase/supabase-js";
import Image from "next/image";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://notxrjsuukrrxdlboavo.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "temporary-placeholder-key";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface ReviewSectionProps {
  targetUserId: string;
}

export default function ReviewSection({ targetUserId }: ReviewSectionProps) {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();
  
  // Modal state
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<any>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const viewerId = session?.user?.id;
      setCurrentUserId(viewerId);

      const res = await getScrubbedReviewsAction(targetUserId, viewerId);
      if (res.success && res.reviews) {
        setReviews(res.reviews);
      }
      setLoading(false);
    }
    loadData();
  }, [targetUserId]);

  const handleOpenUnlock = (review: any) => {
    setSelectedReview(review);
    setRating(5);
    setComment("");
    setUnlockModalOpen(true);
  };

  const handleUnlockSubmit = async () => {
    if (!selectedReview || !currentUserId) return;
    setSubmitting(true);
    
    // Nếu review hiện tại là RENTER_TO_OWNER, thì mình đánh giá lại phải là OWNER_TO_RENTER
    const oppositeType = selectedReview.type === "RENTER_TO_OWNER" ? "OWNER_TO_RENTER" : "RENTER_TO_OWNER";

    const res = await submitReviewAction({
      rentalId: selectedReview.rentalId,
      rating,
      comment,
      type: oppositeType
    });

    if (res.success) {
      toast.success("Mở khóa thành công! Các đánh giá đã được công khai.");
      setUnlockModalOpen(false);
      // Reload reviews
      const reloadRes = await getScrubbedReviewsAction(targetUserId, currentUserId);
      if (reloadRes.success && reloadRes.reviews) {
        setReviews(reloadRes.reviews);
      }
    } else {
      toast.error(res.error || "Có lỗi xảy ra khi đánh giá.");
    }
    setSubmitting(false);
  };

  if (loading) {
    return <div className="py-8 flex justify-center"><Loader2 className="animate-spin text-stone-400" /></div>;
  }

  return (
    <div className="mt-12 bg-white rounded-3xl p-6 lg:p-8 border border-stone-200 shadow-sm">
      <div className="flex items-center gap-2 mb-6">
        <MessageCircle className="text-[#183A2D]" size={24} />
        <h2 className="text-xl font-bold text-[#183A2D] font-heading tracking-wide uppercase">Đánh giá cộng đồng</h2>
      </div>

      {reviews.length === 0 ? (
        <div className="py-12 text-center text-stone-400 font-medium border border-dashed border-stone-200 rounded-2xl">
          <Star className="mx-auto mb-3 opacity-30" size={32} />
          <p className="text-sm italic font-heading">Chưa có đánh giá nào.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reviews.map((rev) => (
            <div key={rev.id} className="relative overflow-hidden border border-stone-200 rounded-2xl p-5 bg-[#FCFBFA] shadow-3xs group transition-all">
              {rev.isMasked ? (
                <>
                  <div className="absolute inset-0 bg-stone-900/5 backdrop-blur-[6px] z-10 flex flex-col items-center justify-center p-4 text-center border border-white/20">
                    <div className="bg-white p-3 rounded-full shadow-lg mb-3 animate-pulse">
                      <Lock className="text-[#183A2D]" size={24} />
                    </div>
                    <p className="text-sm font-bold text-[#183A2D] drop-shadow-sm font-heading mb-1">
                      {rev.reviewer?.name} đã gửi 1 đánh giá bí mật!
                    </p>
                    <p className="text-xs text-stone-600 mb-4 max-w-[200px] bg-white/70 px-2 py-1 rounded-md">
                      Bạn phải đánh giá lại giao dịch <span className="font-bold">"{rev.rental?.product?.title}"</span> để lật bài ngửa!
                    </p>
                    <button 
                      onClick={() => handleOpenUnlock(rev)}
                      className="bg-[#183A2D] text-white px-5 py-2 rounded-full text-xs font-bold hover:bg-[#122A20] hover:scale-105 transition-all shadow-md flex items-center gap-2"
                    >
                      MỞ KHÓA NGAY <Send size={12} />
                    </button>
                    {/* Countdown Timer (Simulated for FOMO) */}
                    <p className="text-[9px] font-bold text-orange-600 mt-3 bg-orange-100 px-2 py-0.5 rounded animate-pulse">
                      ⏳ Tự động mở khóa sau 06 ngày 23 giờ...
                    </p>
                  </div>
                  
                  {/* Cảnh nền bị làm mờ để tạo sự tò mò */}
                  <div className="opacity-30 select-none blur-[2px]">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-stone-300 rounded-full" />
                      <div>
                        <p className="font-bold text-sm bg-stone-200 text-stone-200 rounded w-24">Hidden Name</p>
                        <div className="flex gap-1 mt-1">
                          {[1,2,3,4,5].map(i => <Star key={i} size={10} className="text-stone-300" />)}
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-stone-300 font-heading bg-stone-200 rounded w-full h-4 mb-2"></p>
                    <p className="text-sm text-stone-300 font-heading bg-stone-200 rounded w-3/4 h-4"></p>
                  </div>
                </>
              ) : (
                <div className="relative z-0">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 relative rounded-full overflow-hidden border-2 border-white shadow-sm bg-stone-100">
                        <Image 
                          src={rev.reviewer?.avatar || "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=150"} 
                          alt="avatar" 
                          fill 
                          unoptimized 
                          className="object-cover" 
                        />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-stone-800">{rev.reviewer?.name || "Người dùng"}</p>
                        <div className="flex gap-0.5 mt-0.5">
                          {[1, 2, 3, 4, 5].map(star => (
                            <Star 
                              key={star} 
                              size={12} 
                              className={star <= rev.rating ? "fill-yellow-400 text-yellow-400" : "fill-stone-200 text-stone-200"} 
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] text-stone-400 font-medium">
                      {new Date(rev.createdAt).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                  <p className="text-sm text-stone-600 italic font-heading leading-relaxed mb-3">
                    "{rev.comment}"
                  </p>
                  <div className="bg-white border border-stone-100 px-3 py-2 rounded-xl inline-block">
                    <p className="text-[10px] text-stone-500 font-medium flex items-center gap-1">
                      <span className="font-bold text-[#183A2D]">•</span> Giao dịch: <span className="text-stone-800 font-bold truncate max-w-[150px]">{rev.rental?.product?.title}</span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Unlock Modal */}
      {unlockModalOpen && selectedReview && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-stone-100">
              <div className="flex items-center gap-2 mb-1">
                <Lock size={18} className="text-[#183A2D]" />
                <h3 className="text-lg font-bold text-[#183A2D] font-heading">Đánh giá ngược lại</h3>
              </div>
              <p className="text-sm text-stone-500 font-medium">
                Hãy cho <b>{selectedReview.reviewer?.name}</b> một đánh giá về giao dịch <b>"{selectedReview.rental?.product?.title}"</b> để lật bài ngửa!
              </p>
            </div>
            
            <div className="p-6 space-y-5 bg-[#FCFBFA]">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-2 uppercase tracking-wide">Điểm số</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button 
                      key={star}
                      onClick={() => setRating(star)}
                      className="p-1 cursor-pointer hover:scale-110 transition-transform"
                    >
                      <Star size={32} className={star <= rating ? "fill-yellow-400 text-yellow-400" : "fill-stone-200 text-stone-200"} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-2 uppercase tracking-wide">Nhận xét của bạn</label>
                <textarea 
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Người này có giữ gìn đồ đạc cẩn thận không? Giao tiếp thân thiện chứ?"
                  className="w-full bg-white border border-stone-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#183A2D]/20 focus:border-[#183A2D] transition-all resize-none h-24"
                />
              </div>
            </div>

            <div className="p-4 bg-white border-t border-stone-100 flex justify-end gap-2">
              <button 
                onClick={() => setUnlockModalOpen(false)}
                className="px-4 py-2 text-sm font-bold text-stone-500 hover:text-stone-800 transition-colors"
                disabled={submitting}
              >
                Để sau
              </button>
              <button 
                onClick={handleUnlockSubmit}
                disabled={submitting || !comment.trim()}
                className="bg-[#183A2D] text-white px-6 py-2 rounded-full text-sm font-bold shadow-md hover:bg-[#122A20] transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
                {submitting ? "Đang mở khóa..." : "MỞ KHÓA BÍ MẬT"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
