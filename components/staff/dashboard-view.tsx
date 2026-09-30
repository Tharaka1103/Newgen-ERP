"use client";

import * as React from "react";
import { getSummaryAnalyticsAction } from "@/actions/reports";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { CategoryBadge } from "@/components/shared/category-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
  CalendarIcon,
  RefreshCwIcon,
} from "lucide-react";

type Period = "today" | "week" | "month" | "custom";

interface DashboardViewProps {
  initialKpis: {
    totalTransactions: number;
    totalExpense: number;
    totalIncome: number;
    pendingApprovals: number;
    approvedAmount: number;
    rejectedAmount: number;
    netBalance: number;
  };
  initialRecords: any[];
  userShopId: string | null;
  userShopName: string | null;
}

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "custom", label: "Custom" },
];

export function StaffDashboardView({
  initialKpis,
  initialRecords,
  userShopId,
  userShopName,
}: DashboardViewProps) {
  const [period, setPeriod] = React.useState<Period>("today");
  const [customStart, setCustomStart] = React.useState(
    new Date().toISOString().split("T")[0]
  );
  const [customEnd, setCustomEnd] = React.useState(
    new Date().toISOString().split("T")[0]
  );
  const [kpis, setKpis] = React.useState(initialKpis);
  const [recentRecords, setRecentRecords] = React.useState(initialRecords);
  const [loading, setLoading] = React.useState(false);

  const fetchStats = React.useCallback(
    async (p: Period, start?: string, end?: string) => {
      setLoading(true);
      try {
        const res = await getSummaryAnalyticsAction({
          period: p,
          startDate: p === "custom" ? start : undefined,
          endDate: p === "custom" ? end : undefined,
        });
        if (res.success && res.kpis) {
          setKpis(res.kpis);
          const recs = res.records ? [...res.records].reverse().slice(0, 5) : [];
          setRecentRecords(recs);
        }
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Auto-fetch when period changes (except custom — needs explicit apply)
  React.useEffect(() => {
    if (period !== "custom") {
      fetchStats(period);
    }
  }, [period, fetchStats]);

  const periodLabel = PERIOD_OPTIONS.find((p) => p.value === period)?.label ?? "Today";
  const latestBalance = recentRecords.length > 0 ? recentRecords[0].runningBalance || 0 : 0;

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

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
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
          <p className="text-sm text-muted-foreground mt-1">
            Monitor daily branch expenditures, fee collections, and verifier approval queues
          </p>
        </div>
        <Button render={<Link href="/dashboard/staff/finances" />} size="sm" className="gap-1.5 shrink-0">
          <PlusCircleIcon className="size-4" />
          Add Transaction
        </Button>
      </div>

      {/* Period Filter Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-muted border border-border">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPeriod(opt.value)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                period === opt.value
                  ? "bg-card text-foreground shadow-sm border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {period === "custom" && (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <CalendarIcon className="size-3.5 text-muted-foreground" />
              <Input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="h-8 text-xs w-36 font-mono"
              />
            </div>
            <span className="text-xs text-muted-foreground">to</span>
            <Input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="h-8 text-xs w-36 font-mono"
            />
            <Button
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => fetchStats("custom", customStart, customEnd)}
              disabled={loading}
            >
              {loading && <RefreshCwIcon className="size-3 animate-spin mr-1" />}
              Apply
            </Button>
          </div>
        )}

        {loading && period !== "custom" && (
          <RefreshCwIcon className="size-3.5 text-muted-foreground animate-spin" />
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Ledger Balance */}
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
            {loading ? (
              <Skeleton className="h-8 w-32 rounded" />
            ) : (
              <div
                className={`text-2xl font-bold font-mono truncate ${latestBalance >= 0 ? "text-chart-2" : "text-destructive"}`}
              >
                LKR {latestBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1 truncate">Current sequential cash balance</p>
          </CardContent>
        </Card>

        {/* Income */}
        <Card className="border-border bg-card shadow-sm min-w-0 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate">
              {periodLabel} Income
            </CardTitle>
            <div className="rounded-lg bg-chart-2/10 p-2 text-chart-2 shrink-0">
              <TrendingUpIcon className="size-4" />
            </div>
          </CardHeader>
          <CardContent className="min-w-0">
            {loading ? (
              <Skeleton className="h-8 w-32 rounded" />
            ) : (
              <div className="text-2xl font-bold text-foreground font-mono truncate">
                LKR {kpis.totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1 truncate">Course fees &amp; collections</p>
          </CardContent>
        </Card>

        {/* Outflows */}
        <Card className="border-border bg-card shadow-sm min-w-0 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate">
              {periodLabel} Outflows
            </CardTitle>
            <div className="rounded-lg bg-destructive/10 p-2 text-destructive shrink-0">
              <TrendingDownIcon className="size-4" />
            </div>
          </CardHeader>
          <CardContent className="min-w-0">
            {loading ? (
              <Skeleton className="h-8 w-32 rounded" />
            ) : (
              <div className="text-2xl font-bold text-foreground font-mono truncate">
                LKR {kpis.totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1 truncate">Daily petty expenses &amp; bills</p>
          </CardContent>
        </Card>

        {/* Pending Approvals */}
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
            {loading ? (
              <Skeleton className="h-8 w-16 rounded" />
            ) : (
              <div className="text-2xl font-bold text-foreground font-mono truncate">
                {kpis.pendingApprovals}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1 truncate">Entries waiting for verifier review</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Records */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">Recent Branch Transactions</CardTitle>
            <CardDescription>
              Most recently submitted financial logs &mdash; {periodLabel}
            </CardDescription>
          </div>
          <Button render={<Link href="/dashboard/staff/finances" />} variant="ghost" size="sm" className="gap-1 text-xs">
            Open Ledger <ArrowRightIcon className="size-3.5" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {loading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-border/70 p-3 gap-2">
                    <Skeleton className="h-8 w-48 rounded" />
                    <Skeleton className="h-6 w-24 rounded" />
                  </div>
                ))
              : recentRecords.map((rec: any) => (
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
                          {new Date(rec.date).toLocaleDateString()} &bull; {rec.paymentMethod}
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
            {!loading && recentRecords.length === 0 && (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No transactions found for {periodLabel.toLowerCase()}. Click &quot;Add Transaction&quot; to submit your first entry.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
