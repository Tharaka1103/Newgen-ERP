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
  WalletIcon,
  LandmarkIcon,
  CheckCircle2Icon,
  StoreIcon,
  SparklesIcon,
} from "lucide-react";
import { toast } from "@/components/ui/toast";

interface CategoryOption {
  _id: string;
  name: string;
  type: "EXPENSE" | "INCOME";
  colorToken: string;
}

interface BankAccountOption {
  _id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
}

interface ShopOption {
  _id: string;
  name: string;
  code: string;
}

interface CommunicationItemOption {
  _id: string;
  itemCode: string;
  name: string;
  actualPrice: number;
  sellingPrice: number;
}

interface FinancesViewProps {
  initialRecords: any[];
  categories: CategoryOption[];
  userShopId: string | null;
  userShopName: string | null;
  userShopType?: string;
  userId: string;
  unassignedStaff?: boolean;
  bankAccounts?: BankAccountOption[];
  activeShops?: ShopOption[];
  communicationItems?: CommunicationItemOption[];
}

export function FinancesView({
  initialRecords,
  categories,
  userShopId,
  userShopName,
  userShopType = "STANDARD",
  userId,
  unassignedStaff = false,
  bankAccounts = [],
  activeShops = [],
  communicationItems = [],
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

  // Communication Shop Specific State
  const isCommShop = userShopType === "COMMUNICATION";
  const [commItemLookup, setCommItemLookup] = React.useState("");
  const [matchedItem, setMatchedItem] = React.useState<CommunicationItemOption | null>(null);
  const [isUnlistedItem, setIsUnlistedItem] = React.useState(false);
  const [commQuantity, setCommQuantity] = React.useState<number>(1);
  const [commSellingPrice, setCommSellingPrice] = React.useState<number>(0);
  const [commDiscountPrice, setCommDiscountPrice] = React.useState<number>(0);
  const [commIsRelatedToBranch, setCommIsRelatedToBranch] = React.useState(false);

  // Forms
  const createForm = useForm<CreateFinanceRecordInput>({
    resolver: zodResolver(createFinanceRecordSchema),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      shop: userShopId || "",
      category: categories[0]?._id || "",
      paymentMethod: "CASH",
      bankAccount: null,
      billNumber: "",
      reason: "",
      amount: 0,
      type: "EXPENSE",
      isCommunicationItem: isCommShop,
      itemCode: "",
      itemName: "",
      quantity: 1,
      actualPrice: 0,
      sellingPrice: 0,
      discountPrice: 0,
      isRelatedToBranch: false,
      relatedBranch: null,
      relatedBranchNote: "",
    },
  });

  const editForm = useForm<UpdateFinanceRecordInput>({
    resolver: zodResolver(updateFinanceRecordSchema),
    defaultValues: {
      recordId: "",
      date: "",
      category: "",
      paymentMethod: "CASH",
      bankAccount: null,
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

  // Communication item lookup handler
  const handleItemCodeChange = (code: string) => {
    setCommItemLookup(code);
    createForm.setValue("itemCode", code.toUpperCase());

    const clean = code.trim().toUpperCase();
    const found = communicationItems.find((it) => it.itemCode.toUpperCase() === clean);

    if (found) {
      setMatchedItem(found);
      setIsUnlistedItem(false);
      createForm.setValue("communicationItem", found._id);
      createForm.setValue("itemName", found.name);
      createForm.setValue("actualPrice", found.actualPrice);
      if (!createForm.getValues("reason")) {
        createForm.setValue("reason", `Sale: ${found.name} (${found.itemCode})`);
      }
    } else {
      setMatchedItem(null);
      createForm.setValue("communicationItem", null);
    }
  };

  // Recalculate net communication amount with quantity
  React.useEffect(() => {
    if (isCommShop) {
      const gross = commSellingPrice * commQuantity;
      const net = Math.max(0, gross - commDiscountPrice);
      createForm.setValue("amount", net);
      createForm.setValue("quantity", commQuantity);
      createForm.setValue("sellingPrice", commSellingPrice);
      createForm.setValue("discountPrice", commDiscountPrice);
    }
  }, [commSellingPrice, commDiscountPrice, commQuantity, isCommShop]);

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

    // Default to an INCOME category for Communication shop retail sale
    const defaultCategory = isCommShop
      ? categories.find((c) => c.type === "INCOME") || categories[0]
      : categories[0];

    // Reset comm state
    setCommItemLookup("");
    setMatchedItem(null);
    setIsUnlistedItem(false);
    setCommQuantity(1);
    setCommSellingPrice(0);
    setCommDiscountPrice(0);
    setCommIsRelatedToBranch(false);

    createForm.reset({
      date: new Date().toISOString().split("T")[0],
      shop: userShopId,
      category: defaultCategory?._id || "",
      paymentMethod: "CASH",
      bankAccount: null,
      billNumber: "Generating...",
      reason: "",
      amount: 0,
      type: defaultCategory?.type || (isCommShop ? "INCOME" : "EXPENSE"),
      isCommunicationItem: isCommShop,
      itemCode: "",
      itemName: "",
      quantity: 1,
      actualPrice: 0,
      sellingPrice: 0,
      discountPrice: 0,
      isRelatedToBranch: false,
      relatedBranch: null,
      relatedBranchNote: "",
    });

    setCreateOpen(true);

    const billRes = await getSuggestedBillNumberAction();
    if (billRes.success && billRes.billNumber) {
      createForm.setValue("billNumber", billRes.billNumber);
    }
  };

  const onCreateSubmit = async (data: CreateFinanceRecordInput) => {
    // If communication shop, validate amount & item name
    if (isCommShop) {
      if (!data.itemName && !data.itemCode) {
        toast.create({
          title: "Item required",
          description: "Please specify an item code or item name for this sale.",
          type: "error",
        });
        return;
      }
      if (data.amount <= 0) {
        toast.create({
          title: "Invalid Amount",
          description: "Net payable amount must be greater than zero.",
          type: "error",
        });
        return;
      }
    }

    const res = await createFinanceRecordAction(data);
    if (res.success) {
      const isAutoApproved = isCommShop && !data.isRelatedToBranch;
      toast.create({
        title: isAutoApproved ? "Transaction Approved" : "Record Submitted",
        description: isAutoApproved
          ? "Retail transaction recorded and instantly approved."
          : "Transaction registered and queued for verification.",
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
      bankAccount: rec.bankAccount?._id || rec.bankAccount || null,
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
        <span className="font-mono text-xs whitespace-nowrap">
          {new Date(row.original.date).toLocaleDateString()}
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
        <div className="max-w-[150px] min-w-0">
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
      header: "Reason / Item",
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
                Branch Ref: {r.relatedBranch.name}
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "amount",
      header: "Amount (LKR)",
      cell: ({ row }) => {
        const isIncome = row.original.type === "INCOME";
        return (
          <span className={`font-mono text-xs font-semibold ${isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}>
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
          <span className={`font-mono text-xs font-semibold ${bal >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
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
                <p className="text-xs">Locked: Record is finalized</p>
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

  const watchPaymentMethod = createForm.watch("paymentMethod");

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
            {isCommShop && (
              <Badge variant="secondary" className="font-mono text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                <StoreIcon className="size-3 mr-1" />
                COMMUNICATION
              </Badge>
            )}
          </h2>
          <p className="text-xs text-muted-foreground">
            {isCommShop
              ? "Record item sales, branch transactions, petty cash expenses, and customer receipts."
              : "Log daily petty cash, tuition fees, and operational expenses for your assigned branch."}
          </p>
        </div>

        <Button
          onClick={handleOpenCreate}
          disabled={unassignedStaff || !userShopId}
          size="sm"
          className="gap-1.5 text-xs font-semibold"
        >
          <PlusCircleIcon className="size-3.5" />
          Add New Record
        </Button>
      </div>

      {/* Filter Bar */}
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
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PlusCircleIcon className="size-4 text-primary" />
              {isCommShop ? "Record Communication Sale / Expense" : "Add Finance Record"}
            </DialogTitle>
            <DialogDescription>
              {isCommShop
                ? "Direct retail sales are auto-approved. Branch-related transfers require verifier approval."
                : `Submit an expense or deposit for ${userShopName}`}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4 py-2">
            {/* COMMUNICATION ITEM WORKFLOW */}
            {isCommShop && (
              <div className="space-y-3 p-3.5 rounded-lg border border-primary/20 bg-primary/5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-primary tracking-wider flex items-center gap-1.5">
                    <StoreIcon className="size-3.5" />
                    Item Code &amp; Details
                  </span>
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isUnlistedItem}
                      onChange={(e) => {
                        setIsUnlistedItem(e.target.checked);
                        if (e.target.checked) {
                          setMatchedItem(null);
                          createForm.setValue("communicationItem", null);
                        }
                      }}
                      className="size-3.5 rounded border-border"
                    />
                    <span>Unlisted / Ad-hoc Item</span>
                  </label>
                </div>

                {!isUnlistedItem ? (
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase">
                        Enter Item Code
                      </label>
                      <Input
                        placeholder="Type item code (e.g. SIM01, RLD50, ACC02)..."
                        value={commItemLookup}
                        onChange={(e) => handleItemCodeChange(e.target.value)}
                        className="h-9 text-xs font-mono font-semibold"
                        list="comm-items-datalist"
                      />
                      <datalist id="comm-items-datalist">
                        {communicationItems.map((item) => (
                          <option key={item._id} value={item.itemCode}>
                            {item.name} - (Cost: LKR {item.actualPrice})
                          </option>
                        ))}
                      </datalist>
                    </div>

                    {/* Matched Item Preview Card */}
                    {matchedItem && (
                      <div className="p-2.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground flex items-center gap-1">
                            <CheckCircle2Icon className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                            {matchedItem.name}
                          </span>
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {matchedItem.itemCode}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono pt-1">
                          <span>Unit Cost: LKR {Number(matchedItem.actualPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">Catalog Item</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2.5 pt-1">
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-muted-foreground uppercase">
                          Item Code (Optional)
                        </label>
                        <Input
                          placeholder="E.g. CUSTOM01"
                          {...createForm.register("itemCode")}
                          className="h-8 text-xs font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-muted-foreground uppercase">
                          Item Name *
                        </label>
                        <Input
                          placeholder="E.g. Phone cover repair..."
                          {...createForm.register("itemName")}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase">
                        Actual Cost Price (LKR)
                      </label>
                      <Input
                        type="number"
                        step="any"
                        placeholder="0.00"
                        {...createForm.register("actualPrice", { valueAsNumber: true })}
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                  </div>
                )}

                {/* Quantity, Selling Price & Discount */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase">
                      Quantity *
                    </label>
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      placeholder="1"
                      value={commQuantity}
                      onChange={(e) => setCommQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="h-9 text-xs font-mono font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase">
                      Price / Unit (LKR) *
                    </label>
                    <Input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={commSellingPrice || ""}
                      onChange={(e) => setCommSellingPrice(Number(e.target.value) || 0)}
                      className="h-9 text-xs font-mono font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase">
                      Discount (LKR)
                    </label>
                    <Input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={commDiscountPrice || ""}
                      onChange={(e) => setCommDiscountPrice(Number(e.target.value) || 0)}
                      className="h-9 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase">
                      Net Amount (LKR)
                    </label>
                    <div className="h-9 px-3 rounded-md border border-border bg-muted/50 flex items-center font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      LKR {Math.max(0, commSellingPrice * commQuantity - commDiscountPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                {/* Calculation Summary breakdown */}
                {commSellingPrice > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-md bg-muted/40 border border-border text-[11px] font-mono">
                    <span className="text-muted-foreground">
                      Subtotal: {commQuantity} × LKR {commSellingPrice.toLocaleString()} = <strong className="text-foreground">LKR {(commSellingPrice * commQuantity).toLocaleString()}</strong>
                    </span>
                    {(matchedItem?.actualPrice || createForm.getValues("actualPrice")) ? (
                      <span className="text-muted-foreground">
                        Total Cost: {commQuantity} × LKR {(matchedItem?.actualPrice || createForm.getValues("actualPrice") || 0).toLocaleString()} = <strong className="text-foreground">LKR {((matchedItem?.actualPrice || createForm.getValues("actualPrice") || 0) * commQuantity).toLocaleString()}</strong>
                      </span>
                    ) : null}
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      Est. Profit: LKR {(Math.max(0, commSellingPrice * commQuantity - commDiscountPrice) - ((matchedItem?.actualPrice || createForm.getValues("actualPrice") || 0) * commQuantity)).toLocaleString()}
                    </span>
                  </div>
                )}

                {/* Branch Relationship Checkbox */}
                <div className="pt-2 border-t border-border/40 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground">
                    <input
                      type="checkbox"
                      checked={commIsRelatedToBranch}
                      onChange={(e) => {
                        setCommIsRelatedToBranch(e.target.checked);
                        createForm.setValue("isRelatedToBranch", e.target.checked);
                        if (!e.target.checked) {
                          createForm.setValue("relatedBranch", null);
                          createForm.setValue("relatedBranchNote", "");
                        }
                      }}
                      className="size-4 rounded border-border"
                    />
                    <span>Is this transaction related to another branch / shop?</span>
                  </label>

                  {commIsRelatedToBranch ? (
                    <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 font-semibold">
                        <AlertTriangleIcon className="size-3.5" />
                        Requires Verifier Review &amp; Approval
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-semibold text-muted-foreground">
                            Related Branch
                          </label>
                          <select
                            {...createForm.register("relatedBranch")}
                            className="w-full h-8 rounded-md border border-border bg-card text-foreground px-2 text-xs font-medium outline-none focus:border-ring [color-scheme:light] dark:[color-scheme:dark]"
                          >
                            <option value="" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Select Branch...</option>
                            {activeShops
                              .filter((s) => s._id !== userShopId)
                              .map((s) => (
                                <option key={s._id} value={s._id} className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
                                  {s.name} ({s.code})
                                </option>
                              ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-semibold text-muted-foreground">
                            Branch Note
                          </label>
                          <Input
                            placeholder="Reason for cross-branch transfer..."
                            {...createForm.register("relatedBranchNote")}
                            className="h-8 text-xs bg-background"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                      Direct Retail Sale: Auto-approved upon recording.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STANDARD FORM FIELDS */}
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
                  <option value="PETTY_CASH" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Petty Cash</option>
                  <option value="BANK_TRANSFER" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Bank Transfer</option>
                  <option value="CHEQUE" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Cheque</option>
                  <option value="ONLINE" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Online</option>
                </select>
              </div>
            </div>

            {/* If Bank Transfer / Online / Cheque: Show Bank Selector */}
            {(watchPaymentMethod === "BANK_TRANSFER" ||
              watchPaymentMethod === "ONLINE" ||
              watchPaymentMethod === "CHEQUE") && (
                <div className="space-y-1.5 p-2.5 rounded-lg border border-border bg-muted/30">
                  <label className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1.5">
                    <LandmarkIcon className="size-3.5 text-primary" />
                    Select Bank Account
                  </label>
                  <select
                    {...createForm.register("bankAccount")}
                    className="w-full h-9 rounded-md border border-border bg-card text-foreground px-3 text-xs font-medium outline-none focus:border-ring [color-scheme:light] dark:[color-scheme:dark]"
                  >
                    <option value="" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Select Bank Account...</option>
                    {bankAccounts.map((b) => (
                      <option key={b._id} value={b._id} className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
                        {b.bankName} - {b.accountName} ({b.accountNumber})
                      </option>
                    ))}
                  </select>
                </div>
              )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Bill Number</label>
                <Input {...createForm.register("billNumber")} className="h-9 text-xs font-mono" />
                {createForm.formState.errors.billNumber && (
                  <p className="text-xs text-destructive">{createForm.formState.errors.billNumber.message}</p>
                )}
              </div>

              {!isCommShop && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">Amount (LKR)</label>
                  <Input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    {...createForm.register("amount", { valueAsNumber: true })}
                    className="h-9 text-xs font-mono font-semibold"
                  />
                  {createForm.formState.errors.amount && (
                    <p className="text-xs text-destructive">{createForm.formState.errors.amount.message}</p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Reason / Description</label>
              <Textarea
                placeholder="Details of expense, purpose, or receipt explanation..."
                {...createForm.register("reason")}
                className="text-xs"
                rows={2}
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
                {isCommShop && !commIsRelatedToBranch ? "Record & Finalize Sale" : "Submit for Approval"}
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
                <label className="text-xs font-semibold uppercase text-muted-foreground">Payment Method</label>
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
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Amount (LKR)</label>
              <Input
                type="number"
                step="any"
                {...editForm.register("amount", { valueAsNumber: true })}
                className="h-9 text-xs font-mono"
              />
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
