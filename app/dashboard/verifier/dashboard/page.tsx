import { auth } from "@/auth";
import { getSummaryAnalyticsAction } from "@/actions/reports";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { CategoryBadge } from "@/components/shared/category-badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  ClockIcon,
  CheckCircle2Icon,
  XCircleIcon,
  ArrowRightIcon,
  BuildingIcon,
  ShieldCheckIcon,
} from "lucide-react";

export default async function VerifierDashboardPage() {
  const [monthRes, todayRes] = await Promise.all([
    getSummaryAnalyticsAction({ period: "month" }),
    getSummaryAnalyticsAction({ period: "today" }),
  ]);

  const monthKpis = monthRes.success && monthRes.kpis ? monthRes.kpis : {
    totalTransactions: 0,
    totalExpense: 0,
    totalIncome: 0,
    pendingApprovals: 0,
    approvedAmount: 0,
    rejectedAmount: 0,
    netBalance: 0,
  };

  const todayRecords = todayRes.records || [];
  const approvedToday = todayRecords.filter((r: any) => r.status === "APPROVED").length;
  const rejectedToday = todayRecords.filter((r: any) => r.status === "REJECTED").length;

  const pendingRecords = (monthRes.records || [])
    .filter((r: any) => r.status === "PENDING")
    .slice(0, 6);

  const shopComparison = monthRes.shopComparisonData || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Finance Verification Control
          </h1>
          <p className="text-sm text-muted-foreground">
            Audit branch ledger submissions, enforce financial compliance, and adjust approved amounts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button render={<Link href="/dashboard/verifier/records" />} size="sm" className="gap-1.5">
            <CheckCircle2Icon className="size-4" />
            Open Review Queue
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Pending Approvals */}
        <Card className="border-border bg-card shadow-sm min-w-0 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate" title="Awaiting Verification">
              Awaiting Verification
            </CardTitle>
            <div className="rounded-lg bg-warning/10 p-2 text-warning shrink-0">
              <ClockIcon className="size-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="min-w-0">
            <div className="text-2xl font-bold text-foreground font-mono truncate" title={`${monthKpis.pendingApprovals} Records`}>
              {monthKpis.pendingApprovals} Records
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate" title={monthKpis.pendingApprovals === 0 ? "Queue completely cleared" : "Requires attention"}>
              {monthKpis.pendingApprovals === 0 ? "Queue completely cleared" : "Requires attention"}
            </p>
          </CardContent>
        </Card>

        {/* Approved Today */}
        <Card className="border-border bg-card shadow-sm min-w-0 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate" title="Approved Today">
              Approved Today
            </CardTitle>
            <div className="rounded-lg bg-chart-2/10 p-2 text-chart-2 shrink-0">
              <CheckCircle2Icon className="size-4" />
            </div>
          </CardHeader>
          <CardContent className="min-w-0">
            <div className="text-2xl font-bold text-foreground font-mono truncate" title={`${approvedToday} Entries`}>
              {approvedToday} Entries
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate" title="Cleared for ledger finalization">
              Cleared for ledger finalization
            </p>
          </CardContent>
        </Card>

        {/* Rejected Today */}
        <Card className="border-border bg-card shadow-sm min-w-0 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate" title="Declined Today">
              Declined Today
            </CardTitle>
            <div className="rounded-lg bg-destructive/10 p-2 text-destructive shrink-0">
              <XCircleIcon className="size-4" />
            </div>
          </CardHeader>
          <CardContent className="min-w-0">
            <div className="text-2xl font-bold text-foreground font-mono truncate" title={`${rejectedToday} Entries`}>
              {rejectedToday} Entries
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate" title="Declined with mandatory remarks">
              Declined with mandatory remarks
            </p>
          </CardContent>
        </Card>

        {/* Total Value Approved this month */}
        <Card className="border-border bg-card shadow-sm min-w-0 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate" title="Monthly Approved Value">
              Monthly Approved Value
            </CardTitle>
            <div className="rounded-lg bg-primary/10 p-2 text-primary shrink-0">
              <ShieldCheckIcon className="size-4" />
            </div>
          </CardHeader>
          <CardContent className="min-w-0">
            <div
              className="text-2xl font-bold text-chart-2 font-mono truncate"
              title={`LKR ${monthKpis.approvedAmount.toLocaleString(undefined, { minimumFractionDigits: 0 })}`}
            >
              LKR {monthKpis.approvedAmount.toLocaleString(undefined, { minimumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate" title="Authorized capital across all branches">
              Authorized capital across all branches
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Grid: Pending Items Queue & Branch Distribution */}
      <div className="grid gap-6 lg:grid-cols-7">
        {/* Pending Items List (4 cols) */}
        <Card className="lg:col-span-4 border-border bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Immediate Review Queue</CardTitle>
              <CardDescription>Transactions requiring verifier authorization</CardDescription>
            </div>
            <Button render={<Link href="/dashboard/verifier/records" />} variant="ghost" size="sm" className="gap-1 text-xs">
              View All <ArrowRightIcon className="size-3.5" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingRecords.map((rec: any) => (
                <div
                  key={rec._id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-border/70 bg-card p-3 hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <span className="font-mono text-xs font-semibold text-primary">
                        {rec.billNumber}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {rec.shop?.name} • {new Date(rec.date).toLocaleDateString()}
                      </span>
                    </div>
                    <CategoryBadge name={rec.category?.name || "Expense"} colorToken={rec.category?.colorToken} />
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-xs text-muted-foreground truncate max-w-[140px]">
                      {rec.reason}
                    </span>
                    <span className="font-mono text-xs font-semibold text-foreground">
                      LKR {Number(rec.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                    <Button
                      render={<Link href="/dashboard/verifier/records" />}
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                    >
                      Review
                    </Button>
                  </div>
                </div>
              ))}
              {pendingRecords.length === 0 && (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No records currently waiting for review. The verification queue is clean.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Branch Distribution (3 cols) */}
        <Card className="lg:col-span-3 border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Branch Inflow/Outflow</CardTitle>
            <CardDescription>Monthly activity across monitored branches</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {shopComparison.slice(0, 6).map((item) => (
                <div
                  key={item.shop}
                  className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/20 p-2.5"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex size-7 items-center justify-center rounded bg-primary/10 font-bold text-xs text-primary uppercase">
                      {item.code}
                    </div>
                    <span className="text-xs font-medium text-foreground truncate max-w-[120px]">
                      {item.shop}
                    </span>
                  </div>
                  <div className="text-right text-xs">
                    <div className="font-mono font-semibold text-chart-2">
                      +LKR {Number(item.income).toLocaleString()}
                    </div>
                    <div className="font-mono text-muted-foreground text-[10px]">
                      -LKR {Number(item.expense).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
              {shopComparison.length === 0 && (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No branch activity recorded yet this month.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
