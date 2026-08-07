import { NextResponse } from "next/server";
import { z } from "zod";

const QuerySchema = z.object({
  basePrice: z.coerce.number().min(10000, "Giá cơ bản phải lớn hơn 10,000 VND"),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parseResult = QuerySchema.safeParse({
      basePrice: searchParams.get("basePrice"),
    });

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid basePrice", details: parseResult.error.issues },
        { status: 400 }
      );
    }

    const basePrice = parseResult.data.basePrice;

    // Hàm làm tròn đến hàng nghìn đồng
    const roundToThousand = (num: number) => Math.round(num / 1000) * 1000;

    // Gợi ý thông minh (Smart Defaults)
    const tiers = [
      {
        days: 1,
        price: basePrice,
        name: "Gói Hỏa Tốc",
        description: "Dành cho nhu cầu sử dụng ngay lập tức.",
        discountPercentage: 0,
      },
      {
        days: 3,
        price: roundToThousand(basePrice * 3 * 0.85), // Giảm 15%
        name: "Gói Cuối Tuần / Đi Tiệc",
        description: "Thong thả nhận, mặc tiệc, giặt giũ và trả đồ.",
        discountPercentage: 15,
      },
      {
        days: 7,
        price: roundToThousand(basePrice * 7 * 0.70), // Giảm 30%
        name: "Gói Nghỉ Dưỡng",
        description: "Hoàn hảo cho những chuyến du lịch xa.",
        discountPercentage: 30,
      },
    ];

    return NextResponse.json({ tiers });
  } catch (error) {
    console.error("Pricing Engine Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
