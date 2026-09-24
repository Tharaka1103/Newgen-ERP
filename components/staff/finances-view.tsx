"use client";

import * as React from "react";
import {
  getFinanceRecordsAction,
  createFinanceRecordAction,
  updateFinanceRecordAction,
  deleteFinanceRecordAction,
  getSuggestedBillNumberAction,
} from "@/actions/finances";
import { DataTable } from "@/components/shared/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { StatusBadge } from "@/components/shared/status-badge";
import { CategoryBadge } from "@/components/shared/category-badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createFinanceRecordSchema,
  updateFinanceRecordSchema,
  CreateFinanceRecordInput,
  UpdateFinanceRecordInput,
} from "@/schemas/finance";
import {
  PlusCircleIcon,
  EditIcon,
  Trash2Icon,
  LockIcon,
  AlertTriangleIcon,
  BuildingIcon,
  Loader2Icon,
  FilterIcon,
} from "lucide-react";
import { toast } from "@/components/ui/toast";

interface CategoryOption {
  _id: string;
  name: string;
  type: "EXPENSE" | "INCOME";
  colorToken: string;
}

interface FinancesViewProps {
  initialRecords: any[];
  categories: CategoryOption[];
  userShopId: string | null;
  userShopName: string | null;
  userId: string;
  unassignedStaff?: boolean;
}

