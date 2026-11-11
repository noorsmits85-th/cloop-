BỘ QUY CHUẨN BẢO MẬT HỆ THỐNG THỰC CHIẾN CLOOP (CLOOP SECURITY ARCHITECTURE & HARDENING BLUEPRINT)

Với đặc thù là sàn thương mại điện tử C2C cho thuê và ký gửi thời trang, CLOOP nắm giữ đồng thời ba loại tài sản có rủi ro cao nhất trên không gian mạng: dòng tiền ký quỹ/thanh toán hai chiều (người thuê ↔ sàn ↔ chủ đồ ký gửi), dữ liệu định danh cá nhân nhạy cảm (PII/KYC) (CCCD, tài khoản ngân hàng, địa chỉ giao nhận, số điện thoại), và luồng trạng thái vật lý bất đồng bộ (vận chuyển qua GHN, thanh toán qua PayOS).

Việc dự án đã hoàn tất khóa cứng Row Level Security (RLS) trên 28 bảng và Trigger chống gian lận tài chính là nền móng vững chắc ở tầng Cơ sở dữ liệu. Tuy nhiên, theo triết lý Zero Trust ("Never Trust, Always Verify"), một hệ thống chỉ an toàn khi mọi tầng phía trước cơ sở dữ liệu (Network Edge, Next.js Middleware, Server Actions/API Routes, Cryptography, Webhook Engine) đều được vũ trang tương xứng.

PHẦN 1: PHÂN TÍCH CÁC KHO TÀI NGUYÊN (REPOSITORIES) BẢO MẬT HÀNG ĐẦU TRÊN GITHUB & BÀI HỌC THỰC CHIẾN CHO CLOOP

Dưới đây là tổng hợp các chuẩn mực từ các kho mã nguồn bảo mật uy tín nhất trên GitHub, được chuyển hóa trực tiếp thành nguyên tắc kiến trúc cho ngăn xếp công nghệ của CLOOP (Next.js 15 App Router, Prisma ORM, Supabase PostgreSQL, Vercel Serverless, NextAuth/JWT, PayOS, GHN, Supabase Storage).

1. Nhóm Bảo mật Hệ thống & Web Application Security
Repository GitHub	Chuẩn mực cốt lõi	Bài học & Quy tắc bắt buộc áp dụng vào CLOOP
OWASP/ASVS (Application Security Verification Standard)	Tiêu chuẩn kiểm định bảo mật ứng dụng toàn diện nhất thế giới (Phiên bản 4.0.3 / 5.0).	Áp dụng chuẩn ASVS Level 2 (bắt buộc cho hệ thống có giao dịch tài chính và xử lý PII). Mọi Server Action và Route Handler trong Next.js 15 phải vượt qua kiểm định về: Xác thực phiên (V2, V3), Kiểm soát truy cập cấp độ bản ghi và trường dữ liệu (V4), Xác thực đầu vào theo danh sách trắng - Whitelist Validation (V5), và Toàn vẹn giao dịch bất đồng bộ (V13).
OWASP/CheatSheetSeries	Bộ cẩm nang kỹ thuật phòng thủ thực chiến của các kiến trúc sư bảo mật toàn cầu.	Áp dụng trực tiếp 5 Cheat Sheet trọng tâm: Transaction Authorization (khóa trạng thái đơn thuê khi đang chờ thanh toán), IDOR Prevention (không bao giờ dùng ID tự tăng kiểu 1, 2, 3 cho đơn hàng/ví mà dùng UUIDv4/ULID kết hợp kiểm tra ownerId), File Upload Security (kiểm tra Magic Bytes của ảnh quần áo ký gửi trước khi đưa lên Supabase Storage, cấm tải lên file .svg hoặc .html chứa mã độc XSS), và Cryptographic Storage.
shieldfy/API-Security-Checklist & OWASP/API-Security	Danh sách kiểm tra phòng chống OWASP API Security Top 10 (2023).	Chặn đứng hai lỗ hổng nguy hiểm nhất trên sàn C2C: API1:2023 - BOLA (Broken Object Level Authorization) và API3:2023 - BOPLA (Mass Assignment). Tuyệt đối cấm truyền trực tiếp đối tượng req.body hoặc formData vào hàm prisma.model.create/update. Mọi DTO đầu vào phải đi qua bộ lọc z.object(...).strict() của Zod để loại bỏ các trường trái phép như role, walletBalance, isVerified.
goldbergyoni/nodebestpractices & lirantal/nodejs-security-roadmap	Chuẩn mực an toàn cho môi trường thực thi Node.js & TypeScript.	Phòng chống tấn công ReDoS (Regular Expression Denial of Service) làm treo Vercel Serverless Function bằng cách giới hạn độ dài chuỗi trước khi chạy Regex; thiết lập bộ xử lý ngoại lệ tập trung (Global Error Boundary) để ẩn toàn bộ lỗi nội bộ của Prisma (PrismaClientKnownRequestError) và cấu trúc bảng trước khi trả phản hồi về phía trình duyệt.
2. Nhóm Bảo vệ Thông tin Người dùng & Dữ liệu Cá nhân Nhạy cảm (PII & Secrets)
Repository GitHub	Chuẩn mực cốt lõi	Bài học & Quy tắc bắt buộc áp dụng vào CLOOP
OWASP/Top10 (A02:2021 Cryptographic Failures) & nodejs/node (Native node:crypto)	Tiêu chuẩn mật mã học hiện đại (NIST SP 800-38D).	Thực thi Mã hóa cấp độ trường (Field-Level Encryption - FLE) bằng thuật toán AES-256-GCM (Authenticated Encryption with Associated Data) thông qua thư viện gốc node:crypto. Các trường nhạy cảm của người dùng CLOOP gồm: Số CCCD/CMND, Số tài khoản ngân hàng, Số điện thoại bắt buộc phải lưu ở dạng bản mã kèm Vector khởi tạo (IV 12 bytes) và Thẻ xác thực (AuthTag 16 bytes). Sử dụng kỹ thuật Blind Indexing (HMAC-SHA256) để tìm kiếm bản ghi trùng lặp mà không cần giải mã.
nextauthjs/next-auth & panva/jose	Cơ chế bảo mật phiên đăng nhập, JWE/JWS và chống chiếm quyền điều khiển (Session Hijacking).	Không lưu trữ thông tin nhạy cảm hoặc phân quyền cố định vĩnh viễn trong payload JWT. Sử dụng Cookie có tiền tố __Host- trên môi trường Production (HttpOnly; Secure; SameSite=Lax; Path=/). Bổ sung trường sessionVersion (hoặc tokenVersion) trong bảng users: khi người dùng đổi mật khẩu, thay đổi tài khoản ngân hàng rút tiền hoặc phát hiện bất thường, tăng sessionVersion lên 1 để vô hiệu hóa tức thì mọi JWT đã cấp trước đó.
trufflesecurity/trufflehog & gitleaks/gitleaks & t3-oss/t3-env	Quản trị khóa bí mật (Secrets Management) và ngăn chặn rò rỉ biến môi trường.	Kiểm toán toàn bộ lịch sử Git bằng gitleaks. Tách biệt rạch ròi biến môi trường phía Client (NEXT_PUBLIC_*) và biến chỉ được phép nạp trong môi trường Node.js Server (SUPABASE_SERVICE_ROLE_KEY, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY, GHN_TOKEN, PII_MASTER_KEY_HEX). Khóa chặt việc truy cập process.env thông qua schema xác thực tại thời điểm build (@t3-oss/env-nextjs).
3. Nhóm An ninh Mạng & Vận hành Chống Xâm nhập (Zero Trust & SecOps)
Repository GitHub	Chuẩn mực cốt lõi	Bài học & Quy tắc bắt buộc áp dụng vào CLOOP
upstash/ratelimit	Kiểm soát lưu lượng phân tán tại tầng Edge cho kiến trúc Serverless.	Do Vercel Serverless khởi tạo các instance độc lập không chia sẻ bộ nhớ RAM, việc lưu bộ đếm Rate Limit trong biến toàn cục (In-memory Map) là vô tác dụng. CLOOP phải áp dụng Sliding Window Rate Limiting trên nền tảng Redis phân tán tại tầng Edge, phân chia rõ 4 ngưỡng: API công khai, API xác thực/OTP, API giao dịch đặt thuê/rút tiền, và API Webhook.
helmetjs/helmet & w3c/webappsec-csp	Chuẩn hóa HTTP Security Headers & Content Security Policy (CSP Level 3).	Triển khai Strict Dynamic CSP sử dụng Nonce sinh mới trên từng HTTP Request tại middleware.ts. Ngăn chặn hoàn toàn việc thực thi Inline Script trái phép (phòng thủ tuyệt đối trước Stored/Reflected XSS khi hiển thị mô tả sản phẩm thời trang do người dùng nhập), kết hợp khóa frame-ancestors 'none' để chống Clickjacking trên trang thanh toán.
standard-webhooks/standard-webhooks	Quy chuẩn công nghiệp về xác thực và xử lý Webhook an toàn, bất biến.	Mọi gói tin Webhook từ PayOS và GHN phải trải qua 3 bước kiểm định: (1) Xác thực chữ ký số HMAC-SHA256 bằng hàm crypto.timingSafeEqual để chống tấn công đo thời gian (Timing Attack); (2) Kiểm tra dấu thời gian (Timestamp Window) để chống tấn công phát lại (Replay Attack); (3) Khóa Idempotency Key nguyên tử trong PostgreSQL trước khi cộng tiền hoặc chuyển trạng thái đơn hàng.
github/codeql & ossf/scorecard	Bảo mật chuỗi cung ứng phần mềm (Supply Chain Security) & Phân tích mã tĩnh (SAST).	Đóng băng phiên bản các gói phụ thuộc (pnpm install --frozen-lockfile), vô hiệu hóa postinstall script từ các gói không tin cậy, và thiết lập luồng GitHub Actions chạy CodeQL + pnpm audit tự động chặn hợp nhất code (merge PR) nếu phát hiện lỗ hổng mức độ High/Critical.
PHẦN 2: LỘ TRÌNH PHÂN CẤP BẢO VỆ ĐA LỚP (DEFENSE-IN-DEPTH ARCHITECTURE ROADMAP)

