import { NextResponse } from "next/server";
import { requireUser } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { generateDisputeVideoUploadUrl } from "@/src/services/gcsStorage";
import { z } from "zod";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  rentalId: z.string().min(1, "Thiếu mã đơn thuê"),
  fileName: z.string().min(1, "Thiếu tên tệp"),
  contentType: z.string().refine(
    (ct) => ct.startsWith("video/") || ct.startsWith("image/"),
    "Chỉ chấp nhận tệp video (mp4, mov, webm) hoặc hình ảnh (jpg, png)"
  ),
});

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown_ip";
    const userAgent = req.headers.get("user-agent") || "unknown_ua";

    const body = await req.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ" },
        { status: 400 }
      );
    }

    const { rentalId, fileName, contentType } = parsed.data;

    // 1. Anti-IDOR Authorization: Kiểm tra quyền hạn trực tiếp trong DB
    const rental = await prisma.rentalHistory.findUnique({
      where: { id: rentalId },
      include: {
        product: true,
      },
    });

    if (!rental) {
      return NextResponse.json({ success: false, error: "Không tìm thấy đơn thuê" }, { status: 404 });
    }

    const isRenter = rental.renterId === user.id;
    const isOwner = rental.ownerId === user.id || rental.product?.userId === user.id;
    const isAdmin = user.role === "ADMIN";

    if (!isRenter && !isOwner && !isAdmin) {
      return NextResponse.json(
        { success: false, error: "Bạn không có quyền tải bằng chứng cho đơn thuê này" },
        { status: 403 }
      );
    }

    // 2. Sinh Signed URL từ Google Cloud Storage với đường dẫn do Server kiểm soát
    const uploadMeta = await generateDisputeVideoUploadUrl({
      rentalId,
      fileName,
      contentType,
      userId: user.id,
    });

    // 3. Structured Audit Log (KHÔNG log signed URL để tránh rò rỉ credential tạm thời)
    console.log(JSON.stringify({
      event: "DISPUTE_SIGNED_URL_REQUESTED",
      traceId: uploadMeta.traceId,
      rentalId,
      actorId: user.id,
      objectName: uploadMeta.objectName,
      maxSizeBytes: uploadMeta.maxSizeBytes,
      ip,
      userAgent: userAgent.substring(0, 100),
      timestamp: new Date().toISOString(),
    }));

    return NextResponse.json({
      success: true,
      data: uploadMeta,
    });
  } catch (error: any) {
    console.error("API Dispute Upload URL Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Lỗi máy chủ khi sinh link tải tệp" },
      { status: 500 }
    );
  }
}
