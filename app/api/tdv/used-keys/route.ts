import { NextResponse } from "next/server";
import { prismaAdmin } from "@/src/lib/prisma";

export async function GET() {
  try {
    const records: any[] = await prismaAdmin.$queryRawUnsafe(
      `SELECT UPPER(key) as key FROM public.tdv_license_keys WHERE used = true;`
    );

    const usedKeys = records.map((r) => r.key);
    return NextResponse.json(usedKeys);
  } catch (error: any) {
    console.error("[TDV Used Keys] Error:", error);
    return NextResponse.json([], { status: 500 });
  }
}
