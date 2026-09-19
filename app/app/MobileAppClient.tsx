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
  MapPin, Edit3, Menu, HelpCircle, LogOut, Package, Crop,
  Zap, CreditCard, QrCode, Sparkles
} from "lucide-react";
import Cropper from "react-easy-crop";
import { useAuthModal } from "@/app/AuthModalContext";
import { getShopProductsAction, createProductAction } from "@/app/actions/product";
import { toggleProductInteractionAction } from "@/app/actions/favorite";
import { getMyClosetMobileDataAction, updateClosetProfileAction, getClosetFullDataAction } from "@/app/actions/closet";
import { createBooking, confirmManualTransfer } from "@/app/actions/booking";

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

  // 🌐 DỮ LIỆU FEED SẢN PHẨM (PRELOAD SERVER)
  const [products, setProducts] = useState<any[]>(initialProducts);
  const [totalProductsCount, setTotalProductsCount] = useState(initialTotalCount || initialProducts.length);

  // 👤 DỮ LIỆU TỦ ĐỒ CÁ NHÂN & THEO DÕI HỒ SƠ
  const [closetData, setClosetData] = useState<any>(initialUserData || null);
  const [activeClosetView, setActiveClosetView] = useState<"menu" | "items" | "orders" | "wallet" | "eco" | "profile">("menu");
  const [orderSubTab, setOrderSubTab] = useState<"renter" | "lender" | "cart">("renter");
  const [isRefreshingCloset, setIsRefreshingCloset] = useState(false);
  const [isDrawerMenuOpen, setIsDrawerMenuOpen] = useState(false);
  const [isBlogModalOpen, setIsBlogModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

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
  const [isBookingSubmitting, setIsBookingSubmitting] = useState<boolean>(false);
  const [bookingError, setBookingError] = useState<string>("");
  const [bookingSuccessData, setBookingSuccessData] = useState<any | null>(null);
  const [isTransferConfirmed, setIsTransferConfirmed] = useState<boolean>(false);

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
    setBookingError(null);
    setBookingSuccessData(null);
    setIsTransferConfirmed(false);
    setCheckoutDays(product.minDays || 3);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setCheckoutStartDate(tomorrow.toISOString().slice(0, 10));

    // 💾 Lấy thông tin liên hệ đã lưu từ trước (làm 1 lần giữ mãi)
    let savedInfo: any = null;
    try {
      if (typeof window !== "undefined") {
        const raw = localStorage.getItem("cloop_saved_renter_info");
        if (raw) savedInfo = JSON.parse(raw);
      }
    } catch (_) {}

    setCheckoutRenterName(savedInfo?.name || currentUser?.name || closetData?.user?.name || "");
    setCheckoutRenterPhone(savedInfo?.phone || closetData?.user?.phone || "");
    setCheckoutRenterAddress(savedInfo?.address || closetData?.user?.address || "");
    setCheckoutRenterNote(savedInfo?.note || "");
  };

  // 💳 XÁC NHẬN TẠO ĐƠN HÀNG (RENTAL HOẶC PURCHASE)
  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutProduct) return;

    setBookingError("");

    if (!checkoutRenterName.trim()) {
      setBookingError("Vui lòng điền họ tên người nhận");
      return;
    }
    if (!checkoutRenterPhone.trim() || !/(84|0[3|5|7|8|9])+([0-9]{8})\b/.test(checkoutRenterPhone.trim())) {
      setBookingError("Vui lòng điền số điện thoại hợp lệ (10 chữ số)");
      return;
    }
    if (checkoutShippingMode === "CLOOP_BOOK" && !checkoutRenterAddress.trim()) {
      setBookingError("Vui lòng điền địa chỉ nhận hàng chi tiết");
      return;
    }

    setIsSubmittingBooking(true);

    // Lưu thông tin liên hệ vào LocalStorage nếu người dùng tích chọn
    try {
      if (saveRenterInfo && typeof window !== "undefined") {
        localStorage.setItem("cloop_saved_renter_info", JSON.stringify({
          name: checkoutRenterName.trim(),
          phone: checkoutRenterPhone.trim(),
          address: checkoutRenterAddress.trim(),
          note: checkoutRenterNote.trim(),
        }));
      }
    } catch (_) {}

    const isRental = checkoutProduct.listingTypeRaw !== "SELL";
    const unitPrice = isRental ? (checkoutProduct.rentalPrice || checkoutProduct.price || 0) : (checkoutProduct.salePrice || checkoutProduct.price || 0);
    const subTotal = isRental ? unitPrice * checkoutDays : unitPrice;
    const deposit = isRental ? (checkoutProduct.deposit > 0 ? checkoutProduct.deposit : unitPrice * 3) : 0;
    const shippingFee = checkoutShippingMode === "CLOOP_BOOK" ? 35000 : 0;
    const totalAmount = subTotal + deposit + shippingFee;

    try {
      const res = await createBookingAction({
        productId: checkoutProduct.id,
        startDate: checkoutStartDate,
        endDate: checkoutEndDate,
        renterName: checkoutRenterName.trim(),
        renterPhone: checkoutRenterPhone.trim(),
        ownerName: checkoutProduct.ownerName || "Chủ tủ CLOOP",
        ownerPhone: "",
        isRental,
        shippingMode: checkoutShippingMode,
      });

      if (res.success && res.rentalId) {
        setCartItems(prev => prev.filter(item => item.id !== checkoutProduct.id));
        refreshPersonalData();

        const fullShippingAddress = checkoutShippingMode === "CLOOP_BOOK"
          ? `${checkoutRenterAddress.trim()}${checkoutRenterNote.trim() ? ` (Ghi chú: ${checkoutRenterNote.trim()})` : ""}`
          : (checkoutProduct.specificAddress || checkoutProduct.location || "Trạm chủ tủ");

        setBookingSuccessData({
          rentalId: res.rentalId,
          orderCode: res.rentalId.slice(-6).toUpperCase(),
          totalAmount: res.totalAmount || totalAmount,
          depositAmount: res.depositAmount || deposit,
          rentalFee: subTotal,
          shippingFee,
          startDate: checkoutStartDate,
          endDate: checkoutEndDate,
          packageDays: checkoutDays,
          productTitle: checkoutProduct.title,
          productImage: checkoutProduct.image || checkoutProduct.primaryImage || checkoutProduct.images?.[0] || "/1.1.jpg",
          ownerName: checkoutProduct.ownerName || "Chủ tủ CLOOP",
          shippingAddress: fullShippingAddress,
          isRental,
        });
      } else {
        setBookingError(res.error || "Không thể khởi tạo đơn hàng. Vui lòng thử lại!");
      }
    } catch (err: any) {
      setBookingError(err.message || "Lỗi kết nối máy chủ");
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  // 🏦 XÁC NHẬN ĐÃ CHUYỂN KHOẢN ĐẶT CỌC
  const handleConfirmTransfer = async () => {
    if (!bookingSuccessData?.rentalId) return;
    setIsTransferConfirmed(true);
    try {
      await confirmManualTransfer(bookingSuccessData.rentalId);
      refreshPersonalData();
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

      const parsedRentPrice = parseInt(uploadData.rentalPrice.replace(/\D/g, "")) || 250000;
      const parsedDeposit = parseInt(uploadData.deposit.replace(/\D/g, "")) || (parsedRentPrice * 2);
      const parsedSalePrice = uploadData.isSale ? (parseInt(uploadData.salePrice.replace(/\D/g, "")) || 1500000) : 0;

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
        userId: closetData.user.id,
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
      <div className="w-full sm:max-w-[430px] min-h-screen sm:min-h-[890px] sm:max-h-[920px] bg-[#FBF9F5] text-[#0A2517] antialiased sm:shadow-[0_25px_60px_rgba(0,0,0,0.18)] sm:rounded-[44px] sm:border-[6px] border-stone-800/80 relative overflow-y-auto overflow-x-hidden select-none pb-24 no-scrollbar flex flex-col">
        
        {/* ========================================================
            🌿 1. HEADER NATIVE APP TINH TẾ & THOÁNG ĐÃNG
            ======================================================== */}
        <div className="sticky top-0 z-40 bg-[#FBF9F5]/95 backdrop-blur-md pt-3.5 pb-2.5 px-4 border-b border-stone-200/60 transition-colors">
          
          {/* Tiêu đề & Logo chuẩn nhận diện CLOOP */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <div className="relative w-9 h-9 flex items-center justify-center shrink-0">
                <Image 
                  src="/loogo.png" 
                  alt="CLOOP Brand Logo" 
                  width={38} 
                  height={38} 
                  className="mix-blend-multiply drop-shadow-xs" 
                />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-brand-title text-[20px] font-extrabold tracking-[0.14em] text-[#183A2D] leading-none pl-0.5">
                    CLOOP
                  </span>
                  <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-100/80 text-emerald-900 border border-emerald-200/60">
                    {activeTab === "shop" ? "Sàn đồ" : activeTab === "orders" ? "Đơn hàng" : activeTab === "closet" ? "Tủ cá nhân" : "Tuần hoàn"}
                  </span>
                </div>
                <span className="text-[7.5px] font-extrabold tracking-[0.28em] uppercase text-[#226343] mt-1 pl-0.5 font-sans">
                  FASHION IN A LOOP
                </span>
              </div>
            </div>

            {/* Nút Menu tính năng (khoảng cách an toàn pr-20 tránh đè capsule Zalo) */}
            <div className="flex items-center pr-20 sm:pr-0">
              <button 
                type="button" 
                onClick={() => setIsDrawerMenuOpen(true)}
                className="w-8 h-8 rounded-full bg-white border border-stone-200 flex items-center justify-center text-stone-700 shadow-2xs active:scale-95 transition cursor-pointer hover:border-emerald-700"
                title="Menu tính năng"
              >
                <Menu size={16} />
              </button>
            </div>
          </div>

          {/* Ô TÌM KIẾM TRONG APP (HIỂN THỊ Ở TAB KHÁM PHÁ & SÀN ĐỒ) */}
          {(activeTab === "home" || activeTab === "shop") && (
            <div className="relative flex items-center">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm đầm tiệc cưới, dạ hội, áo dài..."
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
                    {totalProductsCount > 0 ? `${totalProductsCount * 120}+ lượt mặc tuần hoàn` : "Tủ đồ tuần hoàn CLOOP"}
                  </p>
                  <p className="text-[9.5px] text-stone-500">
                    Đã giảm 65 tấn khí thải CO2e cùng cộng đồng
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="px-2.5 py-1.5 rounded-lg bg-[#0A2517] text-white text-[10px] font-bold shadow-2xs hover:bg-[#143E29] transition active:scale-95 shrink-0 cursor-pointer"
              >
                + Up đồ
              </button>
            </div>


            {/* DÃY DANH MỤC LỰA CHỌN ĐI TIỆC */}
            <div className="px-3 pt-2 pb-2">
              <div className="flex items-center justify-between mb-2 px-1">
                <h2 className="font-heading font-black text-sm uppercase tracking-wider text-[#0A2517]">
                  Gợi Ý Trang Phục Nổi Bật
                </h2>
                <button
                  onClick={() => setActiveTab("shop")}
                  className="text-[11px] font-bold text-emerald-800 hover:underline cursor-pointer"
                >
                  Xem tất cả →
                </button>
              </div>

              {/* Dãy nút dịp tiệc */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                {OCCASIONS_TABS.map((tab) => {
                  const isActive = selectedOccasion === tab.name;
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
                      {tab.name}
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

                            {/* Gói thuê theo ngày thực tế */}
                            {isRent && rentPrice > 0 && (
                              <p className="text-[10px] text-emerald-800 font-medium">
                                Gói {p.minDays || 3} ngày: {(rentPrice * (p.minDays || 3)).toLocaleString("vi-VN")}đ
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

                          {/* Gói thuê theo ngày thực tế */}
                          {isRent && rentPrice > 0 && (
                            <p className="text-[10px] text-emerald-800 font-medium">
                              Gói {p.minDays || 3} ngày: {(rentPrice * (p.minDays || 3)).toLocaleString("vi-VN")}đ
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
                {(!closetData?.ordersAsRenter || closetData.ordersAsRenter.length === 0) ? (
                  <div className="py-12 text-center bg-white rounded-2xl border border-stone-200/80 p-6 space-y-3 text-stone-500">
                    <h4 className="font-bold text-sm text-stone-800">Chưa có đơn thuê trang phục nào</h4>
                    <p className="text-xs text-stone-500 max-w-xs mx-auto">
                      Dạo Sàn đồ CLOOP để chọn đầm dạ hội, áo dài và phụ kiện cho sự kiện sắp tới của bạn.
                    </p>
                    <button
                      onClick={() => setActiveTab("shop")}
                      className="px-4 py-2 bg-[#0A2517] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                    >
                      Dạo Sàn Đồ Ngay
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {closetData.ordersAsRenter.map((order: any, idx: number) => (
                      <div key={order.id || idx} className="bg-white rounded-2xl p-3.5 border border-stone-200/80 shadow-2xs space-y-2">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-mono text-stone-400">Đơn #{order.id?.slice(-6) || idx + 1}</span>
                          <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full text-[10px]">
                            {order.status === "COMPLETED" ? "Đã trả đồ" : "Đang thuê"}
                          </span>
                        </div>
                        <div className="flex gap-3 items-center">
                          <div className="relative w-14 h-16 rounded-xl overflow-hidden bg-stone-100 shrink-0">
                            <Image src={order.productImage || "/1.1.jpg"} alt={order.productTitle} fill className="object-cover" unoptimized />
                          </div>
                          <div className="flex-1 min-w-0 text-xs">
                            <h5 className="font-bold text-stone-900 truncate">{order.productTitle}</h5>
                            <p className="text-stone-500 text-[11px] mt-0.5">Lịch thuê: {order.startDate} - {order.endDate}</p>
                            <p className="font-black text-[#0A2517] mt-1">{order.amount?.toLocaleString("vi-VN")}đ</p>
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
                {(!closetData?.ordersAsLender || closetData.ordersAsLender.length === 0) ? (
                  <div className="py-12 text-center bg-white rounded-2xl border border-stone-200/80 p-6 space-y-3 text-stone-500">
                    <h4 className="font-bold text-sm text-stone-800">Chưa có khách đặt thuê đồ</h4>
                    <p className="text-xs text-stone-500 max-w-xs mx-auto">
                      Đăng thêm đầm tiệc vào kệ đồ để bắt đầu tạo thu nhập thụ động tuần hoàn.
                    </p>
                    <button
                      onClick={() => setIsUploadModalOpen(true)}
                      className="px-4 py-2 bg-[#0A2517] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                    >
                      + Đăng Trang Phục Mới
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {closetData.ordersAsLender.map((order: any, idx: number) => (
                      <div key={order.id || idx} className="bg-white rounded-2xl p-3.5 border border-stone-200/80 shadow-2xs space-y-2">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-mono text-stone-400">Đơn #{order.id?.slice(-6) || idx + 1}</span>
                          <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full text-[10px]">
                            {order.status === "LENDER_COMPLETED" ? "Đã hoàn tất" : "Đang cho thuê"}
                          </span>
                        </div>
                        <div className="flex gap-3 items-center">
                          <div className="relative w-14 h-16 rounded-xl overflow-hidden bg-stone-100 shrink-0">
                            <Image src={order.productImage || "/1.1.jpg"} alt={order.productTitle} fill className="object-cover" unoptimized />
                          </div>
                          <div className="flex-1 min-w-0 text-xs">
                            <h5 className="font-bold text-stone-900 truncate">{order.productTitle}</h5>
                            <p className="text-stone-500 text-[11px] mt-0.5">Lịch: {order.startDate} - {order.endDate}</p>
                            <div className="flex items-center justify-between mt-1">
                              <span className="font-black text-[#0A2517]">{order.amount?.toLocaleString("vi-VN")}đ</span>
                              <span className="text-[10px] text-stone-400">Cọc: {order.depositAmount?.toLocaleString("vi-VN")}đ</span>
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
                      const price = item.price || item.rentalPrice || 250000;
                      const itemImg = item.image || item.primaryImage || item.images?.[0] || "/1.1.jpg";
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
                              • Gói {item.minDays || 3} ngày: {((item.rentalPrice || item.price || 0) * (item.minDays || 3)).toLocaleString("vi-VN")}đ
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
                          {cartItems.reduce((sum, item) => sum + ((item.rentalPrice || item.price || 0) * (item.minDays || 3)), 0).toLocaleString("vi-VN")}đ
                        </span>
                      </div>
                      <div className="flex justify-between text-xs text-stone-600">
                        <span>Bảo hiểm trang phục:</span>
                        <span className="text-emerald-700 font-bold">Miễn phí</span>
                      </div>
                      <div className="pt-2 border-t border-stone-100 flex justify-between items-center">
                        <span className="font-bold text-sm text-[#0A2517]">Tổng thanh toán:</span>
                        <span className="font-heading font-black text-base text-[#0A2517]">
                          {cartItems.reduce((sum, item) => sum + (item.price || item.rentalPrice || 250000), 0).toLocaleString("vi-VN")}đ
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
                        {closetData?.user?.avatar ? (
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

                        {(!closetData?.myProducts || closetData.myProducts.length === 0) ? (
                          <div className="p-8 text-center bg-white rounded-2xl border border-stone-200/80 space-y-2">
                            <Shirt size={28} className="mx-auto text-stone-400" />
                            <h4 className="font-bold text-xs text-stone-800">Tủ đồ chưa có trang phục nào</h4>
                            <p className="text-[11px] text-stone-500 max-w-xs mx-auto">
                              Đầm tiệc cưới, áo dài, đầm dạ hội của bạn chỉ mặc 1 lần? Hãy chia sẻ vào vòng tuần hoàn để nhận thu nhập thụ động!
                            </p>
                            <button
                              onClick={() => setIsUploadModalOpen(true)}
                              className="mt-2 px-4 py-2 bg-[#0A2517] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                            >
                              <Plus size={14} />
                              <span>Up bài chia sẻ trang phục đầu tiên</span>
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {closetData.myProducts.map((item: any, idx: number) => (
                              <div
                                key={item.id || idx}
                                className="bg-white rounded-2xl p-3 border border-stone-200/80 shadow-2xs flex gap-3 items-center"
                              >
                                <div className="relative w-16 h-20 rounded-xl overflow-hidden bg-stone-100 shrink-0">
                                  <Image src={item.image || "/1.1.jpg"} alt={item.title} fill className="object-cover" unoptimized />
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
                                      Đang hiển thị
                                    </span>
                                  </div>
                                  <h4 className="text-xs font-bold text-stone-900 truncate mt-1">{item.title}</h4>
                                  <p className="text-xs font-black text-[#0A2517] mt-0.5">
                                    {item.rentalPrice ? `${item.rentalPrice.toLocaleString("vi-VN")}đ / ngày` : "Liên hệ thuê"}
                                  </p>
                                  {item.rentalPrice > 0 && (
                                    <p className="text-[9.5px] text-emerald-800 font-medium">
                                      • Gói 3 ngày: {(item.rentalPrice * 3).toLocaleString("vi-VN")}đ
                                    </p>
                                  )}
                                  <p className="text-[9.5px] text-stone-400 mt-0.5">
                                    Cọc đảm bảo: {(item.deposit || item.rentalPrice * 3 || 0).toLocaleString("vi-VN")}đ
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
                            <span>Khách thuê đồ của bạn ({closetData?.ordersAsLender?.length || 0})</span>
                          </button>
                          <button
                            onClick={() => setOrderSubTab("renter")}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1 ${
                              orderSubTab === "renter" 
                                ? "bg-[#0A2517] text-white shadow-xs" 
                                : "text-stone-600 hover:text-stone-900"
                            }`}
                          >
                            <span>Đồ bạn đang thuê ({closetData?.ordersAsRenter?.length || 0})</span>
                          </button>
                        </div>

                        {orderSubTab === "lender" ? (
                          (!closetData?.ordersAsLender || closetData.ordersAsLender.length === 0) ? (
                            <div className="p-6 text-center bg-white rounded-2xl border border-stone-200/80 text-stone-500 text-xs">
                              Chưa có khách đặt thuê đồ mới. Các trang phục của bạn đang sẵn sàng đón người mặc tiếp theo!
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {closetData.ordersAsLender.map((order: any, idx: number) => (
                                <div key={order.id || idx} className="bg-white rounded-2xl p-3.5 border border-stone-200/80 shadow-2xs space-y-2">
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="font-mono text-stone-400">Đơn #{order.id?.slice(-6) || idx + 1}</span>
                                    <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full text-[10px]">
                                      {order.status === "LENDER_COMPLETED" ? "Đã hoàn tất" : "Đang giao dịch"}
                                    </span>
                                  </div>
                                  <div className="flex gap-3 items-center">
                                    <div className="relative w-14 h-16 rounded-xl overflow-hidden bg-stone-100 shrink-0">
                                      <Image src={order.productImage || "/1.1.jpg"} alt={order.productTitle} fill className="object-cover" unoptimized />
                                    </div>
                                    <div className="flex-1 min-w-0 text-xs">
                                      <h5 className="font-bold text-stone-900 truncate">{order.productTitle}</h5>
                                      <p className="text-stone-500 text-[11px] mt-0.5">Lịch: {order.startDate} - {order.endDate}</p>
                                      <div className="flex items-center justify-between mt-1">
                                        <span className="font-black text-[#0A2517]">{order.amount?.toLocaleString("vi-VN")}đ</span>
                                        <span className="text-[10px] text-stone-400">Cọc: {order.depositAmount?.toLocaleString("vi-VN")}đ</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )
                        ) : (
                          (!closetData?.ordersAsRenter || closetData.ordersAsRenter.length === 0) ? (
                            <div className="p-6 text-center bg-white rounded-2xl border border-stone-200/80 text-stone-500 text-xs">
                              Bạn chưa có đơn thuê trang phục nào. Hãy vào mục Đi tiệc để chuẩn bị cho sự kiện sắp tới!
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {closetData.ordersAsRenter.map((order: any, idx: number) => (
                                <div key={order.id || idx} className="bg-white rounded-2xl p-3.5 border border-stone-200/80 shadow-2xs space-y-2">
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="font-mono text-stone-400">Mã đơn #{order.id?.slice(-6) || idx + 1}</span>
                                    <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full text-[10px]">
                                      Đang thuê
                                    </span>
                                  </div>
                                  <div className="flex gap-3 items-center">
                                    <div className="relative w-14 h-16 rounded-xl overflow-hidden bg-stone-100 shrink-0">
                                      <Image src={order.productImage || "/1.1.jpg"} alt={order.productTitle} fill className="object-cover" unoptimized />
                                    </div>
                                    <div className="flex-1 min-w-0 text-xs">
                                      <h5 className="font-bold text-stone-900 truncate">{order.productTitle}</h5>
                                      <p className="text-stone-500 text-[11px] mt-0.5">Thời gian: {order.startDate} - {order.endDate}</p>
                                      <p className="font-black text-[#0A2517] mt-1">{order.amount?.toLocaleString("vi-VN")}đ</p>
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
            ======================================================== */}
        <nav className="fixed bottom-0 left-0 right-0 w-full sm:max-w-[430px] mx-auto z-50 bg-white/95 backdrop-blur-md border-t border-stone-200/80 px-2 py-2 flex items-center justify-around shadow-lg pb-[calc(0.6rem+env(safe-area-inset-bottom,0px))] sm:rounded-b-[40px]">
          
          {/* TAB 1: KHÁM PHÁ (Trang chủ) */}
          <button
            onClick={() => { setActiveTab("home"); }}
            className={`flex flex-col items-center justify-center flex-1 py-0.5 select-none transition-colors cursor-pointer ${
              activeTab === "home" ? "text-[#0A2517] font-bold" : "text-stone-400 hover:text-stone-700 font-medium"
            }`}
          >
            <Compass size={20} strokeWidth={activeTab === "home" ? 2.5 : 1.8} />
            <span className="text-[10px] tracking-tight mt-0.5">Khám phá</span>
          </button>

          {/* TAB 2: SÀN ĐỒ (ICON TÚI GIỎ CHUẨN TIKTOK SHOP) */}
          <button
            onClick={() => { setActiveTab("shop"); }}
            className={`flex flex-col items-center justify-center flex-1 py-0.5 select-none transition-colors cursor-pointer ${
              activeTab === "shop" ? "text-[#0A2517] font-bold" : "text-stone-400 hover:text-stone-700 font-medium"
            }`}
          >
            <ShoppingBag size={20} strokeWidth={activeTab === "shop" ? 2.5 : 1.8} />
            <span className="text-[10px] tracking-tight mt-0.5">Sàn đồ</span>
          </button>

          {/* TAB 3: 🌟 NÚT "+ ĐĂNG ĐỒ" NỔI BẬT Ở GIỮA */}
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex flex-col items-center justify-center flex-1 py-0.5 select-none cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-full bg-[#0A2517] text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-all -mt-1.5 mb-0.5">
              <Plus size={18} strokeWidth={2.5} />
            </div>
            <span className="text-[9.5px] font-bold text-[#0A2517] tracking-tight">Đăng đồ</span>
          </button>

          {/* TAB 4: ĐƠN HÀNG (Đồng bộ /my-closet/orders & Giỏ thuê) */}
          <button
            onClick={() => setActiveTab("orders")}
            className={`flex flex-col items-center justify-center flex-1 py-0.5 select-none transition-colors cursor-pointer relative ${
              activeTab === "orders" ? "text-[#0A2517] font-bold" : "text-stone-400 hover:text-stone-700 font-medium"
            }`}
          >
            <Package size={20} strokeWidth={activeTab === "orders" ? 2.5 : 1.8} />
            {(cartItems.length > 0 || (closetData?.ordersAsRenter?.length || 0) + (closetData?.ordersAsLender?.length || 0) > 0) && (
              <span className="absolute top-0 right-3 min-w-[14px] h-[14px] px-0.5 rounded-full bg-emerald-700 text-white text-[8.5px] font-extrabold flex items-center justify-center">
                {cartItems.length + (closetData?.ordersAsRenter?.length || 0) + (closetData?.ordersAsLender?.length || 0)}
              </span>
            )}
            <span className="text-[10px] tracking-tight mt-0.5">Đơn hàng</span>
          </button>

          {/* TAB 5: TỦ ĐỒ (Đồng bộ /my-closet) */}
          <button
            onClick={() => { setActiveTab("closet"); setActiveClosetView("menu"); }}
            className={`flex flex-col items-center justify-center flex-1 py-0.5 select-none transition-colors cursor-pointer relative ${
              activeTab === "closet" ? "text-[#0A2517] font-bold" : "text-stone-400 hover:text-stone-700 font-medium"
            }`}
          >
            <User size={20} strokeWidth={activeTab === "closet" ? 2.5 : 1.8} />
            {closetData?.myProducts?.length > 0 && (
              <span className="absolute top-0 right-3 w-2 h-2 rounded-full bg-emerald-600 ring-2 ring-white" />
            )}
            <span className="text-[10px] tracking-tight mt-0.5">Tủ đồ</span>
          </button>

        </nav>

        {/* ========================================================
            💬 7.5. TRỢ LÝ AI STYLIST NỔI GỌN NHẸ (CHUẨN TIKTOK ASSISTANT)
            ======================================================== */}
        <div className="fixed bottom-20 left-0 right-0 w-full sm:max-w-[430px] mx-auto pointer-events-none z-40 flex justify-end px-3.5">
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
                        const raw = item.rentalPrice || item.price || 50000;
                        const num = typeof raw === "number" ? raw : parseInt(String(raw).replace(/\D/g, ""), 10) || 50000;
                        priceDisplay = `${num.toLocaleString("vi-VN")}đ / ngày`;
                      } else {
                        const raw = item.salePrice || item.price || 450000;
                        const num = typeof raw === "number" ? raw : parseInt(String(raw).replace(/\D/g, ""), 10) || 450000;
                        priceDisplay = `${num.toLocaleString("vi-VN")}đ`;
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
                        • Gói {selectedProduct.minDays || 3} ngày: <strong>{((selectedProduct.price || selectedProduct.rentalPrice || 0) * (selectedProduct.minDays || 3)).toLocaleString("vi-VN")}đ</strong>
                      </p>
                    )}
                  </div>

                  {selectedProduct.deposit > 0 && (
                    <div className="text-right">
                      <span className="text-[10px] text-stone-500 uppercase font-bold tracking-wider block">Tiền cọc đảm bảo</span>
                      <span className="text-sm font-mono font-bold text-stone-700">
                        {selectedProduct.deposit.toLocaleString("vi-VN")}đ
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
                            setUploadData(prev => ({
                              ...prev,
                              rentalPrice: val,
                              deposit: val ? `${(parseInt(val.replace(/\D/g, "")) || 50000) * 3}` : prev.deposit
                            }));
                          }}
                          className="w-full h-10 px-3 rounded-xl border border-emerald-300 bg-white text-xs font-bold outline-none"
                        />
                        <p className="text-[10px] text-emerald-800 font-medium mt-1">
                          • Gói 3 ngày: {uploadData.rentalPrice ? `${((parseInt(uploadData.rentalPrice.replace(/\D/g, "")) || 0) * 3).toLocaleString("vi-VN")}đ` : "0đ"}
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
                    {bookingSuccessData ? "Xác Nhận Đơn Thành Công" : (checkoutProduct.listingTypeRaw === "SELL" ? "Xác Nhận Mua Trang Phục" : "Xác Nhận Thuê Trang Phục")}
                  </h3>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    {bookingSuccessData ? "Mã đơn đã được lưu vào hệ thống" : "Bảo chứng thanh toán an toàn bởi CLOOP Escrow"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setCheckoutProduct(null);
                    setBookingSuccessData(null);
                    setBookingError(null);
                  }}
                  className="w-8 h-8 rounded-full bg-stone-200/70 hover:bg-stone-300 flex items-center justify-center text-stone-600 transition cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Nội dung bên trong Modal */}
              <div className="p-5 pt-3.5 space-y-3.5">

                {/* TH1: NẾU ĐẶT ĐƠN THÀNH CÔNG -> HIỂN THỊ MÀN HÌNH THANH TOÁN & QUÉT QR */}
                {bookingSuccessData ? (
                  <div className="space-y-4 py-1 animate-in fade-in duration-300">
                    <div className="text-center space-y-2 bg-emerald-50/80 p-4 rounded-2xl border border-emerald-200/80">
                      <div className="w-12 h-12 bg-emerald-800 text-white rounded-full flex items-center justify-center mx-auto shadow-xs">
                        <CheckCircle2 size={26} />
                      </div>
                      <h4 className="font-heading font-black text-lg text-emerald-950">
                        {bookingSuccessData.isRental ? "Đặt Lịch Thuê Thành Công!" : "Đặt Mua Thành Công!"}
                      </h4>
                      <p className="text-xs text-emerald-900">
                        Mã đơn hàng: <strong className="font-mono text-sm font-black text-[#0A2517]">#{bookingSuccessData.orderCode}</strong>
                      </p>
                      <p className="text-[11px] text-stone-600 leading-tight">
                        {bookingSuccessData.isRental 
                          ? `Lịch hẹn: Từ ${bookingSuccessData.startDate} đến ${bookingSuccessData.endDate} (${bookingSuccessData.packageDays} ngày)` 
                          : "Đơn mua đã được chuyển tới chủ tủ để đóng gói."}
                      </p>
                    </div>

                    {/* THÔNG TIN CHUYỂN KHOẢN VIETQR */}
                    <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs space-y-3 text-xs">
                      <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                        <span className="font-bold text-[#0A2517]">
                          Quét mã VietQR chuyển khoản đặt cọc
                        </span>
                        <span className="text-[10px] bg-stone-100 text-stone-700 font-bold px-2 py-0.5 rounded-full border border-stone-200">
                          {isTransferConfirmed ? "Đã báo chuyển khoản" : "Chờ đặt cọc"}
                        </span>
                      </div>

                      <div className="flex flex-col items-center justify-center py-2 bg-stone-50 rounded-xl border border-stone-100">
                        <div className="relative w-48 aspect-square rounded-lg overflow-hidden bg-white p-2 shadow-xs border border-stone-200">
                          <Image
                            src={`https://img.vietqr.io/image/MB-0335805562-compact2.png?amount=${bookingSuccessData.totalAmount}&addInfo=CLOOP%20${bookingSuccessData.orderCode}&accountName=CLOOP%20VIETNAM`}
                            alt="VietQR Chuyển Khoản"
                            fill
                            className="object-contain"
                            unoptimized
                          />
                        </div>
                        <p className="text-[10px] text-stone-500 mt-2 text-center">
                          Mở App Ngân hàng bất kỳ (MB, VCB, Techcombank, Momo...) để quét mã tự điền số tiền.
                        </p>
                      </div>

                      <div className="space-y-1.5 font-mono text-[11px] bg-stone-50 p-3 rounded-xl border border-stone-100">
                        <div className="flex justify-between">
                          <span className="text-stone-500 font-sans">Ngân hàng:</span>
                          <strong className="text-stone-900 font-sans">MB Bank (Quân Đội)</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-stone-500 font-sans">Số tài khoản:</span>
                          <strong className="text-stone-900 font-bold">0335805562</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-stone-500 font-sans">Chủ tài khoản:</span>
                          <strong className="text-stone-900 font-sans">CLOOP VIETNAM</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-stone-500 font-sans">Số tiền cọc:</span>
                          <strong className="text-emerald-900 font-black text-sm">{bookingSuccessData.totalAmount.toLocaleString("vi-VN")}đ</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-stone-500 font-sans">Nội dung chuyển:</span>
                          <strong className="text-[#0A2517] bg-stone-200/80 px-1 rounded">CLOOP {bookingSuccessData.orderCode}</strong>
                        </div>
                      </div>

                      {isTransferConfirmed ? (
                        <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-900 text-center font-bold text-xs">
                          Đã ghi nhận chuyển khoản! CLOOP sẽ xác nhận và gửi thông báo cho bạn.
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={handleConfirmTransfer}
                          className="w-full py-3 bg-[#0A2517] text-white rounded-xl font-bold text-xs hover:bg-[#15462D] transition shadow-xs cursor-pointer text-center"
                        >
                          Tôi đã chuyển khoản đặt cọc
                        </button>
                      )}
                    </div>

                    {/* Nút điều hướng */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setCheckoutProduct(null);
                          setBookingSuccessData(null);
                          setActiveTab("closet");
                          setActiveClosetView("orders");
                          setOrderSubTab("renter");
                        }}
                        className="py-2.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#0A2517] font-bold text-xs border border-emerald-200 transition cursor-pointer text-center"
                      >
                        Xem đơn của tôi
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCheckoutProduct(null);
                          setBookingSuccessData(null);
                        }}
                        className="py-2.5 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs transition cursor-pointer text-center"
                      >
                        Tiếp tục dạo tủ đồ
                      </button>
                    </div>
                  </div>
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

                    {/* 1. CHỌN THỜI GIAN THUÊ (NẾU LÀ ĐỒ THUÊ) */}
                    {checkoutProduct.listingTypeRaw !== "SELL" && (
                      <div className="p-3.5 rounded-2xl bg-white border border-stone-200/90 space-y-2.5">
                        <label className="block text-xs font-bold text-[#0A2517]">
                          Thời gian thuê trang phục
                        </label>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-[10.5px] text-stone-500 block mb-1">Ngày nhận đồ:</span>
                            <input
                              type="date"
                              required
                              min={new Date().toISOString().slice(0, 10)}
                              value={checkoutStartDate}
                              onChange={(e) => setCheckoutStartDate(e.target.value)}
                              className="w-full h-9 px-2.5 rounded-xl border border-stone-300 bg-stone-50 text-xs font-medium outline-none focus:border-[#0A2517]"
                            />
                          </div>

                          <div>
                            <span className="text-[10.5px] text-stone-500 block mb-1">Gói thuê:</span>
                            <select
                              value={checkoutDays}
                              onChange={(e) => setCheckoutDays(Number(e.target.value))}
                              className="w-full h-9 px-2 rounded-xl border border-stone-300 bg-stone-50 text-xs font-bold text-[#0A2517] outline-none"
                            >
                              <option value={3}>Gói 3 ngày (Mặc tiệc)</option>
                              <option value={5}>Gói 5 ngày (Cuối tuần)</option>
                              <option value={7}>Gói 7 ngày (Du lịch)</option>
                            </select>
                          </div>
                        </div>

                        <div className="p-2 rounded-xl bg-stone-100/80 border border-stone-200 text-[11px] text-stone-700 flex items-center justify-between">
                          <span>Lịch dự kiến:</span>
                          <strong className="font-mono font-bold text-[#0A2517]">
                            {checkoutStartDate} ➔ {checkoutEndDate} ({checkoutDays} ngày)
                          </strong>
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
                          <span className="text-[10px] text-stone-500 block mt-0.5">Shipper giao (35.000đ)</span>
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

                    {/* 3. THÔNG TIN NGƯỜI NHẬN (LÀM 1 LẦN GIỮ MÃI NHƯNG VẪN CHỦ ĐỘNG CHỈNH SỬA) */}
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
                        <>
                          <div>
                            <span className="text-[10.5px] text-stone-500 block mb-1">Địa chỉ nhận đồ cụ thể *</span>
                            <input
                              type="text"
                              required
                              placeholder="Số nhà, tên đường, phường/xã, quận/huyện..."
                              value={checkoutRenterAddress}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCheckoutRenterAddress(val);
                                try {
                                  if (typeof window !== "undefined") {
                                    const raw = localStorage.getItem("cloop_saved_renter_info");
                                    const parsed = raw ? JSON.parse(raw) : {};
                                    localStorage.setItem("cloop_saved_renter_info", JSON.stringify({ ...parsed, address: val }));
                                  }
                                } catch (_) {}
                              }}
                              className="w-full h-9 px-2.5 rounded-xl border border-stone-300 bg-white text-xs outline-none focus:border-[#0A2517]"
                            />
                          </div>

                          <div>
                            <span className="text-[10.5px] text-stone-500 block mb-1">Ghi chú địa chỉ (Điểm mốc, toà nhà, số tầng, gọi trước 15p...)</span>
                            <input
                              type="text"
                              placeholder="VD: Chung cư Sky City, toà A, tầng 8..."
                              value={checkoutRenterNote}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCheckoutRenterNote(val);
                                try {
                                  if (typeof window !== "undefined") {
                                    const raw = localStorage.getItem("cloop_saved_renter_info");
                                    const parsed = raw ? JSON.parse(raw) : {};
                                    localStorage.setItem("cloop_saved_renter_info", JSON.stringify({ ...parsed, note: val }));
                                  }
                                } catch (_) {}
                              }}
                              className="w-full h-9 px-2.5 rounded-xl border border-stone-300 bg-white text-xs outline-none focus:border-[#0A2517]"
                            />
                          </div>
                        </>
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

                    {/* 4. CHI TIẾT TÍNH TIỀN MINH BẠCH */}
                    <div className="p-3.5 rounded-2xl bg-[#F5F8F5] border border-stone-200/90 space-y-2 text-xs">
                      <div className="flex justify-between text-stone-600">
                        <span>{checkoutProduct.listingTypeRaw === "SELL" ? "Giá chuyển nhượng:" : `Phí thuê (${checkoutDays} ngày):`}</span>
                        <span className="font-bold text-stone-900">
                          {((checkoutProduct.listingTypeRaw === "SELL" ? (checkoutProduct.salePrice || checkoutProduct.price || 0) : ((checkoutProduct.rentalPrice || checkoutProduct.price || 0) * checkoutDays))).toLocaleString("vi-VN")}đ
                        </span>
                      </div>

                      {checkoutProduct.listingTypeRaw !== "SELL" && (
                        <div className="flex justify-between text-stone-600">
                          <span>Tiền cọc đảm bảo:</span>
                          <span className="font-mono font-bold text-stone-900">
                            {(checkoutProduct.deposit > 0 ? checkoutProduct.deposit : (checkoutProduct.rentalPrice || checkoutProduct.price || 0) * 3).toLocaleString("vi-VN")}đ
                          </span>
                        </div>
                      )}

                      <div className="flex justify-between text-stone-600">
                        <span>Phí giao nhận:</span>
                        <span className="font-bold text-stone-900">
                          {checkoutShippingMode === "CLOOP_BOOK" ? "35.000đ" : "Miễn phí (Tự lấy)"}
                        </span>
                      </div>

                      <div className="flex justify-between text-stone-600">
                        <span>Bảo hiểm trang phục CLOOP:</span>
                        <span className="text-emerald-800 font-bold">Miễn phí</span>
                      </div>

                      <div className="pt-2 border-t border-stone-200 flex justify-between items-baseline">
                        <div>
                          <span className="font-bold text-xs text-[#0A2517] block">Tổng thanh toán đặt cọc:</span>
                          {checkoutProduct.listingTypeRaw !== "SELL" && (
                            <span className="text-[10px] text-stone-500 italic">* Tiền cọc được hoàn trả 100% khi trả đồ</span>
                          )}
                        </div>
                        <span className="font-heading font-black text-lg text-[#0A2517]">
                          {(
                            (checkoutProduct.listingTypeRaw === "SELL" 
                              ? (checkoutProduct.salePrice || checkoutProduct.price || 0) 
                              : ((checkoutProduct.rentalPrice || checkoutProduct.price || 0) * checkoutDays + (checkoutProduct.deposit > 0 ? checkoutProduct.deposit : (checkoutProduct.rentalPrice || checkoutProduct.price || 0) * 3))
                            ) + (checkoutShippingMode === "CLOOP_BOOK" ? 35000 : 0)
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
