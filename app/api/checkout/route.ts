import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { verifyShippingQuoteToken } from "@/src/utils/shipping";
import { payos } from "@/src/utils/payos";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { productId, userId, shippingToken, buyerAddress, buyerPhone } = body;

    if (!productId || !userId || !shippingToken) {
      return NextResponse.json({ error: "Thiếu thông tin thanh toán (productId, userId, shippingToken)" }, { status: 400 });
    }

    // 1. Fetch Product và Listing
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        listings: { where: { status: "AVAILABLE" } },
        user: { select: { id: true, name: true } }
      }
    });

    if (!product || product.listings.length === 0) {
      return NextResponse.json({ error: "Sản phẩm không tồn tại hoặc đã có người khác thuê/mua!" }, { status: 404 });
    }
    if (product.userId === userId) {
      return NextResponse.json({ error: "Bạn không thể tự mua/thuê đồ của chính mình!" }, { status: 400 });
    }

    const activeListing = product.listings[0];
    const itemPrice = activeListing.salePrice || activeListing.basePrice || 0;
    const depositPrice = activeListing.deposit || 0;

    // 2. Xác thực "Signed Quote Token" của Vận chuyển
    let shippingFee = 0;
    try {
      const shippingQuote = verifyShippingQuoteToken(
        shippingToken, 
        product.province, // Điểm lấy hàng 
        buyerAddress.split(", ").pop() || "", // Điểm nhận hàng (Tỉnh)
        500 // Cân nặng mặc định
      );
      shippingFee = shippingQuote.fee;
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    const totalAmount = itemPrice + depositPrice + shippingFee;

    // 3. Khóa Nguyên Tử (Pessimistic Locking) & Tạo Dữ Liệu
    // Chúng ta dùng Prisma transaction để đảm bảo toàn vẹn dữ liệu
    const checkoutResult = await prisma.$transaction(async (tx) => {
      // 3a. Khóa sản phẩm (UpdateMany đảm bảo Atomic)
      const lockItem = await tx.listing.updateMany({
        where: { 
          id: activeListing.id,
          status: "AVAILABLE" // Chỉ update nếu nó chưa bị ai húp mất
        },
        data: { 
          status: "PENDING",
        }
      });

      if (lockItem.count === 0) {
        throw new Error("Sản phẩm vừa bị người khác mua mất rồi! Vui lòng thử lại món khác.");
      }

      const orderCode = Number(String(Date.now()).slice(-9)); // Sinh mã orderCode duy nhất 9 số cho PayOS

      // 3b. Tạo Hợp đồng thuê / Mua (Order)
      const rental = await tx.rentalHistory.create({
        data: {
          product_id: productId,
          renterId: userId,
          renter_phone: buyerPhone,
          owner_name: product.user?.name,
          start_date: new Date(),
          end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default 7 ngày thuê
          status: "pending_payment"
        }
      });

      // 3c. Tạo Hóa Đơn (Invoice)
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

    // 4. Tạo Link PayOS
    const YOUR_DOMAIN = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const payosBody = {
      orderCode: checkoutResult.orderCode,
      amount: totalAmount,
      description: `CLOOP GD ${checkoutResult.orderCode}`,
      returnUrl: `${YOUR_DOMAIN}/payment/result?orderCode=${checkoutResult.orderCode}`,
      cancelUrl: `${YOUR_DOMAIN}/checkout/${productId}?cancel=true`
    };

    const paymentLinkRes = await payos.paymentRequests.create(payosBody);

    // Lưu lại paymentLinkId
    await prisma.invoice.update({
      where: { id: checkoutResult.invoice.id },
      data: { paymentLinkId: paymentLinkRes.paymentLinkId }
    });

    return NextResponse.json({ success: true, checkoutUrl: paymentLinkRes.checkoutUrl });

  } catch (error: any) {
    console.error("Lỗi API Checkout:", error);
    return NextResponse.json({ error: error.message || "Lỗi xử lý thanh toán" }, { status: 500 });
  }
}
