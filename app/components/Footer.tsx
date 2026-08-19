import Link from "next/link";

export function Footer() {
  return (
    <footer className="w-full bg-[#0A2517] text-white pt-16 pb-8 border-t border-white/10 shrink-0">
      <div className="max-w-[1536px] mx-auto px-4 md:px-8 lg:px-12">
        
        {/* Phần Trên: Cột Thông tin & Link */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-8 mb-16">
          
          {/* CỘT 1: Logo & Thông tin thương hiệu */}
          <div className="md:col-span-12 lg:col-span-4 flex flex-col">
            <h2 className="text-3xl lg:text-4xl font-logo text-white tracking-widest mb-5">CLOOP.</h2>
            <p className="font-body text-sm text-gray-300 leading-relaxed font-light mb-8 max-w-sm">
              Hệ sinh thái thời trang dệt nên từ những kết nối chân thật. Nơi những món đồ đi qua tìm thấy thanh xuân mới và những người đồng điệu tìm thấy nhau. CLOOP trao cho bạn đặc quyền thay đổi phong cách mỗi ngày — Mặc đẹp, sống nhẹ nhàng và không bận tâm sở hữu.
            </p>
            
            {/* Dàn Icon Mạng Xã Hội */}
            <div className="flex items-center gap-6 text-gray-400">
              <button className="hover:text-white transition-colors" title="Facebook">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"></path></svg>
              </button>
              <button className="hover:text-white transition-colors" title="Instagram">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect width="20" height="20" x="2" y="2" rx="5" ry="5" strokeWidth="1.5"></rect><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37zm1.5-4.87h.01"></path></svg>
              </button>
              <button className="hover:text-white transition-colors" title="TikTok">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19c-4.3 1.4-4.3-2.5-4.3-2.5 0-18 4.2-12 4.2-12 2.5 0 5.4 3 5.4 3v4.6c0 0-2.8-3.1-5.3-3.1v10.3c0 2-3.4 3.7-5.5 2.1-2.1-1.6-1.5-5.2.9-6.3V12c-4.4 2-5 7.8-2 10.3 3.1 2.5 8 1.4 8-3.8V4.5c2.3.9 4 3 4 3v-3s-2.1-2.4-4.7-3v18.5z"></path></svg>
              </button>
            </div>
          </div>

          {/* CỘT MENU */}
          <div className="md:col-span-12 lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-10 pt-2">
            
            {/* Cột Khám Phá */}
            <div className="flex flex-col items-center text-center">
              <h3 className="font-heading text-sm md:text-base font-bold uppercase tracking-[0.18em] text-[#E8F5E9] mb-5 drop-shadow-sm border-b border-[#6BA37A]/30 pb-2 px-3">
                Khám Phá
              </h3>
              <ul className="font-body flex flex-col items-center gap-3 text-xs md:text-sm text-gray-300 font-light">
                <li><Link href="/shop?type=rent" className="hover:text-white hover:underline transition-colors">Trang phục cho thuê</Link></li>
                <li><Link href="/shop?type=sell" className="hover:text-white hover:underline transition-colors">Đồ chuyển nhượng</Link></li>
                <li><Link href="/shop" className="hover:text-white hover:underline transition-colors">Chợ Xanh Upcycle</Link></li>
                <li><Link href="/blog" className="hover:text-white hover:underline transition-colors">Bảo tàng ký ức</Link></li>
              </ul>
            </div>

            {/* Cột Về Chúng Tôi */}
            <div className="flex flex-col items-center text-center">
              <h3 className="font-heading text-sm md:text-base font-bold uppercase tracking-[0.18em] text-[#E8F5E9] mb-5 drop-shadow-sm border-b border-[#6BA37A]/30 pb-2 px-3">
                Về CLOOP
              </h3>
              <ul className="font-body flex flex-col items-center gap-3 text-xs md:text-sm text-gray-300 font-light">
                <li><Link href="/blog" className="hover:text-white hover:underline transition-colors">Câu chuyện thương hiệu</Link></li>
                <li><Link href="/my-closet/eco" className="hover:text-white hover:underline transition-colors">Sứ mệnh bền vững</Link></li>
                <li><Link href="/blog" className="hover:text-white hover:underline transition-colors">Cộng đồng xanh</Link></li>
                <li><Link href="/blog" className="hover:text-white hover:underline transition-colors">Sự kiện & Workshop</Link></li>
              </ul>
            </div>

            {/* Cột Hỗ Trợ */}
            <div className="flex flex-col items-center text-center">
              <h3 className="font-heading text-sm md:text-base font-bold uppercase tracking-[0.18em] text-[#E8F5E9] mb-5 drop-shadow-sm border-b border-[#6BA37A]/30 pb-2 px-3">
                Hỗ Trợ
              </h3>
              <ul className="font-body flex flex-col items-center gap-3 text-xs md:text-sm text-gray-300 font-light">
                <li><Link href="/my-closet/profile" className="hover:text-white hover:underline transition-colors">Trung tâm trợ giúp</Link></li>
                <li><Link href="/my-closet/profile" className="hover:text-white hover:underline transition-colors">Chính sách bảo vệ</Link></li>
                <li><Link href="/my-closet/profile" className="hover:text-white hover:underline transition-colors">Điều khoản & Bảo mật</Link></li>
                <li><Link href="/my-closet/orders" className="hover:text-white hover:underline transition-colors">Gửi khiếu nại</Link></li>
              </ul>
            </div>

          </div>
        </div>

        {/* Phần Dưới Đáy: Copyright */}
        <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-white/10 text-[11px] font-body text-gray-400 font-light gap-4">
          <p>&copy; 2026 CLOOP PROJECT. All rights reserved.</p>
          <p className="font-ui tracking-widest uppercase text-[9px] text-gray-500">Fashion in a loop</p>
        </div>

      </div>
    </footer>
  );
}
