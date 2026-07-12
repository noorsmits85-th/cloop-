"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface CurrentUser {
  name: string;
  email: string;
}

interface AuthModalContextType {
  showAuthModal: boolean;
  setShowAuthModal: React.Dispatch<React.SetStateAction<boolean>>;
  activeFeatureName: string;
  handleFeatureRequirement: (featureName: string) => void;
  currentUser: CurrentUser | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<CurrentUser | null>>;
}

const AuthModalContext = createContext<AuthModalContextType | null>(null);

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [activeFeatureName, setActiveFeatureName] = useState("");
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  const handleFeatureRequirement = (featureName: string) => {
    // 🟢 SỬA LỖI CỨNG CODE: Kiểm tra sự tồn tại của cloop_user_id trong localStorage cục bộ
    let isLoggedIn = false;
    if (typeof window !== "undefined") {
      isLoggedIn = !!localStorage.getItem("cloop_user_id");
    }

    if (isLoggedIn) {
      // Nếu đã có ID Xanh, xử lý phản hồi tính năng động tương ứng thay vì ép đăng nhập tiếp
      if (featureName === "TÁI CHẾ" || featureName === "Tái chế") {
        alert("🌱 CLOOP Eco: Hệ thống đang kết nối tài khoản của bạn trực tiếp tới mạng lưới xưởng Upcycle và trạm thu hồi xanh địa phương!");
      } else if (featureName === "Mở tủ đồ xanh" || featureName === "Mở gian hàng") {
        alert("✓ Hệ thống bảo chứng: Tài khoản ID Xanh của bạn đã kích hoạt và đồng bộ hóa toàn bộ kho phục trang đăng tải thành công nhé!");
      } else {
        alert(`Tính năng "${featureName}" đã được kích hoạt thành công cho tài khoản chính chủ của bạn!`);
      }
      return; // Chặn đứng luồng không cho bật Modal đăng ký đúp lớp
    }

    // Luồng rẽ nhánh mở Modal kích hoạt dành riêng cho khách vãng lai
    setActiveFeatureName(featureName);
    setShowAuthModal(true);
  };

  return (
    <AuthModalContext.Provider
      value={{
        showAuthModal,
        setShowAuthModal,
        activeFeatureName,
        handleFeatureRequirement,
        currentUser,
        setCurrentUser,
      }}
    >
      {children}
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  const ctx = useContext(AuthModalContext);
  if (!ctx) {
    throw new Error("useAuthModal must be used inside AuthModalProvider.");
  }
  return ctx;
}