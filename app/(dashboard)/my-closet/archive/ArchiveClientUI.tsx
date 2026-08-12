"use client";

import React, { useState, useEffect } from "react";
import { Search, Eye, RefreshCw, Box, X, Clock, DollarSign, Tag, ArrowRight, CheckCircle2, User as UserIcon } from "lucide-react";
import { getArchivedItemDetail, relistArchivedItem, fetchArchivedListings } from "./actions";
import { useRouter } from "next/navigation";

type ItemStatus = "sold" | "hidden" | "cancelled";

interface ArchiveItem {
  id: string;
  name: string;
  image: string;
  archivedDate: string;
  price: number;
  status: ItemStatus;
}

export default function ArchiveClientUI({ 
  initialItems, 
  initialNextCursor 
}: { 
  initialItems: ArchiveItem[],
  initialNextCursor?: string
}) {
  const router = useRouter();
  
  // States for data
  const [items, setItems] = useState<ArchiveItem[]>(initialItems);
  const [nextCursor, setNextCursor] = useState<string | undefined>(initialNextCursor);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // States for filter and search
  const [filter, setFilter] = useState<"all" | ItemStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // States for Drawer (Xem chi tiết)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<any>(null);

  // States for Modal (Đăng bán lại)
  const [isRelistModalOpen, setIsRelistModalOpen] = useState(false);
  const [relistData, setRelistData] = useState<any>(null);

  // Scroll Lock Effect
  useEffect(() => {
    if (isDrawerOpen || isRelistModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isDrawerOpen, isRelistModalOpen]);

  const filteredItems = items.filter(item => {
    const matchesFilter = filter === "all" || item.status === filter;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const loadMore = async () => {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const result = await fetchArchivedListings(nextCursor);
      setItems(prev => [...prev, ...result.data]);
      setNextCursor(result.nextCursor);
    } catch (error) {
      console.error("Lỗi tải thêm dữ liệu:", error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const getStatusBadge = (status: ItemStatus) => {
    switch (status) {
      case "sold":
        return <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 rounded-md border border-emerald-200">Đã bán</span>;
      case "hidden":
        return <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-stone-200 text-stone-600 rounded-md border border-stone-300">Đã gỡ/Ẩn</span>;
      case "cancelled":
        return <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700 rounded-md border border-red-200">Đã hủy</span>;
    }
  };

  const openDetailDrawer = async (itemId: string) => {
    setIsDrawerOpen(true);
    setIsDetailLoading(true);
    setSelectedDetail(null);
    try {
      // Gọi Server Action (Bước 2 trong thiết kế của Tech Lead)
      const data = await getArchivedItemDetail(itemId);
      setSelectedDetail(data);
    } catch (error) {
      alert("Lỗi tải chi tiết: " + error);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const openRelistModal = (item: ArchiveItem) => {
    setRelistData(item);
    setIsRelistModalOpen(true);
  };

  const handleRelistSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newPrice = Number(formData.get("newPrice"));
    
    if (!newPrice || newPrice <= 0) {
      alert("Vui lòng nhập giá đăng bán hợp lệ!");
      return;
    }

    try {
      await relistArchivedItem(relistData.id, newPrice);
      alert("Đã tạo bản ghi mới thành công! Món đồ của bạn đã trở lại Tủ đồ công khai.");
      setIsRelistModalOpen(false);
      router.refresh();
    } catch (error: any) {
      alert("Lỗi đăng bán lại: " + error.message);
    }
  };

  return (
    <div className="space-y-6 relative">
      {/* 2. Thanh Filter */}
      <div className="flex flex-col sm:flex-row justify-between items-center w-full gap-4">
        {/* Tabs */}
        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-stone-200/60 shadow-sm w-fit overflow-x-auto no-scrollbar">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${filter === "all" ? "bg-[#183A2D] text-white" : "text-stone-500 hover:text-stone-800 hover:bg-stone-50"}`}
          >
            Tất cả
          </button>
          <button
            onClick={() => setFilter("sold")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${filter === "sold" ? "bg-[#183A2D] text-white" : "text-stone-500 hover:text-stone-800 hover:bg-stone-50"}`}
          >
            Đã bán
          </button>
          <button
            onClick={() => setFilter("hidden")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${filter === "hidden" ? "bg-[#183A2D] text-white" : "text-stone-500 hover:text-stone-800 hover:bg-stone-50"}`}
          >
            Đã gỡ/Ẩn
          </button>
          <button
            onClick={() => setFilter("cancelled")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${filter === "cancelled" ? "bg-[#183A2D] text-white" : "text-stone-500 hover:text-stone-800 hover:bg-stone-50"}`}
          >
            Đã hủy
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64 shrink-0">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Tìm mã hoặc tên món đồ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-stone-200/60 rounded-xl outline-none focus:border-[#183A2D] transition-colors shadow-sm placeholder:text-stone-400"
          />
        </div>
      </div>

      {/* 3. Lưới hiển thị dữ liệu / 5. Empty State */}
      {filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center bg-white rounded-2xl border border-stone-200/60 shadow-sm border-dashed">
          <div className="w-24 h-24 bg-[#FAF9F5] rounded-full flex items-center justify-center text-[#183A2D] mb-5 border-4 border-white shadow-sm">
            <Box size={40} strokeWidth={1.5} />
          </div>
          <h3 className="text-xl font-bold text-stone-800 mb-2">Kho lưu trữ trống</h3>
          <p className="text-sm text-stone-500 max-w-md">
            Chưa có món đồ nào được đưa vào kho. Tủ đồ của bạn vẫn đang hoạt động năng suất!
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredItems.map((item) => (
            <div 
              key={item.id} 
              className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-stone-200/60 shadow-sm group hover:border-stone-300 transition-all"
            >
              {/* Image with grayscale/opacity for historical vibe */}
              <div className="relative shrink-0 overflow-hidden rounded-xl bg-stone-100">
                <img 
                  src={item.image} 
                  alt={item.name} 
                  className="w-full sm:w-32 h-32 object-cover grayscale-[0.8] opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500" 
                />
                <div className="absolute top-2 left-2 sm:hidden">
                  {getStatusBadge(item.status)}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 flex flex-col justify-center min-w-0">
                <div className="hidden sm:block mb-2">
                  {getStatusBadge(item.status)}
                </div>
                <h3 className="font-bold text-stone-800 text-base truncate">{item.name}</h3>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-stone-500">
                  <span>Giá: <strong className="text-stone-700">{item.price.toLocaleString()}đ</strong></span>
                  <span className="hidden sm:inline w-1 h-1 rounded-full bg-stone-300"></span>
                  <span>Đưa vào kho: {item.archivedDate}</span>
                </div>
              </div>

              {/* 4. Actions (Ghost Buttons) */}
              <div className="flex flex-row sm:flex-col gap-2 w-full sm:w-auto shrink-0 mt-2 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                <button onClick={() => openDetailDrawer(item.id)} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-stone-600 hover:text-[#183A2D] hover:bg-[#183A2D]/5 rounded-xl transition-colors border border-transparent">
                  <Eye size={16} /> Xem chi tiết
                </button>
                <button onClick={() => openRelistModal(item)} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 rounded-xl transition-colors border border-transparent">
                  <RefreshCw size={16} /> Đăng bán lại
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DRAWER XEM CHI TIẾT */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsDrawerOpen(false)} />
          
          {/* Drawer Panel */}
          <div className="relative w-full max-w-md bg-[#FAF9F5] h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between p-6 bg-white border-b border-stone-200">
              <h2 className="text-lg font-bold text-[#183A2D]">Hồ sơ lưu trữ</h2>
              <button onClick={() => setIsDrawerOpen(false)} className="p-2 bg-stone-100 hover:bg-stone-200 rounded-full text-stone-600 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {isDetailLoading ? (
                // Skeleton Loading
                <div className="space-y-6 animate-pulse">
                  <div className="h-48 bg-stone-200 rounded-2xl w-full"></div>
                  <div className="space-y-3">
                    <div className="h-6 bg-stone-200 rounded-md w-3/4"></div>
                    <div className="h-4 bg-stone-200 rounded-md w-1/2"></div>
                  </div>
                  <div className="h-32 bg-stone-200 rounded-2xl w-full mt-4"></div>
                  <div className="h-32 bg-stone-200 rounded-2xl w-full"></div>
                </div>
              ) : selectedDetail ? (
                <>
                  {/* Block 1: Snapshot */}
                  <div className="bg-white rounded-2xl border border-stone-200/60 p-4 shadow-sm relative overflow-hidden">
                    <div className="absolute top-4 right-4 z-10 opacity-90 transform rotate-12">
                      <div className="border-2 border-red-500 text-red-500 font-bold uppercase tracking-widest text-[10px] px-2 py-1 rounded">Lưu trữ</div>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-24 h-32 rounded-lg overflow-hidden bg-stone-100 shrink-0">
                        <img src={selectedDetail.snapshot.image} alt={selectedDetail.snapshot.name} className="w-full h-full object-cover grayscale opacity-80" />
                      </div>
                      <div className="flex flex-col justify-center">
                        <h3 className="font-bold text-stone-800 text-sm">{selectedDetail.snapshot.name}</h3>
                        <div className="mt-2 space-y-1 text-xs text-stone-600">
                          <p><span className="text-stone-400">Phân loại:</span> {selectedDetail.snapshot.category}</p>
                          <p><span className="text-stone-400">Size:</span> {selectedDetail.snapshot.size} • <span className="text-stone-400">Brand:</span> {selectedDetail.snapshot.brand}</p>
                          <p><span className="text-stone-400">Tình trạng:</span> {selectedDetail.snapshot.condition}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Block 2: Timeline / Audit Log */}
                  <div className="bg-white rounded-2xl border border-stone-200/60 p-5 shadow-sm">
                    <div className="flex items-center gap-2 text-[#183A2D] font-bold mb-4">
                      <Clock size={18} /> <h3>Dòng thời gian</h3>
                    </div>
                    <div className="relative pl-4 border-l-2 border-stone-100 space-y-6">
                      <div className="relative">
                        <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-stone-300 border-2 border-white"></div>
                        <p className="text-xs text-stone-500 mb-0.5">{selectedDetail.timeline.publishDate}</p>
                        <p className="text-sm font-medium text-stone-800">Đăng sản phẩm lên Tủ đồ</p>
                      </div>
                      <div className="relative">
                        <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white"></div>
                        <p className="text-xs text-stone-500 mb-0.5">{selectedDetail.timeline.archiveDate}</p>
                        <p className="text-sm font-medium text-stone-800">Cất vào kho lưu trữ</p>
                        <p className="text-xs text-stone-500 mt-1 italic">Lý do: {selectedDetail.timeline.reason}</p>
                        
                        {selectedDetail.timeline.partner && (
                          <div className="mt-3 flex items-center gap-2 p-2 bg-stone-50 rounded-lg border border-stone-100">
                            <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold">
                              {selectedDetail.timeline.partner.avatar}
                            </div>
                            <span className="text-xs font-medium text-stone-700">Giao dịch với: {selectedDetail.timeline.partner.name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Block 3: Dòng tiền */}
                  <div className="bg-white rounded-2xl border border-stone-200/60 p-5 shadow-sm">
                    <div className="flex items-center gap-2 text-[#183A2D] font-bold mb-4">
                      <DollarSign size={18} /> <h3>Dòng tiền (Kế toán)</h3>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-stone-500">Giá niêm yết</span>
                        <span className="font-medium">{selectedDetail.financials.listingPrice.toLocaleString()}đ</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-stone-500">Phí nền tảng</span>
                        <span className="text-red-500 font-medium">- {selectedDetail.financials.platformFee.toLocaleString()}đ</span>
                      </div>
                      <div className="pt-3 mt-3 border-t border-stone-100 flex justify-between items-center">
                        <span className="font-bold text-stone-800">Thực nhận vào Ví Lá</span>
                        <span className="text-xl font-bold text-emerald-600">+{selectedDetail.financials.netToWallet.toLocaleString()}đ</span>
                      </div>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
            
            <div className="p-4 bg-white border-t border-stone-200">
              <button onClick={() => setIsDrawerOpen(false)} className="w-full py-3 bg-stone-100 text-stone-700 font-bold rounded-xl hover:bg-stone-200 transition-colors">
                Đóng hồ sơ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ĐĂNG BÁN LẠI */}
      {isRelistModalOpen && relistData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsRelistModalOpen(false)} />
          <div className="relative bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center border-b border-stone-100">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <RefreshCw size={24} />
              </div>
              <h2 className="text-xl font-bold text-[#183A2D]">Bắt đầu vòng đời mới</h2>
              <p className="text-sm text-stone-500 mt-1">Đăng bán lại món đồ này vào Tủ đồ công khai</p>
            </div>
            
            <form onSubmit={handleRelistSubmit} className="p-6 space-y-5">
              <div className="flex gap-4 p-4 bg-stone-50 rounded-2xl border border-stone-100">
                <img src={relistData.image} className="w-16 h-20 object-cover rounded-lg" />
                <div>
                  <h4 className="font-bold text-sm text-stone-800">{relistData.name}</h4>
                  <p className="text-xs text-stone-500 mt-1">Hệ thống đã điền sẵn thông tin cũ để tiết kiệm thời gian cho bạn.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Giá đăng bán mới (VNĐ)</label>
                  <div className="relative">
                    <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input 
                      type="number" 
                      name="newPrice"
                      defaultValue={relistData.price}
                      className="w-full pl-10 pr-4 py-3 bg-white border border-stone-200 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all font-medium text-stone-800"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsRelistModalOpen(false)} className="flex-1 py-3 text-stone-600 font-bold bg-stone-100 rounded-xl hover:bg-stone-200 transition-colors">Hủy</button>
                <button type="submit" className="flex-1 py-3 text-white font-bold bg-[#183A2D] rounded-xl hover:bg-[#112a20] shadow-md transition-colors">Xác nhận đăng</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
