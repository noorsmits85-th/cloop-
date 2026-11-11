import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "./src/utils/supabase/middleware";
import { checkEdgeRateLimit, checkLocalMemoryRateLimit } from "./src/lib/rate-limit";
import { getTrustedClientIp } from "./src/lib/request-ip";
import { verifySameOriginRequest } from "./src/lib/csrf";

const STATIC_ASSET_REGEX = /\.(css|js|png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|eot)$/i;

function buildCspHeader(nonce: string): string {
  const isDev = process.env.NODE_ENV === "development";
  const scriptSrc = isDev
    ? `'self' 'nonce-${nonce}' 'unsafe-eval' https://res.cloudinary.com https://challenges.cloudflare.com https://client.crisp.chat https://vercel.live`
    : `'self' 'nonce-${nonce}' 'strict-dynamic' https://res.cloudinary.com https://challenges.cloudflare.com https://client.crisp.chat https://vercel.live`;

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://client.crisp.chat",
    "img-src 'self' blob: data: https://res.cloudinary.com https://notxrjsuukrrxdlboavo.supabase.co https://storage.googleapis.com https://lh3.googleusercontent.com https://drive.googleusercontent.com https://images.unsplash.com https://img.vietqr.io https://vietqr.net https://image.crisp.chat https://client.crisp.chat",
    "font-src 'self' https://fonts.gstatic.com https://client.crisp.chat data:",
    "connect-src 'self' https://notxrjsuukrrxdlboavo.supabase.co wss://notxrjsuukrrxdlboavo.supabase.co https://api.cloudinary.com https://res.cloudinary.com https://storage.googleapis.com https://www.googleapis.com https://pay.payos.vn https://api-merchant.payos.vn https://online-gateway.ghn.vn https://client.crisp.chat wss://client.relay.crisp.chat https://storage.crisp.chat",
    "frame-src 'self' https://challenges.cloudflare.com https://pay.payos.vn https://res.cloudinary.com https://game.crisp.chat",
    "media-src 'self' blob: data: https://res.cloudinary.com https://notxrjsuukrrxdlboavo.supabase.co https://storage.googleapis.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://pay.payos.vn https://my.payos.vn",
    "frame-ancestors 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ];

  return directives.join("; ");
}

