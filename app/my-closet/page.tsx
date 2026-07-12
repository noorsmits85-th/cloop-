"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { motion, AnimatePresence } from "framer-motion";
// Các icon Leaf, Droplet, Sparkles để phục vụ hiển thị chỉ số ESG
import { ArrowLeft, Plus, ShieldCheck, CheckCircle2, AlertTriangle, PackageCheck, Shirt, History, Leaf, Droplet, Sparkles, X, Star, ShoppingBag } from "lucide-react";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://notxrjsuukrrxdlboavo.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "temporary-placeholder-key";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const PLACEHOLDER_IMG = "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=120";

export default function MyClosetPage() {
  const [activeTab, setActiveTab] = useState<"ITEMS" | "ESCROW" | "RENTED">("ITEMS"); // Mở rộng định dạng Tab thứ 3
  const [closetItems, setClosetItems] = useState<any[]>([]);
  const [escrowOrders, setEscrowOrders] = useState<any[]>([]);
  const [rentedOrders, setRentedOrders] = useState<any[]>([]); // State lưu trữ đơn hàng mình đi thuê
  const [loading, setLoading] = useState(true);

  // States quản lý Modal Đánh giá và nhập liệu sao tín nhiệm cho cả 2 luồng
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedOrderForReview, setSelectedOrderForReview] = useState<any>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [isReviewSubmitting, setIsReviewSubmitting] = useState(false);

  // State quản lý các chỉ số tác động xanh sinh thái (ESG Index Dashboard)
  const [ecoStats, setEcoStats] = useState({ co2Saved: 0, waterSaved: 0, greenPoints: 0 });

  const today = new Date().toISOString().slice(0, 10);

  // 📡 QUÉT DỮ LIỆU ĐỒNG BỘ ĐỘNG TOÀN DIỆN: ĐẤU NỐI CẢ LUỒNG CHỦ ĐỒ VÀ KHÁCH THUÊ THẬT
  async function fetchRealClosetData() {
    try {
      setLoading(true);

      // Xác định UID tài khoản để lọc đúng tủ đồ chính chủ
      let finalUserId = null;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) finalUserId = user.id;
      } catch (e) {}

      if (!finalUserId && typeof window !== "undefined") {
        finalUserId = localStorage.getItem("cloop_user_id");
      }

      // Nếu thực sự chưa đăng nhập, gom mảng rỗng để không bị sập giao diện
      if (!finalUserId) {
        setClosetItems([]);
        setEscrowOrders([]);
        setRentedOrders([]);
        return;
      }

      // 1. Lấy toàn bộ danh sách sản phẩm do mình đăng tải
      const { data: productsData, error: pError } = await supabase
        .from("products")
        .select("*")
        .eq("userId", finalUserId)
        .order("id", { ascending: false });

      if (pError) throw pError;

      // 2. Lấy toàn bộ Listing và Lịch sử thuê đồ từ cơ sở dữ liệu thật
      const { data: listingsData } = await supabase.from("Listing").select("*");
      const { data: rentalHistoryData } = await supabase.from("rental_history").select("*").order("id", { ascending: false });
      const { data: reviewsData } = await supabase.from("Review").select("*");

      // 3. PHÂN HỆ LUỒNG A: Đơn hàng khách thuê đồ của mình (Mình đóng vai trò CHỦ ĐỒ)
      const formattedEscrowOrders = (rentalHistoryData || [])
        .map((order: any) => {
          const matchedProduct = (productsData || []).find(
            (p: any) => String(p.id) === String(order.product_id)
          );

          // Thuật toán đối soát tính sao trung bình của Renter
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

      // 4. PHÂN HỆ LUỒNG B: Đơn hàng mình đi thuê từ người khác (Mình đóng vai trò KHÁCH THUÊ)
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
        
        // Thuật toán bốc tách điểm sao uy tín của Owner để mình đối soát lúc xem lại đơn
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

      // 5. HIỂN THỊ ESG DASHBOARD
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
        const isHidden = productListings.length > 0 && productListings.every((l: any) => l.status === "HIDDEN");

        const productRentals = (rentalHistoryData || []).filter(
          (r: any) => String(r.product_id) === String(item.id)
        );
        const activeRentals = productRentals.filter((r: any) => r.status === "active" || r.status === "returning");

        return {
          id: item.id,
          name: item.title || item.name || "Trang phục CLOOP",
          size: item.size || "M",
          image: currentImage,
          status: "Đang hoạt động",
          isRentalActive: rentPrice > 0,
          rentalPrice: rentPrice,
          activeRentals,
          isCurrentlyRenting: activeRentals.length > 0,
          isSaleActive: sellPrice > 0,
          salePrice: sellPrice,
          listingIds,
          isHidden,
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

  // 📡 TIẾN TRÌNH ĐẨY REVIEW ĐA PHƯƠNG THỨC LÊN DATABASE THẬT
  const handleSubmitReview = async () => {
    if (!selectedOrderForReview) return;
    setIsReviewSubmitting(true);
    try {
      let currentUserId = localStorage.getItem("cloop_user_id");
      if (!currentUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) currentUserId = user.id;
      }

      if (!currentUserId) { alert("Vui lòng đăng nhập để thực hiện."); return; }

      // Nhận diện luồng: Mình đi thuê đồ hay người ta thuê đồ của mình
      const isRenterToOwnerLuong = String(selectedOrderForReview.renterId) === String(currentUserId);
      const finalRevieweeId = isRenterToOwnerLuong ? selectedOrderForReview.ownerId : selectedOrderForReview.renterId;
      const finalType = isRenterToOwnerLuong ? "RENTER_TO_OWNER" : "OWNER_TO_RENTER";
      const updateField = isRenterToOwnerLuong ? { renterRatedAt: new Date().toISOString() } : { ownerRatedAt: new Date().toISOString() };

      // 1. Insert bản ghi review thật vào Supabase
      const { error: reviewError } = await supabase.from("Review").insert([{
        rentalHistoryId: selectedOrderForReview.id,
        reviewerId: currentUserId,
        revieweeId: finalRevieweeId || "",
        rating: rating,
        type: finalType,
        comment: comment
      }]);

      if (reviewError) throw reviewError;

      // 2. Đánh dấu mốc thời gian chấm sao lên đơn hàng công khai
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

  const handleToggleVisibility = async (listingIds: string[], currentlyHidden: boolean) => {
    if (listingIds.length === 0) {
      alert("Sản phẩm này chưa thiết lập giá bán/thuê, không thể ẩn.");
      return;
    }
    const newStatus = currentlyHidden ? "AVAILABLE" : "HIDDEN";
    const { error } = await supabase.from("Listing").update({ status: newStatus }).in("id", listingIds);
    if (error) {
      alert(`Lỗi cập nhật trạng thái: ${error.message}`);
      return;
    }
    await fetchRealClosetData();
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

        {/* GREEN IMPACT ESG DASHBOARD */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
          <div className="bg-white border border-stone-200/50 p-5 rounded-2xl shadow-sm flex items-center gap-4 text-left">
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-800 flex items-center justify-center border border-emerald-100 shrink-0">
              <Leaf size={18} />
            </div>
            <div className="space-y-0.5">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Giảm phát thải CO₂ tích lũy</div>
              <div className="text-lg font-mono font-black text-stone-900">{ecoStats.co2Saved.toLocaleString()} kg</div>
              <p className="text-[9px] text-emerald-700 font-medium">Bảo vệ bầu không khí sạch</p>
            </div>
          </div>

          <div className="bg-white border border-stone-200/50 p-5 rounded-2xl shadow-sm flex items-center gap-4 text-left">
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-800 flex items-center justify-center border border-blue-100 shrink-0">
              <Droplet size={18} />
            </div>
            <div className="space-y-0.5">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tài nguyên nước tiết kiệm</div>
              <div className="text-lg font-mono font-black text-stone-900">{ecoStats.waterSaved.toLocaleString()} Lít</div>
              <p className="text-[9px] text-blue-700 font-medium">Tối ưu hóa tài nguyên bản địa</p>
            </div>
          </div>

          <div className="bg-white border border-stone-200/50 p-5 rounded-2xl shadow-sm flex items-center gap-4 text-left">
            <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-800 flex items-center justify-center border border-amber-100 shrink-0">
              <Sparkles size={18} />
            </div>
            <div className="space-y-0.5">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Điểm thưởng Green Points</div>
              <div className="text-lg font-mono font-black text-[#183A2D]">{ecoStats.greenPoints.toLocaleString()} Pts</div>
              <p className="text-[9px] text-amber-700 font-medium">Định danh ví số tiêu dùng xanh</p>
            </div>
          </div>
        </div>

        {pendingNotificationCount > 0 && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-amber-50/80 border border-amber-200/60 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-left">
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-amber-900 uppercase tracking-widest flex items-center gap-2">
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

        {/* CẤU TRÚC 3 TAB QUẢN LÝ MASTER KHỚP TIÊU CHUẨN DEMO TECHFEST */}
        <div className="flex border-b border-stone-200 w-full gap-6 pt-2 overflow-x-auto no-scrollbar">
          <button 
            onClick={() => setActiveTab("ITEMS")} 
            className={`pb-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${activeTab === "ITEMS" ? "border-transparent text-[#183A2D] border-b-2 !border-[#183A2D]" : "border-transparent text-stone-400 hover:text-stone-700"}`}
          >
            <Shirt size={14} /> Kho sản phẩm đăng tải
          </button>
          <button 
            onClick={() => setActiveTab("ESCROW")} 
            className={`pb-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${activeTab === "ESCROW" ? "border-transparent text-amber-800 border-b-2 !border-amber-800" : "border-transparent text-stone-400 hover:text-stone-700"}`}
          >
            <History size={14} /> Yêu cầu khách thuê (Chủ đồ)
          </button>
          <button 
            onClick={() => setActiveTab("RENTED")} 
            className={`pb-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${activeTab === "RENTED" ? "border-transparent text-[#004a9c] border-b-2 !border-[#004a9c]" : "border-transparent text-stone-400 hover:text-stone-700"}`}
          >
            <ShoppingBag size={14} /> Trang phục đi thuê (Khách)
          </button>
        </div>

        <div className="mt-2">
          {activeTab === "ITEMS" && (
            <div className="bg-white rounded-[1.5rem] border border-stone-200/50 shadow-sm overflow-hidden p-4 md:p-6">
              {closetItems.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-stone-100 text-stone-400 font-semibold text-[11px]">
                        <th className="pb-3 w-16">Mẫu</th>
                        <th className="pb-3 pl-3">Tên Phục Trang</th>
                        <th className="pb-3 text-center">Kích Cỡ</th>
                        <th className="pb-3 text-center text-emerald-900 font-semibold px-3">Giá Thuê / Ngày</th>
                        <th className="pb-3 text-center text-blue-900 font-semibold px-3">Giá Chuyển Nhượng</th>
                        <th className="pb-3 text-right pr-2">Tình Trạng</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 font-medium text-stone-600">
                      {closetItems.map((item) => (
                        <tr key={item.id} className="hover:bg-stone-50/40 transition-colors">
                          <td className="py-3">
                            <img src={item.image} alt={item.name} className="w-10 h-14 rounded-xl object-cover shadow-sm border border-stone-100" onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMG; }} />
                          </td>
                          <td className="py-3 pl-3 font-semibold text-stone-900 max-w-[200px] truncate">
                            <Link href={`/product/${item.id}`} className="hover:text-emerald-800 transition-colors underline decoration-stone-200 hover:decoration-emerald-800">
                              {item.name}
                            </Link>
                          </td>
                          <td className="py-3 text-center text-stone-500 font-medium">{item.size}</td>
                          <td className="py-3 text-center font-medium text-emerald-900">
                            {item.isRentalActive ? `${item.rentalPrice.toLocaleString()}đ` : "—"}
                          </td>
                          <td className="py-3 text-center font-medium text-blue-900">
                            {item.isSaleActive ? `${item.salePrice.toLocaleString()}đ` : "—"}
                          </td>
                          
                          <td className="py-3 text-right pr-2">
                            <div className="flex items-center justify-end gap-2">
                              {item.isCurrentlyRenting ? (
                                <div className="text-right space-y-1">
                                  <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/60 px-2 py-0.5 rounded-md inline-block">
                                    Đang cho thuê 🔒
                                  </span>
                                  <p className="text-[10px] text-stone-400 font-medium tracking-wide">
                                    Khách: {item.activeRentals[0]?.renter_name || "Thành viên CLOOP"}
                                  </p>
                                </div>
                              ) : item.isHidden ? (
                                <span className="text-[10px] font-semibold bg-stone-100 text-stone-500 border border-stone-300 px-2 py-0.5 rounded-md">
                                  Đã ẩn
                                </span>
                              ) : (
                                <span className="text-[10px] font-semibold bg-stone-50 text-stone-400 border border-stone-200/40 px-2 py-0.5 rounded-md">
                                  Sẵn sàng
                                </span>
                              )}
                              {!item.isCurrentlyRenting && (
                                <button
                                  type="button"
                                  onClick={() => handleToggleVisibility(item.listingIds, item.isHidden)}
                                  className="text-[9px] font-bold uppercase px-2 py-1 rounded-md border border-stone-200 text-stone-500 hover:bg-stone-50 transition cursor-pointer select-none"
                                >
                                  {item.isHidden ? "Hiện lại" : "Ẩn bài"}
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
                <div className="text-center py-12 text-stone-400 text-xs font-medium">
                  Chưa có sản phẩm thực tế nào trong két sắt dữ liệu CLOOP.
                </div>
              )}
            </div>
          )}

          {activeTab === "ESCROW" && (
            <div className="space-y-4">
              {escrowOrders.length === 0 ? (
                <div className="bg-white border border-dashed rounded-2xl p-10 text-center text-xs font-medium text-stone-400">
                  Chưa có lịch sử giao dịch ký quỹ nào được ghi nhận.
                </div>
              ) : (
                escrowOrders.map((order) => (
                  <div key={order.id} className="bg-white border border-stone-200/60 rounded-2xl p-5 shadow-sm space-y-4 text-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-100 pb-3 gap-2 text-left">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-14 bg-stone-50 rounded-xl overflow-hidden border shrink-0">
                          <img src={order.products?.image_url || PLACEHOLDER_IMG} className="object-cover w-full h-full" alt="Đồ" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-bold text-stone-900 text-sm">{order.products?.title || "Trang phục CLOOP"}</h4>
                          <p className="text-stone-400 text-xs">
                            Khách thuê: <span className="font-semibold text-stone-700">{order.renter_name} ({order.renter_phone || "Chưa cập nhật SĐT"})</span>
                            <span className="ml-2 font-mono font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/40">
                              ★ {order.renterAvg} ({order.renterReviewCount}đg)
                            </span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/40 flex items-center gap-1">
                          <ShieldCheck size={12} /> Cloop giữ tiền bảo chứng
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-stone-50/40 p-4 rounded-xl border border-stone-200/30 text-left">
                      <div className="space-y-1 text-stone-500 text-xs">
                        <p>🗓️ Kỳ hạn: <span className="font-semibold text-stone-700">{order.start_date}</span> đến <span className="font-semibold text-stone-700">{order.end_date}</span></p>
                        <p>💬 Ghi chú: Tiền thuê và tiền cọc được bảo giữ an toàn tại hệ thống bảo chứng CLOOP.</p>
                      </div>
                      <div className="shrink-0 w-full sm:w-auto">
                        {order.status === "completed" || order.status === "disputed" ? (
                          <div className="flex flex-col sm:items-end gap-1.5">
                            <div className={`text-xs font-bold bg-stone-50 px-3 py-1.5 rounded-lg border ${order.status === "completed" ? "text-emerald-700 border-emerald-200" : "text-rose-700 border-rose-200"}`}>
                              {order.status === "completed" ? "✅ Đã giải ngân xong" : "🛑 Đóng băng chờ xử lý"}
                            </div>
                            {order.status === "completed" && !order.ownerRatedAt && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedOrderForReview(order);
                                  setRating(5);
                                  setComment("");
                                  setShowReviewModal(true);
                                }}
                                className="mt-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all active:scale-95 cursor-pointer"
                              >
                                ⭐ Đánh giá khách
                              </button>
                            )}
                            {order.status === "completed" && order.ownerRatedAt && (
                              <span className="text-[10px] text-stone-400 font-medium italic mt-1">Cậu đã đánh giá khách ✓</span>
                            )}
                          </div>
                        ) : (
                          /* 🟢 ĐÃ MỞ KHÓA CHO TECHFEST DEMO: Hiện nút Duyệt trả đồ bất kỳ lúc nào để kích nổ Modal đánh giá nhé! */
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleUpdateEscrowStatus(order.id, "completed")}
                              className="flex-1 sm:flex-none px-4 py-2.5 bg-[#183A2D] hover:bg-[#264935] text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-1 shadow-sm cursor-pointer"
                            >
                              <PackageCheck size={14} /> Duyệt trả đồ & Nhận tiền
                            </button>
                            <button
                              onClick={() => handleUpdateEscrowStatus(order.id, "disputed")}
                              className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/60 text-xs font-semibold rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <AlertTriangle size={14} /> Báo hỏng
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* PHÂN HỆ UI HIỂN THỊ KHO ĐỒ MÌNH ĐI THUÊ (RENTED TAB) */}
          {activeTab === "RENTED" && (
            <div className="space-y-4">
              {rentedOrders.length === 0 ? (
                <div className="bg-white border border-dashed rounded-2xl p-10 text-center text-xs font-medium text-stone-400">
                  Cậu chưa thực hiện lịch sử đi thuê trang phục xanh nào trên CLOOP.
                </div>
              ) : (
                rentedOrders.map((order) => (
                  <div key={order.id} className="bg-white border border-stone-200/60 rounded-2xl p-5 shadow-sm space-y-4 text-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-100 pb-3 gap-2 text-left">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-14 bg-stone-50 rounded-xl overflow-hidden border shrink-0">
                          <img src={order.products?.image_url || PLACEHOLDER_IMG} className="object-cover w-full h-full" alt="Đồ" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-bold text-stone-900 text-sm">{order.products?.title || "Trang phục CLOOP"}</h4>
                          <p className="text-stone-400 text-xs">
                            Chủ tủ đồ: <span className="font-semibold text-stone-700">{order.owner_name} ({order.owner_phone})</span>
                            <span className="ml-2 font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/40">
                              ★ {order.ownerAvg} ({order.ownerReviewCount}đg)
                            </span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <span className="text-[10px] font-semibold text-blue-800 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200/40 flex items-center gap-1">
                          🔒 Đã ký quỹ an toàn
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-stone-50/40 p-4 rounded-xl border border-stone-200/30 text-left">
                      <div className="space-y-1 text-stone-500 text-xs">
                        <p>🗓️ Kỳ hạn thuê: <span className="font-semibold text-stone-700">{order.start_date}</span> đến <span className="font-semibold text-stone-700">{order.end_date}</span></p>
                        <p>💬 Trạng thái: {order.status === "active" ? "Đang trong hạn thuê đồ" : order.status === "returning" ? "Đang hoàn trả tài sản" : "Đã hoàn thành vòng đời kết thúc đơn"}</p>
                      </div>
                      <div className="shrink-0 w-full sm:w-auto">
                        {order.status === "completed" ? (
                          <div className="flex flex-col sm:items-end gap-1.5">
                            <div className="text-xs font-bold bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg border border-emerald-200">
                              ✓ Đơn hàng hoàn tất
                            </div>
                            {!order.renterRatedAt ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedOrderForReview(order);
                                  setRating(5);
                                  setComment("");
                                  setShowReviewModal(true);
                                }}
                                className="mt-1 px-3 py-1.5 bg-[#004a9c] hover:bg-blue-800 text-white text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all active:scale-95 cursor-pointer"
                              >
                                ⭐ Đánh giá chủ đồ
                              </button>
                            ) : (
                              <span className="text-[10px] text-stone-400 font-medium italic mt-1">Cậu đã đánh giá chủ tủ ✓</span>
                            )}
                          </div>
                        ) : (
                          <div className="text-[10px] font-semibold bg-stone-100 text-stone-500 border border-stone-200 px-3 py-2 rounded-xl select-none text-center">
                            ⚙ Đang trong luồng giao nhận bảo chứng
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
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
                ⭐ {String(selectedOrderForReview.renterId) === localStorage.getItem("cloop_user_id") ? "Đánh giá chủ tủ đồ" : "Đánh giá thành viên thuê đồ"}
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
                {String(selectedOrderForReview.renterId) === localStorage.getItem("cloop_user_id") ? "Bạn đang ghi nhận phản hồi đối với chủ đồ:" : "Bạn đang ghi nhận trải nghiệm giữ đồ đối với khách:"}
              </p>
              <p className="text-xs font-bold text-stone-900">
                {String(selectedOrderForReview.renterId) === localStorage.getItem("cloop_user_id") ? selectedOrderForReview.owner_name : selectedOrderForReview.renter_name}
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

    </div>
  );
}