"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Plus, ShieldCheck, CheckCircle2, AlertTriangle, PackageCheck, Shirt, History, Leaf, Droplet, Sparkles, X, Star, ShoppingBag, Eye, EyeOff, ArrowRight } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { purchaseBoostPackage } from "@/app/actions/boost";
import { DashboardCharts } from "./DashboardCharts";

const PLACEHOLDER_IMG = "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=120";

export default function MyClosetPage() {
  const [activeTab, setActiveTab] = useState<"ITEMS" | "ESCROW" | "RENTED">("ITEMS");
  const [closetItems, setClosetItems] = useState<any[]>([]);
  const [escrowOrders, setEscrowOrders] = useState<any[]>([]);
  const [rentedOrders, setRentedOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // States quản lý Modal Đánh giá và nhập liệu sao tín nhiệm
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedOrderForReview, setSelectedOrderForReview] = useState<any>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [isReviewSubmitting, setIsReviewSubmitting] = useState(false);

  // State quản lý Boost Modal
  const [showBoostModal, setShowBoostModal] = useState(false);
  const [selectedProductForBoost, setSelectedProductForBoost] = useState<any>(null);
  const [isBoosting, setIsBoosting] = useState(false);

  // State quản lý các chỉ số tác động xanh sinh thái (ESG Index Dashboard)
  const [ecoStats, setEcoStats] = useState({ co2Saved: 0, waterSaved: 0, greenPoints: 0 });
  const [cloopCoins, setCloopCoins] = useState(0);

  const today = new Date().toISOString().slice(0, 10);

  // 📡 QUÉT DỮ LIỆU ĐỒNG BỘ ĐỘNG TOÀN DIỆN: ĐẤU NỐI ĐỐI SOÁT ĐỘC LẬP SHOP VÀ BLOG
  async function fetchRealClosetData() {
    try {
      setLoading(true);

      let finalUserId = null;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) finalUserId = session.user.id;
      } catch (e) {}

      if (!finalUserId) {
        setClosetItems([]);
        setEscrowOrders([]);
        setRentedOrders([]);
        setCloopCoins(0);
        return;
      }

      // Lấy số dư CLOOP Coins
      const { data: userData } = await supabase.from("User").select("cloopCoins").eq("id", finalUserId).single();
      if (userData && userData.cloopCoins !== undefined) {
        setCloopCoins(userData.cloopCoins);
      }

      // 1. Lấy toàn bộ danh sách sản phẩm do mình đăng tải
      const { data: productsData, error: pError } = await supabase
        .from("products")
        .select("*")
        .eq("userId", finalUserId)
        .order("id", { ascending: false });

      if (pError) throw pError;

      // 2. Lấy toàn bộ dữ liệu Listing, Lịch sử thuê, Đánh giá và cả bảng BlogPost để bóc trạng thái lẻ
      const { data: listingsData } = await supabase.from("Listing").select("*");
      const { data: rentalHistoryData } = await supabase.from("rental_history").select("*").order("id", { ascending: false });
      const { data: reviewsData } = await supabase.from("Review").select("*");
      
      // 🟢 TIẾN TRÌNH ĐỐI SOÁT CHÉO: Gọi chính xác trường khóa ngoại productId viết hoa từ Supabase
      const { data: blogPostsData } = await supabase.from("BlogPost").select("id, productId, title, status");

      // 3. PHÂN HỆ LUỒNG A: Đơn hàng khách thuê đồ của mình (Chủ đồ)
      const formattedEscrowOrders = (rentalHistoryData || [])
        .map((order: any) => {
          const matchedProduct = (productsData || []).find(
            (p: any) => String(p.id) === String(order.product_id)
          );

          const renterReviews = (reviewsData || []).filter(
            (r: any) => r.revieweeId === order.renterId && r.type === "OWNER_TO_RENTER"
          );
          const renterAvg = renterReviews.length > 0
            ? (renterReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / renterReviews.length).toFixed(1)
            : "5.0";

          return {
            ...order,
            renterAvg,
            renterReviewCount: renterReviews.length,
            products: matchedProduct ? { title: matchedProduct.title, image_url: matchedProduct.image_url || matchedProduct.imageUrl } : null
          };
        })
        .filter((order: any) => order.products !== null);
      
      setEscrowOrders(formattedEscrowOrders);

      // 4. PHÂN HỆ LUỒNG B: Đơn hàng mình đi thuê từ người khác (Khách thuê)
      const myRentedHistory = (rentalHistoryData || []).filter(
        (order: any) => String(order.renterId) === String(finalUserId)
      );

      let rentedProductsData: any[] = [];
      if (myRentedHistory.length > 0) {
        const productIds = myRentedHistory.map((o: any) => o.product_id);
        const { data: rpData } = await supabase.from("products").select("*").in("id", productIds);
        if (rpData) rentedProductsData = rpData;
      }

      const formattedRentedOrders = myRentedHistory.map((order: any) => {
        const matchedProduct = rentedProductsData.find((p: any) => String(p.id) === String(order.product_id));
        
        const ownerId = matchedProduct?.userId || "";
        const ownerReviews = (reviewsData || []).filter(
          (r: any) => r.revieweeId === ownerId && r.type === "RENTER_TO_OWNER"
        );
        const ownerAvg = ownerReviews.length > 0
          ? (ownerReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / ownerReviews.length).toFixed(1)
          : "5.0";

        return {
          ...order,
          ownerId,
          ownerAvg,
          ownerReviewCount: ownerReviews.length,
          products: matchedProduct ? { title: matchedProduct.title, image_url: matchedProduct.image_url || matchedProduct.imageUrl } : { title: "Trang phục CLOOP Market", image_url: PLACEHOLDER_IMG }
        };
      });

      setRentedOrders(formattedRentedOrders);

      // 5. HIỂN THỊ ESG DASHBOARD & ĐỔI SOÁT TRẠNG THÁI LÈ TỪNG KÊNH
      if (!productsData || productsData.length === 0) {
        setClosetItems([]);
        setEcoStats({ co2Saved: 0, waterSaved: 0, greenPoints: 0 });
        return;
      }

      const totalItems = productsData.length;
      setEcoStats({
        co2Saved: totalItems * 25,
        waterSaved: totalItems * 1500,
        greenPoints: totalItems * 100
      });

      const formattedItems = productsData.map((item: any) => {
        let currentImage = item.image_url || item.imageUrl || item.image || PLACEHOLDER_IMG;

        const productListings = (listingsData || []).filter((lst: any) => String(lst.productId) === String(item.id));
        const rentalListing = productListings.find((l: any) => l.listingType === "RENT");
        const saleListing = productListings.find((l: any) => l.listingType === "SELL" || l.listingType === "SALE");

        const rentPrice = rentalListing ? Number(rentalListing.basePrice) : item.rental_price || 0;
        const sellPrice = saleListing ? Number(saleListing.basePrice) : item.sale_price || 0;

        const listingIds = [rentalListing?.id, saleListing?.id].filter(Boolean);
        const isShopHidden = productListings.length > 0 && productListings.every((l: any) => l.status === "HIDDEN");

        // 🟢 ĐÃ SỬA: Đồng bộ so khớp chính xác theo b.productId viết hoa chữ I
        const matchedBlog = (blogPostsData || []).find((b: any) => String(b.productId) === String(item.id));
        const hasBlog = !!matchedBlog;
        const blogTitle = matchedBlog ? matchedBlog.title : "Chưa cấu hình câu chuyện";
        const isBlogHidden = matchedBlog ? matchedBlog.status === "HIDDEN" : false;

        const productRentals = (rentalHistoryData || []).filter(
          (r: any) => String(r.product_id) === String(item.id)
        );
        const activeRentals = productRentals.filter((r: any) => r.status === "active" || r.status === "returning");

        return {
          id: item.id,
          name: item.title || item.name || "Trang phục CLOOP",
          size: item.size || "M",
          image: currentImage,
          isRentalActive: rentPrice > 0,
          rentalPrice: rentPrice,
          activeRentals,
          isCurrentlyRenting: activeRentals.length > 0,
          isSaleActive: sellPrice > 0,
          salePrice: sellPrice,
          listingIds,
          isShopHidden,
          hasBlog,
          blogTitle,
          isBlogHidden
        };
      });

      setClosetItems(formattedItems);
    } catch (err) {
      console.warn("Lỗi tải dữ liệu tủ đồ thực tế:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRealClosetData();

    // SAFETY NET: Ép tắt loading sau 8 giây
    const timeout = setTimeout(() => setLoading(false), 8000);
    return () => clearTimeout(timeout);
  }, []);

  const handleUpdateEscrowStatus = async (orderId: string, newStatus: "completed" | "disputed") => {
    try {
      const { error } = await supabase
        .from("rental_history")
        .update({ status: newStatus })
        .eq("id", orderId);
      
      if (error) throw error;
      alert(newStatus === "completed" ? "🎉 CLOOP đã giải ngân tiền thuê về tài khoản cậu và hoàn cọc cho khách!" : "🛑 Đã ghi nhận tranh chấp. CLOOP đã phong tỏa khoản cọc để xử lý tổn thất.");
      await fetchRealClosetData();
    } catch (err: any) {
      alert(`Lỗi xử lý luồng tiền: ${err.message}`);
    }
  };

  const handleSubmitReview = async () => {
    if (!selectedOrderForReview) return;
    setIsReviewSubmitting(true);
    try {
    const { data: { session } } = await supabase.auth.getSession();
    let currentUserId = session?.user?.id;
      if (!currentUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) currentUserId = user.id;
      }

      if (!currentUserId) { alert("Vui lòng đăng nhập để thực hiện."); return; }

      const isRenterToOwnerLuong = String(selectedOrderForReview.renterId) === String(currentUserId);
      const finalRevieweeId = isRenterToOwnerLuong ? selectedOrderForReview.ownerId : selectedOrderForReview.renterId;
      const finalType = isRenterToOwnerLuong ? "RENTER_TO_OWNER" : "OWNER_TO_RENTER";
      const updateField = isRenterToOwnerLuong ? { renterRatedAt: new Date().toISOString() } : { ownerRatedAt: new Date().toISOString() };

      const { error: reviewError } = await supabase.from("Review").insert([{
        rentalHistoryId: selectedOrderForReview.id,
        reviewerId: currentUserId,
        revieweeId: finalRevieweeId || "",
        rating: rating,
        type: finalType,
        comment: comment
      }]);

      if (reviewError) throw reviewError;

      const { error: historyError } = await supabase
        .from("rental_history")
        .update(updateField)
        .eq("id", selectedOrderForReview.id);

      if (historyError) throw historyError;

      alert("🎉 Ghi nhận phản hồi thành công! Hệ thống cộng thưởng +10 Green Points vào tài khoản tủ đồ của cậu nhé.");
      setShowReviewModal(false);
      await fetchRealClosetData();
    } catch (err: any) {
      alert(`Trục trặc luồng đẩy dữ liệu: ${err.message}`);
    } finally {
      setIsReviewSubmitting(false);
    }
  };

  // 🛍️ LUỒNG 1: Ẩn/Hiện độc lập dành riêng cho cổng Shop (Bảng Listing)
  const handleToggleShopVisibility = async (listingIds: string[], currentlyHidden: boolean) => {
    if (listingIds.length === 0) {
      alert("Sản phẩm này chưa cấu hình giá niêm yết trên Shop, không thể ẩn.");
      return;
    }
    const newStatus = currentlyHidden ? "AVAILABLE" : "HIDDEN";
    try {
      const { error } = await supabase.from("Listing").update({ status: newStatus }).in("id", listingIds);
      if (error) throw error;
      alert(currentlyHidden ? "🎉 Đã hiện sản phẩm lại trên kệ Shop của bạn nhé!" : "🛑 Đã ẩn sản phẩm khỏi kệ Shop thành công nhé!");
      await fetchRealClosetData();
    } catch (err: any) {
      alert(`Lỗi xử lý cổng Shop: ${err.message}`);
    }
  };

  // ✍️ LUỒNG 2: ĐÃ SỬA CHUẨN: Điều hướng chính xác trường productId để ẩn/hiện ăn ngay lập tức không dính độ trễ
  const handleToggleBlogVisibility = async (productId: string, currentlyHidden: boolean) => {
    const newStatus = currentlyHidden ? "PUBLIC" : "HIDDEN";
    try {
      const { error } = await supabase
        .from("BlogPost")
        .update({ status: newStatus })
        .eq("productId", productId); // 🔐 Khóa cứng điều kiện trường productId hoa chữ I
      
      if (error) throw error;
      alert(currentlyHidden ? "🎉 Đã đẩy câu chuyện Lookbook hiển thị lại công khai trên Blog nhé!" : "🛑 Đã ẩn câu chuyện khỏi luồng bài viết công khai thành công nhé!");
      await fetchRealClosetData();
    } catch (err: any) {
      alert(`Lỗi xử lý cổng Blog: ${err.message}`);
    }
  };

  const pendingNotificationCount = escrowOrders.filter(o => o.status === "active" || o.status === "returning").length;

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-[#FAF9F5] space-y-3">
        <div className="w-5 h-5 border border-emerald-800/40 border-t-emerald-900 rounded-full animate-spin" />
        <p className="text-[10px] font-medium text-emerald-900 uppercase tracking-widest">Đang đối soát dữ liệu...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F5] py-10 px-4 sm:px-8 text-stone-800 antialiased selection:bg-[#183A2D] selection:text-white">
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@300;400;500;600;700;800&display=swap" />
      <style>{`body, h1, h2, h3, h4, table, th, td, button, span, p, label, input { font-family: 'Be Vietnam Pro', sans-serif !important; }`}</style>

      <div className="max-w-5xl mx-auto space-y-6">
        
        <div className="flex flex-col sm:flex-row justify-between sm:items-end border-b border-stone-200/60 pb-6 gap-4">
          <div className="text-left space-y-2">
            <h1 className="text-xl font-bold tracking-tight text-[#183A2D]">Mục quản lý tủ đồ</h1>
            <p className="text-stone-400 text-xs font-medium tracking-wide">Hệ thống phân luồng ký quỹ và theo dõi trạng thái tài sản thực tế.</p>
          </div>
          <Link href="/my-closet/create" className="inline-flex items-center gap-1.5 bg-[#183A2D] hover:bg-[#224430] text-white text-xs font-medium px-4 py-2.5 rounded-xl transition-all shadow-sm shrink-0">
            <Plus size={14} /> Thêm đồ mới
          </Link>
        </div>

        {/* GREEN IMPACT ESG DASHBOARD & COIN BALANCE */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
          <div className="bg-white border border-stone-200/50 p-5 rounded-2xl shadow-sm flex items-center gap-4 text-left">
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-800 flex items-center justify-center border border-emerald-100 shrink-0">
              <Leaf size={18} />
            </div>
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Giảm CO₂ tích lũy</div>
              <div className="text-2xl font-mono font-black text-stone-900">{ecoStats.co2Saved.toLocaleString()} kg</div>
              <p className="text-[11px] text-emerald-700 font-medium">Bảo vệ bầu không khí sạch</p>
            </div>
          </div>

          <div className="bg-white border border-stone-200/50 p-5 rounded-2xl shadow-sm flex items-center gap-4 text-left">
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-800 flex items-center justify-center border border-blue-100 shrink-0">
              <Droplet size={18} />
            </div>
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tiết kiệm nước</div>
              <div className="text-2xl font-mono font-black text-stone-900">{ecoStats.waterSaved.toLocaleString()} Lít</div>
              <p className="text-[11px] text-blue-700 font-medium">Tối ưu tài nguyên bản địa</p>
            </div>
          </div>

          <div className="bg-white border border-stone-200/50 p-5 rounded-2xl shadow-sm flex items-center gap-4 text-left">
            <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-800 flex items-center justify-center border border-amber-100 shrink-0">
              <Sparkles size={18} />
            </div>
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Điểm Green Pts</div>
              <div className="text-2xl font-mono font-black text-[#183A2D]">{ecoStats.greenPoints.toLocaleString()} Pts</div>
              <p className="text-[11px] text-amber-700 font-medium">Định danh người dùng xanh</p>
            </div>
          </div>

          {/* NÂNG CẤP: Box tài khoản Xu Lá CLOOP */}
          <div className="bg-white border border-stone-200/50 p-5 rounded-2xl shadow-sm flex items-center gap-4 text-left relative overflow-hidden group cursor-pointer hover:border-[#183A2D]/30 transition-colors">
            <div className="absolute -right-6 -bottom-6 w-24 h-24 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
              <img src="/images/cloop-coin-tilt.png" alt="Coin bg" className="w-full h-full object-contain mix-blend-multiply" />
            </div>
            <div className="w-10 h-10 rounded-full bg-stone-50 flex items-center justify-center border border-stone-100 shrink-0 p-1.5 relative z-10">
              <img src="/images/cloop-coin-front.png" alt="Lá CLOOP" className="w-full h-full object-contain drop-shadow-sm mix-blend-multiply" />
            </div>
            <div className="space-y-0.5 relative z-10">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tài khoản Lá CLOOP</div>
              <div className="text-2xl font-mono font-black text-[#183A2D]">{cloopCoins.toLocaleString()} <span className="text-xs font-bold">Lá</span></div>
              <p className="text-[11px] text-[#183A2D] font-medium">Sẵn sàng quảng cáo tủ đồ</p>
            </div>
            <button className="absolute bottom-4 right-4 bg-[#183A2D] text-white text-[9px] font-bold px-3 py-1.5 rounded-lg hover:bg-black transition-colors z-20 shadow-sm"
              onClick={(e) => { e.stopPropagation(); alert("Chức năng kết nối cổng thanh toán PayOS (VNĐ) đang được bảo trì!"); }}>
              Nạp Thêm
            </button>
          </div>
        </div>

        {pendingNotificationCount > 0 && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-amber-50/80 border border-amber-200/60 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-left">
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wide flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" /> 🔔 THÔNG BÁO HỆ THỐNG CLOOP
              </h4>
              <p className="text-xs text-amber-800 font-medium leading-relaxed">
                Tủ đồ của cậu vừa ghi nhận <strong className="font-extrabold text-amber-950">{pendingNotificationCount} yêu cầu giao dịch mới</strong> đang được CLOOP tạm giữ tiền bảo chứng an toàn. Hãy kiểm tra ngay nhé!
              </p>
            </div>
            <button 
              onClick={() => setActiveTab("ESCROW")}
              className="px-3.5 py-2 bg-amber-800 hover:bg-amber-900 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all shadow-sm shrink-0 w-full sm:w-auto text-center"
            >
              Kiểm tra ngay
            </button>
          </motion.div>
        )}

        <DashboardCharts />

        {/* CẤU TRÚC 3 TAB QUẢN LÝ MASTER (DATAGRID SAAS) */}
        <div className="bg-white rounded-2xl border border-stone-200/60 shadow-sm overflow-hidden flex flex-col mt-4">
          <div className="flex border-b border-stone-100 w-full px-2 pt-2 overflow-x-auto no-scrollbar bg-stone-50/50">
            <button 
              onClick={() => setActiveTab("ITEMS")} 
              className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${activeTab === "ITEMS" ? "border-transparent text-[#183A2D] border-b-2 !border-[#183A2D] bg-white rounded-t-lg" : "border-transparent text-stone-400 hover:text-stone-700"}`}
            >
              <Shirt size={16} /> Kho sản phẩm
              <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[10px] ${activeTab === "ITEMS" ? "bg-[#183A2D]/10 text-[#183A2D]" : "bg-stone-100"}`}>{closetItems.length}</span>
            </button>
            <button 
              onClick={() => setActiveTab("ESCROW")} 
              className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${activeTab === "ESCROW" ? "border-transparent text-amber-800 border-b-2 !border-amber-800 bg-white rounded-t-lg" : "border-transparent text-stone-400 hover:text-stone-700"}`}
            >
              <History size={16} /> Yêu cầu ký quỹ
              <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[10px] ${activeTab === "ESCROW" ? "bg-amber-100 text-amber-800" : "bg-stone-100"}`}>{escrowOrders.length}</span>
            </button>
            <button 
              onClick={() => setActiveTab("RENTED")} 
              className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${activeTab === "RENTED" ? "border-transparent text-[#0ea5e9] border-b-2 !border-[#0ea5e9] bg-white rounded-t-lg" : "border-transparent text-stone-400 hover:text-stone-700"}`}
            >
              <ShoppingBag size={16} /> Trang phục đi thuê
              <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[10px] ${activeTab === "RENTED" ? "bg-blue-50 text-blue-700" : "bg-stone-100"}`}>{rentedOrders.length}</span>
            </button>
          </div>

          <div className="p-0">
            {activeTab === "ITEMS" && (
              <div>
                {closetItems.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                      <thead>
                        <tr className="border-b border-stone-100 bg-stone-50/30 text-stone-400 font-bold text-[10px] uppercase tracking-wider">
                          <th className="py-4 px-6 w-16">Sản phẩm</th>
                          <th className="py-4 px-6">Trạng thái</th>
                          <th className="py-4 px-6 text-emerald-800">Blog Lookbook</th>
                          <th className="py-4 px-6 text-right text-emerald-800">Giá Thuê</th>
                          <th className="py-4 px-6 text-right text-blue-800">Giá Bán</th>
                          <th className="py-4 px-6 text-right">Hành động</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 font-medium text-stone-600 text-[13px]">
                        {closetItems.map((item) => (
                          <tr key={item.id} className="hover:bg-stone-50/50 transition-colors group">
                            <td className="py-3 px-6">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-16 rounded-lg bg-stone-100 overflow-hidden shrink-0 border border-stone-200/50">
                                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex flex-col max-w-[200px]">
                                  <span className="font-bold text-[#183A2D] truncate">{item.name}</span>
                                  <span className="text-[11px] text-stone-400">Size {item.size}</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-6">
                              <div className="flex flex-col gap-1.5">
                                {item.isRentalActive ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 w-fit">
                                    <CheckCircle2 size={10} /> Cho Thuê
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 w-fit">Không cho thuê</span>
                                )}
                                {item.isSaleActive ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 w-fit">
                                    <CheckCircle2 size={10} /> Bán Thanh Lý
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 w-fit">Không bán</span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-6">
                              <div className="flex flex-col gap-1 max-w-[150px]">
                                <span className="truncate text-xs font-semibold text-stone-700">{item.blogTitle}</span>
                                <span className={`text-[10px] font-bold ${item.hasBlog ? (item.isBlogHidden ? 'text-amber-600' : 'text-emerald-600') : 'text-stone-400'}`}>
                                  {item.hasBlog ? (item.isBlogHidden ? 'Đã Ẩn' : 'Đang Hiển Thị') : 'Chưa có bài'}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-6 text-right font-mono font-bold text-emerald-700">
                              {item.isRentalActive ? `${item.rentalPrice.toLocaleString()}₫` : '-'}
                            </td>
                            <td className="py-3 px-6 text-right font-mono font-bold text-blue-700">
                              {item.isSaleActive ? `${item.salePrice.toLocaleString()}₫` : '-'}
                            </td>
                            <td className="py-3 px-6 text-right">
                              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button className="p-1.5 text-stone-400 hover:text-[#183A2D] hover:bg-stone-100 rounded-lg transition-colors" title="Chỉnh sửa">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                                </button>
                                {item.hasBlog && (
                                  <button onClick={() => handleToggleBlogVisibility(item.id, item.isBlogHidden)} className={`p-1.5 rounded-lg transition-colors ${item.isBlogHidden ? 'text-amber-500 hover:bg-amber-50' : 'text-emerald-500 hover:bg-emerald-50'}`} title={item.isBlogHidden ? 'Hiện Blog' : 'Ẩn Blog'}>
                                    {item.isBlogHidden ? <EyeOff size={16} /> : <Eye size={16} />}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                    <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center text-stone-300 mb-4">
                      <Shirt size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-stone-800 mb-2">Tủ đồ trống</h3>
                    <p className="text-sm text-stone-500 max-w-sm mb-6">Bạn chưa có sản phẩm nào đang niêm yết. Hãy đăng đồ lên CLOOP ngay để bắt đầu cho thuê và bán thanh lý nhé!</p>
                    <Link href="/my-closet/create" className="inline-flex items-center gap-2 bg-[#183A2D] text-white px-6 py-2.5 rounded-full text-sm font-bold hover:bg-[#112a20] transition-colors shadow-sm hover:shadow-md hover:-translate-y-0.5">
                      <Plus size={16} /> Đăng bán ngay
                    </Link>
                  </div>
                )}
              </div>
            )}

            {activeTab === "ESCROW" && (
              <div>
                {escrowOrders.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                      <thead>
                        <tr className="border-b border-stone-100 bg-stone-50/30 text-stone-400 font-bold text-[10px] uppercase tracking-wider">
                          <th className="py-4 px-6">Mã Giao Dịch</th>
                          <th className="py-4 px-6">Sản Phẩm</th>
                          <th className="py-4 px-6">Khách Thuê</th>
                          <th className="py-4 px-6">Trạng Thái</th>
                          <th className="py-4 px-6 text-right">Tổng Tiền Ký Quỹ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 font-medium text-stone-600 text-[13px]">
                        {escrowOrders.map((order) => (
                          <tr key={order.id} className="hover:bg-stone-50/50 transition-colors">
                            <td className="py-3 px-6 font-mono text-xs text-stone-500">#{String(order.id).padStart(5, '0')}</td>
                            <td className="py-3 px-6">
                              <div className="flex items-center gap-3">
                                <img src={order.products?.image_url || PLACEHOLDER_IMG} className="w-8 h-10 rounded-md object-cover bg-stone-100 border border-stone-200" />
                                <span className="font-bold text-[#183A2D] truncate max-w-[150px]">{order.products?.title || 'Trang phục CLOOP'}</span>
                              </div>
                            </td>
                            <td className="py-3 px-6">
                              <div className="flex flex-col">
                                <span className="font-bold text-stone-800 text-xs">ID Khách: {order.renterId?.substring(0,8)}</span>
                                <span className="text-[10px] text-amber-600 font-bold flex items-center gap-0.5"><Star size={10} className="fill-amber-500" /> {order.renterAvg} ({order.renterReviewCount} đánh giá)</span>
                              </div>
                            </td>
                            <td className="py-3 px-6">
                              {order.status === "active" && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">Đang thuê</span>}
                              {order.status === "completed" && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-500">Đã hoàn tất</span>}
                              {order.status === "returning" && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100 animate-pulse">Khách đang trả đồ</span>}
                            </td>
                            <td className="py-3 px-6 text-right font-mono font-bold text-[#183A2D]">
                              {(order.total_amount || 0).toLocaleString()}₫
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                    <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center text-stone-300 mb-4">
                      <History size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-stone-800 mb-2">Chưa có giao dịch ký quỹ</h3>
                    <p className="text-sm text-stone-500 max-w-sm">Tủ đồ của bạn hiện chưa có yêu cầu thuê nào từ người dùng khác.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "RENTED" && (
              <div>
                {rentedOrders.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                      <thead>
                        <tr className="border-b border-stone-100 bg-stone-50/30 text-stone-400 font-bold text-[10px] uppercase tracking-wider">
                          <th className="py-4 px-6">Mã Giao Dịch</th>
                          <th className="py-4 px-6">Sản Phẩm</th>
                          <th className="py-4 px-6">Chủ Đồ</th>
                          <th className="py-4 px-6">Trạng Thái</th>
                          <th className="py-4 px-6 text-right">Tổng Tiền Thanh Toán</th>
                          <th className="py-4 px-6 text-right">Đánh giá</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 font-medium text-stone-600 text-[13px]">
                        {rentedOrders.map((order) => (
                          <tr key={order.id} className="hover:bg-stone-50/50 transition-colors group">
                            <td className="py-3 px-6 font-mono text-xs text-stone-500">#{String(order.id).padStart(5, '0')}</td>
                            <td className="py-3 px-6">
                              <div className="flex items-center gap-3">
                                <img src={order.products?.image_url || PLACEHOLDER_IMG} className="w-8 h-10 rounded-md object-cover bg-stone-100 border border-stone-200" />
                                <span className="font-bold text-[#183A2D] truncate max-w-[150px]">{order.products?.title || 'Trang phục CLOOP'}</span>
                              </div>
                            </td>
                            <td className="py-3 px-6">
                              <div className="flex flex-col">
                                <span className="font-bold text-stone-800 text-xs">ID Chủ: {order.ownerId?.substring(0,8)}</span>
                                <span className="text-[10px] text-amber-600 font-bold flex items-center gap-0.5"><Star size={10} className="fill-amber-500" /> {order.ownerAvg} ({order.ownerReviewCount} đánh giá)</span>
                              </div>
                            </td>
                            <td className="py-3 px-6">
                              {order.status === "active" && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">Đang thuê</span>}
                              {order.status === "completed" && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-500">Đã hoàn tất</span>}
                              {order.status === "returning" && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">Đang trả đồ</span>}
                            </td>
                            <td className="py-3 px-6 text-right font-mono font-bold text-[#0ea5e9]">
                              {(order.total_amount || 0).toLocaleString()}₫
                            </td>
                            <td className="py-3 px-6 text-right">
                              {order.status === "completed" ? (
                                <button onClick={() => {
                                  setSelectedOrderForReview(order);
                                  setShowReviewModal(true);
                                }} className="text-[10px] font-bold text-[#183A2D] bg-[#183A2D]/10 hover:bg-[#183A2D] hover:text-white px-3 py-1.5 rounded-md transition-colors">
                                  Đánh giá
                                </button>
                              ) : (
                                <span className="text-[10px] text-stone-400">Chưa thể đánh giá</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                    <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center text-stone-300 mb-4">
                      <ShoppingBag size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-stone-800 mb-2">Bạn chưa thuê món đồ nào</h3>
                    <p className="text-sm text-stone-500 max-w-sm mb-6">Hàng ngàn sản phẩm tuyệt đẹp đang chờ bạn khám phá trên CLOOP Market.</p>
                    <Link href="/shop" className="inline-flex items-center gap-2 bg-[#183A2D] text-white px-6 py-2.5 rounded-full text-sm font-bold hover:bg-[#112a20] transition-colors shadow-sm hover:shadow-md hover:-translate-y-0.5">
                      Khám phá ngay <ArrowRight size={16} />
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      
        </div>

      {/* GIAO DIỆN MODAL ĐÁNH GIÁ SỬ DỤNG PHÂN HỆ GREEN TRUST CỦA CLOOP NETWORK */}
      {showReviewModal && selectedOrderForReview && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            className="bg-white border border-stone-200/60 rounded-[2rem] max-w-[440px] w-full shadow-2xl p-6 text-left space-y-4"
          >
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-sm font-bold text-[#183A2D] uppercase tracking-wider">
                ⭐ Đánh giá giao dịch
              </h3>
              <button 
                type="button" 
                onClick={() => setShowReviewModal(false)} 
                className="text-stone-400 hover:text-stone-700 transition-colors p-1"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="space-y-1">
              <p className="text-xs text-stone-500">
                Bạn đang ghi nhận phản hồi đối với đối tác giao dịch:
              </p>
              <p className="text-xs font-bold text-stone-900">
                {selectedOrderForReview.owner_name} / {selectedOrderForReview.renter_name}
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider">Số sao tín nhiệm</label>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setRating(star)}
                    className="p-1 transition-transform active:scale-90 cursor-pointer"
                  >
                    <Star
                      size={24}
                      className={star <= rating ? "fill-amber-400 text-amber-400" : "text-stone-200"}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider">Nội dung nhận xét phản hồi</label>
              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Nhập cảm nhận thực tế của cậu về đối tác giao dịch tuần hoàn này nhé..."
                className="w-full px-4 py-3 rounded-2xl border border-stone-200 text-xs focus:outline-none focus:border-emerald-600 bg-stone-50/50 resize-none"
              />
            </div>

            <button
              type="button"
              onClick={handleSubmitReview}
              disabled={isReviewSubmitting}
              className="w-full py-3 bg-[#183A2D] text-white text-xs font-bold uppercase tracking-widest rounded-xl shadow transition-all flex items-center justify-center gap-2 hover:bg-[#23452F] disabled:opacity-50 cursor-pointer"
            >
              {isReviewSubmitting ? "Đang khóa đồng bộ dữ liệu..." : "Gửi đánh giá tín nhiệm (+10 Pts)"}
            </button>
          </motion.div>
        </div>
      )}

      {/* MODAL THĂNG HẠNG (BOOST LISTING & ADS) */}
      <AnimatePresence>
        {showBoostModal && selectedProductForBoost && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
          >
            <motion.div 
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-full sm:max-w-[480px] bg-[#FAF9F6] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden relative"
            >
              <div className="absolute top-4 right-4 bg-stone-100 backdrop-blur-md rounded-full p-2 cursor-pointer z-10 hover:bg-stone-200 transition-colors" onClick={() => setShowBoostModal(false)}>
                <X size={18} className="text-[#0A2517]" />
              </div>
              
              <div className="p-8 pb-12 sm:pb-8">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <h3 className="font-heading text-2xl font-bold text-[#0A2517] text-center">
                    Quảng Cáo Tủ Đồ
                  </h3>
                  <div className="flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                    <img src="/images/cloop-coin-front.png" className="w-4 h-4 mix-blend-multiply" alt="coin" />
                    <span className="text-xs font-bold text-[#183A2D]">{cloopCoins.toLocaleString()}</span>
                  </div>
                </div>
                
                <p className="font-body text-xs text-stone-500 text-center mb-6 px-4">
                  Sử dụng Lá CLOOP để thu hút hàng ngàn tín đồ thời trang chú ý đến <strong>{selectedProductForBoost.name}</strong>.
                </p>

                <div className="space-y-3 mb-6">
                  {/* Package 1: Boost */}
                  <div className={`border border-stone-200 p-4 rounded-2xl bg-white hover:border-[#183A2D] cursor-pointer transition-all relative group flex items-start gap-3 ${isBoosting ? 'opacity-50 pointer-events-none' : ''}`}
                    onClick={async () => {
                      if (cloopCoins < 20) { alert("Tài khoản của bạn không đủ Lá CLOOP. Vui lòng nạp thêm!"); return; }
                      if (window.confirm("Bạn có chắc muốn dùng 20 Lá CLOOP để đẩy sản phẩm này lên TOP 1?")) {
                        // 1. KHÓA NÚT NGAY LẬP TỨC (Chống Auto-clicker Race Condition)
                        setIsBoosting(true);
                        
                        // 2. OPTIMISTIC UI (Cập nhật giao diện giả lập thành công)
                        const previousCoins = cloopCoins;
                        setCloopCoins(prev => prev - 20);
                        setShowBoostModal(false); // Đóng ngay lập tức cho mượt
                        
                        // 3. GỌI SERVER ACTION
                        const { data: { session } } = await supabase.auth.getSession();
                        const result = await purchaseBoostPackage(selectedProductForBoost.id, session?.user?.id || "", 'BOOST');
                        
                        if (result.success) {
                           // Server đã duyệt
                           fetchRealClosetData(); 
                           alert("🎉 Chúc mừng! Sản phẩm của bạn đã được ghim lên vị trí Top 1 Trang chủ.");
                        } else {
                           // ROLLBACK OPTIMISTIC UI
                           setCloopCoins(previousCoins);
                           setShowBoostModal(true);
                           alert("Lỗi giao dịch: " + result.error);
                        }
                        
                        setIsBoosting(false);
                      }
                    }}
                  >
                    <div className="absolute -top-3 right-4 bg-rose-600 text-white font-ui text-[9px] font-bold uppercase px-3 py-1 rounded-full tracking-widest shadow-sm">Hot nhất</div>
                    <div className="text-2xl pt-1">🚀</div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-ui text-xs font-bold uppercase tracking-widest text-[#0A2517]">Gói Đẩy Tín</span>
                        <span className="font-mono text-sm font-black text-[#183A2D] flex items-center gap-1">20 <img src="/images/cloop-coin-front.png" className="w-3.5 h-3.5 mix-blend-multiply" alt="coin" /></span>
                      </div>
                      <p className="font-body text-[11px] text-stone-500 leading-relaxed">Ghim sản phẩm lên vị trí TOP 1 danh mục Khám Phá liên tục trong 24 giờ. Tăng 400% lượt thuê.</p>
                    </div>
                  </div>

                  {/* Package 2: Highlight */}
                  <div className={`border border-stone-200 p-4 rounded-2xl bg-white hover:border-[#183A2D] cursor-pointer transition-all flex items-start gap-3 ${isBoosting ? 'opacity-50 pointer-events-none' : ''}`}
                    onClick={async () => {
                      if (cloopCoins < 10) { alert("Tài khoản của bạn không đủ Lá CLOOP. Vui lòng nạp thêm!"); return; }
                      if (window.confirm("Bạn có chắc muốn dùng 10 Lá CLOOP để gắn Viền Hào Quang cho sản phẩm này?")) {
                        setIsBoosting(true);
                        
                        const previousCoins = cloopCoins;
                        setCloopCoins(prev => prev - 10);
                        setShowBoostModal(false);
                        
                        const { data: { session } } = await supabase.auth.getSession();
                        const result = await purchaseBoostPackage(selectedProductForBoost.id, session?.user?.id || "", 'HIGHLIGHT');
                        
                        if (result.success) {
                           fetchRealClosetData();
                           alert("✨ Tuyệt vời! Sản phẩm của bạn đã được gắn Huy hiệu Uy tín và Viền phát sáng nổi bật.");
                        } else {
                           setCloopCoins(previousCoins);
                           setShowBoostModal(true);
                           alert("Lỗi giao dịch: " + result.error);
                        }
                        
                        setIsBoosting(false);
                      }
                    }}
                  >
                    <div className="text-2xl pt-1">✨</div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-ui text-xs font-bold uppercase tracking-widest text-[#0A2517]">Viền Hào Quang</span>
                        <span className="font-mono text-sm font-black text-[#183A2D] flex items-center gap-1">10 <img src="/images/cloop-coin-front.png" className="w-3.5 h-3.5 mix-blend-multiply" alt="coin" /></span>
                      </div>
                      <p className="font-body text-[11px] text-stone-500 leading-relaxed">Sản phẩm được đóng khung phát sáng và đính kèm Badge "Tủ Đồ Uy Tín" vĩnh viễn trên ảnh bìa.</p>
                    </div>
                  </div>

                  {/* Package 3: Push Notification */}
                  <div className="border border-stone-200 p-4 rounded-2xl bg-white hover:border-[#183A2D] cursor-pointer transition-all flex items-start gap-3"
                    onClick={() => { alert("Chức năng Bắn Thông Báo Đẩy hệ thống đang được bảo trì."); }}
                  >
                    <div className="text-2xl pt-1">🔔</div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-ui text-xs font-bold uppercase tracking-widest text-stone-400">Đẩy Thông Báo</span>
                        <span className="font-mono text-sm font-black text-stone-400 flex items-center gap-1">50 <img src="/images/cloop-coin-front.png" className="w-3.5 h-3.5 mix-blend-multiply opacity-50" alt="coin" /></span>
                      </div>
                      <p className="font-body text-[11px] text-stone-400 leading-relaxed">Bắn thông báo (Push Notification) "Có hàng ngon!" đến 500 người dùng có chung sở thích.</p>
                    </div>
                  </div>
                </div>
                
                {isBoosting && <div className="text-center text-xs font-bold text-amber-600 animate-pulse mt-4">⏳ Đang xử lý giao dịch qua cổng bảo chứng...</div>}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}