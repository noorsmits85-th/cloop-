import { NextResponse } from "next/server";
import { requireUser } from "@/src/lib/auth";
import { isAllowedMediaUrl } from "@/src/lib/ssrf-guard";
import { moderateProductImage } from "@/src/services/imageModeration";
import { z } from "zod";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  imageUrl: z
    .string()
    .url("URL ảnh không hợp lệ")
    .refine(isAllowedMediaUrl, "URL ảnh phải thuộc kho lưu trữ chính thức của CLOOP"),
});

export async function POST(req: Request) {
  try {
    try {
      await requireUser();
    } catch {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ" },
        { status: 400 }
      );
    }

    const result = await moderateProductImage(parsed.data.imageUrl);

    // Strip internal auditDetails & adminAuditLog before returning to client
    const safeModeration = {
      traceId: result.traceId,
      decision: result.decision,
      isApproved: result.isApproved,
      isClothing: result.isClothing,
      confidence: result.confidence,
      detectedCategory: result.detectedCategory,
      detectedColor: result.detectedColor,
      detectedStyle: result.detectedStyle,
      userMessage: result.userMessage,
      isFallback: result.isFallback,
    };

    return NextResponse.json({
      success: true,
      moderation: safeModeration,
    });
  } catch (error: unknown) {
    // TODO: integrate Sentry/LogRocket tracking for image moderation errors
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
