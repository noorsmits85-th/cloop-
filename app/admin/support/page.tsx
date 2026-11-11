import React from "react";
import { requireAdminOrRedirect } from "@/src/lib/auth";
import AdminSupportClient from "./AdminSupportClient";
import { getAllSupportTickets } from "@/app/actions/support";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "CSKH Trực Tuyến | CLOOP Admin",
};

export default async function AdminSupportPage() {
  await requireAdminOrRedirect();

  const result = await getAllSupportTickets();
  const initialTickets = result.success ? result.tickets : [];

  return (
    <div className="w-full flex flex-col font-ui">
      <AdminSupportClient initialTickets={initialTickets} />
    </div>
  );
}
