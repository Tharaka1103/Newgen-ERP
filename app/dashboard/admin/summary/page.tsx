import { getActiveShopsAction } from "@/actions/shops";
import { SummaryReportsView } from "@/components/shared/summary-reports-view";

export default async function AdminSummaryPage() {
  const shopsRes = await getActiveShopsAction();
  const shops = shopsRes.success && shopsRes.shops ? shopsRes.shops : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Financial Reports & Analytics
        </h1>
        <p className="text-sm text-muted-foreground">
          Examine multi-branch trends, category breakdowns, and export ledger datasets
        </p>
      </div>

      <SummaryReportsView initialShops={shops} userRole="ADMIN" />
    </div>
  );
}
