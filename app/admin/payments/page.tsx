"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { CheckCircle, Clock, User, CreditCard } from "lucide-react";

export default function AdminPaymentDashboard() {
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);

  // 📡 LỆNH BỐC DỮ LIỆU ĐỐI SOÁT 24H TRỰC TIẾP
  useEffect(() => {
    async function fetchPaymentsForTrang() {
      // Gọi bảng orders, đồng thời bắc cầu sang bảng User để lấy tên và thông tin ngân hàng của chủ đồ
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id,
          total_amount,
          owner_net_amount,
          status,
          created_at,
          User (
            name,
            bank_name,
            bank_account
          )
        `)
        .eq("status", "pending"); // Chỉ lọc ra những đơn khách đã trả tiền mà cậu chưa thanh toán cho chủ đồ

      if (!error && data) {
        setPendingOrders(data);
      }
    }
    fetchPaymentsForTrang();
  }, []);

  // 🛠️ Nút bấm cập nhật trạng thái sau khi cậu đã chuyển khoản xong cho họ trên điện thoại
  const handleMarkAsPaid = async (orderId: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ status: "completed" })
      .eq("id", orderId);

    if (!error) {
      alert("Đã xác nhận thanh toán thành công cho chủ đồ!");
      setPendingOrders(pendingOrders.filter(order => order.id !== orderId)); // Xóa khỏi danh sách chờ
    }
  };

  return (
    <div className="p-8 bg-[#FAF8F3] min-h-screen text-left">
      <h1 className="text-2xl font-bold text-[#183A2D] mb-2">Khung Quản Lý Chi Trả CLOOP (Đối soát 24h)</h1>
      <p className="text-xs text-gray-400 mb-6">Danh sách các đơn hàng cần Founder chuyển khoản trả tiền cho chủ tủ đồ trong ngày.</p>

      <div className="space-y-4 max-w-4xl">
        {pendingOrders.length === 0 ? (
          <p className="text-sm text-gray-500 bg-white p-6 rounded-2xl border text-center">🎉 Tuyệt vời! Không có đơn hàng nào bị tồn đọng quá 24h nhé Trang.</p>
        ) : (
          pendingOrders.map((order) => (
            <div key={order.id} className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              
              {/* THÔNG TIN TÀI KHOẢN CHỦ ĐỒ ĐỂ CẬU COPPY CHUYỂN TIỀN */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full w-fit">
                  <Clock size={12} /> Chờ chuyển khoản (Trong 24h)
                </div>
                <h3 className="text-sm font-bold text-[#183A2D] flex items-center gap-1.5">
                  <User size={16} className="text-gray-400" /> 
                  Chủ đồ: {order.User?.name || "Chưa cập nhật tên"}
                </h3>
                <div className="text-xs text-gray-500 space-y-1 bg-[#FAF8F3] p-3 rounded-xl border border-gray-100">
                  <p className="flex items-center gap-1"><CreditCard size={14} /> Ngân hàng: <b>{order.User?.bank_name || "MB Bank"}</b></p>
                  <p>Số tài khoản: <span className="font-mono font-bold text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">{order.User?.bank_account || "Chưa có STK"}</span></p>
                </div>
              </div>

              {/* SỐ TIỀN CẦN CHUYỂN KHOẢN & NÚT XÁC NHẬN */}
              <div className="text-right space-y-2 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Số tiền cần chuyển trả:</p>
                <p className="text-xl font-bold text-emerald-600">{(order.owner_net_amount).toLocaleString()}đ</p>
                <p className="text-[10px] text-gray-400 block mb-2">(Đã trừ 10k phí sàn CLOOP)</p>
                
                <button
                  onClick={() => handleMarkAsPaid(order.id)}
                  className="bg-[#183A2D] hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-full transition-colors flex items-center gap-1 w-full justify-center md:w-auto"
                >
                  <CheckCircle size={14} /> Tôi đã chuyển khoản xong
                </button>
              </div>

            </div>
          ))
        )}
      </div>
    </div>
  );
}