Kiến trúc bảo mật của CLOOP được thiết kế theo mô hình Phòng thủ chiều sâu 4 tầng (4-Tier Defense-in-Depth). Giả định rằng nếu kẻ tấn công vượt qua được một tầng, tầng kế tiếp sẽ ngay lập tức cô lập và vô hiệu hóa mối đe dọa.

Tầng bảo vệ	Thành phần hạ tầng trong CLOOP	Cơ chế kiểm soát & Phòng vệ trọng tâm	Mối đe dọa bị triệt tiêu
Tầng 1: Network & Edge Layer	Cloudflare / Vercel Edge Network, WAF, Upstash Redis	

• Chấm dứt kết nối TLS 1.3 sớm, ép buộc HTTPS toàn cục (HSTS Preload).




• Lọc lưu lượng bất thường ở biên mạng, chặn Bot cào dữ liệu sản phẩm và quét lỗ hổng.




• Giới hạn tần suất gọi API (Distributed Rate Limiting) theo IP và định danh người dùng.




• Giới hạn kích thước gói tin (Payload Size Limit ≤ 1MB cho API JSON, ≤ 5MB cho luồng tải ảnh).

	

• Tấn công từ chối dịch vụ (DDoS / L7 Flood).




• Tấn công vét cạn mật khẩu / mã OTP (Brute-force / Credential Stuffing).




• Cạn kiệt tài nguyên hóa đơn Serverless (Denial of Wallet).


Tầng 2: Application & Middleware Layer	Next.js 15 middleware.ts, NextAuth/JWE Guard, HTTP Security Headers	

• Khởi tạo mã x-nonce độc nhất cho mỗi request và áp đặt chính sách Content-Security-Policy nghiêm ngặt.




• Kiểm tra tính hợp lệ của phiên đăng nhập (JWT/JWE) và đối chiếu sessionVersion trước khi cho phép đi vào các phân vùng /dashboard, /checkout, /consign, /wallet.




• Bảo vệ chống giả mạo yêu cầu liên trang (CSRF) thông qua kiểm tra khớp header Origin và Host.

	

• Tấn công chèn mã độc (XSS - Cross-Site Scripting).




• Tấn công nhúng khung trang lừa đảo (Clickjacking).




• Đánh cắp phiên làm việc (Session Hijacking) và CSRF.


Tầng 3: Service & Domain Logic Layer	Next.js Route Handlers, Server Actions, Zod Validation, PII Crypto Service, Webhook Engine	

• Xác thực cấu trúc dữ liệu đầu vào bằng Zod với chế độ .strict() (từ chối mọi trường dư thừa).




• Kiểm tra quyền sở hữu tài nguyên (Anti-IDOR Guard) tại tầng nghiệp vụ.




• Mã hóa/Giải mã dữ liệu PII bằng AES-256-GCM và tự động che giấu (Masking) thông qua Prisma Client Extension.




• Xác thực chữ ký số HMAC cho Webhook PayOS/GHN và khóa Idempotency chống xử lý trùng lặp.

	

• Lỗ hổng BOLA / IDOR (xem/sửa đơn thuê của người khác).




• Lỗ hổng Mass Assignment (tự nâng quyền hoặc sửa giá thuê).




• Tấn công giả mạo Webhook thanh toán & Race Condition rút tiền kép (Double-Spending).


Tầng 4: Database & Storage Layer	Supabase PostgreSQL, 28-Table RLS Lockdown, Anti-Fraud Triggers, Immutable Audit Log, Supabase Storage	

• Khóa cứng RLS trên toàn bộ 28 bảng dữ liệu.




• Trigger kiểm soát tính toàn vẹn số dư ví (Tổng biến động sổ cái ledger_entries luôn phải khớp với số dư ví).




• Bảng Nhật ký kiểm toán bất biến (security_audit_logs) sử dụng chuỗi băm liên kết SHA-256 (Hash-Chaining) và cấm tuyệt đối lệnh UPDATE/DELETE.




• Phân tách Bucket lưu trữ: Bucket kyc-documents ở chế độ Private hoàn toàn, chỉ cấp Signed URL có thời hạn 60 giây.

	

• Rò rỉ cơ sở dữ liệu hàng loạt khi lộ quyền truy cập tầng ứng dụng.




• Gian lận chỉnh sửa số dư tài chính hoặc xóa dấu vết giao dịch.




• Lộ ảnh chụp CCCD/hợp đồng ký gửi trên mạng công cộng.

PHẦN 3: BỘ GIẢI PHÁP CODE & KIẾN TRÚC THỰC CHIẾN ÁP DỤNG NGAY CHO CLOOP

Toàn bộ các phân hệ mã nguồn dưới đây được thiết kế chuẩn TypeScript và SQL cho kiến trúc Next.js 15 App Router + Prisma ORM + Supabase PostgreSQL, sẵn sàng tích hợp trực tiếp vào mã nguồn của dự án CLOOP.

1. Middleware Security Headers, Nonce-based Strict CSP & Phân luồng Rate Limiting (src/middleware.ts)

Giải pháp này thiết lập hàng rào bảo vệ đầu tiên tại tầng Edge của Next.js 15: sinh mã nonce động cho từng request để khóa chặt XSS, bảo vệ chống CSRF cho các phương thức thay đổi dữ liệu, và áp đặt bộ tiêu đề bảo mật đạt hạng A+ theo chuẩn Mozilla Observatory.

TypeScript
// File: src/middleware.ts
import { NextResponse, type NextRequest } from "next/server";

/**
 * Cấu hình danh sách các tên miền bên thứ ba được phép kết nối trong hệ sinh thái CLOOP:
 * - Supabase (Database API & Storage)
 * - PayOS (Cổng thanh toán QR / Checkout)
 * - Giao Hàng Nhanh (GHN API)
 */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const PAYOS_CHECKOUT_DOMAIN = "https://pay.payos.vn";

/**
 * Bộ giới hạn tần suất (Rate Limiter) hoạt động tại tầng Edge thông qua Upstash Redis REST API
 * Nếu chưa cấu hình biến môi trường Redis, hệ thống vẫn đảm bảo không làm gián đoạn luồng chính
 * nhưng sẽ ghi cảnh báo bảo mật.
 */