export function FinancesView({
  initialRecords,
  categories,
  userShopId,
  userShopName,
  userId,
  unassignedStaff = false,
}: FinancesViewProps) {
  const [records, setRecords] = React.useState<any[]>(initialRecords);
  const [loading, setLoading] = React.useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = React.useState("ALL");
  const [categoryFilter, setCategoryFilter] = React.useState("ALL");

  // Modals
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteConfirmRecord, setDeleteConfirmRecord] = React.useState<any | null>(null);
  const [selectedRecord, setSelectedRecord] = React.useState<any | null>(null);

  // Forms
  const createForm = useForm<CreateFinanceRecordInput>({
    resolver: zodResolver(createFinanceRecordSchema),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      shop: userShopId || "",
      category: categories[0]?._id || "",
      paymentMethod: "CASH",
      billNumber: "",
      reason: "",
      amount: 0,
      type: "EXPENSE",
    },
  });

  const editForm = useForm<UpdateFinanceRecordInput>({
    resolver: zodResolver(updateFinanceRecordSchema),
    defaultValues: {
      recordId: "",
      date: "",
      category: "",
      paymentMethod: "CASH",
      billNumber: "",
      reason: "",
      amount: 0,
      type: "EXPENSE",
    },
  });

  const refreshRecords = async () => {
    setLoading(true);
    const res = await getFinanceRecordsAction({
      status: statusFilter !== "ALL" ? statusFilter : undefined,
      categoryId: categoryFilter !== "ALL" ? categoryFilter : undefined,
    });
    if (res.success && res.records) {
      setRecords(res.records);
    }
    setLoading(false);
  };

  React.useEffect(() => {
    refreshRecords();
  }, [statusFilter, categoryFilter]);

  // Open Create Dialog & pre-generate bill number
  const handleOpenCreate = async () => {
    if (!userShopId) {
      toast.create({
        title: "No branch assigned",
        description: "You cannot create transactions until an admin assigns you to a branch.",
        type: "error",
      });
      return;
    }

    createForm.reset({
      date: new Date().toISOString().split("T")[0],
      shop: userShopId,
      category: categories[0]?._id || "",
      paymentMethod: "CASH",
      billNumber: "Fetching...",
      reason: "",
      amount: 0,
      type: categories[0]?.type || "EXPENSE",
    });

    setCreateOpen(true);

    const billRes = await getSuggestedBillNumberAction();
    if (billRes.success && billRes.billNumber) {
      createForm.setValue("billNumber", billRes.billNumber);
    }
  };

  const onCreateSubmit = async (data: CreateFinanceRecordInput) => {
    const res = await createFinanceRecordAction(data);
    if (res.success) {
      toast.create({
        title: "Record submitted",
        description: "Transaction registered and queued for verification.",
        type: "success",
      });
      setCreateOpen(false);
      createForm.reset();
      refreshRecords();
    } else {
      toast.create({
        title: "Failed to submit",
        description: res.error || "An error occurred",
        type: "error",
      });
    }
  };

  const openEditModal = (rec: any) => {
    if (rec.status !== "PENDING" || rec.isLocked) {
      toast.create({
        title: "Record locked",
        description: "Only PENDING records can be modified by Finance Officers.",
        type: "warning",
      });
      return;
    }

    setSelectedRecord(rec);
    editForm.reset({
      recordId: rec._id,
      date: new Date(rec.date).toISOString().split("T")[0],
      category: rec.category?._id || rec.category,
      paymentMethod: rec.paymentMethod,
      billNumber: rec.billNumber,
      reason: rec.reason,
      amount: rec.amount,
      type: rec.type,
    });
    setEditOpen(true);
  };

  const onEditSubmit = async (data: UpdateFinanceRecordInput) => {
    const res = await updateFinanceRecordAction(data);
    if (res.success) {
      toast.create({
        title: "Record updated",
        description: "Your modifications have been saved.",
        type: "success",
      });
      setEditOpen(false);
      refreshRecords();
    } else {
      toast.create({
        title: "Update failed",
        description: res.error || "An error occurred",
        type: "error",
      });
    }
  };

  const handleDeleteSubmit = async () => {
    if (!deleteConfirmRecord) return;
    const res = await deleteFinanceRecordAction(deleteConfirmRecord._id);
    if (res.success) {
      toast.create({
        title: "Record deleted",
        description: "Pending transaction successfully removed.",
        type: "success",
      });
      setDeleteConfirmRecord(null);
      refreshRecords();
    } else {
      toast.create({
        title: "Delete failed",
        description: res.error || "Failed to remove transaction",
        type: "error",
      });
    }
  };

  const handleCategoryChange = (catId: string) => {
    createForm.setValue("category", catId);
    const cat = categories.find((c) => c._id === catId);
    if (cat) {
      createForm.setValue("type", cat.type);
    }
  };

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => (
        <span className="font-mono text-xs">{new Date(row.original.date).toLocaleDateString()}</span>
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
      accessorKey: "paymentMethod",
      header: "Method",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground uppercase font-mono">
          {row.original.paymentMethod}
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
        return (
          <span className={`font-mono text-xs font-semibold ${isIncome ? "text-chart-2" : "text-foreground"}`}>
            {isIncome ? "+" : "-"} {Number(row.original.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Approval Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "runningBalance",
      header: "Running Balance",
      cell: ({ row }) => {
        const bal = row.original.runningBalance || 0;
        return (
          <span className={`font-mono text-xs font-semibold ${bal >= 0 ? "text-chart-2" : "text-destructive"}`}>
            {Number(bal).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const rec = row.original;
        const isPending = rec.status === "PENDING" && !rec.isLocked;

        if (!isPending) {
          return (
            <Tooltip>
              <TooltipTrigger
                render={
                  <span className="inline-flex items-center text-muted-foreground cursor-not-allowed p-1">
                    <LockIcon className="size-3.5 opacity-50" />
                  </span>
                }
              />
              <TooltipContent>
                <p className="text-xs">Locked: Cannot edit after verification</p>
              </TooltipContent>
            </Tooltip>
          );
        }

        return (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => openEditModal(rec)}
              title="Edit Pending Record"
            >
              <EditIcon className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setDeleteConfirmRecord(rec)}
              title="Delete Pending Record"
              className="text-destructive hover:text-destructive"
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
      {/* Unassigned Warning Banner */}
      {unassignedStaff && (
        <div className="flex items-center gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4 text-warning">
          <AlertTriangleIcon className="size-5 shrink-0" />
          <div className="text-xs">
            <span className="font-semibold block text-sm">No Branch Assigned</span>
            You are not currently assigned to an operational branch. You can review past records, but
            record creation is disabled until an Administrator reassigns you to a shop.
          </div>
        </div>
      )}

      {/* Header and Add Action */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <span>Branch Financial Ledger</span>
            {userShopName && (
              <Badge variant="outline" className="font-mono text-xs">
                <BuildingIcon className="size-3 mr-1" />
                {userShopName}
              </Badge>
            )}
          </h2>
          <p className="text-xs text-muted-foreground">
            Log daily petty cash, tuition fees, and operational expenses for your assigned branch
          </p>
        </div>

        <Button
          onClick={handleOpenCreate}
          disabled={unassignedStaff || !userShopId}
          size="sm"
          className="gap-1.5 text-xs"
        >
          <PlusCircleIcon className="size-3.5" />
          Add New Record
        </Button>
      </div>

      {/* Filter Bar Component */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 rounded-md border border-border bg-card text-foreground px-3 text-xs font-medium outline-none focus:border-ring [color-scheme:light] dark:[color-scheme:dark]"
        >
          <option value="ALL" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">All Statuses</option>
          <option value="PENDING" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Pending Only</option>
          <option value="APPROVED" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Approved Only</option>
          <option value="REJECTED" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Rejected Only</option>
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-9 rounded-md border border-border bg-card text-foreground px-3 text-xs font-medium outline-none focus:border-ring [color-scheme:light] dark:[color-scheme:dark]"
        >
          <option value="ALL" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">All Categories</option>
          {categories.map((c) => (
            <option key={c._id} value={c._id} className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        data={records}
        searchKey="billNumber"
        searchPlaceholder="Search bill number or reason..."
        loading={loading}
      />

      {/* CREATE RECORD MODAL */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Finance Record</DialogTitle>
            <DialogDescription>
              Submit an expense or deposit for {userShopName}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Date</label>
                <Input type="date" {...createForm.register("date")} className="h-9 text-xs" />
                {createForm.formState.errors.date && (
                  <p className="text-xs text-destructive">{createForm.formState.errors.date.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Branch</label>
                <Input value={userShopName || "Unassigned"} disabled className="h-9 text-xs bg-muted/50" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Category</label>
                <select
                  value={createForm.watch("category")}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full h-9 rounded-md border border-border bg-card text-foreground px-3 text-xs font-medium outline-none focus:border-ring [color-scheme:light] dark:[color-scheme:dark]"
                >
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat._id} className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
                      {cat.name} ({cat.type})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Payment Method</label>
                <select
                  {...createForm.register("paymentMethod")}
                  className="w-full h-9 rounded-md border border-border bg-card text-foreground px-3 text-xs font-medium outline-none focus:border-ring [color-scheme:light] dark:[color-scheme:dark]"
                >
                  <option value="CASH" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Cash</option>
                  <option value="BANK_TRANSFER" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Bank Transfer</option>
                  <option value="CHEQUE" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Cheque</option>
                  <option value="ONLINE" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Online</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Bill Number</label>
                <Input {...createForm.register("billNumber")} className="h-9 text-xs font-mono" />
                {createForm.formState.errors.billNumber && (
                  <p className="text-xs text-destructive">{createForm.formState.errors.billNumber.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Amount (LKR)</label>
                <Input type="number" step="any" placeholder="0.00" {...createForm.register("amount")} className="h-9 text-xs font-mono font-semibold" />
                {createForm.formState.errors.amount && (
                  <p className="text-xs text-destructive">{createForm.formState.errors.amount.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Reason / Description</label>
              <Textarea
                placeholder="Details of expense, purpose, or receipt explanation..."
                {...createForm.register("reason")}
                className="text-xs"
                rows={3}
              />
              {createForm.formState.errors.reason && (
                <p className="text-xs text-destructive">{createForm.formState.errors.reason.message}</p>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={createForm.formState.isSubmitting}>
                {createForm.formState.isSubmitting ? <Loader2Icon className="size-3.5 animate-spin mr-1" /> : null}
                Submit for Approval
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT RECORD MODAL */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Pending Transaction</DialogTitle>
            <DialogDescription>Modify record before verification review</DialogDescription>
          </DialogHeader>

          <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Date</label>
                <Input type="date" {...editForm.register("date")} className="h-9 text-xs" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Bill Number</label>
                <Input {...editForm.register("billNumber")} className="h-9 text-xs font-mono" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Category</label>
                <select
                  {...editForm.register("category")}
                  className="w-full h-9 rounded-md border border-border bg-card text-foreground px-3 text-xs font-medium outline-none focus:border-ring [color-scheme:light] dark:[color-scheme:dark]"
                >
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat._id} className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
                      {cat.name} ({cat.type})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Amount (LKR)</label>
                <Input type="number" step="any" {...editForm.register("amount")} className="h-9 text-xs font-mono" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Reason</label>
              <Textarea {...editForm.register("reason")} className="text-xs" rows={3} />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={editForm.formState.isSubmitting}>
                Save Modifications
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRM ALERT */}
      <AlertDialog open={!!deleteConfirmRecord} onOpenChange={(open) => !open && setDeleteConfirmRecord(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Pending Transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove bill &quot;{deleteConfirmRecord?.billNumber}&quot; for LKR{" "}
              {Number(deleteConfirmRecord?.amount || 0).toLocaleString()}? This action will permanently remove it from the ledger.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSubmit} className="bg-destructive text-destructive-foreground hover:bg-destructive/80">
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
