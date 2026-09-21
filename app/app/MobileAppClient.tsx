"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Image from "next/image";
import AiStylistChat from "@/app/components/AiStylistChat";
import { 
  Search, ShoppingBag, Compass, User, 
  MoreHorizontal, X, Star, Heart,
  Plus, CheckCircle2, UploadCloud, Camera, RefreshCw,
  Leaf, ArrowRight, Shirt, Calendar, ShieldCheck, Check,
  ChevronRight, ArrowLeft, Wallet, Droplet, Award,
  MapPin, Edit3, Menu, HelpCircle, LogOut, Package, Crop, Truck,
  Zap, CreditCard, QrCode, Sparkles, Loader2, ExternalLink, Copy
} from "lucide-react";
import Cropper from "react-easy-crop";
import { useAuthModal } from "@/app/AuthModalContext";
import { getShopProductsAction, createProductAction } from "@/app/actions/product";
import { toggleProductInteractionAction } from "@/app/actions/favorite";
import { getMyClosetMobileDataAction, updateClosetProfileAction, getClosetFullDataAction } from "@/app/actions/closet";
import { createBooking } from "@/app/actions/booking";

// 🏷️ DỊP TIỆC THỜI TRANG TUẦN HOÀN
const OCCASIONS_TABS = [
  { id: "all", name: "Tất cả" },
  { id: "wedding", name: "Tiệc cưới" },
  { id: "gala", name: "Dạ hội" },
  { id: "birthday", name: "Sinh nhật" },
  { id: "prom", name: "Prom" },
  { id: "heritage", name: "Áo dài" },
  { id: "accessories", name: "Phụ kiện" },
];

const CATEGORIES_LIST = [
  "Đầm dạ hội & Sự kiện",
  "Áo dài truyền thống & Cách tân",
  "Váy tiệc nhẹ & Sinh nhật",
  "Set vest & Blazer tiệc",
  "Phụ kiện & Túi xách tiệc"
];

const SIZES_LIST = ["XS", "S", "M", "L", "XL", "Freesize"];

const CONDITIONS_LIST = [
  { id: "99", label: "Mới 99%", desc: "Nguyên tag hoặc mặc 1 lần" },
  { id: "95", label: "Mới 95%", desc: "Mặc 2-3 lần, giặt hấp kỹ" },
  { id: "90", label: "Mới 90%", desc: "Đã qua sử dụng, form đẹp" },
];

const PROVINCES_LIST = [
  "Hà Nội",
  "TP. Hồ Chí Minh",
  "Đà Nẵng",
  "Nghệ An",
  "Hải Phòng",
  "Cần Thơ",
  "Khác"
];

export interface ImageItem {
  file: File;
  previewUrl: string;
}

// ✂️ HÀM CẮT ẢNH THEO KHUNG CHUẨN (CANVAS CANVAS CROPPER)
async function getCroppedImageBlob(imageSrc: string, cropPixels: any, maxSize = 1200, quality = 0.85): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = imageSrc;
  });

  const canvas = document.createElement("canvas");
  const scale = Math.min(1, maxSize / Math.max(cropPixels.width, cropPixels.height));
  canvas.width = cropPixels.width * scale;
  canvas.height = cropPixels.height * scale;
  const ctx = canvas.getContext("2d")!;

  ctx.drawImage(
    image,
    cropPixels.x, cropPixels.y, cropPixels.width, cropPixels.height,
    0, 0, canvas.width, canvas.height
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), "image/jpeg", quality);
  });
}

interface MobileAppClientProps {
  initialProducts: any[];
  initialTotalCount: number;
  initialUserData?: any;
}

