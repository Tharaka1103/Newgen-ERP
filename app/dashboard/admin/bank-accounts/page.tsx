import { getBankAccountsSummaryAction } from "@/actions/bankAccounts";
import { BankAccountsView } from "@/components/admin/bank-accounts-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bank Accounts | Newgen ERP",
  description: "Manage organization bank accounts, capital flows, and bank transactions",
};

export default async function AdminBankAccountsPage() {
  const res = await getBankAccountsSummaryAction({ period: "month" });

  const totalCapital = res.success ? (res.totalBankCapital || 0) : 0;
  const periodInflow = res.success ? (res.periodInflow || 0) : 0;
  const periodOutflow = res.success ? (res.periodOutflow || 0) : 0;
  const accounts = res.success && res.accounts ? res.accounts : [];
  const records = res.success && res.records ? res.records : [];
  const timelineData = res.success && res.timelineData ? res.timelineData : [];

  return (
    <div className="space-y-6">
      <BankAccountsView
        initialTotalBankCapital={totalCapital}
        initialPeriodInflow={periodInflow}
        initialPeriodOutflow={periodOutflow}
        initialAccounts={accounts}
        initialRecords={records}
        initialTimelineData={timelineData}
      />
    </div>
  );
}
