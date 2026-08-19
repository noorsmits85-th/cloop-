import { PrismaClient } from "@prisma/client";
import Link from "next/link";
import { CheckCircle2, XCircle, Clock } from "lucide-react";

const prisma = new PrismaClient();

export default async function PaymentResultPage({
  searchParams
}: {
  searchParams: { orderCode?: string, cancel?: string }
}) {
  const orderCode = searchParams.orderCode;
  
  if (searchParams.cancel === "true") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF9F6] p-4">
        <div className="bg-white p-8 rounded-lg shadow-sm border border-stone-100 max-w-md w-full text-center">
          <XCircle size={64} className="text-red-500 mx-auto mb-4" />
          <h1 className="font-heading text-2xl font-bold text-[#0A2517] mb-2">Thanh toán đã bị hủy</h1>
          <p className="text-stone-500 font-ui mb-6">Bạn đã hủy quá trình thanh toán hoặc giao dịch không thành công.</p>
          <Link href="/shop" className="inline-block px-6 py-3 bg-[#0A2517] text-white rounded font-ui font-semibold hover:bg-[#113a25] transition-colors">
            Quay lại Cửa Hàng
          </Link>
        </div>
      </div>
    );
  }

  if (!orderCode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF9F6] p-4">
        <p>Không tìm thấy mã đơn hàng hợp lệ.</p>
      </div>
    );
  }

  // 🛡️ Webhook Fallback: Chủ động đồng bộ với PayOS nếu webhook bị chậm mạng
  const { checkAndSyncPaymentStatusAction } = await import("@/app/actions/payment");
  await checkAndSyncPaymentStatusAction(Number(orderCode));

  const invoice = await prisma.invoice.findUnique({
    where: { orderCode: BigInt(orderCode) },
    include: {
      rental: {
        include: { product: true }
      }
    }
  });

  if (!invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF9F6] p-4">
        <p>Đơn hàng không tồn tại.</p>
      </div>
    );
  }

  const isSuccess = invoice.status === "PAID";
  const isPending = invoice.status === "PENDING";

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF9F6] p-4">
      <div className="bg-white p-8 rounded-lg shadow-sm border border-stone-100 max-w-md w-full text-center">
        {isSuccess ? (
          <CheckCircle2 size={64} className="text-emerald-500 mx-auto mb-4" />
        ) : isPending ? (
          <Clock size={64} className="text-amber-500 mx-auto mb-4" />
        ) : (
          <XCircle size={64} className="text-red-500 mx-auto mb-4" />
        )}
        
        <h1 className="font-heading text-2xl font-bold text-[#0A2517] mb-2">
          {isSuccess ? "Thanh toán Thành Công!" : isPending ? "Đang xử lý thanh toán" : "Thanh toán thất bại"}
        </h1>
        
        <p className="text-stone-500 font-ui mb-6">
          {isSuccess 
            ? `Cảm ơn bạn! Đơn hàng ${invoice.rental?.product?.title || ''} đã được ghi nhận.` 
            : isPending 
            ? "Hệ thống đang chờ xác nhận từ ngân hàng. Vui lòng kiểm tra lại sau ít phút."
            : "Có lỗi xảy ra trong quá trình thanh toán, hoặc mã QR đã hết hạn."}
        </p>

        <div className="bg-stone-50 p-4 rounded text-left mb-6 font-ui text-sm space-y-2 border border-stone-100">
          <div className="flex justify-between">
            <span className="text-stone-500">Mã đơn hàng:</span>
            <span className="font-semibold text-[#0A2517]">#{orderCode}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-500">Tổng tiền:</span>
            <span className="font-bold text-[#0A2517]">{invoice.amount.toLocaleString('vi-VN')}đ</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-500">Trạng thái:</span>
            <span className={`font-semibold ${isSuccess ? 'text-emerald-600' : isPending ? 'text-amber-600' : 'text-red-600'}`}>
              {invoice.status}
            </span>
          </div>
        </div>

        <Link href="/my-closet?tab=purchases" className="inline-block px-6 py-3 w-full bg-[#0A2517] text-white rounded font-ui font-semibold hover:bg-[#113a25] transition-colors">
          Xem Lịch Sử Đơn Hàng
        </Link>
      </div>
    </div>
  );
}
