"use client";

import { supabase } from "@/src/lib/supabase";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SignedShippingQuote } from "@/src/utils/shipping";
import { 
  Loader2, ShieldCheck, MapPin, Calendar, Clock, Sparkles, 
  Check, ArrowRight, User, Phone, Home, Shirt, Tag, AlertCircle, Navigation, Package 
} from "lucide-react";
import Image from "next/image";

export default function CheckoutClient({
  product,
  productId,
  fromProvince,
  weight,
  depositPrice,
  pricingTiers,
  turnaroundDays,
}: {
  product: any;
  productId: string;
  fromProvince: string;
  weight: number;
  depositPrice: number;
  pricingTiers: any[];
  turnaroundDays: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Nhận tham số từ trang Chi tiết sản phẩm để thông mạch liền mạch 100%
  const urlPackage = Number(searchParams.get("package")) || 3;
  const urlStartDate = searchParams.get("startDate") || new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const urlType = searchParams.get("type") || "rent";
  const isRental = urlType !== "sell";

  const [recipientName, setRecipientName] = useState("");
  const [phone, setPhone] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  
  // GHN Address States
  const [provinces, setProvinces] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);
  
  const [selectedProvince, setSelectedProvince] = useState<{ id: string; name: string } | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<{ id: string; name: string } | null>(null);
  const [selectedWard, setSelectedWard] = useState<{ id: string; name: string } | null>(null);

  const [shippingQuotes, setShippingQuotes] = useState<SignedShippingQuote[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<SignedShippingQuote | null>(null);
  
  // Gói thuê & Lịch (Khởi tạo chuẩn xác từ lựa chọn của khách ở trang sản phẩm)
  const initialTier = pricingTiers.find(t => t.days === urlPackage) || pricingTiers[1] || pricingTiers[0];
  const [selectedTier, setSelectedTier] = useState<any>(initialTier);
  const [startDate, setStartDate] = useState<string>(urlStartDate);

  const [isLoadingShipping, setIsLoadingShipping] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isLocatingGPS, setIsLocatingGPS] = useState(false);
  const [error, setError] = useState("");

  // Nạp thông tin người dùng đang đăng nhập để tự động điền sẵn
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        if (user.user_metadata?.name) setRecipientName(user.user_metadata.name);
        if (user.phone) setPhone(user.phone);
      }
    });
  }, []);

  // Fetch Danh sách Tỉnh/Thành phố
  useEffect(() => {
    fetch("/api/shipping/address?type=province")
      .then(res => res.json())
      .then(data => {
        if (data.data) setProvinces(data.data);
      })
      .catch(console.error);
  }, []);

  // Fetch Quận/Huyện khi chọn Tỉnh
  useEffect(() => {
    if (!selectedProvince) return;
    setDistricts([]);
    setWards([]);
    setSelectedDistrict(null);
    setSelectedWard(null);
    fetch(`/api/shipping/address?type=district&province_id=${selectedProvince.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.data) setDistricts(data.data);
      })
      .catch(console.error);
  }, [selectedProvince]);

  // Fetch Phường/Xã khi chọn Huyện
  useEffect(() => {
    if (!selectedDistrict) return;
    setWards([]);
    setSelectedWard(null);
    fetch(`/api/shipping/address?type=ward&district_id=${selectedDistrict.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.data) setWards(data.data);
      })
      .catch(console.error);
  }, [selectedDistrict]);

  // Tự động tính cước GHN khi đã chọn xong Phường/Xã
  useEffect(() => {
    if (selectedProvince && selectedDistrict && selectedWard) {
      handleFetchShipping();
    }
  }, [selectedWard]);

  // Định vị vị trí hiện tại qua GPS (Shopee & TikTok Standard)
  const handleGPSLocation = async () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      alert("Trình duyệt của bạn không hỗ trợ định vị GPS!");
      return;
    }

    setIsLocatingGPS(true);
    setError("");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;

          // Sử dụng OpenStreetMap Nominatim Reverse Geocoding miễn phí
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`);
          const data = await res.json();

          if (data && data.address) {
            const addr = data.address;
            const detectedProvinceName = addr.city || addr.province || addr.state || "";
            const road = addr.road || addr.suburb || "";
            const houseNumber = addr.house_number || "";

            if (road || houseNumber) {
              setAddressDetail(`${houseNumber ? houseNumber + ' ' : ''}${road}`.trim());
            }

            // Tự động khớp tỉnh thành
            const matchedProv = provinces.find((p: any) => 
              detectedProvinceName.toLowerCase().includes(p.ProvinceName.toLowerCase()) ||
              p.ProvinceName.toLowerCase().includes(detectedProvinceName.toLowerCase())
            );

            if (matchedProv) {
              setSelectedProvince({ id: matchedProv.ProvinceID, name: matchedProv.ProvinceName });
            }
          }
        } catch (err) {
          console.error("Lỗi GPS Geocoding:", err);
        } finally {
          setIsLocatingGPS(false);
        }
      },
      (err) => {
        setIsLocatingGPS(false);
        alert("Không thể truy cập GPS. Vui lòng cho phép quyền vị trí trong trình duyệt hoặc chọn trực tiếp bên dưới!");
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleFetchShipping = async () => {
    if (!selectedProvince || !selectedDistrict || !selectedWard) return;
    
    setError("");
    setIsLoadingShipping(true);
    
    const fullToProvinceStr = `${selectedWard.name}, ${selectedDistrict.name}, ${selectedProvince.name}`;

    try {
      const res = await fetch("/api/shipping/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromProvince: fromProvince || product.province || "Hà Nội", toProvince: fullToProvinceStr, weight }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi tính phí giao hàng");
      
      setShippingQuotes(data.options || []);
      if (data.options && data.options.length > 0) {
        setSelectedQuote(data.options[0]);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoadingShipping(false);
    }
  };

  const handleCheckout = async () => {
    if (isRental && !startDate) {
      setError("Vui lòng chọn ngày bắt đầu nhận đồ.");
      return;
    }
    if (!selectedProvince || !selectedDistrict || !selectedWard) {
      setError("Vui lòng chọn đầy đủ Tỉnh/Thành phố, Quận/Huyện và Phường/Xã.");
      return;
    }
    if (!addressDetail.trim() || addressDetail.trim().length < 3) {
      setError("Vui lòng nhập địa chỉ chi tiết (Số nhà, tên đường, tòa nhà...)");
      return;
    }
    if (!phone.trim()) {
      setError("Vui lòng nhập số điện thoại người nhận hàng.");
      return;
    }
    
    const phoneClean = phone.replace(/[\s.-]+/g, "");
    const phoneRegex = /(84|0[3|5|7|8|9])+([0-9]{8})\b/;
    if (!phoneRegex.test(phoneClean)) {
      setError("Số điện thoại không hợp lệ (Ví dụ: 0987654321).");
      return;
    }

    if (!selectedQuote) {
      setError("Đang kết nối cước vận chuyển GHN, vui lòng đợi 1 giây!");
      return;
    }

    setError("");
    setIsProcessingPayment(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) {
        throw new Error("Vui lòng đăng nhập để hoàn tất thanh toán");
      }

      const fullToProvinceStr = `${selectedWard.name}, ${selectedDistrict.name}, ${selectedProvince.name}`;
      const payload = {
        productId,
        userId,
        shippingToken: selectedQuote.token,
        buyerAddress: `${addressDetail}, ${fullToProvinceStr}`,
        buyerPhone: phoneClean,
        startDate: startDate,
        packageDays: selectedTier?.days || 3
      };

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Lỗi khởi tạo cổng thanh toán");
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch (err: any) {
      setError(err.message);
      setIsProcessingPayment(false);
    }
  };

  const rentalFee = isRental ? (selectedTier?.price || 0) : (product.listings?.[0]?.salePrice || product.listings?.[0]?.basePrice || 0);
  const actualDeposit = isRental ? depositPrice : 0;
  const shippingFee = selectedQuote?.quote.fee || 0;
  const totalAmount = rentalFee + actualDeposit + shippingFee;

  const calculateEndDate = () => {
    if (!startDate || !selectedTier) return "";
    const start = new Date(startDate);
    const end = new Date(start.getTime() + ((selectedTier?.days || 1) - 1) * 86400000);
    return end.toLocaleDateString('vi-VN');
  };

  return (
    <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      
      {/* ========================================================
          CỘT TRÁI (5/12): HÓA ĐƠN ĐẶT ĐỒ & THÔNG TIN CHỦ TỦ
      ======================================================== */}
      <div className="lg:col-span-5 bg-white p-6 sm:p-7 rounded-2xl shadow-xs border border-[#E9E2D8] space-y-5 text-[#183A2D] font-body">
        
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-800 bg-[#EAF2EC] px-2.5 py-1 rounded-md border border-emerald-200/60 font-ui">
            ĐƠN ĐẶT {isRental ? "THUÊ" : "MUA"} TUẦN HOÀN
          </span>
          <h2 className="font-heading text-xl font-bold text-[#0A2517] mt-2">
            Tóm Tắt Đơn Hàng
          </h2>
        </div>
        
        {/* Thông tin Món Đồ & Chủ Tủ (Chính xác 100% từ Database) */}
        <div className="flex gap-4 pb-4 border-b border-stone-100">
          <div className="relative w-24 h-32 rounded-xl overflow-hidden bg-[#FAF9F5] border border-[#E9E2D8] shrink-0">
            <Image 
              src={product.images?.[0]?.url || product.image || "/placeholder-clothing.png"} 
              alt={product.title} 
              fill 
              className="object-cover" 
              unoptimized 
            />
          </div>
          
          <div className="flex flex-col justify-between py-0.5">
            <div>
              <h3 className="font-heading font-bold text-sm text-[#0A2517] leading-snug line-clamp-2">
                {product.title}
              </h3>
              
              <div className="flex flex-wrap gap-1.5 mt-2">
                {product.size && (
                  <span className="text-[9.5px] font-bold text-stone-600 bg-stone-100 px-2 py-0.5 rounded font-ui">
                    Size {product.size}
                  </span>
                )}
                {product.condition && (
                  <span className="text-[9.5px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded font-ui">
                    {product.condition === "GOOD" ? "Mới 95%" : "Mới 98%"}
                  </span>
                )}
                {product.material && (
                  <span className="text-[9.5px] text-stone-500 bg-stone-50 px-2 py-0.5 rounded font-ui">
                    {product.material}
                  </span>
                )}
              </div>

              <p className="text-[11px] text-stone-500 mt-2 font-body">
                Chủ tủ: <strong className="text-stone-800 font-semibold">{product.user?.name || "Thành viên CLOOP"}</strong>
              </p>
              <p className="text-[11px] text-stone-500 font-body flex items-center gap-1 mt-0.5">
                <MapPin size={11} className="text-emerald-700 shrink-0" /> Giao từ: {product.province || fromProvince || "Toàn quốc"}
              </p>
            </div>
          </div>
        </div>
        
        {/* Bảng Kê Chi Phí Đồng Bộ Thời Gian Thực */}
        {/* Bảng Kê Chi Phí Đồng Bộ Thời Gian Thực (Chuẩn Tâm Lý Học TMĐT) */}
        <div className="space-y-3 font-ui text-xs text-stone-600">
          
          <div className="flex justify-between items-center py-0.5">
            <span className="font-medium text-stone-800 flex items-center gap-1.5">
              <Clock size={13} className="text-emerald-800" />
              {isRental ? `Chi phí gói thuê (${selectedTier?.days || 1} ngày):` : "Giá sản phẩm:"}
            </span>
            <span className="font-bold font-mono text-sm text-[#0A2517]">
              {rentalFee.toLocaleString('vi-VN')}đ
            </span>
          </div>

          {isRental && actualDeposit > 0 && (
            <div className="flex justify-between items-center text-amber-900 bg-amber-50/70 p-2.5 rounded-xl border border-amber-200/60">
              <div>
                <p className="font-bold flex items-center gap-1">
                  <ShieldCheck size={13} className="text-amber-700" /> Tiền cọc Két Escrow:
                </p>
                <span className="text-[9.5px] text-amber-700">Tự động hoàn trả 100% khi trả váy</span>
              </div>
              <span className="font-bold font-mono text-sm">+{actualDeposit.toLocaleString('vi-VN')}đ</span>
            </div>
          )}

          <div className="flex justify-between items-center py-0.5">
            <span className="flex items-center gap-1.5">
              <span>Cước vận chuyển (GHN):</span>
            </span>
            <div className="flex items-center gap-1.5 font-mono">
              {selectedQuote?.quote.originalFee && (
                <span className="text-stone-400 line-through text-[11px]">{selectedQuote.quote.originalFee.toLocaleString('vi-VN')}đ</span>
              )}
              <span className="font-bold font-mono text-stone-800">
                {isLoadingShipping ? "Đang tính..." : selectedQuote ? `+${shippingFee.toLocaleString('vi-VN')}đ` : "Chưa chọn địa chỉ"}
              </span>
            </div>
          </div>

          {/* Phân tách biểu phí: Phí dịch vụ 0% Founding 100 */}
          <div className="flex justify-between items-center py-0.5">
            <span>Phí dịch vụ tuần hoàn (CLOOP):</span>
            <div className="flex items-center gap-1.5">
              <span className="text-stone-400 line-through font-mono text-[11px]">12%</span>
              <span className="font-bold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded text-[9.5px] font-ui">
                0% (FOUNDING 100)
              </span>
            </div>
          </div>

          {/* Phân tách biểu phí: Phí cổng thanh toán / Ngân hàng */}
          <div className="flex justify-between items-center py-0.5">
            <span>Phí cổng thanh toán VietQR (ACB):</span>
            <span className="font-bold text-emerald-800 text-[11px] font-ui">
              0đ (CLOOP Trợ giá)
            </span>
          </div>

          {/* Khóa dòng tiền bằng CloopCoins */}
          <div className="flex justify-between items-center py-1.5 bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-200/50 text-emerald-950">
            <span className="flex items-center gap-1.5 text-[11px] font-medium">
              <Sparkles size={13} className="text-emerald-700 shrink-0" />
              Thưởng Xu Lá khi trả đồ đúng hạn:
            </span>
            <span className="font-bold font-mono text-xs text-emerald-800">
              +15.000 Xu Lá
            </span>
          </div>

          {/* Tổng Hóa Đơn */}
          <div className="pt-3.5 border-t border-stone-200 flex justify-between items-baseline">
            <div>
              <span className="text-xs uppercase font-bold text-stone-500 tracking-wider">Tổng thanh toán:</span>
              <p className="text-[10px] text-stone-400">Bao gồm cọc hoàn lại & phí ship</p>
            </div>
            <span className="font-heading text-2xl font-black text-[#183A2D] font-mono">
              {totalAmount.toLocaleString('vi-VN')}đ
            </span>
          </div>
        </div>

        {/* Cam Kết Bảo Chứng */}
        <div className="bg-[#FAF9F5] p-3.5 rounded-xl border border-[#E9E2D8] text-[11px] text-stone-600 space-y-1 font-body">
          <p className="font-bold text-[#183A2D] flex items-center gap-1.5">
            <Sparkles size={12} className="text-emerald-700" /> Cam Kết Bảo Chứng CLOOP
          </p>
          <p className="text-stone-500 leading-relaxed font-light text-[10.5px]">
            Tiền của bạn được khóa an toàn tại Két Escrow và chỉ giải ngân cho chủ tủ khi bạn đã nhận đúng mẫu, đúng size và hoàn tất thời gian trải nghiệm.
          </p>
        </div>

        {/* Quy chuẩn đóng gói bảo vệ cước */}
        <div className="bg-[#F8FAF8] p-3 rounded-xl border border-emerald-200/60 text-[10.5px] text-stone-600 space-y-1 font-body">
          <p className="font-bold text-emerald-950 flex items-center gap-1.5 font-ui">
            <Package size={13} className="text-emerald-700" /> Quy Cách Đóng Gói Chuẩn
          </p>
          <p className="text-stone-500 leading-relaxed font-light">
            Chủ tủ đóng gói tiêu chuẩn bằng túi niêm phong PE dẻo gọn nhẹ (&lt;500g) kèm tem niêm phong CLOOP để tối ưu cước phí và bảo vệ trang phục suốt lộ trình.
          </p>
        </div>

      </div>

      {/* ========================================================
          CỘT PHẢI (7/12): FORM GIAO NHẬN, LỊCH THUÊ & THANH TOÁN
      ======================================================== */}
      <div className="lg:col-span-7 bg-white p-6 sm:p-7 rounded-2xl shadow-xs border border-[#E9E2D8] flex flex-col space-y-5 text-[#183A2D] font-body">
        
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-800 bg-[#EAF2EC] px-2.5 py-1 rounded-md border border-emerald-200/60 font-ui">
            THÔNG TIN GIAO NHẬN
          </span>
          <h2 className="font-heading text-xl font-bold text-[#0A2517] mt-2">
            Lịch Thuê & Địa Chỉ Nhận Hàng
          </h2>
        </div>
        
        {/* 1. CHỌN GÓI THUÊ THÔNG MINH */}
        {isRental && (
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 font-ui">
              1. Gói Thuê Trải Nghiệm
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {pricingTiers.map((tier, idx) => {
                const isSelected = selectedTier?.days === tier.days;
                return (
                  <div 
                    key={idx}
                    onClick={() => setSelectedTier(tier)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      isSelected 
                        ? 'border-[#183A2D] bg-[#F4F9F5] shadow-2xs ring-1 ring-[#183A2D]' 
                        : 'border-stone-200 hover:border-stone-300 bg-[#FAF9F5]'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="font-ui font-bold text-xs text-[#0A2517]">{tier.name}</span>
                      </div>
                      <p className="text-[10px] text-stone-500 line-clamp-1">{tier.description}</p>
                    </div>
                    <div className="pt-2 mt-2 border-t border-stone-200/60 flex justify-between items-baseline">
                      <span className="text-[10px] font-bold text-emerald-800 font-mono">{tier.days} ngày</span>
                      <span className="font-bold text-sm font-mono text-[#183A2D]">{tier.price.toLocaleString('vi-VN')}đ</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. CHỌN LỊCH DỰ KIẾN */}
        {isRental && (
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 font-ui">
              2. Lịch Dự Kiến Nhận & Trả Trang Phục
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10.5px] text-stone-500 mb-1">Ngày bắt đầu nhận đồ:</label>
                <input 
                  type="date"
                  value={startDate}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-stone-200 rounded-xl font-ui text-xs font-medium focus:outline-none focus:border-[#183A2D] bg-[#FAF9F5] text-[#183A2D]"
                />
              </div>
              <div className="bg-[#FAF9F5] px-3.5 py-2 rounded-xl border border-stone-200 flex flex-col justify-center">
                <span className="text-[10px] text-stone-400 font-ui uppercase tracking-wider">Hạn hoàn trả đồ:</span>
                <span className="text-xs font-bold text-[#183A2D] font-mono mt-0.5">
                  📅 {calculateEndDate() || "Vui lòng chọn ngày bắt đầu"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 3. ĐỊA CHỈ NHẬN HÀNG (TIÊU CHUẨN SHOPEE/TIKTOK + GPS ĐỊNH VỊ) */}
        <div className="space-y-3 pt-2 border-t border-stone-100">
          <div className="flex justify-between items-center">
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 font-ui">
              {isRental ? "3. Địa Chỉ Nhận Hàng Tận Nhà (Tính Cước GHN)" : "1. Địa Chỉ Giao Hàng"}
            </label>
            
            {/* Nút định vị GPS 1 chạm (TikTok / Shopee Standard) */}
            <button
              type="button"
              onClick={handleGPSLocation}
              disabled={isLocatingGPS}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-[#EAF2EC] hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200/60 font-ui transition-colors cursor-pointer disabled:opacity-60"
            >
              {isLocatingGPS ? (
                <>
                  <Loader2 size={12} className="animate-spin text-emerald-700" />
                  <span>Đang định vị...</span>
                </>
              ) : (
                <>
                  <Navigation size={12} className="text-emerald-700" />
                  <span>📍 Định vị GPS (Tự điền)</span>
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <select
              value={selectedProvince?.id || ""}
              onChange={(e) => {
                const p = provinces.find((x) => String(x.ProvinceID) === String(e.target.value));
                setSelectedProvince(p ? { id: p.ProvinceID, name: p.ProvinceName } : null);
              }}
              className="w-full px-3 py-2.5 border border-stone-200 rounded-xl font-ui text-xs focus:outline-none focus:border-[#183A2D] bg-[#FAF9F5] text-[#183A2D]"
            >
              <option value="">-- Tỉnh / Thành phố --</option>
              {provinces.map((p) => (
                <option key={p.ProvinceID} value={p.ProvinceID}>{p.ProvinceName}</option>
              ))}
            </select>

            <select
              value={selectedDistrict?.id || ""}
              onChange={(e) => {
                const d = districts.find((x) => String(x.DistrictID) === String(e.target.value));
                setSelectedDistrict(d ? { id: d.DistrictID, name: d.DistrictName } : null);
              }}
              disabled={!selectedProvince}
              className="w-full px-3 py-2.5 border border-stone-200 rounded-xl font-ui text-xs focus:outline-none focus:border-[#183A2D] bg-[#FAF9F5] text-[#183A2D] disabled:opacity-50 disabled:bg-stone-100"
            >
              <option value="">-- Quận / Huyện --</option>
              {districts.map((d) => (
                <option key={d.DistrictID} value={d.DistrictID}>{d.DistrictName}</option>
              ))}
            </select>

            <select
              value={selectedWard?.id || ""}
              onChange={(e) => {
                const w = wards.find((x) => String(x.WardCode) === String(e.target.value));
                setSelectedWard(w ? { id: w.WardCode, name: w.WardName } : null);
              }}
              disabled={!selectedDistrict}
              className="w-full px-3 py-2.5 border border-stone-200 rounded-xl font-ui text-xs focus:outline-none focus:border-[#183A2D] bg-[#FAF9F5] text-[#183A2D] disabled:opacity-50 disabled:bg-stone-100"
            >
              <option value="">-- Phường / Xã --</option>
              {wards.map((w) => (
                <option key={w.WardCode} value={w.WardCode}>{w.WardName}</option>
              ))}
            </select>
          </div>

          {isLoadingShipping && (
            <div className="text-xs text-emerald-800 flex items-center gap-2 font-ui animate-pulse">
              <Loader2 size={13} className="animate-spin" /> Đang tính cước phí vận chuyển GHN tối ưu nhất...
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-stone-600 mb-1 font-ui">Số nhà, tên đường *</label>
              <input 
                type="text" 
                placeholder="Ví dụ: 124 Lê Lợi, Tòa A..."
                value={addressDetail}
                onChange={(e) => setAddressDetail(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-stone-200 rounded-xl font-ui text-xs focus:outline-none focus:border-[#183A2D] bg-[#FAF9F5] text-[#183A2D]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-stone-600 mb-1 font-ui">Số điện thoại nhận hàng *</label>
              <input 
                type="tel" 
                placeholder="Ví dụ: 0987654321..."
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-stone-200 rounded-xl font-ui text-xs font-mono focus:outline-none focus:border-[#183A2D] bg-[#FAF9F5] text-[#183A2D]"
              />
            </div>
          </div>
        </div>

        {/* THÔNG BÁO LỖI NẾU THIẾU THÔNG TIN */}
        {error && (
          <div className="text-red-700 text-xs font-ui p-3 bg-red-50 rounded-xl border border-red-200 flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* NÚT BẤM THANH TOÁN VIETQR PAYOS */}
        <div className="pt-2 mt-auto">
          <button 
            type="button"
            onClick={handleCheckout}
            disabled={isProcessingPayment}
            className="w-full py-4 bg-[#183A2D] hover:bg-[#0A2517] text-white rounded-2xl font-ui font-bold text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md disabled:opacity-50 cursor-pointer"
          >
            {isProcessingPayment ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Đang Tạo Mã VietQR PayOS...
              </>
            ) : (
              <>
                Xác Nhận & Thanh Toán VietQR ({totalAmount.toLocaleString('vi-VN')}đ) ➔
              </>
            )}
          </button>
          
          <p className="text-center text-[10.5px] text-stone-400 mt-2.5 font-ui">
            Chuyển khoản an toàn 24/7 qua mã VietQR Ngân hàng ACB • Hộ chiếu số bảo chứng
          </p>
        </div>

      </div>

    </div>
  );
}
