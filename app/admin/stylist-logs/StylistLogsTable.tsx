"use client";

import React, { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { deleteAiStylistLog } from "@/app/actions/ai-stylist-logs";

export interface StylistLogItem {
  id: string;
  sessionId: string;
  userId: string | null;
  userName: string | null;
  prompt: string;
  response: string;
  createdAt: Date | string;
}

interface StylistLogsTableProps {
  logs: StylistLogItem[];
  totalCount: number;
  uniqueSessionsCount: number;
  currentPage: number;
  totalPages: number;
  initialSearch: string;
  initialSessionId: string;
}

export default function StylistLogsTable({
  logs,
  totalCount,
  uniqueSessionsCount,
  currentPage,
  totalPages,
  initialSearch,
  initialSessionId,
}: StylistLogsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [isPending, startTransition] = useTransition();

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (searchInput.trim()) {
      params.set("search", searchInput.trim());
    } else {
      params.delete("search");
    }
    params.set("page", "1");
    router.push(`/admin/stylist-logs?${params.toString()}`);
  };

  const handleFilterBySession = (sessionId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (initialSessionId === sessionId) {
      params.delete("sessionId");
    } else {
      params.set("sessionId", sessionId);
    }
    params.set("page", "1");
    router.push(`/admin/stylist-logs?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    router.push(`/admin/stylist-logs?${params.toString()}`);
  };

  const handleDelete = (id: string) => {
    if (!confirm("Xác nhận xóa lượt hỏi đáp này khỏi lịch sử?")) return;
    startTransition(async () => {
      await deleteAiStylistLog(id);
    });
  };

  const formatDateTime = (dateInput: Date | string) => {
    const d = new Date(dateInput);
    return d.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  };

  return (
    <div className="space-y-6 text-black font-sans">
      {/* Thống kê tổng quan */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="border border-black p-4 bg-white">
          <p className="text-xs uppercase tracking-wider text-neutral-500">
            Tổng lượt hỏi - đáp
          </p>
          <p className="text-2xl font-bold mt-1">{totalCount}</p>
        </div>
        <div className="border border-black p-4 bg-white">
          <p className="text-xs uppercase tracking-wider text-neutral-500">
            Tổng số phiên khách hàng (Sessions)
          </p>
          <p className="text-2xl font-bold mt-1">{uniqueSessionsCount}</p>
        </div>
        <div className="border border-black p-4 bg-white">
          <p className="text-xs uppercase tracking-wider text-neutral-500">
            Dung lượng ước tính
          </p>
          <p className="text-2xl font-bold mt-1">
            {((totalCount * 1.0) / 1024).toFixed(2)} MB
          </p>
        </div>
      </div>

      {/* Thanh công cụ tìm kiếm & lọc */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center border border-black p-4 bg-neutral-50">
        <form
          onSubmit={handleSearchSubmit}
          className="flex w-full sm:w-auto gap-2 flex-1 max-w-xl"
        >
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Tìm theo câu hỏi, tên khách hàng hoặc mã phiên..."
            className="flex-1 border border-black px-3 py-2 text-xs bg-white text-black focus:outline-none"
          />
          <button
            type="submit"
            className="bg-black text-white px-4 py-2 text-xs font-medium uppercase hover:bg-neutral-800 transition-colors"
          >
            Tìm kiếm
          </button>
          {(initialSearch || initialSessionId) && (
            <button
              type="button"
              onClick={() => {
                setSearchInput("");
                router.push("/admin/stylist-logs");
              }}
              className="border border-black bg-white text-black px-3 py-2 text-xs uppercase hover:bg-neutral-200 transition-colors"
            >
              Xóa bộ lọc
            </button>
          )}
        </form>

        {initialSessionId && (
          <div className="text-xs font-mono bg-black text-white px-3 py-1.5">
            Đang lọc theo phiên: {initialSessionId}
          </div>
        )}
      </div>

      {/* Bảng dữ liệu chính */}
      <div className="border border-black overflow-x-auto bg-white">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-black bg-black text-white uppercase tracking-wider">
              <th className="py-3 px-4 w-[160px] border-r border-neutral-700">
                Thời gian
              </th>
              <th className="py-3 px-4 w-[200px] border-r border-neutral-700">
                Khách hàng / Phiên
              </th>
              <th className="py-3 px-4 w-[35%] border-r border-neutral-700">
                Câu hỏi của khách (Prompt)
              </th>
              <th className="py-3 px-4">Câu trả lời của AI (Response)</th>
              <th className="py-3 px-3 w-[70px] text-center border-l border-neutral-700">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-300">
            {logs.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="py-10 text-center text-neutral-500 text-sm"
                >
                  Chưa có dữ liệu lịch sử trò chuyện AI Stylist nào.
                </td>
              </tr>
            ) : (
              logs.map((log) => {
                const isExpanded = !!expandedIds[log.id];
                const isLongResponse = log.response.length > 220;

                return (
                  <tr
                    key={log.id}
                    className="hover:bg-neutral-50 align-top transition-colors"
                  >
                    {/* Cột 1: Thời gian */}
                    <td className="py-3 px-4 font-mono text-[11px] text-neutral-700 border-r border-neutral-200 whitespace-nowrap">
                      {formatDateTime(log.createdAt)}
                    </td>

                    {/* Cột 2: Khách hàng */}
                    <td className="py-3 px-4 border-r border-neutral-200">
                      <div className="font-semibold text-black">
                        {log.userName || "Khách vãng lai"}
                      </div>
                      {log.userId && (
                        <div className="text-[11px] text-neutral-500 font-mono mt-0.5">
                          UID: {log.userId}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => handleFilterBySession(log.sessionId)}
                        title="Bấm để lọc toàn bộ cuộc hội thoại của phiên này"
                        className="mt-1.5 inline-block font-mono text-[10px] border border-neutral-400 px-1.5 py-0.5 hover:bg-black hover:text-white hover:border-black transition-colors"
                      >
                        {log.sessionId.slice(0, 16)}...
                      </button>
                    </td>

                    {/* Cột 3: Câu hỏi của khách */}
                    <td className="py-3 px-4 border-r border-neutral-200 font-medium text-black whitespace-pre-wrap leading-relaxed">
                      {log.prompt}
                    </td>

                    {/* Cột 4: Câu trả lời của AI */}
                    <td className="py-3 px-4 text-neutral-800 whitespace-pre-wrap leading-relaxed">
                      <div>
                        {isLongResponse && !isExpanded
                          ? `${log.response.slice(0, 220)}...`
                          : log.response}
                      </div>
                      {isLongResponse && (
                        <button
                          type="button"
                          onClick={() => toggleExpand(log.id)}
                          className="mt-1.5 text-[11px] font-semibold underline text-black hover:text-neutral-600 block"
                        >
                          {isExpanded ? "[Thu gọn]" : "[Xem đầy đủ]"}
                        </button>
                      )}
                    </td>

                    {/* Cột 5: Thao tác */}
                    <td className="py-3 px-3 text-center border-l border-neutral-200">
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleDelete(log.id)}
                        className="text-[11px] text-neutral-500 hover:text-black underline disabled:opacity-40"
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Phân trang */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-black pt-4 text-xs">
          <div>
            Trang <strong>{currentPage}</strong> / <strong>{totalPages}</strong>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => handlePageChange(currentPage - 1)}
              className="border border-black px-3 py-1.5 bg-white text-black hover:bg-black hover:text-white disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-black transition-colors"
            >
              Trang trước
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
              className="border border-black px-3 py-1.5 bg-white text-black hover:bg-black hover:text-white disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-black transition-colors"
            >
              Trang sau
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
