"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Image from "next/image";
import AiStylistChat from "@/app/components/AiStylistChat";
import { 
  Search, ShoppingBag, Compass, User, 
  MoreHorizontal, X, Heart,
  Plus, CheckCircle2, UploadCloud, Camera, RefreshCw,
  Leaf, ArrowRight, Shirt, Calendar, ShieldCheck, Check,
  ChevronRight, ArrowLeft, Wallet, Droplet, Award, Clock,
  MapPin, Edit3, Menu, HelpCircle, LogOut, Package, Crop, Truck,
  CreditCard, QrCode, Loader2, ExternalLink, Copy,
  Trash2, Eye, EyeOff, Edit, PackageX, Share2, MessageCircle,
  Mic, Layers, TrendingUp, Phone, MessageSquare, AlertCircle, Info
} from "lucide-react";
import Link from "next/link";
import Cropper from "react-easy-crop";
import VisualSearchModal from "@/app/components/VisualSearchModal";
import VoiceSearchModal from "@/app/components/VoiceSearchModal";
import DigitalProductPassport from "@/app/components/DigitalProductPassport";
import BoostListingModal from "@/app/components/BoostListingModal";
import LeafBoostHub from "@/app/components/LeafBoostHub";
import OrderDetailModal, { formatOrderStatus } from "@/app/components/OrderDetailModal";
import { useAuthModal } from "@/app/AuthModalContext";
import { getShopProductsAction, createProductAction, updateProductFromAppAction } from "@/app/actions/product";
import { toggleProductInteractionAction } from "@/app/actions/favorite";
import { getMyClosetMobileDataAction, updateClosetProfileAction, getClosetFullDataAction, saveUnifiedUserAddressAction } from "@/app/actions/closet";
import { deleteProductAction, toggleProductHideAction } from "@/app/(dashboard)/my-closet/items/actions";
import { getScrubbedReviewsAction } from "@/app/(dashboard)/my-closet/orders/actions";
import { createBooking } from "@/app/actions/booking";
import { requestWithdrawalAction, saveUserBankInfoAction } from "@/app/actions/withdrawal";
import { maskPublicAddress } from "@/src/utils/shipping";

const FALLBACK_CLOUDINARY_IMG = "https://res.cloudinary.com/dfqbxmgqi/image/upload/v1790530424/cloop_mobile_closet/pt4xccwmvrjsrnhrgnib.png";

// �️ BỘ LỌC DANH MỤC & DỊP MẶC TRANG PHỤC TUẦN HOÀN
const CLOTHING_TABS = [
  { id: "all", name: "Tất cả" },
  { id: "dam", name: "Đầm & Váy" },
  { id: "ao_dai", name: "Áo dài" },
  { id: "chan_vay", name: "Chân váy" },
  { id: "set_do", name: "Set đồ" },
  { id: "ao", name: "Áo" },
  { id: "ao_khoac", name: "Áo khoác" },
  { id: "quan", name: "Quần" },
];

const ACCESSORY_TABS = [
  { id: "all", name: "Tất cả" },
  { id: "tui_vi", name: "Túi & Ví" },
  { id: "giay_guoc", name: "Giày & Guốc" },
  { id: "trang_suc", name: "Trang sức" },
  { id: "khan_mu", name: "Khăn & Mũ" },
  { id: "kinh_cai_ao", name: "Kính & Cài áo" },
];

const OCCASIONS_TABS = CLOTHING_TABS;

function isAccessoryItem(item: any): boolean {
  const text = `${item?.category || ""} ${item?.title || ""} ${item?.occasion || ""}`.toLowerCase();
  return (
    text.includes("phụ kiện") ||
    text.includes("túi") ||
    text.includes("ví") ||
    text.includes("clutch") ||
    text.includes("giày") ||
    text.includes("guốc") ||
    text.includes("sandal") ||
    text.includes("trang sức") ||
    text.includes("dây chuyền") ||
    text.includes("vòng cổ") ||
    text.includes("khuyên tai") ||
    text.includes("bông tai") ||
    text.includes("khăn") ||
    text.includes("mũ") ||
    text.includes("nón") ||
    text.includes("kính") ||
    text.includes("cài áo") ||
    text.includes("thắt lưng")
  );
}

// � DANH SÁCH NGÂN HÀNG VIỆT NAM THÔNG DỤNG
const VIETNAM_BANKS = [
  "MB Bank (Ngân hàng Quân Đội)",
  "Vietcombank (VCB)",
  "Techcombank (TCB)",
  "ACB (Ngân hàng Á Châu)",
  "VPBank (Việt Nam Thịnh Vượng)",
  "TPBank (Tiên Phong)",
  "BIDV (Đầu tư và Phát triển)",
  "VietinBank (Công Thương)",
  "Agribank (Nông Nghiệp)",
  "Sacombank",
  "VIB (Quốc Tế)",
  "HDBank",
  "OCB (Phương Đông)",
  "MSB (Hàng Hải)",
  "SHB (Sài Gòn - Hà Nội)",
  "SeABank",
  "Cake by VPBank",
  "Timo Digital Bank",
  "Khác"
];

const CLOTHING_CATEGORIES_LIST = [
  "Đầm & Váy liền",
  "Áo dài & Cổ phục",
  "Chân váy",
  "Set đồ & Bộ trang phục",
  "Áo",
  "Quần",
  "Áo khoác & Blazer",
];

const ACCESSORY_CATEGORIES_LIST = [
  "Túi & Ví dự tiệc",
  "Giày & Guốc",
  "Trang sức",
  "Khăn & Mũ",
  "Kính & Cài áo",
  "Phụ kiện & Túi xách",
];

const CATEGORIES_LIST = [...CLOTHING_CATEGORIES_LIST, ...ACCESSORY_CATEGORIES_LIST];

const OCCASIONS_LIST = [
  "Dạo phố",
  "Thể thao",
  "Dã ngoại",
  "Du lịch",
  "Lễ hội",
  "Tiệc cưới",
  "Sự kiện",
  "Sinh nhật",
  "Tốt nghiệp",
  "Chụp ảnh",
  "Concert",
  "Đi làm & Công sở",
  "Dạ hội & Gala",
  "Mọi dịp linh hoạt"
];

const COLORS_LIST = [
  "Đen",
  "Trắng",
  "Be / Kem",
  "Nâu / Đất",
  "Xám / Ghi",
  "Đỏ / Đỏ rượu",
  "Hồng",
  "Xanh dương / Denim",
  "Xanh lá / Rêu",
  "Vàng / Cam",
  "Họa tiết / Phối màu"
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

// 🗜️ TỰ ĐỘNG NÉN VÀ TỐI ƯU ẢNH TRÊN THIẾT BỊ NGƯỜI DÙNG (GIẢM TẢI 4G & TRÁNH LỖI VERCEL 4.5MB)
async function compressImageFile(file: File, maxDimension = 1600, quality = 0.85): Promise<File> {
  if (typeof window === "undefined" || !file) return file;
  
  // Nếu file đã rất nhẹ (< 400KB) và là jpeg/webp chuẩn
  if (file.size <= 400 * 1024 && (file.type === "image/jpeg" || file.type === "image/webp")) {
    return file;
  }

  return new Promise<File>((resolve) => {
    try {
      const img = new window.Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        try {
          let { width, height } = img;
          if (!width || !height) {
            resolve(file);
            return;
          }

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(file);
            return;
          }

          // Vẽ nền trắng để tránh ảnh PNG trong suốt bị đen nền
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                resolve(file);
                return;
              }
              const cleanName = (file.name || "outfit").replace(/\.[^/.]+$/, "") + ".jpg";
              const compressedFile = new File([blob], cleanName, { type: "image/jpeg" });
              resolve(compressedFile);
            },
            "image/jpeg",
            quality
          );
        } catch (canvasErr) {
          console.warn("Canvas compression failed, using original file:", canvasErr);
          resolve(file);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(file);
      };

      img.src = objectUrl;
    } catch (e) {
      resolve(file);
    }
  });
}

const SNAPSHOT_STORAGE_KEY = "cloop_products_snapshot";
const SNAPSHOT_MAX_ITEMS = 30;
const MAX_RETRY_ATTEMPTS = 3;

interface ProductSnapshotPayload {
  products: any[];
  totalCount: number;
  savedAt: number;
}

function saveProductsSnapshot(products: any[], totalCount: number): void {
  if (typeof window === "undefined" || !Array.isArray(products) || products.length === 0) {
    return;
  }
  try {
    const payload: ProductSnapshotPayload = {
      products: products.slice(0, SNAPSHOT_MAX_ITEMS),
      totalCount,
      savedAt: Date.now(),
    };
    const serialized = JSON.stringify(payload);
    window.localStorage.setItem(SNAPSHOT_STORAGE_KEY, serialized);
    window.sessionStorage.setItem(SNAPSHOT_STORAGE_KEY, serialized);
  } catch (err) {}
}

function loadProductsSnapshot(): ProductSnapshotPayload | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw =
      window.sessionStorage.getItem(SNAPSHOT_STORAGE_KEY) ||
      window.localStorage.getItem(SNAPSHOT_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as ProductSnapshotPayload;
    if (parsed && Array.isArray(parsed.products) && parsed.products.length > 0) {
      return parsed;
    }
    return null;
  } catch (err) {
    return null;
  }
}

interface MobileAppClientProps {
  initialProducts: any[];
  initialTotalCount: number;
  initialStatus?: "SUCCESS" | "ERROR";
  initialUserData?: any;
}

