import { NextResponse } from "next/server";
import { searchByOutfitImage } from "@/src/services/visualSearch";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { base64Image, imageUrl } = body;

    const input = base64Image || imageUrl;
    if (!input) {
      return NextResponse.json({ success: false, message: "Vui lòng chọn hoặc dán ảnh để tìm kiếm." }, { status: 400 });
    }

    const result = await searchByOutfitImage(input);

    if (!result.success) {
      return NextResponse.json({ success: false, message: result.error || "Không thể tìm thấy kết quả phù hợp." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      traceId: result.traceId,
      detectedInfo: result.detectedInfo,
      products: result.matchedProducts,
    });
  } catch (error: any) {
    console.error("❌ Lỗi API Visual Search:", error);
    return NextResponse.json({ success: false, message: "Sự cố khi kết nối hệ thống tìm kiếm hình ảnh." }, { status: 500 });
  }
}
