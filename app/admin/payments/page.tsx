import React from "react";
import { requireAdminOrRedirect } from "@/src/lib/auth";
import { getPendingPayoutsAction } from "./actions";
import PaymentsClient from "./PaymentsClient";

export const dynamic = "force-dynamic";

export default async function AdminPaymentDashboard() {
  await requireAdminOrRedirect();

  const res = await getPendingPayoutsAction();
  const items = res.success && res.items ? res.items : [];

  return <PaymentsClient initialItems={items} />;
}
