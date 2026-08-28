import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/src/lib/supabase";
import { requireUser } from "@/src/lib/auth";

export async function POST(request: Request) {
  try {
    if (!supabaseAdmin) {
      throw new Error("Missing Supabase Admin Key");
    }

    const adminClient = supabaseAdmin as any;
    const user = await requireUser();
    const body = await request.json();
    const { client_upload_id, ...productData } = body;

    productData.userId = user.id;

    if (client_upload_id) {
      const { data: existingProduct } = await adminClient
        .from("products")
        .select("id")
        .eq("id", client_upload_id)
        .eq("userId", user.id)
        .maybeSingle();

      if (existingProduct) {
        return NextResponse.json({ success: true, outfitId: existingProduct.id });
      }
    }

    // Visual embeddings are generated asynchronously into product_image_embeddings.
    const { data, error } = await adminClient
      .from("products")
      .insert([
        {
          id: client_upload_id,
          ...productData,
        },
      ])
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, outfitId: data[0].id });
  } catch (error: any) {
    // TODO: integrate Sentry/LogRocket tracking and return only safe error messages to users.
    console.error("Product creation API error:", error?.message || error);
    return NextResponse.json({ success: false, message: "Khong the luu san pham." }, { status: 500 });
  }
}
