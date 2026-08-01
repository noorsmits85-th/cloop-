import React from "react";
import AccountingClient from "./AccountingClient";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const dynamic = "force-dynamic";

export default async function AdminAccountingPage() {
  const periods = await prisma.accountingPeriod.findMany({
    orderBy: {
      periodStart: 'desc'
    }
  });

  return (
    <div className="p-8 max-w-7xl mx-auto bg-stone-50 min-h-screen font-sans">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-stone-900 tracking-tight">Kỳ Kế Toán (Accounting Periods)</h1>
        <p className="text-stone-500 mt-2">Chốt sổ kế toán hàng tháng để ghi nhận Lợi nhuận gộp của nền tảng.</p>
      </div>

      <AccountingClient initialPeriods={periods} />
    </div>
  );
}
