"use client";

import * as React from "react";
import {
  getAllTransactionsAdminAction,
  adminEditTransactionAction,
  adminDeleteTransactionAction,
} from "@/actions/adminTransactions";
import { DataTable } from "@/components/shared/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { CategoryBadge } from "@/components/shared/category-badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  adminEditFinanceRecordSchema,
  AdminEditFinanceRecordInput,
} from "@/schemas/finance";
import {
  FilterIcon,
  DownloadIcon,
  RefreshCwIcon,
  EditIcon,
  Trash2Icon,
  Loader2Icon,
  SearchIcon,
  Building2Icon,
  WalletIcon,
  LandmarkIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  TagIcon,
  RotateCcwIcon,
  ShieldAlertIcon,
  StoreIcon,
} from "lucide-react";
import { toast } from "@/components/ui/toast";

interface ShopOption {
  _id: string;
  name: string;
  code: string;
  shopType?: string;
}

interface CategoryOption {
  _id: string;
  name: string;
  type: string;
  colorToken?: string;
}

interface BankAccountOption {
  _id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
}

interface AllTransactionsViewProps {
  initialRecords: any[];
  initialTotal: number;
  initialPage: number;
  initialTotalPages: number;
  shops: ShopOption[];
  categories: CategoryOption[];
  bankAccounts: BankAccountOption[];
}