export default function MobileAppClient({ 
  initialProducts, 
  initialTotalCount,
  initialUserData 
}: MobileAppClientProps) {
  const { currentUser, setShowAuthModal } = useAuthModal();
  
  // 📱 ĐIỀU HƯỚNG CHÍNH NỘI BỘ APP (5 TABS ĐÁY CHUẨN ĐỒNG BỘ WEB)
  const [activeTab, setActiveTab] = useState<"home" | "shop" | "orders" | "closet">("home");
  const [listingMode, setListingMode] = useState<"all" | "rent" | "sell">("all");
  const [selectedOccasion, setSelectedOccasion] = useState("Tất cả");
  const [searchQuery, setSearchQuery] = useState("");
  const [likedItems, setLikedItems] = useState<Record<string, boolean>>({});

  // 🌐 THIẾT LẬP NGÔN NGỮ (VIE / ENG)
  const [lang, setLang] = useState<"vi" | "en">("vi");
  const [langToast, setLangToast] = useState<string | null>(null);

  const toggleLang = (newLang: "vi" | "en") => {
    setLang(newLang);
    setLangToast(newLang === "vi" ? "Đã chuyển sang Tiếng Việt" : "Switched to English");
    setTimeout(() => setLangToast(null), 2200);
  };

  // 📜 TỰ ĐỘNG ẨN THANH ĐIỀU HƯỚNG KHI CUỘN XUỐNG XEM ĐỒ
  const [isBottomBarVisible, setIsBottomBarVisible] = useState(true);
  const lastScrollY = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 🌐 DỮ LIỆU FEED SẢN PHẨM (PRELOAD SERVER)
  const [products, setProducts] = useState<any[]>(initialProducts || []);
  const [totalProductsCount, setTotalProductsCount] = useState(initialTotalCount || (initialProducts?.length || 0));

  // 👤 DỮ LIỆU TỦ ĐỒ CÁ NHÂN & THEO DÕI HỒ SƠ
  const [closetData, setClosetData] = useState<any>(initialUserData || null);
  const [activeClosetView, setActiveClosetView] = useState<"menu" | "items" | "orders" | "wallet" | "eco" | "profile">("menu");
  const [orderSubTab, setOrderSubTab] = useState<"renter" | "lender" | "cart">("renter");
  const [isRefreshingCloset, setIsRefreshingCloset] = useState(false);
  const [isDrawerMenuOpen, setIsDrawerMenuOpen] = useState(false);
  const [isBlogModalOpen, setIsBlogModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  // 🛡️ DỮ LIỆU AN TOÀN TRÁNH CRASH GIAO DIỆN (NULL-SAFETY)
  const safeOrdersAsRenter = closetData?.ordersAsRenter || [];
  const safeOrdersAsLender = closetData?.ordersAsLender || [];
  const safeMyProducts = closetData?.myProducts || [];

  // 👗 MODAL CHI TIẾT SẢN PHẨM TRONG APP
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [activeDetailImgIndex, setActiveDetailImgIndex] = useState(0);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [addedToCartToast, setAddedToCartToast] = useState(false);

  // 🤖 XỬ LÝ CHỌN SẢN PHẨM TỪ AI STYLIST CHAT KHÔNG BỊ ĐIỀU HƯỚNG RA WEB
  const handleSelectProductFromAi = (productId: string) => {
    const found = products.find(p => p.id === productId);
    if (found) {
      setSelectedProduct(found);
    } else {
      fetch(`/api/products/${productId}`)
        .then(res => res.json())
        .then(data => {
          if (data?.product) {
            setSelectedProduct(data.product);
          }
        })
        .catch(() => {});
    }
  };

  // 🛍️ MODAL / VIEW TỦ ĐỒ CHỦ TỦ IN-APP (TIKTOK / SHOPEE CREATOR SHOP)
  const [viewingClosetOwner, setViewingClosetOwner] = useState<{
    id: string;
    name: string;
    avatar?: string | null;
    rating?: number | string;
    completedOrders?: number;
    location?: string;
    bio?: string;
    quote?: string;
  } | null>(null);
  const [closetOwnerProducts, setClosetOwnerProducts] = useState<any[]>([]);
  const [closetOwnerFilter, setClosetOwnerFilter] = useState<"all" | "rent" | "sell">("all");
  const [isLoadingClosetOwner, setIsLoadingClosetOwner] = useState(false);
  const [followedClosets, setFollowedClosets] = useState<Record<string, boolean>>({});
  const [closetToastMessage, setClosetToastMessage] = useState<string | null>(null);

  const showClosetToast = (msg: string) => {
    setClosetToastMessage(msg);
    setTimeout(() => setClosetToastMessage(null), 2500);
  };

  // 📝 MODAL "UP BÀI CHIA SẺ TỦ ĐỒ" ĐỒNG BỘ ĐẦY ĐỦ VỚI BẢN WEB
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadData, setUploadData] = useState({
    title: "",
    category: "Đầm dạ hội & Sự kiện",
    occasion: "Tiệc cưới",
    size: "M",
    condition: "99",
    material: "Lụa tơ tằm cao cấp",
    province: "Hà Nội",
    district: "Quận Hoàn Kiếm",
    ward: "Phường Hàng Đào",
    address: "",
    note: "",
    ownerPhone: "",
    saveLocationAsDefault: true,
    isRental: true,
    rentalPrice: "280.000",
    deposit: "500.000",
    isSale: false,
    salePrice: "",
    originalPrice: "3.200.000",
    description: "",
    story: "",
    imageFile: null as File | null,
    imagePreview: "",
  });
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);
  const [postSuccess, setPostSuccess] = useState(false);
  const [postError, setPostError] = useState("");

  // 📸 QUẢN LÝ NHIỀU ẢNH & TÍNH NĂNG CROP CĂN CHỈNH THEO Ý CHỦ TỦ
  const [uploadedImages, setUploadedImages] = useState<ImageItem[]>([]);
  const [cropQueue, setCropQueue] = useState<File[]>([]);
  const [currentCropSrc, setCurrentCropSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  // 🛍️ QUY TRÌNH THUÊ ĐỒ & MUA BÁN TRỰC TIẾP (CHECKOUT FLOW TRONG APP)
  const [checkoutProduct, setCheckoutProduct] = useState<any | null>(null);
  const [checkoutDays, setCheckoutDays] = useState<number>(3);
  const [checkoutStartDate, setCheckoutStartDate] = useState<string>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().slice(0, 10);
  });
  const [checkoutShippingMode, setCheckoutShippingMode] = useState<"CLOOP_BOOK" | "SELF_BOOK">("CLOOP_BOOK");
  const [checkoutRenterName, setCheckoutRenterName] = useState<string>("");
  const [checkoutRenterPhone, setCheckoutRenterPhone] = useState<string>("");
  const [checkoutRenterAddress, setCheckoutRenterAddress] = useState<string>("");
  const [checkoutRenterNote, setCheckoutRenterNote] = useState<string>("");
  const [saveRenterInfo, setSaveRenterInfo] = useState<boolean>(true);
  const [isSubmittingBooking, setIsSubmittingBooking] = useState<boolean>(false);
  const [bookingError, setBookingError] = useState<string>("");
  const [bookingSuccessData, setBookingSuccessData] = useState<any | null>(null);
  const [isPaidSuccess, setIsPaidSuccess] = useState<boolean>(false);
  const [isCheckingPayment, setIsCheckingPayment] = useState<boolean>(false);
  const [paymentCheckMsg, setPaymentCheckMsg] = useState<{ type: "info" | "error"; text: string } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // 🚚 ĐỊA CHỈ & TÍNH CƯỚC GHN TỰ ĐỘNG CHO CHECKOUT (ĐỒNG BỘ 100% BẢN WEB)
  const [checkoutProvinceId, setCheckoutProvinceId] = useState<number | "">("");
  const [checkoutDistrictId, setCheckoutDistrictId] = useState<number | "">("");
  const [checkoutWardCode, setCheckoutWardCode] = useState<string>("");
  const [checkoutDistricts, setCheckoutDistricts] = useState<any[]>([]);
  const [checkoutWards, setCheckoutWards] = useState<any[]>([]);
  const [checkoutAddressDetail, setCheckoutAddressDetail] = useState<string>("");
  const [checkoutShippingFee, setCheckoutShippingFee] = useState<number | null>(null);
  const [isLoadingCheckoutShipping, setIsLoadingCheckoutShipping] = useState<boolean>(false);

  // ⚙️ QUẢN LÝ HỒ SƠ TỦ ĐỒ (CLOSET SETTINGS)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: "",
    phone: "",
    pickupAddress: "",
    bio: "",
    quote: "",
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);

  // 📍 TÍCH HỢP ĐỊA CHỈ CHUẨN API GHN
  const [ghnProvinces, setGhnProvinces] = useState<any[]>([]);
  const [ghnDistricts, setGhnDistricts] = useState<any[]>([]);
  const [ghnWards, setGhnWards] = useState<any[]>([]);
  const [selectedGhnProvinceId, setSelectedGhnProvinceId] = useState<number | "">("");
  const [selectedGhnDistrictId, setSelectedGhnDistrictId] = useState<number | "">("");
  const [selectedGhnWardCode, setSelectedGhnWardCode] = useState<string>("");
  const [specificAddressDetail, setSpecificAddressDetail] = useState<string>("");
  const [addressNote, setAddressNote] = useState<string>("");
  const [showGhnPicker, setShowGhnPicker] = useState<boolean>(false);
  const [isLoadingGhnDistricts, setIsLoadingGhnDistricts] = useState<boolean>(false);
  const [isLoadingGhnWards, setIsLoadingGhnWards] = useState<boolean>(false);

  // 1. Tải danh sách Tỉnh/Thành phố từ API GHN
  useEffect(() => {
    fetch("/api/shipping/address?type=province")
      .then(res => res.json())
      .then(data => {
        if (data?.data && Array.isArray(data.data)) {
          setGhnProvinces(data.data);
        }
      })
      .catch(err => console.error("Lỗi nạp tỉnh GHN:", err));
  }, []);

  // 2. Tải danh sách Quận/Huyện khi đổi Tỉnh
  useEffect(() => {
    if (!selectedGhnProvinceId) {
      setGhnDistricts([]);
      setGhnWards([]);
      setSelectedGhnDistrictId("");
      setSelectedGhnWardCode("");
      return;
    }
    setIsLoadingGhnDistricts(true);
    fetch(`/api/shipping/address?type=district&province_id=${selectedGhnProvinceId}`)
      .then(res => res.json())
      .then(data => {
        if (data?.data && Array.isArray(data.data)) {
          setGhnDistricts(data.data);
        }
      })
      .catch(err => console.error("Lỗi nạp huyện GHN:", err))
      .finally(() => setIsLoadingGhnDistricts(false));
  }, [selectedGhnProvinceId]);

  // 3. Tải danh sách Phường/Xã khi đổi Huyện
  useEffect(() => {
    if (!selectedGhnDistrictId) {
      setGhnWards([]);
      setSelectedGhnWardCode("");
      return;
    }
    setIsLoadingGhnWards(true);
    fetch(`/api/shipping/address?type=ward&district_id=${selectedGhnDistrictId}`)
      .then(res => res.json())
      .then(data => {
        if (data?.data && Array.isArray(data.data)) {
          setGhnWards(data.data);
        }
      })
      .catch(err => console.error("Lỗi nạp xã GHN:", err))
      .finally(() => setIsLoadingGhnWards(false));
  }, [selectedGhnDistrictId]);

  // 🚚 LẤY QUẬN / HUYỆN CHO CHECKOUT KHI CHỌN TỈNH
  useEffect(() => {
    if (!checkoutProvinceId) {
      setCheckoutDistricts([]);
      setCheckoutWards([]);
      setCheckoutDistrictId("");
      setCheckoutWardCode("");
      setCheckoutShippingFee(null);
      return;
    }
    fetch(`/api/shipping/address?type=district&province_id=${checkoutProvinceId}`)
      .then(res => res.json())
      .then(data => {
        if (data?.data && Array.isArray(data.data)) {
          setCheckoutDistricts(data.data);
        }
      })
      .catch(() => {});
  }, [checkoutProvinceId]);

  // 🚚 LẤY PHƯỜNG / XÃ CHO CHECKOUT KHI CHỌN HUYỆN
  useEffect(() => {
    if (!checkoutDistrictId) {
      setCheckoutWards([]);
      setCheckoutWardCode("");
      setCheckoutShippingFee(null);
      return;
    }
    fetch(`/api/shipping/address?type=ward&district_id=${checkoutDistrictId}`)
      .then(res => res.json())
      .then(data => {
        if (data?.data && Array.isArray(data.data)) {
          setCheckoutWards(data.data);
        }
      })
      .catch(() => {});
  }, [checkoutDistrictId]);

  // ⚡ TÍNH CƯỚC GHN TỰ ĐỘNG KHI CHỌN XONG PHƯỜNG XÃ (ĐỒNG BỘ WEB & GHN GATEWAY)
  useEffect(() => {
    if (checkoutShippingMode !== "CLOOP_BOOK") {
      setCheckoutShippingFee(0);
      return;
    }
    if (!checkoutProvinceId || !checkoutDistrictId || !checkoutWardCode || !checkoutProduct) {
      setCheckoutShippingFee(null);
      return;
    }

    const prov = ghnProvinces.find(p => String(p.ProvinceID) === String(checkoutProvinceId));
    const dist = checkoutDistricts.find(d => String(d.DistrictID) === String(checkoutDistrictId));
    const ward = checkoutWards.find(w => String(w.WardCode) === String(checkoutWardCode));
    const fullToProvinceStr = `${ward?.WardName || ""}, ${dist?.DistrictName || ""}, ${prov?.ProvinceName || ""}`;

    setIsLoadingCheckoutShipping(true);
    fetch("/api/shipping/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fromProvince: checkoutProduct.province || checkoutProduct.location || "Hà Nội",
        toProvince: fullToProvinceStr,
        fromDistrictId: checkoutProduct.districtId || null,
        fromWardCode: checkoutProduct.wardCode || null,
        toDistrictId: checkoutDistrictId,
        toWardCode: checkoutWardCode,
        weight: 500,
        isRental: checkoutProduct.listingTypeRaw !== "SELL"
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.options && data.options.length > 0) {
          const standardOption = data.options.find((o: any) => o.quote?.serviceId === "standard") || data.options[0];
          const rawFee = Number(standardOption.quote?.fee) || 0;
          // 🛡️ Đồng bộ 100% chuẩn Web (Block 5K: làm tròn nhịp 5.000đ)
          const fee = rawFee > 0 ? Math.ceil(rawFee / 5000) * 5000 : 0;
          setCheckoutShippingFee(fee);
        } else {
          setCheckoutShippingFee(null);
        }
      })
      .catch(() => {
        setCheckoutShippingFee(null);
      })
      .finally(() => {
        setIsLoadingCheckoutShipping(false);
      });
  }, [checkoutShippingMode, checkoutProvinceId, checkoutDistrictId, checkoutWardCode, checkoutProduct]);

  // 4. Hàm ghép địa chỉ chuẩn hóa từ các trường GHN đã chọn
  const handleApplyGhnAddress = (
    provinceId: number | "",
    districtId: number | "",
    wardCode: string,
    detail: string,
    note?: string
  ) => {
    const prov = ghnProvinces.find(p => p.ProvinceID === provinceId);
    const dist = ghnDistricts.find(d => d.DistrictID === districtId);
    const ward = ghnWards.find(w => w.WardCode === wardCode);
    const effectiveNote = note !== undefined ? note : addressNote;

    const parts = [];
    if (detail.trim()) parts.push(detail.trim());
    if (ward?.WardName) parts.push(ward.WardName);
    if (dist?.DistrictName) parts.push(dist.DistrictName);
    if (prov?.ProvinceName) parts.push(prov.ProvinceName);

    if (parts.length > 0) {
      let full = parts.join(", ");
      if (effectiveNote.trim()) {
        full += ` (Ghi chú: ${effectiveNote.trim()})`;
      }
      setProfileForm(prev => ({ ...prev, pickupAddress: full }));
      
      // Đồng bộ sang cả uploadData để khi đăng đồ mới cũng dùng đúng địa chỉ này
      setUploadData(prev => ({
        ...prev,
        province: prov?.ProvinceName || prev.province,
        district: dist?.DistrictName || prev.district,
        ward: ward?.WardName || prev.ward,
        address: detail.trim() || prev.address,
        note: effectiveNote.trim() || prev.note
      }));

      // Lưu trữ cấu trúc vào LocalStorage
      try {
        localStorage.setItem("cloop_saved_pickup_location", JSON.stringify({
          province: prov?.ProvinceName || "",
          district: dist?.DistrictName || "",
          ward: ward?.WardName || "",
          address: detail.trim() || "",
          note: effectiveNote.trim() || "",
          phone: profileForm.phone || "",
          provinceId,
          districtId,
          wardCode,
          fullAddress: full
        }));
      } catch (_) {}
    }
  };

  // 🔄 CẬP NHẬT FORM KHI CÓ USER DATA & TỰ ĐỘNG NẠP TỌA ĐỘ TRẠM GỬI ĐÃ LƯU
  useEffect(() => {
    if (closetData?.user) {
      const userAddr = closetData.user.pickupAddress || closetData.user.location || "";
      setProfileForm({
        name: closetData.user.name || "",
        phone: closetData.user.phone || "",
        pickupAddress: userAddr,
        bio: closetData.user.bio || "",
        quote: closetData.user.quote || "",
      });
    }

    // Tự động khôi phục trạm gửi đã lưu (từ lần đăng trước hoặc hồ sơ cá nhân)
    try {
      const savedLoc = typeof window !== "undefined" ? localStorage.getItem("cloop_saved_pickup_location") : null;
      const parsed = savedLoc ? JSON.parse(savedLoc) : null;
      
      const phone = parsed?.phone || closetData?.user?.phone || "";
      const province = parsed?.province || closetData?.user?.province || "Hà Nội";
      const district = parsed?.district || closetData?.user?.district || "Quận Hoàn Kiếm";
      const ward = parsed?.ward || closetData?.user?.ward || "Phường Hàng Đào";
      const address = parsed?.address || closetData?.user?.pickupAddress || closetData?.user?.location || "";
      const note = parsed?.note || "";

      if (parsed?.provinceId) setSelectedGhnProvinceId(parsed.provinceId);
      if (parsed?.districtId) setSelectedGhnDistrictId(parsed.districtId);
      if (parsed?.wardCode) setSelectedGhnWardCode(parsed.wardCode);
      if (parsed?.address) setSpecificAddressDetail(parsed.address);
      if (parsed?.note) setAddressNote(parsed.note);

      setUploadData(prev => ({
        ...prev,
        province: parsed?.province ? province : (prev.province || province),
        district: parsed?.district ? district : (prev.district || district),
        ward: parsed?.ward ? ward : (prev.ward || ward),
        address: parsed?.address ? address : (prev.address || address),
        note: parsed?.note ? note : (prev.note || note),
        ownerPhone: parsed?.phone ? phone : (prev.ownerPhone || phone),
      }));
    } catch (_) {}
  }, [closetData]);

  // 🔄 NẠP LẠI DỮ LIỆU TỦ ĐỒ CÁ NHÂN KHI CHUYỂN VÀO TAB CLOSET
  const refreshPersonalData = async () => {
    setIsRefreshingCloset(true);
    try {
      const res = await getMyClosetMobileDataAction();
      if (res.success) {
        setClosetData(res);
      }
    } catch (err) {
      console.error("Lỗi nạp lại tủ đồ:", err);
    } finally {
      setIsRefreshingCloset(false);
    }
  };

  useEffect(() => {
    if (activeTab === "closet" || activeTab === "orders" || currentUser) {
      refreshPersonalData();
    }
  }, [activeTab, currentUser]);

  // 📜 LẮNG NGHE SỰ KIỆN CUỘN TRANG ĐỂ ẨN/HIỆN THANH ĐIỀU HƯỚNG ĐÁY
  useEffect(() => {
    const handleScrollEvent = (scrollTop: number) => {
      const diff = scrollTop - lastScrollY.current;
      if (Math.abs(diff) < 8) return;
      if (diff > 0 && scrollTop > 50) {
        // Cuộn xuống -> Thu gọn thanh đáy nhường chỗ xem sản phẩm
        setIsBottomBarVisible(false);
      } else if (diff < 0) {
        // Cuộn lên -> Hiển thị lại thanh đáy
        setIsBottomBarVisible(true);
      }
      lastScrollY.current = Math.max(0, scrollTop);
    };

    const onWindowScroll = () => {
      handleScrollEvent(window.scrollY || document.documentElement.scrollTop || 0);
    };

    const containerEl = scrollContainerRef.current;
    const onContainerScroll = () => {
      if (containerEl) {
        handleScrollEvent(containerEl.scrollTop);
      }
    };

    window.addEventListener("scroll", onWindowScroll, { passive: true });
    if (containerEl) {
      containerEl.addEventListener("scroll", onContainerScroll, { passive: true });
    }

    return () => {
      window.removeEventListener("scroll", onWindowScroll);
      if (containerEl) {
        containerEl.removeEventListener("scroll", onContainerScroll);
      }
    };
  }, []);

  // 🛍️ TỰ ĐỘNG NẠP DANH MỤC TRANG PHỤC & THÔNG TIN CHỦ TỦ KHI MỞ TỦ ĐỒ (TIKTOK/SHOPEE STYLE)
  useEffect(() => {
    if (!viewingClosetOwner?.id && !viewingClosetOwner?.name) {
      setClosetOwnerProducts([]);
      return;
    }

    // 1. Lọc tức thì từ danh sách sản phẩm hiện có trong app để hiển thị ngay lập tức
    const localMatches = products.filter((p: any) => {
      const matchId = viewingClosetOwner.id && p.userId && (p.userId === viewingClosetOwner.id);
      const matchName = viewingClosetOwner.name && p.ownerName && (p.ownerName.toLowerCase().trim() === viewingClosetOwner.name.toLowerCase().trim());
      return matchId || matchName;
    });
    setClosetOwnerProducts(localMatches);

    // 2. Fetch server action getClosetFullDataAction nếu có userId hợp lệ
    if (viewingClosetOwner.id && viewingClosetOwner.id !== "official") {
      setIsLoadingClosetOwner(true);
      getClosetFullDataAction(viewingClosetOwner.id)
        .then((res) => {
          if (res.success && res.ownerInfo) {
            setViewingClosetOwner((prev) => prev ? {
              ...prev,
              name: res.ownerInfo.name || prev.name,
              avatar: res.ownerInfo.avatar || prev.avatar,
              bio: res.ownerInfo.bio || prev.bio,
              quote: res.ownerInfo.quote || prev.quote,
              location: res.ownerInfo.location || prev.location,
              rating: res.ownerInfo.rating ?? prev.rating,
              completedOrders: res.ownerInfo.completedOrders ?? prev.completedOrders,
            } : null);

            if (res.products && Array.isArray(res.products) && res.products.length > 0) {
              const formatted = res.products.map((item: any) => ({
                id: item.productId || item.id,
                title: item.title,
                image: item.image,
                primaryImage: item.image,
                images: [item.image],
                rentalPrice: item.type === "Thuê" ? item.priceText : undefined,
                salePrice: item.type === "Mua sắm" ? item.priceText : undefined,
                price: item.priceText,
                listingTypeRaw: item.type === "Mua sắm" ? "SELL" : "RENT",
                size: item.size || "M",
                category: item.category,
                province: item.location,
                location: item.location,
                ownerName: res.ownerInfo.name,
                ownerAvatar: res.ownerInfo.avatar,
                userId: res.ownerInfo.id,
                rating: res.ownerInfo.rating,
                completedOrders: res.ownerInfo.completedOrders,
              }));
              setClosetOwnerProducts(formatted);
            }
          }
        })
        .catch((err) => console.error("Lỗi lấy dữ liệu tủ đồ:", err))
        .finally(() => setIsLoadingClosetOwner(false));
    }
  }, [viewingClosetOwner?.id, viewingClosetOwner?.name]);

  // Lọc sản phẩm của chủ tủ theo phân loại Thuê / Bán
  const filteredClosetOwnerProducts = useMemo(() => {
    if (closetOwnerFilter === "rent") {
      return closetOwnerProducts.filter((p: any) => p.listingTypeRaw !== "SELL");
    }
    if (closetOwnerFilter === "sell") {
      return closetOwnerProducts.filter((p: any) => p.listingTypeRaw === "SELL" || !!p.salePrice);
    }
    return closetOwnerProducts;
  }, [closetOwnerProducts, closetOwnerFilter]);

  // 🔍 LỌC THÔNG MINH SẢN PHẨM TRỰC TIẾP
  const filteredProducts = useMemo(() => {
    let list = products;
    
    // Lọc theo chế độ Thuê đồ / Sở hữu
    if (listingMode === "rent") {
      list = list.filter((p: any) => 
        p.listingTypeRaw === "RENT" || 
        (p.type && p.type.toLowerCase().includes("thuê")) || 
        p.isRental !== false
      );
    } else if (listingMode === "sell") {
      list = list.filter((p: any) => 
        p.listingTypeRaw === "SELL" || 
        (p.type && (p.type.toLowerCase().includes("mua") || p.type.toLowerCase().includes("sở hữu"))) || 
        p.isSale === true
      );
    }

    if (selectedOccasion !== "Tất cả") {
      list = list.filter((p: any) => {
        const occ = (p.occasion || "").toLowerCase();
        const cat = (p.category || "").toLowerCase();
        const title = (p.title || "").toLowerCase();
        const target = selectedOccasion.toLowerCase();
        return occ.includes(target) || cat.includes(target) || title.includes(target);
      });
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((p: any) => {
        const occ = (p.occasion || "").toLowerCase();
        const title = (p.title || "").toLowerCase();
        const desc = (p.description || "").toLowerCase();
        return title.includes(q) || occ.includes(q) || desc.includes(q);
      });
    }
    return list;
  }, [products, listingMode, selectedOccasion, searchQuery]);

  // ❤️ THẢ TIM LƯU DATABASE THẬT
  const handleToggleLike = async (productId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }

    setLikedItems((prev) => ({ ...prev, [productId]: !prev[productId] }));

    try {
      const res = await toggleProductInteractionAction(productId, "LIKE");
      if (!res.success && res.error === "AUTH_REQUIRED") {
        setShowAuthModal(true);
        setLikedItems((prev) => ({ ...prev, [productId]: false }));
      }
    } catch (err) {
      console.error("Lỗi favorite:", err);
    }
  };

  // 🏷️ HÀM TÍNH PHÍ GÓI THUÊ ĐỒNG BỘ 100% VỚI WEB VÀ PRISMA DATABASE
  const calculatePackageRentalFee = (product: any, days: number) => {
    if (!product) return 0;
    if (product.listingTypeRaw === "SELL") {
      return Number(product.salePrice || product.price || 0);
    }
    const base = Number(product.rentalPrice || product.price || 0);
    
    // Nếu sản phẩm có pricing_tiers từ DB (customized)
    const tiers = product.pricingTiers || product.pricing_tiers;
    if (Array.isArray(tiers) && tiers.length > 0) {
      const match = tiers.find((t: any) => Number(t.days) === Number(days));
      if (match?.price) return Number(match.price);
    }

    // Quy chuẩn web chuẩn mực (áp dụng chiết khấu khối lượng):
    // 1 ngày: basePrice
    // 3 ngày: roundToThousand(basePrice * 3 * 0.85) - Giảm 15%
    // 7 ngày: roundToThousand(basePrice * 7 * 0.70) - Giảm 30%
    if (days === 1) return base;
    if (days === 3) return Math.round(base * 3 * 0.85 / 1000) * 1000;
    if (days === 7) return Math.round(base * 7 * 0.70 / 1000) * 1000;

    const factor = days >= 7 ? 0.7 : days >= 3 ? 0.85 : 1;
    return Math.round(base * days * factor / 1000) * 1000;
  };

  const calculatedRentalFee = useMemo(() => {
    return calculatePackageRentalFee(checkoutProduct, checkoutDays);
  }, [checkoutProduct, checkoutDays]);

  const calculatedDeposit = useMemo(() => {
    if (!checkoutProduct || checkoutProduct.listingTypeRaw === "SELL") return 0;
    return Number(checkoutProduct.deposit || 0);
  }, [checkoutProduct]);

  // 🗓️ TÍNH TOÁN NGÀY TRẢ ĐỒ DỰ KIẾN THEO SỐ NGÀY THUÊ
  const checkoutEndDate = useMemo(() => {
    if (!checkoutStartDate) return "";
    const d = new Date(checkoutStartDate);
    d.setDate(d.getDate() + (checkoutDays || 3) - 1);
    return d.toISOString().slice(0, 10);
  }, [checkoutStartDate, checkoutDays]);

  // 🚀 MỞ MODAL ĐẶT THUÊ / MUA ĐỒ
  const handleOpenCheckout = (product: any) => {
    setCheckoutProduct(product);
    setBookingError("");
    setBookingSuccessData(null);
    setIsPaidSuccess(false);
    setIsCheckingPayment(false);
    setPaymentCheckMsg(null);
    setCopiedField(null);
    // Mặc định chọn gói 3 ngày (gói phổ biến nhất trên web)
    setCheckoutDays(3);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setCheckoutStartDate(tomorrow.toISOString().slice(0, 10));

    // 💾 Lấy thông tin liên hệ & địa chỉ GHN đã lưu từ trước (làm 1 lần giữ mãi)
    let savedInfo: any = null;
    let savedLoc: any = null;
    try {
      if (typeof window !== "undefined") {
        const raw = localStorage.getItem("cloop_saved_renter_info");
        if (raw) savedInfo = JSON.parse(raw);
        const rawLoc = localStorage.getItem("cloop_saved_pickup_location");
        if (rawLoc) savedLoc = JSON.parse(rawLoc);
      }
    } catch (_) {}

    setCheckoutRenterName(savedInfo?.name || currentUser?.name || closetData?.user?.name || "");
    setCheckoutRenterPhone(savedInfo?.phone || closetData?.user?.phone || "");
    setCheckoutRenterNote(savedInfo?.note || "");

    const provId = savedInfo?.provinceId || savedLoc?.provinceId || "";
    const distId = savedInfo?.districtId || savedLoc?.districtId || "";
    const wdCode = savedInfo?.wardCode || savedLoc?.wardCode || "";
    const addr = savedInfo?.addressDetail || savedInfo?.address || savedLoc?.address || closetData?.user?.address || "";

    setCheckoutProvinceId(provId);
    setCheckoutDistrictId(distId);
    setCheckoutWardCode(wdCode);
    setCheckoutAddressDetail(addr);
    setCheckoutShippingFee(null);

    // 🚚 Nạp sẵn danh sách Quận/Huyện và Phường/Xã nếu đã có địa chỉ lưu để dropdown hiển thị chuẩn xác
    if (provId) {
      fetch(`/api/shipping/address?type=district&province_id=${provId}`)
        .then(res => res.json())
        .then(data => {
          if (data?.data && Array.isArray(data.data)) {
            setCheckoutDistricts(data.data);
          }
        })
        .catch(() => {});
    }
    if (distId) {
      fetch(`/api/shipping/address?type=ward&district_id=${distId}`)
        .then(res => res.json())
        .then(data => {
          if (data?.data && Array.isArray(data.data)) {
            setCheckoutWards(data.data);
          }
        })
        .catch(() => {});
    }
  };

  // 🚚 XỬ LÝ CHỌN CẤP BẬC ĐỊA CHỈ GHN LIỀN MẠCH (RESET CẤP DƯỚI KHI THAY ĐỔI CẤP TRÊN)
  const handleCheckoutProvinceChange = (provId: number | "") => {
    setCheckoutProvinceId(provId);
    setCheckoutDistrictId("");
    setCheckoutWardCode("");
    setCheckoutDistricts([]);
    setCheckoutWards([]);
    setCheckoutShippingFee(null);
  };

  const handleCheckoutDistrictChange = (distId: number | "") => {
    setCheckoutDistrictId(distId);
    setCheckoutWardCode("");
    setCheckoutWards([]);
    setCheckoutShippingFee(null);
  };

  const handleCheckoutWardChange = (wdCode: string) => {
    setCheckoutWardCode(wdCode);
    setCheckoutShippingFee(null);
  };

  // 💳 XÁC NHẬN TẠO ĐƠN HÀNG (RENTAL HOẶC PURCHASE)
  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutProduct) return;

    setBookingError("");

    // 🛡️ Kiểm tra đăng nhập ngay trên Client: Nếu chưa đăng nhập thì bật ngay Modal ID Xanh
    if (!currentUser) {
      setShowAuthModal(true);
      setBookingError("Vui lòng đăng nhập bằng ID Xanh để hoàn tất đặt đơn");
      return;
    }

    if (!checkoutRenterName.trim()) {
      setBookingError("Vui lòng điền họ tên người nhận");
      return;
    }
    if (!checkoutRenterPhone.trim() || !/(84|0[3|5|7|8|9])+([0-9]{8})\b/.test(checkoutRenterPhone.trim())) {
      setBookingError("Vui lòng điền số điện thoại hợp lệ (10 chữ số)");
      return;
    }
    if (checkoutShippingMode === "CLOOP_BOOK") {
      if (!checkoutProvinceId || !checkoutDistrictId || !checkoutWardCode) {
        setBookingError("Vui lòng chọn đầy đủ Tỉnh/Thành phố, Quận/Huyện và Phường/Xã để tính cước GHN");
        return;
      }
      if (!checkoutAddressDetail.trim()) {
        setBookingError("Vui lòng điền số nhà, tên đường chi tiết");
        return;
      }
      if (checkoutShippingFee === null) {
        setBookingError("Hệ thống đang tính cước GHN, vui lòng đợi trong giây lát hoặc chọn lại địa chỉ.");
        return;
      }
    }

    setIsSubmittingBooking(true);

    const isRental = checkoutProduct.listingTypeRaw !== "SELL";
    const subTotal = calculatedRentalFee;
    const deposit = calculatedDeposit;
    const effectiveShipping = checkoutShippingMode === "CLOOP_BOOK" ? (checkoutShippingFee || 0) : 0;
    const totalAmount = subTotal + deposit + effectiveShipping;

    const prov = ghnProvinces.find(p => String(p.ProvinceID) === String(checkoutProvinceId));
    const dist = checkoutDistricts.find(d => String(d.DistrictID) === String(checkoutDistrictId));
    const ward = checkoutWards.find(w => String(w.WardCode) === String(checkoutWardCode));
    const addressParts = [
      checkoutAddressDetail.trim(),
      ward?.WardName,
      dist?.DistrictName,
      prov?.ProvinceName
    ].filter(Boolean).join(", ");
    const fullShippingAddress = checkoutShippingMode === "CLOOP_BOOK"
      ? `${addressParts}${checkoutRenterNote.trim() ? ` (Ghi chú: ${checkoutRenterNote.trim()})` : ""}`
      : `Nhận trực tiếp tại trạm: ${checkoutProduct.specificAddress || checkoutProduct.location || "Hà Nội"}`;

    // Lưu thông tin liên hệ vào LocalStorage nếu người dùng tích chọn
    try {
      if (saveRenterInfo && typeof window !== "undefined") {
        localStorage.setItem("cloop_saved_renter_info", JSON.stringify({
          name: checkoutRenterName.trim(),
          phone: checkoutRenterPhone.trim(),
          provinceId: checkoutProvinceId,
          districtId: checkoutDistrictId,
          wardCode: checkoutWardCode,
          addressDetail: checkoutAddressDetail.trim(),
          note: checkoutRenterNote.trim(),
        }));
      }
    } catch (_) {}

    try {
      const res = await createBooking({
        productId: checkoutProduct.id,
        startDate: checkoutStartDate,
        endDate: checkoutEndDate,
        renterName: checkoutRenterName.trim(),
        renterPhone: checkoutRenterPhone.trim(),
        ownerName: checkoutProduct.ownerName || "Chủ tủ CLOOP",
        ownerPhone: "",
        isRental,
        shippingMode: checkoutShippingMode,
        shippingFee: effectiveShipping,
      });

      if (res.success && res.rentalId) {
        setCartItems(prev => prev.filter(item => item.id !== checkoutProduct.id));
        refreshPersonalData();

        setBookingSuccessData({
          rentalId: res.rentalId,
          orderCode: res.orderCode || res.rentalId.slice(-6).toUpperCase(),
          qrCode: res.qrCode || null,
          checkoutUrl: res.checkoutUrl || null,
          accountNumber: res.accountNumber || "0335805562",
          accountName: res.accountName || "CLOOP VIETNAM",
          bin: res.bin || "970422",
          description: res.description || `CLOOP GD ${res.orderCode || res.rentalId.slice(-6).toUpperCase()}`,
          totalAmount: res.totalAmount || totalAmount,
          depositAmount: res.depositAmount ?? deposit,
          rentalFee: res.rentalFee || subTotal,
          shippingFee: effectiveShipping,
          startDate: checkoutStartDate,
          endDate: checkoutEndDate,
          packageDays: checkoutDays,
          productTitle: checkoutProduct.title,
          productImage: checkoutProduct.image || checkoutProduct.primaryImage || checkoutProduct.images?.[0] || "/1.1.jpg",
          ownerName: checkoutProduct.ownerName || "Chủ tủ CLOOP",
          shippingAddress: fullShippingAddress,
          isRental,
        });
        setIsPaidSuccess(false);
        setIsCheckingPayment(false);
        setPaymentCheckMsg(null);
      } else {
        setBookingError(res.error || "Không thể khởi tạo đơn hàng. Vui lòng thử lại!");
      }
    } catch (err: any) {
      setBookingError(err.message || "Lỗi kết nối máy chủ");
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  // ⚡ TỰ ĐỘNG QUÉT VÀ ĐỒNG BỘ TRẠNG THÁI THANH TOÁN TỪ PAYOS THEO THỜI GIAN THỰC (GIÃN CÁCH 3.5S)
  useEffect(() => {
    if (!bookingSuccessData?.orderCode || isPaidSuccess) return;

    const interval = setInterval(async () => {
      try {
        const { checkAndSyncPaymentStatusAction } = await import("@/app/actions/payment");
        const res = await checkAndSyncPaymentStatusAction(bookingSuccessData.orderCode);
        if (res.success && res.isPaid) {
          setIsPaidSuccess(true);
          refreshPersonalData();
          clearInterval(interval);
        }
      } catch (e) {
        console.error("Polling PayOS payment status error:", e);
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [bookingSuccessData?.orderCode, isPaidSuccess]);

  // 🏦 NÚT KIỂM TRA TRẠNG THÁI THANH TOÁN PAYOS THỦ CÔNG KHI KHÁCH BẤM "TÔI ĐÃ CHUYỂN KHOẢN"
  const handleCheckPayment = async () => {
    if (!bookingSuccessData?.orderCode || isCheckingPayment) return;
    setIsCheckingPayment(true);
    setPaymentCheckMsg(null);
    try {
      const { checkAndSyncPaymentStatusAction } = await import("@/app/actions/payment");
      const res = await checkAndSyncPaymentStatusAction(bookingSuccessData.orderCode);
      if (res.success && res.isPaid) {
        setIsPaidSuccess(true);
        refreshPersonalData();
      } else {
        setPaymentCheckMsg({
          type: "info",
          text: "Hệ thống chưa ghi nhận giao dịch thành công từ PayOS. Vui lòng đảm bảo bạn đã chuyển đúng số tiền và nội dung chuyển khoản, hoặc đợi từ 15 đến 30 giây nếu ngân hàng đang xử lý."
        });
      }
    } catch (e: any) {
      setPaymentCheckMsg({
        type: "error",
        text: e.message || "Lỗi kiểm tra trạng thái thanh toán từ cổng PayOS."
      });
    } finally {
      setIsCheckingPayment(false);
    }
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (_) {}
  };

  // 🔄 QUẢN LÝ HÀNG ĐỢI CẮT ẢNH (CHỦ TỦ TỰ CĂN CHỈNH TỶ LỆ 3:4)
  useEffect(() => {
    if (!currentCropSrc && cropQueue.length > 0) {
      const nextFile = cropQueue[0];
      const url = URL.createObjectURL(nextFile);
      setCurrentCropSrc(url);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    }
  }, [cropQueue, currentCropSrc]);

  const handleCropConfirm = async () => {
    if (!currentCropSrc || !croppedAreaPixels) return;
    try {
      const blob = await getCroppedImageBlob(currentCropSrc, croppedAreaPixels);
      const croppedFile = new File([blob], `cropped_${Date.now()}.jpg`, { type: "image/jpeg" });
      const previewUrl = URL.createObjectURL(croppedFile);
      setUploadedImages((prev) => [...prev, { file: croppedFile, previewUrl }]);
    } catch (error) {
      console.error("Lỗi khi cắt ảnh:", error);
    } finally {
      URL.revokeObjectURL(currentCropSrc);
      setCurrentCropSrc(null);
      setCropQueue((prev) => prev.slice(1));
    }
  };

  const handleCropSkip = () => {
    if (currentCropSrc && cropQueue.length > 0) {
      const originalFile = cropQueue[0];
      const previewUrl = currentCropSrc;
      setUploadedImages((prev) => [...prev, { file: originalFile, previewUrl }]);
    }
    setCurrentCropSrc(null);
    setCropQueue((prev) => prev.slice(1));
  };

  const removeImage = (indexToRemove: number) => {
    setUploadedImages((prev) => {
      const updated = prev.filter((_, index) => index !== indexToRemove);
      try {
        URL.revokeObjectURL(prev[indexToRemove].previewUrl);
      } catch (_) {}
      return updated;
    });
  };

  const handleRecropImage = (index: number) => {
    const item = uploadedImages[index];
    if (item) {
      removeImage(index);
      setCropQueue((prev) => [item.file, ...prev]);
    }
  };

  // 📸 CHỌN NHIỀU ẢNH TỪ MÁY (TỐI ĐA 5 ẢNH)
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const validFiles: File[] = [];
      for (const file of Array.from(files)) {
        if (file.size > 15 * 1024 * 1024) {
          setPostError(`Ảnh "${file.name}" vượt quá 15MB. Vui lòng chọn ảnh nhỏ hơn!`);
          continue;
        }
        if (!file.type.startsWith("image/")) {
          setPostError(`Tệp "${file.name}" không phải định dạng ảnh hợp lệ.`);
          continue;
        }
        validFiles.push(file);
      }

      if (validFiles.length > 0) {
        const remaining = 5 - uploadedImages.length;
        const toAdd = validFiles.slice(0, Math.max(0, remaining));
        setCropQueue((prev) => [...prev, ...toAdd]);
      }
    }
    if (e.target) e.target.value = "";
  };

  // 🚀 UP BÀI GHI THẲNG VÀO DATABASE THỰC TẾ
  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPostError("");

    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }

    if (!uploadData.title.trim() || uploadData.title.trim().length < 5) {
      setPostError("Vui lòng nhập tên trang phục (tối thiểu 5 ký tự)!");
      return;
    }

    if (uploadedImages.length === 0) {
      setPostError("Vui lòng chọn hoặc chụp ít nhất 1 ảnh trang phục!");
      return;
    }

    if (!uploadData.ownerPhone.trim()) {
      setPostError("Vui lòng nhập số điện thoại liên hệ của bạn!");
      return;
    }

    if (!uploadData.address.trim()) {
      setPostError("Vui lòng nhập địa chỉ cụ thể của trạm gửi!");
      return;
    }

    const parsedRentPrice = parseInt(uploadData.rentalPrice.replace(/\D/g, "")) || 0;
    if (uploadData.isRent && parsedRentPrice <= 0) {
      setPostError("Vui lòng nhập giá thuê / ngày hợp lệ!");
      return;
    }

    const parsedSalePrice = parseInt(uploadData.salePrice.replace(/\D/g, "")) || 0;
    if (uploadData.isSale && parsedSalePrice <= 0) {
      setPostError("Vui lòng nhập giá bán hợp lệ!");
      return;
    }

    const parsedDeposit = uploadData.deposit ? (parseInt(uploadData.deposit.replace(/\D/g, "")) || 0) : 0;

    setIsSubmittingPost(true);

    try {
      // 1. Tải tất cả ảnh đã chọn/crop lên Cloudinary
      const uploadPromises = uploadedImages.map(async (imgItem) => {
        const formData = new FormData();
        formData.append("file", imgItem.file);
        formData.append("folder", "cloop_mobile_closet");

        const upRes = await fetch("/api/upload", {
          method: "POST",
          body: formData
        });

        if (!upRes.ok) {
          throw new Error("Không thể tải ảnh lên hệ thống.");
        }
        const upJson = await upRes.json();
        return upJson.url as string;
      });

      const finalImageUrls = await Promise.all(uploadPromises);
      if (!finalImageUrls || finalImageUrls.length === 0) {
        setPostError("Chưa có ảnh nào được tải lên thành công!");
        setIsSubmittingPost(false);
        return;
      }

      // 💾 LƯU TRẠM GỬI LÀM MẶC ĐỊNH VÀO LOCALSTORAGE CHO CÁC LẦN UP TIẾP THEO
      try {
        if (uploadData.saveLocationAsDefault && typeof window !== "undefined") {
          const fullAddr = [uploadData.address.trim(), uploadData.ward.trim(), uploadData.district.trim(), uploadData.province.trim()].filter(Boolean).join(", ") + (uploadData.note?.trim() ? ` (Ghi chú: ${uploadData.note.trim()})` : "");
          localStorage.setItem("cloop_saved_pickup_location", JSON.stringify({
            province: uploadData.province.trim(),
            district: uploadData.district.trim(),
            ward: uploadData.ward.trim(),
            address: uploadData.address.trim(),
            note: uploadData.note?.trim() || "",
            phone: uploadData.ownerPhone.trim(),
            provinceId: selectedGhnProvinceId,
            districtId: selectedGhnDistrictId,
            wardCode: selectedGhnWardCode,
            fullAddress: fullAddr,
          }));
        }
      } catch (_) {}

      const res = await createProductAction({
        product: {
          name: uploadData.title.trim(),
          description: uploadData.description.trim() || uploadData.story.trim() || `Trang phục đi tiệc ${uploadData.occasion} chọn lọc từ tủ đồ cá nhân. Tình trạng ${uploadData.condition}%, chất liệu ${uploadData.material}.`,
          size: uploadData.size,
          material: uploadData.material,
          color: "Tự nhiên",
          condition: uploadData.condition,
          province: uploadData.province.trim(),
          district: uploadData.district.trim(),
          ward: uploadData.ward.trim(),
          address: uploadData.note?.trim() ? `${uploadData.address.trim()} (Ghi chú: ${uploadData.note.trim()})` : uploadData.address.trim(),
          ownerPhone: uploadData.ownerPhone.trim(),
          occasion: uploadData.occasion,
        },
        listings: {
          isRental: uploadData.isRental,
          isSale: uploadData.isSale,
          rentalPrice: parsedRentPrice,
          salePrice: parsedSalePrice,
          deposit: parsedDeposit,
          minDays: 3
        },
        uploadedImageUrls: finalImageUrls,
        hasStory: Boolean(uploadData.story.trim()),
        storyText: uploadData.story.trim()
      });

      if (res.success) {
        setPostSuccess(true);
        await Promise.all([
          (async () => {
            const refreshRes = await getShopProductsAction({ type: "all", page: 1, limit: 30 });
            if (refreshRes.success && refreshRes.products) {
              setProducts(refreshRes.products);
              setTotalProductsCount(refreshRes.totalCount || refreshRes.products.length);
            }
          })(),
          refreshPersonalData()
        ]);

        setTimeout(() => {
          setPostSuccess(false);
          setIsUploadModalOpen(false);
          setUploadedImages([]);
          // Giữ nguyên trạm gửi đã lưu để các lần đăng sau không cần gõ lại!
          setUploadData(prev => ({
            ...prev,
            title: "",
            category: "Đầm dạ hội & Sự kiện",
            occasion: "Tiệc cưới",
            size: "M",
            condition: "99",
            material: "Lụa tơ tằm cao cấp",
            isRental: true,
            rentalPrice: "280.000",
            deposit: "500.000",
            isSale: false,
            salePrice: "",
            originalPrice: "3.200.000",
            description: "",
            story: "",
            imageFile: null,
            imagePreview: "",
          }));
        }, 1400);
      } else {
        setPostError(res.error || "Có lỗi xảy ra khi lưu món đồ vào tủ.");
      }
    } catch (err: any) {
      setPostError(err.message || "Lỗi máy chủ khi kết nối.");
    } finally {
      setIsSubmittingPost(false);
    }
  };

  // 💾 CẬP NHẬT HỒ SƠ CÁ NHÂN
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !closetData?.user?.id) {
      setShowAuthModal(true);
      return;
    }

    setIsSavingProfile(true);
    setProfileSaveSuccess(false);

    try {
      const res = await updateClosetProfileAction({
        userId: closetData?.user?.id || currentUser?.id || "",
        name: profileForm.name,
        location: profileForm.pickupAddress || profileForm.name,
        bio: profileForm.bio,
        quote: profileForm.quote,
      });

      if (res.success) {
        setProfileSaveSuccess(true);
        await refreshPersonalData();
        setTimeout(() => setProfileSaveSuccess(false), 2500);
      }
    } catch (err) {
      console.error("Lỗi cập nhật hồ sơ:", err);
    } finally {
      setIsSavingProfile(false);
    }
  };

  // 🛒 THÊM VÀO GIỎ THUÊ NỘI BỘ APP
  const handleAddToCart = (product: any) => {
    setCartItems(prev => {
      const exists = prev.find(item => item.id === product.id);
      if (exists) return prev;
      return [...prev, product];
    });
    setAddedToCartToast(true);
    setTimeout(() => setAddedToCartToast(false), 2000);
  };

  const displayName = closetData?.user?.name || (currentUser?.name ? currentUser.name.split(" ").pop() : "");

  return (
    // 🏛️ KHUNG NGOÀI THOÁNG ĐÃNG
    <div className="min-h-screen bg-[#FAF8F5] sm:bg-[#EAE7E1] py-0 sm:py-8 flex justify-center selection:bg-[#0A2517] selection:text-white">
      
      {/* 📱 KHUNG MÁY APP: TRẢI NGHIỆM 100% NATIVE MOBILE APP */}
      <div 
        ref={scrollContainerRef}
        className="w-full sm:max-w-[430px] min-h-screen sm:min-h-[890px] sm:max-h-[920px] bg-[#FBF9F5] text-[#0A2517] antialiased sm:shadow-[0_25px_60px_rgba(0,0,0,0.18)] sm:rounded-[44px] sm:border-[6px] border-stone-800/80 relative overflow-y-auto overflow-x-hidden select-none pb-24 no-scrollbar flex flex-col"
      >
        
        {/* ========================================================
            🌿 1. HEADER NATIVE APP TINH TẾ & THOÁNG ĐÃNG
            ======================================================== */}
        <div className="sticky top-0 z-40 bg-[#FBF9F5]/95 backdrop-blur-md pt-3.5 pb-2.5 px-4 border-b border-stone-200/60 transition-colors">
          
          {/* Tiêu đề & Logo chuẩn nhận diện CLOOP: Thoáng đãng, tinh tế, sang trọng */}
          <div className="flex items-center justify-between mb-2.5 pt-0.5">
            <div className="flex items-center gap-2">
              <div className="relative w-8 h-8 flex items-center justify-center shrink-0">
                <Image 
                  src="/loogo.png" 
                  alt="CLOOP Brand Logo" 
                  width={32} 
                  height={32} 
                  className="mix-blend-multiply drop-shadow-xs" 
                />
              </div>
              <span className="font-brand-title text-[22px] font-black tracking-[0.14em] text-[#183A2D] leading-none">
                CLOOP
              </span>
            </div>

            {/* 🇻🇳 🇬🇧 NÚT CHUYỂN ĐỔI NGÔN NGỮ ĐƠN GỌN GÀNG (LÁ CỜ QUỐC KỲ CHUẨN SVG + VIE / ENG) */}
            <button
              type="button"
              onClick={() => toggleLang(lang === "vi" ? "en" : "vi")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 hover:bg-stone-100 active:scale-95 border border-stone-200 shadow-2xs transition-all cursor-pointer select-none shrink-0"
              title={lang === "vi" ? "Chuyển sang English" : "Chuyển sang Tiếng Việt"}
            >
              {lang === "vi" ? (
                <svg className="w-4 h-2.5 rounded-xs shadow-2xs shrink-0 overflow-hidden" viewBox="0 0 30 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="30" height="20" fill="#DA251D"/>
                  <polygon points="15,4 16.5,8.8 21.5,8.8 17.5,11.8 19,16.5 15,13.5 11,16.5 12.5,11.8 8.5,8.8 13.5,8.8" fill="#FFFF00"/>
                </svg>
              ) : (
                <svg className="w-4 h-2.5 rounded-xs shadow-2xs shrink-0 overflow-hidden" viewBox="0 0 60 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <clipPath id="uk-flag-mobile">
                    <rect width="60" height="30" />
                  </clipPath>
                  <g clipPath="url(#uk-flag-mobile)">
                    <rect width="60" height="30" fill="#012169"/>
                    <path d="M0,0 L60,30 M60,0 L0,30" stroke="#FFF" strokeWidth="6"/>
                    <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="4"/>
                    <path d="M30,0 v30 M0,15 h60" stroke="#FFF" strokeWidth="10"/>
                    <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6"/>
                  </g>
                </svg>
              )}
              <span className="text-[11px] font-bold text-[#0A2517] tracking-tight">
                {lang === "vi" ? "Vie" : "Eng"}
              </span>
            </button>
          </div>

          {/* Ô TÌM KIẾM TRONG APP (HIỂN THỊ Ở TAB KHÁM PHÁ & SÀN ĐỒ) */}
          {(activeTab === "home" || activeTab === "shop") && (
            <div className="relative flex items-center">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={lang === "vi" ? "Tìm đầm tiệc cưới, dạ hội, áo dài..." : "Search dresses, gala, wedding outfits..."}
                className="w-full h-10 bg-white text-stone-900 placeholder-stone-400 pl-4 pr-10 rounded-xl text-xs font-medium outline-none border border-stone-200/90 shadow-2xs focus:border-[#0A2517] focus:ring-1 focus:ring-[#0A2517]"
              />
              <button
                type="button"
                className="absolute right-3.5 text-stone-400 hover:text-[#0A2517] transition"
              >
                <Search size={16} />
              </button>
            </div>
          )}

          {/* TOAST THÔNG BÁO CHUYỂN ĐỔI NGÔN NGỮ */}
          {langToast && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-[#0A2517] text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-md border border-emerald-600/60 animate-bounce">
              {langToast}
            </div>
          )}
        </div>

        {/* ========================================================
            🌟 NỘI DUNG CHÍNH THEO TỪNG TAB TRONG APP
            ======================================================== */}

        {/* ========================================================
            🌟 TAB 1: KHÁM PHÁ (HOME) - BANNER & BST NỔI BẬT
            ======================================================== */}
        {activeTab === "home" && (
          <>
            {/* BANNER BÌA TRÀN VIỀN (FULL-BLEED EDGE-TO-EDGE) */}
            <div 
              onClick={() => setActiveTab("shop")}
              className="w-full shrink-0 relative overflow-hidden cursor-pointer border-b border-stone-200/80 group"
              title="Khám phá toàn bộ sàn đồ tuần hoàn"
            >
              <img
                src="/Mobile-cover.jpg"
                alt="CLOOP - Mặc Đẹp. Dùng Lâu. Thuê • Sở Hữu • Trao Đổi"
                className="w-full h-auto block object-cover group-hover:scale-[1.01] transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-black/0 hover:bg-black/5 transition-colors" />
            </div>

            {/* THÔNG SỐ TÁC ĐỘNG TUẦN HOÀN */}
            <div className="mx-3 mt-3 bg-white rounded-xl p-2.5 border border-stone-200/70 shadow-2xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-700 shrink-0 ml-1" />
                <div>
                  <p className="text-[11px] font-bold text-[#0A2517]">
                    {totalProductsCount > 0 
                      ? (lang === "vi" ? `${totalProductsCount * 120}+ lượt mặc tuần hoàn` : `${totalProductsCount * 120}+ circular rotations`) 
                      : (lang === "vi" ? "Tủ đồ tuần hoàn CLOOP" : "CLOOP Circular Closet")}
                  </p>
                  <p className="text-[9.5px] text-stone-500">
                    {lang === "vi" ? "Đã giảm 65 tấn khí thải CO2e cùng cộng đồng" : "Saved 65 tons of CO2e with community"}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="px-2.5 py-1.5 rounded-lg bg-[#0A2517] text-white text-[10px] font-bold shadow-2xs hover:bg-[#143E29] transition active:scale-95 shrink-0 cursor-pointer"
              >
                {lang === "vi" ? "+ Up đồ" : "+ List"}
              </button>
            </div>


            {/* DÃY DANH MỤC LỰA CHỌN ĐI TIỆC */}
            <div className="px-3 pt-2 pb-2">
              <div className="flex items-center justify-between mb-2 px-1">
                <h2 className="font-heading font-black text-sm uppercase tracking-wider text-[#0A2517]">
                  {lang === "vi" ? "Gợi Ý Trang Phục Nổi Bật" : "Featured Outfits"}
                </h2>
                <button
                  onClick={() => setActiveTab("shop")}
                  className="text-[11px] font-bold text-emerald-800 hover:underline cursor-pointer"
                >
                  {lang === "vi" ? "Xem tất cả →" : "View all →"}
                </button>
              </div>

              {/* Dãy nút dịp tiệc */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                {OCCASIONS_TABS.map((tab) => {
                  const isActive = selectedOccasion === tab.name;
                  const label = lang === "en" 
                    ? (tab.name === "Tất cả" ? "All" : tab.name === "Tiệc cưới" ? "Wedding" : tab.name === "Dạ hội" ? "Gala" : tab.name === "Sinh nhật" ? "Birthday" : tab.name === "Áo dài" ? "Heritage" : tab.name === "Phụ kiện" ? "Accessories" : tab.name)
                    : tab.name;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setSelectedOccasion(tab.name)}
                      className={`px-3.5 py-1.5 rounded-full text-[11.5px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                        isActive
                          ? "bg-[#0A2517] text-white shadow-xs"
                          : "bg-white text-stone-700 hover:bg-stone-100 border border-stone-200/80"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* LƯỚI CARD SẢN PHẨM GỢI Ý - ẢNH TO NỔI BẬT CHUẨN E-COMMERCE */}
            <div className="px-3 pb-28 flex-1">
              {filteredProducts.length === 0 ? (
                <div className="py-12 text-center text-stone-500 bg-white rounded-2xl border border-stone-200/80 p-6 space-y-2">
                  <p className="text-xs font-bold text-stone-700">Chưa có trang phục trong dịp &ldquo;{selectedOccasion}&rdquo;</p>
                  <button
                    onClick={() => { setSelectedOccasion("Tất cả"); setSearchQuery(""); }}
                    className="mt-1 px-3.5 py-1.5 bg-[#0A2517] text-white text-xs font-bold rounded-full cursor-pointer"
                  >
                    Xem tất cả trang phục
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {filteredProducts.map((p: any, idx: number) => {
                    const isLiked = !!likedItems[p.id];
                    const isRent = p.listingTypeRaw !== "SELL";
                    const rentPrice = p.rentalPrice || p.price || 0;
                    const salePrice = p.salePrice || p.price || 0;
                    const itemImg = p.image || p.primaryImage || p.images?.[0] || "/1.1.jpg";
                    const ownerName = p.ownerName || "Chủ tủ CLOOP";

                    return (
                      <div
                        key={p.id || idx}
                        onClick={() => setSelectedProduct(p)}
                        className="bg-white rounded-2xl overflow-hidden shadow-xs hover:shadow-md border border-stone-200/80 flex flex-col justify-between relative group text-[#0A2517] cursor-pointer active:scale-[0.98] transition-all"
                      >
                        {/* Khung ảnh trang phục to nổi bật tràn viền trên */}
                        <div className="relative w-full aspect-[4/5] bg-stone-100 overflow-hidden">
                          <Image
                            src={itemImg}
                            alt={p.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                            unoptimized
                            loading="lazy"
                          />

                          {/* Tag phân loại: Thuê đồ / Mua sở hữu thật */}
                          <span className={`absolute top-2 left-2 text-white text-[9.5px] font-bold px-2 py-0.5 rounded-md shadow-xs z-10 ${
                            isRent ? "bg-[#0A2517]/90 backdrop-blur-xs" : "bg-amber-800/90 backdrop-blur-xs"
                          }`}>
                            {isRent ? "Thuê đồ" : "Mua sở hữu"}
                          </span>

                          {/* Nút tim lưu DB thật */}
                          <button
                            type="button"
                            onClick={(e) => handleToggleLike(p.id, e)}
                            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 backdrop-blur-xs flex items-center justify-center text-stone-500 hover:text-red-500 transition shadow-2xs z-10 cursor-pointer"
                          >
                            <Heart size={14} className={isLiked ? "fill-red-500 text-red-500" : "text-stone-400"} />
                          </button>

                          {/* Tag dịp tiệc thật từ database */}
                          {p.occasion && (
                            <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-xs text-white text-[9px] font-medium px-2 py-0.5 rounded-full z-10">
                              {p.occasion}
                            </div>
                          )}
                        </div>

                        {/* Thông tin sản phẩm gọn gàng, dữ liệu thật */}
                        <div className="p-2.5 space-y-1.5 flex-1 flex flex-col justify-between">
                          {/* Chủ tủ (kèm avatar thật nếu có) */}
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewingClosetOwner({
                                id: p.userId || 'official',
                                name: ownerName,
                                avatar: p.ownerAvatar || null,
                                rating: p.rating || 5.0,
                                completedOrders: p.completedOrders || 0,
                                location: p.location || p.province || "Hà Nội",
                              });
                            }}
                            className="flex items-center gap-1.5 text-[10.5px] text-stone-500 truncate cursor-pointer hover:text-emerald-800 transition"
                            title="Ghé tủ đồ"
                          >
                            {p.ownerAvatar ? (
                              <div className="relative w-4 h-4 rounded-full overflow-hidden shrink-0">
                                <Image src={p.ownerAvatar} alt={ownerName} fill className="object-cover" unoptimized />
                              </div>
                            ) : (
                              <div className="w-4 h-4 rounded-full bg-stone-200 text-stone-700 flex items-center justify-center text-[9px] font-bold shrink-0">
                                {ownerName.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span className="truncate font-medium text-stone-600 hover:underline">
                              @{ownerName.toLowerCase().replace(/\s+/g, ".")}
                            </span>
                          </div>

                          {/* Tên trang phục */}
                          <h3 className="font-heading font-black text-xs text-[#0A2517] line-clamp-1 leading-snug">
                            {p.title}
                          </h3>

                          {/* Giá tiền thật (không bịa số) */}
                          <div className="space-y-0.5">
                            <div className="flex items-baseline gap-1">
                              <span className="font-black text-sm text-[#0A2517]">
                                {(isRent ? rentPrice : salePrice).toLocaleString("vi-VN")}đ
                              </span>
                              <span className="text-[10px] text-stone-500 font-normal">
                                {isRent ? "/ ngày" : ""}
                              </span>
                            </div>

                            {/* Gói thuê theo ngày thực tế (Đồng bộ 100% Web) */}
                            {isRent && rentPrice > 0 && (
                              <p className="text-[10px] text-emerald-800 font-medium">
                                Gói {p.minDays || 3} ngày: {(calculatePackageRentalFee(p, p.minDays || 3)).toLocaleString("vi-VN")}đ
                              </p>
                            )}

                            {/* Giá mua mới nếu chủ tủ có cung cấp thật trong DB */}
                            {p.originalPrice && p.originalPrice > 0 && (
                              <p className="text-[9.5px] text-stone-400">
                                Giá mua mới: {Number(p.originalPrice).toLocaleString("vi-VN")}đ
                              </p>
                            )}
                          </div>

                          {/* Thông số Size, Tình trạng thật & Nút giỏ hàng */}
                          <div className="flex items-center justify-between pt-1.5 border-t border-stone-100 text-[10px] text-stone-500">
                            <span className="text-stone-500 font-medium truncate">
                              Size {p.size || "M"}{p.condition ? ` • ${p.condition}` : ""}
                            </span>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddToCart(p);
                              }}
                              className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-[#0A2517] text-stone-700 hover:text-white flex items-center justify-center transition cursor-pointer shrink-0"
                              title="Thêm vào giỏ hàng"
                            >
                              <ShoppingBag size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* ========================================================
            🌟 TAB 2: SÀN ĐỒ (SHOP) - ĐỒNG BỘ 100% VỚI /shop BẢN WEB
            ======================================================== */}
        {activeTab === "shop" && (
          <div className="px-3 pt-3 pb-6 flex-1 space-y-3">
            {/* THANH CHỌN CHẾ ĐỘ: TẤT CẢ | THUÊ ĐỒ | SỞ HỮU (TỐI GIẢN, KHÔNG EMOJI MÀU MÈ) */}
            <div className="flex bg-stone-200/80 p-1 rounded-2xl gap-1">
              <button
                onClick={() => setListingMode("all")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center ${
                  listingMode === "all" 
                    ? "bg-[#0A2517] text-white shadow-xs" 
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                <span>Tất cả</span>
              </button>
              <button
                onClick={() => setListingMode("rent")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center ${
                  listingMode === "rent" 
                    ? "bg-[#0A2517] text-white shadow-xs" 
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                <span>Thuê đồ</span>
              </button>
              <button
                onClick={() => setListingMode("sell")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center ${
                  listingMode === "sell" 
                    ? "bg-[#0A2517] text-white shadow-xs" 
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                <span>Sở hữu</span>
              </button>
            </div>

            {/* DÃY DỊP TIỆC */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {OCCASIONS_TABS.map((tab) => {
                const isActive = selectedOccasion === tab.name;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedOccasion(tab.name)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                      isActive
                        ? "bg-[#0A2517] text-white shadow-xs"
                        : "bg-white text-stone-700 hover:bg-stone-100 border border-stone-200/80"
                    }`}
                  >
                    {tab.name}
                  </button>
                );
              })}
            </div>

            {/* THÔNG TIN SỐ LƯỢNG */}
            <div className="flex items-center justify-between px-1 text-[11px] text-stone-500 font-medium">
              <span>Hiển thị {filteredProducts.length} món</span>
              <span>{listingMode === "rent" ? "Chế độ: Thuê theo ngày" : listingMode === "sell" ? "Chế độ: Mua sở hữu" : "Tất cả phương thức"}</span>
            </div>

            {/* LƯỚI SẢN PHẨM TRÊN SÀN */}
            {filteredProducts.length === 0 ? (
              <div className="py-12 text-center text-stone-500 bg-white rounded-2xl border border-stone-200/80 p-6 space-y-2">
                <p className="text-xs font-bold text-stone-700">Không tìm thấy trang phục phù hợp</p>
                <button
                  onClick={() => { setListingMode("all"); setSelectedOccasion("Tất cả"); setSearchQuery(""); }}
                  className="mt-1 px-3.5 py-1.5 bg-[#0A2517] text-white text-xs font-bold rounded-full cursor-pointer"
                >
                  Đặt lại bộ lọc
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {filteredProducts.map((p: any, idx: number) => {
                  const isLiked = !!likedItems[p.id];
                  const isRent = p.listingTypeRaw !== "SELL";
                  const rentPrice = p.rentalPrice || p.price || 0;
                  const salePrice = p.salePrice || p.price || 0;
                  const itemImg = p.image || p.primaryImage || p.images?.[0] || "/1.1.jpg";
                  const ownerName = p.ownerName || "Chủ tủ CLOOP";

                  return (
                    <div
                      key={p.id || idx}
                      onClick={() => setSelectedProduct(p)}
                      className="bg-white rounded-2xl overflow-hidden shadow-xs hover:shadow-md border border-stone-200/80 flex flex-col justify-between relative group text-[#0A2517] cursor-pointer active:scale-[0.98] transition-all"
                    >
                      {/* Khung ảnh trang phục to nổi bật tràn viền trên */}
                      <div className="relative w-full aspect-[4/5] bg-stone-100 overflow-hidden">
                        <Image
                          src={itemImg}
                          alt={p.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          unoptimized
                          loading="lazy"
                        />

                        {/* Tag phân loại: Thuê đồ / Mua sở hữu thật */}
                        <span className={`absolute top-2 left-2 text-white text-[9.5px] font-bold px-2 py-0.5 rounded-md shadow-xs z-10 ${
                          isRent ? "bg-[#0A2517]/90 backdrop-blur-xs" : "bg-amber-800/90 backdrop-blur-xs"
                        }`}>
                          {isRent ? "Thuê đồ" : "Mua sở hữu"}
                        </span>

                        {/* Nút tim lưu DB thật */}
                        <button
                          type="button"
                          onClick={(e) => handleToggleLike(p.id, e)}
                          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 backdrop-blur-xs flex items-center justify-center text-stone-500 hover:text-red-500 transition shadow-2xs z-10 cursor-pointer"
                        >
                          <Heart size={14} className={isLiked ? "fill-red-500 text-red-500" : "text-stone-400"} />
                        </button>

                        {/* Tag dịp tiệc thật từ database */}
                        {p.occasion && (
                          <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-xs text-white text-[9px] font-medium px-2 py-0.5 rounded-full z-10">
                            {p.occasion}
                          </div>
                        )}
                      </div>

                      {/* Thông tin sản phẩm gọn gàng, dữ liệu thật */}
                      <div className="p-2.5 space-y-1.5 flex-1 flex flex-col justify-between">
                        {/* Chủ tủ (kèm avatar thật nếu có) */}
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewingClosetOwner({
                              id: p.userId || 'official',
                              name: ownerName,
                              avatar: p.ownerAvatar || null,
                              rating: p.rating || 5.0,
                              completedOrders: p.completedOrders || 0,
                              location: p.location || p.province || "Hà Nội",
                            });
                          }}
                          className="flex items-center gap-1.5 text-[10.5px] text-stone-500 truncate cursor-pointer hover:text-emerald-800 transition"
                          title="Ghé tủ đồ"
                        >
                          {p.ownerAvatar ? (
                            <div className="relative w-4 h-4 rounded-full overflow-hidden shrink-0">
                              <Image src={p.ownerAvatar} alt={ownerName} fill className="object-cover" unoptimized />
                            </div>
                          ) : (
                            <div className="w-4 h-4 rounded-full bg-stone-200 text-stone-700 flex items-center justify-center text-[9px] font-bold shrink-0">
                              {ownerName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="truncate font-medium text-stone-600 hover:underline">
                            @{ownerName.toLowerCase().replace(/\s+/g, ".")}
                          </span>
                        </div>

                        {/* Tên trang phục */}
                        <h3 className="font-heading font-black text-xs text-[#0A2517] line-clamp-1 leading-snug">
                          {p.title}
                        </h3>

                        {/* Giá tiền thật (không bịa số) */}
                        <div className="space-y-0.5">
                          <div className="flex items-baseline gap-1">
                            <span className="font-black text-sm text-[#0A2517]">
                              {(isRent ? rentPrice : salePrice).toLocaleString("vi-VN")}đ
                            </span>
                            <span className="text-[10px] text-stone-500 font-normal">
                              {isRent ? "/ ngày" : ""}
                            </span>
                          </div>

                          {/* Gói thuê theo ngày thực tế (Đồng bộ 100% Web) */}
                          {isRent && rentPrice > 0 && (
                            <p className="text-[10px] text-emerald-800 font-medium">
                              Gói {p.minDays || 3} ngày: {(calculatePackageRentalFee(p, p.minDays || 3)).toLocaleString("vi-VN")}đ
                            </p>
                          )}

                          {/* Giá mua mới nếu chủ tủ có cung cấp thật trong DB */}
                          {p.originalPrice && p.originalPrice > 0 && (
                            <p className="text-[9.5px] text-stone-400">
                              Giá mua mới: {Number(p.originalPrice).toLocaleString("vi-VN")}đ
                            </p>
                          )}
                        </div>

                        {/* Thông số Size, Tình trạng thật & Nút giỏ hàng */}
                        <div className="flex items-center justify-between pt-1.5 border-t border-stone-100 text-[10px] text-stone-500">
                          <span className="text-stone-500 font-medium truncate">
                            Size {p.size || "M"}{p.condition ? ` • ${p.condition}` : ""}
                          </span>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddToCart(p);
                            }}
                            className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-[#0A2517] text-stone-700 hover:text-white flex items-center justify-center transition cursor-pointer shrink-0"
                            title="Thêm vào giỏ hàng"
                          >
                            <ShoppingBag size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            🌟 TAB 4: ĐƠN HÀNG & LỊCH THUÊ (ĐỒNG BỘ /my-closet/orders & GIỎ THUÊ)
            ======================================================== */}
        {activeTab === "orders" && (
          <div className="p-3.5 space-y-3.5 flex-1">
            {/* SUB-TABS: ĐỒ ĐI THUÊ | ĐỒ CHO THUÊ | GIỎ THUÊ */}
            <div className="flex bg-stone-200/80 p-1 rounded-2xl gap-1">
              <button
                onClick={() => setOrderSubTab("renter")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1 ${
                  orderSubTab === "renter" 
                    ? "bg-[#0A2517] text-white shadow-xs" 
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                <span>Đồ đi thuê ({closetData?.ordersAsRenter?.length || 0})</span>
              </button>
              <button
                onClick={() => setOrderSubTab("lender")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1 ${
                  orderSubTab === "lender" 
                    ? "bg-[#0A2517] text-white shadow-xs" 
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                <span>Cho thuê ({closetData?.ordersAsLender?.length || 0})</span>
              </button>
              <button
                onClick={() => setOrderSubTab("cart")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1 relative ${
                  orderSubTab === "cart" 
                    ? "bg-[#0A2517] text-white shadow-xs" 
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                <span>Giỏ đồ ({cartItems.length})</span>
                {cartItems.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-emerald-600" />
                )}
              </button>
            </div>

            {/* SUB-CONTENT 1: ĐỒ ĐI THUÊ */}
            {orderSubTab === "renter" && (
              <div className="space-y-3">
                {safeOrdersAsRenter.length === 0 ? (
                  <div className="py-12 text-center bg-white rounded-2xl border border-stone-200/80 p-6 space-y-3 text-stone-500">
                    <h4 className="font-bold text-sm text-stone-800">
                      {lang === "vi" ? "Chưa có đơn thuê trang phục nào" : "No rental orders yet"}
                    </h4>
                    <p className="text-xs text-stone-500 max-w-xs mx-auto">
                      {lang === "vi" ? "Dạo Sàn đồ CLOOP để chọn đầm dạ hội, áo dài và phụ kiện cho sự kiện sắp tới của bạn." : "Browse CLOOP to find dresses and outfits for your next event."}
                    </p>
                    <button
                      onClick={() => setActiveTab("shop")}
                      className="px-4 py-2 bg-[#0A2517] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                    >
                      {lang === "vi" ? "Dạo Sàn Đồ Ngay" : "Browse Shop Now"}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {safeOrdersAsRenter.map((order: any, idx: number) => (
                      <div key={order.id || idx} className="bg-white rounded-2xl p-3.5 border border-stone-200/80 shadow-2xs space-y-2">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-mono text-stone-400">Đơn #{order.id?.slice(-6) || idx + 1}</span>
                          <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full text-[10px]">
                            {order.status === "COMPLETED" ? "Đã trả đồ" : "Đang thuê"}
                          </span>
                        </div>
                        <div className="flex gap-3 items-center">
                          <div className="relative w-14 h-16 rounded-xl overflow-hidden bg-stone-100 shrink-0">
                            <Image src={order.productImage || "/1.1.jpg"} alt={order.productTitle || "Trang phục"} fill className="object-cover" unoptimized />
                          </div>
                          <div className="flex-1 min-w-0 text-xs">
                            <h5 className="font-bold text-stone-900 truncate">{order.productTitle}</h5>
                            <p className="text-stone-500 text-[11px] mt-0.5">Lịch thuê: {order.startDate} - {order.endDate}</p>
                            <p className="font-black text-[#0A2517] mt-1">{(Number(order.amount) || 0).toLocaleString("vi-VN")}đ</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* SUB-CONTENT 2: ĐỒ CHO THUÊ */}
            {orderSubTab === "lender" && (
              <div className="space-y-3">
                {safeOrdersAsLender.length === 0 ? (
                  <div className="py-12 text-center bg-white rounded-2xl border border-stone-200/80 p-6 space-y-3 text-stone-500">
                    <h4 className="font-bold text-sm text-stone-800">
                      {lang === "vi" ? "Chưa có khách đặt thuê đồ" : "No rental bookings yet"}
                    </h4>
                    <p className="text-xs text-stone-500 max-w-xs mx-auto">
                      {lang === "vi" ? "Đăng thêm đầm tiệc vào kệ đồ để bắt đầu tạo thu nhập thụ động tuần hoàn." : "Add more dresses to your closet to start earning passive income."}
                    </p>
                    <button
                      onClick={() => setIsUploadModalOpen(true)}
                      className="px-4 py-2 bg-[#0A2517] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                    >
                      {lang === "vi" ? "+ Đăng Trang Phục Mới" : "+ List New Outfit"}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {safeOrdersAsLender.map((order: any, idx: number) => (
                      <div key={order.id || idx} className="bg-white rounded-2xl p-3.5 border border-stone-200/80 shadow-2xs space-y-2">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-mono text-stone-400">Yêu cầu #{order.id?.slice(-6) || idx + 1}</span>
                          <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full text-[10px]">
                            {order.status === "COMPLETED" ? "Hoàn tất" : "Chờ giao"}
                          </span>
                        </div>
                        <div className="flex gap-3 items-center">
                          <div className="relative w-14 h-16 rounded-xl overflow-hidden bg-stone-100 shrink-0">
                            <Image src={order.productImage || "/1.1.jpg"} alt={order.productTitle || "Trang phục"} fill className="object-cover" unoptimized />
                          </div>
                          <div className="flex-1 min-w-0 text-xs">
                            <h5 className="font-bold text-stone-900 truncate">{order.productTitle}</h5>
                            <p className="text-stone-500 text-[11px] mt-0.5">Lịch: {order.startDate} - {order.endDate}</p>
                            <div className="flex items-center justify-between mt-1">
                              <span className="font-black text-[#0A2517]">{(Number(order.amount) || 0).toLocaleString("vi-VN")}đ</span>
                              <span className="text-[10px] text-stone-400">Cọc: {(Number(order.depositAmount) || 0).toLocaleString("vi-VN")}đ</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* SUB-CONTENT 3: GIỎ THUÊ HIỆN TẠI */}
            {orderSubTab === "cart" && (
              <div className="space-y-3">
                {cartItems.length === 0 ? (
                  <div className="py-12 text-center space-y-3 bg-white rounded-2xl border border-stone-200/80 p-6">
                    <h4 className="font-bold text-sm text-stone-800">Giỏ thuê của bạn đang trống</h4>
                    <p className="text-xs text-stone-500 max-w-xs mx-auto">
                      Hãy dạo Sàn đồ để chọn những mẫu trang phục ưng ý.
                    </p>
                    <button
                      onClick={() => setActiveTab("shop")}
                      className="px-4 py-2 bg-[#0A2517] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                    >
                      Dạo Sàn Đồ Ngay
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-1">
                      <span className="text-xs font-bold text-stone-500">Danh sách ({cartItems.length})</span>
                      <button
                        onClick={() => setCartItems([])}
                        className="text-xs text-rose-600 hover:underline cursor-pointer"
                      >
                        Xóa tất cả
                      </button>
                    </div>

                    {cartItems.map((item, idx) => {
                      const itemImg = item.image || item.primaryImage || item.images?.[0] || "/1.1.jpg";
                      const packageFee = calculatePackageRentalFee(item, item.minDays || 3);
                      return (
                        <div key={idx} className="bg-white rounded-2xl p-3 border border-stone-200/80 shadow-2xs flex gap-3 items-center">
                          <div className="relative w-16 h-20 rounded-xl overflow-hidden bg-stone-100 shrink-0">
                            <Image src={itemImg} alt={item.title} fill className="object-cover" unoptimized />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-[9.5px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded">
                              {item.occasion || "Đi tiệc"}
                            </span>
                            <p className="text-xs font-black text-[#0A2517] mt-1">
                              {(item.rentalPrice || item.price || 0).toLocaleString("vi-VN")}đ <span className="text-[10px] font-normal text-stone-500">/ ngày</span>
                            </p>
                            <p className="text-[10px] text-emerald-800 font-medium">
                              • Gói {item.minDays || 3} ngày: {packageFee.toLocaleString("vi-VN")}đ
                            </p>
                          </div>
                          <button
                            onClick={() => setCartItems(prev => prev.filter((_, i) => i !== idx))}
                            className="text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      );
                    })}

                    <div className="bg-white rounded-2xl p-4 border border-stone-200 space-y-2 mt-4">
                      <div className="flex justify-between text-xs text-stone-600">
                        <span>Tạm tính phí thuê (gói 3 ngày):</span>
                        <span className="font-bold text-stone-900">
                          {cartItems.reduce((sum, item) => sum + calculatePackageRentalFee(item, item.minDays || 3), 0).toLocaleString("vi-VN")}đ
                        </span>
                      </div>
                      <div className="flex justify-between text-xs text-stone-600">
                        <span>Bảo hiểm trang phục:</span>
                        <span className="text-emerald-700 font-bold">Miễn phí</span>
                      </div>
                      <div className="pt-2 border-t border-stone-100 flex justify-between items-center">
                        <span className="font-bold text-sm text-[#0A2517]">Tổng thanh toán:</span>
                        <span className="font-heading font-black text-base text-[#0A2517]">
                          {cartItems.reduce((sum, item) => sum + calculatePackageRentalFee(item, item.minDays || 3), 0).toLocaleString("vi-VN")}đ
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          if (cartItems.length > 0) {
                            handleOpenCheckout(cartItems[0]);
                          }
                        }}
                        className="w-full h-11 bg-[#0A2517] text-white font-bold text-xs rounded-xl shadow-md mt-2 flex items-center justify-center gap-2 cursor-pointer hover:bg-[#15462D] transition"
                      >
                        <span>Tiến hành đặt cọc &amp; giữ lịch ({cartItems.length} món)</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            🌟 TAB 5: TỦ ĐỒ CÁ NHÂN (CHIA THEO CÁC THANH QUẢN LÝ THOÁNG ĐÃNG NHƯ BẢN WEB)
            ======================================================== */}
        {activeTab === "closet" && (
          <div className="p-3.5 space-y-3.5 flex-1">
            
            {/* THẺ ĐĂNG NHẬP (NẾU CHƯA CÓ SESSION) */}
            {!currentUser && !closetData?.isLoggedIn ? (
              <div className="bg-[#0A2517] text-white rounded-3xl p-5 space-y-4 relative overflow-hidden shadow-lg border border-emerald-800">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-300">
                    ĐỒNG BỘ TỦ ĐỒ THỜI TRANG TUẦN HOÀN
                  </span>
                  <h3 className="font-heading font-black text-xl text-white mt-1 leading-tight">
                    Kích Hoạt ID Xanh Cá Nhân
                  </h3>
                  <p className="text-xs text-stone-300 mt-1 leading-relaxed">
                    Đăng nhập để xem tủ đồ chia sẻ từ bản web, kiểm tra lịch khách thuê đồ, tích lũy điểm xanh và nhận thu nhập thụ động.
                  </p>
                </div>
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="w-full py-3 rounded-xl bg-white text-[#0A2517] font-bold text-xs tracking-wider uppercase shadow-sm hover:bg-stone-100 transition cursor-pointer"
                >
                  Đăng Nhập / Tạo ID Xanh Ngay
                </button>
              </div>
            ) : (
              <>
                {/* 1. THẺ HỒ SƠ TÓM TẮT TINH TẾ (GỌN GÀNG, KHÔNG BỊ NHỒI NHÉT) */}
                <div className="bg-[#0A2517] text-white rounded-3xl p-4 space-y-3 shadow-md border border-emerald-900/60 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-emerald-800 text-white flex items-center justify-center font-heading font-black text-lg border-2 border-emerald-400 overflow-hidden shrink-0 shadow-xs">
                        {closetData?.user?.avatar && typeof closetData.user.avatar === "string" && closetData.user.avatar.trim() !== "" ? (
                          <Image src={closetData.user.avatar} alt="Avatar" width={48} height={48} className="object-cover" unoptimized />
                        ) : (
                          displayName ? displayName[0].toUpperCase() : "C"
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h2 className="font-heading font-black text-base text-white truncate max-w-[170px]">
                            {displayName || "Thành viên CLOOP"}
                          </h2>
                          <span className="text-[9px] bg-emerald-700/80 text-emerald-200 px-1.5 py-0.2 rounded font-bold shrink-0">
                            Chính chủ
                          </span>
                        </div>
                        <p className="text-[11px] text-emerald-200/80 truncate max-w-[190px]">
                          {closetData?.user?.email || currentUser?.email || "member@cloop.vn"}
                        </p>
                        <p className="text-[9.5px] text-stone-400 mt-0.5">
                          Gia nhập: {closetData?.user?.joinDate || "2026"} • {closetData?.user?.location || "Nghệ An"}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={refreshPersonalData}
                      disabled={isRefreshingCloset}
                      className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-emerald-300 transition cursor-pointer"
                      title="Làm mới dữ liệu"
                    >
                      <RefreshCw size={13} className={isRefreshingCloset ? "animate-spin" : ""} />
                    </button>
                  </div>

                  {/* 3 Viên nang số liệu gọn gàng */}
                  <div className="grid grid-cols-3 gap-1.5 pt-1.5 border-t border-emerald-800/60 text-center">
                    <div className="bg-white/10 rounded-xl py-1 px-1.5">
                      <span className="text-[8.5px] text-emerald-200 block">Ví Thu Nhập</span>
                      <p className="font-mono font-black text-xs text-emerald-300">
                        {(closetData?.user?.walletBalance || 0).toLocaleString("vi-VN")}đ
                      </p>
                    </div>
                    <div className="bg-white/10 rounded-xl py-1 px-1.5">
                      <span className="text-[8.5px] text-emerald-200 block">Điểm Xanh</span>
                      <p className="font-mono font-black text-xs text-white">
                        {closetData?.stats?.greenPoints || 120} pts
                      </p>
                    </div>
                    <div className="bg-white/10 rounded-xl py-1 px-1.5">
                      <span className="text-[8.5px] text-emerald-200 block">Giảm CO2</span>
                      <p className="font-mono font-black text-xs text-white">
                        {Math.round((closetData?.stats?.co2Saved || 15) * 10) / 10}kg
                      </p>
                    </div>
                  </div>
                </div>

                {/* ========================================================
                    2. CÁC THANH MENU 3 GẠCH QUẢN LÝ (CHIA RÕ RÀNG NHƯ BẢN WEB)
                    ======================================================== */}
                {activeClosetView === "menu" ? (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between px-1">
                      <h3 className="font-heading font-black text-xs uppercase tracking-wider text-[#0A2517]">
                        Danh Mục Quản Lý Tủ Đồ
                      </h3>
                    </div>

                    {/* THANH 1: KỆ ĐỒ CÁ NHÂN */}
                    <button
                      onClick={() => setActiveClosetView("items")}
                      className="w-full bg-white rounded-2xl p-3.5 border border-stone-200/80 shadow-2xs flex items-center justify-between hover:border-[#0A2517] hover:shadow-xs transition active:scale-[0.99] cursor-pointer text-left group"
                    >
                      <div>
                        <h4 className="text-xs font-bold text-stone-900 group-hover:text-[#0A2517]">
                          Kệ Đồ Của Tôi
                        </h4>
                        <p className="text-[11px] text-stone-500 mt-0.5">
                          Quản lý các trang phục đang cho thuê &amp; pass lại
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full">
                          {closetData?.myProducts?.length || 0} món
                        </span>
                        <ChevronRight size={16} className="text-stone-400 group-hover:text-[#0A2517] transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </button>

                    {/* THANH 2: ĐƠN HÀNG & LỊCH THUÊ */}
                    <button
                      onClick={() => setActiveClosetView("orders")}
                      className="w-full bg-white rounded-2xl p-3.5 border border-stone-200/80 shadow-2xs flex items-center justify-between hover:border-[#0A2517] hover:shadow-xs transition active:scale-[0.99] cursor-pointer text-left group"
                    >
                      <div>
                        <h4 className="text-xs font-bold text-stone-900 group-hover:text-[#0A2517]">
                          Đơn Hàng &amp; Lịch Hẹn Thuê
                        </h4>
                        <p className="text-[11px] text-stone-500 mt-0.5">
                          Theo dõi khách thuê đồ &amp; trang phục bạn đang thuê
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[11px] font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded-full">
                          {(closetData?.ordersAsLender?.length || 0) + (closetData?.ordersAsRenter?.length || 0)} đơn
                        </span>
                        <ChevronRight size={16} className="text-stone-400 group-hover:text-[#0A2517] transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </button>

                    {/* THANH 3: VÍ THU NHẬP & SỐ DƯ */}
                    <button
                      onClick={() => setActiveClosetView("wallet")}
                      className="w-full bg-white rounded-2xl p-3.5 border border-stone-200/80 shadow-2xs flex items-center justify-between hover:border-[#0A2517] hover:shadow-xs transition active:scale-[0.99] cursor-pointer text-left group"
                    >
                      <div>
                        <h4 className="text-xs font-bold text-stone-900 group-hover:text-[#0A2517]">
                          Ví Thu Nhập &amp; Doanh Thu
                        </h4>
                        <p className="text-[11px] text-stone-500 mt-0.5">
                          Số dư khả dụng từ tiền thuê &amp; thanh toán
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full">
                          {(closetData?.user?.walletBalance || 0).toLocaleString("vi-VN")}đ
                        </span>
                        <ChevronRight size={16} className="text-stone-400 group-hover:text-[#0A2517] transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </button>

                    {/* THANH 4: TÁC ĐỘNG SINH THÁI (ECO STATS) */}
                    <button
                      onClick={() => setActiveClosetView("eco")}
                      className="w-full bg-white rounded-2xl p-3.5 border border-stone-200/80 shadow-2xs flex items-center justify-between hover:border-[#0A2517] hover:shadow-xs transition active:scale-[0.99] cursor-pointer text-left group"
                    >
                      <div>
                        <h4 className="text-xs font-bold text-stone-900 group-hover:text-[#0A2517]">
                          Thống Kê Sinh Thái &amp; Điểm Xanh
                        </h4>
                        <p className="text-[11px] text-stone-500 mt-0.5">
                          Lượng CO2, nước bảo tồn và huy hiệu tuần hoàn
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[11px] font-bold text-teal-900 bg-teal-50 px-2 py-0.5 rounded-full">
                          {closetData?.stats?.greenPoints || 120} pts
                        </span>
                        <ChevronRight size={16} className="text-stone-400 group-hover:text-[#0A2517] transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </button>

                    {/* THANH 5: HỒ SƠ & ĐỊA CHỈ GIAO NHẬN */}
                    <button
                      onClick={() => setActiveClosetView("profile")}
                      className="w-full bg-white rounded-2xl p-3.5 border border-stone-200/80 shadow-2xs flex items-center justify-between hover:border-[#0A2517] hover:shadow-xs transition active:scale-[0.99] cursor-pointer text-left group"
                    >
                      <div>
                        <h4 className="text-xs font-bold text-stone-900 group-hover:text-[#0A2517]">
                          Hồ Sơ &amp; Địa Chỉ Giao Nhận
                        </h4>
                        <p className="text-[11px] text-stone-500 mt-0.5 truncate max-w-[210px]">
                          {closetData?.user?.location || "Cập nhật địa chỉ nhận & gửi đồ"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <ChevronRight size={16} className="text-stone-400 group-hover:text-[#0A2517] transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </button>

                    {/* THANH 6: BANNER ĐĂNG MÓN ĐỒ MỚI (NỔI BẬT) */}
                    <button
                      onClick={() => setIsUploadModalOpen(true)}
                      className="w-full bg-[#0A2517] text-white rounded-2xl p-3.5 shadow-sm flex items-center justify-between hover:bg-[#143E29] transition active:scale-[0.99] cursor-pointer text-left mt-3"
                    >
                      <div>
                        <h4 className="text-xs font-black text-white uppercase tracking-wide">
                          Đăng Thêm Trang Phục Mới
                        </h4>
                        <p className="text-[11px] text-stone-300 mt-0.5">
                          Váy tiệc chỉ mặc 1 lần? Chia sẻ để nhận thu nhập
                        </p>
                      </div>
                      <span className="text-[11px] font-bold bg-white text-[#0A2517] px-3 py-1.5 rounded-xl shrink-0 shadow-2xs">
                        + Up ngay
                      </span>
                    </button>
                  </div>
                ) : (
                  /* ========================================================
                      3. CÁC PHÂN MỤC CHI TIẾT (KHI BẤM VÀO TỪNG THANH MENU)
                      ======================================================== */
                  <div className="space-y-3 animate-in fade-in slide-in-from-right-2 duration-200">
                    {/* Nút quay lại Menu danh mục */}
                    <button
                      onClick={() => setActiveClosetView("menu")}
                      className="flex items-center gap-1.5 text-xs font-bold text-[#0A2517] hover:underline cursor-pointer py-1"
                    >
                      <ArrowLeft size={16} />
                      <span>Quay lại danh mục quản lý</span>
                    </button>

                    {/* CHI TIẾT PHÂN MỤC 1: KỆ ĐỒ CỦA TÔI */}
                    {activeClosetView === "items" && (
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between px-1">
                          <h4 className="font-heading font-black text-sm uppercase tracking-wider text-[#0A2517]">
                            Kệ Đồ Của Bạn ({closetData?.myProducts?.length || 0})
                          </h4>
                          <button
                            onClick={() => setIsUploadModalOpen(true)}
                            className="px-2.5 py-1 rounded-lg bg-[#0A2517] text-white text-[11px] font-bold shadow-2xs hover:bg-[#143E29] transition flex items-center gap-1 cursor-pointer"
                          >
                            <Plus size={12} strokeWidth={3} />
                            <span>Up đồ mới</span>
                          </button>
                        </div>

                        {safeMyProducts.length === 0 ? (
                          <div className="p-8 text-center bg-white rounded-2xl border border-stone-200/80 space-y-2">
                            <Shirt size={28} className="mx-auto text-stone-400" />
                            <h4 className="font-bold text-xs text-stone-800">
                              {lang === "vi" ? "Tủ đồ chưa có trang phục nào" : "No items in your closet yet"}
                            </h4>
                            <p className="text-[11px] text-stone-500 max-w-xs mx-auto">
                              {lang === "vi" ? "Đầm tiệc cưới, áo dài, đầm dạ hội của bạn chỉ mặc 1 lần? Hãy chia sẻ vào vòng tuần hoàn để nhận thu nhập thụ động!" : "Share your dresses and outfits into the circular loop to earn passive income!"}
                            </p>
                            <button
                              onClick={() => setIsUploadModalOpen(true)}
                              className="mt-2 px-4 py-2 bg-[#0A2517] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                            >
                              <Plus size={14} />
                              <span>{lang === "vi" ? "Up bài chia sẻ trang phục đầu tiên" : "+ List First Outfit"}</span>
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {safeMyProducts.map((item: any, idx: number) => (
                              <div
                                key={item.id || idx}
                                className="bg-white rounded-2xl p-3 border border-stone-200/80 shadow-2xs flex gap-3 items-center"
                              >
                                <div className="relative w-16 h-20 rounded-xl overflow-hidden bg-stone-100 shrink-0">
                                  <Image src={item.image || "/1.1.jpg"} alt={item.title || "Trang phục"} fill className="object-cover" unoptimized />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded">
                                      {item.occasion || "Đi tiệc"}
                                    </span>
                                    <span className="text-[9px] font-medium text-stone-500">
                                      Size {item.size || "M"}
                                    </span>
                                    <span className="text-[8.5px] bg-emerald-100 text-emerald-900 font-bold px-1.5 py-0.2 rounded ml-auto">
                                      {lang === "vi" ? "Đang hiển thị" : "Active"}
                                    </span>
                                  </div>
                                  <h4 className="text-xs font-bold text-stone-900 truncate mt-1">{item.title}</h4>
                                  <p className="text-xs font-black text-[#0A2517] mt-0.5">
                                    {item.rentalPrice ? `${item.rentalPrice.toLocaleString("vi-VN")}đ / ngày` : "Liên hệ thuê"}
                                  </p>
                                  {item.rentalPrice > 0 && (
                                    <p className="text-[9.5px] text-emerald-800 font-medium">
                                      • Gói 3 ngày (-15%): {(calculatePackageRentalFee(item, 3)).toLocaleString("vi-VN")}đ
                                    </p>
                                  )}
                                  <p className="text-[9.5px] text-stone-400 mt-0.5">
                                    Cọc đảm bảo: {Number(item.deposit || 0) > 0 ? `${Number(item.deposit).toLocaleString("vi-VN")}đ` : "0đ (Miễn cọc)"}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* CHI TIẾT PHÂN MỤC 2: ĐƠN HÀNG & LỊCH HẸN THUÊ */}
                    {activeClosetView === "orders" && (
                      <div className="space-y-3">
                        <div className="flex bg-stone-200/80 p-1 rounded-2xl gap-1">
                          <button
                            onClick={() => setOrderSubTab("lender")}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1 ${
                              orderSubTab === "lender" 
                                ? "bg-[#0A2517] text-white shadow-xs" 
                                : "text-stone-600 hover:text-stone-900"
                            }`}
                          >
                            <span>Khách thuê ({safeOrdersAsLender.length})</span>
                          </button>
                          <button
                            onClick={() => setOrderSubTab("renter")}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1 ${
                              orderSubTab === "renter" 
                                ? "bg-[#0A2517] text-white shadow-xs" 
                                : "text-stone-600 hover:text-stone-900"
                            }`}
                          >
                            <span>Bạn đang thuê ({safeOrdersAsRenter.length})</span>
                          </button>
                        </div>

                        {orderSubTab === "lender" ? (
                          safeOrdersAsLender.length === 0 ? (
                            <div className="p-6 text-center bg-white rounded-2xl border border-stone-200/80 text-stone-500 text-xs">
                              {lang === "vi" ? "Chưa có khách đặt thuê đồ mới. Các trang phục của bạn đang sẵn sàng đón người mặc tiếp theo!" : "No incoming rental requests yet. Your closet is ready for the next wearer!"}
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {safeOrdersAsLender.map((order: any, idx: number) => (
                                <div key={order.id || idx} className="bg-white rounded-2xl p-3.5 border border-stone-200/80 shadow-2xs space-y-2">
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="font-mono text-stone-400">Đơn #{order.id?.slice(-6) || idx + 1}</span>
                                    <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full text-[10px]">
                                      {order.status === "LENDER_COMPLETED" ? "Đã hoàn tất" : "Đang giao dịch"}
                                    </span>
                                  </div>
                                  <div className="flex gap-3 items-center">
                                    <div className="relative w-14 h-16 rounded-xl overflow-hidden bg-stone-100 shrink-0">
                                      <Image src={order.productImage || "/1.1.jpg"} alt={order.productTitle || "Trang phục"} fill className="object-cover" unoptimized />
                                    </div>
                                    <div className="flex-1 min-w-0 text-xs">
                                      <h5 className="font-bold text-stone-900 truncate">{order.productTitle}</h5>
                                      <p className="text-stone-500 text-[11px] mt-0.5">Lịch: {order.startDate} - {order.endDate}</p>
                                      <div className="flex items-center justify-between mt-1">
                                        <span className="font-black text-[#0A2517]">{(Number(order.amount) || 0).toLocaleString("vi-VN")}đ</span>
                                        <span className="text-[10px] text-stone-400">Cọc: {(Number(order.depositAmount) || 0).toLocaleString("vi-VN")}đ</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )
                        ) : (
                          safeOrdersAsRenter.length === 0 ? (
                            <div className="p-6 text-center bg-white rounded-2xl border border-stone-200/80 text-stone-500 text-xs">
                              {lang === "vi" ? "Bạn chưa có đơn thuê trang phục nào. Hãy vào mục Đi tiệc để chuẩn bị cho sự kiện sắp tới!" : "You have no active rentals. Browse events to prepare for your next occasion!"}
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {safeOrdersAsRenter.map((order: any, idx: number) => (
                                <div key={order.id || idx} className="bg-white rounded-2xl p-3.5 border border-stone-200/80 shadow-2xs space-y-2">
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="font-mono text-stone-400">Mã đơn #{order.id?.slice(-6) || idx + 1}</span>
                                    <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full text-[10px]">
                                      Đang thuê
                                    </span>
                                  </div>
                                  <div className="flex gap-3 items-center">
                                    <div className="relative w-14 h-16 rounded-xl overflow-hidden bg-stone-100 shrink-0">
                                      <Image src={order.productImage || "/1.1.jpg"} alt={order.productTitle || "Trang phục"} fill className="object-cover" unoptimized />
                                    </div>
                                    <div className="flex-1 min-w-0 text-xs">
                                      <h5 className="font-bold text-stone-900 truncate">{order.productTitle}</h5>
                                      <p className="text-stone-500 text-[11px] mt-0.5">Thời gian: {order.startDate} - {order.endDate}</p>
                                      <p className="font-black text-[#0A2517] mt-1">{(Number(order.amount) || 0).toLocaleString("vi-VN")}đ</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )
                        )}
                      </div>
                    )}

                    {/* CHI TIẾT PHÂN MỤC 3: VÍ LÁ & THU NHẬP */}
                    {activeClosetView === "wallet" && (
                      <div className="space-y-3">
                        <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-2xs space-y-3">
                          <span className="text-[11px] text-stone-500 uppercase font-bold tracking-wider">Số Dư Khả Dụng</span>
                          <div className="flex items-baseline gap-2">
                            <span className="font-heading font-black text-2xl text-[#0A2517]">
                              {(closetData?.user?.walletBalance || 0).toLocaleString("vi-VN")}đ
                            </span>
                            <span className="text-xs text-emerald-700 font-bold">Ví Lá CLOOP</span>
                          </div>
                          <p className="text-xs text-stone-500 leading-relaxed">
                            Thu nhập nhận được từ các lượt khách thuê trang phục trong tủ đồ của bạn. Tiền thuê được tự động giải ngân sau khi hoàn tất đơn.
                          </p>
                          <button
                            onClick={() => alert("Chức năng liên kết ngân hàng và rút tiền đã sẵn sàng trên bản web!")}
                            className="w-full py-2.5 bg-[#0A2517] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                          >
                            Yêu Cầu Rút Tiền Về Tài Khoản
                          </button>
                        </div>
                      </div>
                    )}

                    {/* CHI TIẾT PHÂN MỤC 4: THỐNG KÊ SINH THÁI (ECO STATS) */}
                    {activeClosetView === "eco" && (
                      <div className="space-y-3">
                        <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-2xs space-y-3">
                          <div className="flex items-center gap-2">
                            <Award className="text-emerald-700" size={20} />
                            <h4 className="font-heading font-black text-sm uppercase tracking-wide text-[#0A2517]">
                              Huy Hiệu Tuần Hoàn: Hạng Bạc
                            </h4>
                          </div>
                          <p className="text-xs text-stone-600 leading-relaxed">
                            Bằng việc chia sẻ và tái sử dụng trang phục, bạn đã góp phần giảm thiểu rác thải dệt may và bảo vệ nguồn nước sạch.
                          </p>
                          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-100 text-center">
                            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-950">
                              <span className="text-[10px] text-stone-500 block">Khí thải CO2e giảm</span>
                              <p className="font-mono font-black text-base text-emerald-800">
                                {Math.round((closetData?.stats?.co2Saved || 47.7) * 10) / 10} kg
                              </p>
                            </div>
                            <div className="p-2.5 rounded-xl bg-teal-50 text-teal-950">
                              <span className="text-[10px] text-stone-500 block">Nước sạch bảo tồn</span>
                              <p className="font-mono font-black text-base text-teal-800">
                                {(closetData?.stats?.waterSaved || 16440).toLocaleString("vi-VN")} Lít
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* CHI TIẾT PHÂN MỤC 5: HỒ SƠ & ĐỊA CHỈ GIAO NHẬN */}
                    {activeClosetView === "profile" && (
                      <form onSubmit={handleSaveProfile} className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                          <h4 className="font-heading font-black text-xs uppercase tracking-wider text-[#0A2517]">
                            Cài Đặt Hồ Sơ Tủ Đồ
                          </h4>
                          {profileSaveSuccess && (
                            <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                              <CheckCircle2 size={12} /> Đã lưu thành công!
                            </span>
                          )}
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-stone-700 mb-1">
                            Họ và Tên / Biệt danh hiển thị
                          </label>
                          <input
                            type="text"
                            value={profileForm.name}
                            onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                            className="w-full h-10 px-3 rounded-xl border border-stone-300 bg-stone-50/50 text-xs font-medium outline-none focus:border-[#0A2517] focus:bg-white"
                            placeholder="VD: Nguyễn Mai Anh"
                          />
                        </div>

                        {/* ĐỊA CHỈ TỦ ĐỒ / GIAO NHẬN TRANG PHỤC */}
                        <div>
                          <label className="block text-[11px] font-bold text-stone-700 mb-1">
                            Tỉnh / Thành phố
                          </label>
                          <select
                            value={selectedGhnProvinceId}
                            onChange={(e) => {
                              const val = e.target.value ? Number(e.target.value) : "";
                              setSelectedGhnProvinceId(val);
                              setSelectedGhnDistrictId("");
                              setSelectedGhnWardCode("");
                              handleApplyGhnAddress(val, "", "", specificAddressDetail, addressNote);
                            }}
                            className="w-full h-10 px-3 rounded-xl border border-stone-300 bg-stone-50/50 text-xs font-medium outline-none focus:border-[#0A2517] focus:bg-white cursor-pointer"
                          >
                            <option value="">-- Chọn Tỉnh / Thành phố --</option>
                            {ghnProvinces.map((prov) => (
                              <option key={prov.ProvinceID} value={prov.ProvinceID}>
                                {prov.ProvinceName}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[11px] font-bold text-stone-700 mb-1">
                              Quận / Huyện
                            </label>
                            <select
                              disabled={!selectedGhnProvinceId || isLoadingGhnDistricts}
                              value={selectedGhnDistrictId}
                              onChange={(e) => {
                                const val = e.target.value ? Number(e.target.value) : "";
                                setSelectedGhnDistrictId(val);
                                setSelectedGhnWardCode("");
                                handleApplyGhnAddress(selectedGhnProvinceId, val, "", specificAddressDetail, addressNote);
                              }}
                              className="w-full h-10 px-3 rounded-xl border border-stone-300 bg-stone-50/50 text-xs font-medium outline-none focus:border-[#0A2517] focus:bg-white disabled:opacity-50 cursor-pointer"
                            >
                              <option value="">-- Chọn Quận / Huyện --</option>
                              {ghnDistricts.map((dist) => (
                                <option key={dist.DistrictID} value={dist.DistrictID}>
                                  {dist.DistrictName}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-stone-700 mb-1">
                              Phường / Xã
                            </label>
                            <select
                              disabled={!selectedGhnDistrictId || isLoadingGhnWards}
                              value={selectedGhnWardCode}
                              onChange={(e) => {
                                const val = e.target.value;
                                setSelectedGhnWardCode(val);
                                handleApplyGhnAddress(selectedGhnProvinceId, selectedGhnDistrictId, val, specificAddressDetail, addressNote);
                              }}
                              className="w-full h-10 px-3 rounded-xl border border-stone-300 bg-stone-50/50 text-xs font-medium outline-none focus:border-[#0A2517] focus:bg-white disabled:opacity-50 cursor-pointer"
                            >
                              <option value="">-- Chọn Phường / Xã --</option>
                              {ghnWards.map((ward) => (
                                <option key={ward.WardCode} value={ward.WardCode}>
                                  {ward.WardName}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-stone-700 mb-1">
                            Địa chỉ cụ thể (Số nhà, tên đường, thôn/xóm)
                          </label>
                          <input
                            type="text"
                            placeholder="VD: Số 12, Khối 5..."
                            value={specificAddressDetail}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSpecificAddressDetail(val);
                              handleApplyGhnAddress(selectedGhnProvinceId, selectedGhnDistrictId, selectedGhnWardCode, val, addressNote);
                            }}
                            className="w-full h-10 px-3 rounded-xl border border-stone-300 bg-stone-50/50 text-xs font-medium outline-none focus:border-[#0A2517] focus:bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-stone-700 mb-1">
                            Ghi chú địa chỉ (Điểm mốc, toà nhà, số tầng, gọi trước 15p...)
                          </label>
                          <input
                            type="text"
                            placeholder="VD: Chung cư Sky City, tầng 8, cổng sau..."
                            value={addressNote}
                            onChange={(e) => {
                              const val = e.target.value;
                              setAddressNote(val);
                              handleApplyGhnAddress(selectedGhnProvinceId, selectedGhnDistrictId, selectedGhnWardCode, specificAddressDetail, val);
                            }}
                            className="w-full h-10 px-3 rounded-xl border border-stone-300 bg-stone-50/50 text-xs font-medium outline-none focus:border-[#0A2517] focus:bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-stone-700 mb-1">
                            Châm ngôn thời trang tuần hoàn
                          </label>
                          <input
                            type="text"
                            value={profileForm.quote}
                            onChange={(e) => setProfileForm({ ...profileForm, quote: e.target.value })}
                            className="w-full h-10 px-3 rounded-xl border border-stone-300 bg-stone-50/50 text-xs font-medium outline-none focus:border-[#0A2517] focus:bg-white"
                            placeholder="VD: Lưu giữ ký ức qua từng chiếc váy."
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-stone-700 mb-1">
                            Tiểu sử ngắn (Giới thiệu tủ đồ)
                          </label>
                          <textarea
                            rows={2}
                            value={profileForm.bio}
                            onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                            className="w-full p-2.5 rounded-xl border border-stone-300 bg-stone-50/50 text-xs font-medium outline-none resize-none focus:border-[#0A2517] focus:bg-white"
                            placeholder="Mô tả phong cách tủ đồ và lưu ý cho người thuê..."
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={isSavingProfile}
                          className="w-full h-10 rounded-xl bg-[#0A2517] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm hover:bg-[#15462D] transition disabled:opacity-50 cursor-pointer"
                        >
                          {isSavingProfile ? (
                            <>
                              <RefreshCw size={12} className="animate-spin" />
                              <span>Đang lưu...</span>
                            </>
                          ) : (
                            <span>Lưu Thay Đổi Hồ Sơ</span>
                          )}
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </>
            )}

          </div>
        )}

        {/* ========================================================
            🏛️ 7. THANH ĐIỀU HƯỚNG ĐÁY CHUẨN ĐỒNG BỘ WEB (5 TABS)
            TỰ ĐỘNG TRƯỢT XUỐNG ẨN KHI LƯỚT BÀI ĐỂ XEM ĐỒ RỘNG RÃI
            ======================================================== */}
        <nav className={`fixed bottom-0 left-0 right-0 w-full sm:max-w-[430px] mx-auto z-50 bg-white/95 backdrop-blur-md border-t border-stone-200/80 px-2 py-2 flex items-center justify-around shadow-lg pb-[calc(0.6rem+env(safe-area-inset-bottom,0px))] sm:rounded-b-[40px] transition-transform duration-300 ease-in-out ${
          isBottomBarVisible ? "translate-y-0" : "translate-y-full pointer-events-none"
        }`}>
          
          {/* TAB 1: KHÁM PHÁ (Trang chủ) */}
          <button
            onClick={() => { setActiveTab("home"); }}
            className={`flex flex-col items-center justify-center flex-1 py-0.5 select-none transition-colors cursor-pointer ${
              activeTab === "home" ? "text-[#0A2517] font-bold" : "text-stone-400 hover:text-stone-700 font-medium"
            }`}
          >
            <Compass size={20} strokeWidth={activeTab === "home" ? 2.5 : 1.8} />
            <span className="text-[10px] tracking-tight mt-0.5">
              {lang === "vi" ? "Khám phá" : "Explore"}
            </span>
          </button>

          {/* TAB 2: SÀN ĐỒ (ICON TÚI GIỎ CHUẨN TIKTOK SHOP) */}
          <button
            onClick={() => { setActiveTab("shop"); }}
            className={`flex flex-col items-center justify-center flex-1 py-0.5 select-none transition-colors cursor-pointer ${
              activeTab === "shop" ? "text-[#0A2517] font-bold" : "text-stone-400 hover:text-stone-700 font-medium"
            }`}
          >
            <ShoppingBag size={20} strokeWidth={activeTab === "shop" ? 2.5 : 1.8} />
            <span className="text-[10px] tracking-tight mt-0.5">
              {lang === "vi" ? "Sàn đồ" : "Shop"}
            </span>
          </button>

          {/* TAB 3: 🌟 NÚT "+ ĐĂNG ĐỒ" NỔI BẬT Ở GIỮA */}
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex flex-col items-center justify-center flex-1 py-0.5 select-none cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-full bg-[#0A2517] text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-all -mt-1.5 mb-0.5">
              <Plus size={18} strokeWidth={2.5} />
            </div>
            <span className="text-[9.5px] font-bold text-[#0A2517] tracking-tight">
              {lang === "vi" ? "Đăng đồ" : "+ List"}
            </span>
          </button>

          {/* TAB 4: ĐƠN HÀNG (Đồng bộ /my-closet/orders & Giỏ thuê) */}
          <button
            onClick={() => setActiveTab("orders")}
            className={`flex flex-col items-center justify-center flex-1 py-0.5 select-none transition-colors cursor-pointer relative ${
              activeTab === "orders" ? "text-[#0A2517] font-bold" : "text-stone-400 hover:text-stone-700 font-medium"
            }`}
          >
            <Package size={20} strokeWidth={activeTab === "orders" ? 2.5 : 1.8} />
            {(cartItems.length > 0 || (safeOrdersAsRenter.length + safeOrdersAsLender.length) > 0) && (
              <span className="absolute top-0 right-3 min-w-[14px] h-[14px] px-0.5 rounded-full bg-emerald-700 text-white text-[8.5px] font-extrabold flex items-center justify-center">
                {cartItems.length + safeOrdersAsRenter.length + safeOrdersAsLender.length}
              </span>
            )}
            <span className="text-[10px] tracking-tight mt-0.5">
              {lang === "vi" ? "Đơn hàng" : "Orders"}
            </span>
          </button>

          {/* TAB 5: TỦ ĐỒ (Đồng bộ /my-closet) */}
          <button
            onClick={() => { setActiveTab("closet"); setActiveClosetView("menu"); }}
            className={`flex flex-col items-center justify-center flex-1 py-0.5 select-none transition-colors cursor-pointer relative ${
              activeTab === "closet" ? "text-[#0A2517] font-bold" : "text-stone-400 hover:text-stone-700 font-medium"
            }`}
          >
            <User size={20} strokeWidth={activeTab === "closet" ? 2.5 : 1.8} />
            {safeMyProducts.length > 0 && (
              <span className="absolute top-0 right-3 w-2 h-2 rounded-full bg-emerald-600 ring-2 ring-white" />
            )}
            <span className="text-[10px] tracking-tight mt-0.5">
              {lang === "vi" ? "Tủ đồ" : "Closet"}
            </span>
          </button>

        </nav>

        {/* ========================================================
            💬 7.5. TRỢ LÝ AI STYLIST NỔI GỌN NHẸ (CHUẨN TIKTOK ASSISTANT)
            TỰ ĐỘNG HẠ XUỐNG DƯỚI KHI THANH ĐIỀU HƯỚNG ẨN
            ======================================================== */}
        <div className={`fixed left-0 right-0 w-full sm:max-w-[430px] mx-auto pointer-events-none z-40 flex justify-end px-3.5 transition-all duration-300 ease-in-out ${
          isBottomBarVisible ? "bottom-20" : "bottom-5"
        }`}>
          <div className="pointer-events-auto">
            <AiStylistChat 
              isMobileApp={true}
              onSelectProduct={handleSelectProductFromAi}
            />
          </div>
        </div>

        {/* ========================================================
            📋 8. MENU 3 GẠCH QUICK DRAWER (PHÂN 4 NHÓM CHUẨN WEB)
            ======================================================== */}
        {isDrawerMenuOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end justify-center animate-in fade-in duration-200">
            <div className="w-full max-w-[430px] bg-[#FAF9F5] rounded-t-[32px] p-5 text-[#0A2517] shadow-2xl relative animate-in slide-in-from-bottom duration-300 border border-stone-200 space-y-4 max-h-[85vh] overflow-y-auto no-scrollbar">
              <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-700" />
                  <h4 className="font-heading font-black text-sm uppercase tracking-wide text-[#0A2517]">
                    Danh Mục Chức Năng CLOOP
                  </h4>
                </div>
                <button
                  onClick={() => setIsDrawerMenuOpen(false)}
                  className="w-7 h-7 rounded-full bg-stone-200 flex items-center justify-center text-stone-600 hover:text-black cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              {/* NHÓM 1: TỔNG QUAN */}
              <div className="space-y-1">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-stone-400 px-1">
                  1. Tổng quan
                </p>
                <div className="bg-white rounded-2xl p-1.5 border border-stone-200/70 shadow-2xs divide-y divide-stone-100 text-xs font-bold text-stone-800">
                  <button
                    onClick={() => { setActiveTab("home"); setIsDrawerMenuOpen(false); }}
                    className="w-full p-2.5 flex items-center justify-between hover:text-emerald-800 transition cursor-pointer"
                  >
                    <span>Khám phá trang chủ</span>
                    <ChevronRight size={14} className="text-stone-400" />
                  </button>
                  <button
                    onClick={() => { setActiveTab("shop"); setIsDrawerMenuOpen(false); }}
                    className="w-full p-2.5 flex items-center justify-between hover:text-emerald-800 transition cursor-pointer"
                  >
                    <span>Sàn đồ tuần hoàn (Thuê &amp; Mua)</span>
                    <ChevronRight size={14} className="text-stone-400" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsDrawerMenuOpen(false);
                      setIsBlogModalOpen(true);
                    }}
                    className="w-full p-2.5 flex items-center justify-between hover:text-emerald-800 transition cursor-pointer text-left"
                  >
                    <span>Cẩm nang phong cách tuần hoàn</span>
                    <ChevronRight size={14} className="text-stone-400" />
                  </button>
                </div>
              </div>

              {/* NHÓM 2: QUẢN LÝ TỦ ĐỒ */}
              <div className="space-y-1">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-stone-400 px-1">
                  2. Quản lý tủ đồ
                </p>
                <div className="bg-white rounded-2xl p-1.5 border border-stone-200/70 shadow-2xs divide-y divide-stone-100 text-xs font-bold text-stone-800">
                  <button
                    onClick={() => { setActiveTab("closet"); setActiveClosetView("items"); setIsDrawerMenuOpen(false); }}
                    className="w-full p-2.5 flex items-center justify-between hover:text-emerald-800 transition cursor-pointer"
                  >
                    <span>Kệ đồ của tôi</span>
                    <span className="text-stone-400 font-normal">{closetData?.myProducts?.length || 0} món</span>
                  </button>
                  <button
                    onClick={() => { setActiveTab("orders"); setIsDrawerMenuOpen(false); }}
                    className="w-full p-2.5 flex items-center justify-between hover:text-emerald-800 transition cursor-pointer"
                  >
                    <span>Đơn hàng &amp; Lịch hẹn thuê</span>
                    <span className="text-stone-400 font-normal">{(closetData?.ordersAsLender?.length || 0) + (closetData?.ordersAsRenter?.length || 0)} đơn</span>
                  </button>
                  <button
                    onClick={() => { setIsUploadModalOpen(true); setIsDrawerMenuOpen(false); }}
                    className="w-full p-2.5 flex items-center justify-between hover:text-emerald-800 transition cursor-pointer text-emerald-800"
                  >
                    <span>+ Đăng trang phục mới</span>
                    <span className="text-[10px] bg-emerald-50 px-2 py-0.5 rounded-full font-bold">Up đồ</span>
                  </button>
                </div>
              </div>

              {/* NHÓM 3: TÀI CHÍNH & SINH THÁI */}
              <div className="space-y-1">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-stone-400 px-1">
                  3. Tài chính &amp; Điểm
                </p>
                <div className="bg-white rounded-2xl p-1.5 border border-stone-200/70 shadow-2xs divide-y divide-stone-100 text-xs font-bold text-stone-800">
                  <button
                    onClick={() => { setActiveTab("closet"); setActiveClosetView("wallet"); setIsDrawerMenuOpen(false); }}
                    className="w-full p-2.5 flex items-center justify-between hover:text-emerald-800 transition cursor-pointer"
                  >
                    <span>Ví Thu Nhập CLOOP</span>
                    <span className="text-stone-400 font-normal">{(closetData?.user?.walletBalance || 0).toLocaleString()}đ</span>
                  </button>
                  <button
                    onClick={() => { setActiveTab("closet"); setActiveClosetView("eco"); setIsDrawerMenuOpen(false); }}
                    className="w-full p-2.5 flex items-center justify-between hover:text-emerald-800 transition cursor-pointer"
                  >
                    <span>Thống kê Sinh thái &amp; Điểm Xanh</span>
                    <span className="text-stone-400 font-normal">{closetData?.stats?.greenPoints || 120} pts</span>
                  </button>
                </div>
              </div>

              {/* NHÓM 4: TÀI KHOẢN */}
              <div className="space-y-1">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-stone-400 px-1">
                  4. Tài khoản
                </p>
                <div className="bg-white rounded-2xl p-1.5 border border-stone-200/70 shadow-2xs divide-y divide-stone-100 text-xs font-bold text-stone-800">
                  <button
                    onClick={() => { setActiveTab("closet"); setActiveClosetView("profile"); setIsDrawerMenuOpen(false); }}
                    className="w-full p-2.5 flex items-center justify-between hover:text-emerald-800 transition cursor-pointer"
                  >
                    <span>Hồ sơ cá nhân &amp; Điểm giao nhận</span>
                    <ChevronRight size={14} className="text-stone-400" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsDrawerMenuOpen(false);
                      setIsHelpModalOpen(true);
                    }}
                    className="w-full p-2.5 flex items-center justify-between hover:text-emerald-800 transition cursor-pointer text-left"
                  >
                    <span>Trung tâm trợ giúp &amp; CSKH 24/7</span>
                    <ChevronRight size={14} className="text-stone-400" />
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ========================================================
            🛍️ 8.5. MODAL TỦ ĐỒ CHỦ TỦ IN-APP (TIKTOK / SHOPEE CREATOR SHOP)
            ======================================================== */}
        {viewingClosetOwner && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200 mobile-app-root font-sans">
            <div className="w-full max-w-[430px] max-h-[92vh] sm:max-h-[88vh] bg-[#FBF9F5] rounded-t-[32px] sm:rounded-[36px] overflow-y-auto shadow-2xl relative animate-in slide-in-from-bottom duration-300 overscroll-contain flex flex-col mobile-app-root font-sans">
              
              {/* STICKY TOP BAR */}
              <div className="sticky top-0 z-20 bg-[#0A2517] text-white px-4 py-3 flex items-center justify-between border-b border-emerald-900/40 shadow-xs shrink-0">
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setViewingClosetOwner(null)}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center transition cursor-pointer"
                    title="Quay lại"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm tracking-wide truncate max-w-[190px]">
                      {viewingClosetOwner.name}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-400/20 text-emerald-300 font-bold border border-emerald-400/30 shrink-0">
                      Chủ tủ
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const isFollowed = !!followedClosets[viewingClosetOwner.id];
                      setFollowedClosets(prev => ({ ...prev, [viewingClosetOwner.id]: !isFollowed }));
                      showClosetToast(!isFollowed ? `Đã theo dõi tủ đồ của ${viewingClosetOwner.name}!` : `Đã hủy theo dõi.`);
                    }}
                    className={`text-xs font-bold px-3 py-1 rounded-full transition cursor-pointer active:scale-95 ${
                      followedClosets[viewingClosetOwner.id]
                        ? "bg-white/20 text-stone-200 border border-white/30"
                        : "bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold shadow-xs"
                    }`}
                  >
                    {followedClosets[viewingClosetOwner.id] ? "Đang theo dõi" : "+ Theo dõi"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewingClosetOwner(null)}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
                    title="Đóng"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* BANNER & PROFILE CARD (SHOPEE / TIKTOK STYLE) */}
              <div className="relative bg-gradient-to-b from-[#0A2517] via-[#123824] to-[#FBF9F5] pt-3 pb-4 px-4 text-white shrink-0">
                
                <div className="flex items-start gap-3.5 mb-3">
                  {/* Avatar to có viền */}
                  <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-white/80 shadow-md bg-stone-200 shrink-0">
                    {viewingClosetOwner.avatar ? (
                      <Image src={viewingClosetOwner.avatar} alt={viewingClosetOwner.name} fill className="object-cover" unoptimized />
                    ) : (
                      <div className="w-full h-full bg-[#0A2517] text-white text-xl font-bold flex items-center justify-center">
                        {(viewingClosetOwner.name || "C")[0].toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Tên & Địa chỉ & Bio */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h2 className="font-bold text-base leading-snug truncate">
                        {viewingClosetOwner.name}
                      </h2>
                      <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                    </div>
                    
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-200/90 mt-0.5">
                      <MapPin size={12} className="shrink-0 text-emerald-300" />
                      <span className="truncate">{viewingClosetOwner.location || "Hà Nội, Việt Nam"}</span>
                    </div>

                    {/* Bio / Quote */}
                    <p className="text-[11.5px] text-stone-200/90 mt-1 line-clamp-2 leading-relaxed italic">
                      &ldquo;{viewingClosetOwner.quote || viewingClosetOwner.bio || "Chia sẻ tủ đồ thời trang tuần hoàn. Đồ luôn được giặt hấp thơm tho trước khi bàn giao."}&rdquo;
                    </p>
                  </div>
                </div>

                {/* THANH THỐNG KÊ CHỈ SỐ UY TÍN (TIKTOK SHOP STYLE) */}
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-2.5 grid grid-cols-4 gap-1 text-center border border-white/15">
                  <div>
                    <div className="font-bold text-sm text-white">{closetOwnerProducts.length}</div>
                    <div className="text-[10px] text-stone-300">Món đồ</div>
                  </div>
                  <div>
                    <div className="font-bold text-sm text-amber-300 flex items-center justify-center gap-0.5">
                      <Star size={12} className="fill-amber-300" />
                      <span>{viewingClosetOwner.rating || "5.0"}</span>
                    </div>
                    <div className="text-[10px] text-stone-300">Đánh giá</div>
                  </div>
                  <div>
                    <div className="font-bold text-sm text-white">{viewingClosetOwner.completedOrders || 0}</div>
                    <div className="text-[10px] text-stone-300">Đơn thuê</div>
                  </div>
                  <div>
                    <div className="font-bold text-sm text-emerald-300">100%</div>
                    <div className="text-[10px] text-stone-300">Phản hồi</div>
                  </div>
                </div>

                {/* NÚT TƯ VẤN NHANH */}
                <div className="flex items-center gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => showClosetToast(`Bạn có thể trao đổi chọn size và lịch nhận với ${viewingClosetOwner.name} khi đặt thuê đồ!`)}
                    className="flex-1 py-2 rounded-xl bg-white/15 hover:bg-white/25 active:scale-98 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer border border-white/20"
                  >
                    <span>Nhắn tin / Hỏi size</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof navigator !== "undefined" && navigator.share) {
                        navigator.share({ title: `Tủ đồ của ${viewingClosetOwner.name}`, url: window.location.href }).catch(() => {});
                      } else {
                        showClosetToast("Đã sao chép liên kết tủ đồ!");
                      }
                    }}
                    className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 active:scale-98 text-white text-xs font-bold transition cursor-pointer border border-white/20"
                    title="Chia sẻ"
                  >
                    Chia sẻ
                  </button>
                </div>

              </div>

              {/* TABS PHÂN LOẠI ĐỒ TRONG TỦ (STICKY DƯỚI HEADER) */}
              <div className="sticky top-[52px] z-10 bg-[#FBF9F5] border-b border-stone-200 px-4 py-2 flex items-center gap-2 shadow-2xs shrink-0">
                {[
                  { id: "all", label: `Tất cả (${closetOwnerProducts.length})` },
                  { id: "rent", label: `Cho thuê (${closetOwnerProducts.filter(p => p.listingTypeRaw !== "SELL").length})` },
                  { id: "sell", label: `Thanh lý (${closetOwnerProducts.filter(p => p.listingTypeRaw === "SELL" || !!p.salePrice).length})` },
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setClosetOwnerFilter(tab.id as any)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                      closetOwnerFilter === tab.id
                        ? "bg-[#0A2517] text-white shadow-xs"
                        : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200/80"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* DANH SÁCH SẢN PHẨM TRONG TỦ (2 CỘT TIKTOK SHOP STYLE) */}
              <div className="p-3 pb-16 flex-1">
                {isLoadingClosetOwner && closetOwnerProducts.length === 0 ? (
                  <div className="py-16 text-center text-stone-400 space-y-2">
                    <RefreshCw size={24} className="animate-spin mx-auto text-emerald-800" />
                    <p className="text-xs font-medium">Đang tải tủ đồ...</p>
                  </div>
                ) : filteredClosetOwnerProducts.length === 0 ? (
                  <div className="py-12 text-center text-stone-500 bg-white rounded-2xl border border-stone-200 p-6 space-y-2">
                    <p className="text-xs font-bold text-stone-700">Chưa có món đồ nào trong mục này</p>
                    <p className="text-[11px] text-stone-500">Chủ tủ đang chuẩn bị thêm trang phục mới.</p>
                    <button
                      type="button"
                      onClick={() => setClosetOwnerFilter("all")}
                      className="mt-2 px-3.5 py-1.5 bg-[#0A2517] text-white text-xs font-bold rounded-full cursor-pointer"
                    >
                      Xem tất cả đồ của tủ
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5">
                    {filteredClosetOwnerProducts.map((item: any, idx: number) => {
                      const isRent = item.listingTypeRaw !== "SELL";
                      let priceDisplay = "";
                      if (isRent) {
                        const raw = item.rentalPrice ?? item.price ?? 0;
                        const num = typeof raw === "number" ? raw : parseInt(String(raw).replace(/\D/g, ""), 10) || 0;
                        priceDisplay = num > 0 ? `${num.toLocaleString("vi-VN")}đ / ngày` : "Liên hệ thuê";
                      } else {
                        const raw = item.salePrice ?? item.price ?? 0;
                        const num = typeof raw === "number" ? raw : parseInt(String(raw).replace(/\D/g, ""), 10) || 0;
                        priceDisplay = num > 0 ? `${num.toLocaleString("vi-VN")}đ` : "Liên hệ mua";
                      }
                      const img = item.image || item.primaryImage || item.images?.[0] || "/1.1.jpg";

                      return (
                        <div
                          key={item.id || idx}
                          onClick={() => {
                            setSelectedProduct(item);
                          }}
                          className="bg-white rounded-2xl overflow-hidden shadow-xs hover:shadow-md border border-stone-200 flex flex-col justify-between cursor-pointer active:scale-[0.98] transition-all group"
                        >
                          <div className="relative w-full aspect-[4/5] bg-stone-100 overflow-hidden">
                            <Image
                              src={img}
                              alt={item.title}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-500"
                              unoptimized
                            />
                            <span className={`absolute top-2 left-2 text-white text-[9.5px] font-bold px-2 py-0.5 rounded-md shadow-xs z-10 ${
                              isRent ? "bg-[#0A2517]/90 backdrop-blur-xs" : "bg-amber-800/90 backdrop-blur-xs"
                            }`}>
                              {isRent ? "Thuê đồ" : "Mua sở hữu"}
                            </span>
                            {item.size && (
                              <span className="absolute top-2 right-2 bg-black/60 backdrop-blur-xs text-white text-[9.5px] font-bold px-1.5 py-0.5 rounded-md">
                                Size {item.size}
                              </span>
                            )}
                          </div>

                          <div className="p-2.5 space-y-1">
                            <h4 className="font-bold text-xs text-[#0A2517] line-clamp-1 leading-snug">
                              {item.title}
                            </h4>
                            <div className="text-[12px] font-black text-[#0A2517]">
                              {priceDisplay}
                            </div>
                            <div className="flex items-center justify-between pt-0.5 text-[10px] text-stone-500">
                              <span>{item.occasion || "Dạo phố"}</span>
                              <span className="text-emerald-700 font-bold hover:underline">Chi tiết →</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* TOAST THÔNG BÁO TỦ ĐỒ */}
        {closetToastMessage && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[70] bg-[#0A2517] text-white px-4 py-2 rounded-full text-xs font-bold shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
            <CheckCircle2 size={14} className="text-emerald-400" />
            <span>{closetToastMessage}</span>
          </div>
        )}

        {/* ========================================================
            👗 9. MODAL CHI TIẾT SẢN PHẨM TRONG APP (PRODUCT DETAIL SHEET)
            ======================================================== */}
        {selectedProduct && (
          <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex items-end justify-center p-0 sm:p-4 animate-in fade-in duration-200 mobile-app-root font-sans">
            <div className="w-full max-w-[430px] bg-[#FBF9F5] rounded-t-[32px] sm:rounded-[32px] max-h-[90vh] overflow-y-auto p-5 text-[#0A2517] shadow-2xl relative animate-in slide-in-from-bottom duration-300 space-y-3.5 no-scrollbar mobile-app-root font-sans">
              
              {/* 👤 HEADER TRÊN CÙNG: AVATAR & THÔNG TIN CHỦ TỦ */}
              <div className="flex items-center justify-between pb-3 border-b border-stone-200 sticky top-0 bg-[#FBF9F5] z-10 pt-1">
                <div 
                  onClick={() => {
                    setViewingClosetOwner({
                      id: selectedProduct.userId || 'official',
                      name: selectedProduct.ownerName || 'Chủ tủ CLOOP',
                      avatar: selectedProduct.ownerAvatar || null,
                      rating: selectedProduct.rating || 5.0,
                      completedOrders: selectedProduct.completedOrders || 0,
                      location: selectedProduct.location || selectedProduct.province || "Hà Nội",
                    });
                    setSelectedProduct(null);
                  }}
                  className="flex items-center gap-2.5 cursor-pointer group"
                  title="Xem tủ đồ của người này"
                >
                  <div className="w-10 h-10 rounded-full overflow-hidden relative border-2 border-emerald-700/30 bg-stone-200 shrink-0 shadow-2xs group-hover:border-emerald-600 transition">
                    {selectedProduct.ownerAvatar ? (
                      <Image src={selectedProduct.ownerAvatar} alt="" fill className="object-cover" unoptimized />
                    ) : (
                      <div className="w-full h-full bg-[#0A2517] text-white text-xs font-bold flex items-center justify-center">
                        {(selectedProduct.ownerName || "C")[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-[#0A2517] leading-tight group-hover:underline">
                        {selectedProduct.ownerName || "Thành viên CLOOP"}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-900 font-bold">
                        Chủ tủ
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-stone-500 mt-0.5">
                      <span className="font-semibold text-stone-700">
                        {selectedProduct.rating || "5.0"} / 5.0
                      </span>
                      <span className="text-stone-300">•</span>
                      <span>
                        {selectedProduct.completedOrders > 0
                          ? `${selectedProduct.completedOrders} đơn`
                          : "Chủ tủ mới"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setViewingClosetOwner({
                        id: selectedProduct.userId || 'official',
                        name: selectedProduct.ownerName || 'Chủ tủ CLOOP',
                        avatar: selectedProduct.ownerAvatar || null,
                        rating: selectedProduct.rating || 5.0,
                        completedOrders: selectedProduct.completedOrders || 0,
                        location: selectedProduct.location || selectedProduct.province || "Hà Nội",
                      });
                      setSelectedProduct(null);
                    }}
                    className="text-[11px] font-bold text-[#0A2517] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 px-3 py-1 rounded-full transition cursor-pointer shrink-0 active:scale-95"
                  >
                    Ghé tủ đồ
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProduct(null);
                      setActiveDetailImgIndex(0);
                    }}
                    className="w-8 h-8 rounded-full bg-stone-200/70 hover:bg-stone-300 text-stone-700 flex items-center justify-center transition cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Ảnh lớn thực tế */}
              <div className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden bg-stone-100 shadow-2xs">
                <Image
                  src={
                    (selectedProduct.images && selectedProduct.images[activeDetailImgIndex]) ||
                    selectedProduct.image ||
                    selectedProduct.primaryImage ||
                    "/1.1.jpg"
                  }
                  alt={selectedProduct.title}
                  fill
                  className="object-cover"
                  unoptimized
                />
                <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
                  {selectedProduct.occasion || "Dạo phố"}
                </div>
              </div>

              {/* Lưới thumbnail nếu sản phẩm có nhiều ảnh thực tế */}
              {selectedProduct.images && selectedProduct.images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {selectedProduct.images.map((imgUrl: string, i: number) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setActiveDetailImgIndex(i)}
                      className={`relative w-14 aspect-[3/4] rounded-xl overflow-hidden border-2 shrink-0 transition cursor-pointer ${
                        activeDetailImgIndex === i ? "border-[#0A2517] ring-1 ring-[#0A2517]" : "border-stone-200 opacity-60 hover:opacity-100"
                      }`}
                    >
                      <Image src={imgUrl} alt={`Ảnh ${i + 1}`} fill className="object-cover" unoptimized />
                    </button>
                  ))}
                </div>
              )}

              {/* Tên sản phẩm */}
              <div className="space-y-1 pb-2 border-b border-stone-200">
                <h2 className="font-heading font-black text-xl text-[#0A2517] leading-tight">
                  {selectedProduct.title}
                </h2>
              </div>

              {/* Bảng giá thực tế & Chi tiết số ngày */}
              <div className="py-2.5 border-b border-stone-200">
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-[10px] text-stone-500 uppercase font-bold tracking-wider block">
                      {selectedProduct.listingTypeRaw === "SELL" ? "Giá chuyển nhượng" : "Chi phí thuê trang phục"}
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-heading font-black text-2xl text-[#0A2517]">
                        {(selectedProduct.price || selectedProduct.rentalPrice || selectedProduct.salePrice || 0).toLocaleString("vi-VN")}đ
                      </span>
                      {selectedProduct.listingTypeRaw !== "SELL" && (
                        <span className="text-xs text-stone-500 font-medium">/ ngày</span>
                      )}
                    </div>
                    {selectedProduct.listingTypeRaw !== "SELL" && (
                      <p className="text-[11px] text-emerald-800 font-medium mt-1">
                        • Gói {selectedProduct.minDays || 3} ngày: <strong>{(calculatePackageRentalFee(selectedProduct, selectedProduct.minDays || 3)).toLocaleString("vi-VN")}đ</strong>
                      </p>
                    )}
                  </div>

                  {Number(selectedProduct.deposit || 0) > 0 && (
                    <div className="text-right">
                      <span className="text-[10px] text-stone-500 uppercase font-bold tracking-wider block">Tiền cọc đảm bảo</span>
                      <span className="text-sm font-mono font-bold text-stone-700">
                        {(Number(selectedProduct.deposit) || 0).toLocaleString("vi-VN")}đ
                      </span>
                      <span className="text-[9.5px] text-stone-400 block">Hoàn lại khi trả đồ</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Thông số kỹ thuật trang phục */}
              <div className="py-2.5 border-b border-stone-200">
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="bg-stone-100/80 p-2 rounded-xl">
                    <span className="text-[10px] text-stone-400 block font-medium">Size</span>
                    <span className="text-xs font-bold text-stone-800">{selectedProduct.size || "M"}</span>
                  </div>
                  <div className="bg-stone-100/80 p-2 rounded-xl">
                    <span className="text-[10px] text-stone-400 block font-medium">Chất liệu</span>
                    <span className="text-xs font-bold text-stone-800 truncate block">{selectedProduct.material || "Lụa"}</span>
                  </div>
                  <div className="bg-stone-100/80 p-2 rounded-xl">
                    <span className="text-[10px] text-stone-400 block font-medium">Độ mới</span>
                    <span className="text-xs font-bold text-stone-800">{selectedProduct.condition || "Mới 95%"}</span>
                  </div>
                  <div className="bg-stone-100/80 p-2 rounded-xl">
                    <span className="text-[10px] text-stone-400 block font-medium">Dịp mặc</span>
                    <span className="text-xs font-bold text-stone-800 truncate block">{selectedProduct.occasion || "Dạo phố"}</span>
                  </div>
                </div>
              </div>

              {/* Trạm giao nhận trang phục thực tế */}
              <div className="py-2.5 border-b border-stone-200 text-xs text-stone-700 space-y-0.5">
                <span className="font-bold text-[#0A2517] block">Trạm giao nhận trang phục:</span>
                <p className="text-stone-600 leading-tight">
                  {selectedProduct.specificAddress || selectedProduct.location || "Hà Nội"}
                </p>
              </div>

              {/* Mô tả từ chủ tủ nếu có */}
              {selectedProduct.description && (
                <div className="py-2 border-b border-stone-200 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">Lời nhắn từ chủ tủ</span>
                  <p className="text-xs text-stone-700 leading-relaxed whitespace-pre-line bg-stone-50/70 p-3 rounded-xl border border-stone-200/60">
                    {selectedProduct.description}
                  </p>
                </div>
              )}

              {/* Lợi ích môi trường thực tế */}
              <div className="p-3 rounded-xl bg-stone-100/80 border border-stone-200/80 text-stone-700 text-xs leading-relaxed">
                Mỗi lượt chia sẻ trang phục này giúp tiết kiệm <strong>5.8kg CO2e</strong> và <strong>2.000L nước</strong> so với việc sản xuất mới.
              </div>

              {/* Nút hành động */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => handleToggleLike(selectedProduct.id, e)}
                  className={`w-12 h-12 rounded-xl border flex items-center justify-center transition cursor-pointer shrink-0 ${
                    likedItems[selectedProduct.id]
                      ? "border-red-200 bg-red-50 text-red-500"
                      : "border-stone-300 text-stone-400 hover:text-red-500 hover:border-red-200"
                  }`}
                  title="Yêu thích"
                >
                  <Heart size={20} className={likedItems[selectedProduct.id] ? "fill-red-500 text-red-500" : "fill-none"} />
                </button>
                <button
                  type="button"
                  onClick={() => handleAddToCart(selectedProduct)}
                  className="h-12 px-4 rounded-xl border border-stone-300 bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold text-xs flex items-center justify-center transition cursor-pointer shrink-0"
                  title="Thêm vào giỏ"
                >
                  Thêm giỏ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const prod = selectedProduct;
                    setSelectedProduct(null);
                    handleOpenCheckout(prod);
                  }}
                  className="flex-1 h-12 rounded-xl bg-[#0A2517] text-white font-semibold text-xs flex items-center justify-center shadow-md hover:bg-[#15462D] transition cursor-pointer"
                >
                  {selectedProduct.listingTypeRaw === "SELL" ? "Mua Ngay" : "Thuê Ngay"}
                </button>
              </div>

            </div>
          </div>
        )}

        {/* TOAST THÔNG BÁO THÊM GIỎ HÀNG */}
        {addedToCartToast && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-[#0A2517] text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg flex items-center gap-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
            <Check size={14} className="text-emerald-400" />
            <span>Đã thêm vào giỏ thuê!</span>
          </div>
        )}

        {/* ========================================================
            👗 10. MODAL "UP BÀI CHIA SẺ TỦ ĐỒ" ĐỒNG BỘ 100% CẤU TRÚC VỚI BẢN WEB
            ======================================================== */}
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end justify-center p-0 sm:p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-[430px] bg-[#FAF9F5] rounded-t-[32px] sm:rounded-[32px] max-h-[88vh] overflow-y-auto p-5 text-[#0A2517] shadow-2xl relative animate-in slide-in-from-bottom duration-300 border border-stone-200 no-scrollbar">
              
              {/* Header Modal */}
              <div className="flex items-center justify-between pb-3 border-b border-stone-200 mb-4 sticky top-0 bg-[#FAF9F5] z-10">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                    <h3 className="font-heading font-black text-base text-[#0A2517]">
                      Up Trang Phục Vào Tủ Đồ
                    </h3>
                  </div>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    Đưa váy tiệc vào vòng tuần hoàn • Nhận thu nhập thụ động
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-stone-200/70 hover:bg-stone-300 flex items-center justify-center text-stone-600 transition cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {postSuccess ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto animate-bounce">
                    <CheckCircle2 size={36} />
                  </div>
                  <h4 className="font-heading font-black text-lg text-emerald-950">
                    Đăng Tủ Đồ Thành Công!
                  </h4>
                  <p className="text-xs text-stone-600 max-w-xs mx-auto">
                    Trang phục của bạn đã có mặt trên hệ thống CLOOP và được đồng bộ vào tủ đồ cá nhân.
                  </p>
                </div>
              ) : (
                <form onSubmit={handlePostSubmit} className="space-y-4">
                  {postError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                      {postError}
                    </div>
                  )}

                  {/* 1. TẢI NHIỀU ẢNH TRANG PHỤC & CĂN CHỈNH THEO Ý CHỦ TỦ */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-stone-800">
                        Ảnh trang phục ({uploadedImages.length}/5) <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[10px] text-stone-400 font-medium">
                        Tối đa 5 ảnh
                      </span>
                    </div>

                    <input 
                      type="file" 
                      accept="image/*" 
                      multiple
                      ref={fileInputRef} 
                      onChange={handleImageChange} 
                      className="hidden" 
                    />

                    {uploadedImages.length === 0 ? (
                      /* Khi chưa có ảnh nào: Khung upload lớn trực quan */
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full aspect-[16/10] rounded-2xl border-2 border-dashed border-stone-300 hover:border-[#0A2517] bg-white flex flex-col items-center justify-center gap-2 text-stone-500 transition cursor-pointer p-4 group shadow-2xs"
                      >
                        <div className="text-center space-y-1">
                          <span className="text-xs font-bold text-stone-800 block">
                            Chọn ảnh từ máy (Tối đa 5 ảnh)
                          </span>
                          <span className="text-[10px] text-stone-400 block">
                            Chọn được nhiều ảnh cùng lúc • Chủ tủ tự do cắt &amp; căn góc
                          </span>
                        </div>
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200 font-medium">
                          Khuyên dùng: Ảnh toàn thân, mặt trước, mặt sau, chất vải
                        </span>
                      </button>
                    ) : (
                      /* Khi đã có ảnh: Lưới ảnh đa góc + huy hiệu ảnh bìa + nút cắt/xóa */
                      <div className="space-y-2.5">
                        <div className="grid grid-cols-3 gap-2">
                          {uploadedImages.map((img, idx) => (
                            <div 
                              key={idx} 
                              className={`relative aspect-[3/4] rounded-xl overflow-hidden border bg-stone-100 group shadow-2xs ${
                                idx === 0 ? "border-[#0A2517] ring-2 ring-[#0A2517]/20" : "border-stone-200"
                              }`}
                            >
                              <Image 
                                src={img.previewUrl} 
                                alt={`Ảnh ${idx + 1}`} 
                                fill 
                                className="object-cover" 
                                unoptimized 
                              />
                              
                              {/* Huy hiệu Ảnh bìa */}
                              {idx === 0 && (
                                <span className="absolute top-1.5 left-1.5 bg-[#0A2517] text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                                  Ảnh bìa
                                </span>
                              )}

                              {/* Nút Cắt lại */}
                              <button
                                type="button"
                                onClick={() => handleRecropImage(idx)}
                                className="absolute bottom-1.5 left-1.5 bg-black/70 hover:bg-black text-white text-[9px] font-medium px-2 py-0.5 rounded backdrop-blur-xs transition cursor-pointer"
                                title="Cắt lại ảnh này"
                              >
                                Cắt
                              </button>

                              {/* Nút Xóa ảnh */}
                              <button
                                type="button"
                                onClick={() => removeImage(idx)}
                                className="absolute top-1.5 right-1.5 bg-black/60 hover:bg-black text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] shadow transition cursor-pointer"
                                title="Xóa ảnh này"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ))}

                          {/* Ô thêm ảnh nếu chưa đủ 5 */}
                          {uploadedImages.length < 5 && (
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="aspect-[3/4] rounded-xl border-2 border-dashed border-stone-300 hover:border-[#0A2517] bg-white flex flex-col items-center justify-center gap-1 text-stone-500 hover:text-stone-800 transition cursor-pointer"
                            >
                              <span className="text-sm font-bold text-stone-600">+</span>
                              <span className="text-[10px] font-bold">Thêm ảnh</span>
                              <span className="text-[9px] text-stone-400">({5 - uploadedImages.length} ảnh nữa)</span>
                            </button>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-stone-500 px-1">
                          <span>Ảnh đầu tiên là ảnh bìa hiển thị ngoài sàn đồ</span>
                          {uploadedImages.length < 5 && (
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="text-stone-800 font-bold hover:underline cursor-pointer"
                            >
                              + Thêm ảnh khác
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 2. HÌNH THỨC ĐĂNG: CHO THUÊ HOẶC PASS LẠI */}
                  <div className="bg-stone-100/80 p-3 rounded-2xl space-y-2 border border-stone-200">
                    <span className="text-xs font-bold text-stone-800 block">Hình thức chia sẻ trên CLOOP</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setUploadData({ ...uploadData, isRental: !uploadData.isRental })}
                        className={`p-2.5 rounded-xl text-left border transition cursor-pointer ${
                          uploadData.isRental 
                            ? "bg-white border-[#0A2517] ring-1 ring-[#0A2517] shadow-xs" 
                            : "bg-stone-50 border-stone-300 text-stone-500"
                        }`}
                      >
                        <span className="text-xs font-bold text-[#0A2517] block">Cho Thuê</span>
                        <span className="text-[10px] text-stone-500 mt-0.5 block">Nhận thu nhập theo đợt</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setUploadData({ ...uploadData, isSale: !uploadData.isSale })}
                        className={`p-2.5 rounded-xl text-left border transition cursor-pointer ${
                          uploadData.isSale 
                            ? "bg-white border-[#0A2517] ring-1 ring-[#0A2517] shadow-xs" 
                            : "bg-stone-50 border-stone-300 text-stone-500"
                        }`}
                      >
                        <span className="text-xs font-bold text-[#0A2517] block">Pass Đồ / Bán</span>
                        <span className="text-[10px] text-stone-500 mt-0.5 block">Chuyển nhượng dứt điểm</span>
                      </button>
                    </div>
                  </div>

                  {/* 3. TÊN TRANG PHỤC */}
                  <div>
                    <label className="block text-xs font-bold text-stone-800 mb-1">
                      Tên trang phục <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="VD: Đầm dạ hội lụa satin xẻ tà, Set áo dài gấm..."
                      value={uploadData.title}
                      onChange={(e) => setUploadData({ ...uploadData, title: e.target.value })}
                      className="w-full h-11 px-3.5 rounded-xl border border-stone-300 bg-white text-xs font-medium outline-none focus:border-[#0A2517]"
                    />
                  </div>

                  {/* 4. DỊP MẶC & DANH MỤC */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-bold text-stone-800 mb-1">Dịp tiệc phù hợp</label>
                      <select
                        value={uploadData.occasion}
                        onChange={(e) => setUploadData({ ...uploadData, occasion: e.target.value })}
                        className="w-full h-10 px-2.5 rounded-xl border border-stone-300 bg-white text-xs font-medium outline-none"
                      >
                        {["Tiệc cưới", "Dạ hội", "Sinh nhật", "Prom", "Áo dài", "Đi biển", "Dạo phố"].map(o => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-800 mb-1">Danh mục</label>
                      <select
                        value={uploadData.category}
                        onChange={(e) => setUploadData({ ...uploadData, category: e.target.value })}
                        className="w-full h-10 px-2.5 rounded-xl border border-stone-300 bg-white text-xs font-medium outline-none"
                      >
                        {CATEGORIES_LIST.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* 5. SIZE & ĐỘ MỚI */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-bold text-stone-800 mb-1">Size</label>
                      <select
                        value={uploadData.size}
                        onChange={(e) => setUploadData({ ...uploadData, size: e.target.value })}
                        className="w-full h-10 px-2.5 rounded-xl border border-stone-300 bg-white text-xs font-medium outline-none"
                      >
                        {SIZES_LIST.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-800 mb-1">Độ mới</label>
                      <select
                        value={uploadData.condition}
                        onChange={(e) => setUploadData({ ...uploadData, condition: e.target.value })}
                        className="w-full h-10 px-2.5 rounded-xl border border-stone-300 bg-white text-xs font-medium outline-none"
                      >
                        {CONDITIONS_LIST.map(c => (
                          <option key={c.id} value={c.id}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* 6. GIÁ THUÊ & TIỀN CỌC (NẾU CHỌN CHO THUÊ) */}
                  {uploadData.isRental && (
                    <div className="grid grid-cols-2 gap-2.5 p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200/80">
                      <div>
                        <label className="block text-[11px] font-bold text-emerald-950 mb-1">
                          Giá thuê / ngày (đ) *
                        </label>
                        <input
                          type="text"
                          placeholder="50.000"
                          value={uploadData.rentalPrice}
                          onChange={(e) => {
                            const val = e.target.value;
                            const num = parseInt(val.replace(/\D/g, "")) || 0;
                            setUploadData(prev => ({
                              ...prev,
                              rentalPrice: val,
                              deposit: prev.deposit ? prev.deposit : (num > 0 ? `${num * 2}` : "")
                            }));
                          }}
                          className="w-full h-10 px-3 rounded-xl border border-emerald-300 bg-white text-xs font-bold outline-none"
                        />
                        <p className="text-[10px] text-emerald-800 font-medium mt-1">
                          • Gói 3 ngày (-15%): {uploadData.rentalPrice ? `${(Math.round((parseInt(uploadData.rentalPrice.replace(/\D/g, "")) || 0) * 3 * 0.85 / 1000) * 1000).toLocaleString("vi-VN")}đ` : "0đ"}
                        </p>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-emerald-950 mb-1">
                          Tiền cọc đảm bảo (đ) *
                        </label>
                        <input
                          type="text"
                          placeholder="200.000"
                          value={uploadData.deposit}
                          onChange={(e) => setUploadData({ ...uploadData, deposit: e.target.value })}
                          className="w-full h-10 px-3 rounded-xl border border-emerald-300 bg-white text-xs font-bold outline-none"
                        />
                        <p className="text-[9.5px] text-stone-500 mt-1">
                          Hoàn lại 100% khi người thuê trả đồ
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 7. GIÁ BÁN & GIÁ MUA GỐC (NẾU CHỌN PASS LẠI) */}
                  {uploadData.isSale && (
                    <div className="grid grid-cols-2 gap-2.5 p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80">
                      <div>
                        <label className="block text-[11px] font-bold text-amber-950 mb-1">
                          Giá pass lại (đ)
                        </label>
                        <input
                          type="text"
                          placeholder="1.200.000"
                          value={uploadData.salePrice}
                          onChange={(e) => setUploadData({ ...uploadData, salePrice: e.target.value })}
                          className="w-full h-10 px-3 rounded-xl border border-amber-300 bg-white text-xs font-bold outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-amber-950 mb-1">
                          Giá mua mới tại Store
                        </label>
                        <input
                          type="text"
                          placeholder="3.500.000"
                          value={uploadData.originalPrice}
                          onChange={(e) => setUploadData({ ...uploadData, originalPrice: e.target.value })}
                          className="w-full h-10 px-3 rounded-xl border border-amber-300 bg-white text-xs font-bold outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {/* ========================================================
                      📍 04. TỌA ĐỘ & TRẠM GỬI (ĐỒNG BỘ NGUYÊN VĂN BẢN WEB)
                      ======================================================== */}
                  <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-stone-200/90 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#0A2517] tracking-wider uppercase">
                        04. Tọa độ &amp; trạm gửi
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 font-semibold border border-stone-200">
                        {uploadData.address ? "Đã lưu vị trí" : "Trạm nhận đồ"}
                      </span>
                    </div>

                    <p className="text-[11px] text-stone-500 leading-tight">
                      Điểm giao nhận khi có thành viên gửi yêu cầu mượn hoặc mua trang phục.
                    </p>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-stone-700 mb-1">Tỉnh / Thành phố *</label>
                        {ghnProvinces.length > 0 ? (
                          <select
                            value={selectedGhnProvinceId}
                            onChange={(e) => {
                              const val = e.target.value ? Number(e.target.value) : "";
                              setSelectedGhnProvinceId(val);
                              setSelectedGhnDistrictId("");
                              setSelectedGhnWardCode("");
                              const prov = ghnProvinces.find(p => p.ProvinceID === val);
                              setUploadData(prev => ({
                                ...prev,
                                province: prov?.ProvinceName || "",
                                district: "",
                                ward: "",
                              }));
                            }}
                            className="w-full h-10 px-3 rounded-xl border border-stone-300 bg-white text-xs font-medium outline-none focus:border-[#0A2517] cursor-pointer"
                          >
                            <option value="">-- Chọn Tỉnh / Thành phố --</option>
                            {ghnProvinces.map((prov) => (
                              <option key={prov.ProvinceID} value={prov.ProvinceID}>
                                {prov.ProvinceName}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            required
                            placeholder="VD: Hà Nội..."
                            value={uploadData.province}
                            onChange={(e) => setUploadData({ ...uploadData, province: e.target.value })}
                            className="w-full h-10 px-3 rounded-xl border border-stone-300 bg-white text-xs font-medium outline-none focus:border-[#0A2517]"
                          />
                        )}
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-stone-700 mb-1">Quận / Huyện *</label>
                        {ghnDistricts.length > 0 ? (
                          <select
                            disabled={!selectedGhnProvinceId || isLoadingGhnDistricts}
                            value={selectedGhnDistrictId}
                            onChange={(e) => {
                              const val = e.target.value ? Number(e.target.value) : "";
                              setSelectedGhnDistrictId(val);
                              setSelectedGhnWardCode("");
                              const dist = ghnDistricts.find(d => d.DistrictID === val);
                              setUploadData(prev => ({
                                ...prev,
                                district: dist?.DistrictName || "",
                                ward: "",
                              }));
                            }}
                            className="w-full h-10 px-3 rounded-xl border border-stone-300 bg-white text-xs font-medium outline-none focus:border-[#0A2517] disabled:opacity-50 cursor-pointer"
                          >
                            <option value="">-- Chọn Quận / Huyện --</option>
                            {ghnDistricts.map((dist) => (
                              <option key={dist.DistrictID} value={dist.DistrictID}>
                                {dist.DistrictName}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            required
                            placeholder="VD: Quận Hoàn Kiếm..."
                            value={uploadData.district}
                            onChange={(e) => setUploadData({ ...uploadData, district: e.target.value })}
                            className="w-full h-10 px-3 rounded-xl border border-stone-300 bg-white text-xs font-medium outline-none focus:border-[#0A2517]"
                          />
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-stone-700 mb-1">Phường / Xã *</label>
                        {ghnWards.length > 0 ? (
                          <select
                            disabled={!selectedGhnDistrictId || isLoadingGhnWards}
                            value={selectedGhnWardCode}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSelectedGhnWardCode(val);
                              const ward = ghnWards.find(w => w.WardCode === val);
                              setUploadData(prev => ({
                                ...prev,
                                ward: ward?.WardName || "",
                              }));
                            }}
                            className="w-full h-10 px-3 rounded-xl border border-stone-300 bg-white text-xs font-medium outline-none focus:border-[#0A2517] disabled:opacity-50 cursor-pointer"
                          >
                            <option value="">-- Chọn Phường / Xã --</option>
                            {ghnWards.map((ward) => (
                              <option key={ward.WardCode} value={ward.WardCode}>
                                {ward.WardName}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            required
                            placeholder="VD: Phường Hàng Đào..."
                            value={uploadData.ward}
                            onChange={(e) => setUploadData({ ...uploadData, ward: e.target.value })}
                            className="w-full h-10 px-3 rounded-xl border border-stone-300 bg-white text-xs font-medium outline-none focus:border-[#0A2517]"
                          />
                        )}
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-stone-700 mb-1">Số điện thoại của cậu *</label>
                        <input
                          type="tel"
                          required
                          placeholder="VD: 0912345678"
                          value={uploadData.ownerPhone}
                          onChange={(e) => setUploadData({ ...uploadData, ownerPhone: e.target.value })}
                          className="w-full h-10 px-3 rounded-xl border border-stone-300 bg-white text-xs font-mono font-medium outline-none focus:border-[#0A2517]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-stone-700 mb-1">
                        Địa chỉ cụ thể (Tên đường, số nhà, thôn/xóm) *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="VD: Số 123 Phố Huế..."
                        value={uploadData.address}
                        onChange={(e) => setUploadData({ ...uploadData, address: e.target.value })}
                        className="w-full h-10 px-3 rounded-xl border border-stone-300 bg-white text-xs font-medium outline-none focus:border-[#0A2517]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-stone-700 mb-1">
                        Ghi chú địa chỉ (Điểm mốc, toà nhà, số tầng, gọi trước 15p...)
                      </label>
                      <input
                        type="text"
                        placeholder="VD: Cạnh cửa hàng Circle K, ngõ đối diện..."
                        value={uploadData.note}
                        onChange={(e) => setUploadData({ ...uploadData, note: e.target.value })}
                        className="w-full h-10 px-3 rounded-xl border border-stone-300 bg-white text-xs font-medium outline-none focus:border-[#0A2517]"
                      />
                    </div>

                    {/* Checkbox lưu mặc định */}
                    <div className="flex items-center gap-2 pt-0.5">
                      <input
                        type="checkbox"
                        id="saveLocationAsDefault"
                        checked={uploadData.saveLocationAsDefault}
                        onChange={(e) => setUploadData({ ...uploadData, saveLocationAsDefault: e.target.checked })}
                        className="w-4 h-4 rounded border-stone-300 text-[#0A2517] focus:ring-[#0A2517] cursor-pointer"
                      />
                      <label htmlFor="saveLocationAsDefault" className="text-[11px] text-stone-600 font-medium cursor-pointer">
                        Lưu trạm gửi này làm mặc định (tự nạp cho các món đồ sau)
                      </label>
                    </div>

                    {/* Hộp góc bảo mật */}
                    <div className="p-3 rounded-xl bg-stone-100/90 border border-stone-200">
                      <p className="text-[11px] text-stone-700 leading-relaxed">
                        <strong className="text-stone-900 font-bold">Góc bảo mật:</strong> Tên cậu sẽ hiện trên món đồ, nhưng số điện thoại thì được CLOOP giấu kỹ nhé. Số này chỉ được bật mí cho người mượn khi họ đã cọc thành công thôi nè!
                      </p>
                    </div>
                  </div>

                  {/* 8. KÝ ỨC / CÂU CHUYỆN TRANG PHỤC (BẢO TÀNG KÝ ỨC CLOOP) */}
                  <div>
                    <label className="block text-xs font-bold text-stone-800 mb-1 flex items-center justify-between">
                      <span>Ký ức &amp; Câu chuyện trang phục</span>
                      <span className="text-[10px] text-emerald-800 font-bold">Bảo tàng ký ức</span>
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Chiếc đầm này đã đồng hành cùng bạn trong bữa tiệc đáng nhớ nào?..."
                      value={uploadData.story}
                      onChange={(e) => setUploadData({ ...uploadData, story: e.target.value })}
                      className="w-full p-3 rounded-xl border border-stone-300 bg-white text-xs outline-none resize-none focus:border-[#0A2517]"
                    />
                  </div>

                  {/* 9. TÁC ĐỘNG MÔI TRƯỜNG */}
                  <div className="bg-stone-100 rounded-2xl p-3 border border-stone-200 text-stone-700 text-[11px] leading-relaxed">
                    Món đồ này khi được chia sẻ sẽ giúp tiết kiệm <strong>5.8kg CO2e</strong> và cộng <strong>100 Điểm Xanh</strong> vào tài khoản của bạn!
                  </div>

                  {/* NÚT SUBMIT */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmittingPost}
                      className="w-full h-12 rounded-xl bg-[#0A2517] text-white font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-2 shadow-md hover:bg-[#15462D] transition disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmittingPost ? (
                        <>
                          <RefreshCw size={15} className="animate-spin" />
                          <span>Đang đăng vào tủ đồ...</span>
                        </>
                      ) : (
                        <span>Lưu &amp; Chia Sẻ Lên Tủ Đồ CLOOP</span>
                      )}
                    </button>
                  </div>
                </form>
              )}

            </div>
          </div>
        )}

        {/* ========================================================
            ✂️ 11. MODAL CROPPER CĂN CHỈNH TỶ LỆ 3:4 THEO Ý CHỦ TỦ
            ======================================================== */}
        {currentCropSrc && (
          <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-sm flex items-center justify-between text-white pb-3">
              <div className="flex items-center gap-2">
                <Crop size={16} className="text-emerald-400" />
                <span className="text-sm font-bold">Căn chỉnh góc mặc (3:4)</span>
              </div>
              <span className="text-xs text-stone-400">
                {cropQueue.length > 1 ? `Còn ${cropQueue.length} ảnh cần cắt` : "Chủ tủ tự căn góc"}
              </span>
            </div>

            <div className="relative w-full max-w-sm aspect-[3/4] bg-black rounded-2xl overflow-hidden shadow-2xl border border-stone-700">
              <Cropper
                image={currentCropSrc}
                crop={crop}
                zoom={zoom}
                aspect={3 / 4}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
              />
            </div>

            <div className="w-full max-w-sm mt-4 px-2 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-stone-300">
                <span>Thu nhỏ</span>
                <span>Kéo để phóng to / căn dáng</span>
                <span>Phóng to</span>
              </div>
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-stone-700 rounded-full appearance-none"
              />
            </div>

            <div className="flex items-center gap-3 w-full max-w-sm mt-5">
              <button
                type="button"
                onClick={handleCropSkip}
                className="flex-1 py-3 bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs rounded-xl transition cursor-pointer text-center"
              >
                Giữ nguyên gốc
              </button>
              <button
                type="button"
                onClick={handleCropConfirm}
                className="flex-1 py-3 bg-[#0A2517] hover:bg-[#15462D] text-white font-bold text-xs rounded-xl transition cursor-pointer text-center border border-emerald-600/50 shadow-lg"
              >
                Cắt &amp; Lưu ảnh
              </button>
            </div>
          </div>
        )}

        {/* ========================================================
            🛒 12. MODAL XÁC NHẬN ĐƠN THUÊ / MUA ĐỒ TRỰC TIẾP (CHECKOUT FLOW)
            ======================================================== */}
        {checkoutProduct && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end justify-center p-0 sm:p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-[430px] bg-[#FAF9F5] rounded-t-[32px] sm:rounded-[32px] max-h-[90vh] overflow-y-auto text-[#0A2517] shadow-2xl relative animate-in slide-in-from-bottom duration-300 border border-stone-200 no-scrollbar flex flex-col">
              
              {/* Header Modal - Cố định không bị trôi khi cuộn */}
              <div className="flex items-center justify-between p-5 pb-3.5 border-b border-stone-200 sticky top-0 bg-[#FAF9F5] z-20 shrink-0">
                <div>
                  <h3 className="font-heading font-black text-base text-[#0A2517] leading-tight">
                    {bookingSuccessData ? (isPaidSuccess ? "Thanh Toán Thành Công" : "Cổng Thanh Toán PayOS") : (checkoutProduct.listingTypeRaw === "SELL" ? "Xác Nhận Mua Trang Phục" : "Xác Nhận Thuê Trang Phục")}
                  </h3>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    {bookingSuccessData ? (isPaidSuccess ? "Giao dịch đã xác thực bởi PayOS" : "Két bảo chứng tự động khóa tiền cọc") : "Bảo chứng thanh toán an toàn bởi CLOOP Escrow"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setCheckoutProduct(null);
                    setBookingSuccessData(null);
                    setBookingError(null);
                    setIsPaidSuccess(false);
                    setIsCheckingPayment(false);
                    setPaymentCheckMsg(null);
                  }}
                  className="w-8 h-8 rounded-full bg-stone-200/70 hover:bg-stone-300 flex items-center justify-center text-stone-600 transition cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Nội dung bên trong Modal */}
              <div className="p-5 pt-3.5 space-y-3.5">

                {/* TH1: NẾU ĐẶT ĐƠN THÀNH CÔNG -> HIỂN THỊ MÀN HÌNH THANH TOÁN PAYOS */}
                {bookingSuccessData ? (
                  isPaidSuccess ? (
                    /* TRƯỜNG HỢP 1A: PAYOS ĐÃ XÁC THỰC THANH TOÁN THÀNH CÔNG */
                    <div className="space-y-4 py-2 animate-in fade-in zoom-in-95 duration-300">
                      <div className="text-center space-y-3 bg-emerald-50/90 p-5 rounded-2xl border border-emerald-200 shadow-xs">
                        <div className="w-14 h-14 bg-emerald-700 text-white rounded-full flex items-center justify-center mx-auto shadow-md">
                          <CheckCircle2 size={32} />
                        </div>
                        <div>
                          <h4 className="font-heading font-black text-lg text-emerald-950">
                            Thanh Toán PayOS Thành Công! 🎉
                          </h4>
                          <p className="text-xs text-emerald-800 mt-0.5">
                            Két bảo chứng CLOOP Escrow đã nhận tiền cọc & xác nhận đơn hàng.
                          </p>
                        </div>
                        <div className="inline-block bg-white px-3 py-1.5 rounded-full border border-emerald-300 font-mono text-xs font-black text-[#0A2517]">
                          Mã đơn: #{bookingSuccessData.orderCode}
                        </div>
                      </div>

                      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-2 text-xs">
                        <div className="flex justify-between py-1 border-b border-stone-100">
                          <span className="text-stone-500">Sản phẩm:</span>
                          <span className="font-bold text-stone-900 line-clamp-1 max-w-[200px]">{bookingSuccessData.productTitle}</span>
                        </div>
                        {bookingSuccessData.isRental && (
                          <div className="flex justify-between py-1 border-b border-stone-100">
                            <span className="text-stone-500">Thời gian thuê:</span>
                            <span className="font-medium text-stone-800">{bookingSuccessData.startDate} → {bookingSuccessData.endDate} ({bookingSuccessData.packageDays} ngày)</span>
                          </div>
                        )}
                        <div className="flex justify-between py-1 border-b border-stone-100">
                          <span className="text-stone-500">Tổng thanh toán:</span>
                          <strong className="text-emerald-900 font-black text-sm">{(Number(bookingSuccessData.totalAmount) || 0).toLocaleString("vi-VN")}đ</strong>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-stone-500">Trạng thái:</span>
                          <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            ✓ Đã xác thực thanh toán PayOS
                          </span>
                        </div>
                      </div>

                      {/* Nút điều hướng */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setCheckoutProduct(null);
                            setBookingSuccessData(null);
                            setIsPaidSuccess(false);
                            setActiveTab("closet");
                            setActiveClosetView("orders");
                            setOrderSubTab("renter");
                          }}
                          className="py-3 px-3 rounded-xl bg-[#0A2517] hover:bg-[#15462D] text-white font-bold text-xs shadow-xs transition cursor-pointer text-center"
                        >
                          Xem đơn của tôi
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCheckoutProduct(null);
                            setBookingSuccessData(null);
                            setIsPaidSuccess(false);
                          }}
                          className="py-3 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs transition cursor-pointer text-center"
                        >
                          Tiếp tục dạo đồ
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* TRƯỜNG HỢP 1B: ĐANG CHỜ THANH TOÁN PAYOS (QUÉT MÃ QR & POLLING REALTIME) */
                    <div className="space-y-3.5 py-1 animate-in fade-in duration-300">
                      <div className="text-center space-y-1 bg-stone-50 p-3 rounded-2xl border border-stone-200">
                        <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/80 inline-block">
                          KÉT BẢO CHỨNG TỰ ĐỘNG KHÓA TIỀN CỌC
                        </span>
                        <h4 className="font-heading font-black text-base text-[#0A2517] pt-0.5">
                          Quét Mã QR Chuyển Khoản PayOS
                        </h4>
                        <p className="text-[11px] text-stone-500">
                          Mã đơn: <strong className="font-mono text-xs font-black text-[#0A2517]">#{bookingSuccessData.orderCode}</strong>
                        </p>
                      </div>

                      {/* Khung Mã QR PayOS */}
                      <div className="flex flex-col items-center justify-center py-3 bg-white rounded-2xl border border-stone-200 shadow-2xs">
                        <div className="relative w-48 h-48 bg-white p-1 rounded-xl border border-stone-200 shadow-xs flex items-center justify-center">
                          {bookingSuccessData.bin && bookingSuccessData.accountNumber ? (
                            <img
                              src={`https://api.vietqr.io/image/${bookingSuccessData.bin}-${bookingSuccessData.accountNumber}-compact2.jpg?amount=${bookingSuccessData.totalAmount}&addInfo=${encodeURIComponent(bookingSuccessData.description || `CLOOP GD ${bookingSuccessData.orderCode}`)}&accountName=${encodeURIComponent(bookingSuccessData.accountName || 'CLOOP')}`}
                              alt="Mã QR PayOS"
                              className="w-full h-full object-contain"
                            />
                          ) : bookingSuccessData.qrCode ? (
                            <img
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(bookingSuccessData.qrCode)}`}
                              alt="Mã QR PayOS"
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <img
                              src={`https://api.vietqr.io/image/970422-0335805562-compact2.jpg?amount=${bookingSuccessData.totalAmount}&addInfo=${encodeURIComponent(`CLOOP GD ${bookingSuccessData.orderCode}`)}&accountName=CLOOP%20VIETNAM`}
                              alt="Mã QR PayOS"
                              className="w-full h-full object-contain"
                            />
                          )}
                        </div>

                        <div className="mt-2.5 flex items-center gap-2 text-[11px] text-emerald-800 font-bold">
                          <Loader2 size={13} className="animate-spin text-emerald-700" />
                          <span>Đang chờ chuyển khoản... (PayOS tự động nhận diện)</span>
                        </div>
                      </div>

                      {/* Bảng thông tin chuyển khoản chi tiết & nút copy */}
                      <div className="space-y-1.5 font-mono text-[11px] bg-stone-50 p-3 rounded-xl border border-stone-200/80">
                        <div className="flex justify-between items-center py-0.5">
                          <span className="text-stone-500 font-sans">Ngân hàng:</span>
                          <strong className="text-stone-900 font-sans">MB Bank / ACB (PayOS)</strong>
                        </div>
                        <div className="flex justify-between items-center py-0.5">
                          <span className="text-stone-500 font-sans">Số tài khoản:</span>
                          <div className="flex items-center gap-1.5">
                            <strong className="text-stone-900 font-bold">{bookingSuccessData.accountNumber || "0335805562"}</strong>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(bookingSuccessData.accountNumber || "0335805562", "accountNumber")}
                              className="text-[10px] text-emerald-700 hover:text-emerald-900 font-bold font-sans bg-white px-1.5 py-0.5 rounded border border-stone-200 cursor-pointer"
                            >
                              {copiedField === "accountNumber" ? "✓ Đã chép" : "Chép"}
                            </button>
                          </div>
                        </div>
                        <div className="flex justify-between items-center py-0.5">
                          <span className="text-stone-500 font-sans">Chủ tài khoản:</span>
                          <strong className="text-stone-900 font-sans">{bookingSuccessData.accountName || "CLOOP VIETNAM"}</strong>
                        </div>
                        <div className="flex justify-between items-center py-0.5">
                          <span className="text-stone-500 font-sans">Số tiền cọc:</span>
                          <div className="flex items-center gap-1.5">
                            <strong className="text-emerald-900 font-black text-sm">{(Number(bookingSuccessData.totalAmount) || 0).toLocaleString("vi-VN")}đ</strong>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(String(bookingSuccessData.totalAmount), "amount")}
                              className="text-[10px] text-emerald-700 hover:text-emerald-900 font-bold font-sans bg-white px-1.5 py-0.5 rounded border border-stone-200 cursor-pointer"
                            >
                              {copiedField === "amount" ? "✓ Đã chép" : "Chép"}
                            </button>
                          </div>
                        </div>
                        <div className="flex justify-between items-center py-0.5">
                          <span className="text-stone-500 font-sans">Nội dung CK:</span>
                          <div className="flex items-center gap-1.5">
                            <strong className="text-[#0A2517] bg-amber-50 text-amber-900 border border-amber-200 px-1 rounded font-bold">
                              {bookingSuccessData.description || `CLOOP GD ${bookingSuccessData.orderCode}`}
                            </strong>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(bookingSuccessData.description || `CLOOP GD ${bookingSuccessData.orderCode}`, "description")}
                              className="text-[10px] text-emerald-700 hover:text-emerald-900 font-bold font-sans bg-white px-1.5 py-0.5 rounded border border-stone-200 cursor-pointer"
                            >
                              {copiedField === "description" ? "✓ Đã chép" : "Chép"}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Nút kiểm tra trạng thái thanh toán thủ công */}
                      <button
                        type="button"
                        disabled={isCheckingPayment}
                        onClick={handleCheckPayment}
                        className="w-full py-3 bg-[#0A2517] hover:bg-[#15462D] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                      >
                        {isCheckingPayment ? (
                          <>
                            <Loader2 size={14} className="animate-spin" /> Đang kiểm tra với PayOS...
                          </>
                        ) : (
                          <>
                            <RefreshCw size={14} /> Tôi đã chuyển khoản (Kiểm tra lại ngay)
                          </>
                        )}
                      </button>

                      {paymentCheckMsg && (
                        <div className={`p-2.5 rounded-xl text-xs text-center leading-relaxed ${
                          paymentCheckMsg.type === "error" ? "bg-red-50 text-red-700 border border-red-200" : "bg-amber-50 text-amber-900 border border-amber-200"
                        }`}>
                          {paymentCheckMsg.text}
                        </div>
                      )}

                      {bookingSuccessData.checkoutUrl && (
                        <a
                          href={bookingSuccessData.checkoutUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-center"
                        >
                          <ExternalLink size={13} /> Mở cổng PayOS (Trang thanh toán chính thức)
                        </a>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setCheckoutProduct(null);
                          setBookingSuccessData(null);
                          setIsPaidSuccess(false);
                        }}
                        className="w-full py-2 text-stone-500 hover:text-stone-700 text-xs font-medium transition cursor-pointer text-center"
                      >
                        Đóng (Đơn hàng đã được lưu trên hệ thống)
                      </button>
                    </div>
                  )
                ) : (
                  /* TH2: FORM CẤU HÌNH & XÁC NHẬN ĐƠN THUÊ / MUA */
                  <form onSubmit={handleConfirmBooking} className="space-y-3.5">
                    {bookingError && (
                      <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                        {bookingError}
                      </div>
                    )}

                    {/* Tóm tắt sản phẩm đang chọn */}
                    <div className="p-3 rounded-2xl bg-stone-100/80 border border-stone-200/80 flex gap-3 items-center">
                      <div className="relative w-14 h-16 rounded-xl overflow-hidden bg-white shrink-0 shadow-2xs">
                        <Image
                          src={checkoutProduct.image || checkoutProduct.primaryImage || checkoutProduct.images?.[0] || "/1.1.jpg"}
                          alt={checkoutProduct.title}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-900">
                            {checkoutProduct.listingTypeRaw === "SELL" ? "Mua lại" : "Thuê đồ"}
                          </span>
                          <span className="text-[10px] text-stone-500 truncate">
                            Chủ tủ: {checkoutProduct.ownerName || "CLOOP"}
                          </span>
                        </div>
                        <h4 className="font-heading font-black text-xs text-[#0A2517] truncate mt-0.5">
                          {checkoutProduct.title}
                        </h4>
                        <p className="text-xs font-bold text-[#0A2517] mt-0.5">
                          {((checkoutProduct.listingTypeRaw === "SELL" ? checkoutProduct.salePrice : checkoutProduct.rentalPrice) || checkoutProduct.price || 0).toLocaleString("vi-VN")}đ
                          {checkoutProduct.listingTypeRaw !== "SELL" && <span className="text-[10px] font-normal text-stone-500"> / ngày</span>}
                        </p>
                      </div>
                    </div>

                    {/* 1. CHỌN GÓI THUÊ TRẢI NGHIỆM (ĐỒNG BỘ 100% CHUẨN WEB) */}
                    {checkoutProduct.listingTypeRaw !== "SELL" && (
                      <div className="p-3.5 rounded-2xl bg-white border border-stone-200/90 space-y-2.5">
                        <div className="flex justify-between items-center">
                          <label className="block text-xs font-bold text-[#0A2517]">
                            1. Gói thuê trải nghiệm
                          </label>
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                            Tiết kiệm đến 30%
                          </span>
                        </div>

                        {/* 3 Thẻ Gói Thuê Đồng Bộ Web (1 Ngày, 3 Ngày, 7 Ngày) */}
                        <div className="grid grid-cols-3 gap-1.5">
                          {[
                            { days: 1, name: "1 Ngày", sub: "Hỏa tốc", discount: null },
                            { days: 3, name: "3 Ngày", sub: "Cuối tuần", discount: "-15%" },
                            { days: 7, name: "7 Ngày", sub: "Nghỉ dưỡng", discount: "-30%" },
                          ].map((pkg) => {
                            const isSelected = checkoutDays === pkg.days;
                            const pkgPrice = calculatePackageRentalFee(checkoutProduct, pkg.days);

                            return (
                              <button
                                key={pkg.days}
                                type="button"
                                onClick={() => setCheckoutDays(pkg.days)}
                                className={`relative p-2 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                                  isSelected
                                    ? "bg-[#0A2517] text-white border-[#0A2517] shadow-xs"
                                    : "bg-stone-50 text-stone-700 border-stone-200 hover:border-stone-300"
                                }`}
                              >
                                {pkg.discount && (
                                  <span className={`absolute -top-1.5 -right-1 text-[8.5px] font-black px-1.5 py-0.2 rounded-full font-mono ${
                                    isSelected ? "bg-amber-400 text-stone-900" : "bg-emerald-100 text-emerald-800"
                                  }`}>
                                    {pkg.discount}
                                  </span>
                                )}
                                <div>
                                  <span className="text-xs font-bold block leading-tight">{pkg.name}</span>
                                  <span className={`text-[9px] block ${isSelected ? "text-emerald-200" : "text-stone-400"}`}>
                                    {pkg.sub}
                                  </span>
                                </div>
                                <span className={`text-[10.5px] font-bold font-mono mt-1 ${isSelected ? "text-white" : "text-[#0A2517]"}`}>
                                  {pkgPrice.toLocaleString("vi-VN")}đ
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Ngày nhận đồ & Lịch hiển thị */}
                        <div className="pt-0.5 grid grid-cols-2 gap-2 items-center">
                          <div>
                            <span className="text-[10px] text-stone-500 block mb-0.5">Ngày nhận đồ:</span>
                            <input
                              type="date"
                              required
                              min={new Date().toISOString().slice(0, 10)}
                              value={checkoutStartDate}
                              onChange={(e) => setCheckoutStartDate(e.target.value)}
                              className="w-full h-8 px-2 rounded-xl border border-stone-300 bg-white text-xs font-medium outline-none focus:border-[#0A2517]"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-stone-500 block mb-0.5">Lịch dự kiến:</span>
                            <div className="h-8 px-2 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-between text-[10px] font-mono font-bold text-[#0A2517]">
                              <span>{checkoutStartDate ? checkoutStartDate.slice(5) : ""}</span>
                              <span>➔</span>
                              <span>{checkoutEndDate ? checkoutEndDate.slice(5) : ""} ({checkoutDays}d)</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 2. HÌNH THỨC NHẬN HÀNG */}
                    <div className="p-3.5 rounded-2xl bg-white border border-stone-200/90 space-y-2.5">
                      <label className="block text-xs font-bold text-[#0A2517]">
                        Phương thức giao nhận
                      </label>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setCheckoutShippingMode("CLOOP_BOOK")}
                          className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                            checkoutShippingMode === "CLOOP_BOOK"
                              ? "border-[#0A2517] bg-stone-100 ring-1 ring-[#0A2517]"
                              : "border-stone-200 bg-white hover:bg-stone-50"
                          }`}
                        >
                          <span className="text-xs font-bold block text-stone-900">Giao tận nơi</span>
                          <span className="text-[10px] text-stone-500 block mt-0.5">
                            {isLoadingCheckoutShipping ? (
                              <span className="text-amber-700 animate-pulse font-medium">Đang tính GHN...</span>
                            ) : checkoutShippingFee !== null ? (
                              <span className="text-emerald-700 font-semibold">Shipper GHN (+{checkoutShippingFee.toLocaleString("vi-VN")}đ)</span>
                            ) : (
                              <span>Shipper GHN (Theo địa chỉ)</span>
                            )}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setCheckoutShippingMode("SELF_BOOK")}
                          className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                            checkoutShippingMode === "SELF_BOOK"
                              ? "border-[#0A2517] bg-stone-100 ring-1 ring-[#0A2517]"
                              : "border-stone-200 bg-white hover:bg-stone-50"
                          }`}
                        >
                          <span className="text-xs font-bold block text-stone-900">Tự đến lấy</span>
                          <span className="text-[10px] text-stone-500 block mt-0.5">Tại trạm chủ tủ (0đ)</span>
                        </button>
                      </div>

                      {checkoutShippingMode === "SELF_BOOK" && (
                        <p className="text-[10.5px] text-stone-600 bg-stone-100 p-2 rounded-lg">
                          <strong>Trạm lấy đồ:</strong> {checkoutProduct.specificAddress || checkoutProduct.location || "Hà Nội"}
                        </p>
                      )}
                    </div>

                    {/* 3. THÔNG TIN NGƯỜI NHẬN & ĐỊA CHỈ GHN */}
                    <div className="p-3.5 rounded-2xl bg-white border border-stone-200/90 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-[#0A2517]">
                          Thông tin người nhận
                        </label>
                        <span className="text-[10px] text-stone-400">
                          Tự động lưu cho các lần sau
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10.5px] text-stone-500 block mb-1">Họ &amp; Tên *</span>
                          <input
                            type="text"
                            required
                            placeholder="Họ tên bạn..."
                            value={checkoutRenterName}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCheckoutRenterName(val);
                              try {
                                if (typeof window !== "undefined") {
                                  const raw = localStorage.getItem("cloop_saved_renter_info");
                                  const parsed = raw ? JSON.parse(raw) : {};
                                  localStorage.setItem("cloop_saved_renter_info", JSON.stringify({ ...parsed, name: val }));
                                }
                              } catch (_) {}
                            }}
                            className="w-full h-9 px-2.5 rounded-xl border border-stone-300 bg-white text-xs outline-none focus:border-[#0A2517]"
                          />
                        </div>
                        <div>
                          <span className="text-[10.5px] text-stone-500 block mb-1">Số điện thoại *</span>
                          <input
                            type="tel"
                            required
                            placeholder="0912..."
                            value={checkoutRenterPhone}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCheckoutRenterPhone(val);
                              try {
                                if (typeof window !== "undefined") {
                                  const raw = localStorage.getItem("cloop_saved_renter_info");
                                  const parsed = raw ? JSON.parse(raw) : {};
                                  localStorage.setItem("cloop_saved_renter_info", JSON.stringify({ ...parsed, phone: val }));
                                }
                              } catch (_) {}
                            }}
                            className="w-full h-9 px-2.5 rounded-xl border border-stone-300 bg-white text-xs font-mono outline-none focus:border-[#0A2517]"
                          />
                        </div>
                      </div>

                      {checkoutShippingMode === "CLOOP_BOOK" && (
                        <div className="space-y-2 pt-1 border-t border-stone-100">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-[#0A2517] flex items-center gap-1">
                              <MapPin size={12} className="text-emerald-700" />
                              Địa chỉ giao nhận (GHN) *
                            </span>
                            {isLoadingCheckoutShipping && (
                              <span className="text-[10px] text-amber-700 flex items-center gap-1">
                                <RefreshCw size={10} className="animate-spin" />
                                Đang tính cước GHN...
                              </span>
                            )}
                          </div>

                          {/* 3 Dropdown chuẩn API Giao Hàng Nhanh (GHN) */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div>
                              <span className="text-[10px] text-stone-500 block mb-0.5">Tỉnh / TP *</span>
                              <select
                                required
                                value={checkoutProvinceId}
                                onChange={(e) => handleCheckoutProvinceChange(e.target.value ? Number(e.target.value) : "")}
                                className="w-full h-8 px-2 rounded-xl border border-stone-300 bg-white text-[11px] font-medium outline-none focus:border-[#0A2517]"
                              >
                                <option value="">-- Chọn Tỉnh/TP --</option>
                                {ghnProvinces.map((p: any) => (
                                   <option key={p.ProvinceID} value={p.ProvinceID}>
                                     {p.ProvinceName}
                                   </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <span className="text-[10px] text-stone-500 block mb-0.5">Quận / Huyện *</span>
                              <select
                                required
                                disabled={!checkoutProvinceId}
                                value={checkoutDistrictId}
                                onChange={(e) => handleCheckoutDistrictChange(e.target.value ? Number(e.target.value) : "")}
                                className="w-full h-8 px-2 rounded-xl border border-stone-300 bg-white text-[11px] font-medium outline-none focus:border-[#0A2517] disabled:bg-stone-100 disabled:text-stone-400"
                              >
                                <option value="">-- Chọn Quận/Huyện --</option>
                                {checkoutDistricts.map((d: any) => (
                                   <option key={d.DistrictID} value={d.DistrictID}>
                                     {d.DistrictName}
                                   </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <span className="text-[10px] text-stone-500 block mb-0.5">Phường / Xã *</span>
                              <select
                                required
                                disabled={!checkoutDistrictId}
                                value={checkoutWardCode}
                                onChange={(e) => handleCheckoutWardChange(e.target.value)}
                                className="w-full h-8 px-2 rounded-xl border border-stone-300 bg-white text-[11px] font-medium outline-none focus:border-[#0A2517] disabled:bg-stone-100 disabled:text-stone-400"
                              >
                                <option value="">-- Chọn Phường/Xã --</option>
                                {checkoutWards.map((w: any) => (
                                  <option key={w.WardCode} value={w.WardCode}>
                                    {w.WardName}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div>
                            <span className="text-[10px] text-stone-500 block mb-0.5">Số nhà, ngõ, tên đường cụ thể *</span>
                            <input
                              type="text"
                              required
                              placeholder="VD: Số 18, Ngõ 45, Đường Láng..."
                              value={checkoutAddressDetail}
                              onChange={(e) => setCheckoutAddressDetail(e.target.value)}
                              className="w-full h-9 px-2.5 rounded-xl border border-stone-300 bg-white text-xs outline-none focus:border-[#0A2517]"
                            />
                          </div>

                          <div>
                            <span className="text-[10px] text-stone-500 block mb-0.5">Ghi chú giao hàng (Toà nhà, số phòng, dặn shipper...)</span>
                            <input
                              type="text"
                              placeholder="VD: Chung cư Star Tower, tầng 12, gọi trước khi giao..."
                              value={checkoutRenterNote}
                              onChange={(e) => setCheckoutRenterNote(e.target.value)}
                              className="w-full h-9 px-2.5 rounded-xl border border-stone-300 bg-white text-xs outline-none focus:border-[#0A2517]"
                            />
                          </div>

                          {/* Báo cáo cước GHN trực tiếp */}
                          <div className={`p-2 rounded-xl text-[10.5px] flex items-center justify-between border ${
                            checkoutShippingFee !== null
                              ? "bg-emerald-50/80 border-emerald-200 text-emerald-900"
                              : isLoadingCheckoutShipping
                              ? "bg-amber-50/80 border-amber-200 text-amber-900"
                              : "bg-stone-50 border-stone-200 text-stone-600"
                          }`}>
                            <span className="flex items-center gap-1.5">
                              <Truck size={13} className={checkoutShippingFee !== null ? "text-emerald-700" : "text-stone-400"} />
                              {isLoadingCheckoutShipping
                                ? "Đang kết nối GHN Gateway để tính cước chính xác..."
                                : checkoutShippingFee !== null
                                ? "Cước giao GHN tiêu chuẩn:"
                                : "Chưa chọn địa chỉ giao (chọn Tỉnh, Huyện, Xã để tính)"
                              }
                            </span>
                            <span className="font-bold font-mono">
                              {checkoutShippingFee !== null ? `${checkoutShippingFee.toLocaleString("vi-VN")}đ` : "--"}
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-0.5">
                        <input
                          type="checkbox"
                          id="saveRenterInfo"
                          checked={saveRenterInfo}
                          onChange={(e) => setSaveRenterInfo(e.target.checked)}
                          className="w-3.5 h-3.5 rounded border-stone-300 text-[#0A2517] focus:ring-[#0A2517] cursor-pointer"
                        />
                        <label htmlFor="saveRenterInfo" className="text-[11px] text-stone-600 cursor-pointer">
                          Ghi nhớ thông tin này (tự nạp cho các lần thuê sau)
                        </label>
                      </div>
                    </div>

                    {/* 4. CHI TIẾT TÍNH TIỀN MINH BẠCH (100% CHUẨN WEB) */}
                    <div className="p-3.5 rounded-2xl bg-[#F5F8F5] border border-stone-200/90 space-y-2 text-xs">
                      <div className="flex justify-between text-stone-600">
                        <span>{checkoutProduct.listingTypeRaw === "SELL" ? "Giá chuyển nhượng:" : `Phí gói thuê (${checkoutDays} ngày):`}</span>
                        <span className="font-bold text-stone-900 font-mono">
                          {calculatedRentalFee.toLocaleString("vi-VN")}đ
                        </span>
                      </div>

                      {checkoutProduct.listingTypeRaw !== "SELL" && (
                        <div className="flex justify-between text-stone-600">
                          <div>
                            <span>Tiền cọc đảm bảo:</span>
                            {calculatedDeposit === 0 ? (
                              <span className="text-[10px] text-emerald-700 block">Miễn cọc thành viên</span>
                            ) : (
                              <span className="text-[10px] text-stone-400 block">Hoàn trả 100% khi trả đồ</span>
                            )}
                          </div>
                          <span className="font-mono font-bold text-stone-900">
                            {calculatedDeposit === 0 ? "0đ (Miễn cọc)" : `+${calculatedDeposit.toLocaleString("vi-VN")}đ`}
                          </span>
                        </div>
                      )}

                      <div className="flex justify-between text-stone-600">
                        <span>Phí giao nhận:</span>
                        <span className={`font-bold font-mono ${checkoutShippingMode === "CLOOP_BOOK" && checkoutShippingFee === null ? "text-amber-700 italic font-normal" : "text-stone-900"}`}>
                          {checkoutShippingMode === "SELF_BOOK"
                            ? "0đ (Tự lấy tại trạm)"
                            : isLoadingCheckoutShipping
                            ? "Đang tính..."
                            : checkoutShippingFee !== null
                            ? `+${checkoutShippingFee.toLocaleString("vi-VN")}đ`
                            : "Chưa chọn địa chỉ"}
                        </span>
                      </div>

                      <div className="flex justify-between text-stone-600">
                        <span>Bảo hiểm trang phục CLOOP:</span>
                        <span className="text-emerald-800 font-bold">Miễn phí</span>
                      </div>

                      <div className="pt-2 border-t border-stone-200 flex justify-between items-baseline">
                        <div>
                          <span className="font-bold text-xs text-[#0A2517] block">Tổng thanh toán:</span>
                          {checkoutShippingMode === "CLOOP_BOOK" && checkoutShippingFee === null ? (
                            <span className="text-[10px] text-amber-700 italic">* Chưa gồm cước vận chuyển GHN</span>
                          ) : checkoutProduct.listingTypeRaw !== "SELL" && calculatedDeposit > 0 ? (
                            <span className="text-[10px] text-stone-500 italic">* Đã gồm cọc (Hoàn lại 100% khi trả đồ)</span>
                          ) : null}
                        </div>
                        <span className="font-heading font-black text-lg text-[#0A2517] font-mono">
                          {(
                            calculatedRentalFee + 
                            calculatedDeposit + 
                            (checkoutShippingMode === "CLOOP_BOOK" ? (checkoutShippingFee || 0) : 0)
                          ).toLocaleString("vi-VN")}đ
                        </span>
                      </div>
                    </div>

                    {/* Nút gửi đơn hàng */}
                    <div className="pt-1">
                      <button
                        type="submit"
                        disabled={isSubmittingBooking}
                        className="w-full h-12 rounded-xl bg-[#0A2517] text-white font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-2 shadow-md hover:bg-[#15462D] transition disabled:opacity-50 cursor-pointer"
                      >
                        {isSubmittingBooking ? (
                          <>
                            <RefreshCw size={15} className="animate-spin" />
                            <span>Đang tạo đơn giữ lịch...</span>
                          </>
                        ) : (
                          <span>{checkoutProduct.listingTypeRaw === "SELL" ? "Xác Nhận Mua & Thanh Toán" : "Xác Nhận Đặt Thuê & Giữ Lịch"}</span>
                        )}
                      </button>
                      <p className="text-[10px] text-stone-500 text-center mt-2">
                        Chính sách CLOOP: Hoàn cọc 100% khi hoàn tất &amp; Hỗ trợ đổi size trong 24h.
                      </p>
                    </div>
                  </form>
                )}

              </div>

            </div>
          </div>
        )}

        {/* ========================================================
            📖 8.6. MODAL CẨM NANG & XU HƯỚNG TUẦN HOÀN IN-APP
            ======================================================== */}
        {isBlogModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200 mobile-app-root font-sans">
            <div className="w-full max-w-[430px] max-h-[88vh] bg-[#FBF9F5] rounded-t-[32px] sm:rounded-[36px] overflow-y-auto shadow-2xl relative animate-in slide-in-from-bottom duration-300 flex flex-col no-scrollbar">
              <div className="sticky top-0 z-20 bg-[#0A2517] text-white px-4 py-3 flex items-center justify-between border-b border-emerald-900/40 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="font-bold text-sm tracking-wide">Cẩm Nang Thời Trang Tuần Hoàn</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsBlogModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="p-4 space-y-4">
                <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-2xs space-y-2">
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full uppercase">
                    Xu hướng 2026
                  </span>
                  <h3 className="font-heading font-black text-sm text-[#0A2517]">
                    Chia sẻ tủ đồ: Mặc mới mỗi tuần, chi tiêu thông minh
                  </h3>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    Thay vì bỏ ra hàng triệu đồng cho một chiếc đầm chỉ mặc 1 lần đi tiệc, mô hình kinh tế tuần hoàn tại CLOOP giúp bạn trải nghiệm đồ hiệu với chi phí chỉ bằng 10-15% giá mua, đồng thời giảm 86% lượng phát thải carbon thời trang.
                  </p>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-2xs space-y-2">
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full uppercase">
                    Bí quyết chọn size
                  </span>
                  <h3 className="font-heading font-black text-sm text-[#0A2517]">
                    Cách đo 3 vòng chuẩn xác để thuê đầm vừa in
                  </h3>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    Nhắn tin trực tiếp với chủ tủ hoặc hỏi AI Stylist của CLOOP để được tư vấn chính xác độ co giãn và form dáng từng chiếc đầm trước khi đặt cọc.
                  </p>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-2xs space-y-2">
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full uppercase">
                    Chính sách vệ sinh
                  </span>
                  <h3 className="font-heading font-black text-sm text-[#0A2517]">
                    Quy trình giặt hấp &amp; bảo quản chuẩn 5 sao
                  </h3>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    Tất cả trang phục giao dịch qua CLOOP đều được hấp tiệt trùng và kiểm định nguyên vẹn tag mác trước khi bàn giao tới tay người thuê tiếp theo.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            🛡️ 8.7. MODAL TRUNG TÂM TRỢ GIÚP & CSKH IN-APP
            ======================================================== */}
        {isHelpModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200 mobile-app-root font-sans">
            <div className="w-full max-w-[430px] max-h-[88vh] bg-[#FBF9F5] rounded-t-[32px] sm:rounded-[36px] overflow-y-auto shadow-2xl relative animate-in slide-in-from-bottom duration-300 flex flex-col no-scrollbar">
              <div className="sticky top-0 z-20 bg-[#0A2517] text-white px-4 py-3 flex items-center justify-between border-b border-emerald-900/40 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="font-bold text-sm tracking-wide">Trung Tâm Trợ Giúp &amp; CSKH</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsHelpModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="p-4 space-y-4">
                {/* CSKH 24/7 Hotline */}
                <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-2xs space-y-3">
                  <h4 className="font-heading font-bold text-xs uppercase tracking-wider text-emerald-800">
                    Kênh Hỗ Trợ Nhanh
                  </h4>
                  <div className="space-y-2">
                    <a
                      href="tel:0987654321"
                      className="flex items-center justify-between p-2.5 rounded-xl border border-stone-200 bg-[#FAF9F5] hover:border-emerald-700 transition"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                          📞
                        </div>
                        <div>
                          <p className="text-xs font-bold text-stone-800">Hotline Khẩn Cấp</p>
                          <p className="text-[11px] font-mono text-emerald-700 font-bold">098.765.4321</p>
                        </div>
                      </div>
                      <span className="text-xs text-emerald-700 font-bold">Gọi ngay</span>
                    </a>

                    <a
                      href="https://zalo.me"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-2.5 rounded-xl border border-stone-200 bg-[#FAF9F5] hover:border-blue-600 transition"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs">
                          💬
                        </div>
                        <div>
                          <p className="text-xs font-bold text-stone-800">Zalo Hỗ Trợ 24/7</p>
                          <p className="text-[11px] text-stone-500">Phản hồi dưới 3 phút</p>
                        </div>
                      </div>
                      <span className="text-xs text-blue-600 font-bold">Chat Zalo</span>
                    </a>
                  </div>
                </div>

                {/* FAQ */}
                <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-2xs space-y-2.5 text-xs text-stone-700">
                  <h4 className="font-heading font-bold text-xs uppercase tracking-wider text-emerald-800">
                    Câu Hỏi Thường Gặp
                  </h4>
                  <div className="space-y-2">
                    <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-100">
                      <p className="font-bold text-stone-800 mb-1">1. Tiền cọc được hoàn lại khi nào?</p>
                      <p className="text-stone-500 leading-relaxed text-[11px]">
                        100% tiền cọc sẽ được hoàn tự động về Ví Thu Nhập CLOOP ngay khi chủ tủ nhận lại đồ và bấm xác nhận hoàn tất.
                      </p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-100">
                      <p className="font-bold text-stone-800 mb-1">2. Nếu trang phục không vừa thì sao?</p>
                      <p className="text-stone-500 leading-relaxed text-[11px]">
                        CLOOP hỗ trợ đổi size hoặc hoàn 100% chi phí thuê trong vòng 24H kể từ lúc nhận trang phục nếu không vừa form.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
