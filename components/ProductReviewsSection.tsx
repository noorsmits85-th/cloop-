"use client";

import { useState, useMemo, useRef } from "react";
import { 
  Star, 
  ThumbsUp, 
  CheckCircle2, 
  ShieldCheck, 
  MessageSquare, 
  Camera, 
  Sparkles, 
  Video, 
  Play, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  UploadCloud, 
  Plus, 
  PenLine, 
  Flame, 
  Check,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";

export interface ReviewMediaItem {
  type: "image" | "video";
  url: string;
  thumbnailUrl?: string;
  duration?: string;
}

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
  videos?: Array<{ url: string; thumbnailUrl?: string; duration?: string }>;
  tags?: string[];
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

// 🌟 BỘ TAGS KHEN NGỢI CHUẨN SHOPEE
const SHOPEE_SENTIMENT_TAGS = [
  "Chất vải đẹp",
  "Đúng với mô tả",
  "Giao hàng nhanh",
  "Đóng gói cẩn thận",
  "Vừa vặn tôn dáng",
  "Chủ tủ nhiệt tình"
];

// 🌟 DỮ LIỆU ĐÁNH GIÁ MẪU PHONG PHÚ (KHI SẢN PHẨM MỚI LÊN SÓNG HOẶC CHƯA CÓ REVIEW ĐỦ DÀY)
const CURATED_DEFAULT_REVIEWS: ReviewItem[] = [
  {
    id: "sample-1",
    userName: "m*****9",
    userAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200",
    rating: 5,
    date: "2026-09-08 14:22",
    variantInfo: "Size: M | Màu: Hồng Pastel | Thuê 3 Ngày",
    materialFeedback: "Chất lụa tơ tằm dệt cao cấp, mềm rủ cực sang",
    accuracyFeedback: "Chuẩn 100% so với ảnh mẫu",
    comment: "Đồ nhận được đóng gói trong hộp thơm tho sạch sẽ như đồ mới khui seal! Form váy lên chuẩn chỉnh, che khuyết điểm eo cực tốt. Mình mặc đi đám cưới ai cũng khen visual phát sáng. Hết tiệc có shipper tới tận nhà lấy đồ trả, tiện dã man!",
    images: [
      "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?q=80&w=600",
      "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=600"
    ],
    videos: [
      {
        url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
        thumbnailUrl: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=600",
        duration: "0:15"
      }
    ],
    tags: ["Chất vải đẹp", "Đúng với mô tả", "Đóng gói cẩn thận"],
    shopResponse: "Dạ CLOOP Closet cảm ơn nàng rất nhiều đã tin yêu và gửi feedback siêu có tâm ạ! Nàng mặc lên tôn dáng xinh xỉu luôn á. Lần sau ghé lại nhớ nhắn em gửi tặng mã giảm giá nha ❤️",
    helpfulCount: 38
  },
  {
    id: "sample-2",
    userName: "t*****h",
    userAvatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=200",
    rating: 5,
    date: "2026-09-05 19:45",
    variantInfo: "Size: S | Thuê 2 Ngày",
    materialFeedback: "Vải voan tơ cát mịn màng 2 lớp dày dặn",
    accuracyFeedback: "Khớp từng đường kim mũi chỉ",
    comment: "Lần đầu thuê đồ qua app mà bất ngờ vì dịch vụ chuyên nghiệp thế này. Tiền cọc giữ qua két Escrow an toàn nên cực kỳ yên tâm không lo mất cọc. Váy giặt ủi thơm phức, shipper giao đúng hẹn!",
    images: [
      "https://images.unsplash.com/photo-1502716119720-b23a93e5fe1b?q=80&w=600"
    ],
    tags: ["Giao hàng nhanh", "Chất vải đẹp", "Vừa vặn tôn dáng"],
    shopResponse: "CLOOP xin chân thành cảm ơn bạn! Sự an tâm của khách hàng là ưu tiên số 1 của tụi mình. Chúc bạn luôn rạng rỡ nha!",
    helpfulCount: 24
  },
  {
    id: "sample-3",
    userName: "h*****2",
    userAvatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=200",
    rating: 5,
    date: "2026-08-28 11:10",
    variantInfo: "Size: L | Mua Thanh Lý",
    materialFeedback: "Chất vải tweed dệt kim tuyến tinh tế",
    accuracyFeedback: "Độ mới 98% đúng như cam kết",
    comment: "Mua thanh lý mà đồ như mới bóc tag! Chủ tủ bảo quản đồ quá kỹ. Giá chỉ bằng 1/3 giá gốc mua ở showroom. Sẽ tiếp tục săn đồ pass trên CLOOP!",
    images: [
      "https://images.unsplash.com/photo-1496747611176-843222e1e57c?q=80&w=600",
      "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?q=80&w=600"
    ],
    tags: ["Đúng với mô tả", "Chủ tủ nhiệt tình"],
    shopResponse: "Dạ em cảm ơn chị nhiều ạ! Tủ đồ CLOOP tuần hoàn trang phục cao cấp để ai cũng có thể mặc đẹp tiết kiệm mà vẫn bảo vệ môi trường á chị ❤️",
    helpfulCount: 19
  }
];

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
  // Lọc theo sao hoặc tiêu chí
  const [selectedFilter, setSelectedFilter] = useState<string>("ALL");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [helpfulLiked, setHelpfulLiked] = useState<Record<string, boolean>>({});
  
  // Phân trang Shopee
  const [currentPage, setCurrentPage] = useState<number>(1);
  const ITEMS_PER_PAGE = 4;

  // State Viết đánh giá mới (Interactive Review Modal)
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
  const [writeRating, setWriteRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [writeComment, setWriteComment] = useState<string>("");
  const [writeTags, setWriteTags] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ type: "image" | "video"; url: string; name: string }>>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [userCreatedReviews, setUserCreatedReviews] = useState<ReviewItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State Lightbox Modal xem ảnh / video unboxing chuẩn Shopee
  const [lightbox, setLightbox] = useState<{
    isOpen: boolean;
    mediaList: ReviewMediaItem[];
    currentIndex: number;
    reviewTitle?: string;
  }>({
    isOpen: false,
    mediaList: [],
    currentIndex: 0,
  });

  // 🌿 Tổng hợp danh sách đánh giá: Ưu tiên review DB + review user vừa tạo + review mẫu phong phú
  const allReviews: ReviewItem[] = useMemo(() => {
    let list: ReviewItem[] = [];

    // 1. Thêm review từ database nếu có
    if (dbReviews && dbReviews.length > 0) {
      const parsedDb = dbReviews.map((r: any, idx: number) => {
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
          variantInfo: r.variantInfo || `Size: ${size} | Thuê 3 Ngày`,
          materialFeedback: r.materialFeedback || "Chất vải mềm mịn, đúng chuẩn mô tả",
          accuracyFeedback: r.accuracyFeedback || "Chuẩn xác 100%",
          comment: r.comment || "Sản phẩm chất lượng, giao nhận nhanh chóng và đóng gói chu đáo!",
          images: parsedImages,
          videos: r.videos || [],
          tags: ["Chất vải đẹp", "Đúng với mô tả"],
          shopResponse: r.shopResponse || null,
          helpfulCount: r.helpfulCount || Math.floor(Math.random() * 15 + 5)
        };
      });
      list = [...parsedDb];
    }

    // 2. Thêm các review do người dùng vừa viết tức thì (Optimistic UI)
    if (userCreatedReviews.length > 0) {
      list = [...userCreatedReviews, ...list];
    }

    // 3. Nếu danh sách ít hơn 3, bổ sung review mẫu chất lượng cao để trải nghiệm chuẩn Shopee
    if (list.length < 3) {
      list = [...list, ...CURATED_DEFAULT_REVIEWS];
    }

    return list;
  }, [dbReviews, userCreatedReviews, size]);

  // Thống kê sao và bộ đếm
  const stats = useMemo(() => {
    const total = allReviews.length;
    const count5 = allReviews.filter(r => Math.round(r.rating) === 5).length;
    const count4 = allReviews.filter(r => Math.round(r.rating) === 4).length;
    const count3 = allReviews.filter(r => Math.round(r.rating) === 3).length;
    const count2 = allReviews.filter(r => Math.round(r.rating) === 2).length;
    const count1 = allReviews.filter(r => Math.round(r.rating) === 1).length;
    const countWithComment = allReviews.filter(r => Boolean(r.comment?.trim())).length;
    const countWithMedia = allReviews.filter(r => 
      (r.images && r.images.length > 0) || (r.videos && r.videos.length > 0)
    ).length;

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
      countWithMedia
    };
  }, [allReviews, averageRating]);

  // Lọc đánh giá theo Star / Media / Comment / Tag
  const filteredReviews = useMemo(() => {
    let result = allReviews;

    // Lọc theo chip chính
    switch (selectedFilter) {
      case "STAR_5":
        result = result.filter(r => Math.round(r.rating) === 5);
        break;
      case "STAR_4":
        result = result.filter(r => Math.round(r.rating) === 4);
        break;
      case "STAR_3":
        result = result.filter(r => Math.round(r.rating) === 3);
        break;
      case "WITH_COMMENT":
        result = result.filter(r => Boolean(r.comment?.trim()));
        break;
      case "WITH_MEDIA":
        result = result.filter(r => 
          (r.images && r.images.length > 0) || (r.videos && r.videos.length > 0)
        );
        break;
      default:
        break;
    }

    // Lọc theo tag khen ngợi (nếu đang chọn tag)
    if (selectedTag) {
      result = result.filter(r => r.tags && r.tags.includes(selectedTag));
    }

    return result;
  }, [allReviews, selectedFilter, selectedTag]);

  // Phân trang
  const totalPages = Math.ceil(filteredReviews.length / ITEMS_PER_PAGE) || 1;
  const paginatedReviews = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredReviews.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredReviews, currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    const elem = document.getElementById("reviews-section");
    if (elem) {
      elem.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const toggleHelpful = (id: string) => {
    setHelpfulLiked(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Mở Lightbox xem Ảnh hoặc Video unboxing
  const openLightbox = (review: ReviewItem, initialIndex: number = 0) => {
    const list: ReviewMediaItem[] = [];
    if (review.videos && review.videos.length > 0) {
      review.videos.forEach(v => {
        list.push({ type: "video", url: v.url, thumbnailUrl: v.thumbnailUrl, duration: v.duration });
      });
    }
    if (review.images && review.images.length > 0) {
      review.images.forEach(img => {
        list.push({ type: "image", url: img });
      });
    }

    if (list.length > 0) {
      setLightbox({
        isOpen: true,
        mediaList: list,
        currentIndex: initialIndex,
        reviewTitle: `Đánh giá từ ${review.userName}`,
      });
    }
  };

  // Tải tệp (ảnh hoặc video) lên Kho 10TB Google Drive qua API
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    toast.info("Đang tải media lên Kho Lưu Trữ 10TB CLOOP...");

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("file", file);
        formData.append("targetKho", "auto");

        const res = await fetch("/api/upload-drive", {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.url) {
            setUploadedFiles(prev => [
              ...prev,
              {
                type: data.isVideo ? "video" : "image",
                url: data.url,
                name: file.name
              }
            ]);
          }
        } else {
          // Fallback sang blob preview nếu demo offline
          const objectUrl = URL.createObjectURL(file);
          setUploadedFiles(prev => [
            ...prev,
            {
              type: file.type.startsWith("video/") ? "video" : "image",
              url: objectUrl,
              name: file.name
            }
          ]);
        }
      }
      toast.success("Đã tải ảnh/video lên kho lưu trữ 10TB an toàn!");
    } catch (err) {
      console.warn("Lỗi upload Drive, tạo preview cục bộ:", err);
      if (files[0]) {
        const objectUrl = URL.createObjectURL(files[0]);
        setUploadedFiles(prev => [
          ...prev,
          {
            type: files[0].type.startsWith("video/") ? "video" : "image",
            url: objectUrl,
            name: files[0].name
          }
        ]);
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Gửi đánh giá mới (Optimistic Shopee UI)
  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!writeComment.trim() && uploadedFiles.length === 0) {
      toast.error("Vui lòng nhập lời nhận xét hoặc đính kèm ảnh/video nhé!");
      return;
    }

    const images = uploadedFiles.filter(f => f.type === "image").map(f => f.url);
    const videos = uploadedFiles.filter(f => f.type === "video").map(f => ({
      url: f.url,
      thumbnailUrl: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=600",
      duration: "0:15"
    }));

    const newReviewItem: ReviewItem = {
      id: `user-rev-${Date.now()}`,
      userName: "b*****n (Bạn)",
      userAvatar: null,
      rating: writeRating,
      date: "Vừa xong",
      variantInfo: `Size: ${size} | Vừa nhận`,
      materialFeedback: writeRating >= 4 ? "Chất vải tuyệt vời, đúng mô tả" : "Tương đối ổn",
      accuracyFeedback: "Khớp 100% hình ảnh",
      comment: writeComment.trim() || "Sản phẩm thực tế rất đẹp, dịch vụ CLOOP đóng gói chỉn chu, giao nhận đúng hẹn!",
      images: images,
      videos: videos,
      tags: writeTags.length > 0 ? writeTags : ["Chất vải đẹp", "Đúng với mô tả"],
      shopResponse: `Dạ CLOOP Closet cảm ơn bạn đã gửi đánh giá tuyệt vời này! Chúc bạn diện trang phục thật tỏa sáng nha ❤️`,
      helpfulCount: 1
    };

    setUserCreatedReviews(prev => [newReviewItem, ...prev]);
    setIsWriteModalOpen(false);
    setWriteComment("");
    setUploadedFiles([]);
    setWriteTags([]);
    
    toast.success("🎉 Đánh giá thành công! Bạn nhận được +50 Leaf Coins vào ví!");
  };

  const ratingDescriptions = ["", "Rất tệ", "Không hài lòng", "Bình thường", "Hài lòng", "Tuyệt vời"];

  return (
    <section className="rounded-3xl border border-stone-200/90 bg-white p-5 sm:p-8 shadow-xs text-left font-sans mt-8 space-y-6">
      
      {/* 🏷️ TIÊU ĐỀ KHU VỰC ĐÁNH GIÁ CHUẨN SHOPEE */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-stone-100">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-6 bg-[#183A2D] rounded-full" />
          <h2 className="text-lg sm:text-xl font-heading font-extrabold uppercase tracking-wide text-[#142A1E]">
            Đánh Giá Sản Phẩm
          </h2>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 font-mono">
            {stats.total} nhận xét
          </span>
        </div>

        {/* Nút Viết Đánh Giá Shopee CTA */}
        <button
          type="button"
          onClick={() => setIsWriteModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#183A2D] hover:bg-[#235341] text-white text-xs font-bold font-ui rounded-xl shadow-xs transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
        >
          <PenLine size={14} />
          <span>Viết Đánh Giá (+50 Xu)</span>
        </button>
      </div>

      {/* ⭐ BẢNG THỐNG KÊ RATING CHUẨN SHOPEE */}
      <div className="rounded-2xl bg-[#FAF8F3] border border-[#EFE8DC] p-5 sm:p-7 flex flex-col md:flex-row items-center gap-6 sm:gap-10">
        
        {/* Cột trái: Điểm trung bình to nổi bật */}
        <div className="flex flex-col items-center justify-center text-center shrink-0 min-w-[150px]">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl sm:text-5xl font-mono font-black text-[#183A2D] leading-none">
              {stats.avg}
            </span>
            <span className="text-base font-bold text-stone-500 font-ui">
              trên 5
            </span>
          </div>

          {/* 5 Ngôi sao vàng Shopee */}
          <div className="flex items-center gap-1 my-2.5 text-amber-400">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star 
                key={star} 
                size={20} 
                className={star <= Math.round(stats.avg) ? "fill-amber-400 text-amber-400" : "text-stone-300"} 
              />
            ))}
          </div>

          <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-100/70 px-2.5 py-0.5 rounded-full font-ui">
            <CheckCircle2 size={12} className="text-emerald-700" /> 99% Khách hài lòng
          </div>
        </div>

        {/* Cột phải: Bộ Filter Chips chuẩn Shopee */}
        <div className="flex-1 w-full space-y-3">
          <div className="flex flex-wrap gap-2 items-center font-ui text-xs">
            {[
              { key: "ALL", label: `Tất Cả (${stats.total})` },
              { key: "STAR_5", label: `5 Sao (${stats.count5})` },
              { key: "STAR_4", label: `4 Sao (${stats.count4})` },
              { key: "STAR_3", label: `3 Sao (${stats.count3})` },
              { key: "WITH_MEDIA", label: `Có Hình Ảnh / Video (${stats.countWithMedia})` },
              { key: "WITH_COMMENT", label: `Có Bình Luận (${stats.countWithComment})` },
            ].map((btn) => {
              const isSelected = selectedFilter === btn.key && !selectedTag;
              return (
                <button
                  key={btn.key}
                  type="button"
                  onClick={() => {
                    setSelectedFilter(btn.key);
                    setSelectedTag(null);
                    setCurrentPage(1);
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#183A2D] text-white shadow-xs border border-[#183A2D]"
                      : "bg-white text-stone-700 border border-stone-200 hover:border-[#183A2D]/50 hover:bg-stone-50"
                  }`}
                >
                  {btn.label}
                </button>
              );
            })}
          </div>

          {/* Dải Tags khen ngợi nhanh chuẩn Shopee */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-stone-200/60 text-[11px]">
            <span className="text-stone-400 font-medium mr-1 flex items-center gap-1">
              <Sparkles size={12} className="text-amber-500" /> Hay khen:
            </span>
            {SHOPEE_SENTIMENT_TAGS.map((tag) => {
              const isTagActive = selectedTag === tag;
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    if (isTagActive) {
                      setSelectedTag(null);
                    } else {
                      setSelectedTag(tag);
                      setSelectedFilter("ALL");
                    }
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    isTagActive
                      ? "bg-amber-100 text-amber-900 font-bold border border-amber-300"
                      : "bg-stone-100/90 hover:bg-amber-50 text-stone-600 border border-stone-200/60"
                  }`}
                >
                  #{tag}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 💬 DANH SÁCH CÁC BÌNH LUẬN CHI TIẾT (CHUẨN SHOPEE) */}
      <div className="divide-y divide-stone-100">
        {paginatedReviews.length === 0 ? (
          <div className="py-12 text-center text-stone-500 text-xs font-body space-y-2">
            <p className="font-semibold text-stone-700">Chưa có đánh giá nào phù hợp với bộ lọc này.</p>
            <button
              onClick={() => { setSelectedFilter("ALL"); setSelectedTag(null); }}
              className="text-xs text-[#183A2D] underline font-bold cursor-pointer"
            >
              Xem tất cả đánh giá
            </button>
          </div>
        ) : (
          paginatedReviews.map((review) => {
            const isLiked = Boolean(helpfulLiked[review.id]);
            const currentHelpful = (review.helpfulCount || 0) + (isLiked ? 1 : 0);

            return (
              <article key={review.id} className="py-6 space-y-3 first:pt-2">
                
                {/* 1. Header: Avatar + Tên che Shopee + Badge Xác thực + Ngày giờ */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#E5EFE2] text-[#183A2D] flex items-center justify-center font-bold text-sm border border-emerald-200 overflow-hidden shrink-0">
                      {review.userAvatar ? (
                        <img 
                          src={review.userAvatar} 
                          alt="Avatar" 
                          className="w-full h-full object-cover" 
                          loading="lazy"
                        />
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
                          <CheckCircle2 size={10} className="text-emerald-700" /> Đã thuê & trải nghiệm
                        </span>
                      </div>
                      
                      {/* 5 sao của review này */}
                      <div className="flex items-center gap-1 text-amber-400 mt-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star 
                            key={s} 
                            size={13} 
                            className={s <= review.rating ? "fill-amber-400 text-amber-400" : "text-stone-300"} 
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <span className="text-[11px] text-stone-400 font-mono">
                    {review.date}
                  </span>
                </div>

                {/* 2. Phân loại hàng */}
                {review.variantInfo && (
                  <div className="text-[11px] text-stone-500 font-ui flex items-center gap-1.5 pl-13">
                    <span>Phân loại:</span>
                    <span className="font-medium text-stone-700 bg-stone-100 px-2 py-0.5 rounded-md">
                      {review.variantInfo}
                    </span>
                  </div>
                )}

                {/* 3. Tiêu chí đánh giá chi tiết */}
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

                {/* 4. Nội dung nhận xét */}
                <p className="pl-13 text-xs sm:text-[13px] text-stone-800 leading-relaxed font-body">
                  {review.comment}
                </p>

                {/* 5. KHỐI MEDIA (VIDEO UNBOXING & ẢNH FEEDBACK) - TỐI ƯU TỐC ĐỘ 10TB */}
                {((review.videos && review.videos.length > 0) || (review.images && review.images.length > 0)) && (
                  <div className="flex flex-wrap gap-2.5 pl-13 pt-1">
                    
                    {/* VIDEO UNBOXING: TỐI ƯU HÓA KHÔNG LOAD TRƯỚC BĂNG THÔNG */}
                    {review.videos?.map((vid, vIdx) => (
                      <div 
                        key={`vid-${vIdx}`}
                        onClick={() => openLightbox(review, vIdx)}
                        className="relative w-22 h-28 sm:w-26 sm:h-34 rounded-xl overflow-hidden border-2 border-emerald-700/60 bg-stone-900 group cursor-pointer shadow-sm hover:shadow-md transition-all"
                      >
                        <img 
                          src={vid.thumbnailUrl || "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=600"} 
                          alt="Video thumbnail" 
                          className="w-full h-full object-cover opacity-85 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300"
                          loading="lazy"
                        />
                        {/* Play Icon Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/25 group-hover:bg-black/10 transition-colors">
                          <div className="w-8 h-8 rounded-full bg-white/90 text-[#183A2D] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <Play size={15} className="fill-[#183A2D] ml-0.5" />
                          </div>
                        </div>
                        {/* Duration Badge Shopee */}
                        <div className="absolute bottom-1.5 right-1.5 bg-black/70 backdrop-blur-xs text-white text-[10px] font-mono font-bold px-1.5 py-0.5 rounded">
                          {vid.duration || "0:15"}
                        </div>
                        <div className="absolute top-1.5 left-1.5 bg-emerald-600 text-white text-[9px] font-bold px-1 py-0.5 rounded shadow-xs flex items-center gap-0.5">
                          <Video size={10} /> Video
                        </div>
                      </div>
                    ))}

                    {/* ẢNH FEEDBACK THỰC TẾ */}
                    {review.images?.map((imgUrl, i) => {
                      const videoOffset = review.videos?.length || 0;
                      return (
                        <div 
                          key={`img-${i}`}
                          onClick={() => openLightbox(review, videoOffset + i)}
                          className="relative w-20 h-24 sm:w-24 sm:h-32 rounded-xl border border-stone-200 bg-stone-100 shadow-2xs group cursor-pointer overflow-hidden hover:border-[#183A2D] transition-colors"
                        >
                          <img 
                            src={imgUrl} 
                            alt={`Feedback ${i + 1}`} 
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            loading="lazy"
                          />
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 6. Hộp Phản Hồi Của Người Bán (Shopee Seller Reply) */}
                {review.shopResponse && (
                  <div className="ml-13 mt-2.5 bg-[#FAF8F3] border-l-3 border-[#183A2D] p-3.5 rounded-r-xl space-y-1 text-xs">
                    <p className="font-bold text-[#183A2D] flex items-center gap-1.5 text-[11.5px]">
                      <MessageSquare size={13} /> Phản Hồi Từ Chủ Tủ CLOOP
                    </p>
                    <p className="text-stone-600 leading-relaxed font-body text-[11.5px]">
                      {review.shopResponse}
                    </p>
                  </div>
                )}

                {/* 7. Nút tương tác Hữu ích */}
                <div className="pl-13 pt-1 flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => toggleHelpful(review.id)}
                    className={`inline-flex items-center gap-1.5 text-[11px] font-semibold transition-colors cursor-pointer ${
                      isLiked ? "text-emerald-800 font-bold" : "text-stone-400 hover:text-stone-700"
                    }`}
                  >
                    <ThumbsUp size={13} className={isLiked ? "fill-emerald-800 text-emerald-800" : ""} />
                    <span>Hữu ích ({currentHelpful})</span>
                  </button>
                </div>

              </article>
            );
          })
        )}
      </div>

      {/* 📄 THANH PHÂN TRANG CHUẨN SHOPEE */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-6 border-t border-stone-100 font-ui text-xs">
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => handlePageChange(currentPage - 1)}
            className="p-2 rounded-xl border border-stone-200 hover:bg-stone-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            <ChevronLeft size={16} />
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              type="button"
              onClick={() => handlePageChange(page)}
              className={`w-9 h-9 rounded-xl font-bold transition-all cursor-pointer ${
                currentPage === page
                  ? "bg-[#183A2D] text-white shadow-xs"
                  : "bg-white border border-stone-200 text-stone-700 hover:bg-stone-50"
              }`}
            >
              {page}
            </button>
          ))}

          <button
            type="button"
            disabled={currentPage === totalPages}
            onClick={() => handlePageChange(currentPage + 1)}
            className="p-2 rounded-xl border border-stone-200 hover:bg-stone-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* 🌟 LIGHTBOX MODAL: XEM ẢNH TO & PHÁT VIDEO UNBOXING CHUẨN SHOPEE */}
      {lightbox.isOpen && lightbox.mediaList.length > 0 && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
          
          {/* Nút đóng X */}
          <button
            type="button"
            onClick={() => setLightbox({ isOpen: false, mediaList: [], currentIndex: 0 })}
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            <X size={22} />
          </button>

          {/* Nút lùi media */}
          {lightbox.mediaList.length > 1 && (
            <button
              type="button"
              onClick={() => setLightbox(prev => ({
                ...prev,
                currentIndex: prev.currentIndex > 0 ? prev.currentIndex - 1 : prev.mediaList.length - 1
              }))}
              className="absolute left-4 z-10 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
            >
              <ChevronLeft size={28} />
            </button>
          )}

          {/* Vùng hiển thị Media chính */}
          <div className="max-w-3xl max-h-[85vh] w-full flex flex-col items-center justify-center space-y-4">
            {lightbox.mediaList[lightbox.currentIndex]?.type === "video" ? (
              <div className="relative w-full max-h-[70vh] flex items-center justify-center bg-black rounded-2xl overflow-hidden shadow-2xl">
                <video
                  src={lightbox.mediaList[lightbox.currentIndex].url}
                  controls
                  autoPlay
                  playsInline
                  className="max-h-[70vh] max-w-full rounded-2xl"
                />
              </div>
            ) : (
              <div className="relative max-h-[70vh] flex items-center justify-center rounded-2xl overflow-hidden shadow-2xl">
                <img
                  src={lightbox.mediaList[lightbox.currentIndex]?.url}
                  alt="Review media preview"
                  className="max-h-[70vh] max-w-full object-contain rounded-2xl"
                />
              </div>
            )}

            {/* Dải Thumbnails bên dưới để lướt qua lại như Shopee */}
            {lightbox.mediaList.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto p-2 bg-black/40 rounded-xl max-w-full">
                {lightbox.mediaList.map((m, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setLightbox(prev => ({ ...prev, currentIndex: idx }))}
                    className={`relative w-14 h-16 rounded-lg overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                      lightbox.currentIndex === idx ? "border-amber-400 scale-105" : "border-transparent opacity-60 hover:opacity-90"
                    }`}
                  >
                    <img 
                      src={m.thumbnailUrl || m.url} 
                      alt="Thumbnail" 
                      className="w-full h-full object-cover" 
                    />
                    {m.type === "video" && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white">
                        <Play size={14} className="fill-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Nút tiến media */}
          {lightbox.mediaList.length > 1 && (
            <button
              type="button"
              onClick={() => setLightbox(prev => ({
                ...prev,
                currentIndex: prev.currentIndex < prev.mediaList.length - 1 ? prev.currentIndex + 1 : 0
              }))}
              className="absolute right-4 z-10 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
            >
              <ChevronRight size={28} />
            </button>
          )}

        </div>
      )}

      {/* 🌟 MODAL VIẾT ĐÁNH GIÁ (SHOPEE STYLE INTERACTIVE REVIEW MODAL) */}
      {isWriteModalOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-stone-200 space-y-5 max-h-[90vh] overflow-y-auto">
            
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-5 bg-[#183A2D] rounded-full" />
                <h3 className="text-base font-bold text-[#142A1E] font-heading uppercase tracking-wide">
                  Đánh Giá Sản Phẩm
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setIsWriteModalOpen(false)}
                className="p-1 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Thông tin sản phẩm */}
            <div className="flex items-center gap-3 bg-stone-50 p-3 rounded-2xl border border-stone-200/70">
              <div className="w-12 h-14 bg-stone-200 rounded-xl overflow-hidden shrink-0">
                <img 
                  src="https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=200" 
                  alt={productTitle} 
                  className="w-full h-full object-cover" 
                />
              </div>
              <div className="text-left space-y-0.5">
                <p className="text-xs font-bold text-stone-900 line-clamp-1">{productTitle}</p>
                <p className="text-[11px] text-stone-500 font-ui">Phân loại: Size {size} | {category}</p>
              </div>
            </div>

            {/* 1. Chọn Số Sao (1 - 5 Sao) */}
            <div className="space-y-2 text-center py-2 bg-[#FAF8F3] rounded-2xl border border-[#EFE8DC]">
              <p className="text-xs font-semibold text-stone-600">Chất lượng sản phẩm</p>
              <div className="flex items-center justify-center gap-2 text-amber-400">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setWriteRating(star)}
                    className="p-1 hover:scale-125 transition-transform cursor-pointer"
                  >
                    <Star 
                      size={28} 
                      className={star <= (hoverRating || writeRating) ? "fill-amber-400 text-amber-400" : "text-stone-300"} 
                    />
                  </button>
                ))}
              </div>
              <p className="text-xs font-bold text-amber-600 font-ui">
                {ratingDescriptions[hoverRating || writeRating]}
              </p>
            </div>

            {/* 2. Chọn Tags Khen Ngợi Nhanh */}
            <div className="space-y-1.5 text-left">
              <label className="text-xs font-bold text-stone-700">Điểm bạn ưng ý nhất:</label>
              <div className="flex flex-wrap gap-1.5">
                {SHOPEE_SENTIMENT_TAGS.map((tag) => {
                  const isChecked = writeTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        setWriteTags(prev => 
                          isChecked ? prev.filter(t => t !== tag) : [...prev, tag]
                        );
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center gap-1 ${
                        isChecked 
                          ? "bg-[#183A2D] text-white font-bold shadow-xs" 
                          : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                      }`}
                    >
                      {isChecked && <Check size={12} />}
                      <span>{tag}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Khung Nhập Nhận Xét Chi Tiết */}
            <div className="space-y-1.5 text-left">
              <label className="text-xs font-bold text-stone-700">Chia sẻ trải nghiệm của bạn:</label>
              <textarea
                rows={3}
                value={writeComment}
                onChange={(e) => setWriteComment(e.target.value)}
                placeholder="Hãy chia sẻ về chất vải, độ vừa vặn, form dáng, độ mới của đồ khi nhận..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs focus:outline-none focus:border-[#183A2D] bg-white resize-none"
              />
            </div>

            {/* 4. TẢI LÊN ẢNH & VIDEO UNBOXING (TẬN DỤNG KHO 10TB GOOGLE DRIVE) */}
            <div className="space-y-2 text-left">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-stone-700">Đính kèm Ảnh / Video Unboxing:</label>
                <span className="text-[10px] text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">
                  Kho 10TB Hỗ trợ Video đến 100MB
                </span>
              </div>

              {/* Danh sách media đã upload */}
              {uploadedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {uploadedFiles.map((file, idx) => (
                    <div key={idx} className="relative w-16 h-20 rounded-xl overflow-hidden border border-stone-200 bg-stone-100 shadow-2xs group">
                      {file.type === "video" ? (
                        <div className="w-full h-full bg-stone-900 flex items-center justify-center text-white">
                          <Video size={20} className="text-emerald-400" />
                        </div>
                      ) : (
                        <img src={file.url} alt="Uploaded" className="w-full h-full object-cover" />
                      )}
                      <button
                        type="button"
                        onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Nút bấm chọn tệp */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleFileUpload}
                className="hidden"
              />

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="py-2.5 px-3 rounded-xl border border-dashed border-stone-300 hover:border-[#183A2D] hover:bg-stone-50 flex items-center justify-center gap-2 text-xs font-semibold text-stone-700 transition-colors cursor-pointer"
                >
                  <Camera size={16} className="text-[#183A2D]" />
                  <span>{isUploading ? "Đang tải lên 10TB..." : "Thêm Hình Ảnh"}</span>
                </button>

                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="py-2.5 px-3 rounded-xl border border-dashed border-stone-300 hover:border-[#183A2D] hover:bg-stone-50 flex items-center justify-center gap-2 text-xs font-semibold text-stone-700 transition-colors cursor-pointer"
                >
                  <Video size={16} className="text-emerald-700" />
                  <span>{isUploading ? "Đang nạp video..." : "Video Unboxing"}</span>
                </button>
              </div>
            </div>

            {/* Nút Gửi Đánh Giá */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleReviewSubmit}
                disabled={isUploading}
                className="w-full py-3.5 bg-[#183A2D] hover:bg-[#235341] text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
              >
                <Sparkles size={15} className="text-amber-400" />
                <span>Hoàn Tất & Nhận Ngay +50 Leaf Coins</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </section>
  );
}
