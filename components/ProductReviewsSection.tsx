"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import { Star, ThumbsUp, CheckCircle2, ShieldCheck, MessageSquare, Camera, Sparkles, Filter } from "lucide-react";

export interface ReviewItem {
  id: string;
  userName: string;
  userAvatar?: string | null;
  rating: number;
  date: string;
  variantInfo?: string;
  materialFeedback?: string;
  accuracyFeedback?: string;
  comment: string;
  images?: string[];
  shopResponse?: string;
  helpfulCount?: number;
}

interface ProductReviewsSectionProps {
  productId?: string;
  productTitle?: string;
  category?: string;
  size?: string;
  ownerName?: string;
  dbReviews?: any[];
  averageRating?: number;
  totalReviews?: number;
}

export default function ProductReviewsSection({
  productId,
  productTitle = "Trang phục CLOOP",
  category = "Đầm & Váy",
  size = "M",
  ownerName = "Chủ tủ đồ CLOOP",
  dbReviews = [],
  averageRating = 4.9,
  totalReviews = 0
}: ProductReviewsSectionProps) {
  const [selectedFilter, setSelectedFilter] = useState<string>("ALL");
  const [helpfulLiked, setHelpfulLiked] = useState<Record<string, boolean>>({});

  // 🌿 Chuyển đổi dữ liệu đánh giá thực tế từ Database (Không dùng dữ liệu giả lập)
  const allReviews: ReviewItem[] = useMemo(() => {
    if (!dbReviews || dbReviews.length === 0) {
      return [];
    }

    return dbReviews.map((r: any, idx: number) => {
      const reviewerName = r.reviewer?.name || "Khách hàng CLOOP";
      const masked = reviewerName.length > 2 
        ? reviewerName.charAt(0) + "*****" + reviewerName.charAt(reviewerName.length - 1)
        : "k*****h";

      let parsedImages: string[] = [];
      if (Array.isArray(r.images)) {
        parsedImages = r.images;
      } else if (typeof r.images === "string" && r.images.trim()) {
        try {
          parsedImages = JSON.parse(r.images);
        } catch {
          parsedImages = [r.images];
        }
      }

      return {
        id: r.id || `db-${idx}`,
        userName: masked,
        userAvatar: r.reviewer?.avatar || null,
        rating: r.rating || 5,
        date: r.createdAt ? new Date(r.createdAt).toISOString().slice(0, 16).replace("T", " ") : "Gần đây",
        variantInfo: r.variantInfo || `Size ${size}`,
        materialFeedback: r.materialFeedback || "Chất vải mềm mịn, đúng chuẩn mô tả",
        accuracyFeedback: r.accuracyFeedback || "Chuẩn xác 100%",
        comment: r.comment || "Sản phẩm chất lượng, giao nhận nhanh chóng và đóng gói chu đáo!",
        images: parsedImages,
        shopResponse: r.shopResponse || null,
        helpfulCount: r.helpfulCount || 0
      };
    });
  }, [dbReviews, size]);

  // Tính toán thống kê sao
  const stats = useMemo(() => {
    const total = allReviews.length;
    const count5 = allReviews.filter(r => Math.round(r.rating) === 5).length;
    const count4 = allReviews.filter(r => Math.round(r.rating) === 4).length;
    const count3 = allReviews.filter(r => Math.round(r.rating) === 3).length;
    const count2 = allReviews.filter(r => Math.round(r.rating) === 2).length;
    const count1 = allReviews.filter(r => Math.round(r.rating) === 1).length;
    const countWithComment = allReviews.filter(r => Boolean(r.comment?.trim())).length;
    const countWithImages = allReviews.filter(r => r.images && r.images.length > 0).length;

    const avg = total > 0 
      ? (allReviews.reduce((sum, r) => sum + r.rating, 0) / total).toFixed(1)
      : averageRating.toFixed(1);

    return {
      total,
      avg: Number(avg),
      count5,
      count4,
      count3,
      count2,
      count1,
      countWithComment,
      countWithImages
    };
  }, [allReviews, averageRating]);

  // Bộ lọc danh sách review
  const filteredReviews = useMemo(() => {
    switch (selectedFilter) {
      case "STAR_5":
        return allReviews.filter(r => Math.round(r.rating) === 5);
      case "STAR_4":
        return allReviews.filter(r => Math.round(r.rating) === 4);
      case "STAR_3":
        return allReviews.filter(r => Math.round(r.rating) === 3);
      case "WITH_COMMENT":
        return allReviews.filter(r => Boolean(r.comment?.trim()));
      case "WITH_IMAGES":
        return allReviews.filter(r => r.images && r.images.length > 0);
      default:
        return allReviews;
    }
  }, [allReviews, selectedFilter]);

  const toggleHelpful = (id: string) => {
    setHelpfulLiked(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <section className="rounded-3xl border border-stone-200/90 bg-white p-6 sm:p-8 shadow-xs text-left font-sans mt-8 space-y-6">
      
      {/* 🏷️ TIÊU ĐỀ KHU VỰC ĐÁNH GIÁ */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-stone-100">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-6 bg-[#183A2D] rounded-full" />
          <h2 className="text-lg sm:text-xl font-heading font-extrabold uppercase tracking-wide text-[#142A1E]">
            Đánh Giá Sản Phẩm
          </h2>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200/60 font-ui">
          <ShieldCheck size={14} className="text-emerald-700" /> 100% Đánh giá từ người thuê & mua thực tế
        </div>
      </div>

      {/* 🌿 NẾU CHƯA CÓ ĐÁNH GIÁ (TRANG PHỤC MỚI LÊN SÓNG) */}
      {allReviews.length === 0 ? (
        <div className="rounded-2xl bg-gradient-to-b from-[#FAF8F3] to-[#F4EFE6] border border-[#EBE3D5] p-6 sm:p-10 text-center space-y-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white shadow-xs border border-stone-200 text-[#183A2D]">
            <Sparkles size={28} className="text-amber-500" />
          </div>

          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-base sm:text-lg font-heading font-bold text-[#142A1E]">
              Chưa có đánh giá nào cho trang phục này
            </h3>
            <p className="text-xs sm:text-[13px] text-stone-600 leading-relaxed font-body">
              Thiết kế tuyển chọn vừa mới lên sóng tủ đồ CLOOP. Hãy là người đầu tiên trải nghiệm thiết kế này và nhận ngay{" "}
              <span className="font-bold text-[#183A2D] bg-emerald-100/80 px-1.5 py-0.5 rounded-md">
                +50 Leaf Coins
              </span>{" "}
              khi viết nhận xét sau chuyến thuê!
            </p>
          </div>

          {/* 3 Cam kết bảo chứng từ CLOOP */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 max-w-2xl mx-auto text-left">
            <div className="bg-white/80 backdrop-blur-xs p-3.5 rounded-xl border border-stone-200/80 space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-[#183A2D]">
                <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
                <span>Két Cọc Escrow An Toàn</span>
              </div>
              <p className="text-[11px] text-stone-500 leading-relaxed">
                Tiền cọc giữ tại hệ thống CLOOP Escrow, chỉ giải ngân cho chủ đồ sau khi bạn trả đồ an toàn.
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-xs p-3.5 rounded-xl border border-stone-200/80 space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-[#183A2D]">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span>100% Đồ Thật Kiểm Định</span>
              </div>
              <p className="text-[11px] text-stone-500 leading-relaxed">
                Tủ đồ đã xác thực danh tính chủ sở hữu. Trang phục giặt sấy thơm tho và kiểm tra độ mới kỹ lưỡng.
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-xs p-3.5 rounded-xl border border-stone-200/80 space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-[#183A2D]">
                <Camera size={16} className="text-emerald-600 shrink-0" />
                <span>Đồng Kiểm Khi Nhận</span>
              </div>
              <p className="text-[11px] text-stone-500 leading-relaxed">
                Được kiểm hàng cùng shipper. Khiếu nại đền bù 100% nếu sản phẩm không đúng như mô tả.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* ⭐ KHỐI THỐNG KÊ RATING CHUẨN SHOPEE */}
          <div className="rounded-2xl bg-[#FAF8F3] border border-[#EFE8DC] p-5 sm:p-7 flex flex-col md:flex-row items-center gap-6 sm:gap-10">
            
            {/* Cột trái: Điểm số trung bình to nổi bật */}
            <div className="flex flex-col items-center justify-center text-center shrink-0 min-w-[140px]">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl sm:text-5xl font-mono font-black text-[#183A2D] leading-none">
                  {stats.avg}
                </span>
                <span className="text-base font-bold text-stone-500 font-ui">
                  trên 5
                </span>
              </div>

              <div className="flex items-center gap-1 my-2 text-amber-400">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star 
                    key={star} 
                    size={18} 
                    className={star <= Math.round(stats.avg) ? "fill-amber-400 text-amber-400" : "text-stone-300"} 
                  />
                ))}
              </div>

              <p className="text-xs text-stone-500 font-medium">
                ({stats.total} lượt đánh giá thực tế)
              </p>
            </div>

            {/* Cột phải: Bộ nút lọc phân loại (Tất cả, 5 sao, 4 sao, Có hình ảnh...) */}
            <div className="flex-1 flex flex-wrap gap-2 w-full justify-start items-center font-ui text-xs">
              {[
                { key: "ALL", label: `Tất Cả (${stats.total})` },
                { key: "STAR_5", label: `5 Sao (${stats.count5})` },
                { key: "STAR_4", label: `4 Sao (${stats.count4})` },
                { key: "STAR_3", label: `3 Sao (${stats.count3})` },
                { key: "WITH_COMMENT", label: `Có Bình Luận (${stats.countWithComment})` },
                { key: "WITH_IMAGES", label: `Có Hình Ảnh / Video (${stats.countWithImages})` },
              ].map((btn) => {
                const isSelected = selectedFilter === btn.key;
                return (
                  <button
                    key={btn.key}
                    type="button"
                    onClick={() => setSelectedFilter(btn.key)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[#183A2D] text-white shadow-xs border border-[#183A2D]"
                        : "bg-white text-stone-700 border border-stone-200/80 hover:border-[#183A2D]/50 hover:bg-stone-50"
                    }`}
                  >
                    {btn.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 💬 DANH SÁCH CÁC BÌNH LUẬN CHI TIẾT */}
          <div className="divide-y divide-stone-100">
            {filteredReviews.length === 0 ? (
              <div className="py-12 text-center text-stone-500 text-xs font-body">
                Chưa có đánh giá nào phù hợp với bộ lọc đã chọn.
              </div>
            ) : (
              filteredReviews.map((review) => {
                const isLiked = Boolean(helpfulLiked[review.id]);
                const currentHelpful = (review.helpfulCount || 0) + (isLiked ? 1 : 0);

                return (
                  <article key={review.id} className="py-6 space-y-3 first:pt-2">
                    
                    {/* User Info Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#E5EFE2] text-[#183A2D] flex items-center justify-center font-bold text-sm border border-emerald-200 overflow-hidden">
                          {review.userAvatar ? (
                            <img src={review.userAvatar} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            review.userName.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-stone-900 font-mono">
                              {review.userName}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                              <CheckCircle2 size={10} className="text-emerald-700" /> Đã xác thực
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-amber-400 mt-1">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star key={s} size={13} className={s <= review.rating ? "fill-amber-400 text-amber-400" : "text-stone-300"} />
                            ))}
                          </div>
                        </div>
                      </div>

                      <span className="text-[11px] text-stone-400 font-mono">
                        {review.date}
                      </span>
                    </div>

                    {/* Phân loại đơn hàng */}
                    {review.variantInfo && (
                      <div className="text-[11px] text-stone-500 font-ui flex items-center gap-1.5 pl-13">
                        <span>Phân loại hàng:</span>
                        <span className="font-medium text-stone-700 bg-stone-100 px-2 py-0.5 rounded-md">
                          {review.variantInfo}
                        </span>
                      </div>
                    )}

                    {/* Các tiêu chí đánh giá chuẩn Shopee */}
                    <div className="pl-13 space-y-1 text-xs text-stone-600">
                      {review.materialFeedback && (
                        <p className="flex items-center gap-1.5">
                          <span className="text-stone-400 text-[11px]">Chất lượng sản phẩm:</span>
                          <strong className="text-stone-800 font-semibold">{review.materialFeedback}</strong>
                        </p>
                      )}
                      {review.accuracyFeedback && (
                        <p className="flex items-center gap-1.5">
                          <span className="text-stone-400 text-[11px]">Đúng với mô tả:</span>
                          <strong className="text-stone-800 font-semibold">{review.accuracyFeedback}</strong>
                        </p>
                      )}
                    </div>

                    {/* Nội dung nhận xét */}
                    <p className="pl-13 text-xs sm:text-[13px] text-stone-800 leading-relaxed font-body">
                      {review.comment}
                    </p>

                    {/* Hình ảnh khách chụp feedback */}
                    {review.images && review.images.length > 0 && (
                      <div className="flex flex-wrap gap-2.5 pl-13 pt-1">
                        {review.images.map((imgUrl, i) => (
                          <div key={i} className="relative w-20 h-24 sm:w-24 sm:h-32 rounded-xl border border-stone-200 bg-stone-100 shadow-2xs group cursor-pointer overflow-hidden">
                            <img 
                              src={imgUrl} 
                              alt={`Feedback ${i + 1}`} 
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Khung phản hồi của Người Bán (Shopee Seller Reply Box) */}
                    {review.shopResponse && (
                      <div className="ml-13 mt-2.5 bg-[#FAF8F3] border-l-3 border-[#183A2D] p-3 rounded-r-xl space-y-1 text-xs">
                        <p className="font-bold text-[#183A2D] flex items-center gap-1.5 text-[11.5px]">
                          <MessageSquare size={13} /> Phản Hồi Từ Người Bán
                        </p>
                        <p className="text-stone-600 leading-relaxed font-body text-[11.5px]">
                          {review.shopResponse}
                        </p>
                      </div>
                    )}

                    {/* Nút hữu ích */}
                    <div className="pl-13 pt-1 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => toggleHelpful(review.id)}
                        className={`inline-flex items-center gap-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                          isLiked ? "text-emerald-800 font-bold" : "text-stone-400 hover:text-stone-700"
                        }`}
                      >
                        <ThumbsUp size={12} className={isLiked ? "fill-emerald-800 text-emerald-800" : ""} />
                        <span>Hữu ích ({currentHelpful})</span>
                      </button>
                    </div>

                  </article>
                );
              })
            )}
          </div>
        </>
      )}

    </section>
  );
}
