import { NextResponse } from "next/server";
import { getShippingQuotes, signShippingQuote } from "@/src/utils/shipping";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { fromProvince, toProvince, weight = 500 } = body;

    if (!fromProvince || !toProvince) {
      return NextResponse.json({ error: "Thiếu thông tin địa chỉ giao nhận" }, { status: 400 });
    }

    // Lấy danh sách báo giá
    const quotes = await getShippingQuotes(fromProvince, toProvince, weight);

    // Ký (Sign) từng báo giá để trả về cho Frontend
    const signedQuotes = quotes.map(quote => signShippingQuote(quote, fromProvince, toProvince, weight));

    return NextResponse.json({ success: true, options: signedQuotes }, { status: 200 });

  } catch (error: any) {
    console.error("Lỗi tính phí ship:", error);
    return NextResponse.json({ error: "Không thể tính phí vận chuyển lúc này" }, { status: 500 });
  }
}
