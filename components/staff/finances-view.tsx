"use client";

import * as React from "react";
import {
  getFinanceRecordsAction,
  createFinanceRecordAction,
  createCommunicationSaleBatchAction,
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
  ShoppingCartIcon,
  ReceiptTextIcon,
  SendIcon,
} from "lucide-react";
import { toast } from "@/components/ui/toast";

interface CommCartItem {
  id: string;
  communicationItem?: string | null;
  itemCode: string;
  itemName: string;
  actualPrice: number;
  quantity: number;
  totalPrice: number;
  discountPrice: number;
  netAmount: number;
}

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
  const [commTotalPrice, setCommTotalPrice] = React.useState<number>(0);
  const [commDiscountPrice, setCommDiscountPrice] = React.useState<number>(0);
  const [commCustomItemName, setCommCustomItemName] = React.useState("");
  const [commCustomCostPrice, setCommCustomCostPrice] = React.useState<number>(0);
  const [commIsRelatedToBranch, setCommIsRelatedToBranch] = React.useState(false);
  const [commRelatedBranch, setCommRelatedBranch] = React.useState<string | null>(null);
  const [commRelatedBranchNote, setCommRelatedBranchNote] = React.useState("");
  const [commCartItems, setCommCartItems] = React.useState<CommCartItem[]>([]);
  const [alwaysOnForm, setAlwaysOnForm] = React.useState(false);
  const [submittingCommSale, setSubmittingCommSale] = React.useState(false);

  // Load "always on this form" setting
  React.useEffect(() => {
    if (typeof window !== "undefined" && isCommShop) {
      const saved = localStorage.getItem("comm_always_on_form") === "true";
      if (saved) {
        setAlwaysOnForm(true);
        setCreateOpen(true);
      }
    }
  }, [isCommShop]);

  // Prevent closing when "always on this form" is active
  const handleCreateOpenChange = (open: boolean) => {
    if (!open && isCommShop && alwaysOnForm) {
      toast.create({
        title: "Form Locked Open",
        description: "This form is set to stay open. Uncheck 'Always on this form' at the bottom to close.",
        type: "info",
      });
      setCreateOpen(true);
      return;
    }
    setCreateOpen(open);
  };

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

    const clean = code.trim().toUpperCase();
    const found = communicationItems.find((it) => it.itemCode.toUpperCase() === clean);

    if (found) {
      setMatchedItem(found);
      setIsUnlistedItem(false);
    } else {
      setMatchedItem(null);
    }
  };

  // Add Item to Multi-Item Cart
  const handleAddItemToCart = () => {
    const itemName = isUnlistedItem
      ? commCustomItemName.trim()
      : (matchedItem?.name || commItemLookup.trim());
    const itemCode = isUnlistedItem
      ? (commItemLookup.trim().toUpperCase() || "CUSTOM")
      : (matchedItem?.itemCode || commItemLookup.trim().toUpperCase());

    if (isUnlistedItem && !commCustomItemName.trim()) {
      toast.create({
        title: "Item Name Required",
        description: "Please specify the item name for this unlisted item.",
        type: "error",
      });
      return;
    }

    if (!itemName) {
      toast.create({
        title: "Item Name Required",
        description: "Please specify an item code or name.",
        type: "error",
      });
      return;
    }

    if (commQuantity <= 0) {
      toast.create({
        title: "Invalid Quantity",
        description: "Quantity must be at least 1.",
        type: "error",
      });
      return;
    }

    if (commTotalPrice <= 0) {
      toast.create({
        title: "Invalid Price",
        description: "Total price for item must be greater than zero.",
        type: "error",
      });
      return;
    }

    const discount = Math.max(0, commDiscountPrice || 0);
    const net = Math.max(0, commTotalPrice - discount);
    const actualPrice = isUnlistedItem ? (commCustomCostPrice || 0) : (matchedItem?.actualPrice || 0);

    const newItem: CommCartItem = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      communicationItem: matchedItem?._id || null,
      itemCode,
      itemName,
      actualPrice,
      quantity: commQuantity,
      totalPrice: commTotalPrice,
      discountPrice: discount,
      netAmount: net,
    };

    setCommCartItems((prev) => [...prev, newItem]);

    // Reset item inputs ready for next item
    setCommItemLookup("");
    setMatchedItem(null);
    setIsUnlistedItem(false);
    setCommCustomItemName("");
    setCommCustomCostPrice(0);
    setCommQuantity(1);
    setCommTotalPrice(0);
    setCommDiscountPrice(0);
  };

  const handleRemoveCartItem = (id: string) => {
    setCommCartItems((prev) => prev.filter((it) => it.id !== id));
  };

  // Complete and record batch sale
  const handleBatchCommSale = async () => {
    if (!userShopId) {
      toast.create({
        title: "No branch assigned",
        description: "Branch assignment is required to record sales.",
        type: "error",
      });
      return;
    }

    if (commIsRelatedToBranch && !commRelatedBranch) {
      toast.create({
        title: "Related Branch Required",
        description: "Please select the related branch for this cross-branch transaction.",
        type: "error",
      });
      return;
    }

    let finalItems = [...commCartItems];

    // If cart is empty, check if user filled out the current input fields without clicking "Add Item"
    if (finalItems.length === 0) {
      const itemName = isUnlistedItem
        ? commCustomItemName.trim()
        : (matchedItem?.name || commItemLookup.trim());
      const itemCode = isUnlistedItem
        ? (commItemLookup.trim().toUpperCase() || "CUSTOM")
        : (matchedItem?.itemCode || commItemLookup.trim().toUpperCase());

      if (itemName && commTotalPrice > 0) {
        const discount = Math.max(0, commDiscountPrice || 0);
        const net = Math.max(0, commTotalPrice - discount);
        const actualPrice = isUnlistedItem ? (commCustomCostPrice || 0) : (matchedItem?.actualPrice || 0);

        finalItems.push({
          id: `${Date.now()}`,
          communicationItem: matchedItem?._id || null,
          itemCode,
          itemName,
          actualPrice,
          quantity: commQuantity || 1,
          totalPrice: commTotalPrice,
          discountPrice: discount,
          netAmount: net,
        });
      }
    }

    if (finalItems.length === 0) {
      toast.create({
        title: "No items to record",
        description: "Please enter item details, quantity, and total price to record the sale.",
        type: "warning",
      });
      return;
    }

    setSubmittingCommSale(true);
    try {
      const res = await createCommunicationSaleBatchAction({
        shopId: userShopId,
        items: finalItems.map((it) => ({
          communicationItem: it.communicationItem,
          itemCode: it.itemCode,
          itemName: it.itemName,
          quantity: it.quantity,
          actualPrice: it.actualPrice,
          totalPrice: it.totalPrice,
          discountPrice: it.discountPrice,
          amount: it.netAmount,
        })),
        isRelatedToBranch: commIsRelatedToBranch,
        relatedBranch: commRelatedBranch,
        relatedBranchNote: commRelatedBranchNote,
      });

      if (res.success) {
        toast.create({
          title: res.isAutoApproved ? "Sale Recorded & Approved" : "Submitted for Approval",
          description: res.isAutoApproved
            ? `Bill: ${res.billNumber} • ${res.itemsCount} item(s) • Total: LKR ${Number(res.grandTotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
            : `Bill: ${res.billNumber} • ${res.itemsCount} item(s) submitted for verifier approval.`,
          type: "success",
        });

        // Reset all inputs and cart items - DO NOT CLOSE FORM
        setCommCartItems([]);
        setCommItemLookup("");
        setMatchedItem(null);
        setIsUnlistedItem(false);
        setCommCustomItemName("");
        setCommCustomCostPrice(0);
        setCommQuantity(1);
        setCommTotalPrice(0);
        setCommDiscountPrice(0);
        setCommIsRelatedToBranch(false);
        setCommRelatedBranch(null);
        setCommRelatedBranchNote("");

        refreshRecords();
      } else {
        toast.create({
          title: "Failed to record sale",
          description: res.error || "An error occurred",
          type: "error",
        });
      }
    } catch {
      toast.create({
        title: "Error",
        description: "An unexpected error occurred while saving the sale.",
        type: "error",
      });
    } finally {
      setSubmittingCommSale(false);
    }
  };

  // Open Create Dialog
  const handleOpenCreate = async () => {
    if (!userShopId) {
      toast.create({
        title: "No branch assigned",
        description: "You cannot create transactions until an admin assigns you to a branch.",
        type: "error",
      });
      return;
    }

    // Reset comm state
    setCommItemLookup("");
    setMatchedItem(null);
    setIsUnlistedItem(false);
    setCommCustomItemName("");
    setCommCustomCostPrice(0);
    setCommQuantity(1);
    setCommTotalPrice(0);
    setCommDiscountPrice(0);
    setCommIsRelatedToBranch(false);
    setCommRelatedBranch(null);
    setCommRelatedBranchNote("");
    setCommCartItems([]);

    setCreateOpen(true);

    if (!isCommShop) {
      const defaultCategory = categories[0];
      createForm.reset({
        date: new Date().toISOString().split("T")[0],
        shop: userShopId,
        category: defaultCategory?._id || "",
        paymentMethod: "CASH",
        bankAccount: null,
        billNumber: "Generating...",
        reason: "",
        amount: 0,
        type: defaultCategory?.type || "EXPENSE",
        isCommunicationItem: false,
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

      const billRes = await getSuggestedBillNumberAction();
      if (billRes.success && billRes.billNumber) {
        createForm.setValue("billNumber", billRes.billNumber);
      }
    }
  };

  const onCreateSubmit = async (data: CreateFinanceRecordInput) => {
    const res = await createFinanceRecordAction(data);
    if (res.success) {
      toast.create({
        title: "Record Submitted",
        description: "Transaction registered and queued for verification.",
        type: "success",
      });
      if (!alwaysOnForm) {
        setCreateOpen(false);
      }
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
      {/* CREATE RECORD MODAL */}
      <Dialog open={createOpen} onOpenChange={handleCreateOpenChange}>
        <DialogContent
          className={
            isCommShop
              ? "sm:max-w-3xl md:max-w-4xl max-h-[92vh] overflow-y-auto"
              : "sm:max-w-lg max-h-[90vh] overflow-y-auto"
          }
        >
          {isCommShop ? (
            /* ========================================================
               COMMUNICATION SHOP POS MULTI-ITEM SALES FORM
               ======================================================== */
            <div className="space-y-4 py-1">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base font-bold">
                  <StoreIcon className="size-5 text-primary" />
                  Record Communication Sale
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Direct retail sales with multi-item entry. Instant auto-approval upon recording.
                </DialogDescription>
              </DialogHeader>

              {/* ITEM ENTRY CARD */}
              <div className="space-y-3 p-4 rounded-xl border border-border bg-card shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-primary tracking-wider flex items-center gap-1.5">
                    <SparklesIcon className="size-3.5" />
                    Item Details
                  </span>
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isUnlistedItem}
                      onChange={(e) => {
                        setIsUnlistedItem(e.target.checked);
                        if (e.target.checked) {
                          setMatchedItem(null);
                        }
                      }}
                      className="size-3.5 rounded border-border"
                    />
                    <span>Unlisted / Custom Item</span>
                  </label>
                </div>

                {!isUnlistedItem ? (
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase">
                        Enter Item Code
                      </label>
                      <Input
                        placeholder="Type item code (e.g. 0010, SIM01, RLD50)..."
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
                      <div className="flex items-center justify-between p-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-xs">
                        <div className="flex items-center gap-2">
                          <CheckCircle2Icon className="size-4 text-emerald-600 dark:text-emerald-400" />
                          <div>
                            <span className="font-semibold text-foreground">{matchedItem.name}</span>
                            <span className="text-muted-foreground ml-2 font-mono text-[11px]">
                              (Cost: LKR {Number(matchedItem.actualPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })})
                            </span>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {matchedItem.itemCode}
                        </Badge>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-muted-foreground uppercase">
                          Item Code (Optional)
                        </label>
                        <Input
                          placeholder="e.g. CUSTOM"
                          value={commItemLookup}
                          onChange={(e) => setCommItemLookup(e.target.value)}
                          className="h-9 text-xs font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-muted-foreground uppercase">
                          Item Name *
                        </label>
                        <Input
                          placeholder="e.g. Phone cover repair / Binding..."
                          value={commCustomItemName}
                          onChange={(e) => setCommCustomItemName(e.target.value)}
                          className="h-9 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-muted-foreground uppercase flex items-center justify-between">
                          <span>Unit Cost Price (LKR) *</span>
                          <span className="text-[10px] text-muted-foreground font-normal lowercase">(for profit)</span>
                        </label>
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          placeholder="0.00"
                          value={commCustomCostPrice || ""}
                          onChange={(e) => setCommCustomCostPrice(Math.max(0, Number(e.target.value) || 0))}
                          className="h-9 text-xs font-mono font-semibold"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* QUANTITY, TOTAL PRICE, DISCOUNT, NET */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
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
                      Total Price for item (LKR) *
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0.00"
                      value={commTotalPrice || ""}
                      onChange={(e) => setCommTotalPrice(Math.max(0, Number(e.target.value) || 0))}
                      className="h-9 text-xs font-mono font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase">
                      Discount (LKR)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0.00"
                      value={commDiscountPrice || ""}
                      onChange={(e) => setCommDiscountPrice(Math.max(0, Number(e.target.value) || 0))}
                      className="h-9 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase">
                      Net Total (LKR)
                    </label>
                    <div className="h-9 px-3 rounded-md border border-border bg-muted/40 flex items-center font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      LKR {Math.max(0, commTotalPrice - commDiscountPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <Button
                    type="button"
                    onClick={handleAddItemToCart}
                    size="sm"
                    className="gap-1.5 text-xs font-semibold"
                  >
                    <PlusCircleIcon className="size-3.5" />
                    Add Item to Sale
                  </Button>
                </div>
              </div>

              {/* MULTI-ITEM SALE LIST TABLE */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                  <span className="flex items-center gap-1.5 uppercase text-muted-foreground tracking-wider text-[11px]">
                    <ShoppingCartIcon className="size-3.5 text-primary" />
                    Items in this Sale ({commCartItems.length})
                  </span>
                  {commCartItems.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => setCommCartItems([])}
                      className="text-[11px] text-muted-foreground hover:text-destructive h-6 px-2"
                    >
                      Clear List
                    </Button>
                  )}
                </div>

                {commCartItems.length > 0 ? (
                  <div className="rounded-xl border border-border overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50 border-b border-border text-[11px] font-semibold text-muted-foreground">
                        <tr>
                          <th className="py-2 px-3 text-left w-8">#</th>
                          <th className="py-2 px-3 text-left">Item</th>
                          <th className="py-2 px-3 text-center w-16">Qty</th>
                          <th className="py-2 px-3 text-right">Total Price</th>
                          <th className="py-2 px-3 text-right">Discount</th>
                          <th className="py-2 px-3 text-right">Net Amount</th>
                          <th className="py-2 px-3 text-center w-12">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border font-mono">
                        {commCartItems.map((item, idx) => (
                          <tr key={item.id} className="hover:bg-muted/30">
                            <td className="py-2 px-3 text-muted-foreground text-center">{idx + 1}</td>
                            <td className="py-2 px-3 font-sans font-medium text-foreground">
                              <div>{item.itemName}</div>
                              <div className="text-[10px] text-muted-foreground font-mono flex items-center gap-2">
                                <span>{item.itemCode || "ITEM"}</span>
                                <span>•</span>
                                <span>Unit Cost: LKR {Number(item.actualPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                              </div>
                            </td>
                            <td className="py-2 px-3 text-center">{item.quantity}</td>
                            <td className="py-2 px-3 text-right">
                              LKR {item.totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2 px-3 text-right text-muted-foreground">
                              {item.discountPrice > 0 ? `LKR ${item.discountPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "-"}
                            </td>
                            <td className="py-2 px-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                              LKR {item.netAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => handleRemoveCartItem(item.id)}
                                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                title="Remove Item"
                              >
                                <Trash2Icon className="size-3.5" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-muted/30 border-t border-border font-mono font-bold">
                        <tr>
                          <td colSpan={5} className="py-2.5 px-3 text-right text-xs uppercase text-foreground">
                            Grand Total ({commCartItems.length} {commCartItems.length === 1 ? "item" : "items"}):
                          </td>
                          <td className="py-2.5 px-3 text-right text-sm text-emerald-600 dark:text-emerald-400">
                            LKR {commCartItems.reduce((acc, i) => acc + i.netAmount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <div className="p-6 rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground space-y-1">
                    <p className="font-medium text-foreground">No items added to this sale yet.</p>
                    <p className="text-[11px]">Enter item code, quantity, and total price above, then click &quot;+ Add Item to Sale&quot;.</p>
                  </div>
                )}
              </div>

              {/* CROSS-BRANCH TRANSFER RELATIONSHIP */}
              <div className="p-3.5 rounded-xl border border-border bg-card space-y-3">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-foreground select-none">
                  <input
                    type="checkbox"
                    checked={commIsRelatedToBranch}
                    onChange={(e) => {
                      setCommIsRelatedToBranch(e.target.checked);
                      if (!e.target.checked) {
                        setCommRelatedBranch(null);
                        setCommRelatedBranchNote("");
                      }
                    }}
                    className="size-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <span>Is this transaction related to another branch / shop?</span>
                </label>

                {commIsRelatedToBranch && (
                  <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 space-y-2.5">
                    <div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 font-semibold">
                      <AlertTriangleIcon className="size-3.5" />
                      Cross-Branch Transfer: Requires Verifier Review &amp; Approval
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-semibold text-muted-foreground">
                          Related Branch / Shop *
                        </label>
                        <select
                          value={commRelatedBranch || ""}
                          onChange={(e) => setCommRelatedBranch(e.target.value || null)}
                          className="w-full h-8 rounded-md border border-border bg-card text-foreground px-2 text-xs font-medium outline-none focus:border-ring [color-scheme:light] dark:[color-scheme:dark]"
                        >
                          <option value="" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
                            Select Branch / Shop...
                          </option>
                          {activeShops
                            .filter((s) => s._id !== userShopId)
                            .map((s) => (
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
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-semibold text-muted-foreground">
                          Transfer / Cross-Branch Note
                        </label>
                        <Input
                          placeholder="Reason for cross-branch transfer / note..."
                          value={commRelatedBranchNote}
                          onChange={(e) => setCommRelatedBranchNote(e.target.value)}
                          className="h-8 text-xs bg-background"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* FOOTER */}
              <div className="pt-3 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground select-none">
                  <input
                    type="checkbox"
                    checked={alwaysOnForm}
                    onChange={(e) => {
                      setAlwaysOnForm(e.target.checked);
                      if (typeof window !== "undefined") {
                        localStorage.setItem("comm_always_on_form", e.target.checked ? "true" : "false");
                      }
                    }}
                    className="size-4 rounded border-border"
                  />
                  <span>Always on this form (Keep form open for continuous sales)</span>
                </label>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (alwaysOnForm) {
                        toast.create({
                          title: "Form Locked Open",
                          description: "Uncheck 'Always on this form' at the bottom to close.",
                          type: "info",
                        });
                      } else {
                        setCreateOpen(false);
                      }
                    }}
                  >
                    Close Form
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleBatchCommSale}
                    disabled={submittingCommSale}
                    className="gap-1.5 font-semibold"
                  >
                    {submittingCommSale ? (
                      <Loader2Icon className="size-3.5 animate-spin" />
                    ) : commIsRelatedToBranch ? (
                      <SendIcon className="size-3.5" />
                    ) : (
                      <ReceiptTextIcon className="size-3.5" />
                    )}
                    {commIsRelatedToBranch ? "Submit for Approval" : "Complete & Record Sale"}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* ========================================================
               STANDARD SHOP FINANCE FORM (TUITION, VOCATIONAL, ETC.)
               ======================================================== */
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <PlusCircleIcon className="size-4 text-primary" />
                  Add Finance Record
                </DialogTitle>
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
                    Submit for Approval
                  </Button>
                </DialogFooter>
              </form>
            </>
          )}
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
