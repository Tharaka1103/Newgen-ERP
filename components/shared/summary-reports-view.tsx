"use client";

import * as React from "react";
import { getSummaryAnalyticsAction } from "@/actions/reports";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  ResponsiveContainer,
} from "recharts";
import {
  DownloadIcon,
  RefreshCwIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  DollarSignIcon,
  ClockIcon,
  CheckCircle2Icon,
  XCircleIcon,
  ReceiptIcon,
  FilterIcon,
} from "lucide-react";
import { toast } from "@/components/ui/toast";

interface ShopOption {
  _id: string;
  name: string;
  code: string;
}

interface SummaryReportsViewProps {
  initialShops: ShopOption[];
  userRole?: string;
  userShopId?: string | null;
}

export function SummaryReportsView({
  initialShops,
  userRole = "ADMIN",
  userShopId,
}: SummaryReportsViewProps) {
  const [period, setPeriod] = React.useState<"today" | "week" | "month" | "custom">("month");
  const [selectedShop, setSelectedShop] = React.useState<string>(userShopId || "ALL");
  const [startDate, setStartDate] = React.useState<string>("");
  const [endDate, setEndDate] = React.useState<string>("");
  const [loading, setLoading] = React.useState<boolean>(false);

  const [data, setData] = React.useState<{
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
    shopComparisonData: Array<{ shop: string; code: string; income: number; expense: number }>;
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
    shopComparisonData: [],
    categoryBreakdownData: [],
    records: [],
  });

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await getSummaryAnalyticsAction({
        period,
        startDate: period === "custom" ? startDate : undefined,
        endDate: period === "custom" ? endDate : undefined,
        shopId: selectedShop,
      });

      if (res.success && res.kpis) {
        setData({
          kpis: res.kpis,
          timelineData: res.timelineData || [],
          shopComparisonData: res.shopComparisonData || [],
          categoryBreakdownData: res.categoryBreakdownData || [],
          records: res.records || [],
        });
      } else {
        toast.create({
          title: "Error loading reports",
          description: res.error || "Failed to load summary",
          type: "error",
        });
      }
    } catch {
      toast.create({
        title: "Connection error",
        description: "Failed to connect to analytics server",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [period, selectedShop, startDate, endDate]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Export to CSV Function
  const exportCSV = () => {
    if (!data.records.length) {
      toast.create({
        title: "No records to export",
        description: "There is no ledger data matching the active filters.",
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

    const rows = data.records.map((r) => [
      `"${new Date(r.date).toISOString().split("T")[0]}"`,
      `"${r.shop?.name || ""}"`,
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
      `Financial_Summary_${period}_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.create({
      title: "Export complete",
      description: `Downloaded ${data.records.length} records in CSV format.`,
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
      accessorKey: "shop.name",
      header: "Branch",
      cell: ({ row }) => (
        <span className="font-medium text-xs text-foreground">
          {row.original.shop?.name || "—"}
        </span>
      ),
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
      accessorKey: "reason",
      header: "Description",
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
      label: "Income",
      color: "var(--chart-2)",
    },
    expense: {
      label: "Expense",
      color: "var(--chart-1)",
    },
  };

  return (
    <div className="space-y-6">
      {/* Filter and Range Controls */}
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <Tabs
            value={period}
            onValueChange={(val: any) => setPeriod(val)}
            className="w-auto"
          >
            <TabsList className="bg-muted">
              <TabsTrigger value="today" className="text-xs">Today</TabsTrigger>
              <TabsTrigger value="week" className="text-xs">This Week</TabsTrigger>
              <TabsTrigger value="month" className="text-xs">This Month</TabsTrigger>
              <TabsTrigger value="custom" className="text-xs">Custom Range</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Shop Selector */}
          {userRole !== "STAFF" && (
            <div className="flex items-center gap-2">
              <FilterIcon className="size-4 text-muted-foreground" />
              <select
                value={selectedShop}
                onChange={(e) => setSelectedShop(e.target.value)}
                className="h-9 rounded-md border border-border bg-card text-foreground px-3 text-xs font-medium outline-none focus:border-ring [color-scheme:light] dark:[color-scheme:dark]"
              >
                <option value="ALL" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
                  All Branches & Shops
                </option>
                {initialShops.map((s) => (
                  <option
                    key={s._id}
                    value={s._id}
                    className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100"
                  >
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>
          )}

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
            onClick={fetchData}
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
            Export CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        <Card className="border-border bg-card shadow-sm p-3.5 col-span-1 min-w-0 overflow-hidden">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate" title="Transactions">
            Transactions
          </div>
          <div className="text-xl font-bold mt-1 text-foreground truncate font-mono" title={String(data.kpis.totalTransactions)}>
            {data.kpis.totalTransactions}
          </div>
          <div className="text-[10px] text-muted-foreground truncate" title="Recorded in range">
            Recorded in range
          </div>
        </Card>

        <Card className="border-border bg-card shadow-sm p-3.5 col-span-1 min-w-0 overflow-hidden">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate" title="Total Inflow">
            Total Inflow
          </div>
          <div className="text-xl font-bold mt-1 text-chart-2 truncate font-mono" title={`LKR ${data.kpis.totalIncome.toLocaleString()}`}>
            LKR {data.kpis.totalIncome.toLocaleString()}
          </div>
          <div className="text-[10px] text-muted-foreground truncate" title="Collections & fees">
            Collections & fees
          </div>
        </Card>

        <Card className="border-border bg-card shadow-sm p-3.5 col-span-1 min-w-0 overflow-hidden">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate" title="Total Outflow">
            Total Outflow
          </div>
          <div className="text-xl font-bold mt-1 text-foreground truncate font-mono" title={`LKR ${data.kpis.totalExpense.toLocaleString()}`}>
            LKR {data.kpis.totalExpense.toLocaleString()}
          </div>
          <div className="text-[10px] text-muted-foreground truncate" title="Operational expense">
            Operational expense
          </div>
        </Card>

        <Card className="border-border bg-card shadow-sm p-3.5 col-span-1 min-w-0 overflow-hidden">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate" title="Net Period Flow">
            Net Period Flow
          </div>
          <div
            className={`text-xl font-bold mt-1 truncate font-mono ${data.kpis.netBalance >= 0 ? "text-chart-2" : "text-destructive"}`}
            title={`LKR ${data.kpis.netBalance.toLocaleString()}`}
          >
            LKR {data.kpis.netBalance.toLocaleString()}
          </div>
          <div className="text-[10px] text-muted-foreground truncate" title="Income minus Expense">
            Income minus Expense
          </div>
        </Card>

        <Card className="border-border bg-card shadow-sm p-3.5 col-span-1 min-w-0 overflow-hidden">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate" title="Pending Approvals">
            Pending
          </div>
          <div className="text-xl font-bold mt-1 text-warning truncate font-mono" title={String(data.kpis.pendingApprovals)}>
            {data.kpis.pendingApprovals}
          </div>
          <div className="text-[10px] text-muted-foreground truncate" title="Awaiting verifier">
            Awaiting verifier
          </div>
        </Card>

        <Card className="border-border bg-card shadow-sm p-3.5 col-span-1 min-w-0 overflow-hidden">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate" title="Approved Value">
            Approved Value
          </div>
          <div className="text-xl font-bold mt-1 text-chart-2 truncate font-mono" title={`LKR ${data.kpis.approvedAmount.toLocaleString()}`}>
            LKR {data.kpis.approvedAmount.toLocaleString()}
          </div>
          <div className="text-[10px] text-muted-foreground truncate" title="Finalized capital">
            Finalized capital
          </div>
        </Card>

        <Card className="border-border bg-card shadow-sm p-3.5 col-span-1 min-w-0 overflow-hidden">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate" title="Rejected Value">
            Rejected Value
          </div>
          <div className="text-xl font-bold mt-1 text-destructive truncate font-mono" title={`LKR ${data.kpis.rejectedAmount.toLocaleString()}`}>
            LKR {data.kpis.rejectedAmount.toLocaleString()}
          </div>
          <div className="text-[10px] text-muted-foreground truncate" title="Declined requests">
            Declined requests
          </div>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Trend of Expense vs Income */}
        <Card className="border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Cash Flow Trajectory</CardTitle>
            <CardDescription>
              Inflows vs Outflows daily chronological progression
            </CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {data.timelineData.length > 0 ? (
              <ChartContainer config={lineChartConfig} className="h-full w-full">
                <LineChart data={data.timelineData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    className="text-[10px] fill-muted-foreground"
                    tickFormatter={(val) => val.slice(5)}
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
                No time-series data available for selected criteria
              </div>
            )}
          </CardContent>
        </Card>

        {/* Branch-Wise Comparison */}
        <Card className="border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Branch Performance Comparison</CardTitle>
            <CardDescription>
              Aggregated income and expenditure breakdown per shop
            </CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {data.shopComparisonData.length > 0 ? (
              <ChartContainer config={barChartConfig} className="h-full w-full">
                <BarChart data={data.shopComparisonData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                  <XAxis
                    dataKey="code"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    className="text-[10px] fill-muted-foreground"
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
                No branch data available for selected criteria
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Category Spending Breakdown */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Expense & Income by Category</CardTitle>
          <CardDescription>Breakdown of organizational volume across managed categories</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.categoryBreakdownData.map((cat) => (
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
            {data.categoryBreakdownData.length === 0 && (
              <div className="col-span-full py-8 text-center text-xs text-muted-foreground">
                No category transactions recorded in this period.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Exportable Ledger Table */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Period Ledger Transactions</CardTitle>
          <CardDescription>
            Comprehensive tabular ledger reflecting all approved, pending, and rejected entries
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={data.records}
            searchKey="billNumber"
            searchPlaceholder="Search by bill number..."
            loading={loading}
          />
        </CardContent>
      </Card>
    </div>
  );
}
