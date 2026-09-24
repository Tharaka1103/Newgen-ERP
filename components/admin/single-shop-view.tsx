"use client";

import * as React from "react";
import Link from "next/link";
import { getSummaryAnalyticsAction } from "@/actions/reports";
import { getShopDetailsAction } from "@/actions/shops";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { CategoryBadge } from "@/components/shared/category-badge";
import { DataTable } from "@/components/shared/data-table";
import { ColumnDef } from "@tanstack/react-table";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  ArrowLeftIcon,
  DownloadIcon,
  RefreshCwIcon,
  Building2Icon,
  UsersIcon,
  MapPinIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  ClockIcon,
  CheckCircle2Icon,
  ReceiptIcon,
  PhoneIcon,
  MailIcon,
  CalendarIcon,
  WalletIcon,
  DollarSignIcon,
  CheckCheckIcon,
} from "lucide-react";
import { toast } from "@/components/ui/toast";

interface AssignedStaff {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  lastLoginAt?: string;
}

interface SingleShopViewProps {
  initialShop: {
    _id: string;
    name: string;
    code: string;
    description?: string;
    address?: string;
    isActive: boolean;
  };
  initialStaff: AssignedStaff[];
  initialStats: {
    recordsCount: number;
    pendingCount: number;
    approvedCount: number;
    currentBalance: number;
  };
}

