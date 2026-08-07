import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { verifyShippingQuoteToken } from "@/src/utils/shipping";
import { payos } from "@/src/utils/payos";
import { startOfDay, endOfDay, addDays, subDays } from "date-fns";
import { z } from "zod";

const prisma = new PrismaClient();

// Schema Validate dữ liệu đầu vào chuẩn 2027
const CheckoutSchema = z.object({
  productId: z.string().uuid("ID Sản phẩm không hợp lệ"),
  userId: z.string().uuid("ID Người dùng không hợp lệ").or(z.string()),
  shippingToken: z.string().min(10, "Thiếu Token Vận Chuyển"),
  buyerAddress: z.string().min(10, "Địa chỉ nhận hàng quá ngắn, vui lòng nhập rõ số nhà, tên đường."),
  buyerPhone: z.string().regex(/(84|0[3|5|7|8|9])+([0-9]{8})\b/, "Số điện thoại không đúng định dạng (Ví dụ: 0987654321)"),
  startDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày không hợp lệ")),
  packageDays: z.number().int().positive().refine(val => [1, 3, 7].includes(val), "Gói thuê không hợp lệ (Chỉ chấp nhận 1, 3, 7 ngày)"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // 1. Zod Validation (Bức tường thép Server-side)
    const parseResult = CheckoutSchema.safeParse(body);
    if (!parseResult.success) {
      // Lấy lỗi đầu tiên để báo về cho Client
      const firstError = parseResult.error.issues[0].message;
      return NextResponse.json({ error: firstError, details: parseResult.error.issues }, { status: 400 });
    }

    const { productId, userId, shippingToken, buyerAddress, buyerPhone, startDate, packageDays } = parseResult.data;

    // 1. Fetch Product và Listing
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        listings: { where: { status: "AVAILABLE" } },
        user: { select: { id: true, name: true } }
      }
    });

    if (!product || product.listings.length === 0) {
      return NextResponse.json({ error: "Sản phẩm không tồn tại hoặc đã bị ẩn!" }, { status: 404 });
    }
    if (product.userId === userId) {
      return NextResponse.json({ error: "Bạn không thể tự mua/thuê đồ của chính mình!" }, { status: 400 });
    }

    const activeListing = product.listings[0];
    
    // Tìm giá thuê trong JSONB pricing_tiers
    let itemPrice = activeListing.basePrice || 0;
    const pricingTiers = activeListing.pricing_tiers as any[];
    if (pricingTiers && Array.isArray(pricingTiers)) {
      const selectedTier = pricingTiers.find(t => t.days === packageDays);
      if (selectedTier) {
        itemPrice = selectedTier.price;
      } else {
        // Fallback tự tính nếu frontend gửi packageDays lạ
        itemPrice = Math.round((activeListing.basePrice || 0) * packageDays * (packageDays >= 7 ? 0.7 : packageDays >= 3 ? 0.85 : 1) / 1000) * 1000;
      }
    } else {
       itemPrice = Math.round((activeListing.basePrice || 0) * packageDays * (packageDays >= 7 ? 0.7 : packageDays >= 3 ? 0.85 : 1) / 1000) * 1000;
    }

    const depositPrice = activeListing.deposit || 0;

    // 2. Xác thực "Signed Quote Token" của Vận chuyển
    let shippingFee = 0;
    let estimatedTransitDays = 3; // Mặc định 3 ngày đi đường
    try {
      const shippingQuote = verifyShippingQuoteToken(
        shippingToken, 
        product.province, 
        buyerAddress.split(", ").pop() || "", 
        500 
      );
      shippingFee = shippingQuote.fee;
      estimatedTransitDays = shippingQuote.estimatedDays > 0 ? shippingQuote.estimatedDays : 1;
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    const totalAmount = itemPrice + depositPrice + shippingFee;

    // Chuẩn hóa Timezone về 00:00:00 và 23:59:59
    const normStartDate = startOfDay(new Date(startDate));
    const normEndDate = endOfDay(addDays(normStartDate, packageDays - 1));

    // Tổng Buffer = Ngày chủ đồ cần giặt giũ + Ngày ship đi đường
    const totalBufferDays = (activeListing.turnaround_days || 2) + estimatedTransitDays;

    // Mở rộng ranh giới để check đụng lịch (Toán học giao tuyến)
    const bufferedNewStartDate = subDays(normStartDate, totalBufferDays);
    const bufferedNewEndDate = addDays(normEndDate, totalBufferDays);

    let checkoutResult: any = null;

    // 3. Khóa Nguyên Tử (Pessimistic Locking) & Tạo Dữ Liệu
    try {
      checkoutResult = await prisma.$transaction(async (tx) => {
        // 3a. Khóa Product (Pessimistic Lock Row)
        // Không dùng updateMany, dùng raw query FOR UPDATE để chống TOCTOU Race Condition
        await tx.$executeRaw`SELECT id FROM products WHERE id = ${productId} FOR UPDATE`;

        // 3b. Check đụng lịch
        const conflicting = await tx.rentalHistory.findFirst({
          where: {
            product_id: productId,
            status: { notIn: ["cancelled", "rejected", "completed"] },
            actual_return_date: null, // Đơn đã được khách xác nhận trả sớm thì bỏ qua
            // Giao tuyến: Start MỚI < End CŨ và End MỚI > Start CŨ
            start_date: { lt: bufferedNewEndDate },
            end_date: { gt: bufferedNewStartDate }
          }
        });

        if (conflicting) {
          throw new Error("Lịch thuê quá sát nhau, không kịp vận chuyển và giặt ủi. Vui lòng chọn ngày khác!");
        }

        const orderCode = Number(String(Date.now()).slice(-9)); // Sinh mã orderCode duy nhất 9 số cho PayOS

        // 3c. Tạo Hợp đồng thuê (Order)
        const rental = await tx.rentalHistory.create({
          data: {
            product_id: productId,
            renterId: userId,
            renter_phone: buyerPhone,
            owner_name: product.user?.name,
            start_date: normStartDate,
            end_date: normEndDate,
            status: "pending_payment"
          }
        });

        // 3d. Tạo Hóa Đơn (Invoice)
        const invoice = await tx.invoice.create({
          data: {
            rentalId: rental.id,
            amount: totalAmount,
            status: "PENDING",
            orderCode: orderCode,
          }
        });

        return { invoice, rental, orderCode };
      });
    } catch (dbErr: any) {
       return NextResponse.json({ error: dbErr.message || "Lỗi khóa dữ liệu" }, { status: 400 });
    }

    // 4. Tạo Link PayOS (Sau khi đã Đóng Transaction)
    const YOUR_DOMAIN = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const payosBody = {
      orderCode: checkoutResult.orderCode,
      amount: totalAmount,
      description: `CLOOP GD ${checkoutResult.orderCode}`,
      returnUrl: `${YOUR_DOMAIN}/payment/result?orderCode=${checkoutResult.orderCode}`,
      cancelUrl: `${YOUR_DOMAIN}/checkout/${productId}?cancel=true`
    };

    try {
      const paymentLinkRes = await payos.paymentRequests.create(payosBody);

      // Lưu lại paymentLinkId
      await prisma.invoice.update({
        where: { id: checkoutResult.invoice.id },
        data: { paymentLinkId: paymentLinkRes.paymentLinkId }
      });

      return NextResponse.json({ success: true, checkoutUrl: paymentLinkRes.checkoutUrl });

    } catch (payosErr: any) {
      console.error("PayOS Error:", payosErr);
      // COMPENSATING ACTION (Xử lý khi PayOS lỗi để tránh rác dữ liệu)
      await prisma.rentalHistory.update({
        where: { id: checkoutResult.rental.id },
        data: { status: "cancelled" }
      });
      await prisma.invoice.update({
        where: { id: checkoutResult.invoice.id },
        data: { status: "CANCELLED" }
      });

      return NextResponse.json({ error: "Lỗi kết nối cổng thanh toán. Đã hủy lệnh đặt chỗ." }, { status: 500 });
    }

  } catch (error: any) {
    console.error("Lỗi API Checkout:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
