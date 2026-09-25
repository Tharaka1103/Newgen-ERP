"use client";

import * as React from "react";
import {
  getPettyCashSummaryAction,
  topUpWithdrawPettyCashAction,
} from "@/actions/pettyCash";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { DataTable } from "@/components/shared/data-table";
import { ColumnDef } from "@tanstack/react-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  WalletIcon,
  DownloadIcon,
  RefreshCwIcon,
  PlusCircleIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  CalendarIcon,
  Building2Icon,
  Loader2Icon,
} from "lucide-react";
import { toast } from "@/components/ui/toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { pettyCashTransactionSchema, PettyCashTransactionInput } from "@/schemas/pettyCash";

interface PettyCashViewProps {
  initialAccount: {
    _id: string;
    name: string;
    currentBalance: number;
    initialFloat: number;
    lastTopUpAt?: string | null;
    lastTopUpAmount?: number;
  };
  initialPeriodInflow: number;
  initialPeriodOutflow: number;
  initialRecords: any[];
  initialTimelineData: Array<{ date: string; income: number; expense: number }>;
  bankAccounts: Array<{ _id: string; bankName: string; accountNumber: string; currentBalance: number }>;
}

export function PettyCashView({
  initialAccount,
  initialPeriodInflow,
  initialPeriodOutflow,
  initialRecords,
  initialTimelineData,
  bankAccounts,
}: PettyCashViewProps) {
  const [period, setPeriod] = React.useState<"today" | "week" | "month" | "year" | "custom">("month");
  const [startDate, setStartDate] = React.useState<string>("");
  const [endDate, setEndDate] = React.useState<string>("");
  const [loading, setLoading] = React.useState(false);

  const [account, setAccount] = React.useState(initialAccount);
  const [periodInflow, setPeriodInflow] = React.useState(initialPeriodInflow);
  const [periodOutflow, setPeriodOutflow] = React.useState(initialPeriodOutflow);
  const [records, setRecords] = React.useState(initialRecords);
  const [timelineData, setTimelineData] = React.useState(initialTimelineData);

  // Top-Up / Withdrawal Modal
  const [actionOpen, setActionOpen] = React.useState(false);

  const form = useForm<PettyCashTransactionInput>({
    resolver: zodResolver(pettyCashTransactionSchema),
    defaultValues: {
      type: "TOP_UP",
      amount: 10000,
      reason: "",
      date: new Date().toISOString().split("T")[0],
      sourceBankAccount: "",
    },
  });

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPettyCashSummaryAction({
        period,
        startDate: period === "custom" ? startDate : undefined,
        endDate: period === "custom" ? endDate : undefined,
      });

      if (res.success && res.account) {
        setAccount(res.account);
        setPeriodInflow(res.periodInflow || 0);
        setPeriodOutflow(res.periodOutflow || 0);
        setRecords(res.records || []);
        setTimelineData(res.timelineData || []);
      }
    } catch (err) {
      console.error(err);
      toast.create({
        title: "Error fetching data",
        description: "Failed to load petty cash data",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [period, startDate, endDate]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onActionSubmit = async (data: PettyCashTransactionInput) => {
    try {
      const res = await topUpWithdrawPettyCashAction(data);
      if (res.success) {
        toast.create({
          title: "Petty cash updated",
          description: res.message || "Transaction processed successfully",
          type: "success",
        });
        setActionOpen(false);
        form.reset();
        fetchData();
      } else {
        toast.create({
          title: "Transaction failed",
          description: res.error || "Failed to process petty cash update",
          type: "error",
        });
      }
    } catch {
      toast.create({
        title: "Error",
        description: "An unexpected error occurred",
        type: "error",
      });
    }
  };

  const exportCSV = () => {
    if (!records.length) {
      toast.create({
        title: "No records",
        description: "No petty cash records found for export.",
        type: "warning",
      });
      return;
    }

    const headers = ["Date", "Branch / Center", "Bill Number", "Reason", "Type", "Amount (LKR)", "Status"];
    const rows = records.map((r) => [
      `"${new Date(r.date).toISOString().split("T")[0]}"`,
      `"${r.shop?.name || "Global"}"`,
      `"${r.billNumber || ""}"`,
      `"${(r.reason || "").replace(/"/g, '""')}"`,
      `"${r.type}"`,
      r.approvedAmount ?? r.amount,
      `"${r.status}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Petty_Cash_${period}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.create({
      title: "Export complete",
      description: `Downloaded ${records.length} petty cash records in CSV format.`,
      type: "success",
    });
  };

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => (
        <span className="font-mono text-xs">
          {new Date(row.original.date).toLocaleDateString()}
        </span>
      ),
    },
    {
      accessorKey: "shop.name",
      header: "Branch",
      cell: ({ row }) => (
        <span className="font-medium text-xs text-foreground">
          {row.original.shop?.name || "Central Petty Cash"}
        </span>
      ),
    },
    {
      accessorKey: "billNumber",
      header: "Bill No",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-primary font-semibold">
          {row.original.billNumber}
        </span>
      ),
    },
    {
      accessorKey: "reason",
      header: "Description / Reason",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground truncate max-w-xs block">
          {row.original.reason}
        </span>
      ),
    },
    {
      accessorKey: "amount",
      header: "Amount (LKR)",
      cell: ({ row }) => {
        const isIncome = row.original.type === "INCOME";
        const val = row.original.approvedAmount ?? row.original.amount;
        return (
          <span className={`font-mono text-xs font-semibold ${isIncome ? "text-chart-2" : "text-foreground"}`}>
            {isIncome ? "+" : "-"} LKR {Number(val).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
  ];

  const chartConfig: ChartConfig = {
    income: { label: "Petty Inflows", color: "var(--chart-2)" },
    expense: { label: "Petty Outflows", color: "var(--chart-1)" },
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col justify-between gap-4 rounded-xl border border-border bg-card p-5 shadow-sm md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <WalletIcon className="size-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Central Petty Cash Account
            </h1>
            <p className="text-xs text-muted-foreground">
              Manage organization-wide petty cash float, disbursements, and branch expenses
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              form.reset({
                type: "TOP_UP",
                amount: 10000,
                reason: "",
                date: new Date().toISOString().split("T")[0],
                sourceBankAccount: "",
              });
              setActionOpen(true);
            }}
            size="sm"
            className="gap-1.5 text-xs"
          >
            <PlusCircleIcon className="size-3.5" />
            Top-Up / Withdraw Float
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border bg-card p-4 shadow-sm">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Available Petty Cash Float
          </div>
          <div className={`text-2xl font-bold font-mono mt-1 ${account.currentBalance >= 0 ? "text-chart-2" : "text-destructive"}`}>
            LKR {Number(account.currentBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            Active cash on hand balance
          </div>
        </Card>

        <Card className="border-border bg-card p-4 shadow-sm">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Period Total Inflows
          </div>
          <div className="text-2xl font-bold font-mono mt-1 text-chart-2">
            LKR {Number(periodInflow || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            Float replenishments & refunds
          </div>
        </Card>

        <Card className="border-border bg-card p-4 shadow-sm">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Period Total Outflows
          </div>
          <div className="text-2xl font-bold font-mono mt-1 text-foreground">
            LKR {Number(periodOutflow || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            Branch petty cash disbursements
          </div>
        </Card>

        <Card className="border-border bg-card p-4 shadow-sm">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Net Period Flow
          </div>
          <div className={`text-2xl font-bold font-mono mt-1 ${(periodInflow - periodOutflow) >= 0 ? "text-chart-2" : "text-destructive"}`}>
            LKR {Number(periodInflow - periodOutflow).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            Inflows minus outflows in range
          </div>
        </Card>
      </div>

      {/* Filter and Period Selector */}
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <Tabs value={period} onValueChange={(val: any) => setPeriod(val)} className="w-auto">
            <TabsList className="bg-muted">
              <TabsTrigger value="today" className="text-xs">Day (Today)</TabsTrigger>
              <TabsTrigger value="week" className="text-xs">Week</TabsTrigger>
              <TabsTrigger value="month" className="text-xs">Month</TabsTrigger>
              <TabsTrigger value="year" className="text-xs">Year</TabsTrigger>
              <TabsTrigger value="custom" className="text-xs">Custom Range</TabsTrigger>
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

      {/* Chart Section */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Petty Cash Inflow vs Outflow Volume</CardTitle>
          <CardDescription>
            Chronological comparison of petty cash disbursements vs top-ups
          </CardDescription>
        </CardHeader>
        <CardContent className="h-64">
          {timelineData.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-full w-full">
              <BarChart data={timelineData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                <XAxis
                  dataKey="date"
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
              No petty cash activity recorded in the selected period.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transactions DataTable */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Petty Cash Transactions</h2>
            <p className="text-xs text-muted-foreground">
              All transactions recorded with payment method as Petty Cash
            </p>
          </div>
          <Badge variant="outline" className="text-xs font-mono">
            {records.length} Record{records.length !== 1 ? "s" : ""}
          </Badge>
        </div>

        <DataTable
          columns={columns}
          data={records}
          searchKey="reason"
          searchPlaceholder="Search petty cash transactions by reason or description..."
          loading={loading}
        />
      </div>

      {/* TOP-UP / WITHDRAW MODAL */}
      <Dialog open={actionOpen} onOpenChange={setActionOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Petty Cash Float Management</DialogTitle>
            <DialogDescription>
              Replenish (Top-Up) or Withdraw money from the central petty cash fund
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onActionSubmit)} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Action Type</label>
              <Select
                value={form.watch("type")}
                onValueChange={(val: any) => form.setValue("type", val)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TOP_UP">Top-Up (Replenish Petty Cash Float)</SelectItem>
                  <SelectItem value="WITHDRAWAL">Withdrawal (Transfer Out from Float)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Amount (LKR)</label>
              <Input
                type="number"
                step="0.01"
                placeholder="10000"
                {...form.register("amount", { valueAsNumber: true })}
                className="h-9 text-xs font-mono"
              />
              {form.formState.errors.amount && (
                <p className="text-xs text-destructive">{form.formState.errors.amount.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Date</label>
              <Input
                type="date"
                {...form.register("date")}
                className="h-9 text-xs"
              />
            </div>

            {bankAccounts.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">
                  {form.watch("type") === "TOP_UP" ? "Source Bank Account (Optional)" : "Destination Bank Account (Optional)"}
                </label>
                <Select
                  value={form.watch("sourceBankAccount") || "NONE"}
                  onValueChange={(val) => form.setValue("sourceBankAccount", val === "NONE" ? "" : val)}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder={form.watch("type") === "TOP_UP" ? "Select funding bank account (optional)" : "Select deposit bank account (optional)"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">{form.watch("type") === "TOP_UP" ? "Direct Cash / External Float" : "Cash In Hand / External Withdrawal"}</SelectItem>
                    {bankAccounts.map((b) => (
                      <SelectItem key={b._id} value={b._id}>
                        {b.bankName} - {b.accountNumber} (Bal: LKR {b.currentBalance.toLocaleString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">
                  {form.watch("type") === "TOP_UP"
                    ? "If selected, funds will be deducted from the bank account, and transaction records will be created in both Petty Cash and Bank Account ledgers."
                    : "If selected, funds will be credited to the bank account, and transaction records will be created in both Petty Cash and Bank Account ledgers."}
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Reason / Description</label>
              <Textarea
                placeholder="e.g. Month beginning float replenishment"
                {...form.register("reason")}
                className="text-xs"
                rows={2}
              />
              {form.formState.errors.reason && (
                <p className="text-xs text-destructive">{form.formState.errors.reason.message}</p>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setActionOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? <Loader2Icon className="size-3.5 animate-spin mr-1" /> : null}
                Save Transaction
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
