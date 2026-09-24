"use client";

import * as React from "react";
import {
  getFinanceRecordsAction,
  reviewFinanceRecordAction,
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
import { StatusBadge } from "@/components/shared/status-badge";
import { CategoryBadge } from "@/components/shared/category-badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  reviewFinanceRecordSchema,
  ReviewFinanceRecordInput,
} from "@/schemas/finance";
import {
  CheckCheckIcon,
  CheckCircle2Icon,
  XCircleIcon,
  BuildingIcon,
  CalendarIcon,
  UserIcon,
  DollarSignIcon,
  FilterIcon,
  Loader2Icon,
  LockIcon,
} from "lucide-react";
import { toast } from "@/components/ui/toast";

interface ShopOption {
  _id: string;
  name: string;
  code: string;
}

interface CategoryOption {
  _id: string;
  name: string;
  type: string;
  colorToken: string;
}

interface RecordsViewProps {
  initialRecords: any[];
  shops: ShopOption[];
  categories: CategoryOption[];
}

export function RecordsView({
  initialRecords,
  shops,
  categories,
}: RecordsViewProps) {
  const [records, setRecords] = React.useState<any[]>(initialRecords);
  const [loading, setLoading] = React.useState(false);

  // Filters
  const [shopFilter, setShopFilter] = React.useState("ALL");
  const [categoryFilter, setCategoryFilter] = React.useState("ALL");
  const [statusFilter, setStatusFilter] = React.useState("PENDING"); // Default to PENDING for fast review!

  // Review Dialog
  const [reviewOpen, setReviewOpen] = React.useState(false);
  const [selectedRecord, setSelectedRecord] = React.useState<any | null>(null);
  const [actionType, setActionType] = React.useState<"APPROVE" | "REJECT">("APPROVE");

  const reviewForm = useForm<ReviewFinanceRecordInput>({
    resolver: zodResolver(reviewFinanceRecordSchema),
    defaultValues: {
      recordId: "",
      status: "APPROVED",
      approvedAmount: 0,
      reviewRemarks: "",
    },
  });

  const refreshRecords = async () => {
    setLoading(true);
    const res = await getFinanceRecordsAction({
      shopId: shopFilter !== "ALL" ? shopFilter : undefined,
      categoryId: categoryFilter !== "ALL" ? categoryFilter : undefined,
      status: statusFilter !== "ALL" ? statusFilter : undefined,
    });
    if (res.success && res.records) {
      setRecords(res.records);
    }
    setLoading(false);
  };

  React.useEffect(() => {
    refreshRecords();
  }, [shopFilter, categoryFilter, statusFilter]);

  const openReviewModal = (record: any) => {
    setSelectedRecord(record);
    setActionType("APPROVE");
    reviewForm.reset({
      recordId: record._id,
      status: "APPROVED",
      approvedAmount: record.amount,
      reviewRemarks: "",
    });
    setReviewOpen(true);
  };

  const onReviewSubmit = async (data: ReviewFinanceRecordInput) => {
    const res = await reviewFinanceRecordAction(data);
    if (res.success) {
      toast.create({
        title: "Review submitted",
        description: res.message || "Transaction decision recorded.",
        type: "success",
      });
      setReviewOpen(false);
      refreshRecords();
    } else {
      toast.create({
        title: "Review failed",
        description: res.error || "An error occurred",
        type: "error",
      });
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
      accessorKey: "shop.name",
      header: "Branch",
      cell: ({ row }) => (
        <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
          <BuildingIcon className="size-3 text-muted-foreground" />
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
      header: "Reason / Purpose",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground truncate max-w-xs block">
          {row.original.reason}
        </span>
      ),
    },
    {
      accessorKey: "amount",
      header: "Submitted (LKR)",
      cell: ({ row }) => (
        <span className="font-mono text-xs font-semibold text-foreground">
          {Number(row.original.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "createdBy.name",
      header: "Submitted By",
      cell: ({ row }) => (
        <span className="text-[11px] text-muted-foreground">
          {row.original.createdBy?.name || "Unknown"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Action",
      cell: ({ row }) => {
        const rec = row.original;
        const isPending = rec.status === "PENDING";

        return (
          <Button
            variant={isPending ? "default" : "outline"}
            size="sm"
            onClick={() => openReviewModal(rec)}
            className="h-7 gap-1 text-xs"
          >
            {isPending ? (
              <>
                <CheckCheckIcon className="size-3.5" />
                Review
              </>
            ) : (
              <>
                <LockIcon className="size-3 text-muted-foreground" />
                View Details
              </>
            )}
          </Button>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Transaction Verification Queue
          </h2>
          <p className="text-xs text-muted-foreground">
            Validate branch expenses and deposits, adjust approved amounts, and record audit remarks
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 rounded-md border border-border bg-card text-foreground px-3 text-xs font-medium outline-none focus:border-ring [color-scheme:light] dark:[color-scheme:dark]"
        >
          <option value="ALL" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">All Statuses</option>
          <option value="PENDING" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Pending Verification Only</option>
          <option value="APPROVED" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Approved Only</option>
          <option value="REJECTED" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Rejected Only</option>
        </select>

        <select
          value={shopFilter}
          onChange={(e) => setShopFilter(e.target.value)}
          className="h-9 rounded-md border border-border bg-card text-foreground px-3 text-xs font-medium outline-none focus:border-ring [color-scheme:light] dark:[color-scheme:dark]"
        >
          <option value="ALL" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">All Branches</option>
          {shops.map((s) => (
            <option key={s._id} value={s._id} className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
              {s.name} ({s.code})
            </option>
          ))}
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

      {/* REVIEW DIALOG */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="font-mono text-base font-bold text-primary">
                {selectedRecord?.billNumber}
              </span>
              <StatusBadge status={selectedRecord?.status || "PENDING"} />
            </DialogTitle>
            <DialogDescription>
              Verification review for {selectedRecord?.shop?.name}
            </DialogDescription>
          </DialogHeader>

          {/* Record Details Readout */}
          <div className="space-y-4 py-2">
            <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Date</span>
                  <span className="font-semibold text-foreground">
                    {selectedRecord?.date ? new Date(selectedRecord.date).toLocaleDateString() : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Payment Method</span>
                  <span className="font-semibold text-foreground uppercase font-mono">
                    {selectedRecord?.paymentMethod}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Category</span>
                  <span className="font-semibold text-foreground">
                    {selectedRecord?.category?.name || "Uncategorized"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Submitted Amount</span>
                  <span className="font-semibold font-mono text-base text-foreground">
                    LKR {Number(selectedRecord?.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="text-xs pt-1 border-t border-border/60">
                <span className="text-muted-foreground block text-[11px]">Purpose / Reason</span>
                <p className="mt-1 text-foreground font-medium bg-card/60 p-2 rounded border border-border/40">
                  {selectedRecord?.reason}
                </p>
              </div>

              <div className="text-[11px] text-muted-foreground flex items-center justify-between">
                <span>Submitted by: {selectedRecord?.createdBy?.name}</span>
                <span>Branch Code: {selectedRecord?.shop?.code}</span>
              </div>
            </div>

            {/* Decision Controls or Read-Only Finalized State */}
            {selectedRecord?.status !== "PENDING" ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <LockIcon className="size-3.5 text-muted-foreground" />
                      Verification Finalized
                    </span>
                    <StatusBadge status={selectedRecord?.status} />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div>
                      <span className="text-muted-foreground text-[11px] block">Verified By</span>
                      <span className="font-semibold text-foreground">
                        {selectedRecord?.reviewedBy?.name || "System Verifier"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-[11px] block">Verified Date</span>
                      <span className="font-semibold text-foreground">
                        {selectedRecord?.reviewedAt
                          ? new Date(selectedRecord.reviewedAt).toLocaleString()
                          : "—"}
                      </span>
                    </div>

                    {selectedRecord?.status === "APPROVED" && (
                      <div className="col-span-2 pt-1 border-t border-border/40">
                        <span className="text-muted-foreground text-[11px] block">Final Approved Amount</span>
                        <span className="font-bold text-chart-2 font-mono text-sm">
                          LKR {Number(selectedRecord?.approvedAmount ?? selectedRecord?.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}

                    {selectedRecord?.reviewRemarks && (
                      <div className="col-span-2 pt-1 border-t border-border/40">
                        <span className="text-muted-foreground text-[11px] block">Verification Remarks</span>
                        <p className="mt-1 text-foreground bg-card/60 p-2 rounded border border-border/40 text-xs">
                          {selectedRecord.reviewRemarks}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Disabled Decision Controls */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={true}
                      className="flex-1 gap-1.5 text-xs opacity-50 cursor-not-allowed"
                    >
                      <CheckCircle2Icon className="size-4" />
                      Approve Transaction
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={true}
                      className="flex-1 gap-1.5 text-xs opacity-50 cursor-not-allowed"
                    >
                      <XCircleIcon className="size-4" />
                      Reject Transaction
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground text-center">
                    This transaction has already been {selectedRecord?.status?.toLowerCase()} and cannot be approved or rejected again.
                  </p>
                </div>

                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setReviewOpen(false)}>
                    Close
                  </Button>
                </DialogFooter>
              </div>
            ) : (
              <form onSubmit={reviewForm.handleSubmit(onReviewSubmit)} className="space-y-4">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant={actionType === "APPROVE" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setActionType("APPROVE");
                      reviewForm.setValue("status", "APPROVED");
                      reviewForm.setValue("approvedAmount", selectedRecord?.amount);
                    }}
                    className={`flex-1 gap-1.5 text-xs ${actionType === "APPROVE" ? "bg-primary hover:bg-primary/90 text-primary-foreground" : ""}`}
                  >
                    <CheckCircle2Icon className="size-4" />
                    Approve Transaction
                  </Button>

                  <Button
                    type="button"
                    variant={actionType === "REJECT" ? "destructive" : "outline"}
                    size="sm"
                    onClick={() => {
                      setActionType("REJECT");
                      reviewForm.setValue("status", "REJECTED");
                      reviewForm.setValue("approvedAmount", null);
                    }}
                    className="flex-1 gap-1.5 text-xs"
                  >
                    <XCircleIcon className="size-4" />
                    Reject Transaction
                  </Button>
                </div>

                {actionType === "APPROVE" ? (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase text-muted-foreground">
                        Verification Remarks (Optional)
                      </label>
                      <Textarea
                        placeholder="e.g. Verified with physical invoice and bank slip..."
                        {...reviewForm.register("reviewRemarks")}
                        className="text-xs"
                        rows={2}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase text-destructive">
                      Reason for Rejection (Mandatory) *
                    </label>
                    <Textarea
                      placeholder="Clearly explain why this entry is declined (e.g., duplicate bill, unauthorized expense)..."
                      {...reviewForm.register("reviewRemarks")}
                      className="text-xs border-destructive/40 focus:border-destructive"
                      rows={3}
                    />
                    {reviewForm.formState.errors.reviewRemarks && (
                      <p className="text-xs text-destructive">
                        {reviewForm.formState.errors.reviewRemarks.message}
                      </p>
                    )}
                  </div>
                )}

                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setReviewOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={reviewForm.formState.isSubmitting}
                    className={actionType === "APPROVE" ? "bg-primary hover:bg-primary/90 text-primary-foreground" : "bg-destructive text-destructive-foreground hover:bg-destructive/90"}
                  >
                    {reviewForm.formState.isSubmitting ? (
                      <Loader2Icon className="size-3.5 animate-spin mr-1" />
                    ) : null}
                    Confirm {actionType === "APPROVE" ? "Approval" : "Rejection"}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
