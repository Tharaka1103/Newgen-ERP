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
  FileTextIcon,
  ShieldCheckIcon,
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
      header: () => <span className="whitespace-nowrap">Date</span>,
      cell: ({ row }) => (
        <span className="font-mono text-xs whitespace-nowrap block">{new Date(row.original.date).toLocaleDateString()}</span>
      ),
    },
    {
      accessorKey: "shop.name",
      header: () => <span className="whitespace-nowrap">Branch</span>,
      cell: ({ row }) => (
        <span className="font-semibold text-xs text-foreground flex items-center gap-1.5 whitespace-nowrap">
          <BuildingIcon className="size-3 text-muted-foreground" />
          {row.original.shop?.name || "—"}
        </span>
      ),
    },
    {
      accessorKey: "billNumber",
      header: () => <span className="whitespace-nowrap">Bill No</span>,
      cell: ({ row }) => (
        <span className="font-mono text-xs font-semibold text-primary whitespace-nowrap block">
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
      header: () => <span className="w-[300px] min-w-[280px] max-w-[320px] block">Reason / Item Details</span>,
      cell: ({ row }) => {
        const r = row.original;
        const hasCommItem = Boolean(r.isCommunicationItem || r.itemCode || r.itemName);
        return (
          <div className="w-[300px] min-w-[280px] max-w-[320px] space-y-1.5 overflow-hidden whitespace-normal">
            {hasCommItem && (
              <div className="flex items-center gap-1 flex-wrap">
                <Badge variant="secondary" className="text-[9px] font-mono px-1 py-0 h-3.5">
                  {r.itemCode || "COMM"}
                </Badge>
                <span className="text-xs font-semibold text-foreground truncate max-w-[190px]">
                  {r.itemName || "Item"}
                </span>
                {r.quantity && r.quantity > 1 && (
                  <Badge variant="outline" className="text-[9px] font-mono px-1 py-0 h-3.5 bg-muted">
                    ×{r.quantity}
                  </Badge>
                )}
              </div>
            )}
            <p className="text-xs text-muted-foreground break-words line-clamp-2" title={r.reason}>
              {r.reason}
            </p>
            {(r.isCrossBranchPayment || r.isRelatedToBranch) && (
              <div className="rounded-md border border-blue-500/30 bg-blue-500/10 p-2 space-y-1 text-[10px]">
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1 font-bold text-blue-700 dark:text-blue-300">
                    <BuildingIcon className="size-3 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span className="uppercase tracking-wider text-[9px]">Cross-Branch</span>
                  </div>
                  {r.interBranchSettlementStatus && (
                    <Badge
                      variant="outline"
                      className={`text-[8px] px-1.5 py-0 h-3.5 font-mono uppercase whitespace-nowrap ${
                        r.interBranchSettlementStatus === "SETTLED"
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                      }`}
                    >
                      {r.interBranchSettlementStatus === "SETTLED" ? "Settled" : "Unsettled"}
                    </Badge>
                  )}
                </div>

                <div className="text-[10px] space-y-0.5 border-t border-blue-500/20 pt-1 text-muted-foreground leading-tight">
                  <div className="truncate">
                    Cash at: <strong className="text-foreground">{r.collectingShop?.name || r.shop?.name}</strong>
                  </div>
                  <div className="truncate">
                    Income for: <strong className="text-blue-700 dark:text-blue-400">{r.beneficiaryShop?.name || r.relatedBranch?.name}</strong>
                  </div>
                </div>

                {r.relatedBranchNote && (
                  <p className="text-[9px] text-muted-foreground italic bg-background/50 p-1 rounded border border-border line-clamp-2" title={r.relatedBranchNote}>
                    Note: {r.relatedBranchNote}
                  </p>
                )}
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "amount",
      header: () => <span className="whitespace-nowrap">Submitted (LKR)</span>,
      cell: ({ row }) => (
        <span className="font-mono text-xs font-semibold text-foreground whitespace-nowrap block">
          {Number(row.original.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <div className="whitespace-nowrap">
          <StatusBadge status={row.original.status} />
        </div>
      ),
    },
    {
      accessorKey: "createdBy.name",
      header: () => <span className="whitespace-nowrap">Submitted By</span>,
      cell: ({ row }) => (
        <span className="text-[11px] text-muted-foreground whitespace-nowrap block">
          {row.original.createdBy?.name || "Unknown"}
        </span>
      ),
    },
    {
      id: "actions",
      header: () => <span className="whitespace-nowrap">Action</span>,
      cell: ({ row }) => {
        const rec = row.original;
        const isPending = rec.status === "PENDING";

        return (
          <div className="whitespace-nowrap">
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
          </div>
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
        <DialogContent className="sm:max-w-4xl lg:max-w-5xl h-[85vh] max-h-[85vh] flex flex-col p-6 overflow-hidden">
          <DialogHeader className="shrink-0 pb-3 border-b border-border/50">
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-bold text-primary">
                  {selectedRecord?.billNumber}
                </span>
                <span className="text-xs text-muted-foreground font-normal">
                  • {selectedRecord?.shop?.name} ({selectedRecord?.shop?.code})
                </span>
                <StatusBadge status={selectedRecord?.status || "PENDING"} />
              </div>
            </DialogTitle>
            <DialogDescription className="sr-only">
              Verification review for {selectedRecord?.shop?.name}
            </DialogDescription>
          </DialogHeader>

          {/* TWO COLUMN CONTENT */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 flex-1 min-h-0 overflow-hidden pt-2">
            {/* LEFT COLUMN: Record Details */}
            <div className="md:col-span-7 flex flex-col min-h-0">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground pb-2">
                <FileTextIcon className="size-3.5 text-primary" />
                <span>Transaction &amp; Item Details</span>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden space-y-3.5 pr-2">
                <div className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-xs">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Date</span>
                      <span className="font-semibold text-foreground text-sm">
                        {selectedRecord?.date ? new Date(selectedRecord.date).toLocaleDateString() : "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Payment Method</span>
                      <span className="font-semibold text-foreground uppercase font-mono text-xs">
                        {selectedRecord?.paymentMethod}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-border/60">
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Category</span>
                      <span className="font-semibold text-foreground block truncate">
                        {selectedRecord?.category?.name || "Uncategorized"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Submitted Amount</span>
                      <span className="font-bold font-mono text-base text-emerald-600 dark:text-emerald-400">
                        LKR {Number(selectedRecord?.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs pt-2 border-t border-border/60">
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Purpose / Reason</span>
                    <p className="mt-1 text-foreground font-medium bg-muted/40 p-2.5 rounded-lg border border-border/50 text-xs">
                      {selectedRecord?.reason || "No description provided"}
                    </p>
                  </div>
                </div>

                {/* Communication Item Details */}
                {(selectedRecord?.isCommunicationItem || selectedRecord?.itemName) && (
                  <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between font-semibold">
                      <span className="text-foreground flex items-center gap-1.5">
                        <Badge variant="secondary" className="font-mono text-[10px]">
                          {selectedRecord.itemCode || "ITEM"}
                        </Badge>
                        <span className="font-bold text-xs">{selectedRecord.itemName}</span>
                      </span>
                      <Badge variant="outline" className="font-mono text-[10px] bg-background">
                        Qty: {selectedRecord.quantity || 1}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[11px] font-mono text-muted-foreground pt-1.5 border-t border-primary/10">
                      <div>
                        <span className="block text-[10px] text-muted-foreground uppercase font-sans">Unit Selling</span>
                        <span className="font-semibold text-foreground">
                          LKR {Number(selectedRecord.sellingPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-muted-foreground uppercase font-sans">Unit Cost</span>
                        <span className="font-semibold text-foreground">
                          LKR {Number(selectedRecord.actualPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-muted-foreground uppercase font-sans">Discount</span>
                        <span className="font-semibold text-foreground">
                          LKR {Number(selectedRecord.discountPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Cross-Branch Transfer Details */}
                {(selectedRecord?.isCrossBranchPayment || selectedRecord?.isRelatedToBranch) && (
                  <div className="p-3.5 rounded-xl border border-blue-500/30 bg-blue-500/10 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-blue-800 dark:text-blue-300">
                        <BuildingIcon className="size-3.5 text-blue-600 dark:text-blue-400" />
                        <span>Cross-Branch Transaction Details</span>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-2 py-0.5 font-mono uppercase ${
                          selectedRecord.interBranchSettlementStatus === "SETTLED"
                            ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                            : "border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-400"
                        }`}
                      >
                        {selectedRecord.interBranchSettlementStatus === "SETTLED" ? "Settled" : "Unsettled Inter-Branch Cash"}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] bg-background/60 p-2.5 rounded-lg border border-blue-500/20">
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Cash Drawer (Collecting Branch)</span>
                        <span className="font-semibold text-foreground">
                          {selectedRecord?.collectingShop?.name || selectedRecord?.shop?.name} ({selectedRecord?.collectingShop?.code || selectedRecord?.shop?.code})
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Income Beneficiary (Sales Branch)</span>
                        <span className="font-bold text-blue-700 dark:text-blue-400">
                          {selectedRecord?.beneficiaryShop?.name || selectedRecord?.relatedBranch?.name || "Specified Branch"} ({selectedRecord?.beneficiaryShop?.code || selectedRecord?.relatedBranch?.code || "—"})
                        </span>
                      </div>
                    </div>

                    <p className="text-[11px] text-muted-foreground">
                      💡 <strong>Accounting Impact:</strong> Approving this transaction adds physical cash to <strong>{selectedRecord?.collectingShop?.name || selectedRecord?.shop?.name}</strong> drawer, and credits income to <strong>{selectedRecord?.beneficiaryShop?.name || selectedRecord?.relatedBranch?.name}</strong>.
                    </p>

                    {selectedRecord?.relatedBranchNote && (
                      <div className="pt-1.5 border-t border-blue-500/20">
                        <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Branch Transfer Note:</span>
                        <p className="mt-1 text-xs text-foreground font-medium bg-background/80 p-2.5 rounded-lg border border-blue-500/20 whitespace-pre-wrap">
                          {selectedRecord.relatedBranchNote}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="text-[11px] text-muted-foreground flex items-center justify-between px-1">
                  <span>Submitted by: <strong className="text-foreground">{selectedRecord?.createdBy?.name || "Unknown"}</strong></span>
                  <span>Branch Code: <strong className="text-foreground">{selectedRecord?.shop?.code || "—"}</strong></span>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Verify Action Area */}
            <div className="md:col-span-5 flex flex-col min-h-0 border-t md:border-t-0 md:border-l border-border/60 md:pl-6 pt-4 md:pt-0">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground pb-2">
                <ShieldCheckIcon className="size-3.5 text-primary" />
                <span>Verification Decision</span>
              </div>

              {selectedRecord?.status !== "PENDING" ? (
                <div className="flex flex-col flex-1 min-h-0 justify-between">
                  <div className="flex-1 overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden space-y-4 pr-1">
                    <div className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <LockIcon className="size-3.5 text-muted-foreground" />
                          Verification Finalized
                        </span>
                        <StatusBadge status={selectedRecord?.status} />
                      </div>

                      <div className="grid grid-cols-1 gap-2.5 text-xs pt-1">
                        <div>
                          <span className="text-muted-foreground text-[10px] uppercase block font-semibold">Verified By</span>
                          <span className="font-semibold text-foreground">
                            {selectedRecord?.reviewedBy?.name || "System Verifier"}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-[10px] uppercase block font-semibold">Verified Date</span>
                          <span className="font-semibold text-foreground">
                            {selectedRecord?.reviewedAt
                              ? new Date(selectedRecord.reviewedAt).toLocaleString()
                              : "—"}
                          </span>
                        </div>

                        {selectedRecord?.status === "APPROVED" && (
                          <div className="pt-2 border-t border-border/40">
                            <span className="text-muted-foreground text-[10px] uppercase block font-semibold">Final Approved Amount</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono text-base">
                              LKR {Number(selectedRecord?.approvedAmount ?? selectedRecord?.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        )}

                        {selectedRecord?.reviewRemarks && (
                          <div className="pt-2 border-t border-border/40">
                            <span className="text-muted-foreground text-[10px] uppercase block font-semibold">Verification Remarks</span>
                            <p className="mt-1 text-foreground bg-muted/40 p-2.5 rounded-lg border border-border/40 text-xs whitespace-pre-wrap">
                              {selectedRecord.reviewRemarks}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-3 rounded-lg border border-border bg-muted/20 text-center text-xs text-muted-foreground">
                      This transaction has already been {selectedRecord?.status?.toLowerCase()} and cannot be reviewed again.
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border flex justify-end shrink-0">
                    <Button type="button" variant="outline" size="sm" onClick={() => setReviewOpen(false)}>
                      Close
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={reviewForm.handleSubmit(onReviewSubmit)} className="flex flex-col flex-1 min-h-0 justify-between">
                  <div className="flex-1 overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden space-y-4 pr-1">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold uppercase text-muted-foreground">Select Decision</label>
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
                          className={`flex-1 gap-1.5 text-xs font-semibold ${actionType === "APPROVE" ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs" : ""}`}
                        >
                          <CheckCircle2Icon className="size-4" />
                          Approve
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
                          className="flex-1 gap-1.5 text-xs font-semibold"
                        >
                          <XCircleIcon className="size-4" />
                          Reject
                        </Button>
                      </div>
                    </div>

                    {actionType === "APPROVE" ? (
                      <div className="space-y-3.5">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-semibold uppercase text-muted-foreground">
                            Verification Remarks (Optional)
                          </label>
                          <Textarea
                            placeholder="e.g. Verified with physical invoice and branch note..."
                            {...reviewForm.register("reviewRemarks")}
                            className="text-xs resize-none"
                            rows={5}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold uppercase text-destructive flex items-center justify-between">
                          <span>Reason for Rejection *</span>
                          <span className="text-[10px] text-destructive font-normal">(mandatory)</span>
                        </label>
                        <Textarea
                          placeholder="Clearly explain why this entry is declined (e.g., incorrect branch allocation, duplicate bill, unauthorized expense)..."
                          {...reviewForm.register("reviewRemarks")}
                          className="text-xs border-destructive/40 focus:border-destructive resize-none"
                          rows={5}
                        />
                        {reviewForm.formState.errors.reviewRemarks && (
                          <p className="text-xs text-destructive">
                            {reviewForm.formState.errors.reviewRemarks.message}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-border flex items-center justify-end gap-2 shrink-0">
                    <Button type="button" variant="outline" size="sm" onClick={() => setReviewOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={reviewForm.formState.isSubmitting}
                      className={actionType === "APPROVE" ? "bg-primary hover:bg-primary/90 text-primary-foreground font-semibold" : "bg-destructive text-destructive-foreground hover:bg-destructive/90 font-semibold"}
                    >
                      {reviewForm.formState.isSubmitting ? (
                        <Loader2Icon className="size-3.5 animate-spin mr-1" />
                      ) : null}
                      Confirm {actionType === "APPROVE" ? "Approval" : "Rejection"}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
