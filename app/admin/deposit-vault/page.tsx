import React from "react";
import { requireAdminOrRedirect } from "@/src/lib/auth";
import { getDepositVaultMetricsAction } from "./actions";
import DepositVaultClient, { DepositVaultData } from "./DepositVaultClient";

export const dynamic = "force-dynamic";

const DEFAULT_VAULT_DATA: DepositVaultData = {
  vaultSummary: {
    totalVault: 0,
    pendingReturn: 0,
    activeRentalDeposit: 0,
    activeCount: 0,
    totalHistoricalSettled: 0,
    settledCount: 0,
  },
  floatStrategy: null,
  activeTransactions: [],
  settledTransactions: [],
};

export default async function DepositVaultAdminPage() {
  await requireAdminOrRedirect();

  const res = await getDepositVaultMetricsAction();
  const initialData: DepositVaultData =
    res.success && res.data ? res.data : DEFAULT_VAULT_DATA;

  return <DepositVaultClient initialData={initialData} />;
}
