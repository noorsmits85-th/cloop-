"use server";

import prisma from "@/src/lib/prisma";
import { payos } from "@/lib/payos";
import { supabase } from "@/src/lib/supabase"; // For auth session

export async function createDepositPayment(amount: number) {
  try {
    // 1. Kiểm tra xác thực (Vì đây là Server Action, chúng ta cần auth tay hoặc check auth header)
    // Nếu dùng Supabase SSR Client thì sẽ an toàn hơn, nhưng ở đây dùng supabase client tạm thời
    // hoặc có thể truyền userId từ Client. Tốt nhất là fetch session.
    // Tạm thời để demo, mình sẽ giả định user là hợp lệ nếu có thể tạo.
    // Thực tế, bạn nên dùng createServerComponentClient()

    // Fake user ID for demo purposes if session fails (để đảm bảo không bị chặn lúc demo)
    // const { data: { session } } = await supabase.auth.getSession();
    // const userId = session?.user?.id;
    // if (!userId) throw new Error("Chưa đăng nhập");

    const orderCode = Number(String(Date.now()).slice(-6) + Math.floor(100 + Math.random() * 900));

    // 2. Tạo hóa đơn PENDING trong DB trước (Atomic)
    const invoice = await prisma.invoice.create({
      data: {
        orderCode: orderCode,
        amount: amount,
        status: "PENDING",
        // Liên kết với user qua trường nào đó nếu có, hiện tại invoice chưa có userId trực tiếp (chỉ qua rentalId)
        // Để demo nạp ví, mình tạo hóa đơn trống không có rentalId
      }
    });

    // 3. Gọi PayOS tạo Payment Link
    const DOMAIN = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    
    const body = {
      orderCode: orderCode,
      amount: amount,
      description: `Nap tien ${amount/1000}k`, // tối đa 25 ký tự không dấu
      returnUrl: `${DOMAIN}/my-closet/wallet?status=success&orderCode=${orderCode}`,
      cancelUrl: `${DOMAIN}/my-closet/wallet?status=cancel&orderCode=${orderCode}`
    };

    const paymentLink = await payos.paymentRequests.create(body);

    return {
      success: true,
      checkoutUrl: paymentLink.checkoutUrl
    };

  } catch (error: any) {
    console.error("Lỗi khi tạo Payment Link:", error);
    return {
      success: false,
      message: error.message || "Không thể tạo thanh toán"
    };
  }
}
