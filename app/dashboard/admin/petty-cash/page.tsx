import { getPettyCashSummaryAction } from "@/actions/pettyCash";
import { getActiveBankAccountsAction } from "@/actions/bankAccounts";
import { PettyCashView } from "@/components/admin/petty-cash-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Petty Cash Account | Newgen ERP",
  description: "Central petty cash management, float tracking, and expense disbursements",
};

export default async function AdminPettyCashPage() {
  const [pettyRes, bankRes] = await Promise.all([
    getPettyCashSummaryAction({ period: "month" }),
    getActiveBankAccountsAction(),
  ]);

  const account = pettyRes.success && pettyRes.account
    ? pettyRes.account
    : { _id: "", name: "Central Petty Cash", currentBalance: 0, initialFloat: 0 };

  const bankAccounts = bankRes.success && bankRes.accounts ? bankRes.accounts : [];

  return (
    <div className="space-y-6">
      <PettyCashView
        initialAccount={account}
        initialPeriodInflow={pettyRes.periodInflow || 0}
        initialPeriodOutflow={pettyRes.periodOutflow || 0}
        initialRecords={pettyRes.records || []}
        initialTimelineData={pettyRes.timelineData || []}
        bankAccounts={bankAccounts}
      />
    </div>
  );
}