export function SingleShopView({
  initialShop,
  initialStaff,
  initialStats,
}: SingleShopViewProps) {
  const [period, setPeriod] = React.useState<"today" | "week" | "month" | "year" | "custom">("month");
  const [startDate, setStartDate] = React.useState<string>("");
  const [endDate, setEndDate] = React.useState<string>("");
  const [loading, setLoading] = React.useState<boolean>(false);

  const [shop, setShop] = React.useState(initialShop);
  const [staff, setStaff] = React.useState<AssignedStaff[]>(initialStaff);
  const [stats, setStats] = React.useState(initialStats);

  const [analytics, setAnalytics] = React.useState<{
    kpis: {
      totalTransactions: number;
      totalExpense: number;
      totalIncome: number;
      pendingApprovals: number;
      approvedAmount: number;
      rejectedAmount: number;
      netBalance: number;
    };
    timelineData: Array<{ date: string; income: number; expense: number }>;
    categoryBreakdownData: Array<{ category: string; colorToken: string; total: number; type: string }>;
    records: Array<any>;
  }>({
    kpis: {
      totalTransactions: 0,
      totalExpense: 0,
      totalIncome: 0,
      pendingApprovals: 0,
      approvedAmount: 0,
      rejectedAmount: 0,
      netBalance: 0,
    },
    timelineData: [],
    categoryBreakdownData: [],
    records: [],
  });

  const fetchShopData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [analyticsRes, shopRes] = await Promise.all([
        getSummaryAnalyticsAction({
          period,
          startDate: period === "custom" ? startDate : undefined,
          endDate: period === "custom" ? endDate : undefined,
          shopId: shop._id,
        }),
        getShopDetailsAction(shop._id),
      ]);

      if (analyticsRes.success && analyticsRes.kpis) {
        setAnalytics({
          kpis: analyticsRes.kpis,
          timelineData: analyticsRes.timelineData || [],
          categoryBreakdownData: analyticsRes.categoryBreakdownData || [],
          records: analyticsRes.records || [],
        });
      }

      if (shopRes.success && shopRes.shop) {
        setShop(shopRes.shop);
        setStaff(shopRes.assignedStaff || []);
        if (shopRes.stats) {
          setStats(shopRes.stats);
        }
      }
    } catch (err) {
      console.error("Failed to load shop analytics:", err);
      toast.create({
        title: "Error loading analytics",
        description: "Failed to connect to branch records server.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [period, startDate, endDate, shop._id]);

  React.useEffect(() => {
    fetchShopData();
  }, [fetchShopData]);

  // Export to CSV Function
  const exportCSV = () => {
    if (!analytics.records.length) {
      toast.create({
        title: "No records to export",
        description: "There is no ledger data matching the active filters for this branch.",
        type: "warning",
      });
      return;
    }

    const headers = [
      "Date",
      "Branch",
      "Bill Number",
      "Payment Method",
      "Category",
      "Type",
      "Reason",
      "Submitted Amount",
      "Status",
      "Approved Amount",
      "Running Balance",
    ];

    const rows = analytics.records.map((r) => [
      `"${new Date(r.date).toISOString().split("T")[0]}"`,
      `"${shop.name}"`,
      `"${r.billNumber || ""}"`,
      `"${r.paymentMethod || ""}"`,
      `"${r.category?.name || ""}"`,
      `"${r.type || ""}"`,
      `"${(r.reason || "").replace(/"/g, '""')}"`,
      r.amount,
      `"${r.status}"`,
      r.approvedAmount ?? "",
      r.runningBalance ?? "",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `${shop.code}_Financial_Summary_${period}_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.create({
      title: "Export complete",
      description: `Downloaded ${analytics.records.length} records for ${shop.name} in CSV format.`,
      type: "success",
    });
  };

  // Table Columns
  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => {
        const d = new Date(row.original.date);
        return <span className="font-mono text-xs">{d.toLocaleDateString()}</span>;
      },
    },
    {
      accessorKey: "billNumber",
      header: "Bill No",
      cell: ({ row }) => (
        <span className="font-mono text-xs font-semibold text-primary">
          {row.original.billNumber}
        </span>
      ),
    },
    {
      accessorKey: "category.name",
      header: "Category",
      cell: ({ row }) => (
        <div className="max-w-[180px] min-w-0">
          <CategoryBadge
            name={row.original.category?.name || "Uncategorized"}
            colorToken={row.original.category?.colorToken}
          />
        </div>
      ),
    },
    {
      accessorKey: "paymentMethod",
      header: "Method",
      cell: ({ row }) => (
        <span className="text-xs uppercase font-mono text-muted-foreground">
          {row.original.paymentMethod}
        </span>
      ),
    },
    {
      accessorKey: "reason",
      header: "Reason / Notes",
      cell: ({ row }) => (
        <span className="truncate max-w-[200px] text-xs block text-muted-foreground">
          {row.original.reason}
        </span>
      ),
    },
    {
      accessorKey: "amount",
      header: "Amount (LKR)",
      cell: ({ row }) => {
        const isIncome = row.original.type === "INCOME";
        return (
          <span className={`font-semibold text-xs font-mono ${isIncome ? "text-chart-2" : "text-foreground"}`}>
            {isIncome ? "+" : "-"} {Number(row.original.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "runningBalance",
      header: "Balance (LKR)",
      cell: ({ row }) => {
        const bal = row.original.runningBalance || 0;
        return (
          <span className={`font-mono text-xs font-semibold ${bal >= 0 ? "text-chart-2" : "text-destructive"}`}>
            {Number(bal).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        );
      },
    },
  ];

  const lineChartConfig: ChartConfig = {
    income: {
      label: "Inflows (Income)",
      color: "var(--chart-2)",
    },
    expense: {
      label: "Outflows (Expense)",
      color: "var(--chart-1)",
    },
  };

  const barChartConfig: ChartConfig = {
    income: {
      label: "Inflows",
      color: "var(--chart-2)",
    },
    expense: {
      label: "Outflows",
      color: "var(--chart-1)",
    },
  };

  return (
    <div className="space-y-6">
      {/* Top Navigation & Shop Profile Header */}
      <div className="flex flex-col gap-4">
        <div>
          <Button
            render={<Link href="/dashboard/admin/shops" />}
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground pl-0"
          >
            <ArrowLeftIcon className="size-3.5" />
            Back to All Branches
          </Button>
        </div>

        <div className="flex flex-col justify-between gap-4 rounded-xl border border-border bg-card p-5 shadow-sm md:flex-row md:items-center">
          <div className="flex items-start gap-4 min-w-0">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-base shadow-sm">
              {shop.code}
            </div>
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-foreground tracking-tight truncate">
                  {shop.name}
                </h1>
                <Badge
                  variant={shop.isActive ? "outline" : "destructive"}
                  className={`text-[10px] ${shop.isActive ? "border-chart-2/40 bg-chart-2/15 text-foreground" : ""}`}
                >
                  {shop.isActive ? "Operational" : "Closed"}
                </Badge>
                <span className="font-mono text-xs text-muted-foreground rounded bg-muted px-2 py-0.5 border border-border">
                  Code: {shop.code}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPinIcon className="size-3.5" />
                  {shop.address || "No address specified"}
                </span>
                <span className="flex items-center gap-1">
                  <UsersIcon className="size-3.5" />
                  {staff.length} Officer{staff.length !== 1 ? "s" : ""} Assigned
                </span>
                <span className="flex items-center gap-1">
                  <ReceiptIcon className="size-3.5" />
                  {stats.recordsCount} Total Lifetime Entries
                </span>
              </div>
              {shop.description && (
                <p className="text-xs text-muted-foreground pt-0.5 line-clamp-1">
                  {shop.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:items-end justify-center shrink-0 border-t border-border pt-3 md:border-t-0 md:pt-0">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Branch Ledger Balance
            </div>
            <div
              className={`text-2xl font-bold font-mono ${stats.currentBalance >= 0 ? "text-chart-2" : "text-destructive"}`}
            >
              LKR {Number(stats.currentBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-muted-foreground">Sequential running balance</span>
          </div>
        </div>
      </div>

      {/* Filter and Period Selector (Day, Week, Month, Year, Custom Range) */}
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <Tabs
            value={period}
            onValueChange={(val: any) => setPeriod(val)}
            className="w-auto"
          >
            <TabsList className="bg-muted">
              <TabsTrigger value="today" className="text-xs">
                Day (Today)
              </TabsTrigger>
              <TabsTrigger value="week" className="text-xs">
                Week
              </TabsTrigger>
              <TabsTrigger value="month" className="text-xs">
                Month
              </TabsTrigger>
              <TabsTrigger value="year" className="text-xs">
                Year
              </TabsTrigger>
              <TabsTrigger value="custom" className="text-xs">
                Custom Range
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {period === "custom" && (
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 w-36 text-xs"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9 w-36 text-xs"
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchShopData}
            disabled={loading}
            className="gap-1.5 text-xs"
          >
            <RefreshCwIcon className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={exportCSV}
            className="gap-1.5 text-xs"
          >
            <DownloadIcon className="size-3.5" />
            Export Branch CSV
          </Button>
        </div>
      </div>

      {/* Branch Financial KPI Cards */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        <Card className="border-border bg-card shadow-sm p-3.5 col-span-1 min-w-0 overflow-hidden">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate" title="Transactions in Period">
            Transactions
          </div>
          <div className="text-xl font-bold mt-1 text-foreground truncate font-mono" title={String(analytics.kpis.totalTransactions)}>
            {analytics.kpis.totalTransactions}
          </div>
          <div className="text-[10px] text-muted-foreground truncate" title="Recorded in range">
            In selected period
          </div>
        </Card>

        <Card className="border-border bg-card shadow-sm p-3.5 col-span-1 min-w-0 overflow-hidden">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate" title="Total Inflow">
            Total Inflow
          </div>
          <div className="text-xl font-bold mt-1 text-chart-2 truncate font-mono" title={`LKR ${analytics.kpis.totalIncome.toLocaleString()}`}>
            LKR {analytics.kpis.totalIncome.toLocaleString()}
          </div>
          <div className="text-[10px] text-muted-foreground truncate" title="Collections & fees">
            Collections & fees
          </div>
        </Card>

        <Card className="border-border bg-card shadow-sm p-3.5 col-span-1 min-w-0 overflow-hidden">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate" title="Total Outflow">
            Total Outflow
          </div>
          <div className="text-xl font-bold mt-1 text-foreground truncate font-mono" title={`LKR ${analytics.kpis.totalExpense.toLocaleString()}`}>
            LKR {analytics.kpis.totalExpense.toLocaleString()}
          </div>
          <div className="text-[10px] text-muted-foreground truncate" title="Branch expenses">
            Branch expenses
          </div>
        </Card>

        <Card className="border-border bg-card shadow-sm p-3.5 col-span-1 min-w-0 overflow-hidden">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate" title="Net Period Flow">
            Net Period Flow
          </div>
          <div
            className={`text-xl font-bold mt-1 truncate font-mono ${analytics.kpis.netBalance >= 0 ? "text-chart-2" : "text-destructive"}`}
            title={`LKR ${analytics.kpis.netBalance.toLocaleString()}`}
          >
            LKR {analytics.kpis.netBalance.toLocaleString()}
          </div>
          <div className="text-[10px] text-muted-foreground truncate" title="Inflows minus Outflows">
            Inflows minus Outflows
          </div>
        </Card>

        <Card className="border-border bg-card shadow-sm p-3.5 col-span-1 min-w-0 overflow-hidden">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate" title="Pending Approvals">
            Pending
          </div>
          <div className="text-xl font-bold mt-1 text-warning truncate font-mono" title={String(analytics.kpis.pendingApprovals)}>
            {analytics.kpis.pendingApprovals}
          </div>
          <div className="text-[10px] text-muted-foreground truncate" title="Awaiting verifier review">
            Awaiting verifier
          </div>
        </Card>

        <Card className="border-border bg-card shadow-sm p-3.5 col-span-1 min-w-0 overflow-hidden">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate" title="Approved Value">
            Approved Value
          </div>
          <div className="text-xl font-bold mt-1 text-chart-2 truncate font-mono" title={`LKR ${analytics.kpis.approvedAmount.toLocaleString()}`}>
            LKR {analytics.kpis.approvedAmount.toLocaleString()}
          </div>
          <div className="text-[10px] text-muted-foreground truncate" title="Finalized capital">
            Finalized capital
          </div>
        </Card>

        <Card className="border-border bg-card shadow-sm p-3.5 col-span-1 min-w-0 overflow-hidden">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate" title="Rejected Value">
            Rejected Value
          </div>
          <div className="text-xl font-bold mt-1 text-destructive truncate font-mono" title={`LKR ${analytics.kpis.rejectedAmount.toLocaleString()}`}>
            LKR {analytics.kpis.rejectedAmount.toLocaleString()}
          </div>
          <div className="text-[10px] text-muted-foreground truncate" title="Declined submissions">
            Declined requests
          </div>
        </Card>
      </div>

      {/* Analytics Charts (Line chart for trajectory & Bar chart for volume) */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Cash Flow Trajectory */}
        <Card className="border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Cash Flow Trajectory</CardTitle>
            <CardDescription>
              Chronological progression of inflows vs outflows for {shop.name}
            </CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {analytics.timelineData.length > 0 ? (
              <ChartContainer config={lineChartConfig} className="h-full w-full">
                <LineChart data={analytics.timelineData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    className="text-[10px] fill-muted-foreground"
                    tickFormatter={(val) => {
                      if (val.includes("(")) return val.split(" ")[1]?.replace(/[()]/g, "") || val;
                      return val.slice(5);
                    }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    className="text-[10px] fill-muted-foreground"
                    tickFormatter={(val) => `${val / 1000}k`}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="income"
                    stroke="var(--color-chart-2)"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "var(--color-chart-2)" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="expense"
                    stroke="var(--color-chart-1)"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "var(--color-chart-1)" }}
                  />
                </LineChart>
              </ChartContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                No time-series transactions recorded for {shop.name} in this period.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Inflow vs Outflow Volume Comparison */}
        <Card className="border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Cash Flow Volume</CardTitle>
            <CardDescription>
              Period total inflows vs operational expenses breakdown
            </CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {analytics.timelineData.length > 0 ? (
              <ChartContainer config={barChartConfig} className="h-full w-full">
                <BarChart data={analytics.timelineData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    className="text-[10px] fill-muted-foreground"
                    tickFormatter={(val) => {
                      if (val.includes("(")) return val.split(" ")[1]?.replace(/[()]/g, "") || val;
                      return val.slice(5);
                    }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    className="text-[10px] fill-muted-foreground"
                    tickFormatter={(val) => `${val / 1000}k`}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="income" fill="var(--color-chart-2)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                No transaction volume recorded in this period.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Category Spending Breakdown for this shop */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Expense & Income by Category</CardTitle>
          <CardDescription>Financial volume breakdown across managed categories for {shop.name}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {analytics.categoryBreakdownData.map((cat) => (
              <div
                key={cat.category}
                className="flex flex-col justify-between rounded-xl border border-border/70 bg-card p-3.5 shadow-sm min-w-0 overflow-hidden"
              >
                <div className="flex items-center justify-between gap-2 mb-2.5 min-w-0">
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <CategoryBadge name={cat.category} colorToken={cat.colorToken} className="max-w-full" />
                  </div>
                  <span
                    className={`shrink-0 text-[10px] uppercase font-mono px-2 py-0.5 rounded font-semibold border ${
                      cat.type === "INCOME"
                        ? "bg-chart-2/15 text-chart-2 border-chart-2/30"
                        : "bg-muted text-muted-foreground border-border/60"
                    }`}
                  >
                    {cat.type}
                  </span>
                </div>
                <div
                  className="text-base font-bold text-foreground font-mono truncate"
                  title={`LKR ${cat.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                >
                  LKR {cat.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>
            ))}
            {analytics.categoryBreakdownData.length === 0 && (
              <div className="col-span-full py-8 text-center text-xs text-muted-foreground">
                No category transactions recorded for this branch in this period.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabbed Section: Ledger Transactions & Assigned Officers */}
      <div className="space-y-4">
        <Tabs defaultValue="ledger" className="w-full">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <TabsList className="bg-muted">
              <TabsTrigger value="ledger" className="text-xs gap-1.5">
                <ReceiptIcon className="size-3.5" />
                Branch Ledger ({analytics.records.length})
              </TabsTrigger>
              <TabsTrigger value="staff" className="text-xs gap-1.5">
                <UsersIcon className="size-3.5" />
                Assigned Officers ({staff.length})
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Ledger Table Tab */}
          <TabsContent value="ledger" className="pt-4">
            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Branch Ledger Transactions</CardTitle>
                <CardDescription>
                  Chronological financial ledger entries recorded specifically for {shop.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={columns}
                  data={analytics.records}
                  searchKey="billNumber"
                  searchPlaceholder="Search by bill number..."
                  loading={loading}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Assigned Staff Tab */}
          <TabsContent value="staff" className="pt-4">
            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Assigned Finance Personnel</CardTitle>
                <CardDescription>
                  Active officers authorized to enter and submit daily expenses for {shop.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {staff.map((member) => (
                    <div
                      key={member._id}
                      className="rounded-xl border border-border/70 bg-card p-4 space-y-2 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs uppercase">
                            {member.name.charAt(0)}
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-foreground">{member.name}</div>
                            <div className="text-[10px] text-muted-foreground">{member.role}</div>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10px] uppercase font-mono">
                          Active
                        </Badge>
                      </div>

                      <div className="space-y-1 text-xs pt-1 border-t border-border/50 text-muted-foreground">
                        <div className="flex items-center gap-1.5 truncate">
                          <MailIcon className="size-3 text-muted-foreground" />
                          <span className="truncate">{member.email}</span>
                        </div>
                        {member.phone && (
                          <div className="flex items-center gap-1.5">
                            <PhoneIcon className="size-3 text-muted-foreground" />
                            <span>{member.phone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/80">
                          <ClockIcon className="size-3" />
                          <span>
                            {member.lastLoginAt
                              ? `Last active: ${new Date(member.lastLoginAt).toLocaleDateString()}`
                              : "No recent session"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {staff.length === 0 && (
                    <div className="col-span-full py-8 text-center text-xs text-muted-foreground">
                      No staff members are currently assigned to this branch. Go to User Management to assign officers.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
