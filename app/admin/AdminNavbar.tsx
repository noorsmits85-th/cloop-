"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminNavbar() {
  const pathname = usePathname();

  const navItems = [
    { label: "Tổng Quan", href: "/admin", exact: true },
    { label: "Quỹ Tiền Cọc", href: "/admin/deposit-vault" },
    { label: "Định Danh & SĐT", href: "/admin/identity" },
    { label: "Vận Chuyển GHN", href: "/admin/shipments" },
    { label: "Khiếu Nại", href: "/admin/disputes" },
    { label: "CSKH Trực Tuyến", href: "/admin/support" },
    { label: "Sổ Cái Kép TT 99", href: "/admin/ledger" },
    { label: "Chi Trả Doanh Thu", href: "/admin/payments" },
    { label: "Kỳ Kế Toán", href: "/admin/accounting" },
  ];

  return (
    <div className="sticky top-[88px] z-40 bg-white/95 backdrop-blur-md border-b border-stone-200/90 font-ui px-4 lg:px-6">
      <div className="max-w-[1280px] mx-auto flex items-center justify-between gap-4">
        <nav className="flex items-center gap-1.5 py-2.5 overflow-x-auto no-scrollbar text-xs">
          {navItems.map((item) => {
            const isActive = item.exact 
              ? pathname === item.href 
              : pathname === item.href || pathname?.startsWith(item.href + "/");

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap text-xs ${
                  isActive
                    ? "bg-[#183A2D] text-white font-bold"
                    : "text-stone-600 hover:text-stone-900 hover:bg-stone-100 font-medium"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden lg:flex items-center gap-1.5 text-[11px] font-semibold text-emerald-900 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/80 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
          Phân Hệ Quản Trị
        </div>
      </div>
    </div>
  );
}
