"use client";

import * as React from "react";
import {
  getBankAccountsSummaryAction,
  createBankAccountAction,
  updateBankAccountAction,
  bankDepositWithdrawAction,
  deleteBankAccountAction,
} from "@/actions/bankAccounts";
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
  LandmarkIcon,
  DownloadIcon,
  RefreshCwIcon,
  PlusCircleIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  CreditCardIcon,
  EditIcon,
  ArrowLeftRightIcon,
  Loader2Icon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "@/components/ui/toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createBankAccountSchema,
  updateBankAccountSchema,
  bankDepositWithdrawSchema,
  CreateBankAccountInput,
  UpdateBankAccountInput,
  BankDepositWithdrawInput,
} from "@/schemas/bankAccount";

interface BankAccountItem {
  _id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  branch?: string;
  currentBalance: number;
  isActive: boolean;
}

interface BankAccountsViewProps {
  initialTotalBankCapital: number;
  initialPeriodInflow: number;
  initialPeriodOutflow: number;
  initialAccounts: BankAccountItem[];
  initialRecords: any[];
  initialTimelineData: Array<{ date: string; income: number; expense: number }>;
}

export function BankAccountsView({
  initialTotalBankCapital,
  initialPeriodInflow,
  initialPeriodOutflow,
  initialAccounts,
  initialRecords,
  initialTimelineData,
}: BankAccountsViewProps) {
  const [period, setPeriod] = React.useState<"today" | "week" | "month" | "year" | "custom">("month");
  const [selectedAccountId, setSelectedAccountId] = React.useState<string>("ALL");
  const [startDate, setStartDate] = React.useState<string>("");
  const [endDate, setEndDate] = React.useState<string>("");
  const [loading, setLoading] = React.useState(false);

  const [totalCapital, setTotalCapital] = React.useState(initialTotalBankCapital);
  const [periodInflow, setPeriodInflow] = React.useState(initialPeriodInflow);
  const [periodOutflow, setPeriodOutflow] = React.useState(initialPeriodOutflow);
  const [accounts, setAccounts] = React.useState<BankAccountItem[]>(initialAccounts);
  const [records, setRecords] = React.useState(initialRecords);
  const [timelineData, setTimelineData] = React.useState(initialTimelineData);

  // Modals
  const [createAccountOpen, setCreateAccountOpen] = React.useState(false);
  const [editAccountOpen, setEditAccountOpen] = React.useState(false);
  const [depositWithdrawOpen, setDepositWithdrawOpen] = React.useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = React.useState(false);
  const [targetAccount, setTargetAccount] = React.useState<BankAccountItem | null>(null);
  const [accountToDelete, setAccountToDelete] = React.useState<BankAccountItem | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const createForm = useForm<CreateBankAccountInput>({
    resolver: zodResolver(createBankAccountSchema),
    defaultValues: {
      bankName: "",
      accountName: "",
      accountNumber: "",
      branch: "",
      initialBalance: 0,
    },
  });

  const editForm = useForm<UpdateBankAccountInput>({
    resolver: zodResolver(updateBankAccountSchema),
    defaultValues: {
      bankName: "",
      accountName: "",
      accountNumber: "",
      branch: "",
      isActive: true,
    },
  });

  const dwForm = useForm<BankDepositWithdrawInput>({
    resolver: zodResolver(bankDepositWithdrawSchema),
    defaultValues: {
      accountId: "",
      type: "DEPOSIT",
      amount: 50000,
      referenceNumber: "",
      reason: "",
      date: new Date().toISOString().split("T")[0],
    },
  });

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await getBankAccountsSummaryAction({
        accountId: selectedAccountId,
        period,
        startDate: period === "custom" ? startDate : undefined,
        endDate: period === "custom" ? endDate : undefined,
      });

      if (res.success) {
        setTotalCapital(res.totalBankCapital || 0);
        setPeriodInflow(res.periodInflow || 0);
        setPeriodOutflow(res.periodOutflow || 0);
        setAccounts(res.accounts || []);
        setRecords(res.records || []);
        setTimelineData(res.timelineData || []);
      }
    } catch (err) {
      console.error(err);
      toast.create({
        title: "Error fetching data",
        description: "Failed to load bank accounts summary",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [period, selectedAccountId, startDate, endDate]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onCreateAccount = async (data: CreateBankAccountInput) => {
    try {
      const res = await createBankAccountAction(data);
      if (res.success) {
        toast.create({
          title: "Bank Account Created",
          description: "New bank account added successfully",
          type: "success",
        });
        setCreateAccountOpen(false);
        createForm.reset();
        fetchData();
      } else {
        toast.create({
          title: "Creation Failed",
          description: res.error || "Failed to create account",
          type: "error",
        });
      }
    } catch {
      toast.create({ title: "Error", description: "An error occurred", type: "error" });
    }
  };

  const onEditAccount = async (data: UpdateBankAccountInput) => {
    if (!targetAccount) return;
    try {
      const res = await updateBankAccountAction(targetAccount._id, data);
      if (res.success) {
        toast.create({
          title: "Bank Account Updated",
          description: "Bank account details saved successfully",
          type: "success",
        });
        setEditAccountOpen(false);
        fetchData();
      } else {
        toast.create({
          title: "Update Failed",
          description: res.error || "Failed to update account",
          type: "error",
        });
      }
    } catch {
      toast.create({ title: "Error", description: "An error occurred", type: "error" });
    }
  };

  const onDepositWithdraw = async (data: BankDepositWithdrawInput) => {
    try {
      const res = await bankDepositWithdrawAction(data);
      if (res.success) {
        toast.create({
          title: "Transaction Processed",
          description: res.message || "Balance updated successfully",
          type: "success",
        });
        setDepositWithdrawOpen(false);
        dwForm.reset();
        fetchData();
      } else {
        toast.create({
          title: "Transaction Failed",
          description: res.error || "Failed to process bank transaction",
          type: "error",
        });
      }
    } catch {
      toast.create({ title: "Error", description: "An error occurred", type: "error" });
    }
  };

  const openDepositWithdrawModal = (acc: BankAccountItem) => {
    setTargetAccount(acc);
    dwForm.reset({
      accountId: acc._id,
      type: "DEPOSIT",
      amount: 10000,
      referenceNumber: "",
      reason: "",
      date: new Date().toISOString().split("T")[0],
    });
    setDepositWithdrawOpen(true);
  };

  const openEditModal = (acc: BankAccountItem) => {
    setTargetAccount(acc);
    editForm.reset({
      bankName: acc.bankName,
      accountName: acc.accountName,
      accountNumber: acc.accountNumber,
      branch: acc.branch || "",
      isActive: acc.isActive,
    });
    setEditAccountOpen(true);
  };

  const openDeleteModal = (acc: BankAccountItem) => {
    setAccountToDelete(acc);
    setDeleteAccountOpen(true);
  };

  const onConfirmDelete = async () => {
    if (!accountToDelete) return;
    setDeleting(true);
    try {
      const res = await deleteBankAccountAction(accountToDelete._id);
      if (res.success) {
        toast.create({
          title: "Bank Account Deleted",
          description: res.message || "Account removed successfully",
          type: "success",
        });
        setDeleteAccountOpen(false);
        setAccountToDelete(null);
        fetchData();
      } else {
        toast.create({
          title: "Deletion Failed",
          description: res.error || "Failed to delete account",
          type: "error",
        });
      }
    } catch {
      toast.create({ title: "Error", description: "An error occurred while deleting", type: "error" });
    } finally {
      setDeleting(false);
    }
  };

  const exportCSV = () => {
    if (!records.length) {
      toast.create({
        title: "No records",
        description: "No bank transactions found to export.",
        type: "warning",
      });
      return;
    }

    const headers = ["Date", "Bank Account", "Account No", "Branch", "Bill Number", "Reason", "Type", "Amount (LKR)", "Status"];
    const rows = records.map((r) => [
      `"${new Date(r.date).toISOString().split("T")[0]}"`,
      `"${r.bankAccount?.bankName || ""}"`,
      `"${r.bankAccount?.accountNumber || ""}"`,
      `"${r.shop?.name || ""}"`,
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
    link.setAttribute("download", `Bank_Transactions_${period}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.create({
      title: "Export complete",
      description: `Downloaded ${records.length} bank transactions in CSV format.`,
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
      accessorKey: "bankAccount.bankName",
      header: "Bank Account",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-semibold text-xs text-foreground">
            {row.original.bankAccount?.bankName || "Unassigned Bank"}
          </span>
          <span className="font-mono text-[10px] text-muted-foreground">
            {row.original.bankAccount?.accountNumber || ""}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "shop.name",
      header: "Branch",
      cell: ({ row }) => (
        <span className="font-medium text-xs text-foreground">
          {row.original.shop?.name || "-"}
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
      header: "Reason / Notes",
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
    income: { label: "Bank Inflows", color: "var(--chart-2)" },
    expense: { label: "Bank Outflows", color: "var(--chart-1)" },
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col justify-between gap-4 rounded-xl border border-border bg-card p-5 shadow-sm md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <LandmarkIcon className="size-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Bank Accounts Management
            </h1>
            <p className="text-xs text-muted-foreground">
              Manage organization bank accounts, direct cash deposits/withdrawals, and verification records
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              createForm.reset({
                bankName: "",
                accountName: "",
                accountNumber: "",
                branch: "",
                initialBalance: 0,
              });
              setCreateAccountOpen(true);
            }}
            size="sm"
            className="gap-1.5 text-xs"
          >
            <PlusCircleIcon className="size-3.5" />
            Add Bank Account
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border bg-card p-4 shadow-sm">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Total Bank Capital
          </div>
          <div className="text-2xl font-bold font-mono mt-1 text-chart-2">
            LKR {Number(totalCapital || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            Combined active bank holdings
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
            Collections & bank transfers in
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
            Bank disbursements & withdrawals
          </div>
        </Card>

        <Card className="border-border bg-card p-4 shadow-sm">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Net Bank Flow
          </div>
          <div className={`text-2xl font-bold font-mono mt-1 ${(periodInflow - periodOutflow) >= 0 ? "text-chart-2" : "text-destructive"}`}>
            LKR {Number(periodInflow - periodOutflow).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            Net capital change in range
          </div>
        </Card>
      </div>

      {/* Bank Accounts Cards Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Registered Bank Accounts</h2>
            <p className="text-xs text-muted-foreground">
              Select any account to view isolated flows or record cash movements
            </p>
          </div>
          <Badge variant="outline" className="text-xs font-mono">
            {accounts.length} Account{accounts.length !== 1 ? "s" : ""}
          </Badge>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((acc) => (
            <div
              key={acc._id}
              className="flex flex-col justify-between rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:border-primary/40"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">{acc.bankName}</h3>
                    <p className="font-mono text-xs text-muted-foreground">{acc.accountNumber}</p>
                  </div>
                  <Badge
                    variant={acc.isActive ? "outline" : "destructive"}
                    className={`text-[10px] ${acc.isActive ? "border-chart-2/40 bg-chart-2/15 text-foreground" : ""}`}
                  >
                    {acc.isActive ? "Active" : "Closed"}
                  </Badge>
                </div>

                <div className="text-xs text-muted-foreground space-y-0.5">
                  <p className="truncate">Title: <span className="text-foreground font-medium">{acc.accountName}</span></p>
                  {acc.branch && <p>Branch: <span className="text-foreground font-medium">{acc.branch}</span></p>}
                </div>
              </div>

              <div className="pt-4 border-t border-border mt-3 flex items-end justify-between">
                <div>
                  <div className="text-[10px] uppercase font-semibold text-muted-foreground">Current Balance</div>
                  <div className="font-mono font-bold text-base text-chart-2">
                    LKR {Number(acc.currentBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => openDepositWithdrawModal(acc)}
                    className="gap-1 text-xs"
                    title="Direct Deposit or Withdrawal"
                  >
                    <ArrowLeftRightIcon className="size-3" />
                    <span>In/Out</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => openEditModal(acc)}
                    title="Edit Bank Account"
                  >
                    <EditIcon className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => openDeleteModal(acc)}
                    className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    title="Delete Bank Account"
                  >
                    <Trash2Icon className="size-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {accounts.length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
              No bank accounts registered yet. Click &quot;Add Bank Account&quot; to begin.
            </div>
          )}
        </div>
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

          <Select value={selectedAccountId} onValueChange={(val) => setSelectedAccountId(val || "ALL")}>
            <SelectTrigger className="h-9 w-48 text-xs">
              <SelectValue placeholder="All Bank Accounts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Bank Accounts</SelectItem>
              {accounts.map((a) => (
                <SelectItem key={a._id} value={a._id}>
                  {a.bankName} ({a.accountNumber})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

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
          <CardTitle className="text-base font-semibold">Bank Cash Flow Volume</CardTitle>
          <CardDescription>
            Chronological comparison of bank inflows vs operational disbursements
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
              No bank transactions recorded in this period.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transactions DataTable */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Bank Ledger Transactions</h2>
            <p className="text-xs text-muted-foreground">
              All transactions recorded with payment methods Bank Transfer, Cheque, or Online
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
          searchPlaceholder="Search bank records by reason or description..."
          loading={loading}
        />
      </div>

      {/* CREATE BANK ACCOUNT MODAL */}
      <Dialog open={createAccountOpen} onOpenChange={setCreateAccountOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Register Bank Account</DialogTitle>
            <DialogDescription>
              Add a commercial or savings bank account for organization fund management
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={createForm.handleSubmit(onCreateAccount)} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Bank Name</label>
              <Input placeholder="e.g. Commercial Bank of Ceylon" {...createForm.register("bankName")} className="h-9 text-xs" />
              {createForm.formState.errors.bankName && (
                <p className="text-xs text-destructive">{createForm.formState.errors.bankName.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Account Name / Title</label>
              <Input placeholder="e.g. Newgen Educational Systems" {...createForm.register("accountName")} className="h-9 text-xs" />
              {createForm.formState.errors.accountName && (
                <p className="text-xs text-destructive">{createForm.formState.errors.accountName.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Account Number</label>
              <Input placeholder="e.g. 100012345678" {...createForm.register("accountNumber")} className="h-9 text-xs font-mono" />
              {createForm.formState.errors.accountNumber && (
                <p className="text-xs text-destructive">{createForm.formState.errors.accountNumber.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Bank Branch</label>
              <Input placeholder="e.g. Matale Branch" {...createForm.register("branch")} className="h-9 text-xs" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Initial Opening Balance (LKR)</label>
              <Input
                type="number"
                step="0.01"
                placeholder="0"
                {...createForm.register("initialBalance", { valueAsNumber: true })}
                className="h-9 text-xs font-mono"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setCreateAccountOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={createForm.formState.isSubmitting}>
                {createForm.formState.isSubmitting ? <Loader2Icon className="size-3.5 animate-spin mr-1" /> : null}
                Save Bank Account
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT BANK ACCOUNT MODAL */}
      <Dialog open={editAccountOpen} onOpenChange={setEditAccountOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Bank Account</DialogTitle>
            <DialogDescription>
              Modify bank name, account number, or active status
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={editForm.handleSubmit(onEditAccount)} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Bank Name</label>
              <Input placeholder="Bank Name" {...editForm.register("bankName")} className="h-9 text-xs" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Account Name</label>
              <Input placeholder="Account Name" {...editForm.register("accountName")} className="h-9 text-xs" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Account Number</label>
              <Input placeholder="Account Number" {...editForm.register("accountNumber")} className="h-9 text-xs font-mono" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Bank Branch</label>
              <Input placeholder="Branch" {...editForm.register("branch")} className="h-9 text-xs" />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditAccountOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={editForm.formState.isSubmitting}>
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIRECT DEPOSIT / WITHDRAWAL MODAL */}
      <Dialog open={depositWithdrawOpen} onOpenChange={setDepositWithdrawOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dwForm.watch("type") === "DEPOSIT" ? "Direct Bank Deposit" : "Direct Bank Withdrawal"}
            </DialogTitle>
            <DialogDescription>
              Record an external deposit or cash withdrawal for {targetAccount?.bankName} ({targetAccount?.accountNumber})
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={dwForm.handleSubmit(onDepositWithdraw)} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Transaction Type</label>
              <Select
                value={dwForm.watch("type")}
                onValueChange={(val: any) => dwForm.setValue("type", val)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DEPOSIT">Direct Deposit (Credit to Account)</SelectItem>
                  <SelectItem value="WITHDRAWAL">Direct Withdrawal (Debit from Account)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Amount (LKR)</label>
              <Input
                type="number"
                step="0.01"
                placeholder="50000"
                {...dwForm.register("amount", { valueAsNumber: true })}
                className="h-9 text-xs font-mono"
              />
              {dwForm.formState.errors.amount && (
                <p className="text-xs text-destructive">{dwForm.formState.errors.amount.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Date</label>
              <Input
                type="date"
                {...dwForm.register("date")}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Slip / Cheque / Reference No (Optional)
              </label>
              <Input
                placeholder="e.g. SLIP-88912 / CHQ-1049"
                {...dwForm.register("referenceNumber")}
                className="h-9 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Reason / Description</label>
              <Textarea
                placeholder="e.g. Capital deposit from director / cash sales deposit"
                {...dwForm.register("reason")}
                className="text-xs"
                rows={2}
              />
              {dwForm.formState.errors.reason && (
                <p className="text-xs text-destructive">{dwForm.formState.errors.reason.message}</p>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setDepositWithdrawOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={dwForm.formState.isSubmitting}>
                {dwForm.formState.isSubmitting ? <Loader2Icon className="size-3.5 animate-spin mr-1" /> : null}
                Process Transaction
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION MODAL */}
      <Dialog open={deleteAccountOpen} onOpenChange={setDeleteAccountOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2Icon className="size-5" />
              Delete Bank Account
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this bank account from the system?
            </DialogDescription>
          </DialogHeader>

          {accountToDelete && (
            <div className="space-y-3 py-2 text-xs">
              <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-1">
                <div className="font-semibold text-foreground text-sm">
                  {accountToDelete.bankName}
                </div>
                <div className="font-mono text-muted-foreground">
                  Account No: {accountToDelete.accountNumber}
                </div>
                <div className="text-muted-foreground">
                  Title: {accountToDelete.accountName}
                </div>
                {accountToDelete.branch && (
                  <div className="text-muted-foreground">
                    Branch: {accountToDelete.branch}
                  </div>
                )}
              </div>

              {accountToDelete.currentBalance > 0 && (
                <div className="rounded-lg border border-chart-1/40 bg-chart-1/10 p-3 text-destructive text-xs space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    Notice: Active Balance Remaining
                  </div>
                  <div>
                    Current Balance: <span className="font-mono font-bold text-foreground">LKR {Number(accountToDelete.currentBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Deleting this account will remove it from active operations. Past transaction records will remain safely intact for financial reporting and auditing.
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteAccountOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={onConfirmDelete}
              disabled={deleting}
              className="gap-1.5"
            >
              {deleting ? <Loader2Icon className="size-3.5 animate-spin" /> : <Trash2Icon className="size-3.5" />}
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
