"use client";

import React, { useState } from "react";
import { 
  Phone, 
  Mail, 
  MapPin, 
  MessageSquare, 
  Send, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  Sparkles,
  ArrowRight,
  ExternalLink
} from "lucide-react";

export default function CloopContactSection() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [topic, setTopic] = useState("rent_help");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phone) {
      alert("Vui lòng điền họ tên và số điện thoại.");
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
      setFullName("");
      setPhone("");
      setMessage("");
      setTimeout(() => setIsSuccess(false), 5000);
    }, 800);
  };

  return (
    <section className="w-full py-14 sm:py-20 bg-[#0A2517] text-white relative overflow-hidden border-t border-white/10">
      
      {/* Glow Backdrops */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
          <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-300 bg-emerald-900/60 px-3 py-1 rounded-full border border-emerald-500/30 font-ui inline-flex items-center gap-1.5">
            <Sparkles size={12} className="text-emerald-400" />
            Đồng Hành & Hỗ Trợ 24/7
          </span>

          <h2 className="font-heading text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Liên Hệ & Kết Nối Với CLOOP
          </h2>

          <p className="text-stone-300 text-xs sm:text-sm font-light font-body">
            Bạn cần tư vấn thuê trang phục, đăng tải tủ đồ hay hợp tác thời trang xanh? Đội ngũ Stylist và CSKH của CLOOP luôn sẵn sàng đồng hành cùng bạn.
          </p>
        </div>

        {/* Contact Grid 2 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          
          {/* CỘT TRÁI (7 cols): Thẻ Thông tin & Kênh Hỗ trợ */}
          <div className="lg:col-span-6 space-y-5">
            
            {/* Quick Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Card 1: Hotline */}
              <div className="bg-white/5 backdrop-blur-md p-5 rounded-2xl border border-white/10 hover:border-emerald-500/50 transition-all space-y-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-400/20">
                  <Phone size={18} />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400 font-ui block">
                    Hotline Tư Vấn 24/7
                  </span>
                  <a href="tel:0981234567" className="font-mono text-base font-extrabold text-white hover:text-emerald-300 transition-colors">
                    098.123.4567
                  </a>
                </div>
                <p className="text-[11px] text-stone-400 font-light">
                  Hỗ trợ khẩn cấp đơn hàng, giao nhận shipper & thanh toán.
                </p>
              </div>

              {/* Card 2: Zalo OA */}
              <div className="bg-white/5 backdrop-blur-md p-5 rounded-2xl border border-white/10 hover:border-emerald-500/50 transition-all space-y-2">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-400/20">
                  <MessageSquare size={18} />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400 font-ui block">
                    Zalo Official Account
                  </span>
                  <span className="font-mono text-base font-extrabold text-white">
                    CLOOP Fashion Hub
                  </span>
                </div>
                <p className="text-[11px] text-stone-400 font-light">
                  Nhắn tin trực tiếp với Stylist riêng để chọn size chuẩn xác.
                </p>
              </div>

              {/* Card 3: Email */}
              <div className="bg-white/5 backdrop-blur-md p-5 rounded-2xl border border-white/10 hover:border-emerald-500/50 transition-all space-y-2">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-400/20">
                  <Mail size={18} />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400 font-ui block">
                    Hộp Thư Hỗ Trợ
                  </span>
                  <a href="mailto:support@cloop.vn" className="font-mono text-xs font-bold text-white hover:text-amber-300 transition-colors">
                    support@cloop.vn
                  </a>
                </div>
                <p className="text-[11px] text-stone-400 font-light">
                  Giải quyết đối soát, khiếu nại chất lượng và góp ý nền tảng.
                </p>
              </div>

              {/* Card 4: Cam kết */}
              <div className="bg-white/5 backdrop-blur-md p-5 rounded-2xl border border-white/10 hover:border-emerald-500/50 transition-all space-y-2">
                <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-400/20">
                  <Clock size={18} />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400 font-ui block">
                    Tốc Độ Phản Hồi
                  </span>
                  <span className="font-mono text-base font-extrabold text-emerald-300">
                    &lt; 5 Phút
                  </span>
                </div>
                <p className="text-[11px] text-stone-400 font-light">
                  Phản hồi tức thì trong giờ làm việc (08:00 - 22:00 hàng ngày).
                </p>
              </div>

            </div>

            {/* Trạm Xanh CLOOP Hub */}
            <div className="bg-white/5 backdrop-blur-md p-5 rounded-2xl border border-white/10 space-y-3">
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-emerald-400" />
                <h4 className="font-heading text-sm font-bold text-white uppercase tracking-wider">
                  Hệ Thống Trạm Xanh CLOOP Hub
                </h4>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-stone-300 font-light">
                <div className="p-2.5 bg-black/20 rounded-xl border border-white/5">
                  <span className="font-bold text-white block">Trạm Hà Nội</span>
                  <span>Tầng 3, Tòa Nhà Innovation, Cầu Giấy, Hà Nội</span>
                </div>
                <div className="p-2.5 bg-black/20 rounded-xl border border-white/5">
                  <span className="font-bold text-white block">Trạm TP. Hồ Chí Minh</span>
                  <span>18B Nam Kỳ Khởi Nghĩa, Quận 1, TP.HCM</span>
                </div>
              </div>
            </div>

          </div>

          {/* CỘT PHẢI (6 cols): Form Gửi Tin Nhắn Nhanh */}
          <div className="lg:col-span-6 bg-white rounded-3xl p-6 sm:p-8 text-stone-900 shadow-2xl border border-stone-200">
            <div className="mb-5 space-y-1">
              <h3 className="font-heading text-xl font-extrabold text-[#0A2517]">
                Gửi Yêu Cầu Hỗ Trợ
              </h3>
              <p className="text-xs text-stone-500 font-ui font-light">
                Điền thông tin bên dưới, chuyên viên CLOOP sẽ liên hệ lại ngay với bạn.
              </p>
            </div>

            {isSuccess ? (
              <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-200 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
                  <CheckCircle2 size={24} />
                </div>
                <h4 className="font-heading text-lg font-bold text-[#183A2D]">
                  Gửi Yêu Cầu Thành Công!
                </h4>
                <p className="text-xs text-stone-600 font-light">
                  Cảm ơn bạn. Chuyên viên CSKH của CLOOP sẽ gọi điện hoặc nhắn tin Zalo hỗ trợ bạn trong ít phút.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 font-ui">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-stone-600 uppercase tracking-wider block mb-1">
                      Họ Và Tên *
                    </label>
                    <input 
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Nguyễn Văn A"
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-800 focus:outline-none focus:border-emerald-700 focus:bg-white transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-stone-600 uppercase tracking-wider block mb-1">
                      Số Điện Thoại / Zalo *
                    </label>
                    <input 
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0912 345 678"
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-800 focus:outline-none focus:border-emerald-700 focus:bg-white transition-all font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-stone-600 uppercase tracking-wider block mb-1">
                    Chủ Đề Cần Hỗ Trợ
                  </label>
                  <select
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-800 focus:outline-none focus:border-emerald-700 focus:bg-white transition-all"
                  >
                    <option value="rent_help">👗 Tư vấn thuê đồ & Chọn size trang phục</option>
                    <option value="lender_help">🧥 Hướng dẫn đăng tải tủ đồ cho thuê</option>
                    <option value="resale_help">🏷️ Tư vấn ký gửi thanh lý / pass đồ</option>
                    <option value="upcycle_help">♻️ Hợp tác nguyên liệu tái chế Upcycling</option>
                    <option value="other">💬 Khác / Hợp tác truyền thông đối tác</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-stone-600 uppercase tracking-wider block mb-1">
                    Nội Dung Lời Nhắn
                  </label>
                  <textarea 
                    rows={3}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Mô tả chi tiết nhu cầu hoặc mẫu trang phục bạn đang quan tâm..."
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-800 focus:outline-none focus:border-emerald-700 focus:bg-white transition-all resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 bg-[#183A2D] hover:bg-[#0A2517] text-white rounded-xl font-ui text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md hover:shadow-lg disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Đang gửi thông tin...</span>
                  ) : (
                    <>
                      <span>Gửi Tin Nhắn Cho CLOOP</span>
                      <Send size={13} />
                    </>
                  )}
                </button>
              </form>
            )}

          </div>

        </div>

      </div>
    </section>
  );
}
