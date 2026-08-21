import { NextResponse } from "next/server";
import { moderateProductImage } from "@/src/services/imageModeration";
import { z } from "zod";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  imageUrl: z.string().url("URL ảnh không hợp lệ"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ" },
        { status: 400 }
      );
    }

    const result = await moderateProductImage(parsed.data.imageUrl);

    return NextResponse.json({
      success: true,
      moderation: result,
    });
  } catch (error: any) {
    console.error("API Moderate Image Error:", error);
    return NextResponse.json(
      {
        success: true,
        moderation: {
          isApproved: true,
          isClothing: true,
          confidence: 0.5,
          isFallback: true,
        },
      },
      { status: 200 }
    );
  }
}