export function AllTransactionsView({
  initialRecords,
  initialTotal,
  initialPage,
  initialTotalPages,
  shops,
  categories,
  bankAccounts,
}: AllTransactionsViewProps) {
  const [records, setRecords] = React.useState<any[]>(initialRecords);
  const [total, setTotal] = React.useState<number>(initialTotal);
  const [page, setPage] = React.useState<number>(initialPage);
  const [totalPages, setTotalPages] = React.useState<number>(initialTotalPages);
  const [loading, setLoading] = React.useState(false);

  // Filters
  const [shopFilter, setShopFilter] = React.useState("ALL");
  const [typeFilter, setTypeFilter] = React.useState("ALL");
  const [paymentMethodFilter, setPaymentMethodFilter] = React.useState("ALL");
  const [bankAccountFilter, setBankAccountFilter] = React.useState("ALL");
  const [categoryFilter, setCategoryFilter] = React.useState("ALL");
  const [statusFilter, setStatusFilter] = React.useState("ALL");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [search, setSearch] = React.useState("");

  // Edit Modal State
  const [editOpen, setEditOpen] = React.useState(false);
  const [editingRecord, setEditingRecord] = React.useState<any | null>(null);

  // Delete Modal State
  const [deleteConfirmRecord, setDeleteConfirmRecord] = React.useState<any | null>(null);
  const [deletionReason, setDeletionReason] = React.useState("");
  const [isDeleting, setIsDeleting] = React.useState(false);

  const editForm = useForm<AdminEditFinanceRecordInput>({
    resolver: zodResolver(adminEditFinanceRecordSchema),
    defaultValues: {
      recordId: "",
      date: "",
      shop: "",
      category: "",
      paymentMethod: "CASH",
      bankAccount: null,
      billNumber: "",
      reason: "",
      amount: 0,
      type: "EXPENSE",
      status: "PENDING",
      approvedAmount: null,
      editReason: "",
    },
  });

  const fetchRecords = async (targetPage = page) => {
    setLoading(true);
    const res = await getAllTransactionsAdminAction({
      shopId: shopFilter !== "ALL" ? shopFilter : undefined,
      type: typeFilter !== "ALL" ? typeFilter : undefined,
      paymentMethod: paymentMethodFilter !== "ALL" ? paymentMethodFilter : undefined,
      bankAccountId: bankAccountFilter !== "ALL" ? bankAccountFilter : undefined,
      categoryId: categoryFilter !== "ALL" ? categoryFilter : undefined,
      status: statusFilter !== "ALL" ? statusFilter : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      search: search.trim() || undefined,
      page: targetPage,
      limit: 25,
    });

    if (res.success && res.records) {
      setRecords(res.records);
      setTotal(res.total || 0);
      setPage(res.page || 1);
      setTotalPages(res.totalPages || 1);
    } else {
      toast.create({
        title: "Failed to load transactions",
        description: res.error || "An error occurred while fetching records",
        type: "error",
      });
    }
    setLoading(false);
  };

  const handleApplyFilters = () => {
    fetchRecords(1);
  };

  const handleClearFilters = () => {
    setShopFilter("ALL");
    setTypeFilter("ALL");
    setPaymentMethodFilter("ALL");
    setBankAccountFilter("ALL");
    setCategoryFilter("ALL");
    setStatusFilter("ALL");
    setStartDate("");
    setEndDate("");
    setSearch("");
    // Re-fetch after state reset
    setTimeout(() => {
      fetchRecords(1);
    }, 50);
  };

  const handleOpenEdit = (rec: any) => {
    setEditingRecord(rec);
    editForm.reset({
      recordId: rec._id,
      date: new Date(rec.date).toISOString().split("T")[0],
      shop: rec.shop?._id || rec.shop,
      category: rec.category?._id || rec.category,
      paymentMethod: rec.paymentMethod || "CASH",
      bankAccount: rec.bankAccount?._id || rec.bankAccount || null,
      billNumber: rec.billNumber || "",
      reason: rec.reason || "",
      amount: Number(rec.amount || 0),
      type: rec.type || "EXPENSE",
      status: rec.status || "PENDING",
      approvedAmount: rec.approvedAmount !== null && rec.approvedAmount !== undefined ? Number(rec.approvedAmount) : null,
      editReason: "",
    });
    setEditOpen(true);
  };

  const onEditSubmit = async (data: AdminEditFinanceRecordInput) => {
    const res = await adminEditTransactionAction(data);
    if (res.success) {
      toast.create({
        title: "Transaction updated",
        description: res.message || "Record successfully updated and balances reconciled.",
        type: "success",
      });
      setEditOpen(false);
      fetchRecords(page);
    } else {
      toast.create({
        title: "Update failed",
        description: res.error || "Failed to update transaction",
        type: "error",
      });
    }
  };

  const handleDeleteSubmit = async () => {
    if (!deleteConfirmRecord) return;
    if (!deletionReason || deletionReason.trim().length < 3) {
      toast.create({
        title: "Reason required",
        description: "Please specify a detailed reason for deleting this transaction.",
        type: "error",
      });
      return;
    }

    setIsDeleting(true);
    const res = await adminDeleteTransactionAction({
      recordId: deleteConfirmRecord._id,
      deletionReason: deletionReason.trim(),
    });

    if (res.success) {
      toast.create({
        title: "Transaction deleted",
        description: res.message || "Transaction deleted and balances recalculated.",
        type: "success",
      });
      setDeleteConfirmRecord(null);
      setDeletionReason("");
      fetchRecords(page);
    } else {
      toast.create({
        title: "Deletion failed",
        description: res.error || "Failed to delete transaction",
        type: "error",
      });
    }
    setIsDeleting(false);
  };

  const handleExportCSV = () => {
    if (records.length === 0) {
      toast.create({
        title: "No records to export",
        description: "There are currently no transactions matching your filter criteria.",
        type: "warning",
      });
      return;
    }

    const headers = [
      "Date",
      "Branch",
      "Branch Type",
      "Bill Number",
      "Category",
      "Type",
      "Payment Method",
      "Bank Account",
      "Reason / Note",
      "Communication Item Code",
      "Communication Item Name",
      "Quantity",
      "Related Branch",
      "Unit Cost (LKR)",
      "Unit Selling Price (LKR)",
      "Discount (LKR)",
      "Net Amount (LKR)",
      "Approved Amount (LKR)",
      "Status",
      "Created By",
      "Reviewed By",
    ];

    const rows = records.map((r) => [
      new Date(r.date).toISOString().split("T")[0],
      r.shop?.name || "N/A",
      r.shop?.shopType || "STANDARD",
      r.billNumber || "",
      r.category?.name || "Uncategorized",
      r.type || "",
      r.paymentMethod || "",
      r.bankAccount ? `${r.bankAccount.bankName} - ${r.bankAccount.accountNumber}` : "",
      r.reason || "",
      r.itemCode || "",
      r.itemName || "",
      r.quantity || 1,
      r.relatedBranch?.name || "",
      r.actualPrice !== undefined ? Number(r.actualPrice).toFixed(2) : "",
      r.sellingPrice !== undefined ? Number(r.sellingPrice).toFixed(2) : "",
      r.discountPrice !== undefined ? Number(r.discountPrice).toFixed(2) : "",
      Number(r.amount || 0).toFixed(2),
      r.approvedAmount !== null && r.approvedAmount !== undefined ? Number(r.approvedAmount).toFixed(2) : "",
      r.status || "",
      r.createdBy?.name || r.createdBy?.email || "Unknown",
      r.reviewedBy?.name || r.reviewedBy?.email || "",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [
        headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(","),
        ...rows.map((row) =>
          row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(",")
        ),
      ].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `all-transactions-report-${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.create({
      title: "CSV Exported",
      description: `Exported ${records.length} transactions successfully.`,
      type: "success",
    });
  };

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => (
        <span className="font-mono text-xs whitespace-nowrap">
          {new Date(row.original.date).toLocaleDateString()}
        </span>
      ),
    },
    {
      accessorKey: "shop.name",
      header: "Branch",
      cell: ({ row }) => {
        const shop = row.original.shop;
        return (
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-foreground">
              {shop?.name || "Unknown Branch"}
            </span>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-[10px] font-mono text-muted-foreground">
                {shop?.code || ""}
              </span>
              {shop?.shopType === "COMMUNICATION" && (
                <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 font-mono">
                  COMM
                </Badge>
              )}
            </div>
          </div>
        );
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
        <div className="max-w-[150px]">
          <CategoryBadge
            name={row.original.category?.name || "Uncategorized"}
            colorToken={row.original.category?.colorToken}
          />
        </div>
      ),
    },
    {
      accessorKey: "paymentMethod",
      header: "Method / Account",
      cell: ({ row }) => {
        const method = row.original.paymentMethod;
        const bank = row.original.bankAccount;
        return (
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              {method === "PETTY_CASH" && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-mono bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                  <WalletIcon className="size-2.5 mr-1" />
                  PETTY CASH
                </Badge>
              )}
              {method === "CASH" && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-mono">
                  CASH
                </Badge>
              )}
              {method !== "PETTY_CASH" && method !== "CASH" && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-mono">
                  {method}
                </Badge>
              )}
            </div>
            {bank && (
              <span className="text-[10px] text-muted-foreground mt-0.5 font-mono truncate max-w-[130px]">
                {bank.bankName} (...{String(bank.accountNumber).slice(-4)})
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "reason",
      header: "Details / Item",
      cell: ({ row }) => {
        const r = row.original;
        const hasCommItem = Boolean(r.itemCode || r.itemName);
        return (
          <div className="max-w-[200px] space-y-0.5">
            {hasCommItem && (
              <div className="flex items-center gap-1">
                <Badge variant="secondary" className="text-[9px] font-mono px-1 py-0 h-3.5">
                  {r.itemCode || "ITEM"}
                </Badge>
                <span className="text-xs font-semibold truncate text-foreground">
                  {r.itemName}
                </span>
                {r.quantity && r.quantity > 1 && (
                  <Badge variant="outline" className="text-[9px] font-mono px-1 py-0 h-3.5 bg-muted">
                    ×{r.quantity}
                  </Badge>
                )}
              </div>
            )}
            <p className="text-xs text-muted-foreground truncate" title={r.reason}>
              {r.reason}
            </p>
            {r.isRelatedToBranch && r.relatedBranch && (
              <span className="inline-flex text-[9px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1 rounded">
                Ref: {r.relatedBranch.name}
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => {
        const isIncome = row.original.type === "INCOME";
        return (
          <span
            className={`inline-flex items-center gap-1 text-xs font-semibold ${
              isIncome
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {isIncome ? <ArrowDownIcon className="size-3" /> : <ArrowUpIcon className="size-3" />}
            {isIncome ? "Income" : "Expense"}
          </span>
        );
      },
    },
    {
      accessorKey: "amount",
      header: "Amount (LKR)",
      cell: ({ row }) => {
        const amt = Number(row.original.amount || 0);
        const appAmt = row.original.approvedAmount;
        const hasDiff = appAmt !== null && appAmt !== undefined && appAmt !== amt;

        return (
          <div className="flex flex-col text-right">
            <span className="font-mono text-xs font-semibold">
              {amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            {hasDiff && (
              <span className="text-[10px] font-mono text-muted-foreground">
                Appr: {Number(appAmt).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const rec = row.original;
        return (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleOpenEdit(rec)}
              className="size-7 p-0 text-muted-foreground hover:text-foreground"
              title="Edit Transaction"
            >
              <EditIcon className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteConfirmRecord(rec)}
              className="size-7 p-0 text-destructive/80 hover:text-destructive hover:bg-destructive/10"
              title="Delete Transaction"
            >
              <Trash2Icon className="size-3.5" />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            All Transactions
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Central repository of transactions across all branches, petty cash, and bank accounts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchRecords(page)}
            disabled={loading}
            className="h-8 text-xs font-medium"
          >
            <RefreshCwIcon className={`size-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={handleExportCSV}
            className="h-8 text-xs font-medium"
          >
            <DownloadIcon className="size-3.5 mr-1.5" />
            Export Filtered CSV
          </Button>
        </div>
      </div>

      {/* Filters Card */}
      <Card className="border border-border/80 bg-card shadow-sm">
        <CardHeader className="pb-3 pt-4 px-4 border-b border-border/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FilterIcon className="size-4 text-primary" />
              <CardTitle className="text-sm font-semibold">Filter Transactions</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcwIcon className="size-3 mr-1" />
              Reset Filters
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Search Input */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase">
                Search
              </label>
              <div className="relative">
                <SearchIcon className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                <Input
                  placeholder="Bill, reason, item code..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
                  className="h-8 text-xs pl-8 font-medium"
                />
              </div>
            </div>

            {/* Shop Filter */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase">
                Branch / Shop
              </label>
              <select
                value={shopFilter}
                onChange={(e) => setShopFilter(e.target.value)}
                className="w-full h-8 rounded-md border border-border bg-card text-foreground px-2.5 text-xs font-medium outline-none focus:border-ring [color-scheme:light] dark:[color-scheme:dark]"
              >
                <option value="ALL" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">All Branches</option>
                {shops.map((s) => (
                  <option key={s._id} value={s._id} className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
                    {s.name} ({s.code}) {s.shopType === "COMMUNICATION" ? "[Comm]" : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Type Filter */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase">
                Type
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full h-8 rounded-md border border-border bg-card text-foreground px-2.5 text-xs font-medium outline-none focus:border-ring [color-scheme:light] dark:[color-scheme:dark]"
              >
                <option value="ALL" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">All Types</option>
                <option value="INCOME" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Income (+)</option>
                <option value="EXPENSE" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Expense (-)</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-8 rounded-md border border-border bg-card text-foreground px-2.5 text-xs font-medium outline-none focus:border-ring [color-scheme:light] dark:[color-scheme:dark]"
              >
                <option value="ALL" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">All Statuses</option>
                <option value="PENDING" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Pending</option>
                <option value="APPROVED" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Approved</option>
                <option value="REJECTED" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Rejected</option>
              </select>
            </div>

            {/* Payment Method Filter */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase">
                Payment Method
              </label>
              <select
                value={paymentMethodFilter}
                onChange={(e) => setPaymentMethodFilter(e.target.value)}
                className="w-full h-8 rounded-md border border-border bg-card text-foreground px-2.5 text-xs font-medium outline-none focus:border-ring [color-scheme:light] dark:[color-scheme:dark]"
              >
                <option value="ALL" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">All Methods</option>
                <option value="CASH" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Cash</option>
                <option value="PETTY_CASH" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Petty Cash</option>
                <option value="BANK_TRANSFER" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Bank Transfer</option>
                <option value="CHEQUE" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Cheque</option>
                <option value="ONLINE" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Online</option>
              </select>
            </div>

            {/* Bank Account Filter */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase">
                Bank Account
              </label>
              <select
                value={bankAccountFilter}
                onChange={(e) => setBankAccountFilter(e.target.value)}
                className="w-full h-8 rounded-md border border-border bg-card text-foreground px-2.5 text-xs font-medium outline-none focus:border-ring [color-scheme:light] dark:[color-scheme:dark]"
              >
                <option value="ALL" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">All Accounts</option>
                {bankAccounts.map((b) => (
                  <option key={b._id} value={b._id} className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
                    {b.bankName} - {b.accountNumber}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase">
                Category
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full h-8 rounded-md border border-border bg-card text-foreground px-2.5 text-xs font-medium outline-none focus:border-ring [color-scheme:light] dark:[color-scheme:dark]"
              >
                <option value="ALL" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">All Categories</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id} className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
                    {c.name} ({c.type})
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range Inputs */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase">
                Date Range
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-8 text-[11px] px-2"
                  placeholder="From"
                />
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-8 text-[11px] px-2"
                  placeholder="To"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <Button
              size="sm"
              onClick={handleApplyFilters}
              disabled={loading}
              className="h-8 px-4 text-xs font-semibold"
            >
              {loading ? <Loader2Icon className="size-3.5 animate-spin mr-1.5" /> : <FilterIcon className="size-3.5 mr-1.5" />}
              Apply Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Data Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span>
            Showing <strong className="text-foreground">{records.length}</strong> of{" "}
            <strong className="text-foreground">{total}</strong> total transactions
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || loading}
                onClick={() => fetchRecords(page - 1)}
                className="h-7 px-2.5 text-xs"
              >
                Previous
              </Button>
              <span className="font-mono text-xs px-1">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages || loading}
                onClick={() => fetchRecords(page + 1)}
                className="h-7 px-2.5 text-xs"
              >
                Next
              </Button>
            </div>
          )}
        </div>

        <DataTable
          columns={columns}
          data={records}
          searchKey="billNumber"
          searchPlaceholder="Quick filter bill number in current page..."
          loading={loading}
        />
      </div>

      {/* ADMIN EDIT TRANSACTION MODAL */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <EditIcon className="size-4 text-primary" />
              Edit Transaction (Admin Override)
            </DialogTitle>
            <DialogDescription>
              Modifying this record will automatically recalculate branch balances and re-balance petty cash / bank accounts if applicable.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase">
                  Date
                </label>
                <Input type="date" {...editForm.register("date")} className="h-9 text-xs" />
                {editForm.formState.errors.date && (
                  <p className="text-[11px] text-destructive">{editForm.formState.errors.date.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase">
                  Bill Number
                </label>
                <Input {...editForm.register("billNumber")} className="h-9 text-xs font-mono" />
                {editForm.formState.errors.billNumber && (
                  <p className="text-[11px] text-destructive">{editForm.formState.errors.billNumber.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase">
                  Branch / Shop
                </label>
                <select
                  {...editForm.register("shop")}
                  className="w-full h-9 rounded-md border border-border bg-card text-foreground px-3 text-xs font-medium outline-none focus:border-ring [color-scheme:light] dark:[color-scheme:dark]"
                >
                  {shops.map((s) => (
                    <option key={s._id} value={s._id} className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
                {editForm.formState.errors.shop && (
                  <p className="text-[11px] text-destructive">{editForm.formState.errors.shop.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase">
                  Category
                </label>
                <select
                  {...editForm.register("category")}
                  className="w-full h-9 rounded-md border border-border bg-card text-foreground px-3 text-xs font-medium outline-none focus:border-ring [color-scheme:light] dark:[color-scheme:dark]"
                >
                  {categories.map((c) => (
                    <option key={c._id} value={c._id} className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
                      {c.name} ({c.type})
                    </option>
                  ))}
                </select>
                {editForm.formState.errors.category && (
                  <p className="text-[11px] text-destructive">{editForm.formState.errors.category.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase">
                  Type
                </label>
                <select
                  {...editForm.register("type")}
                  className="w-full h-9 rounded-md border border-border bg-card text-foreground px-3 text-xs font-medium outline-none focus:border-ring [color-scheme:light] dark:[color-scheme:dark]"
                >
                  <option value="EXPENSE" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">EXPENSE (-)</option>
                  <option value="INCOME" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">INCOME (+)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase">
                  Payment Method
                </label>
                <select
                  {...editForm.register("paymentMethod")}
                  className="w-full h-9 rounded-md border border-border bg-card text-foreground px-3 text-xs font-medium outline-none focus:border-ring [color-scheme:light] dark:[color-scheme:dark]"
                >
                  <option value="CASH" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Cash</option>
                  <option value="PETTY_CASH" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Petty Cash</option>
                  <option value="BANK_TRANSFER" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Bank Transfer</option>
                  <option value="CHEQUE" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Cheque</option>
                  <option value="ONLINE" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Online</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase">
                  Bank Account
                </label>
                <select
                  {...editForm.register("bankAccount")}
                  className="w-full h-9 rounded-md border border-border bg-card text-foreground px-3 text-xs font-medium outline-none focus:border-ring [color-scheme:light] dark:[color-scheme:dark]"
                >
                  <option value="" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">None</option>
                  {bankAccounts.map((b) => (
                    <option key={b._id} value={b._id} className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
                      {b.bankName} ({b.accountNumber.slice(-4)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase">
                  Amount (LKR)
                </label>
                <Input
                  type="number"
                  step="any"
                  {...editForm.register("amount", { valueAsNumber: true })}
                  className="h-9 text-xs font-mono font-semibold"
                />
                {editForm.formState.errors.amount && (
                  <p className="text-[11px] text-destructive">{editForm.formState.errors.amount.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase">
                  Status
                </label>
                <select
                  {...editForm.register("status")}
                  className="w-full h-9 rounded-md border border-border bg-card text-foreground px-3 text-xs font-medium outline-none focus:border-ring [color-scheme:light] dark:[color-scheme:dark]"
                >
                  <option value="PENDING" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">PENDING</option>
                  <option value="APPROVED" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">APPROVED</option>
                  <option value="REJECTED" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">REJECTED</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase">
                  Approved Amount
                </label>
                <Input
                  type="number"
                  step="any"
                  placeholder="Defaults to Amount"
                  {...editForm.register("approvedAmount", {
                    setValueAs: (v) => (v === "" || v === null ? null : Number(v)),
                  })}
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase">
                Description / Reason
              </label>
              <Textarea {...editForm.register("reason")} className="text-xs" rows={2} />
              {editForm.formState.errors.reason && (
                <p className="text-[11px] text-destructive">{editForm.formState.errors.reason.message}</p>
              )}
            </div>

            {/* MANDATORY EDIT AUDIT REASON */}
            <div className="space-y-1 p-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
              <label className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase flex items-center gap-1.5">
                <ShieldAlertIcon className="size-3.5" />
                Reason for Edit (Mandatory for Audit Trail)
              </label>
              <Input
                placeholder="Explain why you are modifying this transaction..."
                {...editForm.register("editReason")}
                className="h-8 text-xs bg-background"
              />
              {editForm.formState.errors.editReason && (
                <p className="text-[11px] text-destructive font-medium">
                  {editForm.formState.errors.editReason.message}
                </p>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={editForm.formState.isSubmitting}>
                {editForm.formState.isSubmitting && <Loader2Icon className="size-3.5 animate-spin mr-1" />}
                Save and Reconcile
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ADMIN DELETE ALERT DIALOG */}
      <AlertDialog
        open={!!deleteConfirmRecord}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteConfirmRecord(null);
            setDeletionReason("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2Icon className="size-4" />
              Delete Transaction Permanently?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                You are about to soft-delete transaction{" "}
                <strong className="text-foreground font-mono">
                  {deleteConfirmRecord?.billNumber}
                </strong>{" "}
                amounting to{" "}
                <strong className="text-foreground font-mono">
                  LKR {Number(deleteConfirmRecord?.amount || 0).toLocaleString()}
                </strong>
                .
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                This will reverse any impact on the branch running balance, petty cash float, or bank balance, and create an immutable audit record.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-1.5 py-2">
            <label className="text-xs font-semibold text-foreground uppercase">
              Mandatory Deletion Reason
            </label>
            <Input
              placeholder="E.g. Duplicate entry, erroneous deposit, cancelled order..."
              value={deletionReason}
              onChange={(e) => setDeletionReason(e.target.value)}
              className="text-xs font-medium"
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSubmit}
              disabled={isDeleting || deletionReason.trim().length < 3}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2Icon className="size-3.5 animate-spin mr-1" /> : null}
              Confirm Safe Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
