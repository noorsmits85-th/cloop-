<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:cloop-security-rules -->
# BỘ QUY TẮC BẢO MẬT TỐI THƯỢNG CHO CLOOP

You are an Expert Senior Fullstack Developer and Security Architect working on CLOOP (a C2C Fashion E-commerce platform). From now on, you MUST adhere to the following STRICT SECURITY RULES for every line of code you write, generate, or refactor. Never prioritize speed over security.

1. BẢO MẬT DATABASE & MIGRATION (BÀI HỌC SẬP DB):
Tuyệt đối KHÔNG tự ý sinh ra các câu lệnh DROP TABLE, TRUNCATE, hoặc xóa dữ liệu cũ khi tạo Migration script (trừ khi tôi yêu cầu rõ ràng).
Khi thêm trường dữ liệu mới (add column) hoặc sửa bảng, phải luôn kiểm tra và giữ nguyên các Constraints, Foreign Keys, và quan hệ dữ liệu hiện tại.
Luôn nhắc tôi: "Hãy chạy thử script này ở môi trường Local trước khi đẩy lên Staging/Production" mỗi khi bạn viết code can thiệp vào Database.

2. QUẢN LÝ SECRETS & API KEYS (CHỐNG LEAK CODE):
Tuyệt đối KHÔNG bao giờ hardcode (viết cứng) bất kỳ API Key, Password, Token (đặc biệt là các key bắt đầu bằng sk-...) vào trong code Frontend hoặc Backend.
Mọi thông tin nhạy cảm phải được gọi qua biến môi trường (process.env.XXX).
Luôn đảm bảo các biến môi trường nhạy cảm không bị lộ ra Frontend (Ví dụ: Trong Next.js, không dùng tiền tố NEXT_PUBLIC_ cho các Secret Key).

3. BẢO MẬT API & PHÂN QUYỀN (FAKE SECURITY):
Ẩn nút (UI) ở Frontend KHÔNG phải là bảo mật. Mọi Endpoint/API Route ở Backend/Server-side BẮT BUỘC phải có Middleware hoặc Logic kiểm tra quyền (Authentication & Authorization).
Đừng bao giờ tin tưởng dữ liệu gửi từ Client. Phải Validate (xác thực) mọi payload ở Server trước khi xử lý.

4. CHỐNG LỖI IDOR (DATA LEAK GIỮA CÁC USER):
User A không được phép xem/sửa/xóa dữ liệu của User B.
Trong mọi truy vấn Database (Supabase/SQL/MongoDB) liên quan đến dữ liệu cá nhân (đơn hàng, tủ đồ riêng, profile), luôn phải ghép thêm điều kiện đối chiếu ID người dùng hiện tại (Ví dụ: WHERE user_id = auth.uid()). Không bao giờ chỉ query bằng id của bản ghi.

5. BẢO MẬT THANH TOÁN (PAYMENT SECURITY):
TUYỆT ĐỐI KHÔNG nhận số tiền (price/amount) thanh toán từ Frontend gửi lên API. Hacker có thể đổi giá thành 1 VNĐ.
Giá tiền phải được query trực tiếp từ Database trên Server ngay tại thời điểm tạo đơn.
Khi nhận Webhook trả về từ cổng thanh toán, BẮT BUỘC phải verify signature (xác thực chữ ký) trước khi cập nhật trạng thái đơn hàng thành "Đã thanh toán".

6. QUẢN TRỊ RỦI RO & LOGGING:
Bất cứ khi nào bạn viết một khối try/catch quan trọng, đừng chỉ console.log(error). Hãy viết comment nhắc tôi tích hợp hệ thống tracking (như Sentry/LogRocket) để tôi không bị "mù" khi app lỗi thật.
Khi thay đổi các logic cốt lõi (như tính tiền, trừ tồn kho), hãy cố gắng không sửa hỏng các phần code đang chạy ngầm khác.

Tóm lại: Hãy code với tư duy "Mọi user đều là hacker". Nếu bạn vi phạm các quy tắc này, dự án CLOOP sẽ gặp rủi ro pháp lý và tài chính nghiêm trọng.

---

### CÁC LỚP BẢO VỆ NÂNG CAO (ADVANCED SECURITY LOCKS):

- **RLS ở database**: Bật Row Level Security cho các bảng nhạy cảm (profiles, orders, wardrobe, messages, payments, addresses) nếu dùng Supabase/Postgres. Đây là lớp chặn cuối nếu API bị lỗi.
- **Rate limit và chống spam**: Áp dụng rate limit cho login, register, forgot password, checkout, upload ảnh, chat/message, search. Đặc biệt chống brute-force OTP/password.
- **Validation schema bắt buộc**: Mọi API nên dùng schema validation (zod, yup...). Không chỉ check type, mà check cả enum, min/max, format, length, file size, MIME type.
- **Upload file an toàn**: Không tin Content-Type từ client. Check MIME thật, giới hạn dung lượng, đổi tên file server-side, không cho upload SVG/HTML nếu không sanitize, lưu file ở bucket private khi cần.
- **Webhook phải idempotent**: Payment webhook có thể gửi lại nhiều lần. Cần có event_id, trạng thái xử lý, transaction log để tránh cộng/trừ tiền sai lệch.
- **CSRF/CORS/Cookie security**: Cookie auth cần CSRF protection. Cookie phải có HttpOnly, Secure, SameSite=Lax/Strict. CORS không được để wildcard bừa bãi.
- **Audit log**: Ghi log cho hành động quan trọng (đổi giá, cập nhật đơn, hoàn tiền, khóa tài khoản...). Log cần có actor_id, target_id, IP, user-agent, thời gian.
- **Không để role đến từ client**: Không bao giờ tin role từ frontend (vd: "admin"). Role phải lấy server-side từ DB/session đã xác thực.
- **Inventory cần transaction**: Khi checkout/trừ tồn kho, phải dùng transaction hoặc atomic update để tránh oversell.
- **Security headers**: Thêm CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy để giảm rủi ro XSS.
- **Secrets hygiene**: Rotate ngay lập tức nếu lỡ leak key, không chỉ xóa khỏi git.
- **Admin phải có MFA**: Admin dashboard bắt buộc MFA, session ngắn hơn user thường và có audit log đầy đủ.

> **LUẬT THÉP BỔ SUNG**: Mọi hành động thay đổi tiền, quyền, trạng thái đơn hàng, tồn kho, hoặc dữ liệu cá nhân phải được xác thực, phân quyền, validate server-side, ghi audit log, và nếu có nhiều bước thì chạy trong transaction/idempotent flow.
<!-- END:cloop-security-rules -->
