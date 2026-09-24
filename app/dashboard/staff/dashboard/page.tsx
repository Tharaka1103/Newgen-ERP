import { auth } from "@/auth";
import { getSummaryAnalyticsAction } from "@/actions/reports";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { CategoryBadge } from "@/components/shared/category-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  WalletIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  ClockIcon,
  PlusCircleIcon,
  ArrowRightIcon,
  BuildingIcon,
  AlertTriangleIcon,
} from "lucide-react";

export default async function StaffDashboardPage() {
  const session = await auth();
  const userShopId = (session?.user as { shop?: string | null })?.shop || null;
  const userShopName = (session?.user as { shopName?: string | null })?.shopName || null;

  const res = await getSummaryAnalyticsAction({ period: "month" });

  const kpis = res.success && res.kpis ? res.kpis : {
    totalTransactions: 0,
    totalExpense: 0,
    totalIncome: 0,
    pendingApprovals: 0,
    approvedAmount: 0,
    rejectedAmount: 0,
    netBalance: 0,
  };

  const recentRecords = res.records ? res.records.slice(-5).reverse() : [];
  const latestRunningBalance = recentRecords.length > 0 ? recentRecords[0].runningBalance || 0 : 0;

  return (
    <div className="space-y-6">
      {!userShopId && (
        <div className="flex items-center gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4 text-warning">
          <AlertTriangleIcon className="size-5 shrink-0" />
          <div className="text-xs">
            <span className="font-semibold block text-sm">No Branch Assigned</span>
            You are not currently assigned to a branch. Please contact an Administrator to assign your branch.
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Branch Finance Overview
            </h1>
            {userShopName && (
              <Badge variant="outline" className="font-mono text-xs">
                <BuildingIcon className="size-3 mr-1" />
                {userShopName}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Monitor daily branch expenditures, fee collections, and verifier approval queues
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button render={<Link href="/dashboard/staff/finances" />} size="sm" className="gap-1.5">
            <PlusCircleIcon className="size-4" />
            Add Transaction
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Branch Running Balance */}
        <Card className="border-border bg-card shadow-sm min-w-0 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate" title="Branch Ledger Balance">
              Branch Ledger Balance
            </CardTitle>
            <div className="rounded-lg bg-primary/10 p-2 text-primary shrink-0">
              <WalletIcon className="size-4" />
            </div>
          </CardHeader>
          <CardContent className="min-w-0">
            <div
              className={`text-2xl font-bold font-mono truncate ${latestRunningBalance >= 0 ? "text-chart-2" : "text-destructive"}`}
              title={`LKR ${latestRunningBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
            >
              LKR {latestRunningBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate" title="Current sequential cash balance">
              Current sequential cash balance
            </p>
          </CardContent>
        </Card>

        {/* Month Cash Inflow */}
        <Card className="border-border bg-card shadow-sm min-w-0 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate" title="This Month's Income">
              This Month&apos;s Income
            </CardTitle>
            <div className="rounded-lg bg-chart-2/10 p-2 text-chart-2 shrink-0">
              <TrendingUpIcon className="size-4" />
            </div>
          </CardHeader>
          <CardContent className="min-w-0">
            <div
              className="text-2xl font-bold text-foreground font-mono truncate"
              title={`LKR ${kpis.totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
            >
              LKR {kpis.totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate" title="Course fees & collections">
              Course fees & collections
            </p>
          </CardContent>
        </Card>

        {/* Month Outflows */}
        <Card className="border-border bg-card shadow-sm min-w-0 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate" title="This Month's Outflows">
              This Month&apos;s Outflows
            </CardTitle>
            <div className="rounded-lg bg-destructive/10 p-2 text-destructive shrink-0">
              <TrendingDownIcon className="size-4" />
            </div>
          </CardHeader>
          <CardContent className="min-w-0">
            <div
              className="text-2xl font-bold text-foreground font-mono truncate"
              title={`LKR ${kpis.totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
            >
              LKR {kpis.totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate" title="Daily petty expenses & bills">
              Daily petty expenses & bills
            </p>
          </CardContent>
        </Card>

        {/* Pending Approval Count */}
        <Card className="border-border bg-card shadow-sm min-w-0 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate" title="Pending Approvals">
              Pending Approvals
            </CardTitle>
            <div className="rounded-lg bg-warning/10 p-2 text-warning shrink-0">
              <ClockIcon className="size-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="min-w-0">
            <div className="text-2xl font-bold text-foreground font-mono truncate" title={String(kpis.pendingApprovals)}>
              {kpis.pendingApprovals}
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate" title="Entries waiting for verifier review">
              Entries waiting for verifier review
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Records Card */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">Recent Branch Transactions</CardTitle>
            <CardDescription>Your shop&apos;s most recently submitted financial logs</CardDescription>
          </div>
          <Button render={<Link href="/dashboard/staff/finances" />} variant="ghost" size="sm" className="gap-1 text-xs">
            Open Ledger <ArrowRightIcon className="size-3.5" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentRecords.map((rec: any) => (
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
                      {new Date(rec.date).toLocaleDateString()} • {rec.paymentMethod}
                    </span>
                  </div>
                  <CategoryBadge name={rec.category?.name || "Other"} colorToken={rec.category?.colorToken} />
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-xs text-muted-foreground truncate max-w-xs">
                    {rec.reason}
                  </span>
                  <span className={`font-mono text-xs font-semibold ${rec.type === "INCOME" ? "text-chart-2" : "text-foreground"}`}>
                    {rec.type === "INCOME" ? "+" : "-"} LKR {Number(rec.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                  <StatusBadge status={rec.status} />
                </div>
              </div>
            ))}
            {recentRecords.length === 0 && (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No recent transactions recorded. Click &quot;Add Transaction&quot; to submit your first entry.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
