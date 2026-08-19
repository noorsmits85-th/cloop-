import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import "./globals.css";
import { AuthModalProvider } from "./AuthModalContext";
import SmoothScroll from "./components/SmoothScroll";
import ClientLayout from "./components/ClientLayout";
import { Toaster } from "sonner";

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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,600..900;1,6..96,600..900&family=Cinzel:wght@500;600;700;800;900&family=Cinzel+Decorative:wght@700;900&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=Fraunces:ital,opsz,wght@0,9..144,400..900;1,9..144,400..900&family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=Italiana&family=Lora:ital,wght@0,400..700;1,400..700&family=Montserrat:wght@400;500;600;700;800;900&family=Outfit:wght@400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,600;0,700;0,800;1,600;1,700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Prata&family=Syncopate:wght@400;700&family=Syne:wght@500;600;700;800&family=Tenor+Sans&family=Be+Vietnam+Pro:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400;1,600&display=swap" />
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
