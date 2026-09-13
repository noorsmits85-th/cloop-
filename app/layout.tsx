import { createClient } from "@/src/utils/supabase/server";
import { 
  Fraunces, 
  Be_Vietnam_Pro, 
  Dancing_Script, 
  Caveat, 
  Cormorant_Garamond 
} from "next/font/google";
import "./globals.css";
import { AuthModalProvider } from "./AuthModalContext";
import SmoothScroll from "./components/SmoothScroll";
import ClientLayout from "./components/ClientLayout";
import { Toaster } from "sonner";

// 🌿 1. Font Tiêu Đề Lớn & Logo: Fraunces (Chuẩn sang trọng 100% như mẫu Ví CLOOP)
const fraunces = Fraunces({
  subsets: ["latin", "vietnamese"],
  display: "swap",
  variable: "--font-fraunces",
  weight: ["400", "500", "600", "700", "800", "900"],
});

// 🌿 2. Font Nội Dung & Giao Diện: Be Vietnam Pro (Hiện đại, tối ưu tiếng Việt có dấu)
const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  display: "swap",
  variable: "--font-be-vietnam-pro",
  weight: ["300", "400", "500", "600", "700", "800"],
});

// 🌿 3. Font Chữ Viết Tay Nghệ Thuật (Scrapbook / Lookbook): Dancing Script
const dancingScript = Dancing_Script({
  subsets: ["latin", "vietnamese"],
  display: "swap",
  variable: "--font-dancing-script",
  weight: ["500", "600", "700"],
});

// 🌿 4. Font Ghi Chú Sổ Tay Lưu Bút: Caveat
const caveat = Caveat({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-caveat",
  weight: ["500", "600", "700"],
});

// 🌿 5. Font Cổ Điển Tạp Chí: Cormorant Garamond
const cormorant = Cormorant_Garamond({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-cormorant",
  weight: ["400", "500", "600", "700"],
});

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let initialUser = null;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      initialUser = {
        id: user.id,
        email: user.email || "",
        name: user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Member",
        isLoggedIn: true
      };
    }
  } catch (_) {}

  return (
    <html 
      lang="vi" 
      className={`${fraunces.variable} ${beVietnamPro.variable} ${dancingScript.variable} ${caveat.variable} ${cormorant.variable}`}
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0A2517" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="CLOOP" />
        <link rel="apple-touch-icon" href="/app-icon.jpg" />
      </head>
      <body className="font-body text-gray-800 antialiased">
        <Toaster position="top-right" richColors theme="light" closeButton />
        <SmoothScroll>
          <AuthModalProvider initialUser={initialUser}>
            <ClientLayout>{children}</ClientLayout>
          </AuthModalProvider>
        </SmoothScroll>
      </body>
    </html>
  );
}
