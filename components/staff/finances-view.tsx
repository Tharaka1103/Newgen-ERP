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
import {
  searchCreditCustomerAction,
  repayCustomerDebtAction,
} from "@/actions/credit";
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
  HandCoinsIcon,
  UserCheckIcon,
  CreditCardIcon,
  DollarSignIcon,
  AlertOctagonIcon,
  SmartphoneIcon,
  ZapIcon,
  PackageIcon,
} from "lucide-react";
import { toast } from "@/components/ui/toast";
import { recordItemWastageAction } from "@/actions/communication";

interface CommCartItem {
  id: string;
  communicationItem?: string | null;
  itemCode: string;
  itemName: string;
  actualPrice: number;
  sellingPrice: number;
  quantity: number;
  totalPrice: number;
  discountPrice: number;
  additionalCost?: number;
  netAmount: number;
  isTelecomReload?: boolean;
  telecomType?: "CUSTOM" | "PACKAGE";
  packageBasePrice?: number;
  telecomOperator?: "DIALOG" | "MOBITEL" | "AIRTEL" | "HUTCH" | "OTHER" | null;
  commissionRate?: number;
  commissionEarned?: number;
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
  actualPrice?: number;
  sellingPrice?: number;
  isTelecomReload?: boolean;
  telecomOperator?: "DIALOG" | "MOBITEL" | "AIRTEL" | "HUTCH" | "OTHER" | null;
  commissionRate?: number;
}

export function isTelecomReloadItem(item?: {
  isTelecomReload?: boolean;
  telecomOperator?: string | null;
  itemCode?: string;
  name?: string;
} | null): boolean {
  if (!item) return false;
  if (item.isTelecomReload === true) return true;
  if (item.telecomOperator && item.telecomOperator !== "OTHER") return true;
  const str = `${item.itemCode || ""} ${item.name || ""}`.toUpperCase();
  return (
    str.includes("DIALOG") ||
    str.includes("MOBITEL") ||
    str.includes("AIRTEL") ||
    str.includes("HUTCH") ||
    str.includes("RELOAD") ||
    str.includes("TOPUP") ||
    str.includes("TOP-UP")
  );
}

