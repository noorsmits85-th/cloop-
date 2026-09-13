"use client";

import React, { useState } from "react";
import { 
  ShieldCheck, 
  ShieldAlert, 
  Search, 
  UserCheck, 
  Filter, 
  Phone, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ExternalLink,
  Lock,
  Loader2,
  RefreshCw,
  Fingerprint
} from "lucide-react";
import { maskPhoneNumber, getVietnamCarrier } from "@/lib/validations/phone";
import { adminVerifyUserPhoneAction } from "@/app/actions/phone-verification";
import { formatClooperCode } from "@/lib/constants/provinces";
import { useRouter } from "next/navigation";

export interface AdminUserItem {
  id: string;
  name: string | null;
  email: string;
  role: string;
  isVerified: boolean;
  completedOrders: number;
  createdAt: string;
  phone?: string;
}

export default function IdentityVerificationClient({ initialUsers }: { initialUsers: AdminUserItem[] }) {
  const [users, setUsers] = useState<AdminUserItem[]>(initialUsers);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "VERIFIED" | "UNVERIFIED">("ALL");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const router = useRouter();

  const handleToggleVerification = async (targetUserId: string, currentStatus: boolean) => {
    setLoadingId(targetUserId);
    setActionMessage(null);

    try {
      const res = await adminVerifyUserPhoneAction({
        targetUserId,
        isVerified: !currentStatus,
      });

      if (!res.success) {
        throw new Error(res.error);
      }

      setUsers(prev => prev.map(u => {
        if (u.id === targetUserId) {
          return { ...u, isVerified: !currentStatus };
        }
        return u;
      }));

      setActionMessage(res.message || "Đã cập nhật trạng thái xác thực thành công.");
      setTimeout(() => setActionMessage(null), 3000);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi thao tác quản trị viên";
      alert(msg);
    } finally {
      setLoadingId(null);
    }
  };

  const filteredUsers = users.filter(u => {
    if (filterStatus === "VERIFIED" && !u.isVerified) return false;
    if (filterStatus === "UNVERIFIED" && u.isVerified) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const nameMatch = (u.name || "").toLowerCase().includes(q);
    const emailMatch = u.email.toLowerCase().includes(q);
    const phoneMatch = (u.phone || "").includes(q);
    const idMatch = u.id.toLowerCase().includes(q);
    return nameMatch || emailMatch || phoneMatch || idMatch;
  });

  const verifiedCount = users.filter(u => u.isVerified).length;
  const unverifiedCount = users.length - verifiedCount;

  return (
    <div className="space-y-6">
      {/* 📊 KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
            <UserCheck size={14} className="text-emerald-700" /> Tổng Số Thành Viên
          </span>
          <div className="text-3xl font-extrabold font-heading text-stone-900">{users.length}</div>
          <p className="text-[11px] text-stone-400">Tài khoản đã ghi nhận trong hệ thống</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-emerald-600" /> Đã Xác Thực SĐT Chính Chủ
          </span>
          <div className="text-3xl font-extrabold font-heading text-emerald-800">{verifiedCount}</div>
          <p className="text-[11px] text-stone-400">Được hưởng điểm tín nhiệm và liên lạc GHN an toàn</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
            <ShieldAlert size={14} className="text-amber-600" /> Chưa Xác Thực SĐT
          </span>
          <div className="text-3xl font-extrabold font-heading text-amber-800">{unverifiedCount}</div>
          <p className="text-[11px] text-stone-400">Bị khóa cọc 100% qua Két Escrow, không được hưởng chiết khấu</p>
        </div>
      </div>

      {/* 🔍 FILTER & SEARCH TOOLBAR */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-2xs flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên, email, SĐT, hoặc Clooper ID..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 text-xs focus:outline-none focus:border-[#183A2D] bg-stone-50/50 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="text-xs font-bold text-stone-500 flex items-center gap-1">
            <Filter size={13} /> Lọc:
          </span>
          <div className="flex bg-stone-100 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setFilterStatus("ALL")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${filterStatus === "ALL" ? "bg-white text-stone-900 shadow-2xs" : "text-stone-500 hover:text-stone-900"}`}
            >
              Tất cả ({users.length})
            </button>
            <button
              onClick={() => setFilterStatus("VERIFIED")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${filterStatus === "VERIFIED" ? "bg-white text-emerald-800 shadow-2xs" : "text-stone-500 hover:text-stone-900"}`}
            >
              Đã xác thực ({verifiedCount})
            </button>
            <button
              onClick={() => setFilterStatus("UNVERIFIED")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${filterStatus === "UNVERIFIED" ? "bg-white text-amber-800 shadow-2xs" : "text-stone-500 hover:text-stone-900"}`}
            >
              Chưa xác thực ({unverifiedCount})
            </button>
          </div>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-700" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* 📋 TABLE OF USERS & IDENTITY STATUS */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-700">
            <thead className="bg-[#FAF9F5] border-b border-stone-200 text-[11px] font-bold text-stone-500 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Người Dùng</th>
                <th className="py-3.5 px-4">Số Điện Thoại & Nhà Mạng</th>
                <th className="py-3.5 px-4 text-center">Trạng Thái SĐT</th>
                <th className="py-3.5 px-4 text-center">Đơn Hoàn Tất</th>
                <th className="py-3.5 px-4">Ngày Tham Gia</th>
                <th className="py-3.5 px-4 text-right">Thao Tác Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-stone-400 italic">
                    Không tìm thấy thành viên nào phù hợp với bộ lọc tìm kiếm.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const clooperCode = formatClooperCode(u.id);
                  const carrier = getVietnamCarrier(u.phone);
                  const isBusy = loadingId === u.id;

                  return (
                    <tr key={u.id} className="hover:bg-stone-50/70 transition-colors">
                      {/* Name & ID */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-stone-900 text-xs flex items-center gap-1.5">
                          <span>{u.name || "Thành viên CLOOP"}</span>
                          {u.role === "ADMIN" && (
                            <span className="text-[9px] bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded-full font-bold">ADMIN</span>
                          )}
                        </div>
                        <div className="text-[10.5px] text-stone-400 font-mono mt-0.5 flex items-center gap-1">
                          <Fingerprint size={10} /> #{clooperCode.replace("CLOOP-", "")} • {u.email}
                        </div>
                      </td>

                      {/* Phone & Carrier */}
                      <td className="py-3.5 px-4">
                        {u.phone ? (
                          <div className="space-y-0.5">
                            <span className="font-mono font-bold text-stone-800 text-xs">
                              {maskPhoneNumber(u.phone)}
                            </span>
                            <div className="flex items-center gap-1">
                              <span className={`text-[9px] px-1.5 py-0.2 rounded-md font-bold border ${carrier.badgeColor}`}>
                                {carrier.name}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-stone-400 italic text-[11px]">Chưa đăng ký SĐT</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        {u.isVerified ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 size={11} className="text-emerald-600" /> ĐÃ XÁC THỰC
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <Clock size={11} className="text-amber-600" /> CHƯA XÁC THỰC
                          </span>
                        )}
                      </td>

                      {/* Completed Orders */}
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-stone-700">
                        {u.completedOrders} đơn
                      </td>

                      {/* Join Date */}
                      <td className="py-3.5 px-4 text-stone-500 font-mono text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString("vi-VN")}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleToggleVerification(u.id, u.isVerified)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer inline-flex items-center gap-1.5 ${
                            u.isVerified
                              ? "bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200"
                              : "bg-[#183A2D] hover:bg-emerald-800 text-white"
                          }`}
                        >
                          {isBusy ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : u.isVerified ? (
                            <>
                              <XCircle size={12} />
                              <span>Thu hồi</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 size={12} />
                              <span>Duyệt SĐT</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