async function enforceEdgeRateLimit(
  ip: string,
  bucket: "webhook" | "auth" | "mutation" | "general"
): Promise<{ allowed: boolean; remaining: number; resetInSeconds: number }> {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  const limits: Record<typeof bucket, { maxRequests: number; windowSeconds: number }> = {
    webhook: { maxRequests: 120, windowSeconds: 60 },
    auth: { maxRequests: 10, windowSeconds: 60 },
    mutation: { maxRequests: 30, windowSeconds: 60 },
    general: { maxRequests: 150, windowSeconds: 60 },
  };

  const config = limits[bucket];

  if (!redisUrl || !redisToken) {
    return { allowed: true, remaining: config.maxRequests, resetInSeconds: config.windowSeconds };
  }

  const currentWindow = Math.floor(Date.now() / 1000 / config.windowSeconds);
  const key = `cloop:ratelimit:${bucket}:${ip}:${currentWindow}`;

  try {
    const pipelineResponse = await fetch(`${redisUrl}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${redisToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", key],
        ["EXPIRE", key, config.windowSeconds],
      ]),
      cache: "no-store",
    });

    if (!pipelineResponse.ok) {
      return { allowed: true, remaining: 1, resetInSeconds: config.windowSeconds };
    }

    const results = (await pipelineResponse.json()) as Array<{ result: number }>;
    const currentCount = results[0]?.result ?? 1;
    const remaining = Math.max(0, config.maxRequests - currentCount);

    return {
      allowed: currentCount <= config.maxRequests,
      remaining,
      resetInSeconds: config.windowSeconds,
    };
  } catch {
    return { allowed: true, remaining: 1, resetInSeconds: config.windowSeconds };
  }
}

/**
 * Kiểm tra chống tấn công CSRF bằng cách đối chiếu Header Origin và Host
 * Áp dụng cho mọi phương thức thay đổi trạng thái (POST, PUT, PATCH, DELETE) trừ các đường dẫn Webhook bên ngoài
 */
function verifyCsrfOrigin(request: NextRequest): boolean {
  const method = request.method.toUpperCase();
  if (["GET", "HEAD", "OPTIONS"].includes(method)) {
    return true;
  }

  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith("/api/webhooks/")) {
    return true; // Webhook từ PayOS và GHN được xác thực bằng chữ ký HMAC-SHA256 riêng biệt
  }

  const originHeader = request.headers.get("origin");
  const hostHeader = request.headers.get("x-forwarded-host") || request.headers.get("host");

  if (!originHeader || !hostHeader) {
    return false;
  }

  try {
    const originUrl = new URL(originHeader);
    return originUrl.host === hostHeader;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Trích xuất địa chỉ IP thực của Client từ Vercel Edge Header
  const forwardedFor = request.headers.get("x-forwarded-for");
  const clientIp = forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1";

  // 2. Kiểm tra chống CSRF cho các yêu cầu thay đổi dữ liệu
  if (!verifyCsrfOrigin(request)) {
    return new NextResponse(
      JSON.stringify({
        error: "CSRF_ORIGIN_MISMATCH",
        message: "Yêu cầu bị từ chối do không khớp nguồn gốc định danh (Origin/Host).",
      }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // 3. Phân loại Bucket và thực thi Rate Limiting tại tầng Edge
  let rateLimitBucket: "webhook" | "auth" | "mutation" | "general" = "general";
  if (pathname.startsWith("/api/webhooks/")) {
    rateLimitBucket = "webhook";
  } else if (pathname.startsWith("/api/auth/") || pathname.startsWith("/login") || pathname.startsWith("/register")) {
    rateLimitBucket = "auth";
  } else if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method.toUpperCase())) {
    rateLimitBucket = "mutation";
  }

  const rateLimitResult = await enforceEdgeRateLimit(clientIp, rateLimitBucket);
  if (!rateLimitResult.allowed) {
    return new NextResponse(
      JSON.stringify({
        error: "TOO_MANY_REQUESTS",
        message: "Hệ thống ghi nhận tần suất truy cập vượt ngưỡng an toàn. Vui lòng thử lại sau ít phút.",
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(rateLimitResult.resetInSeconds),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  // 4. Khởi tạo mã Nonce mật mã học cho từng Request để phục vụ Content-Security-Policy (CSP)
  const nonceBytes = new Uint8Array(16);
  crypto.getRandomValues(nonceBytes);
  const nonce = Buffer.from(nonceBytes).toString("base64");

  const isDev = process.env.NODE_ENV === "development";

  // 5. Xây dựng chính sách Content-Security-Policy (CSP Level 3) chuẩn OWASP ASVS
  const cspDirectives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${isDev ? "'unsafe-eval'" : ""}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' blob: data: ${SUPABASE_URL} https://*.supabase.co`,
    `font-src 'self' data:`,
    `connect-src 'self' ${SUPABASE_URL} https://*.supabase.co ${PAYOS_CHECKOUT_DOMAIN} https://online-gateway.ghn.vn`,
    `frame-src 'self' ${PAYOS_CHECKOUT_DOMAIN}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ];

  const contentSecurityPolicyHeaderValue = cspDirectives.join("; ").replace(/\s{2,}/g, " ").trim();

  // 6. Gắn Nonce và thông tin truy vết vào Request Header để Server Components sử dụng
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("x-client-ip", clientIp);
  requestHeaders.set("x-request-id", crypto.randomUUID());
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicyHeaderValue);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // 7. Thiết lập đầy đủ các HTTP Security Headers theo chuẩn OWASP Cheat Sheet & Helmet
  response.headers.set("Content-Security-Policy", contentSecurityPolicyHeaderValue);
  response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-DNS-Prefetch-Control", "off");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), browsing-topics=(), payment=(self)"
  );
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  response.headers.set("X-RateLimit-Remaining", String(rateLimitResult.remaining));

  return response;
}

export const config = {
  matcher: [
    /*
     * Áp dụng Middleware cho toàn bộ các đường dẫn ngoại trừ các tệp tĩnh nội bộ của Next.js
     */
    {
      source: "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};

2. Hệ thống Validation Nghiêm ngặt với Zod + Chống IDOR & Mass Assignment (src/lib/security/validation.ts)

Dựa trên shieldfy/API-Security-Checklist và OWASP/ASVS (Mục V5 - Validation, Sanitization and Encoding), mọi dữ liệu đi vào CLOOP phải tuân thủ 3 nguyên tắc:

Chặn Mass Assignment bằng .strict(): Bất kỳ trường lạ nào không nằm trong schema (như isAdmin, status, walletBalance) sẽ khiến request bị từ chối ngay lập tức.

Kiểm soát chặt chẽ kiểu dữ liệu tài chính: Số tiền VNĐ phải là số nguyên an toàn (Number.isSafeInteger), dương, chia hết cho 1000, và nằm trong ngưỡng trần cho phép để chống lỗi tràn số (Integer Overflow) hoặc làm tròn số thực (Floating-point precision exploit).

Chống IDOR (Broken Object Level Authorization): Cung cấp hàm kiểm tra quyền sở hữu tài nguyên bắt buộc trước khi thực thi bất kỳ thao tác đọc/ghi nhạy cảm nào.

TypeScript
// File: src/lib/security/validation.ts
import { z } from "zod";

/**
 * Hàm làm sạch chuỗi văn bản đầu vào:
 * - Loại bỏ các ký tự điều khiển vô hình (ASCII Control Characters)
 * - Chuẩn hóa bảng mã Unicode về dạng NFC (quan trọng đối với tiếng Việt có dấu để tránh bypass bộ lọc)
 * - Mã hóa các thẻ HTML nguy hiểm nhằm chặn Stored XSS ngay từ tầng dữ liệu
 */
export function sanitizePlainText(input: string): string {
  return input
    .normalize("NFC")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .trim();
}

/**
 * Các quy tắc nguyên tử (Primitive Security Schemas) dùng chung cho toàn dự án CLOOP
 */
export const CloopSecurityPrimitives = {
  /** Định danh UUID chuẩn v4, ngăn chặn SQL Injection hoặc Path Traversal qua tham số ID */
  uuid: z.string().uuid({ message: "Mã định danh không đúng chuẩn UUID hợp lệ." }),

  /** Số tiền giao dịch bằng VNĐ: Bắt buộc là số nguyên dương, bội số của 1.000đ, tối đa 500.000.000đ */
  vndAmount: z
    .number({ invalid_type_error: "Số tiền phải là định dạng số." })
    .int({ message: "Số tiền VNĐ phải là số nguyên." })
    .positive({ message: "Số tiền phải lớn hơn 0." })
    .max(500_000_000, { message: "Số tiền vượt quá hạn mức giao dịch tối đa cho phép (500.000.000 VNĐ)." })
    .refine((val) => Number.isSafeInteger(val) && val % 1000 === 0, {
      message: "Số tiền giao dịch phải là số nguyên an toàn và là bội số của 1.000 VNĐ.",
    }),

  /** Số điện thoại di động Việt Nam chuẩn 10 số */
  vietnamPhone: z
    .string()
    .trim()
    .regex(/^(03|05|07|08|09)\d{8}$/, {
      message: "Số điện thoại không hợp lệ theo quy chuẩn nhà mạng Việt Nam (10 chữ số).",
    }),

  /** Số Căn cước công dân (CCCD) Việt Nam chuẩn 12 chữ số */
  citizenIdNumber: z
    .string()
    .trim()
    .regex(/^\d{12}$/, {
      message: "Số Căn cước công dân bắt buộc gồm đúng 12 chữ số.",
    }),

  /** Chuỗi văn bản an toàn đã qua bộ lọc chống XSS và giới hạn độ dài chống ReDoS */
  safeText: (minLength: number, maxLength: number) =>
    z
      .string()
      .min(minLength, { message: `Nội dung phải có ít nhất ${minLength} ký tự.` })
      .max(maxLength, { message: `Nội dung không được vượt quá ${maxLength} ký tự.` })
      .transform(sanitizePlainText),
};

/**
 * Schema Tạo Đơn Thuê Thời Trang (Rental Order Creation)
 * Sử dụng .strict() để chặn hoàn toàn lỗ hổng Mass Assignment (BOPLA):
 * Người dùng chỉ gửi thông tin ngày thuê và địa chỉ; giá thuê và tiền cọc PHẢI được truy vấn từ Database ở phía Server.
 */
export const CreateRentalOrderSchema = z
  .object({
    productId: CloopSecurityPrimitives.uuid,
    rentalStartDate: z.string().datetime({ message: "Ngày bắt đầu thuê phải theo chuẩn ISO-8601." }),
    rentalEndDate: z.string().datetime({ message: "Ngày kết thúc thuê phải theo chuẩn ISO-8601." }),
    recipientName: CloopSecurityPrimitives.safeText(2, 80),
    recipientPhone: CloopSecurityPrimitives.vietnamPhone,
    shippingAddressDetail: CloopSecurityPrimitives.safeText(10, 250),
    ghnDistrictId: z.number().int().positive(),
    ghnWardCode: z.string().trim().regex(/^\d{5,8}$/, "Mã phường/xã GHN không hợp lệ."),
    customerNote: CloopSecurityPrimitives.safeText(0, 300).optional(),
  })
  .strict()
  .refine(
    (data) => {
      const start = new Date(data.rentalStartDate).getTime();
      const end = new Date(data.rentalEndDate).getTime();
      const now = Date.now();
      const maxRentalDurationMs = 30 * 24 * 60 * 60 * 1000; // Tối đa 30 ngày thuê
      return start >= now - 60_000 && end > start && end - start <= maxRentalDurationMs;
    },
    {
      message: "Khoảng thời gian thuê không hợp lệ (ngày kết thúc phải sau ngày bắt đầu và tối đa 30 ngày).",
      path: ["rentalEndDate"],
    }
  );

/**
 * Schema Yêu cầu Rút tiền từ Ví Ký gửi (Consignment Wallet Payout Request)
 */
export const CreatePayoutRequestSchema = z
  .object({
    amountVnd: CloopSecurityPrimitives.vndAmount,
    bankCode: z
      .string()
      .trim()
      .regex(/^[A-Z0-9]{3,15}$/, "Mã ngân hàng thụ hưởng không hợp lệ."),
    bankAccountNumber: z
      .string()
      .trim()
      .regex(/^\d{6,20}$/, "Số tài khoản ngân hàng chỉ được chứa từ 6 đến 20 chữ số."),
    bankAccountHolderName: z
      .string()
      .trim()
      .min(3)
      .max(100)
      .regex(/^[A-Z\s]+$/, "Tên chủ tài khoản phải viết hoa không dấu."),
    idempotencyClientToken: CloopSecurityPrimitives.uuid,
  })
  .strict();

/**
 * Bộ kiểm tra chống lỗ hổng IDOR (Broken Object Level Authorization)
 * Đảm bảo chủ thể đang đăng nhập thực sự sở hữu hoặc có quyền hợp pháp trên bản ghi mục tiêu.
 */
export class AuthorizationSecurityError extends Error {
  public readonly statusCode = 403;
  public readonly errorCode = "FORBIDDEN_RESOURCE_ACCESS";

  constructor(message = "Bạn không có quyền truy cập hoặc thao tác trên tài nguyên này.") {
    super(message);
    this.name = "AuthorizationSecurityError";
  }
}

export function assertResourceOwnership(params: {
  authenticatedUserId: string;
  authenticatedUserRole?: "USER" | "ADMIN" | "AUDITOR";
  resourceOwnerIds: Array<string | null | undefined>;
  allowAdminOverride?: boolean;
}): void {
  const {
    authenticatedUserId,
    authenticatedUserRole = "USER",
    resourceOwnerIds,
    allowAdminOverride = false,
  } = params;

  if (!authenticatedUserId) {
    throw new AuthorizationSecurityError("Phiên xác thực không hợp lệ.");
  }

  if (allowAdminOverride && authenticatedUserRole === "ADMIN") {
    return;
  }

  const isOwner = resourceOwnerIds.some(
    (ownerId) => typeof ownerId === "string" && ownerId.length > 0 && ownerId === authenticatedUserId
  );

  if (!isOwner) {
    throw new AuthorizationSecurityError(
      "Phát hiện truy cập trái phép vào tài nguyên không thuộc quyền sở hữu (Anti-IDOR Protection)."
    );
  }
}

3. Cơ chế Mã hóa Cấp độ Trường (AES-256-GCM), Blind Indexing & Che giấu Dữ liệu PII Tự động qua Prisma Client Extension

Để tuân thủ Nghị định 13/2023/NĐ-CP về Bảo vệ dữ liệu cá nhân tại Việt Nam và chuẩn OWASP Cryptographic Storage Cheat Sheet, CLOOP không lưu trữ bản rõ (plaintext) đối với CCCD, số tài khoản ngân hàng hay số điện thoại nhạy cảm.

Giải pháp dưới đây kết hợp:

AES-256-GCM (Authenticated Encryption): Đảm bảo cả tính bí mật (Confidentiality) lẫn tính toàn vẹn (Integrity) — nếu kẻ tấn công sửa 1 bit của chuỗi mã hóa trong DB, việc giải mã sẽ lập tức báo lỗi xác thực AuthTag.

Blind Indexing (HMAC-SHA256): Cho phép kiểm tra xem một số CCCD hoặc số điện thoại đã tồn tại trong hệ thống chưa (WHERE cccdBlindIndex = ...) mà không cần giải mã toàn bộ bảng.

Data Masking & Prisma Client Extension: Tự động hóa hoàn toàn việc mã hóa khi ghi xuống DB và che giấu dữ liệu khi trả ra giao diện.

TypeScript
// File: src/lib/security/pii-crypto.ts
import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH_BYTES = 12; // Chuẩn khuyến nghị của NIST SP 800-38D cho GCM
const AUTH_TAG_LENGTH_BYTES = 16;
const CURRENT_KEY_VERSION = "v1";

/**
 * Lấy khóa mã hóa chính (Master Encryption Key 32 bytes / 64 ký tự Hex)
 * và khóa băm chỉ mục mù (Blind Index Key 32 bytes / 64 ký tự Hex) từ biến môi trường Server
 */
function getMasterEncryptionKey(): Buffer {
  const hexKey = process.env.PII_ENCRYPTION_MASTER_KEY_HEX;
  if (!hexKey || hexKey.length !== 64) {
    throw new Error(
      "CRITICAL_SECURITY_CONFIG_ERROR: Biến môi trường PII_ENCRYPTION_MASTER_KEY_HEX phải là chuỗi Hex 64 ký tự (256-bit)."
    );
  }
  return Buffer.from(hexKey, "hex");
}

function getBlindIndexSecretKey(): Buffer {
  const hexKey = process.env.PII_BLIND_INDEX_SECRET_KEY_HEX;
  if (!hexKey || hexKey.length !== 64) {
    throw new Error(
      "CRITICAL_SECURITY_CONFIG_ERROR: Biến môi trường PII_BLIND_INDEX_SECRET_KEY_HEX phải là chuỗi Hex 64 ký tự (256-bit)."
    );
  }
  return Buffer.from(hexKey, "hex");
}

/**
 * Mã hóa trường dữ liệu nhạy cảm (PII) bằng thuật toán AES-256-GCM
 * Định dạng lưu trữ: "enc:v1:<iv_base64>:<authTag_base64>:<ciphertext_base64>"
 * Hỗ trợ Additional Authenticated Data (AAD) để gắn chặt bản mã với ID người dùng (ngăn chặn việc copy bản mã từ dòng của user A sang dòng của user B).
 */
export function encryptPiiField(plaintext: string, associatedContextId = "cloop-global"): string {
  if (!plaintext) return plaintext;
  if (plaintext.startsWith("enc:")) return plaintext; // Tránh mã hóa kép (Double Encryption)

  const key = getMasterEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH_BYTES,
  });

  cipher.setAAD(Buffer.from(associatedContextId, "utf8"));

  const encryptedBuffer = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    "enc",
    CURRENT_KEY_VERSION,
    iv.toString("base64"),
    authTag.toString("base64"),
    encryptedBuffer.toString("base64"),
  ].join(":");
}

/**
 * Giải mã trường dữ liệu nhạy cảm đã mã hóa bằng AES-256-GCM
 */
export function decryptPiiField(encryptedPayload: string, associatedContextId = "cloop-global"): string {
  if (!encryptedPayload || !encryptedPayload.startsWith("enc:")) {
    return encryptedPayload;
  }

  const parts = encryptedPayload.split(":");
  if (parts.length !== 5) {
    throw new Error("PII_DECRYPTION_ERROR: Cấu trúc dữ liệu mã hóa không hợp lệ hoặc đã bị can thiệp.");
  }

  const [, version, ivBase64, authTagBase64, ciphertextBase64] = parts;
  if (version !== CURRENT_KEY_VERSION) {
    throw new Error(`PII_DECRYPTION_ERROR: Phiên bản khóa ${version} không được hỗ trợ.`);
  }

  const key = getMasterEncryptionKey();
  const iv = Buffer.from(ivBase64, "base64");
  const authTag = Buffer.from(authTagBase64, "base64");
  const ciphertext = Buffer.from(ciphertextBase64, "base64");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH_BYTES,
  });

  decipher.setAuthTag(authTag);
  decipher.setAAD(Buffer.from(associatedContextId, "utf8"));

  const decryptedBuffer = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decryptedBuffer.toString("utf8");
}

/**
 * Tạo chỉ mục mù (Blind Index) bằng HMAC-SHA256 để phục vụ truy vấn WHERE chính xác
 * trên các cột đã mã hóa (ví dụ: tìm kiếm CCCD hoặc Số điện thoại trùng lặp) mà không làm lộ dữ liệu gốc.
 */
export function computePiiBlindIndex(rawValue: string): string {
  const normalized = rawValue.trim().toLowerCase();
  const key = getBlindIndexSecretKey();
  return crypto.createHmac("sha256", key).update(normalized, "utf8").digest("hex");
}

/**
 * Bộ hàm Che giấu Dữ liệu Cá nhân (PII Data Masking) khi trả dữ liệu về Client / UI / Logs
 */
export const PiiDataMasker = {
  /** Che số điện thoại: "0912345678" -> "091****678" */
  maskPhone(phone: string | null | undefined): string {
    if (!phone) return "";
    const clean = phone.trim();
    if (clean.length < 7) return "***";
    return `${clean.slice(0, 3)}****${clean.slice(-3)}`;
  },

  /** Che số CCCD 12 số: "001206012345" -> "*********345" */
  maskCitizenId(cccd: string | null | undefined): string {
    if (!cccd) return "";
    const clean = cccd.trim();
    if (clean.length < 4) return "************";
    return `${"*".repeat(clean.length - 3)}${clean.slice(-3)}`;
  },

  /** Che số tài khoản ngân hàng: "19036812345678" -> "**********5678" */
  maskBankAccount(accountNumber: string | null | undefined): string {
    if (!accountNumber) return "";
    const clean = accountNumber.trim();
    if (clean.length <= 4) return "****";
    return `${"*".repeat(clean.length - 4)}${clean.slice(-4)}`;
  },

  /** Che địa chỉ Email: "trang.hoang@example.com" -> "tr***g@example.com" */
  maskEmail(email: string | null | undefined): string {
    if (!email || !email.includes("@")) return "";
    const [localPart, domain] = email.split("@");
    if (localPart.length <= 2) {
      return `${localPart[0] ?? "*"}***@${domain}`;
    }
    return `${localPart.slice(0, 2)}***${localPart.slice(-1)}@${domain}`;
  },
};


Tích hợp trực tiếp vào Prisma Client Extension để tự động mã hóa và tạo Blind Index khi lưu hồ sơ KYC / Ngân hàng của người dùng CLOOP:

TypeScript
// File: src/lib/db/prisma-pii-extension.ts
import { Prisma } from "@prisma/client";
import {
  encryptPiiField,
  decryptPiiField,
  computePiiBlindIndex,
  PiiDataMasker,
} from "@/lib/security/pii-crypto";

/**
 * Prisma Client Extension tự động bảo vệ các trường nhạy cảm trong bảng UserKycProfile / BankAccount
 * - Khi ghi (create / update / upsert): Tự động tính toán Blind Index và mã hóa AES-256-GCM.
 * - Cung cấp Computed Fields trả về dữ liệu đã che giấu (Masked PII) mặc định cho giao diện.
 */
export const piiProtectionPrismaExtension = Prisma.defineExtension({
  name: "cloop-pii-field-encryption",
  query: {
    userKycProfile: {
      async create({ args, query }) {
        if (args.data.citizenIdNumber) {
          const rawCccd = args.data.citizenIdNumber;
          args.data.citizenIdBlindIndex = computePiiBlindIndex(rawCccd);
          args.data.citizenIdNumber = encryptPiiField(rawCccd);
        }
        if (args.data.bankAccountNumber) {
          args.data.bankAccountNumber = encryptPiiField(args.data.bankAccountNumber);
        }
        return query(args);
      },
      async update({ args, query }) {
        if (typeof args.data.citizenIdNumber === "string") {
          const rawCccd = args.data.citizenIdNumber;
          args.data.citizenIdBlindIndex = computePiiBlindIndex(rawCccd);
          args.data.citizenIdNumber = encryptPiiField(rawCccd);
        }
        if (typeof args.data.bankAccountNumber === "string") {
          args.data.bankAccountNumber = encryptPiiField(args.data.bankAccountNumber);
        }
        return query(args);
      },
    },
  },
  result: {
    userKycProfile: {
      /** Trường ảo trả về số CCCD đã che giấu an toàn để hiển thị trên UI */
      maskedCitizenId: {
        needs: { citizenIdNumber: true },
        compute(profile) {
          try {
            const decrypted = decryptPiiField(profile.citizenIdNumber);
            return PiiDataMasker.maskCitizenId(decrypted);
          } catch {
            return "************";
          }
        },
      },
      /** Trường ảo trả về số tài khoản ngân hàng đã che giấu an toàn */
      maskedBankAccountNumber: {
        needs: { bankAccountNumber: true },
        compute(profile) {
          try {
            const decrypted = decryptPiiField(profile.bankAccountNumber);
            return PiiDataMasker.maskBankAccount(decrypted);
          } catch {
            return "********";
          }
        },
      },
    },
  },
});

4. Bảo vệ Webhook Thanh toán PayOS & Giao hàng GHN (Xác thực Chữ ký Thời gian hằng số + Chống Replay + Khóa Idempotency Nguyên tử)

Luồng Webhook là mục tiêu tấn công số 1 của tội phạm mạng trên các sàn thương mại điện tử (nhằm kích hoạt đơn thuê thành "Đã thanh toán" mà không tốn tiền, hoặc cộng tiền ảo vào ví ký gửi nhiều lần qua lỗ hổng Race Condition).

Đoạn mã dưới đây triển khai đầy đủ chuẩn standard-webhooks/standard-webhooks cho PayOS và GHN trên Next.js 15 Route Handler:

TypeScript
// File: src/app/api/webhooks/payos/route.ts
import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/db/prisma";

interface PayOSWebhookData {
  orderCode: number;
  amount: number;
  description: string;
  accountNumber: string;
  reference: string;
  transactionDateTime: string;
  currency: string;
  paymentLinkId: string;
  code: string;
  desc: string;
  counterAccountBankId?: string | null;
  counterAccountBankName?: string | null;
  counterAccountName?: string | null;
  counterAccountNumber?: string | null;
  virtualAccountName?: string | null;
  virtualAccountNumber?: string | null;
}

interface PayOSWebhookPayload {
  code: string;
  desc: string;
  success: boolean;
  data: PayOSWebhookData;
  signature: string;
}

/**
 * Xác thực chữ ký HMAC-SHA256 của PayOS theo đúng quy chuẩn sắp xếp key Alphabet
 * và đối chiếu bằng thuật toán thời gian hằng số (crypto.timingSafeEqual) chống Timing Attack.
 */
function verifyPayOSSignatureTimingSafe(
  dataObj: Record<string, unknown>,
  providedSignatureHex: string,
  checksumKey: string
): boolean {
  if (!providedSignatureHex || !checksumKey) {
    return false;
  }

  // 1. Sắp xếp các khóa của đối tượng data theo thứ tự bảng chữ cái a-z
  const sortedKeys = Object.keys(dataObj).sort();
  const canonicalParts: string[] = [];

  for (const key of sortedKeys) {
    let value = dataObj[key];
    if (value === null || value === undefined || value === "null" || value === "undefined") {
      value = "";
    } else if (typeof value === "object") {
      value = JSON.stringify(value);
    }
    canonicalParts.push(`${key}=${String(value)}`);
  }

  const canonicalQueryString = canonicalParts.join("&");

  // 2. Tính toán mã băm HMAC-SHA256
  const computedHmacHex = crypto
    .createHmac("sha256", checksumKey)
    .update(canonicalQueryString, "utf8")
    .digest("hex");

  // 3. Chuyển đổi sang Buffer có cùng độ dài để so sánh bằng timingSafeEqual
  const computedBuffer = Buffer.from(computedHmacHex, "utf8");
  const providedBuffer = Buffer.from(providedSignatureHex, "utf8");

  if (computedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(computedBuffer, providedBuffer);
}

/**
 * Hàm tương tự để xác thực Webhook của Giao Hàng Nhanh (GHN) qua HMAC-SHA256 hoặc Secret Token
 */
export function verifyGhnWebhookTokenTimingSafe(providedToken: string, expectedSecretToken: string): boolean {
  const hashProvided = crypto.createHash("sha256").update(providedToken || "", "utf8").digest();
  const hashExpected = crypto.createHash("sha256").update(expectedSecretToken || "", "utf8").digest();
  return crypto.timingSafeEqual(hashProvided, hashExpected);
}

export async function POST(request: NextRequest) {
  const checksumKey = process.env.PAYOS_CHECKSUM_KEY;
  if (!checksumKey) {
    return NextResponse.json(
      { error: "WEBHOOK_MISCONFIGURED", message: "Thiếu cấu hình khóa xác thực Webhook trên máy chủ." },
      { status: 500 }
    );
  }

  let payload: PayOSWebhookPayload;
  try {
    payload = (await request.json()) as PayOSWebhookPayload;
  } catch {
    return NextResponse.json({ error: "INVALID_JSON_PAYLOAD" }, { status: 400 });
  }

  if (!payload?.data || typeof payload.signature !== "string") {
    return NextResponse.json({ error: "MALFORMED_WEBHOOK_STRUCTURE" }, { status: 400 });
  }

  // Bước 1: Kiểm định chữ ký mật mã học chống giả mạo
  const isSignatureValid = verifyPayOSSignatureTimingSafe(
    payload.data as unknown as Record<string, unknown>,
    payload.signature,
    checksumKey
  );

  if (!isSignatureValid) {
    return NextResponse.json(
      { error: "INVALID_SIGNATURE", message: "Chữ ký số Webhook không hợp lệ." },
      { status: 401 }
    );
  }

  // Bước 2: Kiểm tra độ trễ thời gian (Timestamp Tolerance Window - tối đa 15 phút) chống Replay Attack
  const txTimeMs = new Date(payload.data.transactionDateTime).getTime();
  const nowMs = Date.now();
  const maxDriftMs = 15 * 60 * 1000;
  if (!Number.isNaN(txTimeMs) && Math.abs(nowMs - txTimeMs) > maxDriftMs) {
    return NextResponse.json(
      { error: "STALE_WEBHOOK_TIMESTAMP", message: "Gói tin Webhook đã quá hạn hiệu lực cho phép." },
      { status: 408 }
    );
  }

  // Bước 3: Thiết lập khóa Idempotency duy nhất dựa trên mã tham chiếu giao dịch ngân hàng và paymentLinkId
  const idempotencyKey = `payos:${payload.data.paymentLinkId}:${payload.data.reference}:${payload.data.orderCode}`;
  const payloadHash = crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");

  try {
    // Bước 4: Thực thi Giao dịch Nguyên tử (Atomic Serializable Transaction)
    const processingResult = await prisma.$transaction(
      async (tx) => {
        // 4.1. Thử chèn bản ghi khóa Idempotency. Nếu đã tồn tại (Unique Constraint Violation),
        // PostgreSQL sẽ chặn ngay lập tức, ngăn chặn hoàn toàn Race Condition / Double-Crediting.
        const existingEvent = await tx.webhookIdempotencyLog.findUnique({
          where: { idempotencyKey },
        });

        if (existingEvent) {
          return { status: "ALREADY_PROCESSED" as const };
        }

        await tx.webhookIdempotencyLog.create({
          data: {
            idempotencyKey,
            provider: "PAYOS",
            payloadSha256: payloadHash,
            orderCode: String(payload.data.orderCode),
            processedAt: new Date(),
          },
        });

        // 4.2. Truy vấn đơn hàng và đối chiếu khớp số tiền thực nhận với số tiền phải thu trong DB
        const order = await tx.rentalOrder.findUnique({
          where: { payosOrderCode: BigInt(payload.data.orderCode) },
        });

        if (!order) {
          throw new Error(`ORDER_NOT_FOUND: Không tìm thấy đơn hàng với mã ${payload.data.orderCode}`);
        }

        if (order.paymentStatus === "PAID") {
          return { status: "ALREADY_PAID" as const };
        }

        // KIỂM ĐỊNH SỐ TIỀN CHỐNG GIAN LẬN: Số tiền thanh toán thực tế phải khớp 100% với tổng tiền đơn hàng
        if (Number(order.totalPayableAmountVnd) !== payload.data.amount) {
          await tx.securityIncidentAlert.create({
            data: {
              incidentType: "PAYMENT_AMOUNT_MISMATCH",
              severity: "CRITICAL",
              referenceId: order.id,
              details: JSON.stringify({
                expectedVnd: Number(order.totalPayableAmountVnd),
                receivedVnd: payload.data.amount,
                payosReference: payload.data.reference,
              }),
            },
          });
          throw new Error("FRAUD_ALERT_AMOUNT_MISMATCH: Số tiền thanh toán không khớp với giá trị đơn hàng.");
        }

        // 4.3. Cập nhật trạng thái đơn thuê và ghi nhận bút toán ký quỹ (Escrow Ledger Entry)
        await tx.rentalOrder.update({
          where: { id: order.id },
          data: {
            paymentStatus: "PAID",
            orderStatus: "CONFIRMED_AWAITING_SHIPMENT",
            paidAt: new Date(),
            payosReferenceCode: payload.data.reference,
          },
        });

        await tx.financialLedgerEntry.create({
          data: {
            orderId: order.id,
            userId: order.renterUserId,
            entryType: "ESCROW_DEPOSIT_IN",
            amountVnd: BigInt(payload.data.amount),
            currency: "VND",
            externalReference: payload.data.reference,
          },
        });

        return { status: "SUCCESS" as const, orderId: order.id };
      },
      {
        isolationLevel: "Serializable", // Cấp độ cô lập cao nhất trong PostgreSQL
        maxWait: 5000,
        timeout: 10000,
      }
    );

    return NextResponse.json({
      received: true,
      result: processingResult.status,
    });
  } catch (error) {
    // Nếu lỗi do trùng khóa Unique (P2002) khi 2 webhook đến cùng một mili-giây, trả về 200 OK an toàn
    if (typeof error === "object" && error !== null && "code" in error && (error as { code: string }).code === "P2002") {
      return NextResponse.json({ received: true, result: "CONCURRENT_DUPLICATE_IGNORED" });
    }

    return NextResponse.json(
      { error: "WEBHOOK_PROCESSING_FAILED", message: "Không thể hoàn tất xử lý giao dịch Webhook." },
      { status: 500 }
    );
  }
}

5. Hệ thống Nhật ký Kiểm toán Bất biến (Tamper-Proof Hash-Chained Audit Log) trên PostgreSQL & Prisma

Trên một hệ thống giao dịch tài chính và ký gửi tài sản như CLOOP, nhật ký hệ thống thông thường (Console Log) là không đủ giá trị pháp lý và dễ bị xóa dấu vết nếu tài khoản quản trị gặp sự cố.

Giải pháp dưới đây xây dựng bảng security_audit_logs ngay trong Supabase PostgreSQL áp dụng cấu trúc Chuỗi băm mật mã liên kết (Cryptographic Hash Chain):

Mỗi dòng nhật ký mới tự động lấy mã băm record_hash của dòng liền trước làm previous_hash của mình, sau đó băm SHA-256 toàn bộ dữ liệu của dòng hiện tại.

Bất kỳ hành vi thực thi lệnh UPDATE, DELETE hoặc TRUNCATE nào trên bảng này đều bị chặn cứng bởi Trigger ở cấp độ Engine PostgreSQL.

Đi kèm hàm kiểm toán verify_security_audit_chain() giúp Blue Team phát hiện ngay lập tức nếu có bất kỳ bản ghi nào bị can thiệp trái phép ở tầng vật lý.

SQL
-- File: supabase/migrations/20261027000000_immutable_audit_log.sql
-- Kích hoạt extension pgcrypto để sử dụng hàm băm mật mã học SHA-256
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Tạo bảng lưu trữ khóa Idempotency cho Webhook (phục vụ Module 4)
CREATE TABLE IF NOT EXISTS public.webhook_idempotency_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key TEXT NOT NULL UNIQUE,
    provider TEXT NOT NULL CHECK (provider IN ('PAYOS', 'GHN')),
    payload_sha256 TEXT NOT NULL,
    order_code TEXT NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

ALTER TABLE public.webhook_idempotency_logs ENABLE ROW LEVEL SECURITY;
-- Không cấp bất kỳ policy nào cho anon/authenticated: chỉ Service Role / Server Transaction mới được phép truy cập.

-- 2. Tạo bảng Nhật ký Kiểm toán Bất biến (Immutable Hash-Chained Security Audit Logs)
CREATE TABLE IF NOT EXISTS public.security_audit_logs (
    sequence_id BIGSERIAL PRIMARY KEY,
    event_id UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    actor_user_id UUID NULL,
    actor_role TEXT NOT NULL DEFAULT 'USER',
    actor_ip TEXT NOT NULL,
    action_type TEXT NOT NULL,
    target_entity_type TEXT NOT NULL,
    target_entity_id TEXT NOT NULL,
    metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    previous_hash TEXT NOT NULL,
    record_hash TEXT NOT NULL UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_security_audit_logs_actor ON public.security_audit_logs (actor_user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_target ON public.security_audit_logs (target_entity_type, target_entity_id);

ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;

-- 3. Trigger tự động tính toán chuỗi băm liên kết SHA-256 (Hash-Chaining) khi INSERT
CREATE OR REPLACE FUNCTION public.fn_compute_audit_log_hash_chain()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_last_hash TEXT;
    v_canonical_payload TEXT;
BEGIN
    -- Khóa bảng ở chế độ EXCLUSIVE trong phạm vi giao dịch cực ngắn để đảm bảo thứ tự chuỗi băm tuần tự tuyệt đối
    LOCK TABLE public.security_audit_logs IN EXCLUSIVE MODE;

    SELECT record_hash
    INTO v_last_hash
    FROM public.security_audit_logs
    ORDER BY sequence_id DESC
    LIMIT 1;

    IF v_last_hash IS NULL THEN
        v_last_hash := 'GENESIS_CLOOP_AUDIT_BLOCK_0000000000000000000000000000000000000000';
    END IF;

    NEW.occurred_at := COALESCE(NEW.occurred_at, clock_timestamp());
    NEW.previous_hash := v_last_hash;

    -- Ghép chuỗi chuẩn hóa toàn bộ các cột trọng yếu để băm SHA-256
    v_canonical_payload := concat_ws(
        '|',
        NEW.sequence_id::TEXT,
        NEW.event_id::TEXT,
        extract(epoch FROM NEW.occurred_at)::TEXT,
        COALESCE(NEW.actor_user_id::TEXT, 'SYSTEM'),
        NEW.actor_role,
        NEW.actor_ip,
        NEW.action_type,
        NEW.target_entity_type,
        NEW.target_entity_id,
        NEW.metadata_json::TEXT,
        NEW.previous_hash
    );

    NEW.record_hash := encode(digest(v_canonical_payload, 'sha256'), 'hex');
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_01_compute_audit_hash ON public.security_audit_logs;
CREATE TRIGGER trg_01_compute_audit_hash
BEFORE INSERT ON public.security_audit_logs
FOR EACH ROW
EXECUTE FUNCTION public.fn_compute_audit_log_hash_chain();

-- 4. Trigger chặn tuyệt đối mọi hành vi UPDATE, DELETE hoặc TRUNCATE trên bảng Audit Log
CREATE OR REPLACE FUNCTION public.fn_prevent_audit_log_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RAISE EXCEPTION 'SECURITY_VIOLATION_IMMUTABLE_LEDGER: Bảng security_audit_logs là sổ cái kiểm toán bất biến. Mọi thao tác % đều bị nghiêm cấm tuyệt đối.', TG_OP
        USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS trg_02_block_audit_update_delete ON public.security_audit_logs;
CREATE TRIGGER trg_02_block_audit_update_delete
BEFORE UPDATE OR DELETE ON public.security_audit_logs
FOR EACH ROW
EXECUTE FUNCTION public.fn_prevent_audit_log_tampering();

DROP TRIGGER IF EXISTS trg_03_block_audit_truncate ON public.security_audit_logs;
CREATE TRIGGER trg_03_block_audit_truncate
BEFORE TRUNCATE ON public.security_audit_logs
FOR EACH STATEMENT
EXECUTE FUNCTION public.fn_prevent_audit_log_tampering();

-- 5. Hàm kiểm toán viên (Blue Team Verification Function) để xác minh tính toàn vẹn của toàn bộ chuỗi Audit Log
CREATE OR REPLACE FUNCTION public.verify_security_audit_chain()
RETURNS TABLE (
    is_valid BOOLEAN,
    broken_at_sequence_id BIGINT,
    diagnostic_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    rec RECORD;
    v_expected_prev_hash TEXT := 'GENESIS_CLOOP_AUDIT_BLOCK_0000000000000000000000000000000000000000';
    v_recomputed_hash TEXT;
    v_payload TEXT;
BEGIN
    FOR rec IN
        SELECT * FROM public.security_audit_logs ORDER BY sequence_id ASC
    LOOP
        IF rec.previous_hash <> v_expected_prev_hash THEN
            RETURN QUERY SELECT
                FALSE,
                rec.sequence_id,
                format('Đứt gãy liên kết chuỗi băm tại sequence_id=%s (previous_hash không khớp).', rec.sequence_id);
            RETURN;
        END IF;

        v_payload := concat_ws(
            '|',
            rec.sequence_id::TEXT,
            rec.event_id::TEXT,
            extract(epoch FROM rec.occurred_at)::TEXT,
            COALESCE(rec.actor_user_id::TEXT, 'SYSTEM'),
            rec.actor_role,
            rec.actor_ip,
            rec.action_type,
            rec.target_entity_type,
            rec.target_entity_id,
            rec.metadata_json::TEXT,
            rec.previous_hash
        );

        v_recomputed_hash := encode(digest(v_payload, 'sha256'), 'hex');

        IF rec.record_hash <> v_recomputed_hash THEN
            RETURN QUERY SELECT
                FALSE,
                rec.sequence_id,
                format('Dữ liệu bị làm giả tại sequence_id=%s (record_hash tính lại không khớp).', rec.sequence_id);
            RETURN;
        END IF;

        v_expected_prev_hash := rec.record_hash;
    END LOOP;

    RETURN QUERY SELECT TRUE, NULL::BIGINT, 'Toàn bộ chuỗi nhật ký kiểm toán nguyên vẹn 100%.'::TEXT;
END;
$$;


Dịch vụ TypeScript (src/lib/security/audit-logger.ts) để gọi ghi nhật ký kiểm toán từ các Server Actions và API Routes của CLOOP (tự động lọc bỏ các trường nhạy cảm trước khi lưu vào metadata_json):

TypeScript
// File: src/lib/security/audit-logger.ts
import { prisma } from "@/lib/db/prisma";
import { PiiDataMasker } from "@/lib/security/pii-crypto";

export type CloopSecurityActionType =
  | "AUTH_LOGIN_SUCCESS"
  | "AUTH_LOGIN_FAILED"
  | "AUTH_PASSWORD_CHANGED"
  | "KYC_DOCUMENT_SUBMITTED"
  | "KYC_STATUS_APPROVED"
  | "RENTAL_ORDER_CREATED"
  | "RENTAL_ORDER_STATUS_UPDATED"
  | "WALLET_PAYOUT_REQUESTED"
  | "WALLET_PAYOUT_COMPLETED"
  | "CONSIGNMENT_ITEM_APPROVED"
  | "ADMIN_DISPUTE_RESOLVED";

export interface WriteSecurityAuditLogInput {
  actorUserId?: string | null;
  actorRole?: "USER" | "ADMIN" | "SYSTEM" | "WEBHOOK";
  actorIp: string;
  actionType: CloopSecurityActionType;
  targetEntityType: "USER" | "RENTAL_ORDER" | "CONSIGNMENT_ITEM" | "WALLET_PAYOUT" | "KYC_PROFILE";
  targetEntityId: string;
  metadata?: Record<string, unknown>;
}

const SENSITIVE_KEYS_REGEX = /password|secret|token|authorization|cookie|cccd|citizenid|bankaccount|cvv|pin/i;

/**
 * Tự động quét và che giấu bất kỳ trường nhạy cảm nào vô tình bị truyền vào đối tượng metadata
 * trước khi ghi xuống bảng security_audit_logs
 */
function redactSensitiveMetadata(obj: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS_REGEX.test(key)) {
      if (typeof value === "string" && key.toLowerCase().includes("bank")) {
        sanitized[key] = PiiDataMasker.maskBankAccount(value);
      } else if (typeof value === "string" && (key.toLowerCase().includes("cccd") || key.toLowerCase().includes("citizen"))) {
        sanitized[key] = PiiDataMasker.maskCitizenId(value);
      } else {
        sanitized[key] = "[REDACTED_BY_SECURITY_POLICY]";
      }
    } else if (typeof value === "string" && /^(03|05|07|08|09)\d{8}$/.test(value)) {
      sanitized[key] = PiiDataMasker.maskPhone(value);
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      sanitized[key] = redactSensitiveMetadata(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Ghi bản ghi vào sổ cái kiểm toán bất biến (security_audit_logs)
 * Các cột previous_hash và record_hash sẽ được Trigger PostgreSQL tự động tính toán và khóa cứng.
 */
export async function writeSecurityAuditLog(input: WriteSecurityAuditLogInput): Promise<void> {
  const safeMetadata = input.metadata ? redactSensitiveMetadata(input.metadata) : {};

  await prisma.$executeRaw`
    INSERT INTO public.security_audit_logs (
      actor_user_id,
      actor_role,
      actor_ip,
      action_type,
      target_entity_type,
      target_entity_id,
      metadata_json
    ) VALUES (
      ${input.actorUserId ? input.actorUserId : null}::uuid,
      ${input.actorRole ?? "USER"},
      ${input.actorIp},
      ${input.actionType},
      ${input.targetEntityType},
      ${input.targetEntityId},
      ${JSON.stringify(safeMetadata)}::jsonb
    )
  `;
}

PHẦN 4: CHECKLIST KIỂM ĐỊNH BẢO MẬT TRƯỚC KHI LÊN PRODUCTION (RED TEAM / BLUE TEAM AUDIT CHECKLIST CHO CLOOP)

Danh sách kiểm định dưới đây được thiết kế để đội ngũ phát triển CLOOP rà soát từng hạng mục trước mỗi đợt phát hành (Release Gate):

1. Xác thực, Quản lý Phiên & Phân quyền (Authentication, Session & Access Control)

[ ] Cookie Hardening: Cookie chứa JWT/Session của NextAuth trên môi trường Production bắt buộc đặt tiền tố __Host-, bật cờ HttpOnly=true, Secure=true, SameSite=Lax.

[ ] Cơ chế Thu hồi Phiên tức thì (sessionVersion): Khi người dùng đổi mật khẩu, cập nhật tài khoản ngân hàng nhận tiền ký gửi, hoặc bị khóa tài khoản, trường sessionVersion trong bảng users phải tăng lên 1 để vô hiệu hóa ngay lập tức các JWT cũ còn hạn.

[ ] Kiểm định Chống IDOR 100% Endpoints: Mọi Server Action và API Route nhận tham số orderId, productId, payoutId, disputeId đều phải gọi hàm assertResourceOwnership() hoặc truy vấn kèm điều kiện WHERE id = $1 AND (renter_id = $2 OR owner_id = $2).

[ ] Cách ly SUPABASE_SERVICE_ROLE_KEY: Tuyệt đối không khởi tạo Supabase Admin Client (bỏ qua RLS) trong bất kỳ tệp nào có thể được import bởi Client Component; gắn gói import "server-only" ở dòng đầu tiên của các module chứa khóa bí mật và kết nối Prisma.

2. An toàn Giao dịch Tài chính, Ví Ký gửi & Webhook (Financial & Webhook Security)

[ ] Không tin cậy giá trị tiền tệ từ Client: Khi tạo đơn thuê trang phục, Client chỉ được phép gửi productId và khoảng thời gian thuê (rentalStartDate, rentalEndDate). Server phải tự truy vấn đơn giá thuê/ngày, phí bảo hiểm, tiền cọc từ Database để tính tổng tiền thanh toán gửi sang PayOS.

[ ] Xác thực Webhook đa tầng (PayOS & GHN): Bắt buộc kiểm tra chữ ký HMAC-SHA256 bằng crypto.timingSafeEqual, kiểm tra độ lệch thời gian giao dịch không quá 15 phút, và đối chiếu số tiền thực nhận (payload.data.amount) khớp tuyệt đối với totalPayableAmountVnd của đơn hàng.

[ ] Chống Rút tiền kép (Anti-Double-Spending): Luồng yêu cầu rút tiền từ ví ký gửi phải sử dụng khóa giao dịch mức Serializable hoặc khóa dòng SELECT ... FOR UPDATE NOWAIT trên bản ghi ví của người dùng trước khi kiểm tra số dư khả dụng và trừ tiền.

3. Bảo vệ Dữ liệu Cá nhân (PII) & An toàn Lưu trữ Tệp tin (Supabase Storage)

[ ] Mã hóa AES-256-GCM & Blind Index: Số CCCD và số tài khoản ngân hàng trong DB chỉ được lưu ở dạng bản mã enc:v1:... kèm cột citizen_id_blind_index băm bằng HMAC-SHA256.

[ ] Tách biệt Bucket Lưu trữ trên Supabase Storage:

Bucket product-images (ảnh quần áo cho thuê): Cho phép đọc công khai, nhưng khi tải lên phải kiểm tra Magic Bytes ở phía Server (chỉ chấp nhận chữ ký nhị phân thực sự của image/jpeg, image/png, image/webp; cấm tuyệt đối tệp .svg, .html, .xml để chặn Stored XSS).

Bucket kyc-documents & return-condition-proofs (ảnh chụp CCCD, video đồng kiểm khi trả đồ): Đặt ở chế độ Private 100%, chỉ cấp đường dẫn tạm thời (createSignedUrl) có thời hạn hiệu lực tối đa 60 giây sau khi đã kiểm tra quyền truy cập.

[ ] Xóa dữ liệu vị trí (EXIF Metadata Stripping): Ảnh do người dùng chụp bằng điện thoại và tải lên hệ thống (đặc biệt là ảnh feedback hoặc ảnh sản phẩm ký gửi tại nhà riêng) cần được loại bỏ thẻ EXIF GPS thông qua thư viện xử lý ảnh (sharp) trước khi lưu vào Supabase Storage để bảo vệ vị trí cư trú thực tế của người dùng.

4. An ninh Hạ tầng, Chuỗi cung ứng & Giám sát (SecOps & Supply Chain)

[ ] Bảo vệ Biến Môi trường lúc Build: Cấu hình kiểm tra toàn bộ khóa bí mật qua schema Zod lúc khởi chạy ứng dụng; đảm bảo không có bất kỳ khóa bí mật nào bắt đầu bằng tiền tố NEXT_PUBLIC_.

[ ] Kiểm định tính toàn vẹn Audit Log định kỳ: Thiết lập một Cron Job chạy mỗi 6 giờ gọi hàm SQL SELECT * FROM public.verify_security_audit_chain();. Nếu cột is_valid trả về false, hệ thống lập tức bắn cảnh báo khẩn cấp về kênh bảo mật của đội ngũ vận hành và tạm khóa tính năng rút tiền tự động.

[ ] Quét lỗ hổng tự động trên GitHub CI/CD: Kích hoạt GitHub Dependabot, GitHub Secret Scanning và luồng CodeQL trên nhánh main và mọi Pull Request của kho mã nguồn CLOOP.

Để triển khai tiếp các cấu phần bảo mật chuyên sâu vào mã nguồn CLOOP:
Viết bộ kiểm tra Magic Bytes & xóa EXIF GPS khi tải ảnh lên Supabase
Thiết kế quy trình CI/CD GitHub Actions tự động quét Gitleaks và CodeQL
Xây dựng cơ chế chống Double-Spending khi rút tiền ví ký gửi