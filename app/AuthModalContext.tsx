"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { createClient } from "@/src/utils/supabase/client";

export interface CurrentUser {
  name: string;
  email: string;
  isLoggedIn: boolean;
  id?: string;
  avatar?: string;
}

export type AuthModeType = 'login' | 'register' | 'forgot' | 'forgot_otp';

interface AuthModalContextType {
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;
  authMode: AuthModeType;
  setAuthMode: (mode: AuthModeType) => void;
  openAuthModal: (mode?: 'login' | 'register') => void;
  activeFeatureName: string;
  handleFeatureRequirement: (featureName: string) => void;
  currentUser: CurrentUser | null;
  setCurrentUser: (user: CurrentUser | null) => void;
}

const AuthModalContext = createContext<AuthModalContextType | null>(null);

export const AuthModalProvider = ({ children, initialUser = null }: { children: ReactNode, initialUser?: CurrentUser | null }) => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<AuthModeType>('login');
  const [activeFeatureName, setActiveFeatureName] = useState("");

  const openAuthModal = (mode: 'login' | 'register' = 'login') => {
    setAuthMode(mode);
    setShowAuthModal(true);
  };
  const [currentUser, setCurrentUserState] = useState<CurrentUser | null>(() => {
    if (initialUser) return initialUser;
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("cloop_auth_user");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.email) return parsed;
        }
      } catch (_) {}
    }
    return null;
  });

  const setCurrentUser = (user: CurrentUser | null) => {
    setCurrentUserState(user);
    if (typeof window !== "undefined") {
      try {
        if (user) {
          localStorage.setItem("cloop_auth_user", JSON.stringify(user));
        } else {
          localStorage.removeItem("cloop_auth_user");
        }
      } catch (_) {}
    }
  };

  const supabase = createClient();

  // Tự động bật Modal nếu URL có ?auth=login hoặc ?auth=signup
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const authQuery = params.get("auth");
      if (authQuery === "signup" || authQuery === "register") {
        setAuthMode("register");
        setShowAuthModal(true);
      } else if (authQuery === "login") {
        setAuthMode("login");
        setShowAuthModal(true);
      }
    }
  }, []);

  // Lắng nghe và đồng bộ trạng thái đăng nhập từ Supabase Cookies & LocalStorage
  useEffect(() => {
    // 1. Phục hồi ngay lập tức từ LocalStorage nếu state hiện tại đang trống
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("cloop_auth_user");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.email) {
            setCurrentUserState(prev => prev || parsed);
          }
        }
      } catch (_) {}
    }

    // 2. Xác thực với Supabase Session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const name = session.user.user_metadata?.name || session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "Thành viên";
        const uObj: CurrentUser = {
          name,
          email: session.user.email || "",
          isLoggedIn: true,
          id: session.user.id
        };
        setCurrentUser(uObj);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_OUT") {
          setCurrentUser(null);
        } else if (session?.user) {
          let name = session.user.user_metadata?.name || session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "Thành viên";
          const uObj: CurrentUser = {
            name,
            email: session.user.email || "",
            isLoggedIn: true,
            id: session.user.id
          };
          setCurrentUser(uObj);
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
        authMode,
        setAuthMode,
        openAuthModal,
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
