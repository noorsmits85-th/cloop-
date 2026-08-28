import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      message: "Embedding generation is an internal server-side pipeline.",
    },
    { status: 410 }
  );
}