export default function MobileAppClient({ 
  initialProducts = [], 
  initialTotalCount = 0,
  initialStatus = "SUCCESS",
  initialUserData 
}: MobileAppClientProps) {
  const { currentUser, setShowAuthModal, openAuthModal } = useAuthModal();
  
  // 📱 ĐIỀU HƯỚNG CHÍNH NỘI BỘ APP (5 TABS ĐÁY CHUẨN ĐỒNG BỘ WEB)
  const [activeTab, setActiveTab] = useState<"home" | "shop" | "boost" | "orders" | "closet">("home");
  const [productGroup, setProductGroup] = useState<"clothing" | "accessories">("clothing");
  const [listingMode, setListingMode] = useState<"all" | "rent" | "sell">("all");
  const [selectedOccasion, setSelectedOccasion] = useState("Tất cả");
  const [searchQuery, setSearchQuery] = useState("");
  const [likedItems, setLikedItems] = useState<Record<string, boolean>>({});
  const [isVisualSearchOpen, setIsVisualSearchOpen] = useState(false);
  const [isVoiceSearchOpen, setIsVoiceSearchOpen] = useState(false);

  // 🎨 BỘ CHUYỂN ĐỔI 7 TONE MÀU THỜI TRANG (ƯU TIÊN NHẸ NHÀNG, THANH LỊCH, THOÁNG SÁNG)
  type MobileVibeId =
    | "rose_champagne"
    | "milk_tea_oat"
    | "misty_lavender"
    | "cloud_porcelain"
    | "peach_blossom"
    | "matcha_cream"
    | "rose_noir";

  const [mobileVibe, setMobileVibe] = useState<MobileVibeId>("rose_champagne");

  useEffect(() => {
    try {
      const savedVibe = typeof window !== "undefined" ? localStorage.getItem("cloop_mobile_vibe_v2") : null;
      if (
        savedVibe === "rose_champagne" ||
        savedVibe === "milk_tea_oat" ||
        savedVibe === "misty_lavender" ||
        savedVibe === "cloud_porcelain" ||
        savedVibe === "peach_blossom" ||
        savedVibe === "matcha_cream" ||
        savedVibe === "rose_noir"
      ) {
        setMobileVibe(savedVibe);
      }
    } catch (_) {}
  }, []);

  const handleSelectVibe = (vibe: MobileVibeId, label: string) => {
    setMobileVibe(vibe);
    setLangToast(`Đã đổi tone: ${label}`);
    setTimeout(() => setLangToast(null), 2000);
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("cloop_mobile_vibe_v2", vibe);
      }
    } catch (_) {}
  };

  const vibeConfig = useMemo(() => {
    const configs = {
      rose_champagne: {
        id: "rose_champagne" as const,
        name: "Hồng Trà & Lụa Champagne",
        shortLabel: "Hồng Trà",
        desc: "Thanh lịch",
        swatch: "bg-gradient-to-tr from-[#C26475] to-[#F5E1DA]",
        outerBg: "bg-[#F6F1EE] sm:bg-[#ECE3DF]",
        appBg: "bg-[#FCF9F7] text-[#3B282A]",
        headerBg: "bg-[#FCF9F7]/92 border-[#EAD8D4]/70",
        brandText: "text-[#3B282A]",
        primaryBtn: "bg-gradient-to-r from-[#C26475] via-[#B55365] to-[#A34859] text-white shadow-[0_6px_16px_rgba(181,83,101,0.25)]",
        activePill: "bg-[#3B282A] text-[#FCF9F7] shadow-[0_4px_12px_rgba(59,40,42,0.16)]",
        pillActive: "bg-[#3B282A] text-[#FCF9F7] shadow-xs",
        inactivePill: "bg-white text-[#63484B] hover:bg-[#FBF0EE] border border-[#EAD8D4]",
        heroGrad: "from-[#FBF0EE] via-[#F6E3DF] to-[#EFE0D8]",
        heroBg: "bg-gradient-to-br from-[#FBF0EE] via-[#F6E3DF] to-[#EFE0D8]",
        heroBorder: "border-[#E8CFCB]",
        heroText: "text-[#3B282A]",
        heroSubtext: "text-[#63484B]",
        heroAccentText: "text-[#B55365]",
        heroBadge: "bg-[#B55365] text-white",
        heroSecondaryBtn: "bg-white/80 hover:bg-white text-[#3B282A] border border-[#DFC3BE]",
        heroChipBg: "bg-white/75 text-[#4E3538] border border-white/90",
        cardBorder: "border-[#F0E2DF] hover:border-[#C26475]/45",
        rentBadge: "bg-[#3B282A]/85 backdrop-blur-md text-white border border-white/20",
        buyBadge: "bg-[#B55365]/90 backdrop-blur-md text-white",
        discountBadge: "bg-[#C26475] text-white",
        priceText: "text-[#3B282A]",
        priceColor: "text-[#3B282A]",
        walletChip: "bg-[#FBF0EE] text-[#A34859] border-[#ECC8C2]",
        linkAccent: "text-[#B55365]",
        accentText: "text-[#B55365]",
        dockBg: "bg-white/95 backdrop-blur-xl text-[#3B282A] border border-[#EAD8D4] shadow-[0_12px_32px_rgba(59,40,42,0.12)]",
        dockActive: "text-[#B55365]",
        dockInactive: "text-stone-400 hover:text-[#3B282A]",
      },
      milk_tea_oat: {
        id: "milk_tea_oat" as const,
        name: "Trà Sữa Yến Mạch & Hạnh Nhân",
        shortLabel: "Trà Sữa",
        desc: "Hàn Quốc",
        swatch: "bg-gradient-to-tr from-[#9C6644] to-[#EDE0D4]",
        outerBg: "bg-[#F5F1EA] sm:bg-[#E8E1D5]",
        appBg: "bg-[#FBF9F5] text-[#3E3027]",
        headerBg: "bg-[#FBF9F5]/92 border-[#E6DCD0]/80",
        brandText: "text-[#3E3027]",
        primaryBtn: "bg-gradient-to-r from-[#A67153] via-[#935E40] to-[#7F4F34] text-white shadow-[0_6px_16px_rgba(147,94,64,0.24)]",
        activePill: "bg-[#4A372B] text-[#FBF9F5] shadow-[0_4px_12px_rgba(74,55,43,0.16)]",
        pillActive: "bg-[#4A372B] text-[#FBF9F5] shadow-xs",
        inactivePill: "bg-white text-[#665245] hover:bg-[#F5EFE6] border border-[#E6DCD0]",
        heroGrad: "from-[#F7F1E7] via-[#EFE5D6] to-[#E6D7C3]",
        heroBg: "bg-gradient-to-br from-[#F7F1E7] via-[#EFE5D6] to-[#E6D7C3]",
        heroBorder: "border-[#DFCBB5]",
        heroText: "text-[#3E3027]",
        heroSubtext: "text-[#665245]",
        heroAccentText: "text-[#935E40]",
        heroBadge: "bg-[#8A5638] text-white",
        heroSecondaryBtn: "bg-white/80 hover:bg-white text-[#3E3027] border border-[#D8C3AC]",
        heroChipBg: "bg-white/75 text-[#4A372B] border border-white/90",
        cardBorder: "border-[#ECE3D8] hover:border-[#935E40]/45",
        rentBadge: "bg-[#4A372B]/85 backdrop-blur-md text-[#FBF9F5] border border-white/20",
        buyBadge: "bg-[#935E40]/90 backdrop-blur-md text-white",
        discountBadge: "bg-[#A67153] text-white",
        priceText: "text-[#3E3027]",
        priceColor: "text-[#3E3027]",
        walletChip: "bg-[#F5EFE6] text-[#8A5638] border-[#E2D2C0]",
        linkAccent: "text-[#8A5638]",
        accentText: "text-[#8A5638]",
        dockBg: "bg-[#FFFDF9]/95 backdrop-blur-xl text-[#3E3027] border border-[#E6DCD0] shadow-[0_12px_32px_rgba(62,48,39,0.12)]",
        dockActive: "text-[#935E40]",
        dockInactive: "text-stone-400 hover:text-[#3E3027]",
      },
      misty_lavender: {
        id: "misty_lavender" as const,
        name: "Tím Sương Mai & Ngọc Trai",
        shortLabel: "Tím Sương",
        desc: "Nàng thơ",
        swatch: "bg-gradient-to-tr from-[#8062D6] to-[#E9E2FA]",
        outerBg: "bg-[#F3F1F8] sm:bg-[#E5E0F0]",
        appBg: "bg-[#FAF9FE] text-[#2E2542]",
        headerBg: "bg-[#FAF9FE]/92 border-[#E2DCF2]/80",
        brandText: "text-[#2E2542]",
        primaryBtn: "bg-gradient-to-r from-[#8B6EF6] via-[#7A5AF8] to-[#6948E0] text-white shadow-[0_6px_16px_rgba(122,90,248,0.24)]",
        activePill: "bg-[#352A4D] text-white shadow-[0_4px_12px_rgba(53,42,77,0.16)]",
        pillActive: "bg-[#352A4D] text-white shadow-xs",
        inactivePill: "bg-white text-[#564873] hover:bg-[#F3EFFC] border border-[#E2DCF2]",
        heroGrad: "from-[#F3EFFD] via-[#EAE3FA] to-[#F5E8F7]",
        heroBg: "bg-gradient-to-br from-[#F3EFFD] via-[#EAE3FA] to-[#F5E8F7]",
        heroBorder: "border-[#DAD0F2]",
        heroText: "text-[#2E2542]",
        heroSubtext: "text-[#564873]",
        heroAccentText: "text-[#7A5AF8]",
        heroBadge: "bg-[#7A5AF8] text-white",
        heroSecondaryBtn: "bg-white/80 hover:bg-white text-[#2E2542] border border-[#D4C8EE]",
        heroChipBg: "bg-white/75 text-[#352A4D] border border-white/90",
        cardBorder: "border-[#EAE5F5] hover:border-[#7A5AF8]/45",
        rentBadge: "bg-[#352A4D]/85 backdrop-blur-md text-white border border-white/20",
        buyBadge: "bg-[#7A5AF8]/90 backdrop-blur-md text-white",
        discountBadge: "bg-[#8B6EF6] text-white",
        priceText: "text-[#2E2542]",
        priceColor: "text-[#2E2542]",
        walletChip: "bg-[#F3EFFC] text-[#6948E0] border-[#DCD3F7]",
        linkAccent: "text-[#7A5AF8]",
        accentText: "text-[#7A5AF8]",
        dockBg: "bg-white/95 backdrop-blur-xl text-[#2E2542] border border-[#E2DCF2] shadow-[0_12px_32px_rgba(46,37,66,0.12)]",
        dockActive: "text-[#7A5AF8]",
        dockInactive: "text-stone-400 hover:text-[#2E2542]",
      },
      cloud_porcelain: {
        id: "cloud_porcelain" as const,
        name: "Xanh Mây Trời & Trắng Sứ",
        shortLabel: "Xanh Mây",
        desc: "Thanh khiết",
        swatch: "bg-gradient-to-tr from-[#4A81AB] to-[#E3EFF8]",
        outerBg: "bg-[#EFF4F8] sm:bg-[#DFE8F0]",
        appBg: "bg-[#F8FAFC] text-[#233647]",
        headerBg: "bg-[#F8FAFC]/92 border-[#D8E5F0]/80",
        brandText: "text-[#233647]",
        primaryBtn: "bg-gradient-to-r from-[#568FB8] via-[#457CA5] to-[#366A91] text-white shadow-[0_6px_16px_rgba(69,124,165,0.24)]",
        activePill: "bg-[#283E52] text-white shadow-[0_4px_12px_rgba(40,62,82,0.16)]",
        pillActive: "bg-[#283E52] text-white shadow-xs",
        inactivePill: "bg-white text-[#4A6378] hover:bg-[#EDF5FC] border border-[#D8E5F0]",
        heroGrad: "from-[#EDF5FC] via-[#E1EEF9] to-[#DCE8F5]",
        heroBg: "bg-gradient-to-br from-[#EDF5FC] via-[#E1EEF9] to-[#DCE8F5]",
        heroBorder: "border-[#C8DCEE]",
        heroText: "text-[#233647]",
        heroSubtext: "text-[#4A6378]",
        heroAccentText: "text-[#3E769E]",
        heroBadge: "bg-[#3E769E] text-white",
        heroSecondaryBtn: "bg-white/80 hover:bg-white text-[#233647] border border-[#C2D8EB]",
        heroChipBg: "bg-white/75 text-[#283E52] border border-white/90",
        cardBorder: "border-[#E3EDF5] hover:border-[#457CA5]/45",
        rentBadge: "bg-[#283E52]/85 backdrop-blur-md text-white border border-white/20",
        buyBadge: "bg-[#457CA5]/90 backdrop-blur-md text-white",
        discountBadge: "bg-[#568FB8] text-white",
        priceText: "text-[#233647]",
        priceColor: "text-[#233647]",
        walletChip: "bg-[#EDF5FC] text-[#366A91] border-[#CBE0F2]",
        linkAccent: "text-[#3E769E]",
        accentText: "text-[#3E769E]",
        dockBg: "bg-white/95 backdrop-blur-xl text-[#233647] border border-[#D8E5F0] shadow-[0_12px_32px_rgba(35,54,71,0.12)]",
        dockActive: "text-[#3E769E]",
        dockInactive: "text-stone-400 hover:text-[#233647]",
      },
      peach_blossom: {
        id: "peach_blossom" as const,
        name: "Hồng Đào Phấn & Kem Bơ",
        shortLabel: "Hồng Đào",
        desc: "Dịu dàng",
        swatch: "bg-gradient-to-tr from-[#E07A68] to-[#FCE8E2]",
        outerBg: "bg-[#F7EFEA] sm:bg-[#EDE1DA]",
        appBg: "bg-[#FFFDFB] text-[#402824]",
        headerBg: "bg-[#FFFDFB]/92 border-[#F2DDD6]/80",
        brandText: "text-[#402824]",
        primaryBtn: "bg-gradient-to-r from-[#E57F6E] via-[#D66B5A] to-[#C45949] text-white shadow-[0_6px_16px_rgba(214,107,90,0.24)]",
        activePill: "bg-[#452B26] text-white shadow-[0_4px_12px_rgba(69,43,38,0.16)]",
        pillActive: "bg-[#452B26] text-white shadow-xs",
        inactivePill: "bg-white text-[#6E4942] hover:bg-[#FFF2EE] border border-[#F2DDD6]",
        heroGrad: "from-[#FFF2EE] via-[#FDE5DD] to-[#F9DBD2]",
        heroBg: "bg-gradient-to-br from-[#FFF2EE] via-[#FDE5DD] to-[#F9DBD2]",
        heroBorder: "border-[#F0CEC3]",
        heroText: "text-[#402824]",
        heroSubtext: "text-[#6E4942]",
        heroAccentText: "text-[#CC5B49]",
        heroBadge: "bg-[#D66B5A] text-white",
        heroSecondaryBtn: "bg-white/80 hover:bg-white text-[#402824] border border-[#EBC5B9]",
        heroChipBg: "bg-white/75 text-[#452B26] border border-white/90",
        cardBorder: "border-[#F5E4DF] hover:border-[#D66B5A]/45",
        rentBadge: "bg-[#452B26]/85 backdrop-blur-md text-white border border-white/20",
        buyBadge: "bg-[#D66B5A]/90 backdrop-blur-md text-white",
        discountBadge: "bg-[#E57F6E] text-white",
        priceText: "text-[#402824]",
        priceColor: "text-[#402824]",
        walletChip: "bg-[#FFF2EE] text-[#C45949] border-[#F5CEC3]",
        linkAccent: "text-[#D66B5A]",
        accentText: "text-[#D66B5A]",
        dockBg: "bg-white/95 backdrop-blur-xl text-[#402824] border border-[#F2DDD6] shadow-[0_12px_32px_rgba(64,40,36,0.12)]",
        dockActive: "text-[#D66B5A]",
        dockInactive: "text-stone-400 hover:text-[#402824]",
      },
      matcha_cream: {
        id: "matcha_cream" as const,
        name: "Matcha Sữa & Kem Bơ Nhạt",
        shortLabel: "Matcha Sữa",
        desc: "Tối giản",
        swatch: "bg-gradient-to-tr from-[#6D9471] to-[#E9F2E6]",
        outerBg: "bg-[#F1F4EE] sm:bg-[#E3E8DF]",
        appBg: "bg-[#FAFBF8] text-[#2C3A2E]",
        headerBg: "bg-[#FAFBF8]/92 border-[#DCE5D8]/80",
        brandText: "text-[#2C3A2E]",
        primaryBtn: "bg-gradient-to-r from-[#739977] via-[#5F8563] to-[#4E7252] text-white shadow-[0_6px_16px_rgba(95,133,99,0.24)]",
        activePill: "bg-[#314233] text-white shadow-[0_4px_12px_rgba(49,66,51,0.16)]",
        pillActive: "bg-[#314233] text-white shadow-xs",
        inactivePill: "bg-white text-[#526654] hover:bg-[#EFF5EC] border border-[#DCE5D8]",
        heroGrad: "from-[#F1F6EE] via-[#E6EFE2] to-[#DCE8D6]",
        heroBg: "bg-gradient-to-br from-[#F1F6EE] via-[#E6EFE2] to-[#DCE8D6]",
        heroBorder: "border-[#CBE0C3]",
        heroText: "text-[#2C3A2E]",
        heroSubtext: "text-[#526654]",
        heroAccentText: "text-[#537A57]",
        heroBadge: "bg-[#5F8563] text-white",
        heroSecondaryBtn: "bg-white/80 hover:bg-white text-[#2C3A2E] border border-[#C5D9BD]",
        heroChipBg: "bg-white/75 text-[#314233] border border-white/90",
        cardBorder: "border-[#E3ECE0] hover:border-[#5F8563]/45",
        rentBadge: "bg-[#314233]/85 backdrop-blur-md text-white border border-white/20",
        buyBadge: "bg-[#5F8563]/90 backdrop-blur-md text-white",
        discountBadge: "bg-[#739977] text-white",
        priceText: "text-[#2C3A2E]",
        priceColor: "text-[#2C3A2E]",
        walletChip: "bg-[#EFF5EC] text-[#4E7252] border-[#CDE0C6]",
        linkAccent: "text-[#5F8563]",
        accentText: "text-[#5F8563]",
        dockBg: "bg-white/95 backdrop-blur-xl text-[#2C3A2E] border border-[#DCE5D8] shadow-[0_12px_32px_rgba(44,58,46,0.12)]",
        dockActive: "text-[#5F8563]",
        dockInactive: "text-stone-400 hover:text-[#2C3A2E]",
      },
      rose_noir: {
        id: "rose_noir" as const,
        name: "Đen Vogue & Hồng San Hô",
        shortLabel: "Đen Vogue",
        desc: "Cá tính",
        swatch: "bg-gradient-to-tr from-[#FF2E63] to-[#141418]",
        outerBg: "bg-[#F8F3F4] sm:bg-[#EAE2E4]",
        appBg: "bg-[#FDF9FA] text-[#141418]",
        headerBg: "bg-[#FDF9FA]/92 border-rose-200/50",
        brandText: "text-[#141418]",
        primaryBtn: "bg-gradient-to-tr from-[#FF2E63] via-[#FF4B72] to-[#FF758F] text-white shadow-[0_6px_18px_rgba(255,46,99,0.32)]",
        activePill: "bg-[#141418] text-white shadow-[0_4px_12px_rgba(20,20,24,0.2)]",
        pillActive: "bg-[#141418] text-white shadow-xs",
        inactivePill: "bg-white text-stone-700 hover:bg-rose-50/60 border border-rose-100",
        heroGrad: "from-[#141418] via-[#2A121D] to-[#4A152B]",
        heroBg: "bg-gradient-to-br from-[#141418] via-[#2A121D] to-[#4A152B]",
        heroBorder: "border-white/10",
        heroText: "text-white",
        heroSubtext: "text-white/85",
        heroAccentText: "text-[#FF758F]",
        heroBadge: "bg-[#FF2E63] text-white",
        heroSecondaryBtn: "bg-white/15 hover:bg-white/25 text-white border border-white/25",
        heroChipBg: "bg-white/10 text-white/95 border border-white/15",
        cardBorder: "border-rose-100/90 hover:border-[#FF2E63]/40",
        rentBadge: "bg-[#141418]/85 backdrop-blur-md text-white border border-white/15",
        buyBadge: "bg-[#FF2E63]/95 backdrop-blur-md text-white",
        discountBadge: "bg-gradient-to-r from-[#FF2E63] to-[#FF758F] text-white",
        priceText: "text-[#141418]",
        priceColor: "text-[#141418]",
        walletChip: "bg-[#FFF0F3] text-[#E11D48] border-[#FECDD3]",
        linkAccent: "text-[#E11D48]",
        accentText: "text-[#E11D48]",
        dockBg: "bg-[#141418]/94 text-white border border-white/10 shadow-[0_16px_40px_rgba(20,20,24,0.32)]",
        dockActive: "text-[#FF5E7E]",
        dockInactive: "text-stone-400 hover:text-white",
      },
    };
    return configs[mobileVibe];
  }, [mobileVibe]);

  // � THIẾT LẬP NGÔN NGỮ (VIE / ENG)
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

  // � DỮ LIỆU FEED SẢN PHẨM (PRELOAD SERVER)
  // 🛍️ DỮ LIỆU FEED SẢN PHẨM (KIẾN TRÚC 4 TẦNG: SSR + CACHE + SNAPSHOT + ERROR MACHINE)
  const [products, setProducts] = useState<any[]>(initialProducts || []);
  const [totalProductsCount, setTotalProductsCount] = useState(initialTotalCount || (initialProducts?.length || 0));
  const [fetchStatus, setFetchStatus] = useState<"SUCCESS" | "ERROR">(initialStatus || "SUCCESS");
  const [isSyncing, setIsSyncing] = useState<boolean>(initialStatus === "ERROR");
  const [usingSnapshot, setUsingSnapshot] = useState<boolean>(false);
  const retryCountRef = useRef<number>(0);
  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Tầng 3: Xử lý Snapshot ngay khi khởi tạo hoặc khi nhận dữ liệu từ SSR
  useEffect(() => {
    if (initialStatus === "SUCCESS") {
      setProducts(initialProducts);
      setTotalProductsCount(initialTotalCount);
      setFetchStatus("SUCCESS");
      setIsSyncing(false);
      setUsingSnapshot(false);

      if (initialProducts.length > 0) {
        saveProductsSnapshot(initialProducts, initialTotalCount);
      }
      return;
    }

    // Nếu ban đầu server bị ERROR -> Khôi phục tức thì từ Snapshot (0ms) để không bị màn hình trắng/trống
    if (initialStatus === "ERROR") {
      const snapshot = loadProductsSnapshot();
      if (snapshot && snapshot.products.length > 0) {
        setProducts(snapshot.products);
        setTotalProductsCount(snapshot.totalCount);
        setUsingSnapshot(true);
      }
    }
  }, [initialProducts, initialTotalCount, initialStatus]);

  // Tầng 4: Cơ chế Retry có kiểm soát. CHỈ kích hoạt khi fetchStatus === 'ERROR'. Không bao giờ chạy nếu status === 'SUCCESS'.
  const recoverFromError = useCallback(async () => {
    if (!isMountedRef.current) return;
    setIsSyncing(true);

    while (retryCountRef.current < MAX_RETRY_ATTEMPTS && isMountedRef.current) {
      try {
        const res = await getShopProductsAction({ type: "all", page: 1, limit: 30 });
        if (!isMountedRef.current) return;

        if (res.status === "SUCCESS" || res.success) {
          const prods = Array.isArray(res.products) ? res.products : [];
          setProducts(prods);
          setTotalProductsCount(typeof res.totalCount === "number" ? res.totalCount : prods.length);
          setFetchStatus("SUCCESS");
          setIsSyncing(false);
          setUsingSnapshot(false);

          if (prods.length > 0) {
            saveProductsSnapshot(prods, res.totalCount || prods.length);
          }
          // Dù prods.length === 0 (Rỗng thật sự) cũng dừng vòng lặp, KHÔNG retry tiếp! Chống bão Retry Storm!
          return;
        }
      } catch (err) {
        console.error(`[CLOOP Client Recovery] Attempt ${retryCountRef.current + 1} error:`, err);
      }

      retryCountRef.current += 1;
      if (retryCountRef.current < MAX_RETRY_ATTEMPTS && isMountedRef.current) {
        const delay = 1000 * Math.pow(2, retryCountRef.current - 1);
        await new Promise((r) => setTimeout(r, delay));
      }
    }

    if (isMountedRef.current) {
      setFetchStatus("ERROR");
      setIsSyncing(false);
    }
  }, []);

  // Chỉ kích hoạt tự động đồng bộ khi initialStatus === 'ERROR'
  useEffect(() => {
    if (initialStatus === "ERROR") {
      retryCountRef.current = 0;
      recoverFromError();
    }
  }, [initialStatus, recoverFromError]);

  // 👤 DỮ LIỆU TỦ ĐỒ CÁ NHÂN & THEO DÕI HỒ SƠ
  const [closetData, setClosetData] = useState<any>(initialUserData || null);
  const [activeClosetView, setActiveClosetView] = useState<"menu" | "items" | "orders" | "wallet" | "eco" | "profile">("menu");
  const [orderSubTab, setOrderSubTab] = useState<"renter" | "lender" | "cart">("renter");
  const [isRefreshingCloset, setIsRefreshingCloset] = useState(false);
  const [isDrawerMenuOpen, setIsDrawerMenuOpen] = useState(false);
  const [isBlogModalOpen, setIsBlogModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  // Lời nhắc chỉ dẫn thân thiện cho người dùng khi vào tab "Tôi"
  const [showWelcomeTip, setShowWelcomeTip] = useState(true);

  useEffect(() => {
    try {
      if (typeof window !== "undefined" && localStorage.getItem("cloop_app_me_tip_v2_closed") === "true") {
        setShowWelcomeTip(false);
      }
    } catch (_) {}
  }, []);

  const handleCloseWelcomeTip = () => {
    setShowWelcomeTip(false);
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("cloop_app_me_tip_v2_closed", "true");
      }
    } catch (_) {}
  };

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

  // 🛍️ MODAL / VIEW TỦ ĐỒ CHỦ TỦ IN-APP (video / nền tảng CREATOR SHOP)
  const [viewingClosetOwner, setViewingClosetOwner] = useState<{
    id: string;
    name: string;
    avatar?: string | null;
    rating?: number | string;
    reviewCount?: number;
    completedOrders?: number;
    location?: string;
    bio?: string;
    quote?: string;
  } | null>(null);
  const [closetOwnerProducts, setClosetOwnerProducts] = useState<any[]>([]);
  const [closetOwnerFilter, setClosetOwnerFilter] = useState<"all" | "rent" | "sell" | "reviews">("all");
  const [isLoadingClosetOwner, setIsLoadingClosetOwner] = useState(false);
  const [followedClosets, setFollowedClosets] = useState<Record<string, boolean>>({});
  const [closetToastMessage, setClosetToastMessage] = useState<string | null>(null);

  // 🛍️ QUẢN LÝ KỆ ĐỒ CỦA BẠN (ĐỒNG BỘ 100% VỚI BẢN WEB: XÓA BÀI, ẨN/HIỆN, TABS LỌC)
  const [myItemsFilterTab, setMyItemsFilterTab] = useState<"ALL" | "RENTING" | "SELLING" | "HIDDEN">("ALL");
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [togglingProductId, setTogglingProductId] = useState<string | null>(null);

  //  ĐÁNH GIÁ THỰC TẾ & SAO TRUNG BÌNH DATABASE (REVIEWS THẬT)
  const [productReviews, setProductReviews] = useState<any[]>([]);
  const [isLoadingProductReviews, setIsLoadingProductReviews] = useState(false);
  const [ownerReviews, setOwnerReviews] = useState<any[]>([]);
  const [isLoadingOwnerReviews, setIsLoadingOwnerReviews] = useState(false);

  const showClosetToast = (msg: string) => {
    setClosetToastMessage(msg);
    setTimeout(() => setClosetToastMessage(null), 2500);
  };

  // 📝 MODAL "ĐĂNG BÀI CHIA SẺ TỦ ĐỒ" ĐỒNG BỘ ĐẦY ĐỦ VỚI BẢN WEB
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadData, setUploadData] = useState({
    title: "",
    category: "Áo",
    occasion: "Dạo phố",
    color: "Trắng",
    size: "M",
    condition: "99",
    targetHeight: "",
    targetWeight: "",
    bust: "",
    waist: "",
    hips: "",
    material: "Lụa tơ tằm cao cấp",
    province: "Hà Nội",
    district: "Quận Hoàn Kiếm",
    ward: "Phường Hàng Đào",
    address: "",
    note: "",
    ownerPhone: "",
    saveLocationAsDefault: true,
    isRental: true,
    rentalPrice: "80.000",
    price1Day: "80.000",
    price3Days: "200.000",
    price7Days: "400.000",
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

  // � LIÊN KẾT NGÂN HÀNG & RÚT TIỀN ĐỒNG BỘ BẢN WEB
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);

  // ⚡ ĐẨY BÀI LÊN TOP (BOOST MODAL)
  const [isBoostModalOpen, setIsBoostModalOpen] = useState(false);
  const [boostTargetProductId, setBoostTargetProductId] = useState<string | undefined>(undefined);

  // 📦 CHI TIẾT ĐƠN HÀNG (ORDER DETAIL MODAL)
  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState<any | null>(null);
  const [orderDetailRole, setOrderDetailRole] = useState<"renter" | "lender">("renter");

  const handleBoostSuccess = (productId: string, newExpiresAt: string, newCoins?: number, addedCoins?: number) => {
    setClosetData((prev: any) => {
      if (!prev) return prev;
      const updatedProducts = (prev.myProducts || []).map((p: any) => {
        if (p.id === productId) {
          return {
            ...p,
            boostExpiresAt: newExpiresAt,
            isBoostActive: true,
            boostScore: (Number(p.boostScore) || 0) + (addedCoins || 0)
          };
        }
        return p;
      });
      return {
        ...prev,
        myProducts: updatedProducts,
        user: {
          ...prev.user,
          cloopCoins: newCoins !== undefined ? newCoins : prev.user?.cloopCoins
        }
      };
    });

    // ⚡ Đồng bộ ngay lập tức vào danh sách hiển thị trên Sàn Khám Phá để đua Top
    setProducts((prev: any) => {
      return (prev || []).map((p: any) => {
        if (p.id === productId) {
          return {
            ...p,
            boostExpiresAt: newExpiresAt,
            isBoosted: true,
            boostScore: (Number(p.boostScore) || 0) + (addedCoins || 0)
          };
        }
        return p;
      });
    });
  };
  const [bankForm, setBankForm] = useState({
    bankName: "",
    bankAccount: "",
    bankOwner: "",
  });
  const [customBankName, setCustomBankName] = useState("");
  const [isSavingBank, setIsSavingBank] = useState(false);
  const [bankSaveSuccess, setBankSaveSuccess] = useState(false);
  const [bankError, setBankError] = useState("");

  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawPassword, setWithdrawPassword] = useState("");
  const [isSubmittingWithdraw, setIsSubmittingWithdraw] = useState(false);
  const [withdrawSuccessMsg, setWithdrawSuccessMsg] = useState("");
  const [withdrawErrorMsg, setWithdrawErrorMsg] = useState("");

  // 📍 ĐỊA CHỈ ĐỒNG NHẤT DUY NHẤT (CHUẨN GHN) TOÀN APP
  const [unifiedAddress, setUnifiedAddress] = useState<{
    provinceId: number | "";
    districtId: number | "";
    wardCode: string;
    province: string;
    district: string;
    ward: string;
    specificAddress: string;
    addressNote: string;
    fullAddress: string;
    phone?: string;
    recipientName?: string;
  }>({
    provinceId: "",
    districtId: "",
    wardCode: "",
    province: "",
    district: "",
    ward: "",
    specificAddress: "",
    addressNote: "",
    fullAddress: "",
    phone: "",
    recipientName: "",
  });

  // 🔄 Hàm đồng bộ hai chiều địa chỉ chuẩn GHN: Checkout <-> Hồ Sơ Tủ Đồ <-> Trạm Đăng Đồ Mới
  const syncUnifiedAddress = (
    newAddr: Partial<{
      provinceId: number | "";
      districtId: number | "";
      wardCode: string;
      province: string;
      district: string;
      ward: string;
      specificAddress: string;
      addressNote: string;
      fullAddress: string;
      phone: string;
      recipientName: string;
    }>,
    syncToBackend: boolean = false
  ) => {
    setUnifiedAddress(prev => {
      const merged = { ...prev, ...newAddr };

      const parts = [
        merged.specificAddress?.trim(),
        merged.ward?.trim(),
        merged.district?.trim(),
        merged.province?.trim()
      ].filter(Boolean);
      
      let full = merged.fullAddress;
      if (parts.length > 0) {
        full = parts.join(", ") + (merged.addressNote?.trim() ? ` (Ghi chú: ${merged.addressNote.trim()})` : "");
        merged.fullAddress = full;
      }

      // 1. Đồng bộ sang Form Hồ sơ Tủ đồ
      if (merged.provinceId !== undefined) setSelectedGhnProvinceId(merged.provinceId);
      if (merged.districtId !== undefined) setSelectedGhnDistrictId(merged.districtId);
      if (merged.wardCode !== undefined) setSelectedGhnWardCode(merged.wardCode);
      if (merged.specificAddress !== undefined) setSpecificAddressDetail(merged.specificAddress);
      if (merged.addressNote !== undefined) setAddressNote(merged.addressNote);
      setProfileForm(p => ({
        ...p,
        pickupAddress: full || p.pickupAddress,
        ...(merged.phone ? { phone: merged.phone } : {}),
        ...(merged.recipientName ? { name: merged.recipientName } : {})
      }));

      // 2. Đồng bộ sang Form Checkout mua / thuê
      if (merged.provinceId !== undefined) setCheckoutProvinceId(merged.provinceId);
      if (merged.districtId !== undefined) setCheckoutDistrictId(merged.districtId);
      if (merged.wardCode !== undefined) setCheckoutWardCode(merged.wardCode);
      if (merged.specificAddress !== undefined) setCheckoutAddressDetail(merged.specificAddress);
      if (merged.addressNote !== undefined) setCheckoutRenterNote(merged.addressNote);
      if (merged.phone) setCheckoutRenterPhone(merged.phone);
      if (merged.recipientName) setCheckoutRenterName(merged.recipientName);

      // 3. Đồng bộ sang Form Đăng đồ mới (Upload Data)
      setUploadData(u => ({
        ...u,
        province: merged.province || u.province,
        district: merged.district || u.district,
        ward: merged.ward || u.ward,
        address: merged.specificAddress || u.address,
        note: merged.addressNote || u.note,
        ...(merged.phone ? { ownerPhone: merged.phone } : {})
      }));

      // 4. Lưu vào Database (auth.users metadata) nếu người dùng đã đăng nhập (Tuyệt đối không lưu PII vào LocalStorage)
      if (syncToBackend && (currentUser?.id || closetData?.user?.id)) {
        saveUnifiedUserAddressAction({
          userId: currentUser?.id || closetData?.user?.id,
          name: merged.recipientName,
          phone: merged.phone,
          provinceId: merged.provinceId,
          districtId: merged.districtId,
          wardCode: merged.wardCode,
          province: merged.province,
          district: merged.district,
          ward: merged.ward,
          specificAddress: merged.specificAddress,
          addressNote: merged.addressNote,
          fullAddress: full
        }).catch(err => console.error("Lỗi lưu đồng bộ địa chỉ GHN:", err));
      }

      return merged;
    });
  };

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

    const full = parts.length > 0
      ? (parts.join(", ") + (effectiveNote.trim() ? ` (Ghi chú: ${effectiveNote.trim()})` : ""))
      : "";

    syncUnifiedAddress({
      provinceId,
      districtId,
      wardCode,
      province: prov?.ProvinceName || "",
      district: dist?.DistrictName || "",
      ward: ward?.WardName || "",
      specificAddress: detail.trim(),
      addressNote: effectiveNote.trim(),
      fullAddress: full,
    }, false);
  };

  // 🔄 CẬP NHẬT FORM KHI CÓ USER DATA & TỰ ĐỘNG NẠP ĐỊA CHỈ ĐỒNG NHẤT
  useEffect(() => {
    let initialAddr: any = null;

    // 1. Lấy địa chỉ chuẩn GHN từ Supabase Database (Đã xác thực từ Server)
    if (closetData?.user?.province || closetData?.user?.provinceId) {
      initialAddr = {
        provinceId: closetData.user.provinceId || "",
        districtId: closetData.user.districtId || "",
        wardCode: closetData.user.wardCode || "",
        province: closetData.user.province || "",
        district: closetData.user.district || "",
        ward: closetData.user.ward || "",
        specificAddress: closetData.user.specificAddress || "",
        addressNote: closetData.user.addressNote || "",
        fullAddress: closetData.user.fullAddress || closetData.user.pickupAddress || "",
        phone: closetData.user.phone || "",
        recipientName: closetData.user.name || "",
      };
    }

    // Dọn dẹp các khóa PII nhạy cảm lưu trên LocalStorage cũ (Tuân thủ Luật Thép Bảo Mật)
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("cloop_saved_bank_info");
        localStorage.removeItem("cloop_unified_ghn_address");
        localStorage.removeItem("cloop_saved_renter_info");
        localStorage.removeItem("cloop_saved_pickup_location");
        localStorage.removeItem("cloop_saved_shipping_address");
        localStorage.removeItem("cloop_shipping_address_history");
        localStorage.removeItem("cloop_auth_user");
      }
    } catch (_) {}

    if (closetData?.user) {
      const userAddr = initialAddr?.fullAddress || closetData.user.pickupAddress || closetData.user.location || "";
      setProfileForm({
        name: closetData.user.name || "",
        phone: initialAddr?.phone || closetData.user.phone || "",
        pickupAddress: userAddr,
        bio: closetData.user.bio || "",
        quote: closetData.user.quote || "",
      });

      // � Đồng bộ tài khoản ngân hàng từ Database
      if (closetData.user.bankAccount || closetData.user.bankName) {
        setBankForm({
          bankName: closetData.user.bankName || "",
          bankAccount: closetData.user.bankAccount || "",
          bankOwner: closetData.user.bankOwner || closetData.user.name || "",
        });
      }
    }

    if (initialAddr) {
      syncUnifiedAddress(initialAddr, false);

      // Pre-fetch huyện & xã để khi mở modal không bị rỗng
      if (initialAddr.provinceId) {
        fetch(`/api/shipping/address?type=district&province_id=${initialAddr.provinceId}`)
          .then(res => res.json())
          .then(data => {
            if (data?.data && Array.isArray(data.data)) {
              setGhnDistricts(data.data);
              setCheckoutDistricts(data.data);
            }
          })
          .catch(() => {});
      }
      if (initialAddr.districtId) {
        fetch(`/api/shipping/address?type=ward&district_id=${initialAddr.districtId}`)
          .then(res => res.json())
          .then(data => {
            if (data?.data && Array.isArray(data.data)) {
              setGhnWards(data.data);
              setCheckoutWards(data.data);
            }
          })
          .catch(() => {});
      }
    }
  }, [closetData]);

  // 🔄 NẠP LẠI DỮ LIỆU TỦ ĐỒ CÁ NHÂN KHI CHUYỂN VÀO TAB CLOSET
  const refreshPersonalData = async () => {
    setIsRefreshingCloset(true);
    try {
      const res = await getMyClosetMobileDataAction(currentUser?.id);
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

  // 🛍️ TỰ ĐỘNG NẠP DANH MỤC TRANG PHỤC & THÔNG TIN CHỦ TỦ KHI MỞ TỦ ĐỒ (video/nền tảng STYLE)
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
              reviewCount: res.ownerInfo.reviewCount ?? prev.reviewCount ?? 0,
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
                reviewCount: res.ownerInfo.reviewCount || 0,
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

  //  FETCH ĐÁNH GIÁ THỰC TẾ CHO SẢN PHẨM ĐANG XEM
  useEffect(() => {
    if (!selectedProduct?.userId || selectedProduct.userId === "official" || selectedProduct.userId === "anonymous") {
      setProductReviews([]);
      return;
    }
    let isCancelled = false;
    setIsLoadingProductReviews(true);
    getScrubbedReviewsAction(selectedProduct.userId)
      .then((res) => {
        if (!isCancelled && res.success && res.reviews) {
          setProductReviews(res.reviews);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!isCancelled) setIsLoadingProductReviews(false);
      });
    return () => {
      isCancelled = true;
    };
  }, [selectedProduct?.userId]);

  //  FETCH ĐÁNH GIÁ THỰC TẾ CHO TỦ ĐỒ ĐANG XEM
  useEffect(() => {
    if (!viewingClosetOwner?.id || viewingClosetOwner.id === "official") {
      setOwnerReviews([]);
      return;
    }
    let isCancelled = false;
    setIsLoadingOwnerReviews(true);
    getScrubbedReviewsAction(viewingClosetOwner.id)
      .then((res) => {
        if (!isCancelled && res.success && res.reviews) {
          setOwnerReviews(res.reviews);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!isCancelled) setIsLoadingOwnerReviews(false);
      });
    return () => {
      isCancelled = true;
    };
  }, [viewingClosetOwner?.id]);

  // 🗑️ XÓA BÀI ĐĂNG TRÊN MOBILE (ĐỒNG BỘ 100% VỚI BẢN WEB)
  const handleDeleteProduct = async (productId: string, title: string) => {
    const isConfirmed = window.confirm(`Bạn có chắc chắn muốn xóa "${title}" khỏi tủ đồ của bạn không?`);
    if (!isConfirmed) return;

    setDeletingProductId(productId);
    try {
      const res = await deleteProductAction(productId, currentUser?.id);
      if (!res.success) {
        showClosetToast("Lỗi khi xóa: " + (res.error || "Thao tác không thành công"));
        return;
      }
      setClosetData((prev: any) => {
        if (!prev) return prev;
        const nextProducts = (prev.myProducts || []).filter((p: any) => p.id !== productId);
        return {
          ...prev,
          myProducts: nextProducts,
          stats: {
            ...prev.stats,
            totalItems: Math.max(0, (prev.stats?.totalItems || 1) - 1)
          }
        };
      });
      setProducts((prev: any) => prev.filter((p: any) => p.id !== productId));
      showClosetToast("Đã xóa món đồ khỏi tủ đồ thành công!");
    } catch (err: any) {
      showClosetToast("Lỗi khi xóa món đồ: " + (err.message || err));
    } finally {
      setDeletingProductId(null);
    }
  };

  // 👁️ ẨN / HIỆN MÓN ĐỒ TRÊN SÀN (ĐỒNG BỘ 100% VỚI BẢN WEB)
  const handleToggleHideProduct = async (productId: string, currentIsHidden: boolean) => {
    setTogglingProductId(productId);
    try {
      const res = await toggleProductHideAction(productId, currentIsHidden, currentUser?.id);
      if (!res.success) {
        showClosetToast("Lỗi: " + (res.error || "Không thể đổi trạng thái"));
        return;
      }
      const newHidden = res.isHidden !== undefined ? res.isHidden : !currentIsHidden;
      setClosetData((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          myProducts: (prev.myProducts || []).map((p: any) =>
            p.id === productId ? { ...p, isShopHidden: newHidden } : p
          )
        };
      });
      showClosetToast(newHidden ? "Đã ẩn món đồ khỏi Sàn." : "Đã hiển thị món đồ lên Sàn.");
    } catch (err: any) {
      showClosetToast("Lỗi: " + (err.message || err));
    } finally {
      setTogglingProductId(null);
    }
  };

  // 🗂️ LỌC MÓN ĐỒ TỦ ĐỒ CỦA TÔI
  const filteredMyProducts = useMemo(() => {
    return safeMyProducts.filter((item: any) => {
      if (myItemsFilterTab === "ALL") return true;
      if (myItemsFilterTab === "RENTING") return (item.rentalPrice > 0 || item.isRentalActive) && !item.isShopHidden;
      if (myItemsFilterTab === "SELLING") return (item.salePrice > 0 || item.isSaleActive) && !item.isShopHidden;
      if (myItemsFilterTab === "HIDDEN") return Boolean(item.isShopHidden);
      return true;
    });
  }, [safeMyProducts, myItemsFilterTab]);

  // Lọc sản phẩm của chủ tủ theo phân loại Thuê / Bán chính xác
  const filteredClosetOwnerProducts = useMemo(() => {
    return closetOwnerProducts.filter((p: any) => {
      const rPrice = typeof p.rentalPrice === "number" ? p.rentalPrice : parseInt(String(p.rentalPrice || 0).replace(/\D/g, ""), 10) || 0;
      const sPrice = typeof p.salePrice === "number" ? p.salePrice : parseInt(String(p.salePrice || 0).replace(/\D/g, ""), 10) || 0;
      
      const hasRent = rPrice > 0 || p.listingTypeRaw === "RENT" || p.type === "Thuê";
      const hasSell = sPrice > 0 || p.listingTypeRaw === "SELL" || p.type === "Mua sắm";

      if (closetOwnerFilter === "rent") return hasRent;
      if (closetOwnerFilter === "sell") return hasSell;
      return true;
    });
  }, [closetOwnerProducts, closetOwnerFilter]);

  // 🔍 TRẠNG THÁI BỘ LỌC ĐA CHIỀU XÂU CHUỖI THÔNG MINH (SIZE + GIÁ + SẮP XẾP + YÊU THÍCH)
  const [selectedSizeFilter, setSelectedSizeFilter] = useState<string>("ALL");
  const [selectedPriceFilter, setSelectedPriceFilter] = useState<"ALL" | "UNDER_100K" | "100K_200K" | "OVER_200K">("ALL");
  const [selectedSortBy, setSelectedSortBy] = useState<"RECOMMENDED" | "PRICE_ASC" | "PRICE_DESC">("RECOMMENDED");
  const [onlyLikedFilter, setOnlyLikedFilter] = useState<boolean>(false);
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
  const [isTonePickerOpen, setIsTonePickerOpen] = useState<boolean>(false);

  // Bộ đếm số lượng theo từng chế độ để hiển thị trực tiếp trên thanh điều khiển
  const modeCounts = useMemo(() => {
    let rentCount = 0;
    let sellCount = 0;
    for (const p of products) {
      const rentP = Number(p.rentalPrice) || 0;
      const sellP = Number(p.salePrice) || 0;
      const isRentType = p.listingTypeRaw === "RENT" || (p.type && p.type.toLowerCase().includes("thuê"));
      const isSellOnly = p.listingTypeRaw === "SELL" && rentP === 0;
      if ((rentP > 0 || isRentType) && !isSellOnly) rentCount++;
      const isSellType = p.listingTypeRaw === "SELL" || (p.type && (p.type.toLowerCase().includes("mua") || p.type.toLowerCase().includes("sở hữu")));
      if (sellP > 0 || isSellType) sellCount++;
    }
    const likedCount = Object.values(likedItems).filter(Boolean).length;
    return { all: products.length, rent: rentCount, sell: sellCount, liked: likedCount };
  }, [products, likedItems]);

  // 🔍 LỌC THÔNG MINH SẢN PHẨM TRỰC TIẾP (PHÂN LUỒNG QUẦN ÁO RIÊNG / PHỤ KIỆN RIÊNG)
  const filteredProducts = useMemo(() => {
    // 0. Tách luồng Quần áo riêng vs Phụ kiện riêng
    let list = products.filter((p: any) =>
      productGroup === "accessories" ? isAccessoryItem(p) : !isAccessoryItem(p)
    );

    // 1. Lọc theo chế độ Thuê đồ / Mua thanh lý
    if (listingMode === "rent") {
      list = list.filter((p: any) => {
        const rentP = Number(p.rentalPrice) || 0;
        const isRentType = p.listingTypeRaw === "RENT" || (p.type && p.type.toLowerCase().includes("thuê"));
        const isSellOnly = p.listingTypeRaw === "SELL" && rentP === 0;
        return (rentP > 0 || isRentType) && !isSellOnly;
      });
    } else if (listingMode === "sell") {
      list = list.filter((p: any) => {
        const sellP = Number(p.salePrice) || 0;
        const isSellType = p.listingTypeRaw === "SELL" || (p.type && (p.type.toLowerCase().includes("mua") || p.type.toLowerCase().includes("sở hữu")));
        return sellP > 0 || isSellType;
      });
    }

    // 2. Lọc theo món đã thả tim yêu thích
    if (onlyLikedFilter) {
      list = list.filter((p: any) => Boolean(likedItems[p.id]));
    }

    // 3. Lọc theo Danh mục con của Quần áo hoặc Phụ kiện
    if (selectedOccasion !== "Tất cả") {
      list = list.filter((p: any) => {
        const text = `${p.title || ""} ${p.category || ""} ${p.occasion || ""}`.toLowerCase();
        const target = selectedOccasion.toLowerCase();
        if (target === "đầm & váy") return text.includes("đầm") || text.includes("váy liền") || text.includes("váy");
        if (target === "túi & ví") return text.includes("túi") || text.includes("ví") || text.includes("clutch");
        if (target === "giày & guốc") return text.includes("giày") || text.includes("guốc") || text.includes("sandal");
        if (target === "trang sức") return text.includes("trang sức") || text.includes("dây chuyền") || text.includes("vòng") || text.includes("khuyên") || text.includes("bông tai");
        if (target === "khăn & mũ") return text.includes("khăn") || text.includes("mũ") || text.includes("nón");
        if (target === "kính & cài áo") return text.includes("kính") || text.includes("cài áo") || text.includes("thắt lưng");
        return text.includes(target);
      });
    }

    // 4. Lọc theo Kích cỡ (Size)
    if (selectedSizeFilter !== "ALL") {
      list = list.filter((p: any) => {
        const sz = String(p.size || "M").toUpperCase().trim();
        return sz === selectedSizeFilter;
      });
    }

    // 5. Lọc theo Khoảng giá
    if (selectedPriceFilter !== "ALL") {
      list = list.filter((p: any) => {
        const isRent = p.listingTypeRaw !== "SELL";
        const effectivePrice = isRent ? (Number(p.rentalPrice || p.price) || 0) : (Number(p.salePrice || p.price) || 0);
        if (selectedPriceFilter === "UNDER_100K") return effectivePrice <= 100000;
        if (selectedPriceFilter === "100K_200K") return effectivePrice > 100000 && effectivePrice <= 200000;
        if (selectedPriceFilter === "OVER_200K") return effectivePrice > 200000;
        return true;
      });
    }

    // 6. Lọc theo từ khóa tìm kiếm
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((p: any) => {
        const occ = (p.occasion || "").toLowerCase();
        const title = (p.title || "").toLowerCase();
        const desc = (p.description || "").toLowerCase();
        const owner = (p.ownerName || "").toLowerCase();
        return title.includes(q) || occ.includes(q) || desc.includes(q) || owner.includes(q);
      });
    }

    // 7. Sắp xếp thông minh (Ưu tiên tôn vinh Đầm, Váy, Áo dài, Chân váy lên đầu trang khi ở chế độ Đề xuất)
    const getFashionPriority = (item: any): number => {
      const text = `${item.title || ""} ${item.category || ""} ${item.occasion || ""}`.toLowerCase();
      if (text.includes("đầm") || text.includes("váy liền") || text.includes("dạ hội") || text.includes("áo dài")) return 3;
      if (text.includes("váy") || text.includes("chân váy") || text.includes("set") || text.includes("tiệc")) return 2;
      if (text.includes("bomber") || text.includes("khoác")) return 0;
      return 1;
    };

    return [...list].sort((a: any, b: any) => {
      if (selectedSortBy === "PRICE_ASC" || selectedSortBy === "PRICE_DESC") {
        const priceA = a.listingTypeRaw !== "SELL" ? (Number(a.rentalPrice || a.price) || 0) : (Number(a.salePrice || a.price) || 0);
        const priceB = b.listingTypeRaw !== "SELL" ? (Number(b.rentalPrice || b.price) || 0) : (Number(b.salePrice || b.price) || 0);
        return selectedSortBy === "PRICE_ASC" ? priceA - priceB : priceB - priceA;
      }

      const aActive = Boolean(a.boostExpiresAt && new Date(a.boostExpiresAt) > new Date());
      const bActive = Boolean(b.boostExpiresAt && new Date(b.boostExpiresAt) > new Date());
      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;
      if (aActive && bActive) {
        const aScore = Number(a.boostScore) || 0;
        const bScore = Number(b.boostScore) || 0;
        if (bScore !== aScore) return bScore - aScore;
        return new Date(b.boostExpiresAt).getTime() - new Date(a.boostExpiresAt).getTime();
      }

      const prioDiff = getFashionPriority(b) - getFashionPriority(a);
      if (prioDiff !== 0) return prioDiff;
      return 0;
    });
  }, [products, productGroup, listingMode, onlyLikedFilter, likedItems, selectedOccasion, selectedSizeFilter, selectedPriceFilter, searchQuery, selectedSortBy]);

  // Ảnh đại diện chuẩn Váy Đầm / Áo dài cho 3 Thẻ Lookbook đầu trang
  const showcaseImages = useMemo(() => {
    const dressList = products.filter((p: any) => {
      const t = `${p.title || ""} ${p.category || ""}`.toLowerCase();
      return t.includes("váy") || t.includes("đầm") || t.includes("áo dài");
    });
    return {
      rentDress: dressList[0]?.image || "/evening_dress.jpg",
      saleDress: dressList[1]?.image || products[1]?.image || "/evening_dress.jpg",
      lensLookbook: dressList[2]?.image || "/evening_dress.jpg",
    };
  }, [products]);

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

  // �️ HÀM TÍNH PHÍ GÓI THUÊ ĐỒNG BỘ 100% VỚI WEB VÀ PRISMA DATABASE
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

    // 💾 Lấy thông tin liên hệ & địa chỉ GHN đã lưu từ trạng thái đồng bộ của Server/Tài khoản
    const provId = unifiedAddress.provinceId || closetData?.user?.provinceId || "";
    const distId = unifiedAddress.districtId || closetData?.user?.districtId || "";
    const wdCode = unifiedAddress.wardCode || closetData?.user?.wardCode || "";
    const addr = unifiedAddress.specificAddress || closetData?.user?.specificAddress || closetData?.user?.address || "";
    const note = unifiedAddress.addressNote || closetData?.user?.addressNote || "";
    const phone = unifiedAddress.phone || closetData?.user?.phone || "";
    const name = unifiedAddress.recipientName || currentUser?.name || closetData?.user?.name || "";

    setCheckoutRenterName(name);
    setCheckoutRenterPhone(phone);
    setCheckoutRenterNote(note);

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
    const prov = ghnProvinces.find(p => p.ProvinceID === provId);
    syncUnifiedAddress({
      provinceId: provId,
      districtId: "",
      wardCode: "",
      province: prov?.ProvinceName || "",
      district: "",
      ward: "",
    }, false);
  };

  const handleCheckoutDistrictChange = (distId: number | "") => {
    setCheckoutDistrictId(distId);
    setCheckoutWardCode("");
    setCheckoutWards([]);
    setCheckoutShippingFee(null);
    const dist = checkoutDistricts.find(d => d.DistrictID === distId);
    syncUnifiedAddress({
      districtId: distId,
      wardCode: "",
      district: dist?.DistrictName || "",
      ward: "",
    }, false);
  };

  const handleCheckoutWardChange = (wdCode: string) => {
    setCheckoutWardCode(wdCode);
    setCheckoutShippingFee(null);
    const ward = checkoutWards.find(w => w.WardCode === wdCode);
    syncUnifiedAddress({
      wardCode: wdCode,
      ward: ward?.WardName || "",
    }, false);
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

    const deliveryAddressPayload = {
      provinceId: checkoutProvinceId,
      districtId: checkoutDistrictId,
      wardCode: checkoutWardCode,
      province: prov?.ProvinceName || "",
      district: dist?.DistrictName || "",
      ward: ward?.WardName || "",
      specificAddress: checkoutAddressDetail.trim(),
      addressNote: checkoutRenterNote.trim(),
      fullAddress: fullShippingAddress,
      recipientName: checkoutRenterName.trim(),
      phone: checkoutRenterPhone.trim(),
    };

    // Đồng bộ ngay địa chỉ này làm địa chỉ chuẩn GHN duy nhất toàn hệ thống (Server-side)
    syncUnifiedAddress(deliveryAddressPayload, Boolean(saveRenterInfo));

    try {
      const bookingPromise = createBooking({
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
        deliveryAddress: deliveryAddressPayload,
      });

      // 🛡️ Client Timeout Guard (10 giây): Ngăn chặn nút bấm quay vô tận khi mạng 4G chập chờn
      const timeoutGuard = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Quá thời gian kết nối (10s). Vui lòng bấm thử lại để hệ thống khôi phục mã QR thanh toán của bạn.")), 10000)
      );

      const res: any = await Promise.race([bookingPromise, timeoutGuard]);

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
          productImage: checkoutProduct.image || checkoutProduct.primaryImage || checkoutProduct.images?.[0] || FALLBACK_CLOUDINARY_IMG,
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

  // � NÚT KIỂM TRA TRẠNG THÁI THANH TOÁN PAYOS THỦ CÔNG KHI KHÁCH BẤM "TÔI ĐÃ CHUYỂN KHOẢN"
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

  const handleCropSkip = async () => {
    if (currentCropSrc && cropQueue.length > 0) {
      const originalFile = cropQueue[0];
      const compressed = await compressImageFile(originalFile);
      const previewUrl = URL.createObjectURL(compressed);
      setUploadedImages((prev) => [...prev, { file: compressed, previewUrl }]);
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

  // 📸 CHỌN NHIỀU ẢNH TỪ MÁY (TỐI ĐA 6 ẢNH) - TỰ ĐỘNG NÉN & NẠP VÀO DANH SÁCH
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const validFiles: File[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/") && !/\.(jpe?g|png|webp|heic|heif|avif)$/i.test(file.name)) {
          setPostError(`Tệp "${file.name}" không phải định dạng ảnh hợp lệ.`);
          continue;
        }
        validFiles.push(file);
      }

      if (validFiles.length > 0) {
        const remaining = 6 - uploadedImages.length;
        const toAdd = validFiles.slice(0, Math.max(0, remaining));
        
        // Tự động nén ảnh trên máy người dùng để tối ưu băng thông & tránh lỗi Vercel 4.5MB
        const processedImages = await Promise.all(
          toAdd.map(async (file) => {
            const compressed = await compressImageFile(file);
            return {
              file: compressed,
              previewUrl: URL.createObjectURL(compressed),
            };
          })
        );

        setUploadedImages((prev) => [...prev, ...processedImages]);
      }
    }
    if (e.target) e.target.value = "";
  };

  // 🚀 ĐĂNG BÀI GHI THẲNG VÀO DATABASE THỰC TẾ
  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPostError("");

    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }

    if (!uploadData.title.trim() || uploadData.title.trim().length < 5) {
      setPostError("Vui lòng nhập tên món đồ (tối thiểu 5 ký tự)!");
      return;
    }

    const isUploadingAccessory = ACCESSORY_CATEGORIES_LIST.includes(uploadData.category);

    if (!isUploadingAccessory && !uploadData.targetHeight.trim()) {
      setPostError("Vui lòng nhập chiều cao mặc đẹp (bắt buộc, VD: 1m55 - 1m65)!");
      return;
    }

    if (!isUploadingAccessory && !uploadData.targetWeight.trim()) {
      setPostError("Vui lòng nhập cân nặng mặc vừa (bắt buộc, VD: 45 - 52 kg)!");
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

    const parsed1DayPrice = parseInt((uploadData.price1Day || uploadData.rentalPrice || "").replace(/\D/g, "")) || 0;
    const parsed3DaysPrice = parseInt((uploadData.price3Days || "").replace(/\D/g, "")) || (parsed1DayPrice > 0 ? Math.round(parsed1DayPrice * 3 * 0.85 / 1000) * 1000 : 0);
    const parsed7DaysPrice = parseInt((uploadData.price7Days || "").replace(/\D/g, "")) || (parsed1DayPrice > 0 ? Math.round(parsed1DayPrice * 7 * 0.70 / 1000) * 1000 : 0);
    const parsedRentPrice = parsed1DayPrice;
    if (uploadData.isRental && parsedRentPrice <= 0) {
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
      // 1. Tải tất cả ảnh đã chọn/crop lên Cloudinary (đã được nén nhẹ)
      const uploadPromises = uploadedImages.map(async (imgItem) => {
        if (!imgItem.file || imgItem.file.size === 0 || imgItem.previewUrl.startsWith("http")) {
          return imgItem.previewUrl;
        }
        const fileToUpload = await compressImageFile(imgItem.file);

        const formData = new FormData();
        formData.append("file", fileToUpload);
        formData.append("folder", "cloop_mobile_closet");

        const upRes = await fetch("/api/upload", {
          method: "POST",
          body: formData
        });

        if (!upRes.ok) {
          const errData = await upRes.json().catch(() => null);
          throw new Error(errData?.error || `Không thể tải ảnh lên hệ thống (Lỗi ${upRes.status}).`);
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

      // 💾 ĐỒNG BỘ TRẠM GỬI LÀM MẶC ĐỊNH LÊN DATABASE SERVER CHO CÁC LẦN ĐĂNG TIẾP THEO (Không lưu PII vào LocalStorage)
      if (uploadData.saveLocationAsDefault) {
        const fullAddr = [uploadData.address.trim(), uploadData.ward.trim(), uploadData.district.trim(), uploadData.province.trim()].filter(Boolean).join(", ") + (uploadData.note?.trim() ? ` (Ghi chú: ${uploadData.note.trim()})` : "");
        syncUnifiedAddress({
          province: uploadData.province.trim(),
          district: uploadData.district.trim(),
          ward: uploadData.ward.trim(),
          specificAddress: uploadData.address.trim(),
          addressNote: uploadData.note?.trim() || "",
          phone: uploadData.ownerPhone.trim(),
          provinceId: selectedGhnProvinceId,
          districtId: selectedGhnDistrictId,
          wardCode: selectedGhnWardCode,
          fullAddress: fullAddr,
        }, true);
      }

      let res: { success: boolean; error?: string };
      if (editingProductId) {
        res = await updateProductFromAppAction(
          editingProductId,
          {
            title: uploadData.title.trim(),
            description: uploadData.description.trim() || uploadData.story.trim(),
            category: uploadData.category,
            color: uploadData.color,
            size: uploadData.size,
            material: uploadData.material,
            condition: uploadData.condition,
            occasion: uploadData.occasion,
            province: uploadData.province.trim(),
            districtId: selectedGhnDistrictId || null,
            wardCode: selectedGhnWardCode || null,
            address: uploadData.note?.trim() ? `${uploadData.address.trim()} (Ghi chú: ${uploadData.note.trim()})` : uploadData.address.trim(),
            ownerPhone: uploadData.ownerPhone.trim(),
            isRental: uploadData.isRental,
            price1Day: parsed1DayPrice,
            price3Days: parsed3DaysPrice,
            price7Days: parsed7DaysPrice,
            pricingTiers: [
              { days: 1, price: parsed1DayPrice },
              { days: 3, price: parsed3DaysPrice },
              { days: 7, price: parsed7DaysPrice }
            ],
            isSale: uploadData.isSale,
            salePrice: parsedSalePrice,
            deposit: parsedDeposit,
            images: finalImageUrls
          },
          currentUser?.id
        );
      } else {
        res = await createProductAction({
        product: {
          userId: currentUser?.id,
          name: uploadData.title.trim(),
          description: uploadData.description.trim() || uploadData.story.trim() || `Trang phục ${uploadData.category} - ${uploadData.occasion} chọn lọc từ tủ đồ cá nhân. Chiều cao: ${uploadData.targetHeight}, Cân nặng: ${uploadData.targetWeight}. Tình trạng ${uploadData.condition}%, chất liệu ${uploadData.material}.`,
          category: uploadData.category,
          color: uploadData.color,
          size: uploadData.size,
          targetHeight: uploadData.targetHeight.trim(),
          targetWeight: uploadData.targetWeight.trim(),
          bust: uploadData.bust.trim() || undefined,
          waist: uploadData.waist.trim() || undefined,
          hips: uploadData.hips.trim() || undefined,
          material: uploadData.material,
          condition: uploadData.condition,
          province: uploadData.province.trim(),
          district: uploadData.district.trim(),
          ward: uploadData.ward.trim(),
          districtId: selectedGhnDistrictId || null,
          wardCode: selectedGhnWardCode || null,
          address: uploadData.note?.trim() ? `${uploadData.address.trim()} (Ghi chú: ${uploadData.note.trim()})` : uploadData.address.trim(),
          ownerPhone: uploadData.ownerPhone.trim(),
          occasion: uploadData.occasion,
        },
        listings: {
          isRental: uploadData.isRental,
          isSale: uploadData.isSale,
          rentalPrice: parsed1DayPrice,
          price1Day: parsed1DayPrice,
          price3Days: parsed3DaysPrice,
          price7Days: parsed7DaysPrice,
          pricingTiers: [
            { days: 1, price: parsed1DayPrice },
            { days: 3, price: parsed3DaysPrice },
            { days: 7, price: parsed7DaysPrice }
          ],
          salePrice: parsedSalePrice,
          deposit: parsedDeposit,
          minDays: 1
        },
        uploadedImageUrls: finalImageUrls,
        hasStory: Boolean(uploadData.story.trim()),
        storyText: uploadData.story.trim()
      });
      }

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
          setEditingProductId(null);
          setUploadedImages([]);
          // Giữ nguyên trạm gửi đã lưu để các lần đăng sau không cần gõ lại!
          setUploadData(prev => ({
            ...prev,
            title: "",
            category: "Áo",
            occasion: "Dạo phố",
            color: "Trắng",
            size: "M",
            condition: "99",
            targetHeight: "",
            targetWeight: "",
            bust: "",
            waist: "",
            hips: "",
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

  // ➕ MỞ MODAL ĐĂNG ĐỒ MỚI (RESET VỀ TRẠNG THÁI TẠO MỚI)
  const handleOpenCreateModal = () => {
    setEditingProductId(null);
    setUploadData(prev => ({
      ...prev,
      title: "",
      category: "Áo",
      occasion: "Dạo phố",
      color: "Trắng",
      size: "M",
      condition: "99",
      targetHeight: "",
      targetWeight: "",
      bust: "",
      waist: "",
      hips: "",
      material: "Lụa tơ tằm cao cấp",
      isRental: true,
      rentalPrice: "80.000",
      price1Day: "80.000",
      price3Days: "200.000",
      price7Days: "400.000",
      deposit: "500.000",
      isSale: false,
      salePrice: "",
      originalPrice: "3.200.000",
      description: "",
      story: "",
      imageFile: null,
      imagePreview: "",
    }));
    setUploadedImages([]);
    setPostError("");
    setPostSuccess(false);
    setIsUploadModalOpen(true);
  };

  // ✏️ MỞ MODAL CHỈNH SỬA TRANG PHỤC NGAY TRONG BẢN APP (TRÁNH BỊ ĐIỀU HƯỚNG RA BẢN WEB GÂY LỖI 404)
  const handleOpenEditModal = (item: any) => {
    setEditingProductId(item.id);
    const p1 = item.price1Day || item.rentalPrice || 0;
    const p3 = item.price3Days || (p1 > 0 ? Math.round(p1 * 3 * 0.85 / 1000) * 1000 : 0);
    const p7 = item.price7Days || (p1 > 0 ? Math.round(p1 * 7 * 0.70 / 1000) * 1000 : 0);
    const dep = item.deposit || 0;
    const sale = item.salePrice || 0;
    const orig = item.originalPrice || 0;

    setUploadData(prev => ({
      ...prev,
      title: item.title || item.name || "",
      category: item.category || "Áo",
      occasion: item.occasion || "Dạo phố",
      color: item.color || "Trắng",
      size: item.size || "M",
      condition: item.condition || "99",
      targetHeight: item.targetHeight || "",
      targetWeight: item.targetWeight || "",
      bust: item.bust ? String(item.bust) : "",
      waist: item.waist ? String(item.waist) : "",
      hips: item.hips ? String(item.hips) : "",
      material: item.material || "Lụa tơ tằm cao cấp",
      province: item.province || prev.province || "Hà Nội",
      district: item.district || prev.district || "Quận Hoàn Kiếm",
      ward: item.ward || prev.ward || "Phường Hàng Đào",
      address: item.address || item.specificAddress || prev.address || "",
      note: item.note || "",
      ownerPhone: item.ownerPhone || prev.ownerPhone || "",
      saveLocationAsDefault: true,
      isRental: item.isRental !== false,
      rentalPrice: p1 > 0 ? Number(p1).toLocaleString("vi-VN") : "80.000",
      price1Day: p1 > 0 ? Number(p1).toLocaleString("vi-VN") : "80.000",
      price3Days: p3 > 0 ? Number(p3).toLocaleString("vi-VN") : "200.000",
      price7Days: p7 > 0 ? Number(p7).toLocaleString("vi-VN") : "400.000",
      deposit: dep > 0 ? Number(dep).toLocaleString("vi-VN") : "0",
      isSale: !!item.isSale,
      salePrice: sale > 0 ? Number(sale).toLocaleString("vi-VN") : "",
      originalPrice: orig > 0 ? Number(orig).toLocaleString("vi-VN") : "3.200.000",
      description: item.description || "",
      story: item.story || item.storyText || "",
      imageFile: null,
      imagePreview: item.image || (item.images && item.images[0]) || "",
    }));

    const imgs: string[] = item.images && item.images.length > 0 ? item.images : (item.image ? [item.image] : []);
    setUploadedImages(imgs.map((url: string, i: number) => ({
      previewUrl: url,
      file: new File([""], `existing_${i}.jpg`, { type: "image/jpeg" })
    })));

    setPostError("");
    setPostSuccess(false);
    setIsUploadModalOpen(true);
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
      const prov = ghnProvinces.find(p => p.ProvinceID === selectedGhnProvinceId);
      const dist = ghnDistricts.find(d => d.DistrictID === selectedGhnDistrictId);
      const ward = ghnWards.find(w => w.WardCode === selectedGhnWardCode);

      const parts = [specificAddressDetail.trim(), ward?.WardName, dist?.DistrictName, prov?.ProvinceName].filter(Boolean);
      const fullAddr = parts.length > 0
        ? (parts.join(", ") + (addressNote.trim() ? ` (Ghi chú: ${addressNote.trim()})` : ""))
        : profileForm.pickupAddress;
      const locationStr = (dist?.DistrictName && prov?.ProvinceName)
        ? `${dist.DistrictName}, ${prov.ProvinceName}`
        : (prov?.ProvinceName || fullAddr || profileForm.name);

      const res = await updateClosetProfileAction({
        userId: closetData?.user?.id || currentUser?.id || "",
        name: profileForm.name,
        location: locationStr,
        bio: profileForm.bio,
        quote: profileForm.quote,
        provinceId: selectedGhnProvinceId,
        districtId: selectedGhnDistrictId,
        wardCode: selectedGhnWardCode,
        province: prov?.ProvinceName || unifiedAddress.province,
        district: dist?.DistrictName || unifiedAddress.district,
        ward: ward?.WardName || unifiedAddress.ward,
        specificAddress: specificAddressDetail,
        addressNote: addressNote,
        pickupAddress: fullAddr,
        fullAddress: fullAddr,
        phone: profileForm.phone,
      });

      if (res.success) {
        setProfileSaveSuccess(true);
        syncUnifiedAddress({
          provinceId: selectedGhnProvinceId,
          districtId: selectedGhnDistrictId,
          wardCode: selectedGhnWardCode,
          province: prov?.ProvinceName || unifiedAddress.province,
          district: dist?.DistrictName || unifiedAddress.district,
          ward: ward?.WardName || unifiedAddress.ward,
          specificAddress: specificAddressDetail,
          addressNote: addressNote,
          fullAddress: fullAddr,
          phone: profileForm.phone,
          recipientName: profileForm.name,
        }, true);

        // ⚡ Đồng bộ ngay lập tức vào state nội bộ của Mobile App (0ms)
        setClosetData((prev: any) => prev ? {
          ...prev,
          user: {
            ...prev.user,
            name: profileForm.name,
            location: locationStr,
            pickupAddress: fullAddr,
            fullAddress: fullAddr,
            phone: profileForm.phone
          }
        } : prev);

        await refreshPersonalData();
        setTimeout(() => setProfileSaveSuccess(false), 2500);
      }
    } catch (err) {
      console.error("Lỗi cập nhật hồ sơ:", err);
    } finally {
      setIsSavingProfile(false);
    }
  };

  // � LƯU LIÊN KẾT TÀI KHOẢN NGÂN HÀNG (ĐỒNG BỘ WEB & DB)
  const handleSaveBankInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !closetData?.user?.id) {
      setShowAuthModal(true);
      return;
    }

    const effectiveBank = bankForm.bankName === "Khác" ? customBankName.trim() : bankForm.bankName.trim();

    if (!effectiveBank || !bankForm.bankAccount.trim() || !bankForm.bankOwner.trim()) {
      setBankError("Vui lòng điền đầy đủ tên ngân hàng, số tài khoản và họ tên chủ tài khoản.");
      return;
    }

    setIsSavingBank(true);
    setBankError("");
    try {
      const cleanAcc = bankForm.bankAccount.trim().replace(/\s+/g, "");
      const cleanHolder = bankForm.bankOwner.trim().toUpperCase();

      const res = await saveUserBankInfoAction({
        bankName: effectiveBank,
        bankAccountNumber: cleanAcc,
        bankAccountHolder: cleanHolder,
        clientUserId: closetData?.user?.id || currentUser?.id,
      });

      if (res.success) {
        setBankSaveSuccess(true);
        setBankForm(prev => ({ ...prev, bankName: effectiveBank }));

        // ⚡ Đồng bộ ngay lập tức vào state nội bộ của Mobile App (0ms)
        setClosetData((prev: any) => prev ? {
          ...prev,
          user: {
            ...prev.user,
            bankName: effectiveBank,
            bankAccount: cleanAcc,
            bankOwner: cleanHolder
          },
          withdrawals: (prev.withdrawals || []).map((w: any) => 
            w.status === "PENDING" 
              ? { ...w, bankName: effectiveBank, bankAccountNumber: cleanAcc, bankAccountHolder: cleanHolder } 
              : w
          )
        } : prev);

        await refreshPersonalData();
        setTimeout(() => {
          setBankSaveSuccess(false);
          setIsBankModalOpen(false);
        }, 1500);
      } else {
        setBankError(res.message || "Không thể lưu thông tin ngân hàng.");
      }
    } catch (err: any) {
      setBankError("Lỗi kết nối khi lưu tài khoản ngân hàng.");
    } finally {
      setIsSavingBank(false);
    }
  };

  // 💳 XÁC NHẬN YÊU CẦU RÚT TIỀN VỀ NGÂN HÀNG (ĐỒNG BỘ CHUẨN WEB)
  const handleConfirmWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !closetData?.user?.id) {
      setShowAuthModal(true);
      return;
    }

    const rawAmount = parseInt(withdrawAmount.replace(/\D/g, ""), 10) || 0;
    const availableBal = closetData?.user?.walletBalance || 0;

    if (rawAmount < 50000) {
      setWithdrawErrorMsg("Số tiền rút tối thiểu là 50.000đ.");
      return;
    }
    if (rawAmount > availableBal) {
      setWithdrawErrorMsg(`Số dư khả dụng (${availableBal.toLocaleString("vi-VN")}đ) không đủ.`);
      return;
    }
    if (!bankForm.bankName.trim() || !bankForm.bankAccount.trim() || !bankForm.bankOwner.trim()) {
      setWithdrawErrorMsg("Vui lòng liên kết tài khoản ngân hàng trước khi tạo lệnh rút tiền.");
      return;
    }

    setIsSubmittingWithdraw(true);
    setWithdrawErrorMsg("");
    setWithdrawSuccessMsg("");

    try {
      const res = await requestWithdrawalAction({
        amount: rawAmount,
        bankName: bankForm.bankName.trim(),
        bankAccountNumber: bankForm.bankAccount.trim().replace(/\s+/g, ""),
        bankAccountHolder: bankForm.bankOwner.trim().toUpperCase(),
        password: withdrawPassword,
        clientUserId: closetData?.user?.id || currentUser?.id,
      });

      if (res.success) {
        setWithdrawSuccessMsg(res.message || "Lệnh rút tiền đã được tạo thành công!");
        setWithdrawAmount("");
        setWithdrawPassword("");
        await refreshPersonalData();
        setTimeout(() => {
          setWithdrawSuccessMsg("");
          setIsWithdrawModalOpen(false);
        }, 2200);
      } else {
        setWithdrawErrorMsg(res.message || "Không thể tạo lệnh rút tiền.");
      }
    } catch (err: any) {
      setWithdrawErrorMsg("Lỗi kết nối khi gửi yêu cầu rút tiền.");
    } finally {
      setIsSubmittingWithdraw(false);
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

  const displayName = closetData?.user?.name || currentUser?.name || "Thành viên CLOOP";

  // 🛍️ HÀM RENDER THẺ SẢN PHẨM MẬT ĐỘ CAO (HIGH-DENSITY LUXURY FASHION CARD)
  // Tối ưu hóa diện tích màn hình di động: Ảnh tỉ lệ chuẩn 3:4, gom nhóm thông số gọn gàng, triệt tiêu khoảng trống thừa
  const renderLuxuryCompactProductCard = (p: any, idx: number) => {
    const isLiked = !!likedItems[p.id];
    const isInCart = cartItems.some((item: any) => item.id === p.id);
    const isRent = p.listingTypeRaw !== "SELL";
    const rentPrice = Number(p.rentalPrice || p.price || 0);
    const salePrice = Number(p.salePrice || p.price || 0);
    const currentPrice = isRent ? rentPrice : salePrice;
    const package3Days = isRent ? calculatePackageRentalFee(p, 3) : currentPrice;
    const itemImg = p.image || p.primaryImage || p.images?.[0] || FALLBACK_CLOUDINARY_IMG;
    const ownerName = p.ownerName || "Chủ tủ CLOOP";

    const dbOrigPrice = Number(p.originalPrice || p.storeRetailPrice || 0);
    const retailPrice = dbOrigPrice > currentPrice 
      ? dbOrigPrice 
      : (isRent && currentPrice > 0 ? currentPrice * 9 : (currentPrice > 0 ? Math.round(currentPrice * 1.6) : 0));
    const savedAmount = Math.max(0, retailPrice - currentPrice);
    const savedPercent = retailPrice > currentPrice 
      ? Math.min(95, Math.max(10, Math.round(((retailPrice - currentPrice) / retailPrice) * 100))) 
      : 0;

    return (
      <div
        key={p.id || idx}
        onClick={() => setSelectedProduct(p)}
        className={`group bg-white rounded-2xl overflow-hidden border ${vibeConfig.cardBorder} shadow-2xs hover:shadow-md flex flex-col cursor-pointer active:scale-[0.99] transition-all duration-300`}
      >
        {/* 1. Khung Ảnh (Aspect 3:4) đồng đều 100% */}
        <div className="relative w-full aspect-[3/4] bg-stone-100 overflow-hidden">
          <Image
            src={itemImg}
            alt={p.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
            unoptimized
            loading="lazy"
          />

          {/* Nhãn Thuê / Mua + Mức Ưu Đãi Tiết Kiệm % */}
          <div className="absolute top-2 left-2 flex items-center gap-1 z-10">
            {Boolean(p.boostExpiresAt && new Date(p.boostExpiresAt) > new Date()) && (
              <span className="bg-amber-400 text-stone-950 text-[8.5px] font-black px-1.5 py-0.5 rounded-full shadow-2xs">
                THỊNH HÀNH
              </span>
            )}
            <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full shadow-2xs ${
              isRent ? vibeConfig.rentBadge : vibeConfig.buyBadge
            }`}>
              {isRent ? "Thuê" : "Mua"}
            </span>
            {savedPercent > 0 && (
              <span className={`${vibeConfig.discountBadge} text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-2xs font-mono`}>
                -{savedPercent}%
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={(e) => handleToggleLike(p.id, e)}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-stone-600 hover:scale-110 transition shadow-2xs z-10 cursor-pointer"
            title="Lưu yêu thích"
          >
            <Heart size={13} className={isLiked ? "fill-[#C26475] text-[#C26475]" : "text-stone-600"} />
          </button>
        </div>

        {/* 2. Thân Card thông minh: Tên váy & Size + Giá Sale/Thuê + Hộp đối chiếu Giá Gốc & Tiết Kiệm */}
        <div className="p-2.5 space-y-1.5 flex-1 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1">
            <h3 className="font-body font-bold text-[12px] text-stone-900 line-clamp-1 leading-snug flex-1">
              {p.title}
            </h3>
            <span className="text-[9.5px] text-stone-600 font-bold bg-stone-100 px-1.5 py-0.5 rounded shrink-0">
              {p.size || "M"}
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex items-baseline justify-between gap-1">
              <div className="flex items-baseline gap-0.5 min-w-0">
                <span className={`font-heading font-black text-[13.5px] ${vibeConfig.priceText} whitespace-nowrap`}>
                  {currentPrice.toLocaleString("vi-VN")}đ
                </span>
                {isRent && (
                  <span className="text-[9.5px] text-stone-500 font-semibold whitespace-nowrap">/ngày</span>
                )}
              </div>
              {retailPrice > currentPrice && (
                <span className="text-[9.5px] text-stone-400 line-through font-mono whitespace-nowrap shrink-0">
                  {retailPrice.toLocaleString("vi-VN")}đ
                </span>
              )}
            </div>

            {savedAmount > 0 && (
              <div className="pt-0.5">
                <span className="inline-block text-[9.5px] font-bold text-rose-700 bg-rose-50 border border-rose-200/70 px-1.5 py-0.5 rounded-md font-mono">
                  Tiết kiệm {savedAmount.toLocaleString("vi-VN")}đ
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    // �️ KHUNG NGOÀI THOÁNG ĐÃNG
    <div className={`h-dvh overflow-hidden ${vibeConfig.outerBg} py-0 sm:py-2 flex items-center justify-center transition-colors duration-300`}>
      
      {/* 📱 KHUNG MÁY APP CÂN ĐỐI 100% TRONG MÀN HÌNH */}
      <div 
        ref={scrollContainerRef}
        className={`w-full sm:max-w-[420px] h-dvh sm:h-[calc(100dvh-16px)] ${vibeConfig.appBg} antialiased sm:shadow-[0_20px_50px_rgba(0,0,0,0.18)] sm:rounded-[36px] sm:border-[5px] border-stone-900 relative overflow-y-auto overflow-x-hidden select-none no-scrollbar flex flex-col transition-colors duration-300`}
      >
        
        {/* ========================================================
            � 1. HEADER NATIVE APP TINH TẾ & THOÁNG ĐÃNG
            ======================================================== */}
        <div className={`sticky top-0 z-40 ${vibeConfig.headerBg} backdrop-blur-xl pt-2.5 pb-2 px-3 border-b shrink-0 transition-colors duration-300 space-y-2`}>
          {/* HÀNG 1: LOGO + LỜI CHÀO THÂN THIỆN BÊN TRÁI + 2 ICON BÊN PHẢI */}
          <div className="relative flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("home");
                  setListingMode("all");
                  setSelectedOccasion("Tất cả");
                  setSearchQuery("");
                }}
                className="flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <img
                  src="/loogo.png"
                  alt="CLOOP"
                  className="w-6 h-4 object-contain mix-blend-multiply"
                />
                <span className="font-brand-title text-[15.5px] font-black tracking-[0.12em] text-stone-900 leading-none">
                  CLOOP
                </span>
              </button>

              <span className="h-3.5 w-px bg-stone-300/90 shrink-0" />

              <button
                type="button"
                onClick={() => setActiveTab("closet")}
                className="flex items-center gap-1 text-[11.5px] font-medium text-stone-600 hover:text-stone-900 truncate cursor-pointer"
              >
                <style>{`
                  @keyframes cloopHandWave {
                    0%, 60%, 100% { transform: rotate(0deg); }
                    10%, 30% { transform: rotate(16deg); }
                    20% { transform: rotate(-10deg); }
                    40% { transform: rotate(-6deg); }
                    50% { transform: rotate(10deg); }
                  }
                `}</style>
                <span className="truncate">
                  {lang === "vi"
                    ? (closetData?.user?.name ? `Xin chào, ${closetData.user.name}` : "Xin chào")
                    : (closetData?.user?.name ? `Hello, ${closetData.user.name}` : "Hello")}
                </span>
                <span
                  aria-hidden="true"
                  className="inline-block text-[13px] leading-none shrink-0"
                  style={{
                    transformOrigin: "70% 70%",
                    animation: "cloopHandWave 2.4s ease-in-out infinite",
                  }}
                >
                  👋
                </span>
              </button>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsTonePickerOpen((prev) => !prev)}
                className="w-8 h-8 rounded-full bg-white border border-stone-200/90 shadow-2xs flex items-center justify-center cursor-pointer hover:bg-stone-50"
                title="Đổi tone màu giao diện"
              >
                <span className={`w-3.5 h-3.5 rounded-full ${vibeConfig.primaryBtn}`} />
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("orders");
                  setOrderSubTab("cart");
                }}
                className="relative w-8 h-8 rounded-full bg-white border border-stone-200/90 text-stone-700 hover:bg-stone-50 flex items-center justify-center shadow-2xs cursor-pointer"
                title="Giỏ đồ"
              >
                <ShoppingBag size={14} />
                {cartItems.length > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-1 rounded-full bg-[#C26475] text-white text-[8px] font-extrabold flex items-center justify-center">
                    {cartItems.length}
                  </span>
                )}
              </button>
            </div>

            {isTonePickerOpen && (
              <div className="absolute top-9 right-0 z-50 bg-white border border-stone-200 rounded-2xl p-2 shadow-xl flex items-center gap-2">
                {([
                  { id: "rose_champagne", label: "Hồng Trà", dot: "bg-gradient-to-tr from-[#C26475] to-[#F5E1DA]" },
                  { id: "milk_tea_oat", label: "Trà Sữa", dot: "bg-gradient-to-tr from-[#9C6644] to-[#EDE0D4]" },
                  { id: "misty_lavender", label: "Tím Sương", dot: "bg-gradient-to-tr from-[#8062D6] to-[#E9E2FA]" },
                  { id: "cloud_porcelain", label: "Xanh Mây", dot: "bg-gradient-to-tr from-[#4A81AB] to-[#E3EFF8]" },
                  { id: "peach_blossom", label: "Hồng Đào", dot: "bg-gradient-to-tr from-[#E07A68] to-[#FCE8E2]" },
                  { id: "matcha_cream", label: "Matcha Sữa", dot: "bg-gradient-to-tr from-[#6D9471] to-[#E9F2E6]" },
                  { id: "rose_noir", label: "Đen Vogue", dot: "bg-gradient-to-tr from-[#FF2E63] to-[#141418]" },
                ] as const).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      handleSelectVibe(t.id, t.label);
                      setIsTonePickerOpen(false);
                    }}
                    title={`Tone: ${t.label}`}
                    className={`w-4.5 h-4.5 rounded-full ${t.dot} border border-stone-300 transition-transform cursor-pointer ${
                      mobileVibe === t.id ? "scale-125 ring-2 ring-offset-1 ring-stone-800" : "opacity-80 hover:opacity-100"
                    }`}
                  />
                ))}
                <button
                  type="button"
                  onClick={() => toggleLang(lang === "vi" ? "en" : "vi")}
                  className="h-6 px-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-[9.5px] font-extrabold text-stone-800 cursor-pointer"
                >
                  {lang === "vi" ? "VN" : "EN"}
                </button>
              </div>
            )}
          </div>

          {/* HÀNG 2: THANH TÌM KIẾM TRẢI RỘNG (TÍCH HỢP NÚT CAMERA BÊN TRONG) */}
          <div className="relative flex items-center h-9 bg-white rounded-full border border-stone-200/90 shadow-2xs focus-within:border-stone-500">
            <Search size={14} className="ml-3 text-stone-400 shrink-0 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (activeTab !== "home" && activeTab !== "shop") setActiveTab("home");
              }}
              placeholder={
                productGroup === "accessories"
                  ? "Tìm túi xách, giày cao gót, trang sức..."
                  : "Tìm đầm dự tiệc, váy, áo dài..."
              }
              className="w-full h-full bg-transparent text-stone-900 placeholder-stone-400 pl-2 pr-12 text-xs font-medium outline-none"
            />
            <div className="absolute right-1 flex items-center gap-0.5">
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="text-stone-400 hover:text-stone-600 p-1 cursor-pointer"
                >
                  <X size={13} />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsVisualSearchOpen(true)}
                className={`w-7 h-7 rounded-full ${vibeConfig.primaryBtn} flex items-center justify-center transition cursor-pointer`}
                title="Tìm kiếm trang phục bằng hình ảnh"
              >
                <Camera size={13} />
              </button>
            </div>
          </div>

          {/* HÀNG 3: TÁCH LUỒNG QUẦN ÁO RIÊNG / PHỤ KIỆN RIÊNG KÈM DANH MỤC CON TƯƠNG ỨNG */}
          {(activeTab === "home" || activeTab === "shop") && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {/* Cụm chuyển đổi 2 luồng chính: Quần áo | Phụ kiện */}
              <div className="flex items-center bg-stone-200/70 p-0.5 rounded-full shrink-0 border border-stone-200">
                <button
                  type="button"
                  onClick={() => {
                    setProductGroup("clothing");
                    setSelectedOccasion("Tất cả");
                  }}
                  className={`h-6 px-2.5 rounded-full text-[11px] font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                    productGroup === "clothing"
                      ? "bg-stone-900 text-white shadow-2xs"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  Quần áo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProductGroup("accessories");
                    setSelectedOccasion("Tất cả");
                  }}
                  className={`h-6 px-2.5 rounded-full text-[11px] font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                    productGroup === "accessories"
                      ? "bg-stone-900 text-white shadow-2xs"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  Phụ kiện
                </button>
              </div>

              <span className="h-4 w-px bg-stone-300 shrink-0" />

              {/* Dải danh mục con riêng biệt theo từng luồng */}
              {(productGroup === "accessories" ? ACCESSORY_TABS : CLOTHING_TABS).map((tab) => {
                const isActive = selectedOccasion === tab.name;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setSelectedOccasion(tab.name);
                      if (tab.name === "Tất cả") setListingMode("all");
                    }}
                    className={`h-7 px-3 rounded-full text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                      isActive ? vibeConfig.activePill : vibeConfig.inactivePill
                    }`}
                  >
                    {tab.name}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setIsFilterOpen((prev) => !prev)}
                className={`h-7 px-3 rounded-full text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 border ${
                  isFilterOpen || selectedSizeFilter !== "ALL" || selectedPriceFilter !== "ALL" || selectedSortBy !== "RECOMMENDED"
                    ? vibeConfig.activePill
                    : "bg-white text-stone-700 border-stone-200/90"
                }`}
              >
                Lọc Size &amp; Giá
              </button>
            </div>
          )}

          {/* KHAY LỌC SIZE / GIÁ / SẮP XẾP (CHỈ BẬT KHI BẤM) */}
          {isFilterOpen && (activeTab === "home" || activeTab === "shop") && (
            <div className="bg-white p-2 rounded-xl border border-stone-200/90 shadow-2xs grid grid-cols-3 gap-1.5">
              <select
                value={selectedSizeFilter}
                onChange={(e) => setSelectedSizeFilter(e.target.value)}
                className="h-7.5 px-1.5 rounded-lg bg-stone-50 border border-stone-200/90 text-[10px] font-bold text-stone-700 outline-none cursor-pointer"
              >
                <option value="ALL">Mọi Size</option>
                <option value="S">Size S</option>
                <option value="M">Size M</option>
                <option value="L">Size L</option>
                <option value="XL">Size XL</option>
              </select>

              <select
                value={selectedPriceFilter}
                onChange={(e) => setSelectedPriceFilter(e.target.value as any)}
                className="h-7.5 px-1.5 rounded-lg bg-stone-50 border border-stone-200/90 text-[10px] font-bold text-stone-700 outline-none cursor-pointer"
              >
                <option value="ALL">Mọi mức giá</option>
                <option value="UNDER_100K">Dưới 100k</option>
                <option value="100K_200K">100k - 200k</option>
                <option value="OVER_200K">Trên 200k</option>
              </select>

              <select
                value={selectedSortBy}
                onChange={(e) => setSelectedSortBy(e.target.value as any)}
                className="h-7.5 px-1.5 rounded-lg bg-stone-50 border border-stone-200/90 text-[10px] font-bold text-stone-700 outline-none cursor-pointer"
              >
                <option value="RECOMMENDED">Đề xuất</option>
                <option value="PRICE_ASC">Giá tăng dần</option>
                <option value="PRICE_DESC">Giá giảm dần</option>
              </select>
            </div>
          )}

          {langToast && (
            <div className={`absolute top-11 left-1/2 -translate-x-1/2 z-50 ${vibeConfig.activePill} text-[10.5px] font-bold px-3 py-1 rounded-full shadow-md whitespace-nowrap`}>
              {langToast}
            </div>
          )}

            {/* �� �� NÚT CHUYỂN ĐỔI NGÔN NGỮ ĐƠN GỌN GÀNG (LÁ CỜ QUỐC KỲ CHUẨN SVG + VIE / ENG) */}
        </div>

        {/* ========================================================
             NỘI DUNG CHÍNH THEO TỪNG TAB TRONG APP
            ======================================================== */}

        {/* ========================================================
             TAB 1: KHÁM PHÁ (HOME) - THOÁNG ĐÃNG CHUẨN MÀN ĐIỆN THOẠI
            ======================================================== */}
        {activeTab === "home" && (
          <>
            <div className="px-3 pt-2.5 pb-6 space-y-4 flex-1">
              {usingSnapshot && (
                <div className="px-3 py-1.5 bg-stone-100/90 rounded-xl border border-stone-200/80 text-center text-[11px] font-medium text-stone-600">
                  {isSyncing ? "Đang cập nhật danh mục mới nhất..." : "Đang hiển thị bản sao lưu đệm"}
                </div>
              )}

              {isSyncing && products.length === 0 ? (
                <div className="py-12 text-center text-stone-500 bg-white rounded-2xl border border-stone-200/80 p-6 space-y-3">
                  <div className="w-6 h-6 border-2 border-stone-300 border-t-stone-900 rounded-full animate-spin mx-auto" />
                  <p className="text-xs font-medium text-stone-600">Đang đồng bộ danh mục trang phục...</p>
                </div>
              ) : fetchStatus === "ERROR" && products.length === 0 ? (
                <div className="py-12 text-center text-stone-500 bg-white rounded-2xl border border-stone-200/80 p-6 space-y-2">
                  <p className="text-xs font-bold text-stone-700">Kết nối mạng tạm thời bị gián đoạn</p>
                  <p className="text-[11px] text-stone-500">Dữ liệu trên sàn vẫn an toàn. Vui lòng thử kết nối lại.</p>
                  <button
                    onClick={() => { retryCountRef.current = 0; recoverFromError(); }}
                    className={`mt-2 px-4 py-1.5 ${vibeConfig.primaryBtn} text-xs font-bold rounded-xl cursor-pointer`}
                  >
                    Thử kết nối lại
                  </button>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="py-10 text-center text-stone-500 bg-white rounded-2xl border border-stone-200/80 p-6 space-y-2.5">
                  <p className="text-xs font-bold text-stone-800">
                    {productGroup === "accessories"
                      ? `Chưa có món phụ kiện nào trong mục "${selectedOccasion}"`
                      : "Không có trang phục khớp với bộ lọc hiện tại"}
                  </p>
                  <p className="text-[11px] text-stone-500">
                    {productGroup === "accessories"
                      ? "Bạn có thể đăng túi xách, giày guốc, trang sức vào mục Phụ kiện hoặc chuyển sang xem Quần áo."
                      : "Thử đổi kích cỡ, mức giá hoặc danh mục khác để xem thêm đồ."}
                  </p>
                  <div className="flex items-center justify-center gap-2 pt-1">
                    {productGroup === "accessories" && (
                      <button
                        type="button"
                        onClick={() => {
                          setUploadData((prev) => ({
                            ...prev,
                            category: "Túi & Ví dự tiệc",
                            size: "Freesize",
                          }));
                          setIsUploadModalOpen(true);
                        }}
                        className={`px-3.5 py-1.5 ${vibeConfig.primaryBtn} text-xs font-bold rounded-xl cursor-pointer`}
                      >
                        + Đăng phụ kiện
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setProductGroup("clothing");
                        setListingMode("all");
                        setSelectedOccasion("Tất cả");
                        setSelectedSizeFilter("ALL");
                        setSelectedPriceFilter("ALL");
                        setOnlyLikedFilter(false);
                        setSearchQuery("");
                      }}
                      className="px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-xl cursor-pointer"
                    >
                      Xem tất cả quần áo
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {(() => {
                    // 1. Sắp xếp thông minh cho mục THỊNH HÀNH: ưu tiên Đầm/Váy/Áo dài rực rỡ & đồ đang Đẩy Top
                    const getTrendingShowcasePriority = (item: any): number => {
                      const t = `${item?.title || ""} ${item?.category || ""}`.toLowerCase();
                      if (t.includes("bomber") || t.includes("khoác")) return 0;
                      if (t.includes("đầm") || t.includes("váy") || t.includes("áo dài")) return 3;
                      return 1;
                    };

                    const trendingItems = [...filteredProducts]
                      .sort((a: any, b: any) => {
                        const aPrio = getTrendingShowcasePriority(a);
                        const bPrio = getTrendingShowcasePriority(b);
                        if (bPrio !== aPrio) return bPrio - aPrio;
                        const aBoost = Boolean(a.boostExpiresAt && new Date(a.boostExpiresAt) > new Date()) ? 1 : 0;
                        const bBoost = Boolean(b.boostExpiresAt && new Date(b.boostExpiresAt) > new Date()) ? 1 : 0;
                        if (bBoost !== aBoost) return bBoost - aBoost;
                        const aScore = Number(a.boostScore || 0);
                        const bScore = Number(b.boostScore || 0);
                        if (bScore !== aScore) return bScore - aScore;
                        return 0;
                      })
                      .slice(0, 6);

                    // Lưu ID của 3 mẫu đầu tiên trong Thịnh Hành để xoay vòng thông minh, tránh lặp lại y hệt ở dòng đầu của mục Thuê & Thanh lý
                    const topTrendingLeadIds = new Set(trendingItems.slice(0, 3).map((item: any) => item.id));

                    const allRentItems = filteredProducts.filter((p: any) => p.listingTypeRaw !== "SELL");
                    const smartRentItems = [
                      ...allRentItems.filter((p: any) => !topTrendingLeadIds.has(p.id)),
                      ...allRentItems.filter((p: any) => topTrendingLeadIds.has(p.id)),
                    ];

                    const allSaleItems = filteredProducts.filter((p: any) => p.listingTypeRaw === "SELL");
                    const smartSaleItems = [
                      ...allSaleItems.filter((p: any) => !topTrendingLeadIds.has(p.id)),
                      ...allSaleItems.filter((p: any) => topTrendingLeadIds.has(p.id)),
                    ];

                    return (
                      <div className="space-y-4">
                        <style>{`
                          @keyframes cloopTrendingSheen {
                            0% { transform: translateX(-140%) skewX(-22deg); }
                            45%, 100% { transform: translateX(220%) skewX(-22deg); }
                          }
                          @keyframes cloopFlamePulse {
                            0%, 100% { transform: scale(1); box-shadow: 0 2px 10px rgba(244, 63, 94, 0.45); }
                            50% { transform: scale(1.04); box-shadow: 0 4px 14px rgba(245, 158, 11, 0.65); }
                          }
                        `}</style>

                        {/* THANH CHUYỂN MỤC GỌN GÀNG */}
                        <div className="grid grid-cols-3 gap-1.5 bg-stone-200/60 p-1 rounded-xl border border-stone-200/80">
                          <button
                            type="button"
                            onClick={() => setListingMode("all")}
                            className={`h-7.5 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                              listingMode === "all"
                                ? "bg-white text-stone-900 shadow-2xs"
                                : "text-stone-600 hover:text-stone-900"
                            }`}
                          >
                            Tất cả
                          </button>
                          <button
                            type="button"
                            onClick={() => setListingMode(listingMode === "rent" ? "all" : "rent")}
                            className={`h-7.5 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                              listingMode === "rent"
                                ? "bg-[#1B4332] text-white shadow-2xs"
                                : "text-stone-600 hover:text-stone-900"
                            }`}
                          >
                            Thuê theo ngày
                          </button>
                          <button
                            type="button"
                            onClick={() => setListingMode(listingMode === "sell" ? "all" : "sell")}
                            className={`h-7.5 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                              listingMode === "sell"
                                ? "bg-rose-600 text-white shadow-2xs"
                                : "text-stone-600 hover:text-stone-900"
                            }`}
                          >
                            Mua thanh lý
                          </button>
                        </div>

                        {/* ====================================================
                            MỤC 1: THỊNH HÀNH TUẦN NÀY (HIỆU ỨNG RỰC RỠ ÁNH KIM & LỬA HOT)
                            ==================================================== */}
                        {trendingItems.length > 0 && (
                          <section className="relative rounded-2xl p-3 bg-gradient-to-br from-amber-50/80 via-white to-rose-50/60 border border-amber-200/90 shadow-[0_8px_24px_rgba(245,158,11,0.12)] space-y-2.5 overflow-hidden">
                            <div className="flex items-center justify-between gap-2 relative z-10">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="w-2 h-4 rounded-full bg-gradient-to-b from-amber-400 via-orange-500 to-rose-500 shadow-[0_0_8px_rgba(249,115,22,0.6)] shrink-0" />
                                <h2 className="font-heading font-extrabold text-[13.5px] bg-gradient-to-r from-stone-950 via-rose-950 to-amber-900 bg-clip-text text-transparent whitespace-nowrap">
                                  Thịnh Hành Tuần Này
                                </h2>
                              </div>

                              <button
                                type="button"
                                onClick={() => setActiveTab("boost")}
                                className="px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-400 via-amber-300 to-orange-400 text-stone-950 text-[10px] font-black shadow-[0_2px_10px_rgba(245,158,11,0.35)] hover:brightness-105 flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0 transition"
                              >
                                <Leaf size={10} className="fill-stone-950 text-stone-950" />
                                <span>Đẩy Top &rarr;</span>
                              </button>
                            </div>

                            <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1 relative z-10">
                              {trendingItems.map((item: any, idx: number) => {
                                const isRent = item.listingTypeRaw !== "SELL";
                                const rentPrice = Number(item.rentalPrice || item.price || 0);
                                const salePrice = Number(item.salePrice || item.price || 0);
                                const curPrice = isRent ? rentPrice : salePrice;
                                const dbOrig = Number(item.originalPrice || item.storeRetailPrice || 0);
                                const origPrice =
                                  dbOrig > curPrice
                                    ? dbOrig
                                    : isRent && curPrice > 0
                                      ? curPrice * 9
                                      : curPrice > 0
                                        ? Math.round(curPrice * 1.6)
                                        : 0;
                                const savedAmt = Math.max(0, origPrice - curPrice);
                                const savedPct =
                                  origPrice > curPrice
                                    ? Math.min(95, Math.max(10, Math.round(((origPrice - curPrice) / origPrice) * 100)))
                                    : 0;
                                const imgUrl = item.image || item.primaryImage || item.images?.[0] || FALLBACK_CLOUDINARY_IMG;

                                return (
                                  <div
                                    key={`trending-${item.id || idx}`}
                                    onClick={() => setSelectedProduct(item)}
                                    className="w-36 shrink-0 p-[1.5px] rounded-2xl bg-gradient-to-br from-amber-400 via-rose-400 to-amber-500 shadow-[0_6px_16px_rgba(244,63,94,0.16)] hover:shadow-[0_8px_22px_rgba(245,158,11,0.28)] transition-all cursor-pointer flex flex-col"
                                  >
                                    <div className="w-full h-full rounded-[14.5px] overflow-hidden bg-white flex flex-col">
                                      <div className="relative w-full aspect-[3/4] bg-stone-100 overflow-hidden">
                                        <Image
                                          src={imgUrl}
                                          alt={item.title}
                                          fill
                                          sizes="144px"
                                          className="object-cover hover:scale-105 transition-transform duration-500"
                                          unoptimized
                                        />

                                        {/* Dải ánh sáng lướt nhẹ qua ảnh (Radiant Sheen) */}
                                        <div
                                          aria-hidden="true"
                                          className="pointer-events-none absolute inset-y-0 w-12 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                                          style={{
                                            animation: `cloopTrendingSheen 3.8s ease-in-out ${idx * 0.45}s infinite`,
                                          }}
                                        />

                                        {/* Huy hiệu Lửa HOT rực rỡ (Không ghi TOP 1, TOP 2) */}
                                        <div className="absolute top-1.5 left-1.5 flex items-center gap-1">
                                          <span
                                            className="bg-gradient-to-r from-orange-500 via-rose-500 to-amber-500 text-white text-[8.5px] font-black px-1.5 py-0.5 rounded-full whitespace-nowrap flex items-center gap-0.5"
                                            style={{ animation: "cloopFlamePulse 2.2s ease-in-out infinite" }}
                                          >
                                            <span>🔥</span>
                                            <span>HOT</span>
                                          </span>
                                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow-2xs whitespace-nowrap ${
                                            isRent ? vibeConfig.rentBadge : vibeConfig.buyBadge
                                          }`}>
                                            {isRent ? "Thuê" : "Mua"}
                                          </span>
                                        </div>

                                        {savedPct > 0 && (
                                          <span className="absolute top-1.5 right-1.5 bg-gradient-to-r from-rose-600 to-orange-500 text-white text-[8.5px] font-black px-1.5 py-0.5 rounded-full shadow-2xs font-mono whitespace-nowrap">
                                            -{savedPct}%
                                          </span>
                                        )}
                                      </div>

                                      <div className="p-2 space-y-1 flex-1 flex flex-col justify-between bg-white">
                                        <p className="text-[11px] font-bold text-stone-900 line-clamp-1">
                                          {item.title}
                                        </p>

                                        <div className="space-y-0.5">
                                          <div className="flex items-baseline justify-between gap-1">
                                            <div className="flex items-baseline gap-0.5">
                                              <span className={`font-heading font-black text-[12px] ${vibeConfig.priceText} whitespace-nowrap`}>
                                                {curPrice.toLocaleString("vi-VN")}đ
                                              </span>
                                              {isRent && (
                                                <span className="text-[8.5px] text-stone-500 font-semibold">/ng</span>
                                              )}
                                            </div>
                                            {origPrice > curPrice && (
                                              <span className="text-[8.5px] text-stone-400 line-through font-mono whitespace-nowrap">
                                                {origPrice.toLocaleString("vi-VN")}đ
                                              </span>
                                            )}
                                          </div>

                                          {savedAmt > 0 && (
                                            <div className="bg-gradient-to-r from-rose-50 to-amber-50/80 border border-rose-200/80 px-1.5 py-0.5 rounded text-[8.5px] font-bold text-rose-700 font-mono whitespace-nowrap">
                                              Tiết kiệm {savedAmt.toLocaleString("vi-VN")}đ
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </section>
                        )}

                        {/* ====================================================
                            MỤC 2: THUÊ THEO NGÀY
                            ==================================================== */}
                        {listingMode !== "sell" && smartRentItems.length > 0 && (() => {
                          const displayedRent = listingMode === "rent" ? smartRentItems : smartRentItems.slice(0, 6);
                          return (
                            <section className="space-y-2.5">
                              <div className="flex items-center justify-between gap-2 px-0.5">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="w-2 h-4 rounded-full bg-[#1B4332] shrink-0" />
                                  <h2 className="font-heading font-extrabold text-[13.5px] text-stone-900 whitespace-nowrap">
                                    Thuê Theo Ngày
                                  </h2>
                                </div>

                                {smartRentItems.length > 6 && (
                                  <button
                                    type="button"
                                    onClick={() => setListingMode(listingMode === "rent" ? "all" : "rent")}
                                    className="text-[10.5px] font-bold text-stone-600 hover:text-stone-900 cursor-pointer whitespace-nowrap shrink-0"
                                  >
                                    {listingMode === "rent" ? "Thu gọn" : "Xem tất cả \u2192"}
                                  </button>
                                )}
                              </div>

                              <div className="grid grid-cols-2 gap-2.5">
                                {displayedRent.map(renderLuxuryCompactProductCard)}
                              </div>
                            </section>
                          );
                        })()}

                        {/* ====================================================
                            MỤC 3: MUA THANH LÝ
                            ==================================================== */}
                        {listingMode !== "rent" && smartSaleItems.length > 0 && (() => {
                          const displayedSale = listingMode === "sell" ? smartSaleItems : smartSaleItems.slice(0, 6);
                          return (
                            <section className="space-y-2.5 pt-1">
                              <div className="flex items-center justify-between gap-2 px-0.5">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="w-2 h-4 rounded-full bg-rose-600 shrink-0" />
                                  <h2 className="font-heading font-extrabold text-[13.5px] text-stone-900 whitespace-nowrap">
                                    Mua Thanh Lý
                                  </h2>
                                </div>

                                {smartSaleItems.length > 6 && (
                                  <button
                                    type="button"
                                    onClick={() => setListingMode(listingMode === "sell" ? "all" : "sell")}
                                    className="text-[10.5px] font-bold text-stone-600 hover:text-stone-900 cursor-pointer whitespace-nowrap shrink-0"
                                  >
                                    {listingMode === "sell" ? "Thu gọn" : "Xem tất cả \u2192"}
                                  </button>
                                )}
                              </div>

                              <div className="grid grid-cols-2 gap-2.5">
                                {displayedSale.map(renderLuxuryCompactProductCard)}
                              </div>
                            </section>
                          );
                        })()}
                      </div>
                    );
                  })()}
                </>
              )}
            </div>

            {/* THANH TÓM TẮT GIỎ ĐỒ NỔI THÔNG MINH (TỰ ĐỘNG HIỆN KHI KHÁCH CHỌN MÓN) */}
            {cartItems.length > 0 && (
              <div className="sticky bottom-14 inset-x-0 px-3 pb-1.5 z-30">
                <div className={`${vibeConfig.activePill} rounded-xl px-3 py-2 shadow-lg flex items-center justify-between gap-2`}>
                  <div className="text-[11px] leading-tight">
                    <span className="font-bold">Giỏ đồ: {cartItems.length} món</span>
                    <span className="mx-1.5 opacity-60">&bull;</span>
                    <span className="font-mono font-bold">
                      {cartItems.reduce((sum: number, item: any) => sum + calculatePackageRentalFee(item, item.minDays || 3), 0).toLocaleString("vi-VN")}đ
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("orders");
                      setOrderSubTab("cart");
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white text-stone-900 text-[10.5px] font-extrabold whitespace-nowrap cursor-pointer"
                  >
                    Xem giỏ &amp; Đặt lịch &rarr;
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ========================================================
             TAB 2: SÀN ĐỒ (SHOP) - HIỂN THỊ NGAY LƯỚI SẢN PHẨM KHÔNG LẶP THANH BAR
            ======================================================== */}
        {activeTab === "shop" && (
          <div className="px-3 pt-2.5 pb-6 flex-1">
            {filteredProducts.length === 0 ? (
              <div className="py-12 text-center text-stone-500 bg-white rounded-3xl border border-stone-200/80 p-6 space-y-2">
                <p className="text-xs font-bold text-stone-700">Không tìm thấy trang phục phù hợp</p>
                <button
                  onClick={() => { setListingMode("all"); setSelectedOccasion("Tất cả"); setSearchQuery(""); }}
                  className={`mt-1 px-3.5 py-1.5 ${vibeConfig.primaryBtn} text-xs font-bold rounded-full cursor-pointer`}
                >
                  Đặt lại bộ lọc
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                {filteredProducts.map(renderLuxuryCompactProductCard)}
              </div>
            )}
          </div>
        )}

        {/* ========================================================
             PHÂN HỆ RIÊNG: KHU MUA LÁ & ĐẨY TOP TỦ ĐỒ (BOOST HUB)
            ======================================================== */}
        {activeTab === "boost" && (
          <LeafBoostHub
            currentUser={currentUser}
            userCoins={closetData?.user?.cloopCoins || 0}
            walletBalance={closetData?.user?.walletBalance || 0}
            myProducts={safeMyProducts}
            marketProducts={products}
            onOpenAuth={() => setShowAuthModal(true)}
            onOpenCreateProduct={handleOpenCreateModal}
            onSelectProduct={(prod) => setSelectedProduct(prod)}
            onBoostSuccess={handleBoostSuccess}
            onRefreshUser={refreshPersonalData}
          />
        )}

        {/* ========================================================
             TAB 4: ĐƠN HÀNG & LỊCH THUÊ (ĐỒNG BỘ /my-closet/orders & GIỎ THUÊ)
            ======================================================== */}
        {activeTab === "orders" && (
          <div className="p-3.5 space-y-3.5 flex-1">
            {/* SUB-TABS: ĐỒ ĐI THUÊ | ĐỒ CHO THUÊ | GIỎ THUÊ */}
            <div className="flex bg-white/80 backdrop-blur-md border border-stone-200/80 p-1 rounded-2xl gap-1 shadow-2xs">
              <button
                onClick={() => setOrderSubTab("renter")}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1 ${
                  orderSubTab === "renter" 
                    ? vibeConfig.pillActive
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                <span>Đồ đi thuê ({closetData?.ordersAsRenter?.length || 0})</span>
              </button>
              <button
                onClick={() => setOrderSubTab("lender")}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1 ${
                  orderSubTab === "lender" 
                    ? vibeConfig.pillActive
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                <span>Cho thuê ({closetData?.ordersAsLender?.length || 0})</span>
              </button>
              <button
                onClick={() => setOrderSubTab("cart")}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1 relative ${
                  orderSubTab === "cart" 
                    ? vibeConfig.pillActive
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                <span>Giỏ đồ ({cartItems.length})</span>
                {cartItems.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                )}
              </button>
            </div>

            {/* SUB-CONTENT 1: ĐỒ ĐI THUÊ */}
            {orderSubTab === "renter" && (
              <div className="space-y-3">
                {safeOrdersAsRenter.length === 0 ? (
                  <div className="py-12 text-center bg-white rounded-3xl border border-stone-200/80 p-6 space-y-3 text-stone-500 shadow-xs">
                    <h4 className="font-bold text-sm text-stone-800">
                      {lang === "vi" ? "Chưa có đơn thuê trang phục nào" : "No rental orders yet"}
                    </h4>
                    <p className="text-xs text-stone-500 max-w-xs mx-auto">
                      {lang === "vi" ? "Dạo Sàn đồ CLOOP để chọn đầm dạ hội, áo dài và phụ kiện cho sự kiện sắp tới của bạn." : "Browse CLOOP to find dresses and outfits for your next event."}
                    </p>
                    <button
                      onClick={() => setActiveTab("shop")}
                      className={`px-5 py-2.5 text-xs font-bold rounded-full cursor-pointer ${vibeConfig.primaryBtn}`}
                    >
                      {lang === "vi" ? "Dạo Sàn Đồ Ngay" : "Browse Shop Now"}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {safeOrdersAsRenter.map((order: any, idx: number) => {
                      const statusInfo = formatOrderStatus(order.status, order.isOverdue);
                      return (
                        <div 
                          key={order.id || idx} 
                          onClick={() => {
                            setSelectedOrderForDetail(order);
                            setOrderDetailRole("renter");
                          }}
                          className="bg-white rounded-2xl p-3.5 border border-stone-200/80 hover:border-stone-400 shadow-2xs space-y-2.5 transition cursor-pointer active:scale-[0.99] group"
                        >
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-mono text-stone-400 font-medium">Đơn #{order.orderCode || order.id?.slice(-6) || idx + 1}</span>
                            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border shadow-2xs ${statusInfo.badgeClass}`}>
                              {statusInfo.label}
                            </span>
                          </div>
                          <div className="flex gap-3 items-center">
                            <div className="relative w-14 h-16 rounded-xl overflow-hidden bg-stone-100 shrink-0 border border-stone-200 shadow-2xs">
                              <Image src={order.productImage || FALLBACK_CLOUDINARY_IMG} alt={order.productTitle || "Trang phục"} fill className="object-cover" unoptimized />
                            </div>
                            <div className="flex-1 min-w-0 text-xs">
                              <h5 className="font-bold text-stone-900 truncate transition">{order.productTitle}</h5>
                              <p className="text-stone-500 text-[11px] mt-0.5">Lịch thuê: {order.startDate} - {order.endDate}</p>
                              <div className="flex items-center justify-between mt-1">
                                <span className={`font-black ${vibeConfig.priceColor}`}>{(Number(order.amount) || 0).toLocaleString("vi-VN")}đ</span>
                                <span className={`text-[10.5px] font-bold group-hover:underline flex items-center gap-0.5 ${vibeConfig.accentText}`}>
                                  <span>Xem chi tiết</span>
                                  <span>&rarr;</span>
                                </span>
                              </div>
                            </div>
                          </div>
                          {order.isOverdue && order.status !== "LENDER_COMPLETED" && (
                            <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[10.5px] text-stone-600 font-medium">
                              <span>Đã qua hạn thuê ({order.endDate})</span>
                              <span className={`underline font-bold ${vibeConfig.accentText}`}>Bấm để cập nhật &rarr;</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* SUB-CONTENT 2: ĐỒ CHO THUÊ */}
            {orderSubTab === "lender" && (
              <div className="space-y-3">
                {safeOrdersAsLender.length === 0 ? (
                  <div className="py-12 text-center bg-white rounded-3xl border border-stone-200/80 p-6 space-y-3 text-stone-500 shadow-xs">
                    <h4 className="font-bold text-sm text-stone-800">
                      {lang === "vi" ? "Chưa có khách đặt thuê đồ" : "No rental bookings yet"}
                    </h4>
                    <p className="text-xs text-stone-500 max-w-xs mx-auto">
                      {lang === "vi" ? "Đăng thêm đầm tiệc vào kệ đồ để bắt đầu tạo thu nhập thụ động tuần hoàn." : "Add more dresses to your closet to start earning passive income."}
                    </p>
                    <button
                      onClick={handleOpenCreateModal}
                      className={`px-5 py-2.5 text-xs font-bold rounded-full cursor-pointer ${vibeConfig.primaryBtn}`}
                    >
                      {lang === "vi" ? "+ Đăng Trang Phục Mới" : "+ List New Outfit"}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {safeOrdersAsLender.map((order: any, idx: number) => {
                      const statusInfo = formatOrderStatus(order.status, order.isOverdue);
                      return (
                        <div 
                          key={order.id || idx} 
                          onClick={() => {
                            setSelectedOrderForDetail(order);
                            setOrderDetailRole("lender");
                          }}
                          className="bg-white rounded-2xl p-3.5 border border-stone-200/80 hover:border-stone-400 shadow-2xs space-y-2.5 transition cursor-pointer active:scale-[0.99] group"
                        >
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-mono text-stone-400 font-medium">Yêu cầu #{order.orderCode || order.id?.slice(-6) || idx + 1}</span>
                            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border shadow-2xs ${statusInfo.badgeClass}`}>
                              {statusInfo.label}
                            </span>
                          </div>
                          <div className="flex gap-3 items-center">
                            <div className="relative w-14 h-16 rounded-xl overflow-hidden bg-stone-100 shrink-0 border border-stone-200 shadow-2xs">
                              <Image src={order.productImage || FALLBACK_CLOUDINARY_IMG} alt={order.productTitle || "Trang phục"} fill className="object-cover" unoptimized />
                            </div>
                            <div className="flex-1 min-w-0 text-xs">
                              <h5 className="font-bold text-stone-900 truncate transition">{order.productTitle}</h5>
                              <p className="text-stone-500 text-[11px] mt-0.5">Lịch: {order.startDate} - {order.endDate}</p>
                              <div className="flex items-center justify-between mt-1">
                                <span className={`font-black ${vibeConfig.priceColor}`}>{(Number(order.amount) || 0).toLocaleString("vi-VN")}đ</span>
                                <span className={`text-[10.5px] font-bold group-hover:underline flex items-center gap-0.5 ${vibeConfig.accentText}`}>
                                  <span>Xem chi tiết</span>
                                  <span>&rarr;</span>
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* SUB-CONTENT 3: GIỎ THUÊ HIỆN TẠI */}
            {orderSubTab === "cart" && (
              <div className="space-y-3">
                {cartItems.length === 0 ? (
                  <div className="py-12 text-center space-y-3 bg-white rounded-3xl border border-stone-200/80 p-6 shadow-xs">
                    <h4 className="font-bold text-sm text-stone-800">Giỏ thuê của bạn đang trống</h4>
                    <p className="text-xs text-stone-500 max-w-xs mx-auto">
                      Hãy dạo Sàn đồ để chọn những mẫu trang phục ưng ý.
                    </p>
                    <button
                      onClick={() => setActiveTab("shop")}
                      className={`px-5 py-2.5 text-xs font-bold rounded-full cursor-pointer ${vibeConfig.primaryBtn}`}
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
                      const itemImg = item.image || item.primaryImage || item.images?.[0] || FALLBACK_CLOUDINARY_IMG;
                      const packageFee = calculatePackageRentalFee(item, item.minDays || 3);
                      return (
                        <div key={idx} className="bg-white rounded-2xl p-3 border border-stone-200/80 shadow-2xs flex gap-3 items-center">
                          <div className="relative w-16 h-20 rounded-xl overflow-hidden bg-stone-100 shrink-0">
                            <Image src={itemImg} alt={item.title} fill className="object-cover" unoptimized />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-[9.5px] font-bold text-stone-700 bg-stone-100 px-1.5 py-0.5 rounded">
                              {item.occasion || "Đi tiệc"}
                            </span>
                            <p className={`text-xs font-black mt-1 ${vibeConfig.priceColor}`}>
                              {(item.rentalPrice || item.price || 0).toLocaleString("vi-VN")}đ <span className="text-[10px] font-normal text-stone-500">/ ngày</span>
                            </p>
                            <p className={`text-[10px] font-bold ${vibeConfig.accentText}`}>
                              Gói {item.minDays || 3} ngày: {packageFee.toLocaleString("vi-VN")}đ
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

                    <div className="bg-white rounded-2xl p-4 border border-stone-200 space-y-2 mt-4 shadow-xs">
                      <div className="flex justify-between text-xs text-stone-600">
                        <span>Tạm tính phí thuê (gói 3 ngày):</span>
                        <span className="font-bold text-stone-900">
                          {cartItems.reduce((sum, item) => sum + calculatePackageRentalFee(item, item.minDays || 3), 0).toLocaleString("vi-VN")}đ
                        </span>
                      </div>
                      <div className="flex justify-between text-xs text-stone-600">
                        <span>Bảo vệ cọc Escrow:</span>
                        <span className={`font-bold ${vibeConfig.accentText}`}>Miễn phí 100%</span>
                      </div>
                      <div className="pt-2 border-t border-stone-100 flex justify-between items-center">
                        <span className="font-bold text-sm text-stone-900">Tổng thanh toán:</span>
                        <span className={`font-heading font-black text-base ${vibeConfig.priceColor}`}>
                          {cartItems.reduce((sum, item) => sum + calculatePackageRentalFee(item, item.minDays || 3), 0).toLocaleString("vi-VN")}đ
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          if (cartItems.length > 0) {
                            handleOpenCheckout(cartItems[0]);
                          }
                        }}
                        className={`w-full h-11 font-bold text-xs rounded-full mt-2 flex items-center justify-center gap-2 cursor-pointer transition ${vibeConfig.primaryBtn}`}
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
             TAB 5: TỦ ĐỒ CÁ NHÂN (CHIA THEO CÁC THANH QUẢN LÝ THOÁNG ĐÃNG NHƯ BẢN WEB)
            ======================================================== */}
        {activeTab === "closet" && (
          <div className="p-3.5 space-y-3.5 flex-1">
            
            {/* THẺ ĐĂNG NHẬP / ĐĂNG KÝ (NẾU CHƯA CÓ SESSION) */}
            {!currentUser && !closetData?.isLoggedIn ? (
              <div className={`${vibeConfig.heroBg} ${vibeConfig.heroText} rounded-[28px] p-5 space-y-4 relative overflow-hidden shadow-sm border ${vibeConfig.heroBorder}`}>
                <div>
                  <span className={`text-[10px] uppercase font-bold tracking-widest ${vibeConfig.heroAccentText}`}>
                    TỦ ĐỒ TUẦN HOÀN CLOOP
                  </span>
                  <h3 className={`font-heading font-black text-xl ${vibeConfig.heroText} mt-1 leading-tight`}>
                    Tủ Đồ Cá Nhân &amp; Ví Ký Quỹ
                  </h3>
                  <p className={`text-xs ${vibeConfig.heroSubtext} mt-1 leading-relaxed`}>
                    Đăng nhập hoặc đăng ký tài khoản để quản lý tủ đồ, theo dõi lịch khách thuê và số dư ví trên sàn.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => openAuthModal ? openAuthModal('register') : setShowAuthModal(true)}
                    className={`py-3 px-2 rounded-full font-bold text-xs tracking-wider uppercase cursor-pointer text-center flex items-center justify-center gap-1 ${vibeConfig.primaryBtn}`}
                  >
                    <span>Đăng Ký Mới</span>
                  </button>
                  <button
                    onClick={() => openAuthModal ? openAuthModal('login') : setShowAuthModal(true)}
                    className={`py-3 px-2 rounded-full font-bold text-xs tracking-wider uppercase shadow-2xs transition cursor-pointer text-center flex items-center justify-center gap-1 ${vibeConfig.heroSecondaryBtn}`}
                  >
                    <span>Đăng Nhập</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* 1. THẺ HỒ SƠ TÓM TẮT TINH TẾ */}
                <div className={`${vibeConfig.heroBg} ${vibeConfig.heroText} rounded-[28px] p-4 space-y-3 shadow-sm border ${vibeConfig.heroBorder} relative overflow-hidden`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-full ${vibeConfig.heroChipBg} flex items-center justify-center font-heading font-black text-lg border-2 border-white overflow-hidden shrink-0 shadow-xs`}>
                        {closetData?.user?.avatar && typeof closetData.user.avatar === "string" && closetData.user.avatar.trim() !== "" ? (
                          <Image src={closetData.user.avatar} alt="Avatar" width={48} height={48} className="object-cover" unoptimized />
                        ) : (
                          displayName ? displayName[0].toUpperCase() : "C"
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h2 className={`font-heading font-black text-base ${vibeConfig.heroText} truncate max-w-[170px]`}>
                            {displayName || "Thành viên CLOOP"}
                          </h2>
                          <span className={`text-[9px] ${vibeConfig.heroChipBg} px-2 py-0.5 rounded-full font-bold shrink-0`}>
                            Chính chủ
                          </span>
                        </div>
                        <p className={`text-[11px] ${vibeConfig.heroSubtext} truncate max-w-[190px]`}>
                          {closetData?.user?.email || currentUser?.email || "member@cloop.vn"}
                        </p>
                        <p className={`text-[10px] ${vibeConfig.heroSubtext} mt-0.5 truncate max-w-[210px]`}>
                          Gia nhập: {closetData?.user?.joinDate || "2026"} &bull; {
                            (unifiedAddress.district && unifiedAddress.province)
                              ? `${unifiedAddress.district}, ${unifiedAddress.province}`
                              : (unifiedAddress.province || closetData?.user?.location || closetData?.user?.pickupAddress || closetData?.user?.fullAddress || "TP. Vinh, Nghệ An")
                          }
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={refreshPersonalData}
                      disabled={isRefreshingCloset}
                      className={`p-2 rounded-full ${vibeConfig.heroChipBg} transition cursor-pointer`}
                      title="Làm mới dữ liệu"
                    >
                      <RefreshCw size={13} className={isRefreshingCloset ? "animate-spin" : ""} />
                    </button>
                  </div>

                  {/* 3 Viên nang số liệu cốt lõi */}
                  <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-black/5 text-center">
                    <button 
                      onClick={() => setActiveClosetView("wallet")}
                      className={`${vibeConfig.heroChipBg} hover:opacity-90 transition rounded-2xl py-2 px-1 cursor-pointer text-center`}
                    >
                      <span className={`text-[9px] ${vibeConfig.heroSubtext} block`}>Ví Ký Quỹ</span>
                      <p className={`font-mono font-bold text-xs ${vibeConfig.heroText} mt-0.5 truncate`}>
                        {(closetData?.user?.walletBalance || 0).toLocaleString("vi-VN")}₫
                      </p>
                    </button>
                    <button 
                      onClick={() => setActiveClosetView("wallet")}
                      className={`${vibeConfig.heroChipBg} hover:opacity-90 transition rounded-2xl py-2 px-1 cursor-pointer text-center`}
                    >
                      <span className={`text-[9px] ${vibeConfig.heroSubtext} block`}>Điểm thưởng</span>
                      <p className={`font-mono font-bold text-xs ${vibeConfig.heroText} mt-0.5 truncate`}>
                        {(closetData?.user?.cloopCoins || 0).toLocaleString("vi-VN")} Pts
                      </p>
                    </button>
                    <button 
                      onClick={() => setActiveClosetView("items")}
                      className={`${vibeConfig.heroChipBg} hover:opacity-90 transition rounded-2xl py-2 px-1 cursor-pointer text-center`}
                    >
                      <span className={`text-[9px] ${vibeConfig.heroSubtext} block`}>Tủ đồ</span>
                      <p className={`font-mono font-bold text-xs ${vibeConfig.heroText} mt-0.5 truncate`}>
                        {safeMyProducts.length} món
                      </p>
                    </button>
                  </div>
                </div>

                {/* ========================================================
                    2. DANH MỤC QUẢN LÝ (TỐI GIẢN TỪ KHÓA, GỌN GÀNG, DỄ DÙNG)
                    ======================================================== */}
                {activeClosetView === "menu" ? (
                  <div className="space-y-2 pt-1">
                    
                    {/* 😊 LỜI NHẮC CHỈ DẪN THÂN THIỆN */}
                    {showWelcomeTip && (
                      <div className="bg-[#FAF9F5] border border-stone-200/90 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs text-stone-800 shadow-2xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Info size={15} className="text-stone-600 shrink-0" />
                          <p className="text-[11.5px] leading-relaxed text-stone-700">
                            Chào bạn ghé CLOOP! Bấm vào <strong>Tủ đồ</strong> để chia sẻ trang phục hoặc vào <strong>Ví Lá</strong> nhận quà làm quen nhé.
                          </p>
                        </div>
                        <button
                          onClick={handleCloseWelcomeTip}
                          className="p-1 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-200/60 transition shrink-0 cursor-pointer"
                          title="Đóng"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}

                    {/* MỤC 1: TỦ ĐỒ CỦA TÔI */}
                    <button
                      onClick={() => setActiveClosetView("items")}
                      className="w-full bg-white rounded-2xl p-3.5 border border-stone-200/80 shadow-2xs flex items-center justify-between hover:border-[#183A2D]/50 transition active:scale-[0.99] cursor-pointer text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-stone-100 text-[#183A2D] flex items-center justify-center shrink-0">
                          <Shirt size={17} />
                        </div>
                        <span className="text-xs font-semibold text-stone-900 group-hover:text-[#183A2D] transition-colors">
                          Tủ đồ của tôi
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[11px] font-medium text-stone-600 bg-stone-100 px-2.5 py-0.5 rounded-full">
                          {safeMyProducts.length} món
                        </span>
                        <ChevronRight size={15} className="text-stone-400 group-hover:text-[#183A2D] transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </button>

                    {/* MỤC 2: ĐƠN HÀNG */}
                    <button
                      onClick={() => setActiveClosetView("orders")}
                      className="w-full bg-white rounded-2xl p-3.5 border border-stone-200/80 shadow-2xs flex items-center justify-between hover:border-[#183A2D]/50 transition active:scale-[0.99] cursor-pointer text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-stone-100 text-[#183A2D] flex items-center justify-center shrink-0">
                          <Package size={17} />
                        </div>
                        <span className="text-xs font-semibold text-stone-900 group-hover:text-[#183A2D] transition-colors">
                          Đơn hàng &amp; Thuê đồ
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[11px] font-medium text-stone-600 bg-stone-100 px-2.5 py-0.5 rounded-full">
                          {(closetData?.ordersAsLender?.length || 0) + (closetData?.ordersAsRenter?.length || 0)} đơn
                        </span>
                        <ChevronRight size={15} className="text-stone-400 group-hover:text-[#183A2D] transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </button>

                    {/* MỤC 3: VÍ TIỀN & RÚT TIỀN */}
                    <button
                      onClick={() => setActiveClosetView("wallet")}
                      className="w-full bg-white rounded-2xl p-3.5 border border-stone-200/80 shadow-2xs flex items-center justify-between hover:border-[#183A2D]/50 transition active:scale-[0.99] cursor-pointer text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-stone-100 text-[#183A2D] flex items-center justify-center shrink-0">
                          <Wallet size={17} />
                        </div>
                        <span className="text-xs font-semibold text-stone-900 group-hover:text-[#183A2D] transition-colors">
                          Ví tiền &amp; Rút tiền
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[11px] font-bold text-[#183A2D] bg-[#183A2D]/5 px-2.5 py-0.5 rounded-full font-mono">
                          {(closetData?.user?.walletBalance || 0).toLocaleString("vi-VN")}₫
                        </span>
                        <ChevronRight size={15} className="text-stone-400 group-hover:text-[#183A2D] transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </button>

                    {/* MỤC 4: ĐIỂM LÁ CLOOP (NẠP & ĐẨY BÀI) */}
                    <button
                      onClick={() => {
                        setActiveTab("boost");
                      }}
                      className="w-full bg-white rounded-2xl p-3.5 border border-stone-200/80 shadow-2xs flex items-center justify-between hover:border-[#183A2D]/50 transition active:scale-[0.99] cursor-pointer text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-stone-100 text-[#183A2D] flex items-center justify-center shrink-0">
                          <TrendingUp size={16} />
                        </div>
                        <span className="text-xs font-semibold text-stone-900 group-hover:text-[#183A2D] transition-colors">
                          Nạp Lá Đẩy Bài Lên Top
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[11px] font-bold text-[#183A2D] bg-[#183A2D]/5 px-2.5 py-0.5 rounded-full font-mono">
                          {(closetData?.user?.cloopCoins || 0).toLocaleString("vi-VN")} Lá
                        </span>
                        <ChevronRight size={15} className="text-stone-400 group-hover:text-[#183A2D] transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </button>

                    {/* MỤC 5: ĐỊA CHỈ GIAO NHẬN */}
                    <button
                      onClick={() => setActiveClosetView("profile")}
                      className="w-full bg-white rounded-2xl p-3.5 border border-stone-200/80 shadow-2xs flex items-center justify-between hover:border-[#183A2D]/50 transition active:scale-[0.99] cursor-pointer text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-stone-100 text-[#183A2D] flex items-center justify-center shrink-0">
                          <MapPin size={17} />
                        </div>
                        <span className="text-xs font-semibold text-stone-900 group-hover:text-[#183A2D] transition-colors">
                          Địa chỉ giao nhận
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[11px] font-medium text-stone-500 truncate max-w-[120px]">
                          {unifiedAddress.province || "Cài đặt"}
                        </span>
                        <ChevronRight size={15} className="text-stone-400 group-hover:text-[#183A2D] transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </button>

                    {/* MỤC 6: TÁC ĐỘNG SINH THÁI */}
                    <button
                      onClick={() => setActiveClosetView("eco")}
                      className="w-full bg-white rounded-2xl p-3.5 border border-stone-200/80 shadow-2xs flex items-center justify-between hover:border-[#183A2D]/50 transition active:scale-[0.99] cursor-pointer text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-stone-100 text-[#183A2D] flex items-center justify-center shrink-0">
                          <Droplet size={17} />
                        </div>
                        <span className="text-xs font-semibold text-stone-900 group-hover:text-[#183A2D] transition-colors">
                          Tác động sinh thái
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[11px] font-medium text-stone-600 bg-stone-100 px-2.5 py-0.5 rounded-full">
                          {closetData?.stats?.greenPoints || 120} pts
                        </span>
                        <ChevronRight size={15} className="text-stone-400 group-hover:text-[#183A2D] transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </button>

                    {/* NÚT ĐĂNG TRANG PHỤC MỚI */}
                    <button
                      onClick={() => {
                        if (!currentUser) {
                          setShowAuthModal(true);
                        } else {
                          handleOpenCreateModal();
                        }
                      }}
                      className="w-full bg-[#183A2D] hover:bg-[#112a20] text-white rounded-2xl p-3.5 shadow-sm flex items-center justify-center gap-2 transition active:scale-[0.99] cursor-pointer mt-3"
                    >
                      <Plus size={16} className="text-white" />
                      <span className="text-xs font-bold text-white tracking-wide uppercase">
                        Đăng trang phục mới
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
                      type="button"
                      onClick={() => setActiveClosetView("menu")}
                      className="flex items-center gap-1.5 text-xs font-bold text-[#16442C] hover:underline cursor-pointer py-1"
                    >
                      <ArrowLeft size={16} />
                      <span>Quay lại</span>
                    </button>

                    {/* CHI TIẾT PHÂN MỤC 1: KỆ ĐỒ CỦA TÔI */}
                    {/* CHI TIẾT PHÂN MỤC 1: KỆ ĐỒ CỦA TÔI */}
                    {activeClosetView === "items" && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                          <div>
                            <h4 className="font-heading font-black text-sm uppercase tracking-wider text-[#16442C]">
                              Kệ Đồ Của Bạn ({safeMyProducts.length})
                            </h4>
                            <p className="text-[10px] text-stone-500">
                              Quản lý trang phục, đổi trạng thái ẩn/hiện hoặc xóa bài
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              if (!currentUser) {
                                setShowAuthModal(true);
                              } else {
                                handleOpenCreateModal();
                              }
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-[#1E5638] text-white text-xs font-bold shadow-xs hover:bg-[#236341] transition flex items-center gap-1 cursor-pointer active:scale-95"
                          >
                            <Plus size={13} strokeWidth={3} />
                            <span>Đăng đồ mới</span>
                          </button>
                        </div>

                        {/* TABS PHÂN LOẠI ĐỒNG BỘ 100% VỚI BẢN WEB */}
                        <div className="flex bg-stone-200/70 p-1 rounded-2xl gap-1 overflow-x-auto no-scrollbar">
                          {[
                            { id: "ALL", label: `Tất cả (${safeMyProducts.length})` },
                            { id: "RENTING", label: `Cho thuê (${safeMyProducts.filter((p: any) => (p.rentalPrice > 0 || p.isRentalActive) && !p.isShopHidden).length})` },
                            { id: "SELLING", label: `Đang bán (${safeMyProducts.filter((p: any) => (p.salePrice > 0 || p.isSaleActive) && !p.isShopHidden).length})` },
                            { id: "HIDDEN", label: `Đã ẩn (${safeMyProducts.filter((p: any) => p.isShopHidden).length})` },
                          ].map(tab => (
                            <button
                              key={tab.id}
                              type="button"
                              onClick={() => setMyItemsFilterTab(tab.id as any)}
                              className={`flex-1 py-1.5 px-2 text-[10.5px] font-bold rounded-xl transition whitespace-nowrap cursor-pointer text-center ${
                                myItemsFilterTab === tab.id
                                  ? "bg-[#1E5638] text-white shadow-xs"
                                  : "text-stone-600 hover:text-stone-900"
                              }`}
                            >
                              {tab.label}
                            </button>
                          ))}
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
                              onClick={() => {
                                if (!currentUser) {
                                  setShowAuthModal(true);
                                } else {
                                  handleOpenCreateModal();
                                }
                              }}
                              className="mt-2 px-4 py-2 bg-[#1E5638] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                            >
                              <Plus size={14} />
                              <span>{lang === "vi" ? "Đăng món đồ đầu tiên vào tủ" : "+ List First Outfit"}</span>
                            </button>
                          </div>
                        ) : filteredMyProducts.length === 0 ? (
                          <div className="p-6 text-center bg-white rounded-2xl border border-stone-200/80 text-stone-500 text-xs space-y-1">
                            <p className="font-bold text-stone-700">Không có trang phục nào trong mục này</p>
                            <p className="text-[11px] text-stone-400">Chọn tab khác hoặc đăng thêm trang phục mới vào tủ đồ.</p>
                          </div>
                        ) : (
                          <div className="space-y-2.5">
                            {filteredMyProducts.map((item: any, idx: number) => {
                              const isHidden = Boolean(item.isShopHidden);
                              const isDeleting = deletingProductId === item.id;
                              const isToggling = togglingProductId === item.id;

                              return (
                                <div
                                  key={item.id || idx}
                                  className="bg-white rounded-2xl p-3 border border-stone-200/80 shadow-2xs space-y-2.5"
                                >
                                  <div className="flex gap-3 items-center">
                                    <div className="relative w-16 h-20 rounded-xl overflow-hidden bg-stone-100 shrink-0 border border-stone-100">
                                      <Image src={item.image || FALLBACK_CLOUDINARY_IMG} alt={item.title || "Trang phục"} fill className="object-cover" unoptimized />
                                      {isHidden ? (
                                        <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center">
                                          <span className="text-[8px] font-bold text-white bg-stone-900/80 px-1 py-0.5 rounded">
                                            Đã ẩn
                                          </span>
                                        </div>
                                      ) : Boolean(item.boostExpiresAt && new Date(item.boostExpiresAt) > new Date()) ? (
                                        <div className="absolute top-1 left-1 bg-[#183A2D] text-white font-bold text-[8px] px-1.5 py-0.5 rounded shadow-xs tracking-wider uppercase">
                                          TOP
                                        </div>
                                      ) : null}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded">
                                          {item.occasion || "Đi tiệc"}
                                        </span>
                                        <span className="text-[9px] font-medium text-stone-500">
                                          Size {item.size || "M"}
                                        </span>
                                        {isHidden ? (
                                          <span className="text-[8.5px] bg-stone-100 text-stone-600 font-bold px-1.5 py-0.2 rounded ml-auto">
                                            Đã ẩn khỏi sàn
                                          </span>
                                        ) : Boolean(item.boostExpiresAt && new Date(item.boostExpiresAt) > new Date()) ? (
                                          <span className="text-[8.5px] bg-[#183A2D] text-white font-bold px-1.5 py-0.2 rounded ml-auto flex items-center gap-0.5">
                                            <TrendingUp size={9} />
                                            <span>Đang Top</span>
                                          </span>
                                        ) : (
                                          <span className="text-[8.5px] bg-emerald-100 text-emerald-900 font-bold px-1.5 py-0.2 rounded ml-auto">
                                            Đang hiển thị
                                          </span>
                                        )}
                                      </div>
                                      <h4 className="text-xs font-bold text-stone-900 truncate mt-1">{item.title}</h4>
                                      <p className="text-xs font-black text-[#16442C] mt-0.5">
                                        {item.rentalPrice ? `${item.rentalPrice.toLocaleString("vi-VN")}đ / ngày` : (item.salePrice ? `${item.salePrice.toLocaleString("vi-VN")}đ` : "Liên hệ thuê")}
                                      </p>
                                      {Number(item.originalPrice || 0) > 0 ? (
                                         <p className="text-[9.5px] text-stone-400">
                                           Giá gốc: <span className="line-through">{Number(item.originalPrice).toLocaleString("vi-VN")}đ</span>
                                         </p>
                                       ) : null}
                                      <p className="text-[9.5px] text-stone-400 mt-0.5">
                                        Cọc: {Number(item.deposit || 0) > 0 ? `${Number(item.deposit).toLocaleString("vi-VN")}đ` : "0đ (Miễn cọc)"}
                                      </p>
                                    </div>
                                  </div>

                                  {/* THANH HÀNH ĐỘNG ĐỒNG BỘ: ĐẨY TOP, SỬA, ẨN/HIỆN, XÓA */}
                                  <div className="flex items-center gap-1.5 pt-2 border-t border-stone-100">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setBoostTargetProductId(item.id);
                                        setIsBoostModalOpen(true);
                                      }}
                                      className={`py-1.5 px-2.5 active:scale-95 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition cursor-pointer ${
                                        Boolean(item.boostExpiresAt && new Date(item.boostExpiresAt) > new Date())
                                          ? "bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300"
                                          : "bg-emerald-50 hover:bg-emerald-100 text-[#183A2D] border border-emerald-200/80"
                                      }`}
                                      title="Đẩy bài lên vị trí đầu sàn"
                                    >
                                      <TrendingUp size={12} />
                                      <span>{Boolean(item.boostExpiresAt && new Date(item.boostExpiresAt) > new Date()) ? "Gia hạn" : "Đẩy Top"}</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        handleOpenEditModal(item);
                                      }}
                                      className="flex-1 py-1.5 px-2 bg-stone-100 hover:bg-stone-200 active:scale-95 rounded-xl text-[11px] font-bold text-stone-700 flex items-center justify-center gap-1 transition cursor-pointer"
                                      title="Chỉnh sửa thông tin món đồ"
                                    >
                                      <Edit size={12} className="text-stone-500" />
                                      <span>Sửa</span>
                                    </button>

                                    <button
                                      type="button"
                                      disabled={isToggling}
                                      onClick={() => handleToggleHideProduct(item.id, isHidden)}
                                      className={`flex-1 py-1.5 px-2 active:scale-95 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition cursor-pointer ${
                                        isHidden
                                          ? "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/80"
                                          : "bg-stone-100 hover:bg-stone-200 text-stone-700"
                                      }`}
                                      title={isHidden ? "Hiện lại món đồ lên sàn mua sắm" : "Ẩn món đồ khỏi sàn"}
                                    >
                                      {isToggling ? (
                                        <Loader2 size={12} className="animate-spin text-stone-500" />
                                      ) : isHidden ? (
                                        <>
                                          <Eye size={12} className="text-emerald-700" />
                                          <span>Hiện</span>
                                        </>
                                      ) : (
                                        <>
                                          <EyeOff size={12} className="text-stone-500" />
                                          <span>Ẩn</span>
                                        </>
                                      )}
                                    </button>

                                    <button
                                      type="button"
                                      disabled={isDeleting}
                                      onClick={() => handleDeleteProduct(item.id, item.title)}
                                      className="py-1.5 px-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 active:scale-95 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition cursor-pointer border border-rose-200/60"
                                      title="Xóa vĩnh viễn món đồ khỏi tủ đồ"
                                    >
                                      {isDeleting ? (
                                        <Loader2 size={12} className="animate-spin text-rose-500" />
                                      ) : (
                                        <>
                                          <Trash2 size={12} className="text-rose-600" />
                                          <span>Xóa</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
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
                                ? "bg-[#1E5638] text-white shadow-xs" 
                                : "text-stone-600 hover:text-stone-900"
                            }`}
                          >
                            <span>Khách thuê ({safeOrdersAsLender.length})</span>
                          </button>
                          <button
                            onClick={() => setOrderSubTab("renter")}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1 ${
                              orderSubTab === "renter" 
                                ? "bg-[#1E5638] text-white shadow-xs" 
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
                                      <Image src={order.productImage || FALLBACK_CLOUDINARY_IMG} alt={order.productTitle || "Trang phục"} fill className="object-cover" unoptimized />
                                    </div>
                                    <div className="flex-1 min-w-0 text-xs">
                                      <h5 className="font-bold text-stone-900 truncate">{order.productTitle}</h5>
                                      <p className="text-stone-500 text-[11px] mt-0.5">Lịch: {order.startDate} - {order.endDate}</p>
                                      <div className="flex items-center justify-between mt-1">
                                        <span className="font-black text-[#16442C]">{(Number(order.amount) || 0).toLocaleString("vi-VN")}đ</span>
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
                                      <Image src={order.productImage || FALLBACK_CLOUDINARY_IMG} alt={order.productTitle || "Trang phục"} fill className="object-cover" unoptimized />
                                    </div>
                                    <div className="flex-1 min-w-0 text-xs">
                                      <h5 className="font-bold text-stone-900 truncate">{order.productTitle}</h5>
                                      <p className="text-stone-500 text-[11px] mt-0.5">Thời gian: {order.startDate} - {order.endDate}</p>
                                      <p className="font-black text-[#16442C] mt-1">{(Number(order.amount) || 0).toLocaleString("vi-VN")}đ</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )
                        )}
                      </div>
                    )}

                    {/* CHI TIẾT PHÂN MỤC 3: VÍ THU NHẬP & LIÊN KẾT RÚT TIỀN (ĐỒNG BỘ 100% BẢN WEB) */}
                    {activeClosetView === "wallet" && (
                      <div className="space-y-3">
                        {/* Thẻ Số Dư Ví Thu Nhập */}
                        <div className="bg-gradient-to-br from-[#1E5638] to-[#133c26] rounded-3xl p-5 text-white shadow-md relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none" />
                          <div className="relative z-10 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] text-emerald-200/90 font-bold uppercase tracking-wider flex items-center gap-1.5">
                                <Wallet size={13} className="text-emerald-300" /> Số Dư Ví Thu Nhập
                              </span>
                              <span className="text-[10px] bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 px-2 py-0.5 rounded-full font-bold">
                                Khả Dụng
                              </span>
                            </div>

                            <div>
                              <div className="flex items-baseline gap-1.5">
                                <span className="font-heading font-black text-3xl text-white">
                                  {(closetData?.user?.walletBalance || 0).toLocaleString("vi-VN")}
                                </span>
                                <span className="text-base font-bold text-emerald-300">đ</span>
                              </div>
                              {Boolean(closetData?.user?.pendingWithdrawalBalance && closetData.user.pendingWithdrawalBalance > 0) && (
                                <div className="mt-1 flex items-center gap-1.5 text-[11px] text-amber-200 bg-amber-500/20 border border-amber-400/30 px-2 py-0.5 rounded-lg w-fit">
                                  <RefreshCw size={10} className="animate-spin text-amber-300" />
                                  <span>Đang xử lý rút: {closetData.user.pendingWithdrawalBalance.toLocaleString("vi-VN")}đ</span>
                                </div>
                              )}
                            </div>

                            <p className="text-[11px] text-emerald-100/70 leading-relaxed font-light">
                              Thu nhập nhận được từ các lượt khách thuê và mua đồ trong tủ đồ của bạn. Tiền thuê được tự động giải ngân sau khi hoàn tất đơn.
                            </p>

                            <div className="pt-2 grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  if (!currentUser) {
                                    setShowAuthModal(true);
                                    return;
                                  }
                                  if (!bankForm.bankAccount) {
                                    setIsBankModalOpen(true);
                                  } else {
                                    setIsWithdrawModalOpen(true);
                                  }
                                }}
                                className="w-full py-2.5 bg-white text-[#16442C] text-xs font-bold rounded-xl shadow-xs hover:bg-emerald-50 transition active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5"
                              >
                                <CreditCard size={14} className="text-emerald-700" />
                                <span>Rút Về Ngân Hàng</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  if (!currentUser) {
                                    setShowAuthModal(true);
                                    return;
                                  }
                                  setIsBankModalOpen(true);
                                }}
                                className="w-full py-2.5 bg-white/15 border border-white/20 hover:bg-white/25 text-white text-xs font-bold rounded-xl transition active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5"
                              >
                                <Edit3 size={13} className="text-emerald-200" />
                                <span>{bankForm.bankAccount ? "Đổi STK" : "Liên Kết STK"}</span>
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Thẻ Tài Khoản Ngân Hàng Đã Liên Kết */}
                        {bankForm.bankAccount ? (
                          <div className="bg-white rounded-2xl p-4 border border-emerald-200/80 shadow-2xs space-y-2.5">
                            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                              <div className="flex items-center gap-1.5">
                                <ShieldCheck size={14} className="text-emerald-700" />
                                <span className="text-[11px] font-bold text-stone-800 uppercase tracking-wider">
                                  Tài Khoản Thụ Hưởng Nhận Tiền
                                </span>
                              </div>
                              <span className="text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                                Đã liên kết
                              </span>
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-heading font-black text-sm text-[#16442C]">
                                    {bankForm.bankName}
                                  </span>
                                  <span className="font-mono font-bold text-xs text-stone-800 bg-stone-100 px-2 py-0.5 rounded-md">
                                    {bankForm.bankAccount}
                                  </span>
                                </div>
                                <p className="text-[11px] text-stone-500 font-bold uppercase tracking-wide">
                                  Chủ TK: {bankForm.bankOwner || closetData?.user?.name || "CHÍNH CHỦ"}
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() => setIsBankModalOpen(true)}
                                className="px-2.5 py-1 text-[11px] font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition cursor-pointer"
                              >
                                Đổi
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-white rounded-2xl p-4 border border-dashed border-amber-300 bg-amber-50/40 shadow-2xs space-y-2">
                            <div className="flex items-center gap-2 text-amber-900">
                              <CreditCard size={18} className="text-amber-700 shrink-0" />
                              <span className="text-xs font-bold">Chưa liên kết tài khoản ngân hàng</span>
                            </div>
                            <p className="text-[11px] text-stone-600 leading-relaxed font-light">
                              Hãy liên kết số tài khoản ngân hàng chính chủ để tiền thuê và tiền bán được giải ngân tự động về tài khoản của bạn.
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                if (!currentUser) setShowAuthModal(true);
                                else setIsBankModalOpen(true);
                              }}
                              className="w-full py-2 bg-[#1E5638] text-white text-xs font-bold rounded-xl shadow-xs hover:bg-[#236341] transition cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <Plus size={13} />
                              <span>Liên Kết Ngân Hàng Ngay (1 Phút)</span>
                            </button>
                          </div>
                        )}

                        {/* Thẻ Lịch Sử Lệnh Rút Tiền Gần Đây */}
                        <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-2xs space-y-3">
                          <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                            <h4 className="font-heading font-black text-xs uppercase tracking-wider text-[#16442C] flex items-center gap-1.5">
                              <Clock size={13} className="text-emerald-700" />
                              Lịch Sử Lệnh Rút Tiền Gần Đây
                            </h4>
                            <span className="text-[10px] text-stone-400 font-mono">
                              {(closetData?.withdrawals?.length || 0)} giao dịch
                            </span>
                          </div>

                          {closetData?.withdrawals && closetData.withdrawals.length > 0 ? (
                            <div className="space-y-2 divide-y divide-stone-100">
                              {closetData.withdrawals.map((w: any) => {
                                const isPending = w.status === "PENDING";
                                const isCompleted = w.status === "COMPLETED" || w.status === "APPROVED";
                                return (
                                  <div key={w.id} className="pt-2 first:pt-0 flex items-center justify-between text-xs">
                                    <div className="space-y-0.5">
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-bold text-stone-900 font-mono">
                                          -{Number(w.amount).toLocaleString("vi-VN")}đ
                                        </span>
                                        <span className={`text-[9.5px] px-1.5 py-0.2 rounded font-bold ${
                                          isCompleted
                                            ? "bg-emerald-100 text-emerald-800"
                                            : isPending
                                            ? "bg-amber-100 text-amber-800"
                                            : "bg-rose-100 text-rose-800"
                                        }`}>
                                          {isCompleted ? "Đã chuyển tiền" : isPending ? "Đang xử lý" : "Từ chối"}
                                        </span>
                                      </div>
                                      <p className="text-[10.5px] text-stone-500">
                                        Về {w.bankName} ({w.bankAccountNumber}) • {w.createdAt}
                                      </p>
                                      {w.adminNote && (
                                        <p className="text-[10px] text-rose-600 italic">
                                          Lý do: {w.adminNote}
                                        </p>
                                      )}
                                    </div>

                                    <div className="shrink-0 text-right">
                                      {isCompleted ? (
                                        <CheckCircle2 size={16} className="text-emerald-600 ml-auto" />
                                      ) : isPending ? (
                                        <RefreshCw size={14} className="animate-spin text-amber-600 ml-auto" />
                                      ) : (
                                        <X size={16} className="text-rose-600 ml-auto" />
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="py-4 text-center space-y-1">
                              <p className="text-xs text-stone-500 font-medium">Chưa có giao dịch rút tiền nào</p>
                              <p className="text-[11px] text-stone-400 leading-relaxed font-light">
                                Khi có thu nhập từ khách thuê trang phục, bạn có thể tạo lệnh rút tiền về tài khoản ngân hàng bất cứ lúc nào.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* CHI TIẾT PHÂN MỤC 4: THỐNG KÊ SINH THÁI (ECO STATS) */}
                    {activeClosetView === "eco" && (
                      <div className="space-y-3">
                        <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-2xs space-y-3">
                          <div className="flex items-center gap-2">
                            <Award className="text-emerald-700" size={20} />
                            <h4 className="font-heading font-black text-sm uppercase tracking-wide text-[#16442C]">
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
                          <h4 className="font-heading font-black text-xs uppercase tracking-wider text-[#16442C]">
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
                            className="w-full h-10 px-3 rounded-xl border border-stone-300 bg-stone-50/50 text-xs font-medium outline-none focus:border-[#1E5638] focus:bg-white"
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
                            className="w-full h-10 px-3 rounded-xl border border-stone-300 bg-stone-50/50 text-xs font-medium outline-none focus:border-[#1E5638] focus:bg-white cursor-pointer"
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
                              className="w-full h-10 px-3 rounded-xl border border-stone-300 bg-stone-50/50 text-xs font-medium outline-none focus:border-[#1E5638] focus:bg-white disabled:opacity-50 cursor-pointer"
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
                              className="w-full h-10 px-3 rounded-xl border border-stone-300 bg-stone-50/50 text-xs font-medium outline-none focus:border-[#1E5638] focus:bg-white disabled:opacity-50 cursor-pointer"
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
                            className="w-full h-10 px-3 rounded-xl border border-stone-300 bg-stone-50/50 text-xs font-medium outline-none focus:border-[#1E5638] focus:bg-white"
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
                            className="w-full h-10 px-3 rounded-xl border border-stone-300 bg-stone-50/50 text-xs font-medium outline-none focus:border-[#1E5638] focus:bg-white"
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
                            className="w-full h-10 px-3 rounded-xl border border-stone-300 bg-stone-50/50 text-xs font-medium outline-none focus:border-[#1E5638] focus:bg-white"
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
                            className="w-full p-2.5 rounded-xl border border-stone-300 bg-stone-50/50 text-xs font-medium outline-none resize-none focus:border-[#1E5638] focus:bg-white"
                            placeholder="Mô tả phong cách tủ đồ và lưu ý cho người thuê..."
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={isSavingProfile}
                          className="w-full h-10 rounded-xl bg-[#1E5638] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm hover:bg-[#236341] transition disabled:opacity-50 cursor-pointer"
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
            �️ 7. THANH ĐIỀU HƯỚNG ĐÁY CHUẨN ĐỒNG BỘ WEB (5 TABS)
            TỰ ĐỘNG TRƯỢT XUỐNG ẨN KHI LƯỚT BÀI ĐỂ XEM ĐỒ RỘNG RÃI
            ======================================================== */}
        <div className="sticky bottom-16 left-0 right-0 w-full pointer-events-none z-40 flex justify-end px-3 -mt-12">
          <div className="pointer-events-auto">
            <AiStylistChat 
              isMobileApp={true}
              onSelectProduct={handleSelectProductFromAi}
            />
          </div>
        </div>

        <nav className={`sticky bottom-0 left-0 right-0 w-full mt-auto shrink-0 z-50 ${vibeConfig.dockBg} px-1.5 py-1.5 grid grid-cols-5 items-center border-t shadow-[0_-4px_20px_rgba(0,0,0,0.06)]`}>
          
          {/* TAB 1: KHÁM PHÁ (Trang chủ) */}
          <button
            onClick={() => { setActiveTab("home"); }}
            className={`flex flex-col items-center justify-center h-11 select-none transition-colors cursor-pointer ${
              activeTab === "home" ? `${vibeConfig.dockActive} font-bold` : `${vibeConfig.dockInactive} font-medium`
            }`}
          >
            <Compass size={19} strokeWidth={activeTab === "home" ? 2.5 : 1.8} />
            <span className="text-[10px] tracking-tight mt-0.5 whitespace-nowrap">
              {lang === "vi" ? "Khám phá" : "Explore"}
            </span>
          </button>

          {/* TAB 2: KHU MUA LÁ & ĐẨY TOP RIÊNG */}
          <button
            onClick={() => { setActiveTab("boost"); }}
            className={`flex flex-col items-center justify-center h-11 select-none transition-colors cursor-pointer ${
              activeTab === "boost" ? `${vibeConfig.dockActive} font-bold` : `${vibeConfig.dockInactive} font-medium`
            }`}
          >
            <Leaf size={19} strokeWidth={activeTab === "boost" ? 2.5 : 1.8} />
            <span className="text-[10px] tracking-tight mt-0.5 whitespace-nowrap">
              {lang === "vi" ? "Đẩy Top" : "Boost"}
            </span>
          </button>

          {/* TAB 3: NÚT "+ ĐĂNG ĐỒ" CÂN ĐỐI Ở GIỮA */}
          <button
            onClick={() => {
              if (!currentUser) {
                setShowAuthModal(true);
              } else {
                handleOpenCreateModal();
              }
            }}
            className="flex flex-col items-center justify-center h-11 select-none cursor-pointer group"
          >
            <div className={`w-9 h-9 rounded-full ${vibeConfig.primaryBtn} ring-2 ring-white flex items-center justify-center group-hover:scale-105 transition-all -mt-3 mb-0.5`}>
              <Plus size={18} strokeWidth={2.6} />
            </div>
            <span className={`text-[10px] font-extrabold ${vibeConfig.dockActive} tracking-tight whitespace-nowrap`}>
              {lang === "vi" ? "Đăng đồ" : "+ List"}
            </span>
          </button>

          {/* TAB 4: ĐƠN HÀNG (Đồng bộ /my-closet/orders & Giỏ thuê) */}
          <button
            onClick={() => setActiveTab("orders")}
            className={`flex flex-col items-center justify-center h-11 select-none transition-colors cursor-pointer relative ${
              activeTab === "orders" ? `${vibeConfig.dockActive} font-bold` : `${vibeConfig.dockInactive} font-medium`
            }`}
          >
            <Package size={19} strokeWidth={activeTab === "orders" ? 2.5 : 1.8} />
            {(cartItems.length > 0 || (safeOrdersAsRenter.length + safeOrdersAsLender.length) > 0) && (
              <span className="absolute top-0 right-3.5 min-w-[14px] h-[14px] px-1 rounded-full bg-[#C26475] text-white text-[8px] font-extrabold flex items-center justify-center shadow-xs">
                {cartItems.length + safeOrdersAsRenter.length + safeOrdersAsLender.length}
              </span>
            )}
            <span className="text-[10px] tracking-tight mt-0.5 whitespace-nowrap">
              {lang === "vi" ? "Đơn hàng" : "Orders"}
            </span>
          </button>

          {/* TAB 5: TÔI (Đồng bộ /my-closet) */}
          <button
            onClick={() => { setActiveTab("closet"); setActiveClosetView("menu"); }}
            className={`flex flex-col items-center justify-center h-11 select-none transition-colors cursor-pointer relative ${
              activeTab === "closet" ? `${vibeConfig.dockActive} font-bold` : `${vibeConfig.dockInactive} font-medium`
            }`}
          >
            <User size={19} strokeWidth={activeTab === "closet" ? 2.5 : 1.8} />
            {safeMyProducts.length > 0 && (
              <span className="absolute top-0.5 right-4 w-2 h-2 rounded-full bg-[#C26475] ring-2 ring-white" />
            )}
            <span className="text-[10px] tracking-tight mt-0.5 whitespace-nowrap">
              {lang === "vi" ? "Tôi" : "Me"}
            </span>
          </button>

        </nav>

        {/* ========================================================
            📋 8. MENU 3 GẠCH QUICK DRAWER (PHÂN 4 NHÓM CHUẨN WEB)
            ======================================================== */}
        {isDrawerMenuOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end justify-center animate-in fade-in duration-200">
            <div className="w-full max-w-[430px] bg-[#FAF9F5] rounded-t-[32px] p-5 text-[#16442C] shadow-2xl relative animate-in slide-in-from-bottom duration-300 border border-stone-200 space-y-4 max-h-[85vh] overflow-y-auto no-scrollbar">
              <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#1E5638] ring-2 ring-red-300/80" />
                  <h4 className="font-heading font-black text-sm uppercase tracking-wide text-[#16442C]">
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
                    onClick={() => {
                      setIsDrawerMenuOpen(false);
                      if (!currentUser) {
                        setShowAuthModal(true);
                      } else {
                        handleOpenCreateModal();
                      }
                    }}
                    className="w-full p-2.5 flex items-center justify-between hover:text-emerald-800 transition cursor-pointer text-emerald-800"
                  >
                    <span>+ Đăng trang phục mới</span>
                    <span className="text-[10px] bg-emerald-50 px-2 py-0.5 rounded-full font-bold">Đăng đồ</span>
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
            🛍️ 8.5. MODAL TỦ ĐỒ CHỦ TỦ IN-APP (video / nền tảng CREATOR SHOP) - TRÀN VIỀN 100% NATIVE
            ======================================================== */}
        {viewingClosetOwner && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-stretch sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200 mobile-app-root font-sans">
            <div className="w-full max-w-[430px] h-[100dvh] h-screen sm:h-auto sm:max-h-[88vh] bg-[#FBF9F5] rounded-none sm:rounded-[36px] overflow-y-auto shadow-2xl relative animate-in slide-in-from-bottom duration-300 overscroll-contain flex flex-col mobile-app-root font-sans no-scrollbar">
              
              {/* STICKY TOP BAR (Z-30 TRÁNH BỊ CHE BỞI CÁC PHẦN TỬ CON, AN TOÀN NOTCH IPHONE) */}
              <div className="sticky top-0 z-30 bg-[#1E5638] text-white px-4 py-3 sm:py-3 pt-[max(0.75rem,env(safe-area-inset-top))] flex items-center justify-between border-b border-emerald-900/40 shadow-xs shrink-0">
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

              {/* BANNER & PROFILE CARD (nền tảng / video STYLE) */}
              <div className="relative bg-gradient-to-b from-[#1E5638] via-[#236341] to-[#FBF9F5] pt-3 pb-4 px-4 text-white shrink-0">
                
                <div className="flex items-start gap-3.5 mb-3">
                  {/* Avatar to có viền */}
                  <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-white/80 shadow-md bg-stone-200 shrink-0">
                    {viewingClosetOwner.avatar ? (
                      <Image src={viewingClosetOwner.avatar} alt={viewingClosetOwner.name} fill className="object-cover" unoptimized />
                    ) : (
                      <div className="w-full h-full bg-[#1E5638] text-white text-xl font-bold flex items-center justify-center">
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
                      <span className="truncate">{maskPublicAddress(viewingClosetOwner.location, "Việt Nam")}</span>
                    </div>

                    {/* Bio / Quote */}
                    <p className="text-[11.5px] text-stone-200/90 mt-1 line-clamp-2 leading-relaxed italic">
                      &ldquo;{viewingClosetOwner.quote || viewingClosetOwner.bio || "Chia sẻ tủ đồ thời trang tuần hoàn. Đồ luôn được giặt hấp thơm tho trước khi bàn giao."}&rdquo;
                    </p>
                  </div>
                </div>

                {/* THANH THỐNG KÊ CHỈ SỐ UY TÍN (video SHOP STYLE: SAO VÀ ĐÁNH GIÁ THỰC TẾ) */}
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-2.5 grid grid-cols-4 gap-1 text-center border border-white/15">
                  <div>
                    <div className="font-bold text-sm text-white">{closetOwnerProducts.length}</div>
                    <div className="text-[10px] text-stone-300">Món đồ</div>
                  </div>
                  <div>
                    <div className="font-bold text-sm text-amber-300 flex items-center justify-center gap-0.5">

                      <span>{Number(viewingClosetOwner.rating || 5.0).toFixed(1)} / 5</span>
                    </div>
                    <div className="text-[10px] text-stone-300">
                      {viewingClosetOwner.reviewCount ? `${viewingClosetOwner.reviewCount} đánh giá` : "Đánh giá"}
                    </div>
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

              {/* TABS PHÂN LOẠI ĐỒ TRONG TỦ (STICKY DƯỚI HEADER, Z-20 CHẮC CHẮN ĐÈ LÊN SẢN PHẨM CUỘN) */}
              <div className="sticky top-[52px] z-20 bg-[#FBF9F5] border-b border-stone-200 px-3 py-2 flex items-center gap-1.5 shadow-2xs shrink-0 overflow-x-auto no-scrollbar isolate">
                {[
                  { id: "all", label: `Tất cả (${closetOwnerProducts.length})` },
                  { 
                    id: "rent", 
                    label: `Cho thuê (${closetOwnerProducts.filter(p => {
                      const r = typeof p.rentalPrice === "number" ? p.rentalPrice : parseInt(String(p.rentalPrice || 0).replace(/\D/g, ""), 10) || 0;
                      return r > 0 || p.listingTypeRaw === "RENT" || p.type === "Thuê";
                    }).length})` 
                  },
                  { 
                    id: "sell", 
                    label: `Thanh lý (${closetOwnerProducts.filter(p => {
                      const s = typeof p.salePrice === "number" ? p.salePrice : parseInt(String(p.salePrice || 0).replace(/\D/g, ""), 10) || 0;
                      return s > 0 || p.listingTypeRaw === "SELL" || p.type === "Mua sắm";
                    }).length})` 
                  },
                  { id: "reviews", label: `Đánh giá (${ownerReviews.length})` },
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setClosetOwnerFilter(tab.id as any)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                      closetOwnerFilter === tab.id
                        ? "bg-[#1E5638] text-white shadow-xs"
                        : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200/80"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* PHÂN VÙNG HIỂN THỊ NỘI DUNG: SẢN PHẨM HOẶC ĐÁNH GIÁ THỰC TẾ */}
              {closetOwnerFilter === "reviews" ? (
                <div className="p-3 pb-16 space-y-3 flex-1">
                  <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-2xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={18} className="text-emerald-700" />
                      <div>
                        <div className="font-heading font-black text-sm text-[#16442C]">
                          Đánh giá cộng đồng
                        </div>
                        <div className="text-[10px] text-stone-400 font-medium">
                          Dựa trên {ownerReviews.length} lượt nhận xét thực tế
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-heading font-black text-xl text-amber-600">
                        {Number(viewingClosetOwner.rating || 5.0).toFixed(1)}
                      </span>
                      <span className="text-xs text-stone-400 font-bold"> / 5.0</span>
                    </div>
                  </div>

                  {isLoadingOwnerReviews ? (
                    <div className="py-12 text-center text-stone-400 space-y-2">
                      <Loader2 size={24} className="animate-spin mx-auto text-emerald-800" />
                      <p className="text-xs font-medium">Đang nạp đánh giá...</p>
                    </div>
                  ) : ownerReviews.length === 0 ? (
                    <div className="py-12 text-center text-stone-500 bg-white rounded-2xl border border-stone-200 p-6 space-y-1">
                      <p className="text-xs font-bold text-stone-700">Chưa có đánh giá nào</p>
                      <p className="text-[11px] text-stone-400">Chủ tủ này đang sẵn sàng đón nhận những lượt thuê đầu tiên!</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {ownerReviews.map((rev: any, rIdx: number) => (
                        <div key={rev.id || rIdx} className="bg-white rounded-2xl p-3.5 border border-stone-200/80 shadow-2xs space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full overflow-hidden bg-stone-200 relative shrink-0">
                                {rev.reviewer?.avatar ? (
                                  <Image src={rev.reviewer.avatar} alt="" fill className="object-cover" unoptimized />
                                ) : (
                                  <div className="w-full h-full bg-[#1E5638] text-white text-xs font-bold flex items-center justify-center">
                                    {(rev.reviewer?.name || "K")[0].toUpperCase()}
                                  </div>
                                )}
                              </div>
                              <div>
                                <h5 className="font-bold text-xs text-stone-900 leading-tight">
                                  {rev.reviewer?.name || "Khách thuê CLOOP"}
                                </h5>
                                <div className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 rounded mt-0.5 inline-block">Đánh giá {rev.rating || 5} / 5</div>
                              </div>
                            </div>
                            {rev.createdAt && (
                              <span className="text-[10px] text-stone-400 font-medium">
                                {new Date(rev.createdAt).toLocaleDateString("vi-VN")}
                              </span>
                            )}
                          </div>
                          {rev.comment && rev.comment !== "HIDDEN_BY_SERVER" && (
                            <p className="text-xs text-stone-700 leading-relaxed bg-stone-50/80 p-2.5 rounded-xl border border-stone-100">
                              "{rev.comment}"
                            </p>
                          )}
                          {rev.product?.title && (
                            <div className="text-[10px] text-emerald-800 font-medium">
                              Đã thuê: {rev.product.title}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* DANH SÁCH SẢN PHẨM TRONG TỦ (2 CỘT video SHOP STYLE - ISOLATE VÀ Z-[2] CHỐNG NHẢY CHỮ/BADGE) */
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
                        className="mt-2 px-3.5 py-1.5 bg-[#1E5638] text-white text-xs font-bold rounded-full cursor-pointer"
                      >
                        Xem tất cả đồ của tủ
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2.5">
                      {filteredClosetOwnerProducts.map((item: any, idx: number) => {
                        const rentNum = typeof item.rentalPrice === "number" ? item.rentalPrice : parseInt(String(item.rentalPrice || 0).replace(/\D/g, ""), 10) || 0;
                        const saleNum = typeof item.salePrice === "number" ? item.salePrice : parseInt(String(item.salePrice || 0).replace(/\D/g, ""), 10) || 0;
                        const fallbackNum = typeof item.price === "number" ? item.price : parseInt(String(item.price || 0).replace(/\D/g, ""), 10) || 0;

                        let isRent = true;
                        let priceDisplay = "";
                        let badgeText = "Thuê đồ";

                        if (closetOwnerFilter === "sell") {
                          // Tab Thanh lý -> 100% hiển thị giá bán & Mua sở hữu!
                          isRent = false;
                          const effectiveSale = saleNum > 0 ? saleNum : fallbackNum;
                          priceDisplay = effectiveSale > 0 ? `${effectiveSale.toLocaleString("vi-VN")}đ` : "Liên hệ mua";
                          badgeText = "Mua sở hữu";
                        } else if (closetOwnerFilter === "rent") {
                          // Tab Cho thuê -> 100% hiển thị giá thuê & Thuê đồ!
                          isRent = true;
                          const effectiveRent = rentNum > 0 ? rentNum : fallbackNum;
                          priceDisplay = effectiveRent > 0 ? `${effectiveRent.toLocaleString("vi-VN")}đ / ngày` : "Liên hệ thuê";
                          badgeText = "Thuê đồ";
                        } else {
                          // Tab Tất cả:
                          if (rentNum > 0 && saleNum > 0) {
                            isRent = true;
                            priceDisplay = `${rentNum.toLocaleString("vi-VN")}đ / ngày`;
                            badgeText = "Thuê & Mua";
                          } else if (saleNum > 0 || item.listingTypeRaw === "SELL" || item.type === "Mua sắm") {
                            isRent = false;
                            const effectiveSale = saleNum > 0 ? saleNum : fallbackNum;
                            priceDisplay = effectiveSale > 0 ? `${effectiveSale.toLocaleString("vi-VN")}đ` : "Liên hệ mua";
                            badgeText = "Mua sở hữu";
                          } else {
                            isRent = true;
                            const effectiveRent = rentNum > 0 ? rentNum : fallbackNum;
                            priceDisplay = effectiveRent > 0 ? `${effectiveRent.toLocaleString("vi-VN")}đ / ngày` : "Liên hệ thuê";
                            badgeText = "Thuê đồ";
                          }
                        }

                        const img = item.image || item.primaryImage || item.images?.[0] || FALLBACK_CLOUDINARY_IMG;

                        return (
                          <div
                            key={item.id || idx}
                            onClick={() => {
                              const targetListingType = isRent ? "RENT" : "SELL";
                              const targetPrice = isRent 
                                ? (rentNum > 0 ? rentNum : fallbackNum)
                                : (saleNum > 0 ? saleNum : fallbackNum);
                              setSelectedProduct({
                                ...item,
                                listingTypeRaw: targetListingType,
                                price: targetPrice,
                                rentalPrice: rentNum > 0 ? rentNum : item.rentalPrice,
                                salePrice: saleNum > 0 ? saleNum : item.salePrice,
                              });
                            }}
                            className="bg-white rounded-2xl overflow-hidden shadow-2xs hover:shadow-md border border-stone-200/80 flex flex-col justify-between cursor-pointer active:scale-[0.98] transition-all group relative isolate"
                          >
                            <div className="relative w-full aspect-[4/5] bg-stone-100 overflow-hidden">
                              <Image
                                src={img}
                                alt={item.title}
                                fill
                                className="object-cover group-hover:scale-105 transition-transform duration-500"
                                unoptimized
                              />
                              <span className={`absolute top-2 left-2 text-white text-[9.5px] font-bold px-2 py-0.5 rounded-md shadow-xs z-[2] pointer-events-none ${
                                badgeText === "Thuê & Mua" 
                                  ? "bg-emerald-700/90 backdrop-blur-xs"
                                  : isRent 
                                    ? "bg-[#1E5638]/90 backdrop-blur-xs" 
                                    : "bg-amber-800/90 backdrop-blur-xs"
                              }`}>
                                {badgeText}
                              </span>
                              {item.size && (
                                <span className="absolute top-2 right-2 bg-black/60 backdrop-blur-xs text-white text-[9.5px] font-bold px-1.5 py-0.5 rounded-md z-[2] pointer-events-none">
                                  Size {item.size}
                                </span>
                              )}
                            </div>

                            <div className="p-2.5 space-y-1">
                              <h4 className="font-bold text-xs text-[#16442C] line-clamp-1 leading-snug">
                                {item.title}
                              </h4>
                              <div className="text-[12px] font-black text-[#16442C]">
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
              )}

            </div>
          </div>
        )}

        {/* TOAST THÔNG BÁO TỦ ĐỒ */}
        {closetToastMessage && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[70] bg-[#1E5638] text-white px-4 py-2 rounded-full text-xs font-bold shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
            <CheckCircle2 size={14} className="text-emerald-400" />
            <span>{closetToastMessage}</span>
          </div>
        )}

        {/* ========================================================
            👗 9. MODAL CHI TIẾT SẢN PHẨM TRONG APP (PRODUCT DETAIL SHEET) - TRÀN VIỀN 100% NATIVE
            ======================================================== */}
        {selectedProduct && (
          <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex items-stretch sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200 mobile-app-root font-sans">
            <div className="w-full max-w-[430px] bg-[#FBF9F5] rounded-none sm:rounded-[32px] h-[100dvh] h-screen sm:h-auto sm:max-h-[90vh] overflow-y-auto p-0 text-[#16442C] shadow-2xl relative animate-in slide-in-from-bottom duration-300 no-scrollbar flex flex-col mobile-app-root font-sans">
              
              {/* 📸 HERO ẢNH TRÀN VIỀN 100% (video SHOP / FACEBOOK MARKETPLACE STYLE) */}
              <div className="relative w-full aspect-[4/5] bg-stone-900 select-none overflow-hidden shrink-0">
                <Image
                  src={
                    (selectedProduct.images && selectedProduct.images[activeDetailImgIndex]) ||
                    selectedProduct.image ||
                    selectedProduct.primaryImage ||
                    FALLBACK_CLOUDINARY_IMG
                  }
                  alt={selectedProduct.title}
                  fill
                  className="object-cover"
                  priority
                  unoptimized
                />
                
                {/* Lớp phủ chuyển màu tăng độ tương phản nút bấm */}
                <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/60 via-black/20 to-transparent pointer-events-none z-10" />
                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none z-10" />

                {/* THANH ĐIỀU HƯỚNG NỔI TRÊN ẢNH (FLOATING TOP BAR - AN TOÀN NOTCH IPHONE) */}
                <div className="absolute top-[max(0.875rem,env(safe-area-inset-top))] sm:top-3.5 inset-x-3.5 flex items-center justify-between z-20">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProduct(null);
                      setActiveDetailImgIndex(0);
                    }}
                    className="w-9 h-9 rounded-full bg-black/45 hover:bg-black/65 backdrop-blur-md text-white flex items-center justify-center transition cursor-pointer active:scale-95 border border-white/20 shadow-md"
                    title="Đóng"
                  >
                    <ArrowLeft size={18} />
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (typeof navigator !== "undefined" && navigator.share) {
                          navigator.share({ title: selectedProduct.title, url: window.location.href }).catch(() => {});
                        } else {
                          showClosetToast("Đã sao chép liên kết trang phục!");
                        }
                      }}
                      className="w-9 h-9 rounded-full bg-black/45 hover:bg-black/65 backdrop-blur-md text-white flex items-center justify-center transition cursor-pointer active:scale-95 border border-white/20 shadow-md"
                      title="Chia sẻ"
                    >
                      <Share2 size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleToggleLike(selectedProduct.id, e)}
                      className={`w-9 h-9 rounded-full bg-black/45 hover:bg-black/65 backdrop-blur-md flex items-center justify-center transition cursor-pointer active:scale-95 border border-white/20 shadow-md ${
                        likedItems[selectedProduct.id] ? "text-red-400" : "text-white"
                      }`}
                      title="Yêu thích"
                    >
                      <Heart size={18} className={likedItems[selectedProduct.id] ? "fill-[#C92A2A] text-[#C92A2A]" : "fill-none"} />
                    </button>
                  </div>
                </div>

                {/* BADGE NỔI GÓC DƯỚI ẢNH */}
                <div className="absolute bottom-3 inset-x-3.5 flex items-center justify-between z-20 pointer-events-none">
                  <span className="px-2.5 py-1 rounded-full bg-black/55 backdrop-blur-md text-white text-[10.5px] font-bold">
                    {selectedProduct.occasion || "Dạ tiệc & Sự kiện"}
                  </span>
                  {selectedProduct.images && selectedProduct.images.length > 1 && (
                    <span className="px-2.5 py-1 rounded-full bg-black/55 backdrop-blur-md text-white text-[10px] font-mono font-bold tracking-wider">
                      {activeDetailImgIndex + 1} / {selectedProduct.images.length}
                    </span>
                  )}
                </div>
              </div>

              {/* LƯỚI THUMBNAIL TRÀN VIỀN NẾU CÓ NHIỀU ẢNH THỰC TẾ */}
              {selectedProduct.images && selectedProduct.images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto px-4 py-2 bg-stone-100/60 border-b border-stone-200/60 no-scrollbar">
                  {selectedProduct.images.map((imgUrl: string, i: number) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setActiveDetailImgIndex(i)}
                      className={`relative w-14 aspect-[3/4] rounded-xl overflow-hidden border-2 shrink-0 transition cursor-pointer ${
                        activeDetailImgIndex === i ? "border-[#1E5638] ring-1 ring-[#1E5638]" : "border-stone-200 opacity-60 hover:opacity-100"
                      }`}
                    >
                      <Image src={imgUrl} alt={`Ảnh ${i + 1}`} fill className="object-cover" unoptimized />
                    </button>
                  ))}
                </div>
              )}

              {/* KHỐI NỘI DUNG THÔNG TIN TRANG PHỤC */}
              <div className="px-4 pt-3.5 pb-24 space-y-4">
                
                {/* 1. BẢNG GIÁ THỰC TẾ & TIỀN CỌC */}
                <div className="flex items-baseline justify-between pb-3 border-b border-stone-200/80">
                  <div>
                    <span className="text-[10px] text-stone-500 uppercase font-bold tracking-wider block">
                      {selectedProduct.listingTypeRaw === "SELL" ? "Giá sale thanh lý" : "Giá thuê ưu đãi"}
                    </span>
                    {(() => {
                      const curP = Number(selectedProduct.price || selectedProduct.rentalPrice || selectedProduct.salePrice || 0);
                      const rawOrig = Number(selectedProduct.originalPrice || selectedProduct.storeRetailPrice || 0);
                      const origP = rawOrig > curP
                        ? rawOrig
                        : selectedProduct.listingTypeRaw !== "SELL" && curP > 0
                          ? curP * 9
                          : Math.round(curP * 1.6);
                      const savedVnd = Math.max(0, origP - curP);
                      const savedPct = origP > curP ? Math.min(95, Math.max(10, Math.round(((origP - curP) / origP) * 100))) : 0;

                      return (
                        <>
                          <div className="flex items-baseline gap-2 mt-0.5 flex-wrap">
                            <span className="font-heading font-black text-2xl text-[#1E5638]">
                              {curP.toLocaleString("vi-VN")}đ
                            </span>
                            {selectedProduct.listingTypeRaw !== "SELL" && (
                              <span className="text-xs text-stone-500 font-medium">/ ngày</span>
                            )}
                            {origP > curP && (
                              <span className="text-xs text-stone-400 font-mono">
                                Giá gốc: <span className="line-through">{origP.toLocaleString("vi-VN")}đ</span>
                              </span>
                            )}
                          </div>
                          {savedVnd > 0 && (
                            <div className="pt-1">
                              <span className="text-[10.5px] font-bold text-[#C92A2A] bg-red-50 border border-red-200/80 px-2 py-0.5 rounded-md font-mono inline-flex items-center gap-1">
                                Tiết kiệm {savedVnd.toLocaleString("vi-VN")}đ (-{savedPct}%) so với giá gốc
                              </span>
                            </div>
                          )}
                        </>
                      );
                    })()}

                    {/* 🔀 TOGGLE CHUYỂN ĐỔI THUÊ HOẶC MUA (NẾU MÓN ĐỒ CÓ CẢ 2 HÌNH THỨC) */}
                    {Number(selectedProduct.rentalPrice || 0) > 0 && Number(selectedProduct.salePrice || 0) > 0 && (
                      <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-xl mt-2.5 w-fit border border-stone-200/60">
                        <button
                          type="button"
                          onClick={() => setSelectedProduct((prev: any) => ({
                            ...prev,
                            listingTypeRaw: "RENT",
                            price: Number(prev.rentalPrice)
                          }))}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                            selectedProduct.listingTypeRaw !== "SELL"
                              ? "bg-[#1E5638] text-white shadow-xs"
                              : "text-stone-600 hover:text-stone-900"
                          }`}
                        >
                          Thuê đồ ({Number(selectedProduct.rentalPrice).toLocaleString("vi-VN")}đ/ngày)
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedProduct((prev: any) => ({
                            ...prev,
                            listingTypeRaw: "SELL",
                            price: Number(prev.salePrice)
                          }))}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                            selectedProduct.listingTypeRaw === "SELL"
                              ? "bg-[#1E5638] text-white shadow-xs"
                              : "text-stone-600 hover:text-stone-900"
                          }`}
                        >
                          Mua sở hữu ({Number(selectedProduct.salePrice).toLocaleString("vi-VN")}đ)
                        </button>
                      </div>
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

                {/* 2. TIÊU ĐỀ TRANG PHỤC */}
                <div>
                  <h2 className="font-heading font-black text-lg text-[#16442C] leading-snug">
                    {selectedProduct.title}
                  </h2>
                </div>

                {/* 3. THÔNG SỐ KỸ THUẬT & PHÂN LOẠI */}
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {selectedProduct.category && (
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#1E5638] text-white">
                        {selectedProduct.category}
                      </span>
                    )}
                    {selectedProduct.color && (
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-stone-200/80 text-stone-800">
                        Màu: {selectedProduct.color}
                      </span>
                    )}
                    {selectedProduct.occasion && (
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-200">
                        {selectedProduct.occasion}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="bg-stone-100/90 p-2 rounded-xl border border-stone-200/60">
                      <span className="text-[9.5px] text-stone-400 block font-medium">Size</span>
                      <span className="text-xs font-bold text-stone-800">{selectedProduct.size || "M"}</span>
                    </div>
                    <div className="bg-stone-100/90 p-2 rounded-xl border border-stone-200/60">
                      <span className="text-[9.5px] text-stone-400 block font-medium">Chất liệu</span>
                      <span className="text-xs font-bold text-stone-800 truncate block">{selectedProduct.material || "Lụa"}</span>
                    </div>
                    <div className="bg-stone-100/90 p-2 rounded-xl border border-stone-200/60">
                      <span className="text-[9.5px] text-stone-400 block font-medium">Độ mới</span>
                      <span className="text-xs font-bold text-stone-800">{selectedProduct.condition || "Mới 95%"}</span>
                    </div>
                    <div className="bg-stone-100/90 p-2 rounded-xl border border-stone-200/60">
                      <span className="text-[9.5px] text-stone-400 block font-medium">Dịp mặc</span>
                      <span className="text-xs font-bold text-stone-800 truncate block">{selectedProduct.occasion || "Dạo phố"}</span>
                    </div>
                  </div>

                  {/* Chiều cao, cân nặng & số đo nếu có */}
                  {(selectedProduct.style || selectedProduct.bust || selectedProduct.waist || selectedProduct.hips) && (
                    <div className="bg-amber-50/70 p-2.5 rounded-xl border border-amber-200/70 text-xs text-amber-950">
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span>Form dáng người mặc</span>
                        {selectedProduct.style && <span className="font-semibold text-emerald-900">{selectedProduct.style}</span>}
                      </div>
                      {(selectedProduct.bust || selectedProduct.waist || selectedProduct.hips) && (
                        <div className="flex items-center gap-2 text-[10px] text-stone-600 mt-1">
                          <span>Số đo 3 vòng:</span>
                          {selectedProduct.bust && <span className="bg-white px-1.5 py-0.5 rounded border border-stone-200">Ngực: {selectedProduct.bust}cm</span>}
                          {selectedProduct.waist && <span className="bg-white px-1.5 py-0.5 rounded border border-stone-200">Eo: {selectedProduct.waist}cm</span>}
                          {selectedProduct.hips && <span className="bg-white px-1.5 py-0.5 rounded border border-stone-200">Mông: {selectedProduct.hips}cm</span>}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 4. CARD CHỦ TỦ VỚI SAO ĐÁNH GIÁ THỰC TẾ TỪ HỆ THỐNG */}
                <div className="bg-white rounded-2xl p-3 border border-stone-200/80 shadow-2xs flex items-center justify-between">
                  <div 
                    onClick={() => {
                      setViewingClosetOwner({
                        id: selectedProduct.userId || 'official',
                        name: selectedProduct.ownerName || 'Chủ tủ CLOOP',
                        avatar: selectedProduct.ownerAvatar || null,
                        rating: Number(selectedProduct.rating || 5.0),
                        reviewCount: Number(selectedProduct.reviewCount || 0),
                        completedOrders: selectedProduct.completedOrders || 0,
                        location: selectedProduct.location || selectedProduct.province || "Toàn quốc",
                      });
                      setSelectedProduct(null);
                    }}
                    className="flex items-center gap-2.5 cursor-pointer group flex-1 min-w-0"
                    title="Xem tủ đồ của người này"
                  >
                    <div className="w-11 h-11 rounded-full overflow-hidden relative border-2 border-emerald-600/30 bg-stone-100 shrink-0 shadow-2xs group-hover:border-emerald-600 transition">
                      {selectedProduct.ownerAvatar ? (
                        <Image src={selectedProduct.ownerAvatar} alt="" fill className="object-cover" unoptimized />
                      ) : (
                        <div className="w-full h-full bg-[#1E5638] text-white text-xs font-bold flex items-center justify-center">
                          {(selectedProduct.ownerName || "C")[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-[#16442C] leading-tight group-hover:underline truncate">
                          {selectedProduct.ownerName || "Thành viên CLOOP"}
                        </span>
                        <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                      </div>
                      
                      {/*  SAO ĐÁNH GIÁ THỰC TẾ CHẠY DỮ LIỆU THẬT DATABASE */}
                      <div className="flex items-center gap-1 text-[11px] text-stone-500 mt-0.5">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200">Uy tín</span>
                        <span className="font-bold text-stone-800 ml-1">
                          {Number(selectedProduct.rating || 5.0).toFixed(1)}
                        </span>
                        <span className="text-stone-300">•</span>
                        <span>
                          {selectedProduct.reviewCount > 0
                            ? `${selectedProduct.reviewCount} đánh giá`
                            : (selectedProduct.completedOrders > 0
                                ? `${selectedProduct.completedOrders} đơn`
                                : "Chủ tủ mới")}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setViewingClosetOwner({
                        id: selectedProduct.userId || 'official',
                        name: selectedProduct.ownerName || 'Chủ tủ CLOOP',
                        avatar: selectedProduct.ownerAvatar || null,
                        rating: Number(selectedProduct.rating || 5.0),
                        reviewCount: Number(selectedProduct.reviewCount || 0),
                        completedOrders: selectedProduct.completedOrders || 0,
                        location: selectedProduct.location || selectedProduct.province || "Toàn quốc",
                      });
                      setSelectedProduct(null);
                    }}
                    className="text-[11px] font-bold text-[#16442C] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 px-3 py-1.5 rounded-full transition cursor-pointer shrink-0 active:scale-95 ml-2"
                  >
                    Ghé tủ đồ →
                  </button>
                </div>

                {/* 5. KHU VỰC TRANG PHỤC (BẢO MẬT ĐỊA CHỈ 100%) */}
                <div className="p-3 rounded-2xl bg-white border border-stone-200/80 text-xs text-stone-700 flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200/60">
                      <MapPin size={15} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-[#16442C] text-xs">
                          Khu vực: {maskPublicAddress(selectedProduct.specificAddress || selectedProduct.location || selectedProduct.province, "Toàn quốc")}
                        </span>
                        <span className="text-[9.5px] font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded-full border border-emerald-200/60 flex items-center gap-0.5 shrink-0">
                          <ShieldCheck size={10} className="text-emerald-600" />
                          Đã ẩn số nhà &amp; phường xã
                        </span>
                      </div>
                      <p className="text-[10.5px] text-stone-400 mt-0.5 truncate">
                        Vị trí giao nhận chi tiết bảo mật 100% • Bàn giao sau khi chốt đơn
                      </p>
                    </div>
                  </div>
                </div>

                {/* 6. LỜI NHẮN TỪ CHỦ TỦ NẾU CÓ */}
                {selectedProduct.description && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block px-1">
                      Lời nhắn từ chủ tủ
                    </span>
                    <p className="text-xs text-stone-700 leading-relaxed whitespace-pre-line bg-white p-3 rounded-2xl border border-stone-200/80 shadow-2xs">
                      {selectedProduct.description}
                    </p>
                  </div>
                )}

                {/* 7. HỘ CHIẾU SỐ THỜI TRANG & CHUỖI VÒNG ĐỜI TUẦN HOÀN (DPP) */}
                <DigitalProductPassport
                  productId={selectedProduct.id}
                  productTitle={selectedProduct.title || "Trang phục CLOOP"}
                  material={selectedProduct.material}
                  category={selectedProduct.category}
                  province={selectedProduct.location || selectedProduct.province}
                  brand={selectedProduct.brand}
                  ownerName={selectedProduct.ownerName}
                  rentalCount={selectedProduct.completedOrders || 0}
                />

                {/* 8. KHỐI ĐÁNH GIÁ CỘNG ĐỒNG THỰC TẾ (NHƯ BẢN WEB) */}
                <div className="bg-white rounded-2xl p-3.5 border border-stone-200/80 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-[#16442C]" />
                      <h4 className="font-heading font-black text-xs uppercase tracking-wider text-[#16442C]">
                        Đánh giá cộng đồng ({productReviews.length})
                      </h4>
                    </div>
                    <span className="text-[11px] font-bold text-amber-600">
                      {Number(selectedProduct.rating || 5.0).toFixed(1)} / 5.0
                    </span>
                  </div>

                  {isLoadingProductReviews ? (
                    <div className="py-4 text-center text-stone-400 space-y-1">
                      <Loader2 size={18} className="animate-spin mx-auto text-emerald-800" />
                      <p className="text-[10px]">Đang nạp đánh giá...</p>
                    </div>
                  ) : productReviews.length === 0 ? (
                    <div className="text-center py-4 bg-stone-50 rounded-xl p-3 border border-stone-100">
                      <p className="text-[11px] font-medium text-stone-600">
                        Chưa có đánh giá nào cho tủ đồ này.
                      </p>
                      <p className="text-[10px] text-stone-400 mt-0.5">
                        Hãy là người đầu tiên thuê và trải nghiệm món đồ này!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5 divide-y divide-stone-100">
                      {productReviews.slice(0, 3).map((rev: any, rIdx: number) => (
                        <div key={rev.id || rIdx} className={rIdx > 0 ? "pt-2.5" : ""}>
                          <div className="flex items-center justify-between text-[11px]">
                            <div className="flex items-center gap-1.5">
                              <div className="w-5 h-5 rounded-full overflow-hidden bg-stone-200 relative shrink-0">
                                {rev.reviewer?.avatar ? (
                                  <Image src={rev.reviewer.avatar} alt="" fill className="object-cover" unoptimized />
                                ) : (
                                  <div className="w-full h-full bg-[#1E5638] text-white text-[8px] font-bold flex items-center justify-center">
                                    {(rev.reviewer?.name || "K")[0].toUpperCase()}
                                  </div>
                                )}
                              </div>
                              <span className="font-bold text-stone-800 text-[11px]">
                                {rev.reviewer?.name || "Khách thuê"}
                              </span>
                            </div>
                            <div className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 rounded inline-block">Đánh giá {rev.rating || 5} / 5</div>
                          </div>
                          {rev.comment && rev.comment !== "HIDDEN_BY_SERVER" && (
                            <p className="text-[11px] text-stone-600 mt-1 leading-relaxed">
                              "{rev.comment}"
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* 9. THANH HÀNH ĐỘNG DÍNH DƯỚI ĐÁY (STICKY BOTTOM ACTION BAR) */}
              <div className="sticky bottom-0 z-30 bg-white/95 backdrop-blur-md border-t border-stone-200 p-3 flex items-center gap-2 shadow-lg shrink-0">
                <button
                  type="button"
                  onClick={() => handleAddToCart(selectedProduct)}
                  className="h-11 px-4 rounded-xl border border-stone-300 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs flex items-center justify-center transition cursor-pointer active:scale-95 shrink-0"
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
                  className="flex-1 h-11 rounded-xl bg-[#1E5638] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md hover:bg-[#236341] transition cursor-pointer active:scale-95"
                >
                  <span>{selectedProduct.listingTypeRaw === "SELL" ? "Mua Ngay" : "Thuê Ngay"}</span>
                  <span>•</span>
                  <span>{(selectedProduct.price || selectedProduct.rentalPrice || selectedProduct.salePrice || 0).toLocaleString("vi-VN")}đ{selectedProduct.listingTypeRaw !== "SELL" ? "/ngày" : ""}</span>
                </button>
              </div>

            </div>
          </div>
        )}

        {/* TOAST THÔNG BÁO THÊM GIỎ HÀNG */}
        {addedToCartToast && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-[#1E5638] text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg flex items-center gap-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
            <Check size={14} className="text-emerald-400" />
            <span>Đã thêm vào giỏ thuê!</span>
          </div>
        )}

        {/* ========================================================
            👗 10. MODAL "ĐĂNG TRANG PHỤC VÀO TỦ ĐỒ" ĐỒNG BỘ 100% CẤU TRÚC VỚI BẢN WEB
            ======================================================== */}
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end justify-center p-0 sm:p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-[430px] bg-[#FAF9F5] rounded-t-[32px] sm:rounded-[32px] max-h-[88vh] overflow-y-auto p-5 text-[#16442C] shadow-2xl relative animate-in slide-in-from-bottom duration-300 border border-stone-200 no-scrollbar">
              
              {/* Header Modal */}
              <div className="flex items-center justify-between pb-3 border-b border-stone-200 mb-4 sticky top-0 bg-[#FAF9F5] z-10">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                    <h3 className="font-heading font-black text-base text-[#16442C]">
                      {editingProductId ? "Chỉnh Sửa Món Đồ" : "Đăng Trang Phục Vào Tủ Đồ"}
                    </h3>
                  </div>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    {editingProductId ? "Cập nhật giá thuê, ảnh và thông tin chi tiết" : "Chia sẻ trang phục vào vòng tuần hoàn • Nhận thu nhập thụ động"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => { setIsUploadModalOpen(false); setEditingProductId(null); }}
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
                    {editingProductId ? "Cập Nhật Thành Công!" : "Đăng Tủ Đồ Thành Công!"}
                  </h4>
                  <p className="text-xs text-stone-600 max-w-xs mx-auto">
                    {editingProductId ? "Thông tin món đồ đã được lưu và cập nhật trên toàn hệ thống." : "Trang phục của bạn đã có mặt trên hệ thống CLOOP và được đồng bộ vào tủ đồ cá nhân."}
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
                        Ảnh trang phục ({uploadedImages.length}/6) <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[10px] text-stone-400 font-medium">
                        Chọn được nhiều ảnh cùng lúc (Tối đa 6)
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
                        className="w-full aspect-[16/10] rounded-2xl border-2 border-dashed border-stone-300 hover:border-[#1E5638] bg-white flex flex-col items-center justify-center gap-2 text-stone-500 transition cursor-pointer p-4 group shadow-2xs"
                      >
                        <div className="text-center space-y-1">
                          <span className="text-xs font-bold text-stone-800 block">
                            Chạm để chọn nhiều ảnh cùng lúc từ thư viện
                          </span>
                          <span className="text-[10px] text-stone-500 block">
                            Hỗ trợ chọn cùng lúc tới 6 ảnh • Nạp nhanh tức thì
                          </span>
                        </div>
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200 font-medium">
                          Khuyên dùng: Ảnh toàn thân, mặt trước, mặt sau, chất vải, tem mác
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
                                idx === 0 ? "border-[#1E5638] ring-2 ring-[#1E5638]/20" : "border-stone-200"
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
                                <span className="absolute top-1.5 left-1.5 bg-[#1E5638] text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
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

                          {/* Ô thêm ảnh nếu chưa đủ 6 */}
                          {uploadedImages.length < 6 && (
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="aspect-[3/4] rounded-xl border-2 border-dashed border-stone-300 hover:border-[#1E5638] bg-white flex flex-col items-center justify-center gap-1 text-stone-500 hover:text-stone-800 transition cursor-pointer"
                            >
                              <span className="text-sm font-bold text-stone-600">+</span>
                              <span className="text-[10px] font-bold">Thêm ảnh</span>
                              <span className="text-[9px] text-stone-400">({6 - uploadedImages.length} ảnh nữa)</span>
                            </button>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-stone-500 px-1">
                          <span>Ảnh đầu tiên là ảnh bìa hiển thị ngoài sàn đồ</span>
                          {uploadedImages.length < 6 && (
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
                            ? "bg-white border-[#1E5638] ring-1 ring-[#1E5638] shadow-xs" 
                            : "bg-stone-50 border-stone-300 text-stone-500"
                        }`}
                      >
                        <span className="text-xs font-bold text-[#16442C] block">Cho Thuê</span>
                        <span className="text-[10px] text-stone-500 mt-0.5 block">Nhận thu nhập theo đợt</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setUploadData({ ...uploadData, isSale: !uploadData.isSale })}
                        className={`p-2.5 rounded-xl text-left border transition cursor-pointer ${
                          uploadData.isSale 
                            ? "bg-white border-[#1E5638] ring-1 ring-[#1E5638] shadow-xs" 
                            : "bg-stone-50 border-stone-300 text-stone-500"
                        }`}
                      >
                        <span className="text-xs font-bold text-[#16442C] block">Pass Đồ / Bán</span>
                        <span className="text-[10px] text-stone-500 mt-0.5 block">Chuyển nhượng dứt điểm</span>
                      </button>
                    </div>
                  </div>

                  {/* 2B. PHÂN LUỒNG ĐĂNG ĐỒ: QUẦN ÁO RIÊNG / PHỤ KIỆN RIÊNG */}
                  {(() => {
                    const isUploadAccessory = ACCESSORY_CATEGORIES_LIST.includes(uploadData.category);
                    return (
                      <>
                        <div className="bg-stone-100/80 p-3 rounded-2xl space-y-2 border border-stone-200">
                          <span className="text-xs font-bold text-stone-800 block">Phân loại món đồ</span>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setUploadData({
                                  ...uploadData,
                                  category: CLOTHING_CATEGORIES_LIST[0],
                                  size: uploadData.size === "Freesize" ? "M" : uploadData.size,
                                })
                              }
                              className={`py-2 px-3 rounded-xl text-xs font-bold border transition cursor-pointer ${
                                !isUploadAccessory
                                  ? "bg-[#1E5638] text-white border-[#1E5638] shadow-xs"
                                  : "bg-white text-stone-600 border-stone-300"
                              }`}
                            >
                              Quần áo
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setUploadData({
                                  ...uploadData,
                                  category: ACCESSORY_CATEGORIES_LIST[0],
                                  size: "Freesize",
                                  targetHeight: uploadData.targetHeight || "Freesize",
                                  targetWeight: uploadData.targetWeight || "Freesize",
                                })
                              }
                              className={`py-2 px-3 rounded-xl text-xs font-bold border transition cursor-pointer ${
                                isUploadAccessory
                                  ? "bg-[#1E5638] text-white border-[#1E5638] shadow-xs"
                                  : "bg-white text-stone-600 border-stone-300"
                              }`}
                            >
                              Phụ kiện
                            </button>
                          </div>
                        </div>

                        {/* 3. TÊN MÓN ĐỒ */}
                        <div>
                          <label className="block text-xs font-bold text-stone-800 mb-1">
                            {isUploadAccessory ? "Tên phụ kiện" : "Tên trang phục"} <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder={
                              isUploadAccessory
                                ? "VD: Túi xách đính đá dự tiệc, Giày cao gót mũi nhọn..."
                                : "VD: Đầm dạ hội lụa satin xẻ tà, Set áo dài gấm..."
                            }
                            value={uploadData.title}
                            onChange={(e) => setUploadData({ ...uploadData, title: e.target.value })}
                            className="w-full h-11 px-3.5 rounded-xl border border-stone-300 bg-white text-xs font-medium outline-none focus:border-[#1E5638]"
                          />
                        </div>

                        {/* 4. DANH MỤC & DỊP SỬ DỤNG */}
                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-xs font-bold text-stone-800 mb-1">
                              {isUploadAccessory ? "Danh mục phụ kiện" : "Danh mục quần áo"} <span className="text-rose-500">*</span>
                            </label>
                            <select
                              value={uploadData.category}
                              onChange={(e) => setUploadData({ ...uploadData, category: e.target.value })}
                              className="w-full h-10 px-2.5 rounded-xl border border-stone-300 bg-white text-xs font-medium outline-none focus:border-[#1E5638]"
                            >
                              {(isUploadAccessory ? ACCESSORY_CATEGORIES_LIST : CLOTHING_CATEGORIES_LIST).map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-stone-800 mb-1">
                              Dịp phối đồ <span className="text-rose-500">*</span>
                            </label>
                            <select
                              value={uploadData.occasion}
                              onChange={(e) => setUploadData({ ...uploadData, occasion: e.target.value })}
                              className="w-full h-10 px-2.5 rounded-xl border border-stone-300 bg-white text-xs font-medium outline-none focus:border-[#1E5638]"
                            >
                              {OCCASIONS_LIST.map((o) => (
                                <option key={o} value={o}>
                                  {o}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* 5. MÀU SẮC, SIZE & ĐỘ MỚI */}
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-[11px] font-bold text-stone-800 mb-1">
                              Màu sắc <span className="text-rose-500">*</span>
                            </label>
                            <select
                              value={uploadData.color}
                              onChange={(e) => setUploadData({ ...uploadData, color: e.target.value })}
                              className="w-full h-10 px-2 rounded-xl border border-stone-300 bg-white text-xs font-medium outline-none focus:border-[#1E5638]"
                            >
                              {COLORS_LIST.map((col) => (
                                <option key={col} value={col}>
                                  {col}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-stone-800 mb-1">
                              Kích cỡ <span className="text-rose-500">*</span>
                            </label>
                            <select
                              value={uploadData.size}
                              onChange={(e) => setUploadData({ ...uploadData, size: e.target.value })}
                              className="w-full h-10 px-2 rounded-xl border border-stone-300 bg-white text-xs font-medium outline-none focus:border-[#1E5638]"
                            >
                              {SIZES_LIST.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-stone-800 mb-1">
                              Độ mới <span className="text-rose-500">*</span>
                            </label>
                            <select
                              value={uploadData.condition}
                              onChange={(e) => setUploadData({ ...uploadData, condition: e.target.value })}
                              className="w-full h-10 px-2 rounded-xl border border-stone-300 bg-white text-xs font-medium outline-none focus:border-[#1E5638]"
                            >
                              {CONDITIONS_LIST.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* 5B. THÔNG SỐ NGƯỜI MẶC (CHỈ HIỂN THỊ KHI ĐĂNG QUẦN ÁO) */}
                        {!isUploadAccessory && (
                          <div className="p-3 rounded-2xl bg-amber-50/50 border border-amber-200/80 space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-[#16442C]">
                                Thông số người mặc chuẩn form
                              </span>
                              <span className="text-[10px] text-amber-800 font-semibold bg-amber-100/80 px-2 py-0.5 rounded-full">
                                Cao &amp; Nặng bắt buộc
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                                  Chiều cao mặc đẹp <span className="text-rose-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  required={!isUploadAccessory}
                                  placeholder="VD: 1m55 - 1m65"
                                  value={uploadData.targetHeight}
                                  onChange={(e) => setUploadData({ ...uploadData, targetHeight: e.target.value })}
                                  className="w-full h-9 px-3 rounded-xl border border-stone-300 bg-white text-xs font-medium outline-none focus:border-[#1E5638]"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                                  Cân nặng mặc vừa <span className="text-rose-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  required={!isUploadAccessory}
                                  placeholder="VD: 45 - 52 kg"
                                  value={uploadData.targetWeight}
                                  onChange={(e) => setUploadData({ ...uploadData, targetWeight: e.target.value })}
                                  className="w-full h-9 px-3 rounded-xl border border-stone-300 bg-white text-xs font-medium outline-none focus:border-[#1E5638]"
                                />
                              </div>
                            </div>

                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="block text-[11px] font-semibold text-stone-600">
                                  Số đo 3 vòng (cm)
                                </label>
                                <span className="text-[9.5px] text-stone-400 italic">
                                  Không bắt buộc
                                </span>
                              </div>
                              <div className="grid grid-cols-3 gap-1.5">
                                <input
                                  type="text"
                                  placeholder="V1 Ngực: 84"
                                  value={uploadData.bust}
                                  onChange={(e) => setUploadData({ ...uploadData, bust: e.target.value })}
                                  className="w-full h-8 px-2 rounded-lg border border-stone-200 bg-white text-[11px] text-center font-medium outline-none focus:border-[#1E5638]"
                                />
                                <input
                                  type="text"
                                  placeholder="V2 Eo: 64"
                                  value={uploadData.waist}
                                  onChange={(e) => setUploadData({ ...uploadData, waist: e.target.value })}
                                  className="w-full h-8 px-2 rounded-lg border border-stone-200 bg-white text-[11px] text-center font-medium outline-none focus:border-[#1E5638]"
                                />
                                <input
                                  type="text"
                                  placeholder="V3 Mông: 90"
                                  value={uploadData.hips}
                                  onChange={(e) => setUploadData({ ...uploadData, hips: e.target.value })}
                                  className="w-full h-8 px-2 rounded-lg border border-stone-200 bg-white text-[11px] text-center font-medium outline-none focus:border-[#1E5638]"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}

                  {/* 5C. CHẤT LIỆU */}
                  <div>
                    <label className="block text-xs font-bold text-stone-800 mb-1">
                      Chất liệu &amp; Ghi chú bảo quản
                    </label>
                    <input
                      type="text"
                      placeholder="VD: Lụa tơ tằm, Dạ tweed, Linen, Cotton..."
                      value={uploadData.material}
                      onChange={(e) => setUploadData({ ...uploadData, material: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-stone-300 bg-white text-xs font-medium outline-none focus:border-[#1E5638]"
                    />
                  </div>

                  {/* 6. GIÁ THUÊ 1 NGÀY, 3 NGÀY, 7 NGÀY & TIỀN CỌC (CHỦ TỦ TỰ ĐỊNH GIÁ) */}
                  {uploadData.isRental && (
                    <div className="space-y-3 p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-emerald-950 uppercase tracking-wider">
                          Định giá thuê theo thời gian
                        </span>
                        <span className="text-[9.5px] px-2 py-0.5 rounded-full bg-emerald-100/80 text-emerald-800 font-semibold">
                          Chủ tủ tự quyết
                        </span>
                      </div>
                      <p className="text-[10px] text-emerald-900/80 leading-relaxed font-medium">
                        Bạn toàn quyền thiết lập giá cho từng mốc 1 ngày, 3 ngày, 7 ngày. CLOOP không tự áp đặt chiết khấu.
                      </p>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-emerald-950 mb-1">
                            Thuê 1 ngày (đ) *
                          </label>
                          <input
                            type="text"
                            placeholder="80.000"
                            value={uploadData.price1Day || uploadData.rentalPrice}
                            onChange={(e) => {
                              const val = e.target.value;
                              const num = parseInt(val.replace(/\D/g, "")) || 0;
                              setUploadData(prev => ({
                                ...prev,
                                price1Day: val,
                                rentalPrice: val,
                                price3Days: (!prev.price3Days || prev.price3Days === "0" || prev.price3Days === "200.000") && num > 0
                                  ? `${(Math.round(num * 3 * 0.85 / 1000) * 1000).toLocaleString("vi-VN")}`
                                  : prev.price3Days,
                                price7Days: (!prev.price7Days || prev.price7Days === "0" || prev.price7Days === "400.000") && num > 0
                                  ? `${(Math.round(num * 7 * 0.70 / 1000) * 1000).toLocaleString("vi-VN")}`
                                  : prev.price7Days,
                                deposit: prev.deposit ? prev.deposit : (num > 0 ? `${(num * 3).toLocaleString("vi-VN")}` : "")
                              }));
                            }}
                            className="w-full h-9 px-2.5 rounded-xl border border-emerald-300 bg-white text-xs font-bold outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-emerald-950 mb-1">
                            Gói 3 ngày (đ) *
                          </label>
                          <input
                            type="text"
                            placeholder="200.000"
                            value={uploadData.price3Days}
                            onChange={(e) => setUploadData({ ...uploadData, price3Days: e.target.value })}
                            className="w-full h-9 px-2.5 rounded-xl border border-emerald-300 bg-white text-xs font-bold outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-emerald-950 mb-1">
                            Gói 7 ngày (đ) *
                          </label>
                          <input
                            type="text"
                            placeholder="400.000"
                            value={uploadData.price7Days}
                            onChange={(e) => setUploadData({ ...uploadData, price7Days: e.target.value })}
                            className="w-full h-9 px-2.5 rounded-xl border border-emerald-300 bg-white text-xs font-bold outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10.5px] font-bold text-emerald-950 mb-1">
                          Tiền cọc đảm bảo (đ) *
                        </label>
                        <input
                          type="text"
                          placeholder="500.000"
                          value={uploadData.deposit}
                          onChange={(e) => setUploadData({ ...uploadData, deposit: e.target.value })}
                          className="w-full h-10 px-3 rounded-xl border border-emerald-300 bg-white text-xs font-bold outline-none"
                        />
                        <p className="text-[9.5px] text-stone-500 mt-1">
                          Khoản tiền cọc được hoàn trả tự động sau khi kết thúc đơn thuê.
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
                      <span className="text-xs font-bold text-[#16442C] tracking-wider uppercase">
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
                              syncUnifiedAddress({
                                provinceId: val,
                                districtId: "",
                                wardCode: "",
                                province: prov?.ProvinceName || "",
                                district: "",
                                ward: "",
                              }, false);
                            }}
                            className="w-full h-10 px-3 rounded-xl border border-stone-300 bg-white text-xs font-medium outline-none focus:border-[#1E5638] cursor-pointer"
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
                            className="w-full h-10 px-3 rounded-xl border border-stone-300 bg-white text-xs font-medium outline-none focus:border-[#1E5638]"
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
                              syncUnifiedAddress({
                                districtId: val,
                                wardCode: "",
                                district: dist?.DistrictName || "",
                                ward: "",
                              }, false);
                            }}
                            className="w-full h-10 px-3 rounded-xl border border-stone-300 bg-white text-xs font-medium outline-none focus:border-[#1E5638] disabled:opacity-50 cursor-pointer"
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
                            className="w-full h-10 px-3 rounded-xl border border-stone-300 bg-white text-xs font-medium outline-none focus:border-[#1E5638]"
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
                              syncUnifiedAddress({
                                wardCode: val,
                                ward: ward?.WardName || "",
                              }, false);
                            }}
                            className="w-full h-10 px-3 rounded-xl border border-stone-300 bg-white text-xs font-medium outline-none focus:border-[#1E5638] disabled:opacity-50 cursor-pointer"
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
                            className="w-full h-10 px-3 rounded-xl border border-stone-300 bg-white text-xs font-medium outline-none focus:border-[#1E5638]"
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
                          className="w-full h-10 px-3 rounded-xl border border-stone-300 bg-white text-xs font-mono font-medium outline-none focus:border-[#1E5638]"
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
                        onChange={(e) => {
                          const val = e.target.value;
                          setUploadData({ ...uploadData, address: val });
                          syncUnifiedAddress({ specificAddress: val }, false);
                        }}
                        className="w-full h-10 px-3 rounded-xl border border-stone-300 bg-white text-xs font-medium outline-none focus:border-[#1E5638]"
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
                        className="w-full h-10 px-3 rounded-xl border border-stone-300 bg-white text-xs font-medium outline-none focus:border-[#1E5638]"
                      />
                    </div>

                    {/* Checkbox lưu mặc định */}
                    <div className="flex items-center gap-2 pt-0.5">
                      <input
                        type="checkbox"
                        id="saveLocationAsDefault"
                        checked={uploadData.saveLocationAsDefault}
                        onChange={(e) => setUploadData({ ...uploadData, saveLocationAsDefault: e.target.checked })}
                        className="w-4 h-4 rounded border-stone-300 text-[#16442C] focus:ring-[#1E5638] cursor-pointer"
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
                      className="w-full p-3 rounded-xl border border-stone-300 bg-white text-xs outline-none resize-none focus:border-[#1E5638]"
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
                      className="w-full h-12 rounded-xl bg-[#1E5638] text-white font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-2 shadow-md hover:bg-[#236341] transition disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmittingPost ? (
                        <>
                          <RefreshCw size={15} className="animate-spin" />
                          <span>{editingProductId ? "Đang lưu thay đổi..." : "Đang đăng vào tủ đồ..."}</span>
                        </>
                      ) : (
                        <span>{editingProductId ? "Lưu Thay Đổi Món Đồ" : "Lưu & Chia Sẻ Lên Tủ Đồ CLOOP"}</span>
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
                className="flex-1 py-3 bg-[#1E5638] hover:bg-[#236341] text-white font-bold text-xs rounded-xl transition cursor-pointer text-center border border-emerald-600/50 shadow-lg"
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
            <div className="w-full max-w-[430px] bg-[#FAF9F5] rounded-t-[32px] sm:rounded-[32px] max-h-[90vh] overflow-y-auto text-[#16442C] shadow-2xl relative animate-in slide-in-from-bottom duration-300 border border-stone-200 no-scrollbar flex flex-col">
              
              {/* Header Modal - Cố định không bị trôi khi cuộn */}
              <div className="flex items-center justify-between p-5 pb-3.5 border-b border-stone-200 sticky top-0 bg-[#FAF9F5] z-20 shrink-0">
                <div>
                  <h3 className="font-heading font-black text-base text-[#16442C] leading-tight">
                    {bookingSuccessData ? (isPaidSuccess ? "Thanh Toán Thành Công" : "Cổng Thanh Toán PayOS") : (checkoutProduct.listingTypeRaw === "SELL" ? "Xác Nhận Mua Trang Phục" : "Xác Nhận Thuê Trang Phục")}
                  </h3>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    {bookingSuccessData ? (isPaidSuccess ? "Giao dịch thành công qua PayOS" : "Vui lòng quét mã QR để hoàn tất thanh toán") : "Xác nhận thông tin giao dịch"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setCheckoutProduct(null);
                    setBookingSuccessData(null);
                    setBookingError("");
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
                            Thanh Toán Thành Công
                          </h4>
                          <p className="text-xs text-emerald-800 mt-0.5">
                            Hệ thống đã ghi nhận thanh toán và xác nhận đơn hàng của bạn.
                          </p>
                        </div>
                        <div className="inline-block bg-white px-3 py-1.5 rounded-full border border-emerald-300 font-mono text-xs font-black text-[#16442C]">
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
                          className="py-3 px-3 rounded-xl bg-[#1E5638] hover:bg-[#236341] text-white font-bold text-xs shadow-xs transition cursor-pointer text-center"
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
                          THANH TOÁN AN TOÀN TRỰC TUYẾN
                        </span>
                        <h4 className="font-heading font-black text-base text-[#16442C] pt-0.5">
                          Quét Mã QR Chuyển Khoản PayOS
                        </h4>
                        <p className="text-[11px] text-stone-500">
                          Mã đơn: <strong className="font-mono text-xs font-black text-[#16442C]">#{bookingSuccessData.orderCode}</strong>
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
                            <strong className="text-[#16442C] bg-amber-50 text-amber-900 border border-amber-200 px-1 rounded font-bold">
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
                        className="w-full py-3 bg-[#1E5638] hover:bg-[#236341] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer disabled:opacity-50"
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
                          src={checkoutProduct.image || checkoutProduct.primaryImage || checkoutProduct.images?.[0] || FALLBACK_CLOUDINARY_IMG}
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
                        <h4 className="font-heading font-black text-xs text-[#16442C] truncate mt-0.5">
                          {checkoutProduct.title}
                        </h4>
                        <p className="text-xs font-bold text-[#16442C] mt-0.5">
                          {((checkoutProduct.listingTypeRaw === "SELL" ? checkoutProduct.salePrice : checkoutProduct.rentalPrice) || checkoutProduct.price || 0).toLocaleString("vi-VN")}đ
                          {checkoutProduct.listingTypeRaw !== "SELL" && <span className="text-[10px] font-normal text-stone-500"> / ngày</span>}
                        </p>
                      </div>
                    </div>

                    {/* 1. CHỌN GÓI THUÊ TRẢI NGHIỆM (ĐỒNG BỘ 100% CHUẨN WEB) */}
                    {checkoutProduct.listingTypeRaw !== "SELL" && (
                      <div className="p-3.5 rounded-2xl bg-white border border-stone-200/90 space-y-2.5">
                        <div className="flex justify-between items-center">
                          <label className="block text-xs font-bold text-[#16442C]">
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
                                    ? "bg-[#1E5638] text-white border-[#1E5638] shadow-xs"
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
                                <span className={`text-[10.5px] font-bold font-mono mt-1 ${isSelected ? "text-white" : "text-[#16442C]"}`}>
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
                              className="w-full h-8 px-2 rounded-xl border border-stone-300 bg-white text-xs font-medium outline-none focus:border-[#1E5638]"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-stone-500 block mb-0.5">Lịch dự kiến:</span>
                            <div className="h-8 px-2 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-between text-[10px] font-mono font-bold text-[#16442C]">
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
                      <label className="block text-xs font-bold text-[#16442C]">
                        Phương thức giao nhận
                      </label>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setCheckoutShippingMode("CLOOP_BOOK")}
                          className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                            checkoutShippingMode === "CLOOP_BOOK"
                              ? "border-[#1E5638] bg-stone-100 ring-1 ring-[#1E5638]"
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
                              ? "border-[#1E5638] bg-stone-100 ring-1 ring-[#1E5638]"
                              : "border-stone-200 bg-white hover:bg-stone-50"
                          }`}
                        >
                          <span className="text-xs font-bold block text-stone-900">Tự đến lấy</span>
                          <span className="text-[10px] text-stone-500 block mt-0.5">Tại trạm chủ tủ (0đ)</span>
                        </button>
                      </div>

                      {checkoutShippingMode === "SELF_BOOK" && (
                        <div className="text-[11px] text-stone-700 bg-stone-50 p-2.5 rounded-xl border border-stone-200/80 space-y-1">
                          <p>
                            <strong>Khu vực lấy đồ:</strong> {maskPublicAddress(checkoutProduct.specificAddress || checkoutProduct.location || checkoutProduct.province, "Toàn quốc")}
                          </p>
                          <p className="text-[10px] text-emerald-800 flex items-center gap-1 font-medium">
                            <ShieldCheck size={11} className="text-emerald-600 shrink-0" />
                            <span>Số nhà &amp; liên hệ chi tiết được tự động gửi trong tin nhắn xác nhận sau khi tạo đơn</span>
                          </p>
                        </div>
                      )}
                    </div>

                    {/* 3. THÔNG TIN NGƯỜI NHẬN & ĐỊA CHỈ GHN */}
                    <div className="p-3.5 rounded-2xl bg-white border border-stone-200/90 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-[#16442C]">
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
                              syncUnifiedAddress({ recipientName: val }, false);
                            }}
                            className="w-full h-9 px-2.5 rounded-xl border border-stone-300 bg-white text-xs outline-none focus:border-[#1E5638]"
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
                              syncUnifiedAddress({ phone: val }, false);
                            }}
                            className="w-full h-9 px-2.5 rounded-xl border border-stone-300 bg-white text-xs font-mono outline-none focus:border-[#1E5638]"
                          />
                        </div>
                      </div>

                      {checkoutShippingMode === "CLOOP_BOOK" && (
                        <div className="space-y-2 pt-1 border-t border-stone-100">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-[#16442C] flex items-center gap-1">
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
                                className="w-full h-8 px-2 rounded-xl border border-stone-300 bg-white text-[11px] font-medium outline-none focus:border-[#1E5638]"
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
                                className="w-full h-8 px-2 rounded-xl border border-stone-300 bg-white text-[11px] font-medium outline-none focus:border-[#1E5638] disabled:bg-stone-100 disabled:text-stone-400"
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
                                className="w-full h-8 px-2 rounded-xl border border-stone-300 bg-white text-[11px] font-medium outline-none focus:border-[#1E5638] disabled:bg-stone-100 disabled:text-stone-400"
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
                              onChange={(e) => {
                                const val = e.target.value;
                                setCheckoutAddressDetail(val);
                                syncUnifiedAddress({ specificAddress: val }, false);
                              }}
                              className="w-full h-9 px-2.5 rounded-xl border border-stone-300 bg-white text-xs outline-none focus:border-[#1E5638]"
                            />
                          </div>

                          <div>
                            <span className="text-[10px] text-stone-500 block mb-0.5">Ghi chú giao hàng (Toà nhà, số phòng, dặn shipper...)</span>
                            <input
                              type="text"
                              placeholder="VD: Chung cư Star Tower, tầng 12, gọi trước khi giao..."
                              value={checkoutRenterNote}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCheckoutRenterNote(val);
                                syncUnifiedAddress({ addressNote: val }, false);
                              }}
                              className="w-full h-9 px-2.5 rounded-xl border border-stone-300 bg-white text-xs outline-none focus:border-[#1E5638]"
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

                          {/* ĐẶC QUYỀN ĐÓNG GÓI TẬN CỬA 0 ĐỒNG (TỐI GIẢN - KHÔNG ICON MÀU MÈ) */}
                          <div className="p-2.5 rounded-xl border border-stone-200/90 bg-stone-50/60 text-[11px] text-stone-700 leading-relaxed">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold uppercase tracking-wider text-[10px] text-[#16442C]">
                                ĐẶC QUYỀN ĐÓNG GÓI TẬN CỬA 0 ĐỒNG
                              </span>
                              <span className="text-[9px] font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/60 font-mono">
                                ĐÃ BAO GỒM
                              </span>
                            </div>
                            <p className="text-[10px] text-stone-500 leading-snug">
                              Bưu tá GHN mang sẵn túi niêm phong tiêu chuẩn của bưu cục đến tận nơi. Bạn không cần thùng carton, không cần băng keo.
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-0.5">
                        <input
                          type="checkbox"
                          id="saveRenterInfo"
                          checked={saveRenterInfo}
                          onChange={(e) => setSaveRenterInfo(e.target.checked)}
                          className="w-3.5 h-3.5 rounded border-stone-300 text-[#16442C] focus:ring-[#1E5638] cursor-pointer"
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
                          <span className="font-bold text-xs text-[#16442C] block">Tổng thanh toán:</span>
                          {checkoutShippingMode === "CLOOP_BOOK" && checkoutShippingFee === null ? (
                            <span className="text-[10px] text-amber-700 italic">* Chưa gồm cước vận chuyển GHN</span>
                          ) : checkoutProduct.listingTypeRaw !== "SELL" && calculatedDeposit > 0 ? (
                            <span className="text-[10px] text-stone-500 italic">* Đã gồm cọc (Hoàn lại 100% khi trả đồ)</span>
                          ) : null}
                        </div>
                        <span className="font-heading font-black text-lg text-[#16442C] font-mono">
                          {(
                            calculatedRentalFee + 
                            calculatedDeposit + 
                            (checkoutShippingMode === "CLOOP_BOOK" ? (checkoutShippingFee || 0) : 0)
                          ).toLocaleString("vi-VN")}đ
                        </span>
                      </div>
                    </div>

                    {/* Thông báo lỗi tạo đơn (Hiển thị ngay sát trên nút bấm để không bị khuất màn hình) */}
                    {bookingError && (
                      <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-2 shadow-xs">
                        <AlertCircle size={15} className="text-rose-600 shrink-0 mt-0.5" />
                        <div className="flex-1 leading-relaxed">{bookingError}</div>
                      </div>
                    )}

                    {/* Nút gửi đơn hàng */}
                    <div className="pt-1">
                      <button
                        type="submit"
                        disabled={isSubmittingBooking}
                        className="w-full h-12 rounded-xl bg-[#1E5638] text-white font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-2 shadow-md hover:bg-[#236341] transition disabled:opacity-50 cursor-pointer"
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
              <div className="sticky top-0 z-20 bg-[#1E5638] text-white px-4 py-3 flex items-center justify-between border-b border-emerald-900/40 shrink-0">
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
                  <h3 className="font-heading font-black text-sm text-[#16442C]">
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
                  <h3 className="font-heading font-black text-sm text-[#16442C]">
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
                  <h3 className="font-heading font-black text-sm text-[#16442C]">
                    Quy trình giặt hấp &amp; bảo quản cao cấp
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
              <div className="sticky top-0 z-20 bg-[#1E5638] text-white px-4 py-3 flex items-center justify-between border-b border-emerald-900/40 shrink-0">
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

        {/* ========================================================
            MODAL 1: LIÊN KẾT TÀI KHOẢN NGÂN HÀNG (BANK LINKING)
            ======================================================== */}
        {isBankModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="relative w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <div className="flex items-center gap-2">
                  <CreditCard size={18} className="text-emerald-700" />
                  <h3 className="font-heading font-black text-sm text-[#16442C] uppercase tracking-wide">
                    Liên Kết Ngân Hàng
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsBankModalOpen(false)}
                  className="p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {bankSaveSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs font-bold text-emerald-800">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <span>Đã liên kết tài khoản ngân hàng thành công!</span>
                </div>
              )}

              {bankError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-800">
                  {bankError}
                </div>
              )}

              <form onSubmit={handleSaveBankInfo} className="space-y-3 text-left">
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">
                    Ngân hàng thụ hưởng *
                  </label>
                  <select
                    required
                    value={bankForm.bankName}
                    onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-stone-300 bg-white text-xs font-medium outline-none focus:border-[#1E5638] cursor-pointer"
                  >
                    <option value="">-- Chọn ngân hàng thụ hưởng --</option>
                    {VIETNAM_BANKS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                {bankForm.bankName === "Khác" && (
                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-1">
                      Nhập tên ngân hàng của bạn *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="VD: Shinhan Bank, Public Bank..."
                      value={customBankName}
                      onChange={(e) => setCustomBankName(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-stone-300 bg-white text-xs font-medium outline-none focus:border-[#1E5638]"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">
                    Số tài khoản ngân hàng *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: 0866801743"
                    value={bankForm.bankAccount}
                    onChange={(e) => setBankForm({ ...bankForm, bankAccount: e.target.value.replace(/\s+/g, "") })}
                    className="w-full h-10 px-3 rounded-xl border border-stone-300 bg-white text-xs font-mono font-bold outline-none focus:border-[#1E5638]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">
                    Họ &amp; Tên chủ tài khoản (In hoa không dấu) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: NGUYEN MAI ANH"
                    value={bankForm.bankOwner}
                    onChange={(e) => setBankForm({ ...bankForm, bankOwner: e.target.value.toUpperCase() })}
                    className="w-full h-10 px-3 rounded-xl border border-stone-300 bg-white text-xs font-bold uppercase outline-none focus:border-[#1E5638]"
                  />
                  <p className="text-[10px] text-stone-500 mt-1 leading-tight italic">
                    * Tên chủ tài khoản ngân hàng phải trùng khớp với tài khoản CLOOP để tiền được giải ngân đúng chính chủ.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSavingBank}
                    className="w-full h-10 bg-[#1E5638] hover:bg-[#236341] text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {isSavingBank ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        <span>Đang lưu...</span>
                      </>
                    ) : (
                      <span>Lưu Tài Khoản Ngân Hàng</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================
            MODAL 2: YÊU CẦU RÚT TIỀN VỀ NGÂN HÀNG (WITHDRAWAL)
            ======================================================== */}
        {isWithdrawModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="relative w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <div className="flex items-center gap-2">
                  <CreditCard size={18} className="text-emerald-700" />
                  <h3 className="font-heading font-black text-sm text-[#16442C] uppercase tracking-wide">
                    Rút Tiền Về Ngân Hàng
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsWithdrawModalOpen(false)}
                  className="p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {withdrawSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs font-bold text-emerald-800">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <span>{withdrawSuccessMsg}</span>
                </div>
              )}

              {withdrawErrorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-800">
                  {withdrawErrorMsg}
                </div>
              )}

              <form onSubmit={handleConfirmWithdrawal} className="space-y-3.5 text-left">
                {/* Thông tin tài khoản thụ hưởng */}
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider block">
                      Tài khoản nhận tiền:
                    </span>
                    <p className="font-heading font-black text-xs text-[#16442C]">
                      {bankForm.bankName} • {bankForm.bankAccount}
                    </p>
                    <p className="text-[10px] text-stone-600 font-bold uppercase">
                      Chủ TK: {bankForm.bankOwner}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsWithdrawModalOpen(false);
                      setIsBankModalOpen(true);
                    }}
                    className="text-[10px] font-bold text-emerald-800 underline cursor-pointer"
                  >
                    Đổi STK
                  </button>
                </div>

                {/* Nhập số tiền rút */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-stone-700">
                      Số tiền muốn rút (VNĐ) *
                    </label>
                    <button
                      type="button"
                      onClick={() => setWithdrawAmount((closetData?.user?.walletBalance || 0).toLocaleString("vi-VN"))}
                      className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"
                    >
                      Rút tất cả
                    </button>
                  </div>

                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    placeholder="Tối thiểu 50.000đ"
                    value={withdrawAmount}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "");
                      if (!raw) {
                        setWithdrawAmount("");
                        return;
                      }
                      const num = parseInt(raw, 10);
                      if (!isNaN(num)) {
                        setWithdrawAmount(num.toLocaleString("vi-VN"));
                      }
                    }}
                    className="w-full h-11 px-3 rounded-xl border border-stone-300 bg-white font-mono font-bold text-base text-[#16442C] outline-none focus:border-[#1E5638]"
                  />

                  {/* Quick chips */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {[50000, 100000, 200000].filter(amt => amt <= (closetData?.user?.walletBalance || 0)).map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setWithdrawAmount(amt.toLocaleString("vi-VN"))}
                        className="px-2.5 py-1 text-[10.5px] font-bold rounded-lg bg-stone-100 hover:bg-emerald-50 hover:text-emerald-800 border border-stone-200 transition cursor-pointer"
                      >
                        {amt.toLocaleString("vi-VN")}đ
                      </button>
                    ))}
                    {(closetData?.user?.walletBalance || 0) >= 50000 && (
                      <button
                        type="button"
                        onClick={() => setWithdrawAmount((closetData?.user?.walletBalance || 0).toLocaleString("vi-VN"))}
                        className="px-2.5 py-1 text-[10.5px] font-bold rounded-lg bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300 transition cursor-pointer"
                      >
                        Toàn bộ ({(closetData?.user?.walletBalance || 0).toLocaleString("vi-VN")}đ)
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-stone-500 mt-1.5 font-mono">
                    <span>Số dư khả dụng:</span>
                    <strong className="text-emerald-800">
                      {(closetData?.user?.walletBalance || 0).toLocaleString("vi-VN")}đ
                    </strong>
                  </div>
                </div>

                {/* Mật khẩu giao dịch */}
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">
                    Mật khẩu tài khoản (Bảo mật giao dịch)
                  </label>
                  <input
                    type="password"
                    placeholder="Nhập mật khẩu xác thực..."
                    value={withdrawPassword}
                    onChange={(e) => setWithdrawPassword(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-stone-300 bg-white text-xs outline-none focus:border-[#1E5638]"
                  />
                  <p className="text-[10px] text-stone-400 mt-0.5 italic">
                    * Yêu cầu rút tiền được đối soát tự động và giải ngân trong 5 - 15 phút.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmittingWithdraw || !withdrawAmount || (parseInt(withdrawAmount.replace(/\D/g, ""), 10) < 50000) || (parseInt(withdrawAmount.replace(/\D/g, ""), 10) > (closetData?.user?.walletBalance || 0))}
                    className="w-full h-11 bg-[#1E5638] hover:bg-[#236341] text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isSubmittingWithdraw ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Đang tạo lệnh rút tiền...</span>
                      </>
                    ) : (
                      <span>Xác Nhận Tạo Lệnh Rút Tiền</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL TÌM KIẾM HÌNH ẢNH LOOKBOOK BẰNG AI (QUÉT KHO TỨC THÌ + CHỌN ĐỒ NGAY TRONG APP) */}
        <VisualSearchModal
          isOpen={isVisualSearchOpen}
          onClose={() => setIsVisualSearchOpen(false)}
          catalogProducts={products}
          onSelectProduct={(prod) => handleOpenCheckout(prod)}
        />

        {/* MODAL TÌM KIẾM BẰNG GIỌNG NÓI TIẾNG VIỆT (0Đ NATIVE) */}
        <VoiceSearchModal
          isOpen={isVoiceSearchOpen}
          onClose={() => setIsVoiceSearchOpen(false)}
          onTranscript={(text) => {
            setSearchQuery(text);
            setActiveTab("shop");
          }}
        />

        {/* MODAL ĐẨY BÀI LÊN TOP (VÍ LÁ / VÍ TIỀN / CHUYỂN KHOẢN NGÂN HÀNG) */}
        <BoostListingModal
          isOpen={isBoostModalOpen}
          onClose={() => {
            setIsBoostModalOpen(false);
            setBoostTargetProductId(undefined);
          }}
          items={safeMyProducts.map((p: any) => ({
            id: p.id,
            title: p.title,
            image: p.image || FALLBACK_CLOUDINARY_IMG,
            size: p.size,
            rentalPrice: p.rentalPrice,
            salePrice: p.salePrice,
            boostExpiresAt: p.boostExpiresAt,
            isBoostActive: Boolean(p.boostExpiresAt && new Date(p.boostExpiresAt) > new Date()),
            boostRemainingHours: p.boostExpiresAt && new Date(p.boostExpiresAt) > new Date()
              ? Math.max(1, Math.round((new Date(p.boostExpiresAt).getTime() - Date.now()) / (3600 * 1000)))
              : 0,
            boostScore: p.boostScore || 0
          }))}
          preSelectedItemId={boostTargetProductId}
          userCoins={closetData?.user?.cloopCoins || 0}
          walletBalance={closetData?.user?.walletBalance || 0}
          clientUserId={currentUser?.id || closetData?.user?.id}
          onSuccess={handleBoostSuccess}
        />

        {/* MODAL CHI TIẾT ĐƠN HÀNG TRÊN APP MOBILE */}
        <OrderDetailModal
          isOpen={Boolean(selectedOrderForDetail)}
          onClose={() => setSelectedOrderForDetail(null)}
          order={selectedOrderForDetail}
          role={orderDetailRole}
          clientUserId={currentUser?.id || closetData?.user?.id}
          onStatusUpdated={(orderId, newStatus) => {
            setClosetData((prev: any) => {
              if (!prev) return prev;
              const updateList = (list: any[]) =>
                (list || []).map((o: any) => (o.id === orderId ? { ...o, status: newStatus } : o));
              return {
                ...prev,
                ordersAsRenter: updateList(prev.ordersAsRenter),
                ordersAsLender: updateList(prev.ordersAsLender)
              };
            });
            setSelectedOrderForDetail((prev: any) => (prev ? { ...prev, status: newStatus } : null));
          }}
        />

      </div>
    </div>
  );
}
