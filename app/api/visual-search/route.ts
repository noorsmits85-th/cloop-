import { NextRequest, NextResponse } from "next/server";
import { visualSearchRateLimit } from "@/src/lib/rate-limit";
import { parseSafeBase64Image } from "@/src/lib/server-image-guard";
import { searchByValidatedOutfitImage } from "@/src/services/visualSearch";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function visualSearchError(status: number, message: string, traceId?: string) {
  return NextResponse.json({ success: false, message, traceId }, { status });
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  try {
    if (visualSearchRateLimit) {
      const rateLimit = await visualSearchRateLimit.limit(`visual-search:${ip}`);
      if (!rateLimit.success) {
        return visualSearchError(429, "Ban dang tim bang hinh anh qua nhanh. Vui long thu lai sau it phut.");
      }
    }

    const contentLength = Number(request.headers.get("content-length") || "0");
    if (contentLength > 7 * 1024 * 1024) {
      return visualSearchError(413, "Anh qua lon. Vui long dung anh JPG, PNG hoac WEBP toi da 5MB.");
    }

    const body = await request.json();
    const base64Image = body?.base64Image;
    if (typeof base64Image !== "string") {
      return visualSearchError(400, "Vui long chon anh JPG, PNG hoac WEBP de tim kiem.");
    }

    let image;
    try {
      image = parseSafeBase64Image(base64Image);
    } catch (error: any) {
      const reason = error?.message;
      if (reason === "IMAGE_TOO_LARGE") {
        return visualSearchError(413, "Anh qua lon. Vui long dung anh toi da 5MB.");
      }
      if (reason === "UNSUPPORTED_IMAGE_TYPE") {
        return visualSearchError(415, "CLOOP Lens chi ho tro JPG, PNG va WEBP.");
      }
      return visualSearchError(400, "Du lieu anh khong hop le.");
    }

    const result = await searchByValidatedOutfitImage(image);
    if (!result.success) {
      return visualSearchError(
        503,
        "He thong tim kiem hinh anh dang ban. Vui long thu lai sau.",
        result.traceId
      );
    }

    return NextResponse.json({
      success: true,
      traceId: result.traceId,
      detectedInfo: result.detectedInfo,
      products: result.matchedProducts,
    });
  } catch (error: any) {
    // TODO: integrate Sentry/LogRocket tracking and avoid leaking raw provider errors to users.
    console.error("[Visual Search API Error]:", error?.message || error);
    return visualSearchError(500, "Su co khi ket noi he thong tim kiem hinh anh.");
  }
}
