import { NextRequest, NextResponse } from "next/server";
import { searchRateLimit } from "@/src/lib/rate-limit";
import { getNextGeminiKey, markKeyCooldown } from "@/src/utils/gemini-pool";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 15;

/**
 * Fallback nhận diện giọng nói cho trình duyệt KHÔNG có Web Speech API
 * (WebView trong Facebook/Messenger/Zalo, một số trình duyệt Android).
 * Client ghi âm bằng MediaRecorder (tối đa ~6s) -> gửi base64 -> Gemini chép lời tiếng Việt (~1.5s).
 */
const STT_MODELS = ["gemini-3.5-flash-lite", "gemini-flash-lite-latest"];
const ALLOWED_AUDIO = /^audio\/(webm|ogg|mp4|mpeg|wav|aac|x-m4a|m4a)/;
const MAX_AUDIO_BYTES = 1.5 * 1024 * 1024;

function getClientIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

async function transcribe(model: string, apiKey: string, mimeType: string, data: string, signal: AbortSignal) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: "Chép lại chính xác câu nói tiếng Việt trong đoạn ghi âm (người dùng đang tìm quần áo). Chỉ trả về câu nói, không thêm gì. Nếu không có tiếng nói, trả về chuỗi rỗng.",
              },
              { inlineData: { mimeType, data } },
            ],
          },
        ],
        generationConfig: { temperature: 0, maxOutputTokens: 80 },
      }),
    }
  );
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 429) markKeyCooldown(apiKey, 60_000);
    throw new Error(`${model}: ${json?.error?.message || res.status}`);
  }
  const text: string = (json?.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || "").join("");
  return text.replace(/["“”]/g, "").replace(/[.。]+$/, "").trim();
}

export async function POST(request: NextRequest) {
  try {
    if (searchRateLimit) {
      let allowed = true;
      try {
        allowed = (
          await Promise.race([
            searchRateLimit.limit(`voice-stt:${getClientIp(request)}`),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error("RATE_LIMIT_TIMEOUT")), 800)),
          ])
        ).success;
      } catch (rlErr: any) {
        console.warn("[Voice STT RateLimit unavailable, fail-open]:", rlErr?.message || rlErr);
      }
      if (!allowed) {
        return NextResponse.json({ success: false, message: "Bạn thao tác quá nhanh, thử lại sau ít giây." }, { status: 429 });
      }
    }

    const body = await request.json().catch(() => null);
    const mimeType = String(body?.mimeType || "").split(";")[0].toLowerCase();
    const audio = typeof body?.audioBase64 === "string" ? body.audioBase64.replace(/^data:[^,]+,/, "") : "";

    if (!ALLOWED_AUDIO.test(mimeType) || !audio) {
      return NextResponse.json({ success: false, message: "Định dạng ghi âm không hợp lệ." }, { status: 400 });
    }
    if (audio.length * 0.75 > MAX_AUDIO_BYTES) {
      return NextResponse.json({ success: false, message: "Đoạn ghi âm quá dài." }, { status: 413 });
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 9000);
    try {
      const text = await Promise.any(
        STT_MODELS.map((model) => {
          const key = getNextGeminiKey();
          if (!key) return Promise.reject(new Error("NO_GEMINI_KEY"));
          return transcribe(model, key, mimeType, audio, controller.signal);
        })
      );
      return NextResponse.json({ success: true, text: text.slice(0, 120) });
    } finally {
      clearTimeout(timer);
      controller.abort();
    }
  } catch (error: any) {
    const reasons = error instanceof AggregateError ? error.errors.map((e: any) => e?.message).join(" | ") : error?.message;
    console.error("[Voice STT Error]:", reasons);
    return NextResponse.json({ success: false, message: "Chưa nhận diện được giọng nói, bạn thử lại nhé." }, { status: 503 });
  }
}
