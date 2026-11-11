import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/src/lib/supabase";
import { requireUser } from "@/src/lib/auth";

const createProductPayloadSchema = z.object({
  title: z.string().trim().min(2, "Tên sản phẩm quá ngắn").max(160),
  description: z.string().max(4000).optional().nullable(),
  size: z.string().trim().min(1).max(32),
  bust: z.coerce.number().int().min(30).max(200).optional().nullable(),
  waist: z.coerce.number().int().min(30).max(200).optional().nullable(),
  hips: z.coerce.number().int().min(30).max(200).optional().nullable(),
  gender: z.enum(["FEMALE", "MALE", "UNISEX"]).optional().default("UNISEX"),
  condition: z
    .enum(["NEW_WITH_TAGS", "LIKE_NEW", "GOOD", "FAIR"])
    .optional()
    .default("LIKE_NEW"),
  category: z.string().trim().min(1).max(100),
  brand: z.string().max(100).optional().nullable(),
  color: z.string().max(80).optional().nullable(),
  material: z.string().max(100).optional().nullable(),
  style: z.string().max(100).optional().nullable(),
  occasion: z.string().max(100).optional().nullable(),
  season: z.string().max(80).optional().nullable(),
  province: z.string().trim().min(1).max(100),
  districtId: z.coerce.number().int().positive().optional().nullable(),
  wardCode: z.string().max(32).optional().nullable(),
  specificAddress: z.string().max(300).optional().default(""),
  latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
  longitude: z.coerce.number().min(-180).max(180).optional().nullable(),
  status: z.enum(["IN_CLOSET", "LISTED"]).optional().default("IN_CLOSET"),
});

export async function POST(request: Request) {
  try {
    let user;
    try {
      user = await requireUser();
    } catch {
      return NextResponse.json(
        { success: false, message: "Vui lòng đăng nhập để đăng sản phẩm." },
        { status: 401 }
      );
    }

    if (!supabaseAdmin) {
      throw new Error("Missing Supabase Admin Key");
    }

    const adminClient = supabaseAdmin as any;
    const rawBody = await request.json();

    const parsed = createProductPayloadSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: parsed.error.issues[0]?.message || "Dữ liệu sản phẩm không hợp lệ.",
        },
        { status: 400 }
      );
    }

    const safeProductData = parsed.data;
    const productId = crypto.randomUUID();

    // Server-side assignment of id and userId; privileged fields (boostScore, boostExpiresAt, isHighlighted, likeCount) are never accepted from client.
    const { data, error } = await adminClient
      .from("products")
      .insert([
        {
          id: productId,
          userId: user.id,
          ...safeProductData,
        },
      ])
      .select("id");

    if (error) throw error;

    return NextResponse.json({ success: true, outfitId: data?.[0]?.id || productId });
  } catch (error: unknown) {
    // TODO: integrate Sentry/LogRocket tracking and return only safe error messages to users.
    console.error("Product creation API error:", error);
    return NextResponse.json(
      { success: false, message: "Không thể lưu sản phẩm lúc này." },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "all";
    const category = searchParams.get("category") || searchParams.get("occasion");
    const search = searchParams.get("search");
    const size = searchParams.get("size");
    const material = searchParams.get("material");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "24", 10) || 24));

    const { getShopProducts } = await import("@/src/lib/queries/shop");
    const result = await getShopProducts({
      type,
      category,
      occasion: category,
      search: search || undefined,
      size: size || undefined,
      material: material || undefined,
      page,
      limit,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    // TODO: integrate Sentry/LogRocket tracking for GET /api/products errors
    console.error("GET /api/products error:", error);
    return NextResponse.json(
      { success: false, error: "Không thể tải danh sách sản phẩm lúc này." },
      { status: 500 }
    );
  }
}
