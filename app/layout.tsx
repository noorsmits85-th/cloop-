import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Fraunces, Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import { AuthModalProvider } from "./AuthModalContext";
import SmoothScroll from "./components/SmoothScroll";
import ClientLayout from "./components/ClientLayout";
import { Toaster } from "sonner";

// 🌿 1. Font Tiêu Đề Lớn (Heading / Logo): Fraunces phong cách sang trọng & cao cấp
const fraunces = Fraunces({
  subsets: ["latin", "vietnamese"],
  display: "swap",
  variable: "--font-fraunces",
  weight: ["400", "500", "600", "700", "800", "900"],
});

// 🌿 2. Font Nội Dung & Giao Diện (Body / Subtitle / UI): Be Vietnam Pro hiện đại, rõ nét tiếng Việt
const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  display: "swap",
  variable: "--font-be-vietnam-pro",
  weight: ["300", "400", "500", "600", "700", "800"],
});

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://notxrjsuukrrxdlboavo.supabase.co";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "temporary-placeholder-key";
  
  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // Error handling
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch (error) {
            // Error handling
          }
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();
  
  let initialUser = null;
  if (session?.user) {
    const { user } = session;
    initialUser = {
      id: user.id,
      email: user.email || "",
      name: user.user_metadata?.name || user.email?.split("@")[0] || "Member",
      isLoggedIn: true
    };
  }

  return (
    <html lang="vi" className={`${fraunces.variable} ${beVietnamPro.variable}`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0A2517" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="CLOOP" />
        <link rel="apple-touch-icon" href="/app-icon.jpg" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&family=Fraunces:ital,opsz,wght@0,9..144,600..900;1,9..144,600..900&display=swap" />
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
