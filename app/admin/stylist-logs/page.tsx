import React from "react";
import { getAiStylistLogs } from "@/app/actions/ai-stylist-logs";
import StylistLogsTable from "./StylistLogsTable";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Lịch Sử AI Stylist | CLOOP Admin",
};

interface AdminStylistLogsPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    sessionId?: string;
  }>;
}

export default async function AdminStylistLogsPage({
  searchParams,
}: AdminStylistLogsPageProps) {
  const resolvedParams = await searchParams;
  const currentPage = Number(resolvedParams.page) || 1;
  const search = resolvedParams.search || "";
  const sessionId = resolvedParams.sessionId || "";

  const { logs, totalCount, uniqueSessionsCount, totalPages } =
    await getAiStylistLogs({
      page: currentPage,
      pageSize: 30,
      search,
      sessionId,
    });

  return (
    <main className="min-h-screen bg-white text-black p-6 sm:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="border-b-2 border-black pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold uppercase tracking-tight">
              Lịch sử trò chuyện AI Stylist
            </h1>
            <p className="text-xs text-neutral-600 mt-1">
              Theo dõi trực tiếp các câu hỏi tư vấn trang phục, kích cỡ và nhu cầu thực tế của khách hàng trên CLOOP.
            </p>
          </div>
          <div className="text-xs font-mono text-neutral-500">
            Endpoint: /api/stylist | Model: AiStylistLog
          </div>
        </div>

        {/* Bảng dữ liệu */}
        <StylistLogsTable
          logs={logs}
          totalCount={totalCount}
          uniqueSessionsCount={uniqueSessionsCount}
          currentPage={currentPage}
          totalPages={totalPages}
          initialSearch={search}
          initialSessionId={sessionId}
        />
      </div>
    </main>
  );
}
