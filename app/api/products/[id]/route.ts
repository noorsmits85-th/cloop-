import { NextRequest, NextResponse } from "next/server";
import { getProductDetail } from "@/src/lib/product-service";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Thiếu mã sản phẩm" }, { status: 400 });
    }

    const product = await getProductDetail(id);

    if (!product) {
      return NextResponse.json({ error: "Không tìm thấy sản phẩm" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      product,
    });
  } catch (error: any) {
    console.error("Lỗi API lấy chi tiết sản phẩm:", error);
    return NextResponse.json({ error: error.message || "Lỗi máy chủ" }, { status: 500 });
  }
}
