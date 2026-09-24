import { auth } from "@/auth";
import { getSummaryAnalyticsAction } from "@/actions/reports";
import { getShopsAction } from "@/actions/shops";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { CategoryBadge } from "@/components/shared/category-badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  DollarSignIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  ClockIcon,
  Building2Icon,
  ArrowRightIcon,
  PlusCircleIcon,
  CheckCircle2Icon,
} from "lucide-react";

export default async function AdminDashboardPage() {
  const session = await auth();
  const [analyticsRes, shopsRes] = await Promise.all([
    getSummaryAnalyticsAction({ period: "month" }),
    getShopsAction(),
  ]);

  const kpis = analyticsRes.success && analyticsRes.kpis ? analyticsRes.kpis : {
    totalTransactions: 0,
    totalExpense: 0,
    totalIncome: 0,
    pendingApprovals: 0,
    approvedAmount: 0,
    rejectedAmount: 0,
    netBalance: 0,
  };

  const shops = shopsRes.success && shopsRes.shops ? shopsRes.shops : [];
  const recentRecords = analyticsRes.records ? analyticsRes.records.slice(-6).reverse() : [];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Executive Financial Overview
          </h1>
          <p className="text-sm text-muted-foreground">
            Organization-wide financial performance, branch balances, and review statuses for this month
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button render={<Link href="/dashboard/admin/summary" />} variant="outline" size="sm" className="gap-1.5">
            Detailed Summary
            <ArrowRightIcon className="size-4" />
          </Button>
          <Button render={<Link href="/dashboard/admin/users" />} size="sm" className="gap-1.5">
            <PlusCircleIcon className="size-4" />
            Manage Users
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Net Cash Balance */}
        <Card className="border-border bg-card shadow-sm min-w-0 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate" title="Net Cash Balance">
              Net Cash Balance
            </CardTitle>
            <div className="rounded-lg bg-primary/10 p-2 text-primary shrink-0">
              <DollarSignIcon className="size-4" />
            </div>
          </CardHeader>
          <CardContent className="min-w-0">
            <div
              className={`text-2xl font-bold font-mono truncate ${kpis.netBalance >= 0 ? "text-chart-2" : "text-destructive"}`}
              title={`LKR ${kpis.netBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
            >
              LKR {kpis.netBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate" title="Current organization cumulative liquidity">
              Current organization cumulative liquidity
            </p>
          </CardContent>
        </Card>

        {/* Total Income */}
        <Card className="border-border bg-card shadow-sm min-w-0 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate" title="Total Inflows / Income">
              Total Inflows / Income
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
            <p className="text-xs text-muted-foreground mt-1 truncate" title="Course fees, deposits & collection">
              Course fees, deposits & collection
            </p>
          </CardContent>
        </Card>

        {/* Total Expense */}
        <Card className="border-border bg-card shadow-sm min-w-0 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate" title="Total Outflows / Expense">
              Total Outflows / Expense
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
            <p className="text-xs text-muted-foreground mt-1 truncate" title="Branch operations & approved expenditures">
              Branch operations & approved expenditures
            </p>
          </CardContent>
        </Card>

        {/* Pending Approvals */}
        <Card className="border-border bg-card shadow-sm min-w-0 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate" title="Pending Verification">
              Pending Verification
            </CardTitle>
            <div className="rounded-lg bg-warning/10 p-2 text-warning shrink-0">
              <ClockIcon className="size-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="min-w-0">
            <div className="text-2xl font-bold text-foreground font-mono truncate" title={`${kpis.pendingApprovals} Records`}>
              {kpis.pendingApprovals} Records
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate" title={kpis.pendingApprovals === 0 ? "All records reviewed" : "Awaiting verifier approval"}>
              {kpis.pendingApprovals === 0 ? "All records reviewed" : "Awaiting verifier approval"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Grid: Branch Balances & Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-7">
        {/* Branch Overview (4 cols) */}
        <Card className="lg:col-span-4 border-border bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Active Branches & Shops</CardTitle>
              <CardDescription>Live ledger balances and assigned officer coverage</CardDescription>
            </div>
            <Button render={<Link href="/dashboard/admin/shops" />} variant="ghost" size="sm" className="gap-1 text-xs">
              View All <ArrowRightIcon className="size-3.5" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {shops.slice(0, 6).map((shop: any) => (
                <div
                  key={shop._id}
                  className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/20 p-3 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-xs uppercase">
                      {shop.code}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-foreground">{shop.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {shop.staffCount} Officer{shop.staffCount !== 1 ? "s" : ""} assigned • {shop.recordsCount} records
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-bold ${shop.currentBalance >= 0 ? "text-chart-2" : "text-destructive"}`}>
                      LKR {Number(shop.currentBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-[11px] text-muted-foreground">Current Balance</div>
                  </div>
                </div>
              ))}
              {shops.length === 0 && (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  No shops configured yet. Add your first branch in Shops.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Financial Transactions (3 cols) */}
        <Card className="lg:col-span-3 border-border bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Latest Transactions</CardTitle>
              <CardDescription>Most recent ledger entries across branches</CardDescription>
            </div>
            <Button render={<Link href="/dashboard/admin/summary" />} variant="ghost" size="sm" className="gap-1 text-xs">
              Reports <ArrowRightIcon className="size-3.5" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentRecords.map((rec: any) => (
                <div
                  key={rec._id}
                  className="flex flex-col gap-1.5 rounded-lg border border-border/70 bg-card p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-primary">
                      {rec.billNumber}
                    </span>
                    <StatusBadge status={rec.status} />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground truncate max-w-[160px]">
                      {rec.reason}
                    </span>
                    <span className={`font-semibold ${rec.type === "INCOME" ? "text-chart-2" : "text-foreground"}`}>
                      {rec.type === "INCOME" ? "+" : "-"} LKR {Number(rec.amount).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                    <span>{rec.shop?.name || "Unknown Shop"}</span>
                    <span>{new Date(rec.date).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
              {recentRecords.length === 0 && (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  No transaction records found.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
