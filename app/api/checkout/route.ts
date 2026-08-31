import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { requireUser } from "@/src/lib/auth";
import { verifyShippingQuoteToken } from "@/src/utils/shipping";
import { payos } from "@/src/utils/payos";
import { generatePayOSOrderCode } from "@/src/utils/order-code";
import { startOfDay, endOfDay, addDays, subDays } from "date-fns";
import { z } from "zod";

// Schema Validate dữ liệu đầu vào chuẩn Server-side
const CheckoutSchema = z.object({
  productId: z.string().uuid("ID Sản phẩm không hợp lệ"),
  userId: z.string().optional(), // Client có thể gửi hoặc không, server luôn dùng session
  shippingToken: z.string().min(10, "Thiếu Token Vận Chuyển"),
  buyerAddress: z.string().min(10, "Địa chỉ nhận hàng quá ngắn, vui lòng nhập rõ số nhà, tên đường."),
  buyerPhone: z.string().regex(/(84|0[3|5|7|8|9])+([0-9]{8})\b/, "Số điện thoại không đúng định dạng (Ví dụ: 0987654321)"),
  startDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày không hợp lệ")),
  packageDays: z.number().int().positive().refine(val => [1, 3, 7].includes(val), "Gói thuê không hợp lệ (Chỉ chấp nhận 1, 3, 7 ngày)"),
});

export async function POST(req: Request) {
  try {
    if (!payos) {
      return NextResponse.json({ error: "Cau hinh PayOS chua san sang tren server." }, { status: 500 });
    }

    // 1. Xác thực Phiên Người Dùng Server-Side (Chống IDOR & Giả mạo danh tính)
    const sessionUser = await requireUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized: Vui lòng đăng nhập để thực hiện thanh toán!" }, { status: 401 });
    }
    const realUserId = sessionUser.id;

    const body = await req.json();
    
    // 2. Zod Validation
    const parseResult = CheckoutSchema.safeParse(body);
    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0].message;
      return NextResponse.json({ error: firstError, details: parseResult.error.issues }, { status: 400 });
    }

    const { productId, shippingToken, buyerAddress, buyerPhone, startDate, packageDays } = parseResult.data;

    // 3. Fetch Product và Listing
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

    // Chặn người bán tự thuê đồ của chính mình
    if (product.userId === realUserId) {
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
        itemPrice = Math.round((activeListing.basePrice || 0) * packageDays * (packageDays >= 7 ? 0.7 : packageDays >= 3 ? 0.85 : 1) / 1000) * 1000;
      }
    } else {
       itemPrice = Math.round((activeListing.basePrice || 0) * packageDays * (packageDays >= 7 ? 0.7 : packageDays >= 3 ? 0.85 : 1) / 1000) * 1000;
    }

    const depositPrice = activeListing.deposit || 0;

    // 4. Xác thực "Signed Quote Token" của Vận chuyển
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

    // Mở rộng ranh giới để check đụng lịch
    const bufferedNewStartDate = subDays(normStartDate, totalBufferDays);
    const bufferedNewEndDate = addDays(normEndDate, totalBufferDays);

    let checkoutResult: any = null;

    // 5. Khóa Nguyên Tử (Pessimistic Locking) & Tạo Dữ Liệu
    try {
      checkoutResult = await prisma.$transaction(async (tx) => {
        // 5a. Khóa Product (Pessimistic Lock Row) chống Race Condition
        await tx.$executeRaw`SELECT id FROM products WHERE id = ${productId} FOR UPDATE`;

        // 5b. Check đụng lịch
        const conflicting = await tx.rentalHistory.findFirst({
          where: {
            product_id: productId,
            status: { notIn: ["CANCELLED", "LENDER_COMPLETED"] },
            actual_return_date: null,
            start_date: { lt: bufferedNewEndDate },
            end_date: { gt: bufferedNewStartDate }
          }
        });

        if (conflicting) {
          throw new Error("Lịch thuê quá sát nhau, không kịp vận chuyển và giặt ủi. Vui lòng chọn ngày khác!");
        }

        const orderCode = generatePayOSOrderCode();

        // 5c. Tạo Hợp đồng thuê (Order) với realUserId đã xác thực
        const rental = await tx.rentalHistory.create({
          data: {
            product_id: productId,
            renterId: realUserId,
            ownerId: product.userId,
            renter_phone: buyerPhone,
            owner_name: product.user?.name,
            start_date: normStartDate,
            end_date: normEndDate,
            status: "PENDING_APPROVAL"
          }
        });

        // 5d. Tạo Hóa Đơn (Invoice) với chính sách 0% phí sàn cho Founding 100
        const isFounding = (product.user as any)?.isFoundingMember ?? true;
        const platformFee = isFounding ? 0 : Math.floor(itemPrice * 0.12);

        const invoice = await tx.invoice.create({
          data: {
            rentalId: rental.id,
            amount: totalAmount,
            rentalFee: itemPrice,
            depositAmount: depositPrice,
            shippingFeeCollected: shippingFee,
            platformFee: platformFee,
            status: "PENDING",
            orderCode: orderCode,
          }
        });

        return { invoice, rental, orderCode };
      });
    } catch (dbErr: any) {
       return NextResponse.json({ error: dbErr.message || "Lỗi khóa dữ liệu" }, { status: 400 });
    }

    // 6. Tạo Link PayOS (Sau khi đã Đóng Transaction)
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
    const proto = req.headers.get("x-forwarded-proto") || (host?.includes("localhost") ? "http" : "https");
    const origin = req.headers.get("origin") || (host ? `${proto}://${host}` : null);
    const YOUR_DOMAIN = origin || process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://cloop-sable.vercel.app");

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

      return NextResponse.json({ 
        success: true, 
        checkoutUrl: paymentLinkRes.checkoutUrl,
        orderCode: checkoutResult.orderCode,
        qrCode: paymentLinkRes.qrCode,
        accountNumber: paymentLinkRes.accountNumber,
        accountName: paymentLinkRes.accountName,
        bin: paymentLinkRes.bin,
        amount: totalAmount,
        description: `CLOOP GD ${checkoutResult.orderCode}`
      });

    } catch (payosErr: any) {
      console.error("PayOS Error:", payosErr);
      // COMPENSATING ACTION (Hủy đơn nếu PayOS bị lỗi)
      await prisma.rentalHistory.update({
        where: { id: checkoutResult.rental.id },
        data: { status: "CANCELLED" }
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
