"use server";

import { prisma } from "@/src/lib/prisma";
import { revalidatePath } from "next/cache";

export interface GetStylistLogsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sessionId?: string;
}

export async function getAiStylistLogs({
  page = 1,
  pageSize = 30,
  search = "",
  sessionId = "",
}: GetStylistLogsParams = {}) {
  try {
    const skip = (Math.max(1, page) - 1) * pageSize;
    const whereClause: any = {};

    if (sessionId.trim()) {
      whereClause.sessionId = sessionId.trim();
    }

    if (search.trim()) {
      const keyword = search.trim();
      whereClause.OR = [
        { prompt: { contains: keyword, mode: "insensitive" } },
        { response: { contains: keyword, mode: "insensitive" } },
        { userName: { contains: keyword, mode: "insensitive" } },
        { sessionId: { contains: keyword, mode: "insensitive" } },
      ];
    }

    const [logs, totalCount, uniqueSessionsGroup] = await Promise.all([
      prisma.aiStylistLog.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.aiStylistLog.count({ where: whereClause }),
      prisma.aiStylistLog.groupBy({
        by: ["sessionId"],
      }),
    ]);

    return {
      logs,
      totalCount,
      uniqueSessionsCount: uniqueSessionsGroup.length,
      totalPages: Math.ceil(totalCount / pageSize),
      currentPage: page,
    };
  } catch (error) {
    console.error("[GET_AI_STYLIST_LOGS_ERROR]:", error);
    return {
      logs: [],
      totalCount: 0,
      uniqueSessionsCount: 0,
      totalPages: 0,
      currentPage: 1,
    };
  }
}

export async function deleteAiStylistLog(id: string) {
  try {
    await prisma.aiStylistLog.delete({
      where: { id },
    });
    revalidatePath("/admin/stylist-logs");
    return { success: true };
  } catch (error) {
    console.error("[DELETE_AI_STYLIST_LOG_ERROR]:", error);
    return { success: false, error: "Không thể xóa bản ghi." };
  }
}
