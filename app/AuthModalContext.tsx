"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://notxrjsuukrrxdlboavo.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "temporary-placeholder-key";
const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

export interface CurrentUser {
  name: string;
  email: string;
  isLoggedIn: boolean;
  id?: string;
}

interface AuthModalContextType {
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;
  activeFeatureName: string;
  handleFeatureRequirement: (featureName: string) => void;
  currentUser: CurrentUser | null;
  setCurrentUser: (user: CurrentUser | null) => void;
}

const AuthModalContext = createContext<AuthModalContextType | null>(null);

export const AuthModalProvider = ({ children, initialUser = null }: { children: ReactNode, initialUser?: CurrentUser | null }) => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [activeFeatureName, setActiveFeatureName] = useState("");
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(initialUser);

  // Lắng nghe trạng thái đăng nhập từ Supabase
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          let name = session.user.user_metadata?.name || session.user.email?.split("@")[0] || "Member";
          setCurrentUser({
            name,
            email: session.user.email || "",
            isLoggedIn: true,
            id: session.user.id
          });
        } else {
          setCurrentUser(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleFeatureRequirement = async (featureName: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    let isLoggedIn = !!session;

    if (isLoggedIn) {
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