export function getTelecomOperator(item?: {
  telecomOperator?: string | null;
  itemCode?: string;
  name?: string;
} | null): "DIALOG" | "MOBITEL" | "AIRTEL" | "HUTCH" | "OTHER" {
  if (item?.telecomOperator && item.telecomOperator !== "OTHER") {
    return item.telecomOperator as any;
  }
  const str = `${item?.itemCode || ""} ${item?.name || ""}`.toUpperCase();
  if (str.includes("DIALOG")) return "DIALOG";
  if (str.includes("MOBITEL")) return "MOBITEL";
  if (str.includes("AIRTEL")) return "AIRTEL";
  if (str.includes("HUTCH")) return "HUTCH";
  return "OTHER";
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
  const [categoryFilter, setCategoryFilter] = React.useState("ALL");  // "ALL" | "COMM" | "GENERAL" | <categoryId>

  // Modals
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteConfirmRecord, setDeleteConfirmRecord] = React.useState<any | null>(null);
  const [selectedRecord, setSelectedRecord] = React.useState<any | null>(null);

  // Communication Shop Specific State
  const isCommShop = userShopType === "COMMUNICATION";
  const [commEntryMode, setCommEntryMode] = React.useState<"POS" | "STANDARD">("POS");
  const [commItemLookup, setCommItemLookup] = React.useState("");
  const [matchedItem, setMatchedItem] = React.useState<CommunicationItemOption | null>(null);
  const [isUnlistedItem, setIsUnlistedItem] = React.useState(false);
  const [commQuantity, setCommQuantity] = React.useState<number>(1);
  const [commUnitPrice, setCommUnitPrice] = React.useState<number>(0);
  const [commDiscountPrice, setCommDiscountPrice] = React.useState<number>(0);
  const [commAdditionalCost, setCommAdditionalCost] = React.useState<number>(0);
  const [commCustomItemName, setCommCustomItemName] = React.useState("");
  const [commCustomCostPrice, setCommCustomCostPrice] = React.useState<number>(0);
  const [commTelecomType, setCommTelecomType] = React.useState<"CUSTOM" | "PACKAGE">("CUSTOM");
  const [commPackageBasePrice, setCommPackageBasePrice] = React.useState<number>(0);
  const [commIsRelatedToBranch, setCommIsRelatedToBranch] = React.useState(false);
  const [commRelatedBranch, setCommRelatedBranch] = React.useState<string | null>(null);
  const [commRelatedBranchNote, setCommRelatedBranchNote] = React.useState("");
  const [commCartItems, setCommCartItems] = React.useState<CommCartItem[]>([]);
  const [alwaysOnForm, setAlwaysOnForm] = React.useState(false);
  const [submittingCommSale, setSubmittingCommSale] = React.useState(false);

  // Communication Credit & Payment Method State
  const [commPaymentMethod, setCommPaymentMethod] = React.useState<"CASH" | "CREDIT" | "BANK_TRANSFER" | "ONLINE">("CASH");
  const [commCustomerPhone, setCommCustomerPhone] = React.useState("");
  const [commCustomerName, setCommCustomerName] = React.useState("");
  const [existingCreditCustomer, setExistingCreditCustomer] = React.useState<{
    _id: string;
    name: string;
    phone: string;
    currentBalance: number;
  } | null>(null);
  const [commBankAccountId, setCommBankAccountId] = React.useState<string | null>(null);

  // Debt Repayment Modal State
  const [debtRepayOpen, setDebtRepayOpen] = React.useState(false);
  const [repayPhone, setRepayPhone] = React.useState("");
  const [repayCustomer, setRepayCustomer] = React.useState<{
    _id: string;
    name: string;
    phone: string;
    currentBalance: number;
    shop?: {
      _id: string;
      name: string;
      code: string;
    } | null;
  } | null>(null);
  const [repayAmount, setRepayAmount] = React.useState<number>(0);
  const [repayMethod, setRepayMethod] = React.useState<"CASH" | "BANK_TRANSFER" | "ONLINE">("CASH");
  const [repayBankId, setRepayBankId] = React.useState<string | null>(null);
  const [repayNote, setRepayNote] = React.useState("");
  const [submittingRepay, setSubmittingRepay] = React.useState(false);
  const [searchingCustomer, setSearchingCustomer] = React.useState(false);

  const handleLookupCustomer = async (phone: string, target: "SALE" | "REPAY") => {
    if (phone.trim().length >= 3) {
      if (target === "REPAY") setSearchingCustomer(true);
      const res = await searchCreditCustomerAction(phone, userShopId || undefined);
      if (target === "REPAY") setSearchingCustomer(false);

      if (res.success && res.customer) {
        if (target === "SALE") {
          setExistingCreditCustomer(res.customer);
          setCommCustomerName(res.customer.name);
        } else {
          setRepayCustomer(res.customer);
          setRepayAmount(res.customer.currentBalance);
        }
      } else {
        if (target === "SALE") {
          setExistingCreditCustomer(null);
        } else {
          setRepayCustomer(null);
        }
      }
    } else {
      if (target === "SALE") setExistingCreditCustomer(null);
      if (target === "REPAY") setRepayCustomer(null);
    }
  };

  const handleDebtRepaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userShopId || !repayCustomer) return;

    if (repayAmount <= 0) {
      toast.create({
        title: "Invalid Amount",
        description: "Repayment amount must be greater than zero.",
        type: "error",
      });
      return;
    }

    if (repayAmount > repayCustomer.currentBalance) {
      toast.create({
        title: "Amount Exceeds Debt",
        description: `Cannot repay more than outstanding debt (LKR ${repayCustomer.currentBalance.toLocaleString()}).`,
        type: "error",
      });
      return;
    }

    setSubmittingRepay(true);
    try {
      const isCross = Boolean(repayCustomer.shop && repayCustomer.shop._id !== userShopId);
      const res = await repayCustomerDebtAction({
        shopId: userShopId,
        customerCreditId: repayCustomer._id,
        amount: repayAmount,
        paymentMethod: repayMethod,
        bankAccountId: repayBankId,
        note: repayNote,
        isCrossBranchPayment: isCross,
        collectingShop: userShopId,
        beneficiaryShop: repayCustomer.shop?._id || null,
      });

      if (res.success) {
        toast.create({
          title: "Debt Repayment Recorded",
          description: res.message || "Payment collected and shop balance updated.",
          type: "success",
        });
        setDebtRepayOpen(false);
        setRepayPhone("");
        setRepayCustomer(null);
        setRepayAmount(0);
        setRepayNote("");
        refreshRecords();
      } else {
        toast.create({
          title: "Failed to record payment",
          description: res.error || "An error occurred",
          type: "error",
        });
      }
    } catch {
      toast.create({
        title: "Error",
        description: "Failed to connect to server.",
        type: "error",
      });
    } finally {
      setSubmittingRepay(false);
    }
  };

  // Wastage & Defect Logging State
  const [wastageOpen, setWastageOpen] = React.useState(false);
  const [wastageItemLookup, setWastageItemLookup] = React.useState("");
  const [wastageMatchedItem, setWastageMatchedItem] = React.useState<CommunicationItemOption | null>(null);
  const [wastageQuantity, setWastageQuantity] = React.useState<number>(1);
  const [wastageReason, setWastageReason] = React.useState("");
  const [submittingWastage, setSubmittingWastage] = React.useState(false);

  const handleWastageItemCodeChange = (codeOrName: string) => {
    setWastageItemLookup(codeOrName);
    const clean = codeOrName.trim().toUpperCase();
    const found = communicationItems.find(
      (it) => it.itemCode.toUpperCase() === clean || it.name.toLowerCase() === codeOrName.trim().toLowerCase()
    );
    if (found) {
      setWastageMatchedItem(found);
    } else {
      setWastageMatchedItem(null);
    }
  };

  const handleWastageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userShopId) return;

    if (!wastageMatchedItem) {
      toast.create({
        title: "Item Required",
        description: "Please search and select a registered item from inventory.",
        type: "error",
      });
      return;
    }

    if (wastageQuantity <= 0) {
      toast.create({
        title: "Invalid Quantity",
        description: "Wasted/defective quantity must be at least 1.",
        type: "error",
      });
      return;
    }

    if (!wastageReason.trim()) {
      toast.create({
        title: "Reason Required",
        description: "Please specify the reason for damage/defect (e.g. misprinted 10 tutor sheets).",
        type: "error",
      });
      return;
    }

    setSubmittingWastage(true);
    try {
      const res = await recordItemWastageAction({
        shopId: userShopId,
        itemId: wastageMatchedItem._id,
        quantity: wastageQuantity,
        reason: wastageReason.trim(),
        date: new Date().toISOString(),
      });

      if (res.success) {
        toast.create({
          title: "Wastage Logged",
          description: res.message || `Recorded ${wastageQuantity} units as damage/defect loss.`,
          type: "success",
        });
        setWastageOpen(false);
        setWastageItemLookup("");
        setWastageMatchedItem(null);
        setWastageQuantity(1);
        setWastageReason("");
        refreshRecords();
      } else {
        toast.create({
          title: "Failed to Record Wastage",
          description: res.error || "An error occurred",
          type: "error",
        });
      }
    } catch {
      toast.create({
        title: "Error",
        description: "Unexpected error occurred while recording wastage.",
        type: "error",
      });
    } finally {
      setSubmittingWastage(false);
    }
  };

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
    if (!open && isCommShop && commEntryMode === "POS" && alwaysOnForm) {
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
      additionalCost: 0,
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
      isCommunicationItem: false,
      itemCode: "",
      itemName: "",
      quantity: 1,
      actualPrice: 0,
      sellingPrice: 0,
      discountPrice: 0,
      additionalCost: 0,
      isRelatedToBranch: false,
      relatedBranch: null,
      relatedBranchNote: "",
    },
  });

  const watchEditQty = editForm.watch("quantity") || 1;
  const watchEditSelling = editForm.watch("sellingPrice") || 0;
  const watchEditDiscount = editForm.watch("discountPrice") || 0;
  const watchEditIsComm = editForm.watch("isCommunicationItem");
  const watchEditIsBranch = editForm.watch("isRelatedToBranch");

  React.useEffect(() => {
    if (watchEditIsComm) {
      const net = Math.max(0, (watchEditQty * watchEditSelling) - watchEditDiscount);
      editForm.setValue("amount", net);
    }
  }, [watchEditQty, watchEditSelling, watchEditDiscount, watchEditIsComm, editForm]);

  const refreshRecords = async () => {
    setLoading(true);
    const params: Parameters<typeof getFinanceRecordsAction>[0] = {
      status: statusFilter !== "ALL" ? statusFilter : undefined,
    };
    if (categoryFilter === "COMM") {
      params.isCommunicationItem = true;
    } else if (categoryFilter === "GENERAL") {
      params.isCommunicationItem = false;
    } else if (categoryFilter !== "ALL") {
      params.categoryId = categoryFilter;
    }
    const res = await getFinanceRecordsAction(params);
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
    if (!clean) {
      setMatchedItem(null);
      return;
    }

    const found =
      communicationItems.find(
        (it) => it.itemCode.toUpperCase() === clean || it.name.toUpperCase() === clean
      ) ||
      communicationItems.find(
        (it) => it.itemCode.toUpperCase().includes(clean) || it.name.toUpperCase().includes(clean)
      );

    if (found) {
      const isReload = isTelecomReloadItem(found);
      const operator = getTelecomOperator(found);
      const commissionRate = Number(
        found.commissionRate && found.commissionRate > 0 ? found.commissionRate : 4.0
      );

      const enriched: CommunicationItemOption = {
        ...found,
        isTelecomReload: isReload,
        telecomOperator: operator,
        commissionRate: isReload ? commissionRate : (found.commissionRate || 0),
      };

      setMatchedItem(enriched);
      setIsUnlistedItem(false);
      if (isReload) {
        setCommQuantity(1);
        setCommDiscountPrice(0);
        setCommAdditionalCost(0);
        if (found.actualPrice && found.actualPrice > 0 && found.sellingPrice && found.sellingPrice > 0) {
          setCommTelecomType("PACKAGE");
          setCommPackageBasePrice(found.actualPrice);
          setCommUnitPrice(found.sellingPrice);
        } else {
          setCommTelecomType("CUSTOM");
          setCommPackageBasePrice(0);
          setCommUnitPrice(0);
        }
      } else {
        setCommUnitPrice(found.sellingPrice || 0);
      }
    } else {
      setMatchedItem(null);
    }
  };

  // Add Item to Multi-Item Cart
  const handleAddItemToCart = () => {
    const isReload = isTelecomReloadItem(matchedItem);
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

    // RELOAD VALIDATION
    if (isReload) {
      if (commTelecomType === "PACKAGE") {
        if (!commPackageBasePrice || commPackageBasePrice <= 0) {
          toast.create({
            title: "Package Base Price Required",
            description: "Please enter the wholesale/base unit price of the package (e.g. LKR 998).",
            type: "error",
          });
          return;
        }
        if (!commUnitPrice || commUnitPrice <= 0) {
          toast.create({
            title: "Selling Price Required",
            description: "Please enter the customer selling price (e.g. LKR 1000).",
            type: "error",
          });
          return;
        }
      } else {
        if (!commUnitPrice || commUnitPrice <= 0) {
          toast.create({
            title: "Reload Amount Required",
            description: "Please enter a valid reload amount (e.g. LKR 100, 200, 500).",
            type: "error",
          });
          return;
        }
      }
    } else {
      // STANDARD ITEM VALIDATION
      if (commQuantity <= 0) {
        toast.create({
          title: "Invalid Quantity",
          description: "Quantity must be at least 1.",
          type: "error",
        });
        return;
      }

      const effectiveUnitPrice = isUnlistedItem ? commUnitPrice : (matchedItem?.sellingPrice || 0);
      if (effectiveUnitPrice <= 0) {
        toast.create({
          title: "No Selling Price Configured",
          description: isUnlistedItem
            ? "Please specify a unit selling price for this custom item."
            : `Item "${matchedItem?.name || itemCode}" does not have a selling price configured in inventory.`,
          type: "error",
        });
        return;
      }
    }

    const commissionRate = isReload ? Number(matchedItem?.commissionRate || 4.0) : 0;
    let commissionEarned = 0;
    let actualPrice = 0;
    let calculatedTotal = 0;
    let net = 0;
    const discount = isReload ? 0 : Math.max(0, commDiscountPrice || 0);
    const additionalCost = isReload ? 0 : Math.max(0, commAdditionalCost || 0);

    if (isReload) {
      if (commTelecomType === "PACKAGE") {
        const basePrice = commPackageBasePrice;
        const sellPrice = commUnitPrice;
        calculatedTotal = sellPrice;
        net = sellPrice;
        // Commission earned from base wholesale price (e.g. 998 * 4% = 39.92)
        const commFromBase = Number(((basePrice * (commissionRate / 100))).toFixed(2));
        // Extra markup from selling price above base price (e.g. 1000 - 998 = 2.00)
        const markup = Math.max(0, Number((sellPrice - basePrice).toFixed(2)));
        // Total profit = commission from base + markup (e.g. 39.92 + 2 = 41.92)
        commissionEarned = Number((commFromBase + markup).toFixed(2));
        // Base wholesale cost charged to reload balance = base price - commission (e.g. 998 - 39.92 = 958.08)
        actualPrice = Math.max(0, Number((basePrice - commFromBase).toFixed(2)));
      } else {
        const reloadAmount = commUnitPrice;
        calculatedTotal = reloadAmount;
        net = reloadAmount;
        commissionEarned = Number(((net * (commissionRate / 100))).toFixed(2));
        actualPrice = Math.max(0, Number((net - commissionEarned).toFixed(2)));
      }
    } else {
      calculatedTotal = commQuantity * (isUnlistedItem ? commUnitPrice : (matchedItem?.sellingPrice || 0));
      net = Math.max(0, calculatedTotal - discount);
      actualPrice = isUnlistedItem ? commCustomCostPrice : (matchedItem?.actualPrice || 0);
    }

    const operator = isReload ? getTelecomOperator(matchedItem) : null;

    const newItem: CommCartItem = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      communicationItem: matchedItem?._id || null,
      itemCode,
      itemName,
      actualPrice,
      sellingPrice: isReload ? commUnitPrice : (isUnlistedItem ? commUnitPrice : (matchedItem?.sellingPrice || 0)),
      quantity: isReload ? 1 : commQuantity,
      totalPrice: calculatedTotal,
      discountPrice: discount,
      additionalCost,
      netAmount: net,
      isTelecomReload: isReload,
      telecomType: isReload ? commTelecomType : undefined,
      packageBasePrice: isReload && commTelecomType === "PACKAGE" ? commPackageBasePrice : undefined,
      telecomOperator: operator,
      commissionRate,
      commissionEarned: isReload ? commissionEarned : undefined,
    };

    setCommCartItems((prev) => [...prev, newItem]);

    // Reset item inputs ready for next item
    setCommItemLookup("");
    setMatchedItem(null);
    setIsUnlistedItem(false);
    setCommCustomItemName("");
    setCommCustomCostPrice(0);
    setCommQuantity(1);
    setCommUnitPrice(0);
    setCommDiscountPrice(0);
    setCommAdditionalCost(0);
    setCommTelecomType("CUSTOM");
    setCommPackageBasePrice(0);
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
      const isReload = isTelecomReloadItem(matchedItem);
      const itemName = isUnlistedItem
        ? commCustomItemName.trim()
        : (matchedItem?.name || commItemLookup.trim());
      const itemCode = isUnlistedItem
        ? (commItemLookup.trim().toUpperCase() || "CUSTOM")
        : (matchedItem?.itemCode || commItemLookup.trim().toUpperCase());

      const effectiveUnitPrice = isReload
        ? commUnitPrice
        : isUnlistedItem
          ? commUnitPrice
          : (matchedItem?.sellingPrice || 0);

      if (itemName && (effectiveUnitPrice > 0 || (isReload && commTelecomType === "PACKAGE" && commPackageBasePrice > 0))) {
        let calculatedTotal = 0;
        let net = 0;
        let commissionEarned = 0;
        let actualPrice = 0;
        const discount = isReload ? 0 : Math.max(0, commDiscountPrice || 0);
        const additionalCost = isReload ? 0 : Math.max(0, commAdditionalCost || 0);
        const commissionRate = isReload ? Number(matchedItem?.commissionRate || 4.0) : 0;

        if (isReload) {
          if (commTelecomType === "PACKAGE") {
            const basePrice = commPackageBasePrice;
            const sellPrice = commUnitPrice;
            calculatedTotal = sellPrice;
            net = sellPrice;
            const commFromBase = Number(((basePrice * (commissionRate / 100))).toFixed(2));
            const markup = Math.max(0, Number((sellPrice - basePrice).toFixed(2)));
            commissionEarned = Number((commFromBase + markup).toFixed(2));
            actualPrice = Math.max(0, Number((basePrice - commFromBase).toFixed(2)));
          } else {
            calculatedTotal = effectiveUnitPrice;
            net = effectiveUnitPrice;
            commissionEarned = Number(((net * (commissionRate / 100))).toFixed(2));
            actualPrice = Math.max(0, Number((net - commissionEarned).toFixed(2)));
          }
        } else {
          calculatedTotal = (commQuantity || 1) * effectiveUnitPrice;
          net = Math.max(0, calculatedTotal - discount);
          actualPrice = isUnlistedItem ? commCustomCostPrice : (matchedItem?.actualPrice || 0);
        }

        finalItems.push({
          id: `${Date.now()}`,
          communicationItem: matchedItem?._id || null,
          itemCode,
          itemName,
          actualPrice,
          sellingPrice: isReload ? commUnitPrice : effectiveUnitPrice,
          quantity: isReload ? 1 : (commQuantity || 1),
          totalPrice: calculatedTotal,
          discountPrice: discount,
          additionalCost,
          netAmount: net,
          isTelecomReload: isReload,
          telecomType: isReload ? commTelecomType : undefined,
          packageBasePrice: isReload && commTelecomType === "PACKAGE" ? commPackageBasePrice : undefined,
          telecomOperator: isReload ? getTelecomOperator(matchedItem) : null,
          commissionRate,
          commissionEarned: isReload ? commissionEarned : undefined,
        });
      }
    }

    if (finalItems.length === 0) {
      toast.create({
        title: "No items to record",
        description: "Please enter item details, quantity, and unit price to record the sale.",
        type: "warning",
      });
      return;
    }

    if (commPaymentMethod === "CREDIT") {
      if (!commCustomerPhone.trim()) {
        toast.create({
          title: "Customer Mobile Required",
          description: "Please enter the customer's mobile number for this credit sale.",
          type: "error",
        });
        return;
      }
      if (!commCustomerName.trim()) {
        toast.create({
          title: "Customer Name Required",
          description: "Please enter the customer's name for this credit sale.",
          type: "error",
        });
        return;
      }
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
          sellingPrice: it.sellingPrice,
          totalPrice: it.totalPrice,
          discountPrice: it.discountPrice,
          additionalCost: it.additionalCost || 0,
          amount: it.netAmount,
          isTelecomReload: it.isTelecomReload,
          telecomType: it.telecomType,
          packageBasePrice: it.packageBasePrice,
          telecomOperator: it.telecomOperator,
          commissionRate: it.commissionRate,
        })),
        paymentMethod: commPaymentMethod,
        customerName: commPaymentMethod === "CREDIT" ? commCustomerName.trim() : undefined,
        customerPhone: commPaymentMethod === "CREDIT" ? commCustomerPhone.trim() : undefined,
        bankAccountId: commPaymentMethod === "BANK_TRANSFER" ? commBankAccountId : null,
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
        setCommUnitPrice(0);
        setCommDiscountPrice(0);
        setCommAdditionalCost(0);
        setCommTelecomType("CUSTOM");
        setCommPackageBasePrice(0);
        setCommIsRelatedToBranch(false);
        setCommRelatedBranch(null);
        setCommRelatedBranchNote("");
        setCommPaymentMethod("CASH");
        setCommCustomerPhone("");
        setCommCustomerName("");
        setExistingCreditCustomer(null);
        setCommBankAccountId(null);

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

  const initializeStandardForm = async () => {
    const defaultCategory = categories[0];
    createForm.reset({
      date: new Date().toISOString().split("T")[0],
      shop: userShopId || "",
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
      isCrossBranchPayment: false,
      beneficiaryShop: null,
    });

    const billRes = await getSuggestedBillNumberAction();
    if (billRes.success && billRes.billNumber) {
      createForm.setValue("billNumber", billRes.billNumber);
    }
  };

  // Open Create Dialog
  const handleOpenCreate = async (mode: "POS" | "STANDARD" = "POS") => {
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
    setCommUnitPrice(0);
    setCommDiscountPrice(0);
    setCommAdditionalCost(0);
    setCommIsRelatedToBranch(false);
    setCommRelatedBranch(null);
    setCommRelatedBranchNote("");
    setCommCartItems([]);

    if (isCommShop) {
      setCommEntryMode(mode);
      if (mode === "STANDARD") {
        await initializeStandardForm();
      }
    } else {
      await initializeStandardForm();
    }

    setCreateOpen(true);
  };

  const onCreateSubmit = async (data: CreateFinanceRecordInput) => {
    const res = await createFinanceRecordAction(data);
    if (res.success) {
      toast.create({
        title: "Record Submitted",
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
    const isOwner = rec.createdBy?._id === userId || rec.createdBy === userId;
    const isCommEditable = isCommShop && isOwner && !rec.reviewedBy;
    const isPending = rec.status === "PENDING" && !rec.isLocked;

    if (!isPending && !isCommEditable) {
      toast.create({
        title: "Record locked",
        description: "This record has been finalized and cannot be modified.",
        type: "warning",
      });
      return;
    }

    setSelectedRecord(rec);
    const qty = rec.quantity || 1;
    const sellPrice = rec.sellingPrice !== undefined && rec.sellingPrice > 0
      ? rec.sellingPrice
      : (qty > 0 ? Number((rec.amount / qty).toFixed(2)) : rec.amount);

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

      // Communication fields
      isCommunicationItem: Boolean(rec.isCommunicationItem || rec.itemCode || rec.itemName),
      communicationItem: rec.communicationItem?._id || rec.communicationItem || null,
      itemCode: rec.itemCode || "",
      itemName: rec.itemName || "",
      quantity: qty,
      sellingPrice: sellPrice,
      actualPrice: rec.actualPrice || 0,
      discountPrice: rec.discountPrice || 0,
      additionalCost: rec.additionalCost || 0,
      isRelatedToBranch: Boolean(rec.isRelatedToBranch),
      relatedBranch: rec.relatedBranch?._id || rec.relatedBranch || null,
      relatedBranchNote: rec.relatedBranchNote || "",
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
      header: "Date & Time",
      cell: ({ row }) => {
        const rawDate = row.original.createdAt || row.original.date;
        const d = new Date(rawDate);
        return (
          <div className="flex flex-col">
            <span className="font-mono text-xs whitespace-nowrap">
              {d.toLocaleDateString()}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground whitespace-nowrap">
              {d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })}
            </span>
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
      cell: ({ row }) => {
        const rec = row.original;
        const catName = rec.category?.name || (rec.isCommunicationItem ? "Communication Sale" : "Uncategorized");
        const colorToken = rec.category?.colorToken || (rec.isCommunicationItem ? "chart-1" : undefined);
        return (
          <div className="max-w-[160px] min-w-0 flex flex-col gap-0.5">
            <CategoryBadge name={catName} colorToken={colorToken} />
            {rec.isCommunicationItem && (
              <span className="text-[10px] text-muted-foreground font-mono leading-none">📱 Comm Item</span>
            )}
          </div>
        );
      },
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
            {(r.isCrossBranchPayment || (r.isRelatedToBranch && r.relatedBranch)) && (
              <div className="flex items-center gap-1 flex-wrap pt-0.5">
                <span className="inline-flex text-[9px] font-medium text-blue-700 dark:text-blue-300 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                  Cross-Branch: For {r.beneficiaryShop?.name || r.relatedBranch?.name}
                </span>
                {r.interBranchSettlementStatus && (
                  <span className={`inline-flex text-[8px] font-mono px-1 py-0.5 rounded border ${r.interBranchSettlementStatus === "SETTLED"
                    ? "text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border-emerald-500/20"
                    : "text-amber-700 dark:text-amber-300 bg-amber-500/10 border-amber-500/20"
                    }`}>
                    {r.interBranchSettlementStatus === "SETTLED" ? "Settled" : "Unsettled"}
                  </span>
                )}
              </div>
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
        const isOwner = rec.createdBy?._id === userId || rec.createdBy === userId;
        const isCommEditable = isCommShop && isOwner && !rec.reviewedBy;
        const isPending = rec.status === "PENDING" && !rec.isLocked;
        const canEdit = isPending || isCommEditable;

        if (!canEdit) {
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

        <div className="flex items-center gap-2">
          {isCommShop && (
            <Button
              onClick={() => {
                setRepayPhone("");
                setRepayCustomer(null);
                setRepayAmount(0);
                setRepayNote("");
                setDebtRepayOpen(true);
              }}
              disabled={unassignedStaff || !userShopId}
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs font-semibold border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
            >
              <HandCoinsIcon className="size-3.5" />
              Settle Debt
            </Button>
          )}

          {isCommShop && (
            <Button
              onClick={() => {
                setWastageItemLookup("");
                setWastageMatchedItem(null);
                setWastageQuantity(1);
                setWastageReason("");
                setWastageOpen(true);
              }}
              disabled={unassignedStaff || !userShopId}
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs font-semibold border-rose-500/40 text-rose-700 dark:text-rose-400 hover:bg-rose-500/10"
            >
              <AlertOctagonIcon className="size-3.5" />
              Record Wastage / Damage
            </Button>
          )}

          {isCommShop ? (
            <>
              <Button
                onClick={() => handleOpenCreate("STANDARD")}
                disabled={unassignedStaff || !userShopId}
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs font-semibold border-primary/40 text-primary hover:bg-primary/10"
              >
                <ReceiptTextIcon className="size-3.5" />
                Record Transaction
              </Button>

              <Button
                onClick={() => handleOpenCreate("POS")}
                disabled={unassignedStaff || !userShopId}
                size="sm"
                className="gap-1.5 text-xs font-semibold"
              >
                <PlusCircleIcon className="size-3.5" />
                New POS Sale
              </Button>
            </>
          ) : (
            <Button
              onClick={() => handleOpenCreate("STANDARD")}
              disabled={unassignedStaff || !userShopId}
              size="sm"
              className="gap-1.5 text-xs font-semibold"
            >
              <PlusCircleIcon className="size-3.5" />
              Add New Record
            </Button>
          )}
        </div>
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
          <option value="ALL" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">All Records</option>
          {isCommShop && (
            <option value="COMM" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">📱 Communication Sales</option>
          )}
          <option value="GENERAL" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">📋 General Transactions</option>
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
              ? "sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[92vh] overflow-y-auto overflow-x-hidden"
              : "sm:max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden"
          }
        >
          {/* Mode Switcher for Communication Shops */}
          {isCommShop && (
            <div className="pb-3 border-b border-border pr-8 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="grid grid-cols-2 p-1 bg-muted rounded-xl border border-border w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setCommEntryMode("POS")}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${commEntryMode === "POS"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/40"
                      }`}
                  >
                    <ShoppingCartIcon className="size-3.5 shrink-0" />
                    <span className="truncate">
                      <span className="hidden sm:inline">Products &amp; Reloads (POS)</span>
                      <span className="sm:hidden">POS Sales</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setCommEntryMode("STANDARD");
                      await initializeStandardForm();
                    }}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${commEntryMode === "STANDARD"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/40"
                      }`}
                  >
                    <ReceiptTextIcon className="size-3.5 shrink-0" />
                    <span className="truncate">
                      <span className="hidden sm:inline">General Transaction / Branch Payment</span>
                      <span className="sm:hidden">Branch Payment</span>
                    </span>
                  </button>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {commEntryMode === "STANDARD" ? (
                    <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground bg-muted/40">
                      Standard Branch Form
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] font-mono text-primary border-primary/30 bg-primary/5">
                      POS Cart Mode
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}

          {isCommShop && commEntryMode === "POS" ? (
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
                  {!isTelecomReloadItem(matchedItem) && (
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
                  )}
                </div>

                {!isUnlistedItem ? (
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase">
                        Select / Search Item
                      </label>
                      <Input
                        placeholder="Type item code or search name (e.g. DIALOG, MOBITEL, 0010)..."
                        value={commItemLookup}
                        onChange={(e) => handleItemCodeChange(e.target.value)}
                        className="h-9 text-xs font-mono font-semibold"
                        list="comm-items-datalist"
                      />
                      <datalist id="comm-items-datalist">
                        {communicationItems.map((item) => (
                          <option key={item._id} value={item.itemCode}>
                            {item.name} {isTelecomReloadItem(item) ? `[${getTelecomOperator(item)} - ${item.commissionRate ?? 4}% Commission]` : item.sellingPrice ? `- (Price: LKR ${item.sellingPrice})` : ""}
                          </option>
                        ))}
                      </datalist>
                    </div>

                    {/* Matched Item Preview Card */}
                    {matchedItem && (
                      <div className={`flex items-center justify-between p-2.5 rounded-lg border text-xs ${isTelecomReloadItem(matchedItem)
                        ? "border-primary/40 bg-primary/10"
                        : "border-emerald-500/30 bg-emerald-500/10"
                        }`}>
                        <div className="flex items-center gap-2">
                          {isTelecomReloadItem(matchedItem) ? (
                            <SmartphoneIcon className="size-4 text-primary" />
                          ) : (
                            <CheckCircle2Icon className="size-4 text-emerald-600 dark:text-emerald-400" />
                          )}
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-foreground">{matchedItem.name}</span>
                              {isTelecomReloadItem(matchedItem) && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-mono">
                                  {getTelecomOperator(matchedItem)}
                                </Badge>
                              )}
                            </div>
                            {isTelecomReloadItem(matchedItem) ? (
                              <p className="text-[11px] text-muted-foreground">
                                Mobile Top-up • Commission: <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">{matchedItem.commissionRate ?? 4}%</span>
                              </p>
                            ) : matchedItem.sellingPrice !== undefined && matchedItem.sellingPrice > 0 ? (
                              <span className="text-muted-foreground ml-2 font-mono text-[11px]">
                                (Selling Price: LKR {Number(matchedItem.sellingPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })})
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {matchedItem.itemCode}
                          </Badge>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => {
                              setMatchedItem(null);
                              setCommItemLookup("");
                              setCommUnitPrice(0);
                            }}
                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                            title="Clear selected item"
                          >
                            <Trash2Icon className="size-3" />
                          </Button>
                        </div>
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
                        <label className="text-[11px] font-semibold text-muted-foreground uppercase">
                          Unit Selling Price (LKR) *
                        </label>
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          placeholder="0.00"
                          value={commUnitPrice || ""}
                          onChange={(e) => setCommUnitPrice(Math.max(0, Number(e.target.value) || 0))}
                          className="h-9 text-xs font-mono font-semibold"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* IF TELECOM RELOAD: DUAL MODE (CUSTOM RELOAD VS FIXED PACKAGE) */}
                {isTelecomReloadItem(matchedItem) ? (
                  <div className="space-y-3 pt-2">
                    {/* Segmented Mode Selector */}
                    <div className="flex items-center gap-1 p-1 bg-muted/70 rounded-lg border border-border">
                      <button
                        type="button"
                        onClick={() => {
                          setCommTelecomType("CUSTOM");
                        }}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-md transition-all ${commTelecomType === "CUSTOM"
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                          }`}
                      >
                        <ZapIcon className="size-3.5" />
                        <span>Custom Reload Top-up</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCommTelecomType("PACKAGE");
                          if (!commPackageBasePrice && matchedItem?.actualPrice && matchedItem.actualPrice > 0) {
                            setCommPackageBasePrice(matchedItem.actualPrice);
                          }
                          if (!commUnitPrice && matchedItem?.sellingPrice && matchedItem.sellingPrice > 0) {
                            setCommUnitPrice(matchedItem.sellingPrice);
                          }
                        }}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-md transition-all ${commTelecomType === "PACKAGE"
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                          }`}
                      >
                        <PackageIcon className="size-3.5" />
                        <span>Fixed Package / Card</span>
                      </button>
                    </div>

                    {commTelecomType === "CUSTOM" ? (
                      /* CUSTOM RELOAD AMOUNT MODE */
                      <div className="space-y-2.5 p-3.5 rounded-xl border border-primary/30 bg-primary/5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-foreground uppercase flex items-center gap-1.5">
                            <SmartphoneIcon className="size-4 text-primary" />
                            <span>Reload Total Price (LKR) *</span>
                          </label>
                          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                            {getTelecomOperator(matchedItem)} Commission: {matchedItem?.commissionRate ?? 4}%
                          </span>
                        </div>

                        <Input
                          type="number"
                          min="1"
                          step="any"
                          placeholder="Enter reload amount (e.g. 50, 100, 200, 500, 1000)..."
                          value={commUnitPrice || ""}
                          onChange={(e) => setCommUnitPrice(Math.max(0, Number(e.target.value) || 0))}
                          className="h-10 text-sm font-mono font-bold text-foreground bg-background"
                          autoFocus
                        />

                        {/* Quick Presets */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-[10px] text-muted-foreground uppercase font-semibold mr-1">Quick Presets:</span>
                          {[50, 100, 150, 200, 350, 500, 1000, 2000].map((amt) => (
                            <button
                              key={amt}
                              type="button"
                              onClick={() => setCommUnitPrice(amt)}
                              className={`px-2.5 py-0.5 rounded text-xs font-mono border transition-all ${commUnitPrice === amt
                                  ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                                  : "bg-background border-border text-foreground hover:bg-muted"
                                }`}
                            >
                              LKR {amt}
                            </button>
                          ))}
                        </div>

                        {commUnitPrice > 0 && (
                          <div className="flex items-center justify-between pt-1 border-t border-primary/20 text-xs">
                            <span className="text-muted-foreground">Estimated Profit:</span>
                            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              +LKR {((commUnitPrice * ((matchedItem?.commissionRate ?? 4) / 100))).toFixed(2)} ({matchedItem?.commissionRate ?? 4}%)
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* FIXED PACKAGE / CARD MODE */
                      <div className="space-y-3 p-3.5 rounded-xl border border-primary/30 bg-primary/5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground uppercase flex items-center gap-1.5">
                            <PackageIcon className="size-4 text-primary" />
                            <span>Package Pricing Details</span>
                          </span>
                          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                            {getTelecomOperator(matchedItem)} Base Commission: {matchedItem?.commissionRate ?? 4}%
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <label className="text-[11px] font-semibold uppercase text-muted-foreground">
                                Base Unit Price (LKR) *
                              </label>
                              <span className="text-[10px] text-muted-foreground">Package Face Value</span>
                            </div>
                            <Input
                              type="number"
                              min="1"
                              step="any"
                              placeholder="e.g. 998"
                              value={commPackageBasePrice || ""}
                              onChange={(e) => setCommPackageBasePrice(Math.max(0, Number(e.target.value) || 0))}
                              className="h-9 text-xs font-mono font-bold bg-background"
                              autoFocus
                            />
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <label className="text-[11px] font-semibold uppercase text-muted-foreground">
                                Selling Price (LKR) *
                              </label>
                              <span className="text-[10px] text-muted-foreground">Customer Due</span>
                            </div>
                            <Input
                              type="number"
                              min="1"
                              step="any"
                              placeholder="e.g. 1000"
                              value={commUnitPrice || ""}
                              onChange={(e) => setCommUnitPrice(Math.max(0, Number(e.target.value) || 0))}
                              className="h-9 text-xs font-mono font-bold bg-background"
                            />
                          </div>
                        </div>

                        {/* Common Package Presets */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-[10px] text-muted-foreground uppercase font-semibold mr-1">Common Packages:</span>
                          {[
                            { name: "998 → 1000", base: 998, sell: 1000 },
                            { name: "498 → 500", base: 498, sell: 500 },
                            { name: "1198 → 1200", base: 1198, sell: 1200 },
                            { name: "1498 → 1500", base: 1498, sell: 1500 },
                            { name: "1998 → 2000", base: 1998, sell: 2000 },
                          ].map((pkg) => (
                            <button
                              key={pkg.name}
                              type="button"
                              onClick={() => {
                                setCommPackageBasePrice(pkg.base);
                                setCommUnitPrice(pkg.sell);
                              }}
                              className={`px-2 py-0.5 rounded text-[11px] font-mono border transition-all ${commPackageBasePrice === pkg.base && commUnitPrice === pkg.sell
                                  ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                                  : "bg-background border-border text-foreground hover:bg-muted"
                                }`}
                            >
                              {pkg.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end pt-1">
                      <Button
                        type="button"
                        onClick={handleAddItemToCart}
                        size="sm"
                        disabled={
                          commTelecomType === "PACKAGE"
                            ? !commPackageBasePrice || commPackageBasePrice <= 0 || !commUnitPrice || commUnitPrice <= 0
                            : !commUnitPrice || commUnitPrice <= 0
                        }
                        className="gap-1.5 text-xs font-semibold"
                      >
                        <PlusCircleIcon className="size-3.5" />
                        {commTelecomType === "PACKAGE" ? "Add Package to Sale" : "Add Reload to Sale"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* STANDARD ITEM FIELDS: QUANTITY, DISCOUNT, ADDITIONAL COST */
                  <div className="space-y-3 pt-1">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
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
                        <label className="text-[11px] font-semibold text-muted-foreground uppercase flex items-center justify-between">
                          <span>Additional Cost</span>
                          <span className="text-[9px] text-muted-foreground font-normal">(Optional)</span>
                        </label>
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          placeholder="0.00"
                          value={commAdditionalCost || ""}
                          onChange={(e) => setCommAdditionalCost(Math.max(0, Number(e.target.value) || 0))}
                          className="h-9 text-xs font-mono"
                          title="Extra procurement or material surcharge cost"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-muted-foreground uppercase flex items-center justify-between">
                          <span>Customer Due</span>
                          {!isUnlistedItem && matchedItem && matchedItem.sellingPrice !== undefined && (
                            <span className="text-[10px] text-muted-foreground font-mono font-normal">
                              (@ LKR {Number(matchedItem.sellingPrice).toLocaleString()})
                            </span>
                          )}
                        </label>
                        <div className="h-9 px-3 rounded-md border border-border bg-muted/40 flex items-center font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          LKR {Math.max(0, (commQuantity * (isUnlistedItem ? commUnitPrice : (matchedItem?.sellingPrice || 0))) - commDiscountPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
                )}
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
                          <th className="py-2 px-3 text-right">Unit Price</th>
                          <th className="py-2 px-3 text-center w-16">Qty</th>
                          <th className="py-2 px-3 text-right">Subtotal</th>
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
                              <div className="flex items-center gap-1.5">
                                <span>{item.itemName}</span>
                                {item.isTelecomReload && (
                                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-mono bg-primary/10 text-primary border-primary/30">
                                    {item.telecomType === "PACKAGE" ? "PACKAGE" : "RELOAD"} {item.telecomOperator || ""} {item.commissionRate ? `(${item.commissionRate}%)` : ""}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-[10px] text-muted-foreground font-mono flex items-center gap-2">
                                <span>{item.itemCode || "ITEM"}</span>
                                {item.isTelecomReload && item.commissionEarned !== undefined && (
                                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                    • Profit: +LKR {Number(item.commissionEarned).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    {item.telecomType === "PACKAGE" && item.packageBasePrice ? ` (Base: LKR ${item.packageBasePrice})` : ""}
                                  </span>
                                )}
                                {item.additionalCost !== undefined && item.additionalCost > 0 && (
                                  <span className="text-amber-600 dark:text-amber-400 font-semibold">
                                    • Extra Cost: +LKR {Number(item.additionalCost).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2 px-3 text-right">
                              LKR {item.sellingPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2 px-3 text-center">{item.quantity}</td>
                            <td className="py-2 px-3 text-right text-muted-foreground">
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
                          <td colSpan={6} className="py-2.5 px-3 text-right text-xs uppercase text-foreground">
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

              {/* PAYMENT METHOD & CUSTOMER CREDIT SETTINGS */}
              <div className="p-3.5 rounded-xl border border-border bg-card space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase text-foreground">
                    <DollarSignIcon className="size-3.5 text-primary" />
                    <span>Payment Method</span>
                  </div>

                  <div className="flex items-center gap-1.5 bg-muted p-1 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setCommPaymentMethod("CASH")}
                      className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${commPaymentMethod === "CASH" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      Cash
                    </button>
                    <button
                      type="button"
                      onClick={() => setCommPaymentMethod("CREDIT")}
                      className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${commPaymentMethod === "CREDIT" ? "bg-amber-500 text-white shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      Credit
                    </button>
                    <button
                      type="button"
                      onClick={() => setCommPaymentMethod("BANK_TRANSFER")}
                      className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${commPaymentMethod === "BANK_TRANSFER" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      Bank / Online
                    </button>
                  </div>
                </div>

                {/* If CREDIT is selected, show Customer Phone & Name with auto-lookup */}
                {commPaymentMethod === "CREDIT" && (
                  <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                        <UserCheckIcon className="size-3.5" />
                        Credit Customer Information
                      </span>
                      {existingCreditCustomer && (
                        <Badge variant="outline" className="text-[10px] font-mono border-amber-500/40 bg-card text-amber-700 dark:text-amber-300">
                          Existing Debt: LKR {Number(existingCreditCustomer.currentBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-semibold text-muted-foreground flex items-center justify-between">
                          <span>Mobile Number *</span>
                          <span className="text-[9px] text-muted-foreground font-normal">(auto-lookup)</span>
                        </label>
                        <Input
                          placeholder="e.g. 0771234567"
                          value={commCustomerPhone}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCommCustomerPhone(val);
                            handleLookupCustomer(val, "SALE");
                          }}
                          className="h-8 text-xs font-mono font-semibold bg-background"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-semibold text-muted-foreground">
                          Customer Name *
                        </label>
                        <Input
                          placeholder="e.g. Kamal Perera"
                          value={commCustomerName}
                          onChange={(e) => setCommCustomerName(e.target.value)}
                          className="h-8 text-xs font-medium bg-background"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* If BANK_TRANSFER is selected */}
                {commPaymentMethod === "BANK_TRANSFER" && (
                  <div className="p-3 rounded-lg border border-border bg-muted/30 space-y-2">
                    <label className="text-[10px] uppercase font-semibold text-muted-foreground">
                      Target Bank Account (Optional)
                    </label>
                    <select
                      value={commBankAccountId || ""}
                      onChange={(e) => setCommBankAccountId(e.target.value || null)}
                      className="w-full h-8 rounded-md border border-border bg-card text-foreground px-2 text-xs font-medium outline-none focus:border-ring"
                    >
                      <option value="">Select Bank Account (or Leave Empty)...</option>
                      {bankAccounts.map((b) => (
                        <option key={b._id} value={b._id}>
                          {b.bankName} - {b.accountNumber} ({b.accountName})
                        </option>
                      ))}
                    </select>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

                {/* Cross-Branch Payment Option */}
                <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-2">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      {...createForm.register("isCrossBranchPayment")}
                      className="rounded border-input text-primary focus:ring-primary size-4"
                    />
                    <span>Cross-Branch Payment (Received for Another Branch)</span>
                  </label>
                  <p className="text-[11px] text-muted-foreground">
                    Check this if a customer is paying here for a bill / service / debt of another branch.
                  </p>

                  {createForm.watch("isCrossBranchPayment") && (
                    <div className="pt-2 border-t border-border space-y-2">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          <BuildingIcon className="size-3 text-primary" />
                          Beneficiary Branch (Whose income is this?)
                        </label>
                        <select
                          {...createForm.register("beneficiaryShop")}
                          className="w-full h-9 rounded-md border border-border bg-card text-foreground px-3 text-xs font-medium outline-none focus:border-ring [color-scheme:light] dark:[color-scheme:dark]"
                        >
                          <option value="">Select Target Branch...</option>
                          {activeShops
                            .filter((s) => s._id !== userShopId)
                            .map((s) => (
                              <option key={s._id} value={s._id}>
                                {s.name} ({s.code})
                              </option>
                            ))}
                        </select>
                      </div>
                      <p className="text-[11px] text-blue-600 dark:text-blue-400 bg-blue-500/10 p-2 rounded border border-blue-500/20">
                        💡 <strong>Drawer Accounting:</strong> Physical cash will be added to your drawer ({userShopName || "this shop"}), and sales revenue will be attributed to the selected branch after verification.
                      </p>
                    </div>
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
        <DialogContent className={watchEditIsComm ? "sm:max-w-2xl max-h-[90vh] overflow-y-auto" : "sm:max-w-md"}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {watchEditIsComm ? <StoreIcon className="size-4 text-primary" /> : <EditIcon className="size-4 text-primary" />}
              {watchEditIsComm ? "Edit Communication Sale" : "Edit Pending Transaction"}
            </DialogTitle>
            <DialogDescription>
              {watchEditIsComm
                ? "Modify item, pricing, or cross-branch transfer details before verification"
                : "Modify record before verification review"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4 py-2">
            {watchEditIsComm ? (
              <>
                {/* COMMUNICATION ITEM FIELDS */}
                <div className="p-3.5 rounded-xl border border-border bg-card space-y-3">
                  <span className="text-xs font-bold uppercase text-primary tracking-wider flex items-center gap-1.5">
                    <SparklesIcon className="size-3.5" />
                    Item &amp; Pricing Details
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase">
                        Item Code
                      </label>
                      <Input
                        placeholder="e.g. 0010"
                        {...editForm.register("itemCode")}
                        className="h-9 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase">
                        Item Name *
                      </label>
                      <Input
                        placeholder="Item name..."
                        {...editForm.register("itemName")}
                        className="h-9 text-xs font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-1">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase">
                        Quantity *
                      </label>
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        {...editForm.register("quantity", { valueAsNumber: true })}
                        className="h-9 text-xs font-mono font-semibold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase">
                        Unit Price (LKR) *
                      </label>
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0.00"
                        {...editForm.register("sellingPrice", { valueAsNumber: true })}
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
                        {...editForm.register("discountPrice", { valueAsNumber: true })}
                        className="h-9 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase">
                        Additional Cost (LKR)
                      </label>
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0.00"
                        {...editForm.register("additionalCost", { valueAsNumber: true })}
                        className="h-9 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-xs font-mono">
                    <span className="font-sans font-medium text-foreground">Calculated Net Total:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                      LKR {Math.max(0, (watchEditQty * watchEditSelling) - watchEditDiscount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* CROSS-BRANCH TRANSFER EDIT */}
                <div className="p-3.5 rounded-xl border border-border bg-card space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-foreground select-none">
                    <input
                      type="checkbox"
                      {...editForm.register("isRelatedToBranch")}
                      className="size-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <span>Is this transaction related to another branch / shop?</span>
                  </label>

                  {watchEditIsBranch && (
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
                            {...editForm.register("relatedBranch")}
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
                            {...editForm.register("relatedBranchNote")}
                            className="h-8 text-xs bg-background"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* TRANSACTION METADATA */}
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
                  <label className="text-xs font-semibold uppercase text-muted-foreground">Reason / Description</label>
                  <Textarea {...editForm.register("reason")} className="text-xs" rows={2} />
                </div>
              </>
            ) : (
              /* STANDARD FORM (NON-COMMUNICATION) */
              <>
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
              </>
            )}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={editForm.formState.isSubmitting}>
                {editForm.formState.isSubmitting ? <Loader2Icon className="size-3.5 animate-spin mr-1" /> : null}
                Save Modifications
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DEBT REPAYMENT MODAL */}
      <Dialog open={debtRepayOpen} onOpenChange={setDebtRepayOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HandCoinsIcon className="size-4 text-amber-600 dark:text-amber-400" />
              Settle Customer Debt
            </DialogTitle>
            <DialogDescription className="text-xs">
              Collect outstanding debt payments from credit customers for {userShopName}. Instant auto-approval and running cash balance update.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleDebtRepaymentSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground flex items-center justify-between">
                <span>Customer Mobile Number *</span>
                {searchingCustomer && (
                  <span className="text-[10px] text-primary flex items-center gap-1 font-normal">
                    <Loader2Icon className="size-3 animate-spin" /> Searching...
                  </span>
                )}
              </label>
              <Input
                placeholder="e.g. 0771234567"
                value={repayPhone}
                onChange={(e) => {
                  const val = e.target.value;
                  setRepayPhone(val);
                  handleLookupCustomer(val, "REPAY");
                }}
                className="h-9 text-xs font-mono font-semibold"
              />
            </div>

            {/* Found Customer Details */}
            {repayCustomer && (
              <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-foreground block">{repayCustomer.name}</span>
                    <span className="text-[11px] font-mono text-muted-foreground">{repayCustomer.phone}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase text-muted-foreground font-semibold block">Outstanding Debt</span>
                    <span className="text-sm font-bold font-mono text-amber-700 dark:text-amber-400">
                      LKR {Number(repayCustomer.currentBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {repayCustomer.shop && repayCustomer.shop._id !== userShopId && (
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-800 dark:text-blue-300 text-[11px] font-medium">
                    <BuildingIcon className="size-3.5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Cross-Branch Customer:</span> Belongs to{" "}
                      <strong>{repayCustomer.shop.name} ({repayCustomer.shop.code})</strong>. Cash will be collected into your drawer ({userShopName || "this shop"}), and debt will be settled for {repayCustomer.shop.name} (submitted for approval).
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => setRepayAmount(repayCustomer.currentBalance)}
                    className="text-[10px] h-6 px-2 border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/15"
                  >
                    Pay Full Amount (LKR {Number(repayCustomer.currentBalance).toLocaleString()})
                  </Button>
                </div>
              </div>
            )}

            {!repayCustomer && repayPhone.trim().length >= 3 && !searchingCustomer && (
              <div className="p-3 rounded-lg border border-dashed border-border bg-muted/20 text-center text-xs text-muted-foreground">
                No credit customer found with number &quot;{repayPhone}&quot; in this shop.
              </div>
            )}

            {repayCustomer && (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase text-muted-foreground flex items-center justify-between">
                    <span>Payment Amount (LKR) *</span>
                    <span className="text-[10px] text-muted-foreground font-normal lowercase">(max: LKR {Number(repayCustomer.currentBalance).toLocaleString()})</span>
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max={repayCustomer.currentBalance}
                    step="any"
                    value={repayAmount || ""}
                    onChange={(e) => setRepayAmount(Number(e.target.value) || 0)}
                    placeholder="0.00"
                    className="h-9 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">
                    Payment Method
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setRepayMethod("CASH")}
                      className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold border transition-all ${repayMethod === "CASH"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:bg-muted"
                        }`}
                    >
                      Cash
                    </button>
                    <button
                      type="button"
                      onClick={() => setRepayMethod("BANK_TRANSFER")}
                      className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold border transition-all ${repayMethod === "BANK_TRANSFER"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:bg-muted"
                        }`}
                    >
                      Bank / Online
                    </button>
                  </div>
                </div>

                {repayMethod === "BANK_TRANSFER" && (
                  <div className="space-y-1.5 p-2.5 rounded-lg border border-border bg-muted/30">
                    <label className="text-xs font-semibold uppercase text-muted-foreground">
                      Target Bank Account
                    </label>
                    <select
                      value={repayBankId || ""}
                      onChange={(e) => setRepayBankId(e.target.value || null)}
                      className="w-full h-8 rounded-md border border-border bg-card text-foreground px-2 text-xs font-medium outline-none focus:border-ring"
                    >
                      <option value="">Select Bank Account (or Leave Empty)...</option>
                      {bankAccounts.map((b) => (
                        <option key={b._id} value={b._id}>
                          {b.bankName} - {b.accountNumber} ({b.accountName})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">
                    Note / Receipt Reference (Optional)
                  </label>
                  <Input
                    placeholder="e.g. Settle bill balance / receipt number..."
                    value={repayNote}
                    onChange={(e) => setRepayNote(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </>
            )}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setDebtRepayOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submittingRepay || !repayCustomer || repayAmount <= 0}
                className="gap-1.5 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {submittingRepay ? (
                  <Loader2Icon className="size-3.5 animate-spin" />
                ) : (
                  <CheckCircle2Icon className="size-3.5" />
                )}
                Collect &amp; Record Repayment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ITEM WASTAGE & DEFECT LOGGING MODAL */}
      <Dialog open={wastageOpen} onOpenChange={setWastageOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <AlertOctagonIcon className="size-5" />
              <span>Record Item Wastage / Damage</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Log misprinted sheets, damaged stock, or defective inventory. Operational loss is computed strictly using base unit cost price without reducing the cash drawer.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleWastageSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Item Code or Name *
              </label>
              <Input
                placeholder="Search or enter item code (e.g. A4-COPY, SIM-01)..."
                value={wastageItemLookup}
                onChange={(e) => handleWastageItemCodeChange(e.target.value)}
                className="h-9 text-xs font-mono"
                list="wastage-items-datalist"
              />
              <datalist id="wastage-items-datalist">
                {communicationItems.map((item) => (
                  <option key={item._id} value={item.itemCode}>
                    {item.name} ({item.itemCode})
                  </option>
                ))}
              </datalist>
            </div>

            {/* Matched Item Card */}
            {wastageMatchedItem && (
              <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">{wastageMatchedItem.name}</span>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {wastageMatchedItem.itemCode}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Financial loss calculated from registered wholesale base cost (actual cost). Does not deduct from cash till.
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Wasted / Defective Quantity *
              </label>
              <Input
                type="number"
                min="1"
                step="1"
                placeholder="1"
                value={wastageQuantity}
                onChange={(e) => setWastageQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="h-9 text-xs font-mono font-semibold"
              />
              <p className="text-[11px] text-muted-foreground">
                e.g. 10 misprinted tutor sheets, 2 damaged covers
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Reason / Defect Description *
              </label>
              <Textarea
                placeholder="Explain what happened (e.g. Printer jammed during tutor job, misaligned double-side print, ink smudge)..."
                value={wastageReason}
                onChange={(e) => setWastageReason(e.target.value)}
                rows={3}
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setWastageOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submittingWastage || !wastageMatchedItem || wastageQuantity <= 0 || !wastageReason.trim()}
                className="gap-1.5 font-semibold bg-rose-600 hover:bg-rose-700 text-white"
              >
                {submittingWastage ? <Loader2Icon className="size-3.5 animate-spin" /> : <AlertOctagonIcon className="size-3.5" />}
                Record Loss
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
