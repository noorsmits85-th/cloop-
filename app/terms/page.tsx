import React from "react";
import Link from "next/link";
import Image from "next/image";

export const metadata = {
  title: "Điều khoản sử dụng & Chính sách bảo vệ dữ liệu | CLOOP",
  description: "Điều khoản dịch vụ và chính sách bảo vệ dữ liệu cá nhân theo Nghị định 13/2023/NĐ-CP của nền tảng CLOOP.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#FAF9F5] text-[#183A2D] font-sans antialiased">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-[#E9E2D8] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/app" className="flex items-center gap-2">
            <Image src="/loogo.png" alt="CLOOP" width={32} height={32} className="rounded-full" />
            <span className="font-serif font-black text-xl tracking-wider text-[#183A2D]">CLOOP</span>
          </Link>
          <Link
            href="/app"
            className="text-xs font-semibold px-3 py-1.5 rounded-full bg-[#183A2D] text-white hover:bg-[#122e23] transition"
          >
            Về ứng dụng
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="bg-white rounded-3xl p-8 md:p-12 border border-[#E9E2D8] shadow-sm">
          <div className="inline-block px-3 py-1 rounded-full bg-[#EBF3EF] text-[#183A2D] text-xs font-bold uppercase tracking-wider mb-4">
            Văn bản chính thức
          </div>
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-[#183A2D] mb-2">
            ĐIỀU KHOẢN SỬ DỤNG VÀ CHÍNH SÁCH BẢO VỆ DỮ LIỆU CÁ NHÂN
          </h1>
          <p className="text-xs text-[#7A6B5D] mb-8">
            Áp dụng cho người dùng nền tảng và Mini App CLOOP • Cập nhật lần cuối: Tháng 09/2026
          </p>

          <div className="space-y-8 text-sm leading-relaxed text-[#4A4036]">
            <section>
              <h2 className="text-base font-bold text-[#183A2D] mb-2">1. Giới thiệu về CLOOP</h2>
              <p>
                CLOOP là nền tảng thời trang tuần hoàn, kết nối cộng đồng chia sẻ tủ đồ, cho thuê và tái sử dụng trang phục chất lượng cao nhằm thúc đẩy lối sống tiêu dùng bền vững, giảm thiểu phát thải thời trang tại Việt Nam.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-[#183A2D] mb-2">2. Mục đích thu thập dữ liệu cá nhân</h2>
              <p className="mb-2">
                Để phục vụ việc cung cấp dịch vụ cho thuê và chia sẻ trang phục, CLOOP có thể thu thập các thông tin sau khi được người dùng đồng ý:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Thông tin định danh cơ bản:</strong> Họ tên, ảnh đại diện (Zalo Profile) để tạo tài khoản định danh người dùng.</li>
                <li><strong>Thông tin liên lạc:</strong> Số điện thoại, địa chỉ nhận hàng để thực hiện giao nhận trang phục và xác nhận đơn đặt lịch thuê.</li>
                <li><strong>Lịch sử giao dịch & sở thích phong cách:</strong> Danh sách sản phẩm đã xem, đã thuê, hoặc dữ liệu tương tác với Trợ lý AI Stylist nhằm cá nhân hoá gợi ý trang phục.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-[#183A2D] mb-2">3. Cam kết tuân thủ bảo vệ dữ liệu (Nghị định 13/2023/NĐ-CP)</h2>
              <p className="mb-2">
                CLOOP cam kết tuân thủ nghiêm ngặt các quy định của Pháp luật Việt Nam về Bảo vệ dữ liệu cá nhân:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Tuyệt đối không mua bán, chia sẻ dữ liệu cá nhân cho bên thứ ba vì mục đích thương mại trái phép.</li>
                <li>Dữ liệu được mã hoá và bảo vệ trên hạ tầng máy chủ đạt tiêu chuẩn bảo mật.</li>
                <li>Dữ liệu chỉ được sử dụng cho đúng mục đích vận hành dịch vụ của CLOOP.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-[#183A2D] mb-2">4. Quyền của người dùng & Cơ chế xoá dữ liệu (Webhook)</h2>
              <p className="mb-2">
                Người dùng có toàn quyền đối với dữ liệu cá nhân của mình trên nền tảng CLOOP:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Rút lại sự đồng ý:</strong> Người dùng có thể thu hồi quyền đã cấp tại mục Quản lý quyền trong Zalo bất cứ lúc nào.</li>
                <li><strong>Yêu cầu xoá dữ liệu:</strong> Khi người dùng rút lại quyền trên Zalo Mini App, hệ thống Webhook tự động của CLOOP sẽ tiếp nhận và tiến hành ẩn/xoá vĩnh viễn các thông tin cá nhân liên kết với tài khoản theo quy định.</li>
                <li>Người dùng cũng có thể gửi yêu cầu hỗ trợ xoá tài khoản trực tiếp qua email: <strong>cskh@cloop.vn</strong>.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-[#183A2D] mb-2">5. Quy tắc ứng xử và bảo quản trang phục</h2>
              <p>
                Người thuê và chủ sở hữu trang phục cam kết bảo quản trang phục đúng quy cách, trung thực trong giao dịch và tuân thủ quy trình kiểm định chất lượng do CLOOP hướng dẫn nhằm duy trì vòng tuần hoàn bền vững cho cộng đồng.
              </p>
            </section>

            <section className="border-t border-[#E9E2D8] pt-6">
              <h2 className="text-base font-bold text-[#183A2D] mb-2">6. Thông tin liên hệ hỗ trợ</h2>
              <p>Mọi thắc mắc hoặc yêu cầu về Điều khoản và Dữ liệu cá nhân, vui lòng liên hệ:</p>
              <div className="mt-2 p-4 bg-[#FAF9F5] rounded-2xl border border-[#E9E2D8] space-y-1 text-xs">
                <p><strong>Dự án:</strong> CLOOP - Thời Trang Tuần Hoàn (Techfest 2026)</p>
                <p><strong>Website:</strong> https://cloop-sable.vercel.app</p>
                <p><strong>Email:</strong> support@cloop.vn / contact@cloop.vn</p>
                <p><strong>Hỗ trợ trực tuyến:</strong> Trực tiếp trong tính năng Hỗ trợ / CSKH trên ứng dụng CLOOP</p>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
