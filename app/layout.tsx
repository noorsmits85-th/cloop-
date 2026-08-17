import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import "./globals.css";
import { AuthModalProvider } from "./AuthModalContext";
import SmoothScroll from "./components/SmoothScroll";
import ClientLayout from "./components/ClientLayout";
import { Toaster } from "sonner";

import { Inter } from "next/font/google";

const inter = Inter({ 
  subsets: ["latin", "vietnamese"],
  display: "swap", 
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
    <html lang="vi">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0A2517" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="CLOOP" />
        <link rel="apple-touch-icon" href="/app-icon.jpg" />
      </head>
      <body className={`${inter.className} text-gray-800 antialiased`}>
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
