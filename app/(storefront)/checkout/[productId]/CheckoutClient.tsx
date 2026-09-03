"use client";

import { createClient } from "@/src/utils/supabase/client";
import { useAuthModal } from "@/app/AuthModalContext";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SignedShippingQuote } from "@/src/utils/shipping";
import {
  Loader2, ShieldCheck, MapPin, Calendar, Clock,
  Check, ArrowRight, User, Phone, Home, Shirt, Tag, AlertCircle, Navigation, Package, Truck,
  Copy, CheckCircle2, ExternalLink, QrCode, X
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
  const supabase = createClient();
  const { setShowAuthModal } = useAuthModal();

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

  // State Modal Thanh Toán VietQR Nội Bộ
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentData, setPaymentData] = useState<{
    orderCode: number;
    checkoutUrl: string;
    qrCode?: string;
    accountNumber?: string;
    accountName?: string;
    bin?: string;
    amount: number;
    description: string;
  } | null>(null);
  const [isPaidSuccess, setIsPaidSuccess] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // ⚡ Tự động quét giao dịch PayOS theo thời gian thực (In-App Realtime Settlement)
  useEffect(() => {
    if (!showPaymentModal || !paymentData?.orderCode || isPaidSuccess) return;

    const interval = setInterval(async () => {
      try {
        const { checkAndSyncPaymentStatusAction } = await import("@/app/actions/payment");
        const res = await checkAndSyncPaymentStatusAction(paymentData.orderCode);
        if (res.success && res.isPaid) {
          setIsPaidSuccess(true);
          clearInterval(interval);
          setTimeout(() => {
            router.push("/my-closet/orders");
          }, 1800);
        }
      } catch (e) {
        console.error("Polling payment status error:", e);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [showPaymentModal, paymentData, isPaidSuccess, router]);

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Nạp thông tin người dùng đang đăng nhập để tự động điền sẵn
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        if (user.user_metadata?.name || user.user_metadata?.full_name) {
          setRecipientName(user.user_metadata?.name || user.user_metadata?.full_name || "");
        }
        if (user.phone) setPhone(user.phone);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        if (session.user.user_metadata?.name || session.user.user_metadata?.full_name) {
          setRecipientName(session.user.user_metadata?.name || session.user.user_metadata?.full_name || "");
        }
        if (session.user.phone) setPhone(session.user.phone);
        setError("");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
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
        body: JSON.stringify({
          fromProvince: fromProvince || product.province || "Hà Nội",
          toProvince: fullToProvinceStr,
          fromDistrictId: (product as any)?.districtId,
          fromWardCode: (product as any)?.wardCode,
          toDistrictId: selectedDistrict.id,
          toWardCode: selectedWard.id || (selectedWard as any).code,
          weight,
          isRental: isRental
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi tính phí giao hàng");

      setShippingQuotes(data.options || []);
      if (data.options && data.options.length > 0) {
        const ghnQuote = data.options.find((o: any) => o.quote?.serviceId === "standard") || data.options[0];
        setSelectedQuote(ghnQuote);
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
        setShowAuthModal(true);
        setError("Vui lòng đăng nhập hoặc kích hoạt ID Xanh để thanh toán (Đã mở hộp thoại đăng nhập).");
        setIsProcessingPayment(false);
        return;
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

      // Vận hành nội bộ: Mở Modal VietQR ngay trong trang web CLOOP (Không văng ra ngoài)
      setPaymentData({
        orderCode: data.orderCode,
        checkoutUrl: data.checkoutUrl,
        qrCode: data.qrCode,
        accountNumber: data.accountNumber,
        accountName: data.accountName,
        bin: data.bin,
        amount: data.amount || totalAmount,
        description: data.description || `CLOOP GD ${data.orderCode}`
      });
      setShowPaymentModal(true);
      setIsProcessingPayment(false);
    } catch (err: any) {
      setError(err.message);
      setIsProcessingPayment(false);
    }
  };

  // Phát hiện đơn liên tỉnh (VD: Hà Nội -> Nghệ An / TP.HCM)
  const originProvinceStr = (fromProvince || product.province || "Hà Nội").trim().toLowerCase();
  const isInterProvincial = Boolean(
    selectedProvince &&
    !originProvinceStr.includes(selectedProvince.name.trim().toLowerCase()) &&
    !selectedProvince.name.trim().toLowerCase().includes(originProvinceStr)
  );

  // Đơn liên tỉnh cần tối thiểu 3 ngày để xe tải GHN vận chuyển an toàn
  const minDaysBuffer = isInterProvincial ? 3 : 1;
  const earliestDateObj = new Date(Date.now() + minDaysBuffer * 86400000);
  const earliestStartDate = earliestDateObj.toISOString().slice(0, 10);

  // Tự động đẩy lùi startDate nếu nhỏ hơn earliestStartDate & chuyển gói 1 ngày sang gói 3 ngày khi liên tỉnh
  useEffect(() => {
    if (startDate && startDate < earliestStartDate) {
      setStartDate(earliestStartDate);
    }
    if (isInterProvincial && selectedTier?.days === 1) {
      const tier3 = pricingTiers.find(t => t.days === 3) || pricingTiers[1];
      if (tier3) setSelectedTier(tier3);
    }
  }, [isInterProvincial, earliestStartDate]);

  const rentalFee = isRental ? (selectedTier?.price || 0) : (product.listings?.[0]?.salePrice || product.listings?.[0]?.basePrice || 0);
  const actualDeposit = isRental ? depositPrice : 0;
  const rawShippingFee = selectedQuote?.quote.fee || 0;
  // 🛡️ Áp dụng chuẩn biên độ "Block 5K" (+10% rủi ro thể tích & làm tròn nhịp 5.000đ)
  const shippingFee = rawShippingFee > 0 ? Math.ceil(rawShippingFee / 5000) * 5000 : 0;
  const totalAmount = rentalFee + actualDeposit + shippingFee;

  // Format ngày tháng chuẩn VN đồng bộ 2 chữ số (dd/MM/yyyy)
  const formatDateVN = (dateInput: Date | string) => {
    if (!dateInput) return "";
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const calculateEndDate = () => {
    if (!startDate || !selectedTier) return "";
    const start = new Date(startDate);
    const end = new Date(start.getTime() + ((selectedTier?.days || 1) - 1) * 86400000);
    return formatDateVN(end);
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
            <div className="flex justify-between items-center text-amber-950 bg-amber-50/80 p-3 rounded-xl border border-amber-200/70">
              <div className="space-y-0.5">
                <p className="font-bold flex items-center gap-1.5 text-xs">
                  <ShieldCheck size={14} className="text-amber-700" /> Tiền cọc Két Escrow (Tạm giữ):
                </p>
                <span className="text-[10px] text-amber-800 block">Tự động hoàn trả 100% khi trả đồ nguyên vẹn</span>
                <span className="text-[9.5px] text-emerald-800 font-medium block">Đặc quyền VIP: Tích lũy 3 chuyến thuê xanh để tự động giảm 50% tiền cọc</span>
              </div>
              <span className="font-bold font-mono text-sm text-amber-900 shrink-0">+{actualDeposit.toLocaleString('vi-VN')}đ</span>
            </div>
          )}

          <div className="flex justify-between items-center py-0.5">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="block font-medium">Cước vận chuyển 2 chiều GHN:</span>
                <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/60 font-ui">
                  Block 5K
                </span>
              </div>
              <span className="text-[9.5px] text-stone-400 block">San sẻ 50/50: Khách trả chiều đi • Chiều trả đồ 0đ</span>
            </div>
            <span className="font-bold font-mono text-stone-800">
              {isLoadingShipping ? "Đang tính..." : selectedQuote ? (shippingFee === 0 ? "0đ (Trực tiếp)" : `+${shippingFee.toLocaleString('vi-VN')}đ`) : "Chưa chọn địa chỉ"}
            </span>
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
            <ShieldCheck size={13} className="text-emerald-800" /> Cam Kết Bảo Chứng CLOOP
          </p>
          <p className="text-stone-500 leading-relaxed font-light text-[10.5px]">
            Tiền của bạn được giữ an toàn tại Két Escrow và chỉ giải ngân cho chủ tủ khi bạn đã nhận đúng mẫu, đúng size và hoàn tất thời gian trải nghiệm.
          </p>
        </div>

        {/* Đóng gói xanh - Vận chuyển nhanh */}
        <div className="bg-[#F8FAF8] p-3.5 rounded-xl border border-emerald-200/60 text-[10.5px] text-stone-600 space-y-1.5 font-body">
          <p className="font-bold text-emerald-950 flex items-center gap-1.5 font-ui">
            <Package size={13} className="text-emerald-700" /> Đóng Gói Xanh - Vận Chuyển Nhanh
          </p>
          <p className="text-stone-600 leading-relaxed font-light">
            CLOOP khuyến khích bạn tái sử dụng túi giấy, túi vải hoặc túi niêm phong sạch có sẵn tại nhà. Hãy gấp gọn trang phục để giảm thiểu rác thải đóng gói.
          </p>
          <div className="pt-1 text-[10px] text-emerald-800 font-medium">
            Gói hàng nhỏ gọn (&lt;500g) giúp giảm phát thải CO2 và tối ưu chi phí giao nhận.
          </div>
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
            <div className="flex justify-between items-center">
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 font-ui">
                1. Gói Thuê Trải Nghiệm
              </label>
              {isInterProvincial && (
                <span className="text-[10px] text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60 font-ui">
                  Giao liên tỉnh (Hà Nội → {selectedProvince?.name})
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {pricingTiers.map((tier, idx) => {
                const isSelected = selectedTier?.days === tier.days;
                const isOneDayDisabled = isInterProvincial && tier.days === 1;

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      if (isOneDayDisabled) {
                        alert(`Gói Hỏa Tốc 1 ngày chỉ áp dụng cho đơn cùng tỉnh/thành phố (${fromProvince || product.province || "Hà Nội"}). Đơn hàng gửi về ${selectedProvince?.name} cần tối thiểu 2-3 ngày vận chuyển nên bạn vui lòng chọn gói 3 ngày hoặc 7 ngày nhé!`);
                        return;
                      }
                      setSelectedTier(tier);
                    }}
                    className={`p-3 rounded-xl border transition-all flex flex-col justify-between ${
                      isOneDayDisabled
                        ? 'opacity-45 bg-stone-100 border-stone-200 cursor-not-allowed'
                        : isSelected
                          ? 'border-[#183A2D] bg-[#F4F9F5] shadow-2xs ring-1 ring-[#183A2D] cursor-pointer'
                          : 'border-stone-200 hover:border-stone-300 bg-[#FAF9F5] cursor-pointer'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="font-ui font-bold text-xs text-[#0A2517]">{tier.name}</span>
                        {isOneDayDisabled ? (
                          <span className="text-[8.5px] font-bold text-amber-800 bg-amber-100 px-1 py-0.2 rounded font-ui">
                            Chỉ nội tỉnh
                          </span>
                        ) : tier.days === 7 ? (
                          <span className="text-[8.5px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded font-ui">
                            Giảm 30%
                          </span>
                        ) : tier.days === 3 ? (
                          <span className="text-[8.5px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded font-ui">
                            Tiết kiệm 15%
                          </span>
                        ) : null}
                      </div>
                      <p className="text-[10px] text-stone-500 line-clamp-1">{tier.description}</p>
                    </div>
                    <div className="pt-2 mt-2 border-t border-stone-200/60 flex justify-between items-baseline">
                      <div>
                        <span className="text-[10px] font-bold text-emerald-800 font-mono block">{tier.days} ngày</span>
                        <span className="text-[9px] text-stone-400 font-mono">~{Math.round(tier.price / tier.days / 1000)}k/ngày</span>
                      </div>
                      <span className="font-bold text-sm font-mono text-[#183A2D]">{tier.price.toLocaleString('vi-VN')}đ</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. LỊCH DỰ KIẾN NHẬN & TRẢ TRANG PHỤC */}
        {isRental && (
          <div className="space-y-3 pt-2">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 font-ui">
                2. Lịch Dự Kiến Nhận & Trả Trang Phục
              </label>
              <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60 font-ui">
                {selectedQuote?.quote.serviceId === "direct_pickup" ? "Gặp nhận đồ trong ngày" : isInterProvincial ? "Dự kiến 2-3 ngày vận chuyển GHN" : "Giao nhanh 24h nội tỉnh"}
              </span>
            </div>

            {/* Hộp Thông Báo Tiến Trình Vận Chuyển & Thời Gian Giao Dự Kiến (Shopee Standard) */}
            <div className="p-3.5 rounded-xl bg-[#FAF9F5] border border-[#E9E2D8] space-y-2.5">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center text-xs gap-1">
                <div className="flex items-center gap-1.5 text-stone-700">
                  <Truck size={14} className="text-emerald-700 shrink-0" />
                  <span>Lộ trình: <strong>{fromProvince || product.province || "Nghệ An"}</strong> → <strong>{selectedProvince?.name || "Địa chỉ nhận"}</strong></span>
                </div>
                <div className="text-[11px] text-emerald-800 font-medium font-mono">
                  Dự kiến giao: <strong>{formatDateVN(earliestDateObj)}</strong> {isInterProvincial && ` - ${formatDateVN(new Date(Date.now() + 3 * 86400000))}`}
                </div>
              </div>

              {/* Cam kết thời gian thuê chỉ tính từ lúc nhận đồ */}
              <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-lg p-2.5 flex items-start gap-2 text-[11px] text-emerald-950">
                <ShieldCheck size={15} className="text-emerald-700 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>Bảo chứng thời gian thuê (Chuẩn Shopee):</strong> Gói thuê <strong>{selectedTier?.days || 1} ngày</strong> chỉ bắt đầu tính giờ từ khi shipper giao đồ tận tay bạn. Toàn bộ thời gian bưu tá vận chuyển (1-3 ngày) đều <strong>hoàn toàn miễn phí</strong>!
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10.5px] text-stone-500 mb-1">Ngày bắt đầu mặc đồ (Dự kiến):</label>
                <input
                  type="date"
                  value={startDate}
                  min={earliestStartDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-stone-200 rounded-xl font-ui text-xs font-medium focus:outline-none focus:border-[#183A2D] bg-[#FAF9F5] text-[#183A2D]"
                />
              </div>
              <div className="bg-[#FAF9F5] px-3.5 py-2 rounded-xl border border-stone-200 flex flex-col justify-center">
                <span className="text-[10px] text-stone-400 font-ui uppercase tracking-wider">Hạn hoàn trả đồ (Gói {selectedTier?.days || 1} ngày):</span>
                <span className="text-xs font-bold text-[#183A2D] font-mono mt-0.5">
                  {calculateEndDate() || "Vui lòng chọn ngày bắt đầu"}
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

            {/* Nút định vị GPS 1 chạm */}
            <button
              type="button"
              onClick={handleGPSLocation}
              disabled={isLocatingGPS}
              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 bg-[#EAF2EC] hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200/60 font-ui transition-colors cursor-pointer disabled:opacity-60"
            >
              {isLocatingGPS ? (
                <>
                  <Loader2 size={12} className="animate-spin text-emerald-700" />
                  <span>Đang định vị...</span>
                </>
              ) : (
                <>
                  <Navigation size={12} className="text-emerald-700" />
                  <span>Định vị vị trí hiện tại</span>
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
              <Loader2 size={13} className="animate-spin" /> Đang kiểm tra phương thức vận chuyển...
            </div>
          )}

          {shippingQuotes.length > 0 && (
            <div className="space-y-2 pt-1">
              <label className="block text-[11px] font-bold text-stone-700 font-ui uppercase tracking-wider">
                Phương Thức Giao Nhận
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {shippingQuotes.map((sq, idx) => {
                  const isSelected = selectedQuote?.quote.serviceId === sq.quote.serviceId;
                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedQuote(sq)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                        isSelected
                          ? "bg-emerald-50/80 border-emerald-700 ring-1 ring-emerald-700 text-emerald-950 shadow-xs"
                          : "bg-white border-stone-200 hover:border-stone-300 text-stone-700"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-xs">{sq.quote.name}</span>
                        <span className="font-mono font-bold text-xs text-emerald-800 shrink-0 ml-1">
                          {sq.quote.fee === 0 ? "0đ (Miễn phí)" : `${sq.quote.fee.toLocaleString("vi-VN")}đ`}
                        </span>
                      </div>
                      <p className="text-[10.5px] text-stone-500 mt-1">{sq.quote.packagingNote}</p>
                    </div>
                  );
                })}
              </div>
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

      {/* ========================================================
          MODAL THANH TOÁN VIETQR NỘI BỘ (KHÔNG VĂNG TRANG WEB)
      ======================================================== */}
      {showPaymentModal && paymentData && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-[#E9E2D8] relative text-[#183A2D] max-h-[92vh] overflow-y-auto">

            {/* Nút đóng */}
            <button
              type="button"
              onClick={() => {
                if (isPaidSuccess) {
                  router.push("/my-closet/orders");
                } else {
                  setShowPaymentModal(false);
                }
              }}
              className="absolute top-5 right-5 text-stone-400 hover:text-stone-700 p-1.5 rounded-full hover:bg-stone-100 transition-colors"
            >
              <X size={20} />
            </button>

            {isPaidSuccess ? (
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto animate-bounce">
                  <CheckCircle2 size={36} />
                </div>
                <h3 className="font-heading text-2xl font-bold text-emerald-900">
                  THANH TOÁN THÀNH CÔNG!
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed max-w-xs mx-auto">
                  Hệ thống CLOOP đã xác nhận giao dịch <strong>#{paymentData.orderCode}</strong>. Tiền cọc đã được lưu an toàn tại Két Escrow.
                </p>
                <div className="pt-2 flex items-center justify-center gap-2 text-xs font-bold text-emerald-800 font-ui animate-pulse">
                  <Loader2 size={14} className="animate-spin" />
                  <span>Đang chuyển đến trang Quản lý Đơn Hàng...</span>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center space-y-1">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/60 font-ui inline-block">
                    KÉT ESCROW TỰ ĐỘNG KHÓA QUỸ
                  </span>
                  <h3 className="font-heading text-xl font-bold text-[#0A2517] pt-1">
                    Quét Mã VietQR Chuyển Khoản
                  </h3>
                  <p className="text-[11px] text-stone-500 font-ui">
                    Mở app ngân hàng bất kỳ để quét mã QR thanh toán tức thì
                  </p>
                </div>

                {/* Khung Mã QR Chuẩn VietQR */}
                <div className="flex flex-col items-center justify-center bg-[#FAF9F5] p-4 rounded-2xl border border-[#E9E2D8]">
                  <div className="relative w-56 h-56 bg-white p-2 rounded-xl border border-stone-200 shadow-xs flex items-center justify-center">                    {paymentData.bin && paymentData.accountNumber ? (
                      <img
                        src={`https://api.vietqr.io/image/${paymentData.bin}-${paymentData.accountNumber}-compact2.jpg?amount=${paymentData.amount}&addInfo=${encodeURIComponent(paymentData.description)}&accountName=${encodeURIComponent(paymentData.accountName || 'CLOOP')}`}
                        alt="Ma VietQR Thanh toan"
                        className="w-full h-full object-contain"
                      />
                    ) : paymentData.qrCode ? (
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(paymentData.qrCode)}`}
                        alt="Ma VietQR Thanh toan"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="text-xs text-stone-500 text-center px-4">
                        Dang cho PayOS tra ve ma QR an toan...
                      </div>
                    )}
                  </div>

                  <div className="mt-3 flex items-center gap-2 text-[11px] text-emerald-800 font-bold font-ui">
                    <Loader2 size={13} className="animate-spin text-emerald-700" />
                    <span>Đang chờ chuyển khoản... (Tự động nhận diện)</span>
                  </div>
                </div>

                {/* Thông tin chuyển khoản chi tiết */}
                <div className="space-y-2 font-ui text-xs bg-stone-50 p-3.5 rounded-xl border border-stone-200/70">
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-stone-500">Ngân hàng:</span>
                    <span className="font-bold text-stone-900">ACB (Ngân hàng Á Châu)</span>
                  </div>

                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-stone-500">Số tài khoản:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-stone-900">{paymentData.accountNumber || "Đang tạo..."}</span>
                      {paymentData.accountNumber && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(paymentData.accountNumber!, "accountNumber")}
                          className="text-[10px] text-emerald-700 hover:text-emerald-900 font-bold bg-white px-1.5 py-0.5 rounded border border-stone-200 cursor-pointer"
                        >
                          {copiedField === "accountNumber" ? "✓ Đã chép" : "Chép"}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-stone-500">Tên chủ tài khoản:</span>
                    <span className="font-semibold text-stone-900">{paymentData.accountName || "CLOOP FASHION"}</span>
                  </div>

                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-stone-500">Số tiền:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-emerald-800 text-sm">{paymentData.amount.toLocaleString('vi-VN')}đ</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(String(paymentData.amount), "amount")}
                        className="text-[10px] text-emerald-700 hover:text-emerald-900 font-bold bg-white px-1.5 py-0.5 rounded border border-stone-200 cursor-pointer"
                      >
                        {copiedField === "amount" ? "✓ Đã chép" : "Chép"}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-stone-500">Nội dung CK:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">{paymentData.description}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(paymentData.description, "description")}
                        className="text-[10px] text-emerald-700 hover:text-emerald-900 font-bold bg-white px-1.5 py-0.5 rounded border border-stone-200 cursor-pointer"
                      >
                        {copiedField === "description" ? "✓ Đã chép" : "Chép"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Các nút hành động */}
                <div className="space-y-2 pt-1">
                  {paymentData.checkoutUrl && (
                    <a
                      href={paymentData.checkoutUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-ui text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <ExternalLink size={13} /> Mở trang thanh toán PayOS ngoài
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      router.push("/my-closet/orders");
                    }}
                    className="w-full py-2.5 bg-transparent hover:bg-stone-50 text-stone-500 rounded-xl font-ui text-xs transition-colors cursor-pointer"
                  >
                    Kiểm tra trạng thái tại Tủ Đồ của tôi ➔
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}