function applySecurityHeaders(response: NextResponse, cspHeader: string): NextResponse {
  response.headers.set("Content-Security-Policy", cspHeader);
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(self), microphone=(self), geolocation=(), browsing-topics=()"
  );
  if (process.env.NODE_ENV !== "development") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload"
    );
  }
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/cron") ||
    pathname.startsWith("/api/zalo-webhook") ||
    pathname === "/favicon.ico" ||
    STATIC_ASSET_REGEX.test(pathname)
  ) {
    return NextResponse.next();
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const cspHeader = buildCspHeader(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", cspHeader);

  const userAgent = request.headers.get("user-agent") || "";
  const isMobileOrZalo = /Android|iPhone|iPad|iPod|Zalo|MiniApp|Mobile/i.test(userAgent);
  const isWebOldRoute = pathname === "/" || pathname === "/ai-stylist" || pathname === "/blog";

  if (isMobileOrZalo && isWebOldRoute) {
    const appUrl = new URL("/app", request.url);
    if (search) {
      appUrl.search = search;
    }
    return applySecurityHeaders(NextResponse.redirect(appUrl), cspHeader);
  }

  const method = request.method.toUpperCase();

  // Global CSRF Origin/Referer Verification on State-Changing API Requests
  const isExternalWebhook =
    pathname.startsWith("/api/webhooks/payos") ||
    pathname.startsWith("/api/zalo-webhook") ||
    pathname.startsWith("/api/cron");

  if (
    pathname.startsWith("/api/") &&
    !isExternalWebhook &&
    method !== "GET" &&
    method !== "HEAD" &&
    method !== "OPTIONS"
  ) {
    if (!verifySameOriginRequest(request)) {
      return applySecurityHeaders(
        NextResponse.json(
          {
            success: false,
            error: "Forbidden: Yêu cầu cross-origin không hợp lệ (CSRF Protection).",
          },
          { status: 403 }
        ),
        cspHeader
      );
    }
  }

  // Edge Rate Limiting (Không bao giờ bỏ qua rate limit dựa trên header prefetch do client tự gửi)
  {
    const clientIp = getTrustedClientIp(request);

    let rlType: "auth" | "dashboard" | "shop" | "api" | null = null;
    if (pathname.startsWith("/login") || pathname.startsWith("/auth/")) {
      rlType = "auth";
    } else if (
      pathname.startsWith("/my-closet") ||
      pathname.startsWith("/admin") ||
      pathname.startsWith("/checkout")
    ) {
      rlType = "dashboard";
    } else if (pathname.startsWith("/shop") || pathname.startsWith("/api/products")) {
      rlType = "shop";
    } else if (pathname.startsWith("/api/")) {
      if (
        !pathname.startsWith("/api/visual-search") &&
        !pathname.startsWith("/api/voice-transcribe")
      ) {
        rlType = "api";
      }
    }

    if (rlType) {
      const isReadPageNavigation =
        !pathname.startsWith("/api/") && (method === "GET" || method === "HEAD");

      const rlRes = isReadPageNavigation
        ? checkLocalMemoryRateLimit(`cloop:nav:${rlType}:${clientIp}`, 90, 60_000)
        : await checkEdgeRateLimit(clientIp, rlType);

      if (!rlRes.success) {
        const resetSec = rlRes.reset
          ? Math.max(1, Math.ceil((rlRes.reset - Date.now()) / 1000))
          : 60;

        if (pathname.startsWith("/api/")) {
          return applySecurityHeaders(
            NextResponse.json(
              {
                success: false,
                error:
                  "Hệ thống đang tiếp nhận quá nhiều yêu cầu từ thiết bị của bạn. Vui lòng thử lại sau.",
                retryAfter: resetSec,
              },
              {
                status: 429,
                headers: {
                  "Retry-After": String(resetSec),
                  "X-RateLimit-Limit": String(rlRes.limit || 0),
                  "X-RateLimit-Remaining": "0",
                },
              }
            ),
            cspHeader
          );
        }

        return applySecurityHeaders(
          new NextResponse(
            `<!DOCTYPE html>
          <html lang="vi">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>429 - Hệ thống đang tiếp nhận quá nhiều yêu cầu | CLOOP</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #FAF9F5; color: #183A2D; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
              .card { background: white; padding: 40px; border-radius: 24px; border: 1px solid #E9E2D8; box-shadow: 0 10px 30px rgba(0,0,0,0.05); max-width: 440px; text-align: center; }
              h1 { font-size: 20px; margin-bottom: 12px; }
              p { font-size: 13px; color: #666; line-height: 1.6; margin-bottom: 24px; }
              .btn { background: #183A2D; color: white; padding: 12px 24px; border-radius: 999px; text-decoration: none; font-size: 13px; font-weight: bold; display: inline-block; }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>Hệ thống đang tiếp nhận quá nhiều yêu cầu</h1>
              <p>Vui lòng đợi <strong>${resetSec} giây</strong> trước khi tải lại trang để bảo vệ an toàn cho hệ sinh thái thời trang tuần hoàn CLOOP.</p>
              <a href="/" class="btn">Quay về Trang chủ</a>
            </div>
          </body>
          </html>`,
            {
              status: 429,
              headers: {
                "Content-Type": "text/html; charset=utf-8",
                "Retry-After": String(resetSec),
                "X-RateLimit-Limit": String(rlRes.limit || 0),
                "X-RateLimit-Remaining": "0",
              },
            }
          ),
          cspHeader
        );
      }
    }
  }

  // Protected API & Page Definitions (Default-Deny on Sensitive API Prefixes)
  const isProtectedApi =
    pathname.startsWith("/api/disputes") ||
    pathname.startsWith("/api/user") ||
    pathname.startsWith("/api/checkout") ||
    pathname.startsWith("/api/upload") ||
    pathname.startsWith("/api/upload-drive") ||
    pathname.startsWith("/api/storage") ||
    pathname.startsWith("/api/ai-") ||
    pathname.startsWith("/api/analyze-fit") ||
    pathname.startsWith("/api/moderate-image") ||
    pathname.startsWith("/api/stylist") ||
    (pathname.startsWith("/api/products") && method !== "GET" && method !== "HEAD");

  const isProtectedPage =
    pathname.startsWith("/my-closet") || pathname.startsWith("/admin");

  if (!isProtectedApi && !isProtectedPage) {
    const publicRes = NextResponse.next({
      request: { headers: requestHeaders },
    });
    return applySecurityHeaders(publicRes, cspHeader);
  }

  // Fast-path for protected pages:
  // 1. If no Supabase cookie is present at all, redirect immediately in 0ms without a network call.
  // 2. If a Supabase cookie IS present on a page/Server Action request, let the Server Component's
  //    cached requireUser() / requireAdminOrRedirect() verify the JWT once so we don't call
  //    supabase.auth.getUser() twice sequentially (once in Middleware + once in Server Component).
  const hasAuthCookie = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-") || c.name.includes("auth-token"));

  if (isProtectedPage && !isProtectedApi) {
    if (!hasAuthCookie) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirectTo", `${pathname}${search}`);
      return applySecurityHeaders(NextResponse.redirect(loginUrl), cspHeader);
    }

    const pageRes = NextResponse.next({
      request: { headers: requestHeaders },
    });
    return applySecurityHeaders(pageRes, cspHeader);
  }

  try {
    if (!hasAuthCookie) {
      return applySecurityHeaders(
        NextResponse.json(
          {
            success: false,
            error: "Unauthorized: Yêu cầu đăng nhập để truy cập tài nguyên này",
          },
          { status: 401 }
        ),
        cspHeader
      );
    }

    const { response, user, error } = await updateSession(request);

    if (!user || error) {
      return applySecurityHeaders(
        NextResponse.json(
          {
            success: false,
            error: "Unauthorized: Yêu cầu đăng nhập để truy cập tài nguyên này",
          },
          { status: 401 }
        ),
        cspHeader
      );
    }

    response.headers.set("x-nonce", nonce);
    return applySecurityHeaders(response, cspHeader);
  } catch (error) {
    console.error("[Middleware Auth Failure - Fail Closed]:", error);

    return applySecurityHeaders(
      NextResponse.json(
        {
          success: false,
          error: "Unauthorized: Không thể xác thực phiên người dùng",
        },
        { status: 401 }
      ),
      cspHeader
    );
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2)$).*)",
  ],
};
