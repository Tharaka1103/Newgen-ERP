"use client";

import * as React from "react";
import Link from "next/link";
import { getSummaryAnalyticsAction } from "@/actions/reports";
import {
  getShopDetailsAction,
  getShopCashAuditAction,
  recalculateAndSyncShopCashAction,
} from "@/actions/shops";
import {
  getCommunicationItemsAction,
  createCommunicationItemAction,
  updateCommunicationItemAction,
  deleteCommunicationItemAction,
  getCommunicationAnalyticsAction,
  getItemWastageAnalyticsAction,
} from "@/actions/communication";
import {
  getShopCreditCustomersAction,
  getCustomerCreditStatementAction,
} from "@/actions/credit";
import { settleInterBranchCashAction, getUtilityBillAnalyticsAction } from "@/actions/finances";
import {
  getDailySettlementHistoryAction,
  recordDailyCashSettlementAction,
} from "@/actions/dailySettlement";
import { getActiveBankAccountsAction } from "@/actions/bankAccounts";
import { InventoryView } from "@/components/inventory/inventory-view";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { CategoryBadge } from "@/components/shared/category-badge";
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
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  ArrowLeftIcon,
  DownloadIcon,
  RefreshCwIcon,
  Building2Icon,
  UsersIcon,
  MapPinIcon,
  ReceiptIcon,
  PackageIcon,
  PlusCircleIcon,
  EditIcon,
  Trash2Icon,
  DollarSignIcon,
  TrendingUpIcon,
  SparklesIcon,
  Loader2Icon,
  HandCoinsIcon,
  WalletIcon,
  CreditCardIcon,
  FileTextIcon,
  CheckCircle2Icon,
  SearchIcon,
  RadioIcon,
  SmartphoneIcon,
  FilterIcon,
  SlidersHorizontalIcon,
  ArrowUpDownIcon,
  CalendarIcon,
  TagIcon,
  XIcon,
  LandmarkIcon,
  AlertOctagonIcon,
  PercentIcon,
  FlameIcon,
  ZapIcon,
  DropletIcon,
  CoinsIcon,
  BanknoteIcon,
  ArrowRightLeftIcon,
  WrenchIcon,
  AlertTriangleIcon,
} from "lucide-react";
import { toast } from "@/components/ui/toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createCommunicationItemSchema,
  updateCommunicationItemSchema,
  CreateCommunicationItemInput,
  UpdateCommunicationItemInput,
  classifyTelecomOperator,
  type TelecomOperator,
} from "@/schemas/communication";

interface AssignedStaff {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  lastLoginAt?: string;
}

interface SingleShopViewProps {
  initialShop: {
    _id: string;
    name: string;
    code: string;
    description?: string;
    address?: string;
    shopType?: "STANDARD" | "COMMUNICATION" | "INVENTORY";
    isActive: boolean;
  };
  initialStaff: AssignedStaff[];
  initialStats: {
    recordsCount: number;
    pendingCount: number;
    approvedCount: number;
    currentBalance: number;
    totalCustomerCredit?: number;
    creditCustomerCount?: number;
    interBranchDues?: {
      holdingForOthers: Array<{
        shopId: string;
        shopName: string;
        shopCode: string;
        totalAmount: number;
        count: number;
        recordIds: string[];
      }>;
      owedFromOthers: Array<{
        shopId: string;
        shopName: string;
        shopCode: string;
        totalAmount: number;
        count: number;
        recordIds: string[];
      }>;
      totalHolding: number;
      totalOwed: number;
    };
  };
}

export function SingleShopView({
  initialShop,
  initialStaff,
  initialStats,
}: SingleShopViewProps) {
  const isCommunication = initialShop.shopType === "COMMUNICATION";
  const isInventoryShop = initialShop.shopType === "INVENTORY";

  const [activeTab, setActiveTab] = React.useState<"overview" | "itemSales" | "items" | "utilityBills" | "wastage" | "credits" | "dailySettlement" | "staff">("overview");
  const [period, setPeriod] = React.useState<"today" | "week" | "month" | "year" | "custom">("month");
  const [startDate, setStartDate] = React.useState<string>("");
  const [endDate, setEndDate] = React.useState<string>("");
  const [itemFilter, setItemFilter] = React.useState<string>("ALL");
  const [loading, setLoading] = React.useState<boolean>(false);

  // Item-Wise Sales tab state
  const [selectedOperatorFilter, setSelectedOperatorFilter] = React.useState<
    "ALL" | TelecomOperator
  >("ALL");
  const [itemSearchQuery, setItemSearchQuery] = React.useState<string>("");
  const [itemSortBy, setItemSortBy] = React.useState<
    "revenue" | "profit" | "quantity" | "margin" | "code"
  >("revenue");
  const [itemSortOrder, setItemSortOrder] = React.useState<"asc" | "desc">("desc");

  // Registered Products & Services (Items Tab) Filter & Sort State
  const [commItemSearch, setCommItemSearch] = React.useState<string>("");
  const [commItemTypeFilter, setCommItemTypeFilter] = React.useState<"ALL" | "RELOAD" | "STANDARD">("ALL");
  const [commItemOperatorFilter, setCommItemOperatorFilter] = React.useState<"ALL" | TelecomOperator>("ALL");
  const [commItemStatusFilter, setCommItemStatusFilter] = React.useState<"ALL" | "ACTIVE" | "DISABLED">("ALL");
  const [commItemSortBy, setCommItemSortBy] = React.useState<"name" | "code" | "actualPrice" | "sellingPrice" | "margin">("code");
  const [commItemSortOrder, setCommItemSortOrder] = React.useState<"asc" | "desc">("asc");

  const [shop, setShop] = React.useState(initialShop);
  const [staff, setStaff] = React.useState<AssignedStaff[]>(initialStaff);
  const [stats, setStats] = React.useState(initialStats);

  // Credit Customers & Debt Ledger State
  const [creditCustomers, setCreditCustomers] = React.useState<any[]>([]);
  const [creditStats, setCreditStats] = React.useState<{
    totalCreditIssued: number;
    totalPaid: number;
    totalOutstanding: number;
    debtorCount: number;
  }>({
    totalCreditIssued: 0,
    totalPaid: 0,
    totalOutstanding: initialStats.totalCustomerCredit || 0,
    debtorCount: initialStats.creditCustomerCount || 0,
  });
  const [creditSearch, setCreditSearch] = React.useState("");
  const [creditLoading, setCreditLoading] = React.useState(false);

  // Wastage & Defect Loss State
  const [wastageAnalytics, setWastageAnalytics] = React.useState<{
    totalWastedUnits: number;
    totalMonetaryLoss: number;
    incidentCount: number;
    itemBreakdown: Array<{
      itemCode: string;
      itemName: string;
      unitsWasted: number;
      totalLoss: number;
    }>;
    incidents: any[];
  }>({
    totalWastedUnits: 0,
    totalMonetaryLoss: 0,
    incidentCount: 0,
    itemBreakdown: [],
    incidents: [],
  });

  // Statement Dialog State
  const [statementOpen, setStatementOpen] = React.useState(false);
  const [statementLoading, setStatementLoading] = React.useState(false);
  const [customerStatement, setCustomerStatement] = React.useState<{
    customer: any;
    transactions: any[];
  } | null>(null);

  // Communication Items State
  const [commItems, setCommItems] = React.useState<any[]>([]);
  const [commAnalytics, setCommAnalytics] = React.useState<{
    totalRevenue: number;
    totalCost: number;
    netProfit: number;
    totalTransactions: number;
    branchRelatedCount: number;
    nonBranchCount: number;
    records: any[];
    itemBreakdown: any[];
    telecomBreakdown?: any[];
    periodCashInflow?: number;
    periodCashOutflow?: number;
    periodCashBalance?: number;
    periodClosingCashBalance?: number;
  }>({
    totalRevenue: 0,
    totalCost: 0,
    netProfit: 0,
    totalTransactions: 0,
    branchRelatedCount: 0,
    nonBranchCount: 0,
    records: [],
    itemBreakdown: [],
    telecomBreakdown: [],
    periodCashInflow: 0,
    periodCashOutflow: 0,
    periodCashBalance: 0,
    periodClosingCashBalance: 0,
  });

  // Utility Bill Payments Analytics State
  const [utilityAnalytics, setUtilityAnalytics] = React.useState<{
    totalBillsCount: number;
    totalCollected: number;
    totalBillAmount: number;
    totalServiceCharges: number;
    totalProviderFees: number;
    totalNetProfit: number;
    breakdown: {
      electricity: { count: number; amount: number; profit: number };
      water: { count: number; amount: number; profit: number };
      other: { count: number; amount: number; profit: number };
    };
    records: any[];
  }>({
    totalBillsCount: 0,
    totalCollected: 0,
    totalBillAmount: 0,
    totalServiceCharges: 0,
    totalProviderFees: 0,
    totalNetProfit: 0,
    breakdown: {
      electricity: { count: 0, amount: 0, profit: 0 },
      water: { count: 0, amount: 0, profit: 0 },
      other: { count: 0, amount: 0, profit: 0 },
    },
    records: [],
  });
  const [utilityPeriod, setUtilityPeriod] = React.useState<"today" | "week" | "month" | "year" | "custom">("month");
  const [utilityStartDate, setUtilityStartDate] = React.useState("");
  const [utilityEndDate, setUtilityEndDate] = React.useState("");
  const [utilityBillTypeFilter, setUtilityBillTypeFilter] = React.useState<"ALL" | "ELECTRICITY" | "WATER" | "OTHER">("ALL");
  const [utilityStaffFilter, setUtilityStaffFilter] = React.useState<string>("ALL");
  const [utilitySearchQuery, setUtilitySearchQuery] = React.useState<string>("");
  const [utilityLoading, setUtilityLoading] = React.useState(false);

  // Modals for Communication Items
  const [addItemOpen, setAddItemOpen] = React.useState(false);
  const [editItemOpen, setEditItemOpen] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState<any | null>(null);

  const createItemForm = useForm<CreateCommunicationItemInput>({
    resolver: zodResolver(createCommunicationItemSchema) as any,
    defaultValues: {
      shopId: initialShop._id,
      itemCode: "",
      name: "",
      actualPrice: 0,
      sellingPrice: 0,
      description: "",
      isTelecomReload: false,
      telecomOperator: "DIALOG",
      commissionRate: 4.5,
    },
  });

  const editItemForm = useForm<UpdateCommunicationItemInput>({
    resolver: zodResolver(updateCommunicationItemSchema) as any,
    defaultValues: {
      itemId: "",
      itemCode: "",
      name: "",
      actualPrice: 0,
      sellingPrice: 0,
      description: "",
      isTelecomReload: false,
      telecomOperator: "DIALOG",
      commissionRate: 4.5,
      isActive: true,
    },
  });

  // Daily Cash Settlement State (Communication Shop)
  const [dailySettlements, setDailySettlements] = React.useState<any[]>([]);
  const [dailySettlementBankAccounts, setDailySettlementBankAccounts] = React.useState<any[]>([]);
  const [dailySettlementSummary, setDailySettlementSummary] = React.useState<{
    totalSettled: number;
    totalToPettyCash: number;
    totalToBank: number;
    settlementCount: number;
    lastSettlementDate: string | Date | null;
  }>({
    totalSettled: 0,
    totalToPettyCash: 0,
    totalToBank: 0,
    settlementCount: 0,
    lastSettlementDate: null,
  });
  const [dailySettlementCurrentCash, setDailySettlementCurrentCash] = React.useState<number>(initialStats.currentBalance || 0);
  const [dailySettlementLoading, setDailySettlementLoading] = React.useState(false);
  const [dailySettlementDialogOpen, setDailySettlementDialogOpen] = React.useState(false);
  const [isSubmittingDailySettlement, setIsSubmittingDailySettlement] = React.useState(false);

  // Settlement Form State
  const [dailySettleDate, setDailySettleDate] = React.useState<string>(new Date().toISOString().split("T")[0]);
  const [dailySettleRetainedFloat, setDailySettleRetainedFloat] = React.useState<number>(4000);
  const [dailySettleTransferAmount, setDailySettleTransferAmount] = React.useState<number>(
    Math.max(0, (initialStats.currentBalance || 0) - 4000)
  );
  const [dailySettleDestinationType, setDailySettleDestinationType] = React.useState<"PETTY_CASH" | "BANK_ACCOUNT">("PETTY_CASH");
  const [dailySettleBankAccountId, setDailySettleBankAccountId] = React.useState<string>("");
  const [dailySettleReference, setDailySettleReference] = React.useState<string>("");
  const [dailySettleNote, setDailySettleNote] = React.useState<string>("");

  const fetchDailySettlements = React.useCallback(async () => {
    if (!shop._id) return;
    setDailySettlementLoading(true);
    const res = await getDailySettlementHistoryAction(shop._id);
    if (res.success) {
      setDailySettlements(res.settlements || []);
      setDailySettlementBankAccounts(res.bankAccounts || []);
      if (res.bankAccounts?.length > 0 && !dailySettleBankAccountId) {
        setDailySettleBankAccountId(res.bankAccounts[0]._id);
      }
      if (res.summary) {
        setDailySettlementSummary(res.summary);
      }
      if (typeof res.currentCashBalance === "number") {
        setDailySettlementCurrentCash(res.currentCashBalance);
        const surplus = Math.max(0, res.currentCashBalance - dailySettleRetainedFloat);
        setDailySettleTransferAmount(surplus);
      }
    } else {
      toast.create({
        title: "Settlement data error",
        description: res.error || "Failed to load daily settlement history.",
        type: "error",
      });
    }
    setDailySettlementLoading(false);
  }, [shop._id, dailySettleRetainedFloat, dailySettleBankAccountId]);

  const handleOpenDailySettlementDialog = () => {
    const currentCash = dailySettlementCurrentCash || stats.currentBalance || 0;
    const defaultFloat = 4000;
    const surplus = Math.max(0, currentCash - defaultFloat);

    setDailySettleDate(new Date().toISOString().split("T")[0]);
    setDailySettleRetainedFloat(defaultFloat);
    setDailySettleTransferAmount(surplus);
    setDailySettleDestinationType("PETTY_CASH");
    if (dailySettlementBankAccounts.length > 0 && !dailySettleBankAccountId) {
      setDailySettleBankAccountId(dailySettlementBankAccounts[0]._id);
    }
    setDailySettleReference(`SETTLE-${Date.now().toString().slice(-6)}`);
    setDailySettleNote("");
    setDailySettlementDialogOpen(true);
  };

  const handleRetainedFloatChange = (newFloatVal: number) => {
    const val = isNaN(newFloatVal) ? 0 : Math.max(0, newFloatVal);
    setDailySettleRetainedFloat(val);
    const calculatedTransfer = Math.max(0, dailySettlementCurrentCash - val);
    setDailySettleTransferAmount(calculatedTransfer);
  };

  const handleTransferAmountChange = (newTransferVal: number) => {
    const val = isNaN(newTransferVal) ? 0 : Math.max(0, newTransferVal);
    setDailySettleTransferAmount(val);
  };

  const handleSubmitDailySettlement = async (e: React.FormEvent) => {
    e.preventDefault();

    if (dailySettleTransferAmount <= 0) {
      toast.create({
        title: "Invalid transfer amount",
        description: "Surplus transfer amount must be greater than 0 LKR.",
        type: "error",
      });
      return;
    }

    if (dailySettleTransferAmount > dailySettlementCurrentCash) {
      toast.create({
        title: "Insufficient cash balance",
        description: `Current drawer cash is LKR ${dailySettlementCurrentCash.toLocaleString()}, cannot sweep LKR ${dailySettleTransferAmount.toLocaleString()}.`,
        type: "error",
      });
      return;
    }

    if (dailySettleDestinationType === "BANK_ACCOUNT" && !dailySettleBankAccountId) {
      toast.create({
        title: "Bank Account Required",
        description: "Please select an active destination bank account.",
        type: "error",
      });
      return;
    }

    setIsSubmittingDailySettlement(true);
    const res = await recordDailyCashSettlementAction({
      shopId: shop._id,
      date: dailySettleDate,
      totalCashBefore: dailySettlementCurrentCash,
      retainedFloat: Number(dailySettleRetainedFloat),
      transferAmount: Number(dailySettleTransferAmount),
      destinationType: dailySettleDestinationType,
      bankAccountId: dailySettleDestinationType === "BANK_ACCOUNT" ? dailySettleBankAccountId : null,
      reference: dailySettleReference.trim(),
      note: dailySettleNote.trim(),
    });

    if (res.success) {
      toast.create({
        title: "Settlement Recorded",
        description: res.message || "Daily cash settlement successfully recorded.",
        type: "success",
      });
      setDailySettlementDialogOpen(false);
      fetchDailySettlements();
      const shopRes = await getShopDetailsAction(shop._id);
      if (shopRes.success && shopRes.stats) {
        setStats(shopRes.stats);
      }
    } else {
      toast.create({
        title: "Settlement Failed",
        description: res.error || "Failed to record daily settlement.",
        type: "error",
      });
    }
    setIsSubmittingDailySettlement(false);
  };

  React.useEffect(() => {
    if (activeTab === "dailySettlement" && isCommunication) {
      fetchDailySettlements();
    }
  }, [activeTab, isCommunication, fetchDailySettlements]);

  const settlementColumns: ColumnDef<any>[] = [
    {
      accessorKey: "date",
      header: "Date & Time",
      cell: ({ row }) => {
        const d = new Date(row.original.createdAt || row.original.date);
        return (
          <div className="flex flex-col">
            <span className="font-mono text-xs">{d.toLocaleDateString()}</span>
            <span className="text-[10px] text-muted-foreground">
              {d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "reference",
      header: "Reference #",
      cell: ({ row }) => (
        <span className="font-mono text-xs font-semibold text-foreground">
          {row.original.reference || "-"}
        </span>
      ),
    },
    {
      accessorKey: "totalCashBefore",
      header: "Drawer Cash Before",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          LKR {Number(row.original.totalCashBefore || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      accessorKey: "retainedFloat",
      header: "Retained Float",
      cell: ({ row }) => (
        <Badge variant="outline" className="font-mono text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
          LKR {Number(row.original.retainedFloat || 4000).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </Badge>
      ),
    },
    {
      accessorKey: "transferAmount",
      header: "Swept / Transferred",
      cell: ({ row }) => (
        <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
          + LKR {Number(row.original.transferAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      accessorKey: "destinationType",
      header: "Destination",
      cell: ({ row }) => {
        const isPetty = row.original.destinationType === "PETTY_CASH";
        const bank = row.original.bankAccount;
        return (
          <div className="flex items-center gap-1.5">
            {isPetty ? (
              <Badge variant="secondary" className="text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                <CoinsIcon className="size-3 mr-1" />
                Central Petty Cash
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                <LandmarkIcon className="size-3 mr-1" />
                {bank ? `${bank.bankName} (${bank.accountNumber})` : "Bank Account"}
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "settledBy",
      header: "Settled By",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {row.original.settledBy?.name || row.original.settledBy?.email || "Admin"}
        </span>
      ),
    },
    {
      accessorKey: "note",
      header: "Note",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground truncate max-w-[150px] inline-block" title={row.original.note}>
          {row.original.note || "-"}
        </span>
      ),
    },
  ];

  // Inter-Branch Cash Settlement State
  const [settleOpen, setSettleOpen] = React.useState(false);
  const [selectedHoldingDue, setSelectedHoldingDue] = React.useState<any | null>(null);
  const [settlementType, setSettlementType] = React.useState<
    "HANDOVER_TO_BRANCH" | "DEPOSITED_TO_BANK" | "DIRECT_OFFSET"
  >("HANDOVER_TO_BRANCH");
  const [settlementBankId, setSettlementBankId] = React.useState<string | null>(null);
  const [settlementRef, setSettlementRef] = React.useState("");
  const [settlementNote, setSettlementNote] = React.useState("");
  const [submittingSettlement, setSubmittingSettlement] = React.useState(false);
  const [bankAccounts, setBankAccounts] = React.useState<any[]>([]);

  const handleOpenSettle = async (due: any) => {
    setSelectedHoldingDue(due);
    setSettlementType("HANDOVER_TO_BRANCH");
    setSettlementBankId(null);
    setSettlementRef("");
    setSettlementNote("");
    setSettleOpen(true);

    if (bankAccounts.length === 0) {
      try {
        const res = await getActiveBankAccountsAction();
        if (res.success && res.accounts) {
          setBankAccounts(res.accounts);
          if (res.accounts.length > 0) setSettlementBankId(res.accounts[0]._id);
        }
      } catch (err) {
        console.error("Failed to load bank accounts for settlement:", err);
      }
    }
  };

  const handleSettleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHoldingDue) return;

    if (settlementType === "DEPOSITED_TO_BANK" && !settlementBankId) {
      toast.create({
        title: "Bank Account Required",
        description: "Please select a bank account to deposit the collected cash.",
        type: "error",
      });
      return;
    }

    setSubmittingSettlement(true);
    try {
      const res = await settleInterBranchCashAction({
        recordIds: selectedHoldingDue.recordIds,
        holdingShopId: shop._id,
        targetShopId: selectedHoldingDue.shopId,
        settlementType,
        bankAccountId: settlementType === "DEPOSITED_TO_BANK" ? settlementBankId : null,
        reference: settlementRef,
        note: settlementNote,
      });

      if (res.success) {
        toast.create({
          title: "Inter-Branch Cash Settled",
          description: res.message || "Settlement completed successfully.",
          type: "success",
        });
        setSettleOpen(false);
        setSelectedHoldingDue(null);
        fetchShopData();
      } else {
        toast.create({
          title: "Settlement Failed",
          description: res.error || "Failed to settle inter-branch cash.",
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
      setSubmittingSettlement(false);
    }
  };

  // Standard Analytics State
  const [analytics, setAnalytics] = React.useState<{
    kpis: {
      totalTransactions: number;
      totalExpense: number;
      totalIncome: number;
      pendingApprovals: number;
      approvedAmount: number;
      rejectedAmount: number;
      netBalance: number;
      periodCashInflow?: number;
      periodCashOutflow?: number;
      periodCashBalance?: number;
      periodClosingCashBalance?: number;
    };
    timelineData: Array<{ date: string; income: number; expense: number }>;
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
      periodCashInflow: 0,
      periodCashOutflow: 0,
      periodCashBalance: 0,
      periodClosingCashBalance: 0,
    },
    timelineData: [],
    categoryBreakdownData: [],
    records: [],
  });

  // Cash Drawer Audit & Diagnostic State
  const [auditOpen, setAuditOpen] = React.useState(false);
  const [auditLoading, setAuditLoading] = React.useState(false);
  const [syncingCash, setSyncingCash] = React.useState(false);
  const [cashAuditData, setCashAuditData] = React.useState<any | null>(null);

  const handleOpenAudit = async () => {
    setAuditOpen(true);
    setAuditLoading(true);
    try {
      const res = await getShopCashAuditAction(shop._id);
      if (res.success && res.audit) {
        setCashAuditData(res.audit);
      } else {
        toast.create({
          title: "Audit Error",
          description: res.error || "Failed to load cash audit.",
          type: "error",
        });
      }
    } catch (err) {
      console.error("Cash audit error:", err);
    } finally {
      setAuditLoading(false);
    }
  };

  const handleRecalculateAndSync = async () => {
    setSyncingCash(true);
    try {
      const res = await recalculateAndSyncShopCashAction(shop._id);
      if (res.success) {
        toast.create({
          title: "Cash Drawer Synced",
          description: res.message || "Running balance synced successfully.",
          type: "success",
        });
        if (res.audit) {
          setCashAuditData(res.audit);
          setStats((prev) => ({
            ...prev,
            currentBalance: res.audit.currentDrawerBalance,
          }));
        }
        fetchShopData();
      } else {
        toast.create({
          title: "Sync Failed",
          description: res.error || "Failed to recalculate cash.",
          type: "error",
        });
      }
    } catch {
      toast.create({ title: "Error", description: "Unexpected error while syncing.", type: "error" });
    } finally {
      setSyncingCash(false);
    }
  };

  const fetchShopData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [analyticsRes, shopRes] = await Promise.all([
        getSummaryAnalyticsAction({
          period,
          startDate: period === "custom" ? startDate : undefined,
          endDate: period === "custom" ? endDate : undefined,
          shopId: shop._id,
        }),
        getShopDetailsAction(shop._id),
      ]);

      if (analyticsRes.success && analyticsRes.kpis) {
        setAnalytics({
          kpis: analyticsRes.kpis,
          timelineData: analyticsRes.timelineData || [],
          categoryBreakdownData: analyticsRes.categoryBreakdownData || [],
          records: analyticsRes.records || [],
        });
      }

      if (shopRes.success && shopRes.shop) {
        setShop(shopRes.shop);
        setStaff(shopRes.assignedStaff || []);
        if (shopRes.stats) {
          setStats(shopRes.stats);
        }
      }

      // If communication, also fetch items, communication analytics & customer credits
      if (isCommunication) {
        const [itemsRes, commAnalyticsRes, creditRes, wastageRes, utilityRes] = await Promise.all([
          getCommunicationItemsAction(shop._id),
          getCommunicationAnalyticsAction({
            shopId: shop._id,
            period,
            startDate: period === "custom" ? startDate : undefined,
            endDate: period === "custom" ? endDate : undefined,
            itemCodeFilter: itemFilter,
          }),
          getShopCreditCustomersAction(shop._id, creditSearch),
          getItemWastageAnalyticsAction({
            shopId: shop._id,
            period,
            startDate: period === "custom" ? startDate : undefined,
            endDate: period === "custom" ? endDate : undefined,
          }),
          getUtilityBillAnalyticsAction({
            shopId: shop._id,
            period: utilityPeriod,
            startDate: utilityPeriod === "custom" ? utilityStartDate : undefined,
            endDate: utilityPeriod === "custom" ? utilityEndDate : undefined,
            billTypeFilter: utilityBillTypeFilter,
            staffFilter: utilityStaffFilter,
            search: utilitySearchQuery,
          }),
        ]);

        if (itemsRes.success) setCommItems(itemsRes.items || []);
        if (commAnalyticsRes.success) {
          setCommAnalytics({
            totalRevenue: commAnalyticsRes.totalRevenue || 0,
            totalCost: commAnalyticsRes.totalCost || 0,
            netProfit: commAnalyticsRes.netProfit || 0,
            totalTransactions: commAnalyticsRes.totalTransactions || 0,
            branchRelatedCount: commAnalyticsRes.branchRelatedCount || 0,
            nonBranchCount: commAnalyticsRes.nonBranchCount || 0,
            records: commAnalyticsRes.records || [],
            itemBreakdown: commAnalyticsRes.itemBreakdown || [],
            telecomBreakdown: (commAnalyticsRes as any).telecomBreakdown || [],
            periodCashInflow: commAnalyticsRes.periodCashInflow || 0,
            periodCashOutflow: commAnalyticsRes.periodCashOutflow || 0,
            periodCashBalance: commAnalyticsRes.periodCashBalance || 0,
            periodClosingCashBalance: commAnalyticsRes.periodClosingCashBalance || 0,
          });
        }
        if (creditRes.success && creditRes.customers) {
          setCreditCustomers(creditRes.customers);
          if (creditRes.stats) {
            setCreditStats(creditRes.stats);
          }
        }
        if (wastageRes?.success) {
          setWastageAnalytics({
            totalWastedUnits: wastageRes.totalWastedUnits || 0,
            totalMonetaryLoss: wastageRes.totalMonetaryLoss || 0,
            incidentCount: wastageRes.incidentCount || 0,
            itemBreakdown: wastageRes.itemBreakdown || [],
            incidents: wastageRes.incidents || [],
          });
        }
        if (utilityRes?.success) {
          setUtilityAnalytics({
            totalBillsCount: utilityRes.totalBillsCount || 0,
            totalCollected: utilityRes.totalCollected || 0,
            totalBillAmount: utilityRes.totalBillAmount || 0,
            totalServiceCharges: utilityRes.totalServiceCharges || 0,
            totalProviderFees: utilityRes.totalProviderFees || 0,
            totalNetProfit: utilityRes.totalNetProfit || 0,
            breakdown: utilityRes.breakdown || {
              electricity: { count: 0, amount: 0, profit: 0 },
              water: { count: 0, amount: 0, profit: 0 },
              other: { count: 0, amount: 0, profit: 0 },
            },
            records: utilityRes.records || [],
          });
        }
      }
    } catch (err) {
      console.error("Failed to load shop analytics:", err);
      toast.create({
        title: "Error loading analytics",
        description: "Failed to connect to branch records server.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [
    period,
    startDate,
    endDate,
    itemFilter,
    shop._id,
    isCommunication,
    creditSearch,
    utilityPeriod,
    utilityStartDate,
    utilityEndDate,
    utilityBillTypeFilter,
    utilityStaffFilter,
    utilitySearchQuery,
  ]);

  const fetchUtilityData = React.useCallback(async () => {
    if (!isCommunication) return;
    setUtilityLoading(true);
    try {
      const res = await getUtilityBillAnalyticsAction({
        shopId: shop._id,
        period: utilityPeriod,
        startDate: utilityPeriod === "custom" ? utilityStartDate : undefined,
        endDate: utilityPeriod === "custom" ? utilityEndDate : undefined,
        billTypeFilter: utilityBillTypeFilter,
        staffFilter: utilityStaffFilter,
        search: utilitySearchQuery,
      });
      if (res.success) {
        setUtilityAnalytics({
          totalBillsCount: res.totalBillsCount || 0,
          totalCollected: res.totalCollected || 0,
          totalBillAmount: res.totalBillAmount || 0,
          totalServiceCharges: res.totalServiceCharges || 0,
          totalProviderFees: res.totalProviderFees || 0,
          totalNetProfit: res.totalNetProfit || 0,
          breakdown: res.breakdown || {
            electricity: { count: 0, amount: 0, profit: 0 },
            water: { count: 0, amount: 0, profit: 0 },
            other: { count: 0, amount: 0, profit: 0 },
          },
          records: res.records || [],
        });
      }
    } finally {
      setUtilityLoading(false);
    }
  }, [
    isCommunication,
    shop._id,
    utilityPeriod,
    utilityStartDate,
    utilityEndDate,
    utilityBillTypeFilter,
    utilityStaffFilter,
    utilitySearchQuery,
  ]);

  React.useEffect(() => {
    if (isCommunication) {
      fetchUtilityData();
    }
  }, [fetchUtilityData, isCommunication]);

  const handleExportUtilityBillsCSV = () => {
    if (!utilityAnalytics.records || utilityAnalytics.records.length === 0) {
      toast.create({
        title: "No records to export",
        description: "There are no bill payments recorded for this period.",
        type: "warning",
      });
      return;
    }

    const headers = [
      "Date",
      "Bill Number",
      "Bill Type",
      "Account Number",
      "Customer Name",
      "Customer Phone",
      "Bill Amount (LKR)",
      "Service Charge (LKR)",
      "Provider Fee (LKR)",
      "Total Collected (LKR)",
      "Shop Net Profit (LKR)",
      "Payment Method",
      "Processed By",
      "Status",
    ];

    const rows = utilityAnalytics.records.map((r) => [
      `"${new Date(r.date).toLocaleString()}"`,
      `"${r.billNumber || ""}"`,
      `"${r.utilityBillType || "UTILITY"}"`,
      `"${r.utilityAccountNumber || ""}"`,
      `"${(r.customerName || "").replace(/"/g, '""')}"`,
      `"${r.customerPhone || ""}"`,
      Number(r.billAmount || 0).toFixed(2),
      Number(r.serviceCharge || 0).toFixed(2),
      Number(r.providerFee || 0).toFixed(2),
      Number(r.amount || 0).toFixed(2),
      Number(r.commissionEarned || 0).toFixed(2),
      `"${r.paymentMethod || "CASH"}"`,
      `"${(r.createdBy?.name || "Staff").replace(/"/g, '""')}"`,
      `"${r.status || "APPROVED"}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `${shop.code}-utility-bills-${utilityPeriod}-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fetchCreditCustomers = React.useCallback(async (searchQuery?: string) => {
    if (!isCommunication) return;
    setCreditLoading(true);
    try {
      const query = searchQuery !== undefined ? searchQuery : creditSearch;
      const res = await getShopCreditCustomersAction(shop._id, query);
      if (res.success && res.customers) {
        setCreditCustomers(res.customers);
        if (res.stats) {
          setCreditStats(res.stats);
        }
      }
    } catch (err) {
      console.error("Failed to load credit customers:", err);
    } finally {
      setCreditLoading(false);
    }
  }, [isCommunication, shop._id, creditSearch]);

  const handleOpenStatement = async (customerId: string) => {
    setStatementLoading(true);
    setStatementOpen(true);
    setCustomerStatement(null);
    try {
      const res = await getCustomerCreditStatementAction(customerId);
      if (res.success && res.customer && res.transactions) {
        setCustomerStatement({
          customer: res.customer,
          transactions: res.transactions,
        });
      } else {
        toast.create({
          title: "Statement Failed",
          description: res.error || "Failed to load statement",
          type: "error",
        });
      }
    } catch {
      toast.create({
        title: "Error",
        description: "An unexpected error occurred while loading customer statement.",
        type: "error",
      });
    } finally {
      setStatementLoading(false);
    }
  };

  React.useEffect(() => {
    fetchShopData();
  }, [fetchShopData]);

  React.useEffect(() => {
    if (activeTab === "credits") {
      fetchCreditCustomers();
    }
  }, [activeTab]);

  // Item Management Handlers
  const onAddItem = async (data: CreateCommunicationItemInput) => {
    try {
      if (data.isTelecomReload) {
        // For telecom reload items: prices are dynamic at POS, zero out fixed prices
        data.actualPrice = 0;
        data.sellingPrice = 0;
        if (!data.commissionRate || data.commissionRate <= 0) {
          data.commissionRate = 4.0;
        }
      } else {
        // For standard items: clear any telecom-specific fields
        data.isTelecomReload = false;
        data.telecomOperator = undefined as any;
        data.commissionRate = 0;
      }
      const res = await createCommunicationItemAction(data);
      if (res.success) {
        toast.create({
          title: "Item Registered",
          description: `Item "${data.itemCode}" added to inventory successfully.`,
          type: "success",
        });
        setAddItemOpen(false);
        createItemForm.reset();
        fetchShopData();
      } else {
        toast.create({
          title: "Failed to Add Item",
          description: res.error || "An error occurred",
          type: "error",
        });
      }
    } catch {
      toast.create({ title: "Error", description: "Unexpected error", type: "error" });
    }
  };

  const onEditItem = async (data: UpdateCommunicationItemInput) => {
    try {
      if (data.isTelecomReload) {
        // For telecom reload items: prices are dynamic at POS, zero out fixed prices
        data.actualPrice = 0;
        data.sellingPrice = 0;
        if (!data.commissionRate || data.commissionRate <= 0) {
          data.commissionRate = 4.0;
        }
      } else {
        // For standard items: clear any telecom-specific fields
        data.isTelecomReload = false;
        data.telecomOperator = undefined as any;
        data.commissionRate = 0;
      }
      const res = await updateCommunicationItemAction(data);
      if (res.success) {
        toast.create({
          title: "Item Updated",
          description: "Item changes saved successfully.",
          type: "success",
        });
        setEditItemOpen(false);
        fetchShopData();
      } else {
        toast.create({
          title: "Failed to Update",
          description: res.error || "An error occurred",
          type: "error",
        });
      }
    } catch {
      toast.create({ title: "Error", description: "Unexpected error", type: "error" });
    }
  };

  const onDeleteItem = async (itemId: string) => {
    if (!confirm("Are you sure you want to delete this inventory item?")) return;
    try {
      const res = await deleteCommunicationItemAction(itemId);
      if (res.success) {
        toast.create({ title: "Item Deleted", description: "Item removed from inventory.", type: "success" });
        fetchShopData();
      } else {
        toast.create({ title: "Delete Failed", description: res.error || "An error occurred", type: "error" });
      }
    } catch {
      toast.create({ title: "Error", description: "Unexpected error", type: "error" });
    }
  };

  // Export CSV Function
  const exportCSV = () => {
    const recordsToExport = isCommunication ? commAnalytics.records : analytics.records;
    if (!recordsToExport.length) {
      toast.create({
        title: "No records to export",
        description: "There is no ledger data matching the active filters for this branch.",
        type: "warning",
      });
      return;
    }

    if (isCommunication) {
      const headers = [
        "Date",
        "Bill Number",
        "Item Code",
        "Item Name",
        "Actual Cost (LKR)",
        "Selling Price (LKR)",
        "Discount (LKR)",
        "Net Amount (LKR)",
        "Branch Related",
        "Target Branch",
        "Status",
      ];

      const rows = recordsToExport.map((r) => [
        `"${new Date(r.date).toISOString().split("T")[0]}"`,
        `"${r.billNumber || ""}"`,
        `"${r.itemCode || "UNLISTED"}"`,
        `"${(r.itemName || r.reason || "").replace(/"/g, '""')}"`,
        r.actualPrice || 0,
        r.sellingPrice || 0,
        r.discountPrice || 0,
        r.approvedAmount ?? r.amount,
        r.isRelatedToBranch ? "YES" : "NO",
        `"${r.relatedBranch?.name || ""}"`,
        `"${r.status}"`,
      ]);

      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `${shop.code}_Communication_${period}_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const headers = ["Date", "Branch", "Bill Number", "Payment Method", "Category", "Type", "Reason", "Submitted Amount", "Status", "Approved Amount", "Running Balance"];
      const rows = recordsToExport.map((r) => [
        `"${new Date(r.date).toISOString().split("T")[0]}"`,
        `"${shop.name}"`,
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

      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `${shop.code}_Financial_Summary_${period}_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    toast.create({
      title: "Export complete",
      description: `Downloaded ${recordsToExport.length} records for ${shop.name} in CSV format.`,
      type: "success",
    });
  };

  // Telecom Operator Branding & Style Config
  const OPERATOR_STYLES: Record<string, {
    color: string;
    badgeBg: string;
    borderClass: string;
    activeRing: string;
    accentText: string;
    dotColor: string;
  }> = {
    DIALOG: {
      color: "from-red-500/15 via-red-500/5 to-card",
      badgeBg: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
      borderClass: "border-red-500/25 hover:border-red-500/50",
      activeRing: "ring-2 ring-red-500 border-red-500 shadow-lg shadow-red-500/10 bg-red-500/10",
      accentText: "text-red-600 dark:text-red-400",
      dotColor: "bg-red-500",
    },
    MOBITEL: {
      color: "from-blue-500/15 via-blue-500/5 to-card",
      badgeBg: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
      borderClass: "border-blue-500/25 hover:border-blue-500/50",
      activeRing: "ring-2 ring-blue-500 border-blue-500 shadow-lg shadow-blue-500/10 bg-blue-500/10",
      accentText: "text-blue-600 dark:text-blue-400",
      dotColor: "bg-blue-500",
    },
    AIRTEL: {
      color: "from-rose-500/15 via-rose-500/5 to-card",
      badgeBg: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
      borderClass: "border-rose-500/25 hover:border-rose-500/50",
      activeRing: "ring-2 ring-rose-500 border-rose-500 shadow-lg shadow-rose-500/10 bg-rose-500/10",
      accentText: "text-rose-600 dark:text-rose-400",
      dotColor: "bg-rose-500",
    },
    HUTCH: {
      color: "from-amber-500/15 via-amber-500/5 to-card",
      badgeBg: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
      borderClass: "border-amber-500/25 hover:border-amber-500/50",
      activeRing: "ring-2 ring-amber-500 border-amber-500 shadow-lg shadow-amber-500/10 bg-amber-500/10",
      accentText: "text-amber-600 dark:text-amber-400",
      dotColor: "bg-amber-500",
    },
    OTHER: {
      color: "from-purple-500/15 via-purple-500/5 to-card",
      badgeBg: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30",
      borderClass: "border-purple-500/25 hover:border-purple-500/50",
      activeRing: "ring-2 ring-purple-500 border-purple-500 shadow-lg shadow-purple-500/10 bg-purple-500/10",
      accentText: "text-purple-600 dark:text-purple-400",
      dotColor: "bg-purple-500",
    },
  };

  const renderOperatorBadge = (operator?: string) => {
    switch (operator) {
      case "DIALOG":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30">
            <span className="size-1.5 rounded-full bg-red-500 inline-block animate-pulse" />
            Dialog (D)
          </span>
        );
      case "MOBITEL":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30">
            <span className="size-1.5 rounded-full bg-blue-500 inline-block animate-pulse" />
            Mobitel (M)
          </span>
        );
      case "AIRTEL":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30">
            <span className="size-1.5 rounded-full bg-rose-500 inline-block animate-pulse" />
            Airtel (A)
          </span>
        );
      case "HUTCH":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            <span className="size-1.5 rounded-full bg-amber-500 inline-block animate-pulse" />
            Hutch (H)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/30">
            <span className="size-1.5 rounded-full bg-purple-500 inline-block" />
            Other Items
          </span>
        );
    }
  };

  const telecomData = React.useMemo(() => {
    if (commAnalytics.telecomBreakdown && commAnalytics.telecomBreakdown.length > 0) {
      return commAnalytics.telecomBreakdown;
    }
    const map: Record<string, any> = {
      DIALOG: { operator: "DIALOG", name: "Dialog", codePrefix: "D", revenue: 0, cost: 0, profit: 0, quantity: 0, txCount: 0, marginPct: 0 },
      MOBITEL: { operator: "MOBITEL", name: "Mobitel", codePrefix: "M", revenue: 0, cost: 0, profit: 0, quantity: 0, txCount: 0, marginPct: 0 },
      AIRTEL: { operator: "AIRTEL", name: "Airtel", codePrefix: "A", revenue: 0, cost: 0, profit: 0, quantity: 0, txCount: 0, marginPct: 0 },
      HUTCH: { operator: "HUTCH", name: "Hutch", codePrefix: "H", revenue: 0, cost: 0, profit: 0, quantity: 0, txCount: 0, marginPct: 0 },
      OTHER: { operator: "OTHER", name: "Other Items & Services", codePrefix: "*", revenue: 0, cost: 0, profit: 0, quantity: 0, txCount: 0, marginPct: 0 },
    };
    for (const it of commAnalytics.itemBreakdown || []) {
      const op = it.operator || "OTHER";
      if (map[op]) {
        map[op].revenue += it.revenue || 0;
        map[op].cost += it.cost || 0;
        map[op].profit += it.profit || 0;
        map[op].quantity += it.quantity || 0;
        map[op].txCount += 1;
      }
    }
    return Object.values(map).map((t: any) => ({
      ...t,
      marginPct: t.revenue > 0 ? Number(((t.profit / t.revenue) * 100).toFixed(1)) : 0,
    }));
  }, [commAnalytics.telecomBreakdown, commAnalytics.itemBreakdown]);

  const filteredAndSortedItems = React.useMemo(() => {
    let list = (commAnalytics.itemBreakdown || []) as Array<{
      itemCode: string;
      itemName: string;
      operator: TelecomOperator;
      quantity: number;
      unitCost: number;
      unitSellingPrice: number;
      revenue: number;
      cost: number;
      profit: number;
      marginPct: number;
    }>;

    if (selectedOperatorFilter !== "ALL") {
      list = list.filter((it) => it.operator === selectedOperatorFilter);
    }

    if (itemSearchQuery.trim()) {
      const q = itemSearchQuery.trim().toLowerCase();
      list = list.filter(
        (it) =>
          it.itemCode?.toLowerCase().includes(q) ||
          it.itemName?.toLowerCase().includes(q)
      );
    }

    return [...list].sort((a, b) => {
      let comparison = 0;
      if (itemSortBy === "revenue") comparison = a.revenue - b.revenue;
      else if (itemSortBy === "profit") comparison = a.profit - b.profit;
      else if (itemSortBy === "quantity") comparison = a.quantity - b.quantity;
      else if (itemSortBy === "margin") comparison = a.marginPct - b.marginPct;
      else if (itemSortBy === "code") comparison = a.itemCode.localeCompare(b.itemCode);

      return itemSortOrder === "desc" ? -comparison : comparison;
    });
  }, [commAnalytics.itemBreakdown, selectedOperatorFilter, itemSearchQuery, itemSortBy, itemSortOrder]);

  const filteredTotals = React.useMemo(() => {
    let qty = 0;
    let rev = 0;
    let cost = 0;
    let profit = 0;
    for (const it of filteredAndSortedItems) {
      qty += it.quantity || 0;
      rev += it.revenue || 0;
      cost += it.cost || 0;
      profit += it.profit || 0;
    }
    const margin = rev > 0 ? Number(((profit / rev) * 100).toFixed(1)) : 0;
    return { qty, rev, cost, profit, margin };
  }, [filteredAndSortedItems]);

  const handleExportItemSalesCSV = () => {
    const headers = [
      "Item Code",
      "Item Name",
      "Operator",
      "Quantity Sold",
      "Base Cost (LKR)",
      "Total Sales / Revenue (LKR)",
      "Total Cost (LKR)",
      "Net Profit (LKR)",
      "Margin (%)",
    ];

    const rows = filteredAndSortedItems.map((item) => [
      `"${item.itemCode}"`,
      `"${(item.itemName || "").replace(/"/g, '""')}"`,
      `"${item.operator}"`,
      item.quantity,
      item.unitCost || 0,
      item.revenue || 0,
      item.cost || 0,
      item.profit || 0,
      `"${item.marginPct || 0}%"`,
    ]);

    rows.push([
      `"TOTALS"`,
      `"Filtered Total (${filteredAndSortedItems.length} items)"`,
      `"${selectedOperatorFilter}"`,
      filteredTotals.qty,
      "",
      filteredTotals.rev,
      filteredTotals.cost,
      filteredTotals.profit,
      `"${filteredTotals.margin}%"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `${shop.code || "SHOP"}_Item_Wise_Sales_${selectedOperatorFilter}_${period}_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.create({
      title: "Export complete",
      description: `Downloaded ${filteredAndSortedItems.length} item sales records in CSV format.`,
      type: "success",
    });
  };

  // Registered Products & Services Filtering and Sorting Logic
  const filteredAndSortedCommItems = React.useMemo(() => {
    let list = [...commItems];

    if (commItemTypeFilter === "RELOAD") {
      list = list.filter((it) => it.isTelecomReload);
    } else if (commItemTypeFilter === "STANDARD") {
      list = list.filter((it) => !it.isTelecomReload);
    }

    if (commItemOperatorFilter !== "ALL") {
      list = list.filter((it) => (it.telecomOperator || classifyTelecomOperator(it.itemCode)) === commItemOperatorFilter);
    }

    if (commItemStatusFilter === "ACTIVE") {
      list = list.filter((it) => it.isActive);
    } else if (commItemStatusFilter === "DISABLED") {
      list = list.filter((it) => !it.isActive);
    }

    if (commItemSearch.trim()) {
      const q = commItemSearch.trim().toLowerCase();
      list = list.filter(
        (it) =>
          it.itemCode?.toLowerCase().includes(q) ||
          it.name?.toLowerCase().includes(q) ||
          it.description?.toLowerCase().includes(q) ||
          it.telecomOperator?.toLowerCase().includes(q)
      );
    }

    return list.sort((a, b) => {
      let cmp = 0;
      if (commItemSortBy === "name") cmp = (a.name || "").localeCompare(b.name || "");
      else if (commItemSortBy === "code") cmp = (a.itemCode || "").localeCompare(b.itemCode || "");
      else if (commItemSortBy === "actualPrice") cmp = (a.actualPrice || 0) - (b.actualPrice || 0);
      else if (commItemSortBy === "sellingPrice") cmp = (a.sellingPrice || 0) - (b.sellingPrice || 0);
      else if (commItemSortBy === "margin") {
        const marginA = a.isTelecomReload ? (a.commissionRate || 0) : ((a.sellingPrice || 0) - (a.actualPrice || 0));
        const marginB = b.isTelecomReload ? (b.commissionRate || 0) : ((b.sellingPrice || 0) - (b.actualPrice || 0));
        cmp = marginA - marginB;
      }
      return commItemSortOrder === "desc" ? -cmp : cmp;
    });
  }, [commItems, commItemSearch, commItemTypeFilter, commItemOperatorFilter, commItemStatusFilter, commItemSortBy, commItemSortOrder]);

  const commItemStats = React.useMemo(() => {
    let active = 0;
    let reloads = 0;
    let standard = 0;
    for (const it of commItems) {
      if (it.isActive) active++;
      if (it.isTelecomReload) reloads++;
      else standard++;
    }
    return {
      total: commItems.length,
      active,
      reloads,
      standard,
    };
  }, [commItems]);

  const handleExportWastageCSV = () => {
    const headers = [
      "Date & Time",
      "Item Code",
      "Item Name",
      "Wasted Quantity",
      "Base Unit Cost (LKR)",
      "Total Financial Loss (LKR)",
      "Reason / Defect Description",
      "Reported By",
    ];

    const rows = wastageAnalytics.incidents.map((inc) => [
      `"${new Date(inc.date).toLocaleString()}"`,
      `"${inc.itemCode || ""}"`,
      `"${(inc.itemName || "").replace(/"/g, '""')}"`,
      inc.quantity || 0,
      inc.unitBasePrice || 0,
      inc.totalLoss || 0,
      `"${(inc.reason || "").replace(/"/g, '""')}"`,
      `"${inc.reportedBy?.name || "Staff"}"`,
    ]);

    rows.push([
      `"TOTALS"`,
      `"All Incidents (${wastageAnalytics.incidents.length})"`,
      `""`,
      wastageAnalytics.totalWastedUnits,
      `""`,
      wastageAnalytics.totalMonetaryLoss,
      `""`,
      `""`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `${shop.code || "SHOP"}_Item_Wastage_Report_${period}_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.create({
      title: "Wastage Export Complete",
      description: `Downloaded ${wastageAnalytics.incidents.length} wastage incidents in CSV.`,
      type: "success",
    });
  };

  // Table Columns for Standard Branch
  const standardColumns: ColumnDef<any>[] = [
    {
      accessorKey: "date",
      header: "Date & Time",
      cell: ({ row }) => {
        const rawDate = row.original.createdAt || row.original.date;
        const d = new Date(rawDate);
        return (
          <div className="flex flex-col">
            <span className="font-mono text-xs whitespace-nowrap">{d.toLocaleDateString()}</span>
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
        <span className="font-mono text-xs font-semibold text-primary">{row.original.billNumber}</span>
      ),
    },
    {
      accessorKey: "category.name",
      header: "Category",
      cell: ({ row }) => (
        <div className="max-w-[180px] min-w-0">
          <CategoryBadge name={row.original.category?.name || "Uncategorized"} colorToken={row.original.category?.colorToken} />
        </div>
      ),
    },
    {
      accessorKey: "paymentMethod",
      header: "Method",
      cell: ({ row }) => (
        <span className="text-xs uppercase font-mono text-muted-foreground">{row.original.paymentMethod}</span>
      ),
    },
    {
      accessorKey: "reason",
      header: "Reason / Notes",
      cell: ({ row }) => (
        <span className="truncate max-w-[200px] text-xs block text-muted-foreground">{row.original.reason}</span>
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
  ];

  // Table Columns for Communication Shop Overview
  const commColumns: ColumnDef<any>[] = [
    {
      accessorKey: "date",
      header: "Date & Time",
      cell: ({ row }) => {
        const rawDate = row.original.createdAt || row.original.date;
        const d = new Date(rawDate);
        return (
          <div className="flex flex-col">
            <span className="font-mono text-xs whitespace-nowrap">{d.toLocaleDateString()}</span>
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
        <span className="font-mono text-xs font-semibold text-primary">{row.original.billNumber}</span>
      ),
    },
    {
      accessorKey: "itemCode",
      header: "Item Code",
      cell: ({ row }) => (
        <span className="font-mono text-xs font-semibold bg-muted px-2 py-0.5 rounded border border-border">
          {row.original.itemCode || "UNLISTED"}
        </span>
      ),
    },
    {
      accessorKey: "itemName",
      header: "Item Name / Notes",
      cell: ({ row }) => (
        <span className="text-xs text-foreground font-medium truncate max-w-xs block">
          {row.original.itemName || row.original.reason}
        </span>
      ),
    },
    {
      accessorKey: "actualPrice",
      header: "Cost (LKR)",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          LKR {Number(row.original.actualPrice || 0).toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: "amount",
      header: "Net Sales (LKR)",
      cell: ({ row }) => (
        <span className="font-mono text-xs font-semibold text-chart-2">
          LKR {Number(row.original.approvedAmount ?? row.original.amount).toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: "isRelatedToBranch",
      header: "Branch / Cross-Payment",
      cell: ({ row }) => {
        const r = row.original;
        if (r.isCrossBranchPayment) {
          const isBranchExpense = r.type === "EXPENSE" || Boolean(r.isCommunicationItem);
          return (
            <div className="flex flex-col gap-0.5">
              <Badge variant="outline" className={`text-[10px] font-semibold ${isBranchExpense
                ? "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300"
                : "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-400"
                }`}>
                {isBranchExpense ? "Expense For: " : "For: "}
                {r.beneficiaryShop?.name || r.relatedBranch?.name || "Other Branch"}
              </Badge>
              <span className={`text-[9px] font-mono px-1 py-0 rounded border w-fit ${r.interBranchSettlementStatus === "SETTLED"
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                }`}>
                {r.interBranchSettlementStatus === "SETTLED" ? "Settled" : "Unsettled"}
              </span>
            </div>
          );
        }
        if (r.isRelatedToBranch) {
          return (
            <Badge variant="outline" className="text-[10px] border-primary/40 bg-primary/10 text-primary">
              {r.relatedBranch?.name || "Branch Linked"}
            </Badge>
          );
        }
        return <span className="text-[11px] text-muted-foreground">Direct Retail</span>;
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
  ];

  // Table Columns for Inventory Items
  const itemColumns: ColumnDef<any>[] = [
    {
      accessorKey: "itemCode",
      header: "Item Code",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex flex-col gap-1 items-start">
            <span className="font-mono text-xs font-bold uppercase rounded-md bg-muted px-2 py-0.5 border border-border">
              {item.itemCode}
            </span>
            {item.isTelecomReload && (
              <span className="text-[10px] font-semibold text-primary font-mono">
                {item.telecomOperator || "RELOAD"}
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "name",
      header: "Item Name",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-xs text-foreground">{item.name}</span>
              {item.isTelecomReload && (
                <Badge variant="secondary" className="text-[9px] px-1.5 py-0 font-mono">
                  Reload Top-up
                </Badge>
              )}
            </div>
            {item.description && (
              <span className="text-[11px] text-muted-foreground truncate max-w-xs">{item.description}</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "actualPrice",
      header: "Base Cost (LKR)",
      cell: ({ row }) => {
        const item = row.original;
        if (item.isTelecomReload) {
          if (item.actualPrice && item.actualPrice > 0) {
            return (
              <div className="flex flex-col">
                <span className="font-mono text-xs font-semibold text-foreground">
                  LKR {Number(item.actualPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  Package Base Price
                </span>
              </div>
            );
          }
          return (
            <span className="text-[11px] text-muted-foreground font-mono">
              Net (100 - {item.commissionRate ?? 0}%)
            </span>
          );
        }
        return (
          <span className="font-mono text-xs font-semibold text-muted-foreground">
            LKR {Number(item.actualPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        );
      },
    },
    {
      accessorKey: "sellingPrice",
      header: "Selling Price (LKR)",
      cell: ({ row }) => {
        const item = row.original;
        if (item.isTelecomReload) {
          if (item.sellingPrice && item.sellingPrice > 0) {
            return (
              <div className="flex flex-col">
                <span className="font-mono text-xs font-semibold text-foreground">
                  LKR {Number(item.sellingPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                  Package Retail Price
                </span>
              </div>
            );
          }
          return (
            <Badge variant="outline" className="font-mono text-[10px] bg-primary/5 text-primary border-primary/30">
              Dynamic / Custom
            </Badge>
          );
        }
        return (
          <span className="font-mono text-xs font-semibold text-foreground">
            LKR {Number(item.sellingPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        );
      },
    },
    {
      id: "margin",
      header: "Unit Profit Margin",
      cell: ({ row }) => {
        const item = row.original;
        if (item.isTelecomReload) {
          if (item.actualPrice && item.actualPrice > 0 && item.sellingPrice && item.sellingPrice > 0) {
            const comm = Number(((item.actualPrice * ((item.commissionRate ?? 4) / 100))).toFixed(2));
            const markup = Math.max(0, Number((item.sellingPrice - item.actualPrice).toFixed(2)));
            const totalProfit = Number((comm + markup).toFixed(2));
            return (
              <div className="flex flex-col">
                <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  +LKR {totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {item.commissionRate ?? 4}% comm + markup
                </span>
              </div>
            );
          }
          return (
            <div className="flex flex-col">
              <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                +{item.commissionRate ?? 0}% Commission
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                Auto-credited profit
              </span>
            </div>
          );
        }
        const cost = Number(item.actualPrice || 0);
        const sell = Number(item.sellingPrice || 0);
        const profit = sell - cost;
        const marginPct = sell > 0 ? ((profit / sell) * 100).toFixed(0) : "0";
        return (
          <div className="flex flex-col">
            <span className={`font-mono text-xs font-bold ${profit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
              {profit >= 0 ? "+" : ""}LKR {profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">
              {marginPct}% margin
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? "outline" : "destructive"} className="text-[10px]">
          {row.original.isActive ? "Active" : "Disabled"}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => {
                setSelectedItem(item);
                editItemForm.reset({
                  itemId: item._id,
                  itemCode: item.itemCode,
                  name: item.name,
                  actualPrice: item.actualPrice || 0,
                  sellingPrice: item.sellingPrice || 0,
                  description: item.description || "",
                  isTelecomReload: Boolean(item.isTelecomReload),
                  telecomOperator: item.telecomOperator || "DIALOG",
                  commissionRate: item.commissionRate ?? 4.5,
                  isActive: item.isActive,
                });
                setEditItemOpen(true);
              }}
              title="Edit Item"
            >
              <EditIcon className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => onDeleteItem(item._id)}
              className="text-destructive hover:text-destructive"
              title="Delete Item"
            >
              <Trash2Icon className="size-3.5" />
            </Button>
          </div>
        );
      },
    },
  ];

  // Table Columns for Customer Credit Ledger
  const creditColumns: ColumnDef<any>[] = [
    {
      accessorKey: "name",
      header: "Customer",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-semibold text-xs text-foreground">{row.original.name}</span>
          <span className="text-[11px] font-mono text-muted-foreground">{row.original.phone}</span>
        </div>
      ),
    },
    {
      accessorKey: "totalCredit",
      header: "Total Credit Taken",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          LKR {Number(row.original.totalCredit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      accessorKey: "totalPaid",
      header: "Total Repaid",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
          LKR {Number(row.original.totalPaid || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      accessorKey: "currentBalance",
      header: "Outstanding Debt",
      cell: ({ row }) => {
        const debt = row.original.currentBalance || 0;
        return (
          <span className={`font-mono text-xs font-bold ${debt > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
            LKR {Number(debt).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const debt = row.original.currentBalance || 0;
        return debt > 0 ? (
          <Badge variant="outline" className="text-[10px] border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold">
            Pending
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold">
            Settled
          </Badge>
        );
      },
    },
    {
      accessorKey: "lastActivityDate",
      header: "Last Activity",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.original.lastActivityDate
            ? new Date(row.original.lastActivityDate).toLocaleDateString()
            : "-"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Statement",
      cell: ({ row }) => (
        <Button
          variant="default"
          size="xs"
          onClick={() => handleOpenStatement(row.original._id)}
          className="gap-1.5 text-xs font-medium"
        >
          <FileTextIcon className="size-3.5" />
          <span>Statement</span>
        </Button>
      ),
    },
  ];

  if (isInventoryShop) {
    return (
      <div className="space-y-6">
        <div>
          <Button
            render={<Link href="/dashboard/admin/shops" />}
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground pl-0"
          >
            <ArrowLeftIcon className="size-3.5" />
            Back to All Branches
          </Button>
        </div>

        <Tabs defaultValue="inventory" className="space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <TabsList className="bg-muted">
              <TabsTrigger value="inventory" className="text-xs gap-1.5">
                <PackageIcon className="size-3.5" />
                <span>Inventory &amp; Dashboard</span>
              </TabsTrigger>
              <TabsTrigger value="staff" className="text-xs gap-1.5">
                <UsersIcon className="size-3.5" />
                <span>Assigned Officers ({staff.length})</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="inventory" className="space-y-6 mt-0">
            <InventoryView
              shopId={shop._id}
              shopName={shop.name}
              shopCode={shop.code}
            />
          </TabsContent>

          <TabsContent value="staff" className="space-y-4 mt-0">
            <div className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-sm">
              <h3 className="text-sm font-semibold text-foreground">Assigned Officers ({staff.length})</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {staff.map((stf) => (
                  <div key={stf._id} className="rounded-lg border border-border p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-foreground">{stf.name}</span>
                      <Badge variant="outline" className="text-[10px]">Officer</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{stf.email}</p>
                    {stf.phone && <p className="text-[11px] text-muted-foreground">Phone: {stf.phone}</p>}
                  </div>
                ))}
                {staff.length === 0 && (
                  <div className="col-span-full text-center text-xs text-muted-foreground p-6">
                    No officers currently assigned to this branch.
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4">
        <div>
          <Button
            render={<Link href="/dashboard/admin/shops" />}
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground pl-0"
          >
            <ArrowLeftIcon className="size-3.5" />
            Back to All Branches
          </Button>
        </div>

        <div className="flex flex-col justify-between gap-4 rounded-xl border border-border bg-card p-5 shadow-sm md:flex-row md:items-center">
          <div className="flex items-start gap-4 min-w-0">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-base shadow-sm">
              {shop.code}
            </div>
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-foreground tracking-tight truncate">
                  {shop.name}
                </h1>
                {isCommunication ? (
                  <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/40 font-mono">
                    COMMUNICATION SHOP
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px]">
                    STANDARD BRANCH
                  </Badge>
                )}
                <Badge
                  variant={shop.isActive ? "outline" : "destructive"}
                  className={`text-[10px] ${shop.isActive ? "border-chart-2/40 bg-chart-2/15 text-foreground" : ""}`}
                >
                  {shop.isActive ? "Operational" : "Closed"}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPinIcon className="size-3.5" />
                  {shop.address || "No address specified"}
                </span>
                <span className="flex items-center gap-1">
                  <UsersIcon className="size-3.5" />
                  {staff.length} Officer{staff.length !== 1 ? "s" : ""} Assigned
                </span>
                {isCommunication && (
                  <span className="flex items-center gap-1">
                    <PackageIcon className="size-3.5 text-primary" />
                    {commItems.length} Registered Inventory Item{commItems.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isCommunication && (
              <Button
                onClick={() => {
                  createItemForm.reset({
                    shopId: shop._id,
                    itemCode: "",
                    name: "",
                    actualPrice: 0,
                    sellingPrice: 0,
                    description: "",
                  });
                  setAddItemOpen(true);
                }}
                size="sm"
                className="gap-1.5 text-xs"
              >
                <PlusCircleIcon className="size-3.5" />
                Add Item
              </Button>
            )}

            <div className="flex items-center gap-4 pl-3 border-l border-border">
              <div className="flex flex-col sm:items-end justify-center">
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Cash Balance
                </div>
                <div className={`text-xl font-bold font-mono ${stats.currentBalance >= 0 ? "text-chart-2" : "text-destructive"}`}>
                  LKR {Number(stats.currentBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>

              {isCommunication && (
                <div className="flex flex-col sm:items-end justify-center pl-4 border-l border-border">
                  <div className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                    <HandCoinsIcon className="size-3" />
                    <span>Credit Balance</span>
                  </div>
                  <div className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400">
                    LKR {Number(creditStats.totalOutstanding || stats.totalCustomerCredit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabs Container */}
      <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <TabsList className="bg-muted">
            <TabsTrigger value="overview" className="text-xs">
              Overview & Analytics
            </TabsTrigger>
            {isCommunication && (
              <TabsTrigger value="itemSales" className="text-xs">
                Item-Wise Sales
              </TabsTrigger>
            )}
            {isCommunication && (
              <TabsTrigger value="items" className="text-xs">
                Items & Inventory ({commItems.length})
              </TabsTrigger>
            )}
            {isCommunication && (
              <TabsTrigger value="utilityBills" className="text-xs flex items-center gap-1.5">
                <ZapIcon className="size-3.5 text-amber-500" />
                <span>Bill Payments</span>
                {utilityAnalytics.totalBillsCount > 0 && (
                  <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 ml-0.5">
                    {utilityAnalytics.totalBillsCount}
                  </Badge>
                )}
              </TabsTrigger>
            )}
            {isCommunication && (
              <TabsTrigger value="wastage" className="text-xs">
                Wastage & Damage Loss
              </TabsTrigger>
            )}
            {isCommunication && (
              <TabsTrigger value="credits" className="text-xs">
                Credit Customers ({creditStats.debtorCount || stats.creditCustomerCount || 0})
              </TabsTrigger>
            )}
            {isCommunication && (
              <TabsTrigger value="dailySettlement" className="text-xs flex items-center gap-1.5">
                <CoinsIcon className="size-3.5 text-emerald-500" />
                <span>Daily Settlement</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="staff" className="text-xs">
              Assigned Officers ({staff.length})
            </TabsTrigger>
          </TabsList>
        </div>

        {/* OVERVIEW TAB CONTENT */}
        <TabsContent value="overview" className="space-y-6 mt-0">
          {/* Current Financial Balances Overview */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <Card className="relative overflow-hidden border-border bg-gradient-to-br from-card to-emerald-500/5 p-4 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <WalletIcon className="size-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Current Cash Balance
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        Physical cash available in shop drawer
                      </p>
                    </div>
                  </div>
                  <div className={`mt-3 text-2xl sm:text-3xl font-bold font-mono tracking-tight ${stats.currentBalance >= 0 ? "text-chart-2" : "text-destructive"}`}>
                    LKR {Number(stats.currentBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant="outline" className="font-mono text-[10px] bg-background/50 border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                    Cash In Locker
                  </Badge>
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={handleOpenAudit}
                    className="text-xs h-7 px-2.5 gap-1.5 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-medium shadow-xs"
                  >
                    <WrenchIcon className="size-3" />
                    <span>Audit / Debug Cash</span>
                  </Button>
                </div>
              </div>
            </Card>

            {isCommunication ? (
              <Card className="relative overflow-hidden border-amber-500/30 bg-gradient-to-br from-card to-amber-500/5 p-4 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
                        <HandCoinsIcon className="size-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                          Outstanding Credit Balance
                        </h4>
                        <p className="text-[11px] text-muted-foreground">
                          Total customer credit debt owed
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 text-2xl sm:text-3xl font-bold font-mono tracking-tight text-amber-600 dark:text-amber-400">
                      LKR {Number(creditStats.totalOutstanding || stats.totalCustomerCredit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <Badge variant="outline" className="font-mono text-[10px] bg-background/50 border-amber-500/30 text-amber-700 dark:text-amber-400">
                      {creditStats.debtorCount || stats.creditCustomerCount || 0} Debtor{(creditStats.debtorCount || stats.creditCustomerCount) !== 1 ? "s" : ""}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => setActiveTab("credits")}
                      className="text-xs text-amber-700 dark:text-amber-400 hover:text-amber-800 hover:bg-amber-500/10 h-7 px-2"
                    >
                      View Ledger →
                    </Button>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="relative overflow-hidden border-border bg-gradient-to-br from-card to-primary/5 p-4 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <ReceiptIcon className="size-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          All-Time Transactions
                        </h4>
                        <p className="text-[11px] text-muted-foreground">
                          Total finance entries registered
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground">
                      {stats.recordsCount || 0} Records
                    </div>
                  </div>
                  <Badge variant="outline" className="font-mono text-[10px] bg-background/50">
                    {stats.approvedCount || 0} Approved
                  </Badge>
                </div>
              </Card>
            )}
          </div>

          {/* Inter-Branch Cash Dues & Settlement Section */}
          {stats.interBranchDues && (stats.interBranchDues.totalHolding > 0 || stats.interBranchDues.totalOwed > 0) && (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              {/* Cash Holding For Other Branches */}
              <Card className="border-blue-500/30 bg-gradient-to-br from-card via-blue-500/5 to-card p-4 shadow-sm">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400">
                        <Building2Icon className="size-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                          Cash Holding For Other Branches
                        </h4>
                        <p className="text-[11px] text-muted-foreground">
                          Cash physically in this shop drawer belonging to other branches
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="border-blue-500/30 text-blue-700 dark:text-blue-400 bg-blue-500/10 text-[10px] font-mono font-bold">
                      {stats.interBranchDues.holdingForOthers.length} Branch{stats.interBranchDues.holdingForOthers.length !== 1 ? "es" : ""}
                    </Badge>
                  </div>

                  <div className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400">
                    LKR {Number(stats.interBranchDues.totalHolding || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>

                  <div className="space-y-2 pt-1 border-t border-border/60">
                    {stats.interBranchDues.holdingForOthers.map((due) => (
                      <div
                        key={due.shopId}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-background/80 border border-border text-xs"
                      >
                        <div className="space-y-0.5">
                          <span className="font-semibold text-foreground">
                            {due.shopName} ({due.shopCode})
                          </span>
                          <p className="text-[11px] text-muted-foreground font-mono">
                            {due.count} payment{due.count !== 1 ? "s" : ""} · LKR {Number(due.totalAmount).toLocaleString()}
                          </p>
                        </div>
                        <Button
                          size="xs"
                          onClick={() => handleOpenSettle(due)}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs h-7 px-2.5 gap-1.5 shadow-sm"
                        >
                          <CheckCircle2Icon className="size-3.5" />
                          Settle Cash
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              {/* Cash Owed From Other Branches */}
              <Card className="border-purple-500/30 bg-gradient-to-br from-card via-purple-500/5 to-card p-4 shadow-sm">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-400">
                        <HandCoinsIcon className="size-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                          Cash Owed From Other Branches
                        </h4>
                        <p className="text-[11px] text-muted-foreground">
                          Cash other shops collected for this shop (awaiting handover)
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="border-purple-500/30 text-purple-700 dark:text-purple-400 bg-purple-500/10 text-[10px] font-mono font-bold">
                      {stats.interBranchDues.owedFromOthers.length} Branch{stats.interBranchDues.owedFromOthers.length !== 1 ? "es" : ""}
                    </Badge>
                  </div>

                  <div className="text-2xl font-bold font-mono text-purple-600 dark:text-purple-400">
                    LKR {Number(stats.interBranchDues.totalOwed || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>

                  <div className="space-y-2 pt-1 border-t border-border/60">
                    {stats.interBranchDues.owedFromOthers.map((due) => (
                      <div
                        key={due.shopId}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-background/80 border border-border text-xs"
                      >
                        <div className="space-y-0.5">
                          <span className="font-semibold text-foreground">
                            Collected by {due.shopName} ({due.shopCode})
                          </span>
                          <p className="text-[11px] text-muted-foreground font-mono">
                            {due.count} payment{due.count !== 1 ? "s" : ""} awaiting settlement
                          </p>
                        </div>
                        <span className="font-mono font-bold text-purple-700 dark:text-purple-400">
                          LKR {Number(due.totalAmount).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Filter & Period Selector Bar */}
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

              {isCommunication && (
                <Select value={itemFilter} onValueChange={(val) => setItemFilter(val || "ALL")}>
                  <SelectTrigger className="h-9 w-44 text-xs">
                    <SelectValue placeholder="All Items" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Items</SelectItem>
                    {commItems.map((item) => (
                      <SelectItem key={item._id} value={item.itemCode}>
                        {item.itemCode} - {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {period === "custom" && (
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex flex-col gap-0.5">
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider pl-0.5">From</label>
                    <Input
                      type="datetime-local"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="h-9 w-48 text-xs"
                    />
                  </div>
                  <span className="text-xs text-muted-foreground mt-4">→</span>
                  <div className="flex flex-col gap-0.5">
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider pl-0.5">To</label>
                    <Input
                      type="datetime-local"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="h-9 w-48 text-xs"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchShopData}
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
                Export CSV Report
              </Button>
            </div>
          </div>

          {/* KPI Cards (Communication vs Standard) */}
          {isCommunication ? (
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
              <Card className="border-border bg-card p-3.5 shadow-sm">
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Total Sales Revenue
                </div>
                <div className="text-xl font-bold font-mono mt-1 text-chart-2">
                  LKR {commAnalytics.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Customer payments</div>
              </Card>

              <Card className="border-border bg-card p-3.5 shadow-sm">
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Total Cost (Actual)
                </div>
                <div className="text-xl font-bold font-mono mt-1 text-foreground">
                  LKR {commAnalytics.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Procurement / stock cost</div>
              </Card>

              <Card className="border-border bg-card p-3.5 shadow-sm">
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Net Profit Margin
                </div>
                <div className={`text-xl font-bold font-mono mt-1 ${commAnalytics.netProfit >= 0 ? "text-chart-2" : "text-destructive"}`}>
                  LKR {commAnalytics.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Revenue minus actual cost</div>
              </Card>

              <Card className="border-emerald-500/30 bg-gradient-to-br from-card to-emerald-500/10 p-3.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                    <WalletIcon className="size-3.5" />
                    <span>Period Cash Flow</span>
                  </div>
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-mono">
                    Till Net
                  </Badge>
                </div>
                <div className={`text-xl font-bold font-mono mt-1 ${Number(commAnalytics.periodCashBalance || 0) >= 0 ? "text-chart-2" : "text-destructive"}`}>
                  LKR {Number(commAnalytics.periodCashBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                  In: {Number(commAnalytics.periodCashInflow || 0).toLocaleString()} · Out: {Number(commAnalytics.periodCashOutflow || 0).toLocaleString()}
                </div>
              </Card>

              <Card className="border-border bg-card p-3.5 shadow-sm">
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Total Transactions
                </div>
                <div className="text-xl font-bold font-mono mt-1 text-foreground">
                  {commAnalytics.totalTransactions}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Recorded items in period</div>
              </Card>

              <Card className="border-border bg-card p-3.5 shadow-sm">
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Direct Retail Sales
                </div>
                <div className="text-xl font-bold font-mono mt-1 text-chart-2">
                  {commAnalytics.nonBranchCount}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Auto-approved walk-in sales</div>
              </Card>

              <Card className="border-border bg-card p-3.5 shadow-sm">
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Branch Related Sales
                </div>
                <div className="text-xl font-bold font-mono mt-1 text-primary">
                  {commAnalytics.branchRelatedCount}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Cross-campus verification</div>
              </Card>

              <Card className="border-cyan-500/30 bg-gradient-to-br from-card to-cyan-500/10 p-3.5 shadow-sm col-span-2 sm:col-span-1">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-bold text-cyan-700 dark:text-cyan-400 uppercase tracking-wider flex items-center gap-1">
                    <CoinsIcon className="size-3.5" />
                    <span>Closing Cash Balance</span>
                  </div>
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-cyan-500/30 text-cyan-600 dark:text-cyan-400 font-mono">
                    Period End
                  </Badge>
                </div>
                <div className={`text-xl font-bold font-mono mt-1 ${Number(commAnalytics.periodClosingCashBalance || 0) >= 0 ? "text-cyan-600 dark:text-cyan-400" : "text-destructive"}`}>
                  LKR {Number(commAnalytics.periodClosingCashBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                  Cash in drawer at end of period
                </div>
              </Card>
            </div>
          ) : (
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
              <Card className="border-border bg-card p-3.5 shadow-sm">
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Period Total Inflow
                </div>
                <div className="text-xl font-bold font-mono mt-1 text-chart-2">
                  LKR {analytics.kpis.totalIncome.toLocaleString()}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Branch collections</div>
              </Card>

              <Card className="border-border bg-card p-3.5 shadow-sm">
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Period Total Outflow
                </div>
                <div className="text-xl font-bold font-mono mt-1 text-foreground">
                  LKR {analytics.kpis.totalExpense.toLocaleString()}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Operational expenses</div>
              </Card>

              <Card className="border-emerald-500/30 bg-gradient-to-br from-card to-emerald-500/10 p-3.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                    <WalletIcon className="size-3.5" />
                    <span>Period Cash Flow</span>
                  </div>
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-mono">
                    Till Net
                  </Badge>
                </div>
                <div className={`text-xl font-bold font-mono mt-1 ${Number(analytics.kpis.periodCashBalance || 0) >= 0 ? "text-chart-2" : "text-destructive"}`}>
                  LKR {Number(analytics.kpis.periodCashBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                  In: {Number(analytics.kpis.periodCashInflow || 0).toLocaleString()} · Out: {Number(analytics.kpis.periodCashOutflow || 0).toLocaleString()}
                </div>
              </Card>

              <Card className="border-cyan-500/30 bg-gradient-to-br from-card to-cyan-500/10 p-3.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-bold text-cyan-700 dark:text-cyan-400 uppercase tracking-wider flex items-center gap-1">
                    <CoinsIcon className="size-3.5" />
                    <span>Closing Cash Balance</span>
                  </div>
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-cyan-500/30 text-cyan-600 dark:text-cyan-400 font-mono">
                    Period End
                  </Badge>
                </div>
                <div className={`text-xl font-bold font-mono mt-1 ${Number(analytics.kpis.periodClosingCashBalance || 0) >= 0 ? "text-cyan-600 dark:text-cyan-400" : "text-destructive"}`}>
                  LKR {Number(analytics.kpis.periodClosingCashBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  Cash in drawer at end of period
                </div>
              </Card>

              <Card className="border-border bg-card p-3.5 shadow-sm">
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Net Period Flow
                </div>
                <div className={`text-xl font-bold font-mono mt-1 ${analytics.kpis.netBalance >= 0 ? "text-chart-2" : "text-destructive"}`}>
                  LKR {analytics.kpis.netBalance.toLocaleString()}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Inflows minus outflows</div>
              </Card>

              <Card className="border-border bg-card p-3.5 shadow-sm">
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Transactions
                </div>
                <div className="text-xl font-bold font-mono mt-1 text-foreground">
                  {analytics.kpis.totalTransactions}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Active ledger entries</div>
              </Card>
            </div>
          )}

          {/* If Communication: Item-wise Performance Breakdown */}
          {isCommunication && commAnalytics.itemBreakdown.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Item-Wise Sales & Profit Breakdown</h3>
              <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3 text-left">Code</th>
                      <th className="p-3 text-left">Item Name</th>
                      <th className="p-3 text-right">Qty Sold</th>
                      <th className="p-3 text-right">Total Revenue</th>
                      <th className="p-3 text-right">Total Cost</th>
                      <th className="p-3 text-right">Net Profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {commAnalytics.itemBreakdown.map((row) => (
                      <tr key={row.itemCode} className="hover:bg-muted/20">
                        <td className="p-3 font-mono font-bold text-primary">{row.itemCode}</td>
                        <td className="p-3 font-medium text-foreground">{row.itemName}</td>
                        <td className="p-3 font-mono text-right">{row.quantity}</td>
                        <td className="p-3 font-mono text-right text-chart-2 font-semibold">
                          LKR {row.revenue.toLocaleString()}
                        </td>
                        <td className="p-3 font-mono text-right text-muted-foreground">
                          LKR {row.cost.toLocaleString()}
                        </td>
                        <td className="p-3 font-mono text-right font-bold text-chart-2">
                          LKR {row.profit.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Transactions Ledger Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  {isCommunication ? "Communication Sales Ledger" : "Branch Ledger Records"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {isCommunication
                    ? "Detailed sales transactions, item costs, and cross-branch verification statuses"
                    : "Sequential chronological ledger for this branch"}
                </p>
              </div>
            </div>

            <DataTable
              columns={isCommunication ? commColumns : standardColumns}
              data={isCommunication ? commAnalytics.records : analytics.records}
              searchKey={isCommunication ? "itemName" : "reason"}
              searchPlaceholder="Filter records..."
              loading={loading}
            />
          </div>
        </TabsContent>

        {/* ITEM-WISE SALES & TELECOM ANALYTICS TAB CONTENT */}
        {isCommunication && (
          <TabsContent value="itemSales" className="space-y-6 mt-0">
            {/* Top Period & Controls Bar */}
            <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-xs md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                    <SmartphoneIcon className="size-4" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground">
                    Item-Wise Sales & Telecom Breakdown
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Aggregated reload sales, base costs, and net profit margins categorized by telecom network and individual item codes.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center rounded-full border border-border bg-muted/60 p-1">
                  {(["today", "week", "month", "year", "custom"] as const).map((p) => (
                    <Button
                      key={p}
                      variant={period === p ? "default" : "ghost"}
                      size="xs"
                      onClick={() => setPeriod(p)}
                      className={`text-xs capitalize h-7 px-3 ${period === p ? "shadow-xs" : "text-muted-foreground"}`}
                    >
                      {p === "today" ? "Today" : p === "week" ? "This Week" : p === "month" ? "This Month" : p === "year" ? "This Year" : "Custom Range"}
                    </Button>
                  ))}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchShopData}
                  disabled={loading}
                  className="h-8 gap-1.5 text-xs"
                >
                  <RefreshCwIcon className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </Button>

                <Button
                  variant="default"
                  size="sm"
                  onClick={handleExportItemSalesCSV}
                  className="h-8 gap-1.5 text-xs"
                >
                  <DownloadIcon className="size-3.5" />
                  <span>Export CSV</span>
                </Button>
              </div>
            </div>

            {/* Custom Date Range Picker if Selected */}
            {period === "custom" && (
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card/60 p-3 shadow-xs">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CalendarIcon className="size-3.5 text-primary" />
                  <span>Custom Date Range:</span>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-8 text-xs w-36"
                  />
                  <span className="text-xs text-muted-foreground">to</span>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-8 text-xs w-36"
                  />
                  <Button
                    size="xs"
                    onClick={fetchShopData}
                    disabled={loading}
                    className="h-8 text-xs px-3"
                  >
                    Apply Filter
                  </Button>
                </div>
              </div>
            )}

            {/* Telecom Operator KPI Summary Cards */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <RadioIcon className="size-4 text-primary" />
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Telecom Network Operators ({period.toUpperCase()})
                  </h4>
                </div>
                {selectedOperatorFilter !== "ALL" && (
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => setSelectedOperatorFilter("ALL")}
                    className="h-6 text-[11px] gap-1 text-primary hover:text-primary"
                  >
                    <XIcon className="size-3" />
                    Reset Operator Filter
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                {telecomData.map((op: any) => {
                  const isSelected = selectedOperatorFilter === op.operator;
                  const style = OPERATOR_STYLES[op.operator] || OPERATOR_STYLES.OTHER;
                  return (
                    <Card
                      key={op.operator}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedOperatorFilter("ALL");
                        } else {
                          setSelectedOperatorFilter(op.operator);
                        }
                      }}
                      className={`relative cursor-pointer overflow-hidden transition-all duration-200 bg-gradient-to-br ${style.color} p-4 shadow-xs hover:shadow-md ${isSelected ? style.activeRing : style.borderClass
                        }`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div className="flex items-center gap-2">
                          <div className={`size-7 rounded-lg flex items-center justify-center font-bold text-xs ${style.badgeBg}`}>
                            {op.codePrefix}
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-foreground tracking-tight">
                              {op.name}
                            </h4>
                          </div>
                        </div>

                        {isSelected ? (
                          <Badge className="text-[9px] h-5 px-1.5 bg-foreground text-background font-semibold">
                            Active
                          </Badge>
                        ) : (
                          <span className="text-[10px] text-muted-foreground opacity-60 hover:opacity-100 transition-opacity">
                            Filter ↵
                          </span>
                        )}
                      </div>

                      <div className="mt-3 space-y-1">
                        <div className="text-lg font-bold font-mono text-foreground tracking-tight">
                          LKR {Number(op.revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground">Net Profit:</span>
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {op.profit >= 0 ? "+" : ""}LKR {Number(op.profit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-border/50">
                          <span className="text-muted-foreground">Cost:</span>
                          <span className="font-mono text-muted-foreground">
                            LKR {Number(op.cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] pt-0.5">
                          <span className="text-muted-foreground">Margin:</span>
                          <span className="font-mono font-semibold text-foreground">
                            {op.marginPct}% ({op.quantity || 0} units)
                          </span>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Item-Wise Breakdown Table Card */}
            <Card className="border-border bg-card shadow-xs">
              <CardHeader className="pb-3 border-b border-border">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                      <TagIcon className="size-4 text-primary" />
                      Individual Product & Reload Performance
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Detailed sales volume, wholesale cost, net profit, and profit margins for every item sold in this period
                    </CardDescription>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      Showing <strong className="text-foreground">{filteredAndSortedItems.length}</strong> item{filteredAndSortedItems.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                {/* Search & Filtering Controls */}
                <div className="mt-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-border/60">
                  <div className="relative flex-1 max-w-sm">
                    <SearchIcon className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search by item code or name..."
                      value={itemSearchQuery}
                      onChange={(e) => setItemSearchQuery(e.target.value)}
                      className="pl-8 h-8 text-xs"
                    />
                    {itemSearchQuery && (
                      <button
                        onClick={() => setItemSearchQuery("")}
                        className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                      >
                        <XIcon className="size-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Operator quick pills */}
                    <div className="flex items-center rounded-lg border border-border bg-muted/60 p-0.5">
                      {(["ALL", "DIALOG", "MOBITEL", "AIRTEL", "HUTCH", "OTHER"] as const).map((opKey) => (
                        <button
                          key={opKey}
                          onClick={() => setSelectedOperatorFilter(opKey)}
                          className={`text-[11px] font-medium px-2 py-1 rounded-md transition-all ${selectedOperatorFilter === opKey
                            ? "bg-background text-foreground shadow-xs font-bold"
                            : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                          {opKey === "ALL" ? "All" : opKey.charAt(0) + opKey.slice(1).toLowerCase()}
                        </button>
                      ))}
                    </div>

                    {/* Sort selector */}
                    <Select
                      value={itemSortBy}
                      onValueChange={(val: any) => setItemSortBy(val)}
                    >
                      <SelectTrigger className="h-8 text-xs w-40">
                        <SelectValue placeholder="Sort By" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="profit" className="text-xs">Highest Profit</SelectItem>
                        <SelectItem value="revenue" className="text-xs">Highest Sales</SelectItem>
                        <SelectItem value="quantity" className="text-xs">Most Units Sold</SelectItem>
                        <SelectItem value="margin" className="text-xs">Highest Margin %</SelectItem>
                        <SelectItem value="code" className="text-xs">Item Code (A-Z)</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      variant="outline"
                      size="icon-xs"
                      onClick={() => setItemSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
                      title={`Sort order: ${itemSortOrder === "asc" ? "Ascending" : "Descending"}`}
                      className="h-8 w-8"
                    >
                      <ArrowUpDownIcon className="size-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Filter info pill banner if operator is filtered */}
                {selectedOperatorFilter !== "ALL" && (
                  <div className="flex items-center justify-between mt-2 py-1.5 px-3 rounded-lg bg-primary/10 border border-primary/20 text-xs">
                    <span className="text-primary font-medium flex items-center gap-1.5">
                      <FilterIcon className="size-3.5" />
                      Filtering table by <strong>{telecomData.find((t: any) => t.operator === selectedOperatorFilter)?.name || selectedOperatorFilter}</strong> ({selectedOperatorFilter.charAt(0)} prefix)
                    </span>
                    <button
                      onClick={() => setSelectedOperatorFilter("ALL")}
                      className="text-primary hover:underline font-bold text-[11px]"
                    >
                      Clear Filter (Show All)
                    </button>
                  </div>
                )}
              </CardHeader>

              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/50 text-muted-foreground uppercase tracking-wider text-[11px] border-b border-border">
                      <tr>
                        <th className="py-3 px-4 font-semibold">Item Code</th>
                        <th className="py-3 px-4 font-semibold">Product / Item Name</th>
                        <th className="py-3 px-4 font-semibold">Network Operator</th>
                        <th className="py-3 px-4 font-semibold text-right">Units Sold</th>
                        <th className="py-3 px-4 font-semibold text-right">Base Cost</th>
                        <th className="py-3 px-4 font-semibold text-right">Total Cost</th>
                        <th className="py-3 px-4 font-semibold text-right">Total Sales</th>
                        <th className="py-3 px-4 font-semibold text-right">Net Profit</th>
                        <th className="py-3 px-4 font-semibold text-right">Margin %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredAndSortedItems.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-12 text-center text-muted-foreground">
                            <div className="flex flex-col items-center justify-center gap-2">
                              <PackageIcon className="size-8 opacity-40 text-muted-foreground" />
                              <p className="font-medium text-sm text-foreground">No item sales recorded</p>
                              <p className="text-xs max-w-sm text-muted-foreground">
                                No sales matching this time period or operator filter were found in the shop records.
                              </p>
                              {selectedOperatorFilter !== "ALL" && (
                                <Button
                                  variant="outline"
                                  size="xs"
                                  onClick={() => setSelectedOperatorFilter("ALL")}
                                  className="mt-2 text-xs"
                                >
                                  Clear Operator Filter
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredAndSortedItems.map((item) => (
                          <tr key={item.itemCode} className="hover:bg-muted/40 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-foreground">
                              <span className="bg-muted px-2 py-0.5 rounded-md border border-border">
                                {item.itemCode}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-medium text-foreground">
                              {item.itemName}
                            </td>
                            <td className="py-3 px-4">
                              {renderOperatorBadge(item.operator)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-semibold">
                              {item.quantity.toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                              LKR {Number(item.unitCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                              LKR {Number(item.cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-foreground">
                              LKR {Number(item.revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              {item.profit >= 0 ? "+" : ""}LKR {Number(item.profit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4 text-right font-mono">
                              <span className="inline-block px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                {item.marginPct}%
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {filteredAndSortedItems.length > 0 && (
                      <tfoot className="bg-muted/50 border-t-2 border-border font-semibold">
                        <tr>
                          <td colSpan={3} className="py-3.5 px-4 text-foreground uppercase tracking-wider text-[11px]">
                            Filtered Totals ({filteredAndSortedItems.length} Products)
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-foreground font-bold">
                            {filteredTotals.qty.toLocaleString()} units
                          </td>
                          <td className="py-3.5 px-4 text-right text-muted-foreground font-mono">
                            -
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-muted-foreground">
                            LKR {filteredTotals.cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-foreground font-bold">
                            LKR {filteredTotals.rev.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                            {filteredTotals.profit >= 0 ? "+" : ""}LKR {filteredTotals.profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono">
                            <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                              {filteredTotals.margin}%
                            </span>
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* ITEMS & INVENTORY TAB CONTENT */}
        {isCommunication && (
          <TabsContent value="items" className="space-y-4 mt-0">
            {/* Header & Add Action */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-semibold text-foreground">Registered Products & Services</h3>
                <p className="text-xs text-muted-foreground">
                  Manage inventory item codes, wholesale cost prices, reload commission percentages, and standard selling prices
                </p>
              </div>

              <Button
                onClick={() => {
                  createItemForm.reset({
                    shopId: shop._id,
                    itemCode: "",
                    name: "",
                    actualPrice: 0,
                    sellingPrice: 0,
                    description: "",
                    isTelecomReload: false,
                    telecomOperator: "DIALOG",
                    commissionRate: 4.5,
                  });
                  setAddItemOpen(true);
                }}
                size="sm"
                className="gap-1.5 text-xs font-semibold"
              >
                <PlusCircleIcon className="size-3.5" />
                Add Item
              </Button>
            </div>

            {/* Quick Metrics Bar */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="px-2.5 py-1 text-xs font-medium border-border bg-card">
                <PackageIcon className="size-3.5 mr-1.5 text-primary" />
                <span>Total: <strong className="font-mono text-foreground">{commItemStats.total}</strong></span>
              </Badge>
              <Badge variant="outline" className="px-2.5 py-1 text-xs font-medium border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2Icon className="size-3.5 mr-1.5" />
                <span>Active: <strong className="font-mono">{commItemStats.active}</strong></span>
              </Badge>
              <Badge variant="outline" className="px-2.5 py-1 text-xs font-medium border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <SmartphoneIcon className="size-3.5 mr-1.5" />
                <span>Telecom Reloads: <strong className="font-mono">{commItemStats.reloads}</strong></span>
              </Badge>
              <Badge variant="outline" className="px-2.5 py-1 text-xs font-medium border-border bg-card text-muted-foreground">
                <span>Standard: <strong className="font-mono text-foreground">{commItemStats.standard}</strong></span>
              </Badge>
            </div>

            {/* Comprehensive Filter & Sort Toolbar */}
            <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3.5 shadow-2xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 items-center">
                {/* Search */}
                <div className="lg:col-span-2 relative">
                  <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search name, code, operator..."
                    value={commItemSearch}
                    onChange={(e) => setCommItemSearch(e.target.value)}
                    className="h-8 pl-8 text-xs font-mono"
                  />
                  {commItemSearch && (
                    <button
                      type="button"
                      onClick={() => setCommItemSearch("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                    >
                      <XIcon className="size-3" />
                    </button>
                  )}
                </div>

                {/* Item Type Filter */}
                <div>
                  <select
                    value={commItemTypeFilter}
                    onChange={(e) => setCommItemTypeFilter(e.target.value as any)}
                    className="w-full h-8 rounded-md border border-border bg-card text-foreground px-2 text-xs font-medium outline-none focus:border-ring"
                  >
                    <option value="ALL">All Types</option>
                    <option value="RELOAD">Telecom Reloads</option>
                    <option value="STANDARD">Standard Services</option>
                  </select>
                </div>

                {/* Operator Filter */}
                <div>
                  <select
                    value={commItemOperatorFilter}
                    onChange={(e) => setCommItemOperatorFilter(e.target.value as any)}
                    className="w-full h-8 rounded-md border border-border bg-card text-foreground px-2 text-xs font-medium outline-none focus:border-ring"
                  >
                    <option value="ALL">All Operators</option>
                    <option value="DIALOG">Dialog</option>
                    <option value="MOBITEL">Mobitel</option>
                    <option value="AIRTEL">Airtel</option>
                    <option value="HUTCH">Hutch</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                {/* Status Filter */}
                <div>
                  <select
                    value={commItemStatusFilter}
                    onChange={(e) => setCommItemStatusFilter(e.target.value as any)}
                    className="w-full h-8 rounded-md border border-border bg-card text-foreground px-2 text-xs font-medium outline-none focus:border-ring"
                  >
                    <option value="ALL">All Status</option>
                    <option value="ACTIVE">Active Only</option>
                    <option value="DISABLED">Disabled Only</option>
                  </select>
                </div>

                {/* Sort Selector & Toggle */}
                <div className="flex items-center gap-1">
                  <select
                    value={commItemSortBy}
                    onChange={(e) => setCommItemSortBy(e.target.value as any)}
                    className="flex-1 h-8 rounded-md border border-border bg-card text-foreground px-2 text-xs font-medium outline-none focus:border-ring"
                  >
                    <option value="code">Code</option>
                    <option value="name">Name</option>
                    <option value="actualPrice">Base Cost</option>
                    <option value="sellingPrice">Selling Price</option>
                    <option value="margin">Margin / Comm %</option>
                  </select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-xs"
                    onClick={() => setCommItemSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                    title={commItemSortOrder === "asc" ? "Sort Ascending (click for Desc)" : "Sort Descending (click for Asc)"}
                  >
                    <ArrowUpDownIcon className="size-3.5" />
                  </Button>
                </div>
              </div>

              {/* Active Filter Indicators */}
              {(commItemSearch || commItemTypeFilter !== "ALL" || commItemOperatorFilter !== "ALL" || commItemStatusFilter !== "ALL") && (
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/50">
                  <span>
                    Showing <strong>{filteredAndSortedCommItems.length}</strong> of {commItems.length} items
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setCommItemSearch("");
                      setCommItemTypeFilter("ALL");
                      setCommItemOperatorFilter("ALL");
                      setCommItemStatusFilter("ALL");
                    }}
                    className="text-xs text-primary hover:underline font-semibold"
                  >
                    Clear Filters
                  </button>
                </div>
              )}
            </div>

            <DataTable
              columns={itemColumns}
              data={filteredAndSortedCommItems}
              searchKey="name"
              searchPlaceholder="Filter listed items..."
              loading={loading}
            />
          </TabsContent>
        )}

        {/* UTILITY BILL PAYMENTS TAB */}
        {isCommunication && (
          <TabsContent value="utilityBills" className="space-y-6 mt-0">
            {/* Header and Controls */}
            <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-xs md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400">
                    <ZapIcon className="size-4" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground">
                    Utility Bill Payments &amp; Fee Earnings
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Light Bill (Electricity) &amp; Water Bill payments collected at this branch with fee deductions and net profit tracking.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center rounded-full border border-border bg-muted/60 p-1">
                  {(["today", "week", "month", "year", "custom"] as const).map((p) => (
                    <Button
                      key={p}
                      variant={utilityPeriod === p ? "default" : "ghost"}
                      size="xs"
                      onClick={() => setUtilityPeriod(p)}
                      className={`text-xs capitalize h-7 px-3 ${utilityPeriod === p ? "shadow-xs" : "text-muted-foreground"}`}
                    >
                      {p === "today" ? "Today" : p === "week" ? "This Week" : p === "month" ? "This Month" : p === "year" ? "This Year" : "Custom Range"}
                    </Button>
                  ))}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchUtilityData}
                  disabled={utilityLoading}
                  className="h-8 gap-1.5 text-xs"
                >
                  <RefreshCwIcon className={`size-3.5 ${utilityLoading ? "animate-spin" : ""}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </Button>

                <Button
                  variant="default"
                  size="sm"
                  onClick={handleExportUtilityBillsCSV}
                  className="h-8 gap-1.5 text-xs"
                >
                  <DownloadIcon className="size-3.5" />
                  <span>Export CSV</span>
                </Button>
              </div>
            </div>

            {/* Custom Date Range Picker if Selected */}
            {utilityPeriod === "custom" && (
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card/60 p-3 shadow-xs">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CalendarIcon className="size-3.5 text-primary" />
                  <span>Custom Date Range:</span>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={utilityStartDate}
                    onChange={(e) => setUtilityStartDate(e.target.value)}
                    className="h-8 text-xs w-36"
                  />
                  <span className="text-xs text-muted-foreground">to</span>
                  <Input
                    type="date"
                    value={utilityEndDate}
                    onChange={(e) => setUtilityEndDate(e.target.value)}
                    className="h-8 text-xs w-36"
                  />
                  <Button
                    variant="secondary"
                    size="xs"
                    onClick={fetchUtilityData}
                    className="h-8 text-xs font-semibold px-3"
                  >
                    Apply Filter
                  </Button>
                </div>
              </div>
            )}

            {/* KPI Summary Cards */}
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="border-border bg-card p-4 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Total Bill Volume
                    </span>
                    <div className="text-xl sm:text-2xl font-bold font-mono text-foreground">
                      LKR {Number(utilityAnalytics.totalBillAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Across {utilityAnalytics.totalBillsCount} bill{utilityAnalytics.totalBillsCount !== 1 ? "s" : ""} processed
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <ReceiptIcon className="size-4" />
                  </div>
                </div>
              </Card>

              <Card className="border-border bg-card p-4 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Customer Collected
                    </span>
                    <div className="text-xl sm:text-2xl font-bold font-mono text-chart-2">
                      LKR {Number(utilityAnalytics.totalCollected || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Added into physical cash drawer
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <WalletIcon className="size-4" />
                  </div>
                </div>
              </Card>

              <Card className="border-border bg-card p-4 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Provider Cost Fees
                    </span>
                    <div className="text-xl sm:text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">
                      LKR {Number(utilityAnalytics.totalProviderFees || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Rs. 18 / 23 deducted per bill
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                    <DollarSignIcon className="size-4" />
                  </div>
                </div>
              </Card>

              <Card className="border-emerald-500/30 bg-gradient-to-br from-card to-emerald-500/5 p-4 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                      Shop Net Profit
                    </span>
                    <div className="text-xl sm:text-2xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                      +LKR {Number(utilityAnalytics.totalNetProfit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Service charges minus cost fees
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    <TrendingUpIcon className="size-4" />
                  </div>
                </div>
              </Card>
            </div>

            {/* Category Quick Pill Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex items-center justify-between p-3 rounded-xl border border-amber-500/30 bg-amber-500/5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-400">
                    <ZapIcon className="size-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-foreground block">Light / Electricity</span>
                    <span className="text-[10px] text-muted-foreground">
                      {utilityAnalytics.breakdown.electricity.count} bills • LKR {Number(utilityAnalytics.breakdown.electricity.amount).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 block font-mono">
                    +LKR {utilityAnalytics.breakdown.electricity.profit.toFixed(2)}
                  </span>
                  <span className="text-[9px] text-muted-foreground">Profit</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl border border-blue-500/30 bg-blue-500/5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-700 dark:text-blue-400">
                    <DropletIcon className="size-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-foreground block">Water Board (NWSDB)</span>
                    <span className="text-[10px] text-muted-foreground">
                      {utilityAnalytics.breakdown.water.count} bills • LKR {Number(utilityAnalytics.breakdown.water.amount).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 block font-mono">
                    +LKR {utilityAnalytics.breakdown.water.profit.toFixed(2)}
                  </span>
                  <span className="text-[9px] text-muted-foreground">Profit</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl border border-purple-500/30 bg-purple-500/5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-700 dark:text-purple-400">
                    <ReceiptIcon className="size-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-foreground block">Other Utility</span>
                    <span className="text-[10px] text-muted-foreground">
                      {utilityAnalytics.breakdown.other.count} bills • LKR {Number(utilityAnalytics.breakdown.other.amount).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 block font-mono">
                    +LKR {utilityAnalytics.breakdown.other.profit.toFixed(2)}
                  </span>
                  <span className="text-[9px] text-muted-foreground">Profit</span>
                </div>
              </div>
            </div>

            {/* Filter Controls Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/40 p-3 rounded-xl border border-border">
              <div className="flex flex-wrap items-center gap-2">
                {/* Bill Type Filter */}
                <select
                  value={utilityBillTypeFilter}
                  onChange={(e: any) => setUtilityBillTypeFilter(e.target.value)}
                  className="h-8 rounded-md border border-border bg-card px-2.5 text-xs text-foreground font-medium outline-none focus:border-ring"
                >
                  <option value="ALL">All Bill Types</option>
                  <option value="ELECTRICITY">⚡ Light Bills (Electricity)</option>
                  <option value="WATER">💧 Water Bills (NWSDB)</option>
                  <option value="OTHER">📋 Other Utility</option>
                </select>

                {/* Staff Filter */}
                <select
                  value={utilityStaffFilter}
                  onChange={(e) => setUtilityStaffFilter(e.target.value)}
                  className="h-8 rounded-md border border-border bg-card px-2.5 text-xs text-foreground font-medium outline-none focus:border-ring"
                >
                  <option value="ALL">All Officers</option>
                  {staff.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search */}
              <div className="relative w-full sm:w-72">
                <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search account, customer, bill #..."
                  value={utilitySearchQuery}
                  onChange={(e) => setUtilitySearchQuery(e.target.value)}
                  className="h-8 pl-8 text-xs"
                />
                {utilitySearchQuery && (
                  <button
                    onClick={() => setUtilitySearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <XIcon className="size-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Utility Bill Payments Table */}
            <Card className="border-border shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 text-muted-foreground uppercase tracking-wider text-[10px] border-b border-border">
                    <tr>
                      <th className="py-3 px-3.5 font-semibold">Date &amp; Time</th>
                      <th className="py-3 px-3 font-semibold">Bill / Receipt #</th>
                      <th className="py-3 px-3 font-semibold">Type</th>
                      <th className="py-3 px-3 font-semibold">Account / Ref #</th>
                      <th className="py-3 px-3 font-semibold">Customer</th>
                      <th className="py-3 px-3 font-semibold text-right">Bill Value</th>
                      <th className="py-3 px-3 font-semibold text-right">Service Fee</th>
                      <th className="py-3 px-3 font-semibold text-right">Provider Fee</th>
                      <th className="py-3 px-3 font-semibold text-right">Customer Paid</th>
                      <th className="py-3 px-3 font-semibold text-right">Profit</th>
                      <th className="py-3 px-3 font-semibold">Method</th>
                      <th className="py-3 px-3 font-semibold">Processed By</th>
                      <th className="py-3 px-3 font-semibold text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {utilityLoading ? (
                      <tr>
                        <td colSpan={13} className="py-12 text-center text-muted-foreground">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Loader2Icon className="size-6 animate-spin text-primary" />
                            <p className="text-xs">Loading utility bill payments...</p>
                          </div>
                        </td>
                      </tr>
                    ) : utilityAnalytics.records.length === 0 ? (
                      <tr>
                        <td colSpan={13} className="py-12 text-center text-muted-foreground">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <ZapIcon className="size-8 opacity-30 text-amber-500" />
                            <p className="font-semibold text-sm text-foreground">No bill payments recorded</p>
                            <p className="text-xs max-w-sm text-muted-foreground">
                              No utility bill transactions matching the selected filters were found for this branch.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      utilityAnalytics.records.map((r: any) => {
                        const billAmt = Number(r.billAmount || 0);
                        const sFee = Number(r.serviceCharge || 0);
                        const pFee = Number(r.providerFee || 0);
                        const totalPaid = Number(r.amount || 0);
                        const profit = Number(r.commissionEarned !== undefined ? r.commissionEarned : (sFee - pFee));

                        return (
                          <tr key={r._id} className="hover:bg-muted/30 transition-colors">
                            <td className="py-2.5 px-3.5 text-muted-foreground whitespace-nowrap text-[11px]">
                              {new Date(r.date).toLocaleDateString()}{" "}
                              <span className="text-[10px] opacity-75">
                                {new Date(r.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-primary whitespace-nowrap">
                              {r.billNumber}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${r.utilityBillType === "ELECTRICITY"
                                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
                                  : r.utilityBillType === "WATER"
                                    ? "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30"
                                    : "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30"
                                  }`}
                              >
                                {r.utilityBillType === "ELECTRICITY" ? (
                                  <>
                                    <ZapIcon className="size-3" /> Light Bill
                                  </>
                                ) : r.utilityBillType === "WATER" ? (
                                  <>
                                    <DropletIcon className="size-3" /> Water Bill
                                  </>
                                ) : (
                                  <>
                                    <ReceiptIcon className="size-3" /> Utility
                                  </>
                                )}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono font-semibold text-foreground whitespace-nowrap">
                              <span className="bg-muted px-1.5 py-0.5 rounded border border-border text-[11px]">
                                {r.utilityAccountNumber || "-"}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              {r.customerName || r.customerPhone ? (
                                <div className="space-y-0.5">
                                  <div className="font-medium text-foreground text-xs">{r.customerName || "Customer"}</div>
                                  {r.customerPhone && (
                                    <div className="text-[10px] text-muted-foreground font-mono">{r.customerPhone}</div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-[11px]">-</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-semibold text-foreground whitespace-nowrap">
                              LKR {billAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-primary font-semibold whitespace-nowrap">
                              +LKR {sFee.toFixed(2)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-rose-600 dark:text-rose-400 whitespace-nowrap">
                              -LKR {pFee.toFixed(2)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-foreground whitespace-nowrap">
                              LKR {totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-3 text-right whitespace-nowrap">
                              <span className="inline-flex items-center text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                +LKR {profit.toFixed(2)}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <Badge variant="outline" className="font-mono text-[9px] uppercase">
                                {r.paymentMethod || "CASH"}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 text-muted-foreground text-[11px] whitespace-nowrap">
                              {r.createdBy?.name || "Staff"}
                            </td>
                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              <StatusBadge status={r.status || "APPROVED"} />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {utilityAnalytics.records.length > 0 && (
                    <tfoot className="bg-muted/50 border-t-2 border-border font-semibold text-xs">
                      <tr>
                        <td colSpan={5} className="py-3 px-3.5 uppercase tracking-wider text-[11px] text-foreground font-bold">
                          Total ({utilityAnalytics.records.length} Bills)
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-foreground whitespace-nowrap">
                          LKR {utilityAnalytics.totalBillAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-primary font-bold whitespace-nowrap">
                          +LKR {utilityAnalytics.totalServiceCharges.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-rose-600 dark:text-rose-400 font-bold whitespace-nowrap">
                          -LKR {utilityAnalytics.totalProviderFees.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-extrabold text-foreground whitespace-nowrap">
                          LKR {utilityAnalytics.totalCollected.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-extrabold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          +LKR {utilityAnalytics.totalNetProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td colSpan={3}></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </Card>
          </TabsContent>
        )}

        {/* WASTAGE & LOSS AUDIT TAB */}
        {isCommunication && (
          <TabsContent value="wastage" className="space-y-6 mt-0">
            {/* Header and Actions */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <AlertOctagonIcon className="size-5 text-rose-600 dark:text-rose-400" />
                  <span>Item Wastage &amp; Damage Loss Ledger</span>
                </h3>
                <p className="text-xs text-muted-foreground">
                  Track misprinted sheets, damaged inventory, and defective production losses. Losses are computed strictly at wholesale base unit cost.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={handleExportWastageCSV}
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs font-medium"
                >
                  <DownloadIcon className="size-3.5" />
                  Export Wastage Report (CSV)
                </Button>
              </div>
            </div>

            {/* Timeframe Filter Bar */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-muted p-1 rounded-lg">
                {(["today", "week", "month", "year", "custom"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPeriod(p)}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${period === p
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>

              {period === "custom" && (
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                  <span className="text-xs text-muted-foreground">to</span>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              )}
            </div>

            {/* Wastage KPI Cards */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="border-rose-500/30 bg-gradient-to-br from-card to-rose-500/5 p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
                      Total Financial Loss
                    </span>
                    <div className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">
                      LKR {Number(wastageAnalytics.totalMonetaryLoss || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Base cost value of spoiled materials
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400">
                    <AlertOctagonIcon className="size-5" />
                  </div>
                </div>
              </Card>

              <Card className="border-border bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Total Units Wasted
                    </span>
                    <div className="text-2xl font-bold font-mono text-foreground">
                      {Number(wastageAnalytics.totalWastedUnits || 0).toLocaleString()} <span className="text-xs font-sans font-normal text-muted-foreground">units</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Misprints, spoiled sheets, or broken items
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted text-muted-foreground">
                    <PackageIcon className="size-5" />
                  </div>
                </div>
              </Card>

              <Card className="border-border bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Incidents Logged
                    </span>
                    <div className="text-2xl font-bold font-mono text-foreground">
                      {wastageAnalytics.incidentCount} <span className="text-xs font-sans font-normal text-muted-foreground">events</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Recorded by branch staff officers
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted text-muted-foreground">
                    <ReceiptIcon className="size-5" />
                  </div>
                </div>
              </Card>

              <Card className="border-border bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Top Loss Cause Item
                    </span>
                    <div className="text-sm font-bold truncate max-w-[170px] text-foreground">
                      {wastageAnalytics.itemBreakdown[0]?.itemName || "None"}
                    </div>
                    <p className="text-[11px] text-muted-foreground font-mono">
                      {wastageAnalytics.itemBreakdown[0]
                        ? `LKR ${Number(wastageAnalytics.itemBreakdown[0].totalLoss).toLocaleString()} (${wastageAnalytics.itemBreakdown[0].unitsWasted} units)`
                        : "No wastage recorded in period"}
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <FlameIcon className="size-5" />
                  </div>
                </div>
              </Card>
            </div>

            {/* Product Wastage Breakdown Table */}
            <Card className="border-border shadow-sm">
              <CardHeader className="p-4 pb-2 border-b border-border">
                <CardTitle className="text-sm font-semibold text-foreground flex items-center justify-between">
                  <span>Wastage &amp; Defect Breakdown by Item</span>
                  <Badge variant="outline" className="text-[11px] font-mono">
                    {wastageAnalytics.itemBreakdown.length} affected product{wastageAnalytics.itemBreakdown.length !== 1 ? "s" : ""}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs">
                  Summary of spoiled inventory items and their cumulative financial impact
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 text-muted-foreground uppercase tracking-wider text-[11px] border-b border-border">
                      <tr>
                        <th className="py-2.5 px-4 font-semibold text-left">Item Code</th>
                        <th className="py-2.5 px-4 font-semibold text-left">Product Name</th>
                        <th className="py-2.5 px-4 font-semibold text-right">Units Spoiled</th>
                        <th className="py-2.5 px-4 font-semibold text-right">Total Financial Loss (LKR)</th>
                        <th className="py-2.5 px-4 font-semibold text-right">Share of Loss</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {wastageAnalytics.itemBreakdown.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-muted-foreground text-xs">
                            No item wastage or defect records found for this time period.
                          </td>
                        </tr>
                      ) : (
                        wastageAnalytics.itemBreakdown.map((item) => {
                          const sharePct = wastageAnalytics.totalMonetaryLoss > 0
                            ? ((item.totalLoss / wastageAnalytics.totalMonetaryLoss) * 100).toFixed(1)
                            : "0";
                          return (
                            <tr key={item.itemCode} className="hover:bg-muted/40 transition-colors">
                              <td className="py-2.5 px-4 font-mono font-bold text-foreground">
                                <span className="bg-muted px-2 py-0.5 rounded-md border border-border">
                                  {item.itemCode}
                                </span>
                              </td>
                              <td className="py-2.5 px-4 font-medium text-foreground">
                                {item.itemName}
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono font-semibold text-foreground">
                                {Number(item.unitsWasted).toLocaleString()}
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                                LKR {Number(item.totalLoss).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono text-muted-foreground">
                                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-semibold">
                                  {sharePct}%
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Incidents Audit Table */}
            <Card className="border-border shadow-sm">
              <CardHeader className="p-4 pb-2 border-b border-border">
                <CardTitle className="text-sm font-semibold text-foreground">
                  Damage &amp; Misprint Incidents Audit Log ({wastageAnalytics.incidents.length})
                </CardTitle>
                <CardDescription className="text-xs">
                  Detailed ledger of all registered damage and misprint occurrences
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 text-muted-foreground uppercase tracking-wider text-[11px] border-b border-border">
                      <tr>
                        <th className="py-2.5 px-4 font-semibold text-left">Date &amp; Time</th>
                        <th className="py-2.5 px-4 font-semibold text-left">Item Code</th>
                        <th className="py-2.5 px-4 font-semibold text-left">Item Name</th>
                        <th className="py-2.5 px-4 font-semibold text-right">Qty</th>
                        <th className="py-2.5 px-4 font-semibold text-right">Base Unit Cost</th>
                        <th className="py-2.5 px-4 font-semibold text-right">Calculated Loss</th>
                        <th className="py-2.5 px-4 font-semibold text-left">Reason / Defect Note</th>
                        <th className="py-2.5 px-4 font-semibold text-left">Reported By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border font-mono">
                      {wastageAnalytics.incidents.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-muted-foreground text-xs font-sans">
                            No wastage incidents recorded for this time range.
                          </td>
                        </tr>
                      ) : (
                        wastageAnalytics.incidents.map((inc: any) => (
                          <tr key={inc._id} className="hover:bg-muted/40 transition-colors">
                            <td className="py-2.5 px-4 text-muted-foreground">
                              {new Date(inc.date).toLocaleDateString()} {new Date(inc.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </td>
                            <td className="py-2.5 px-4 font-bold text-foreground">
                              {inc.itemCode}
                            </td>
                            <td className="py-2.5 px-4 font-sans text-foreground">
                              {inc.itemName}
                            </td>
                            <td className="py-2.5 px-4 text-right font-bold text-foreground">
                              {inc.quantity}
                            </td>
                            <td className="py-2.5 px-4 text-right text-muted-foreground">
                              LKR {Number(inc.unitBasePrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-4 text-right font-bold text-rose-600 dark:text-rose-400">
                              LKR {Number(inc.totalLoss || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-4 font-sans text-muted-foreground max-w-[200px] truncate" title={inc.reason}>
                              {inc.reason}
                            </td>
                            <td className="py-2.5 px-4 font-sans text-muted-foreground">
                              {inc.reportedBy?.name || "Staff"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* CUSTOMER CREDIT & DEBT LEDGER TAB CONTENT */}
        {isCommunication && (
          <TabsContent value="credits" className="space-y-6 mt-0">
            {/* Top Stat Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="border-border bg-card shadow-xs">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Outstanding Debt
                  </span>
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <HandCoinsIcon className="size-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
                    LKR {Number(creditStats.totalOutstanding || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {creditStats.debtorCount} Customer{creditStats.debtorCount !== 1 ? "s" : ""} with pending balances
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border bg-card shadow-xs">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Total Credit Issued
                  </span>
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <CreditCardIcon className="size-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-mono text-foreground">
                    LKR {Number(creditStats.totalCreditIssued || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Cumulative credit purchases logged
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border bg-card shadow-xs">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Total Repaid
                  </span>
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <TrendingUpIcon className="size-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    LKR {Number(creditStats.totalPaid || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Recovered directly into branch cash
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border bg-card shadow-xs">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Recovery Rate
                  </span>
                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                    <SparklesIcon className="size-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-mono text-foreground">
                    {creditStats.totalCreditIssued > 0
                      ? ((creditStats.totalPaid / creditStats.totalCreditIssued) * 100).toFixed(1)
                      : "0.0"}%
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Percentage of credit collected
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Header & Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <span>Customer Credit Accounts</span>
                  <Badge variant="outline" className="text-xs font-mono">
                    {creditCustomers.length} Total
                  </Badge>
                </h3>
                <p className="text-xs text-muted-foreground">
                  Track individual customer debt, repayments, and print or view detailed transaction statements
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative w-64">
                  <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Filter by name or phone..."
                    value={creditSearch}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCreditSearch(val);
                      fetchCreditCustomers(val);
                    }}
                    className="pl-8 h-8 text-xs font-mono"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchCreditCustomers()}
                  className="gap-1.5 text-xs h-8"
                  disabled={creditLoading}
                >
                  <RefreshCwIcon className={`size-3.5 ${creditLoading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            </div>

            {/* Customers Table */}
            <DataTable
              columns={creditColumns}
              data={creditCustomers}
              searchKey="name"
              searchPlaceholder="Filter credit customers..."
              loading={creditLoading}
            />
          </TabsContent>
        )}

        {/* DAILY SETTLEMENT TAB CONTENT (COMMUNICATION SHOPS) */}
        {isCommunication && (
          <TabsContent value="dailySettlement" className="space-y-6 mt-0">
            {/* Header & Primary Action Button */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <CoinsIcon className="size-5 text-emerald-500" />
                  Daily Cash Float & Surplus Settlement
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Retain standard opening float (default LKR 4,000) in communication drawer and sweep excess balance to Petty Cash or Bank.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchDailySettlements}
                  disabled={dailySettlementLoading}
                  className="h-8 text-xs font-medium"
                >
                  <RefreshCwIcon className={`size-3.5 mr-1.5 ${dailySettlementLoading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>

                <Button
                  variant="default"
                  size="sm"
                  onClick={handleOpenDailySettlementDialog}
                  className="h-8 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                >
                  <PlusCircleIcon className="size-3.5 mr-1.5" />
                  Record Daily Settlement
                </Button>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="border border-border bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Drawer Cash In Hand</span>
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <WalletIcon className="size-4" />
                  </div>
                </div>
                <div className="mt-2 text-xl font-bold font-mono tracking-tight text-foreground">
                  LKR {dailySettlementCurrentCash.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Active physical balance in communication drawer
                </p>
              </Card>

              <Card className="border border-border bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Standard Opening Float</span>
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <BanknoteIcon className="size-4" />
                  </div>
                </div>
                <div className="mt-2 text-xl font-bold font-mono tracking-tight text-amber-600 dark:text-amber-400">
                  LKR 4,000.00
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Default retained float for starting daily operations
                </p>
              </Card>

              <Card className="border border-border bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Available Surplus</span>
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <ArrowRightLeftIcon className="size-4" />
                  </div>
                </div>
                <div className="mt-2 text-xl font-bold font-mono tracking-tight text-blue-600 dark:text-blue-400">
                  LKR {Math.max(0, dailySettlementCurrentCash - 4000).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Drawer balance exceeding the 4,000 LKR float
                </p>
              </Card>

              <Card className="border border-border bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Total Swept to Date</span>
                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                    <LandmarkIcon className="size-4" />
                  </div>
                </div>
                <div className="mt-2 text-xl font-bold font-mono tracking-tight text-foreground">
                  LKR {dailySettlementSummary.totalSettled.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Across {dailySettlementSummary.settlementCount} settlement records
                </p>
              </Card>
            </div>

            {/* Settlements History Table */}
            <Card className="border border-border bg-card shadow-sm">
              <CardHeader className="pb-3 pt-4 px-4 border-b border-border/40">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold">Settlement Audit Ledger</CardTitle>
                    <CardDescription className="text-xs">
                      Historical log of daily drawer sweeps, retained floats, and destination accounts.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <DataTable
                  columns={settlementColumns}
                  data={dailySettlements}
                  searchKey="reference"
                  searchPlaceholder="Filter by reference #..."
                  loading={dailySettlementLoading}
                />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* STAFF TAB CONTENT */}
        <TabsContent value="staff" className="space-y-4 mt-0">
          <div className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground">Assigned Officers ({staff.length})</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {staff.map((stf) => (
                <div key={stf._id} className="rounded-lg border border-border p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-foreground">{stf.name}</span>
                    <Badge variant="outline" className="text-[10px]">Officer</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{stf.email}</p>
                  {stf.phone && <p className="text-[11px] text-muted-foreground">Phone: {stf.phone}</p>}
                </div>
              ))}
              {staff.length === 0 && (
                <div className="col-span-full text-center text-xs text-muted-foreground p-6">
                  No officers currently assigned to this branch.
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ADD ITEM MODAL */}
      <Dialog open={addItemOpen} onOpenChange={setAddItemOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Register Inventory Item</DialogTitle>
            <DialogDescription>
              Add a product or service with code, cost price, and default selling price
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={createItemForm.handleSubmit(onAddItem)} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Item Code</label>
              <Input
                placeholder="e.g. A4-COPY, BIND-01, RLD-DIALOG"
                {...createItemForm.register("itemCode")}
                className="h-9 text-xs font-mono uppercase"
              />
              {createItemForm.formState.errors.itemCode && (
                <p className="text-xs text-destructive">{createItemForm.formState.errors.itemCode.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Item Name / Service</label>
              <Input
                placeholder="e.g. Photocopy A4 Single Side / Dialog Reload"
                {...createItemForm.register("name")}
                className="h-9 text-xs"
              />
              {createItemForm.formState.errors.name && (
                <p className="text-xs text-destructive">{createItemForm.formState.errors.name.message}</p>
              )}
            </div>

            {/* Telecom Reload Configuration */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase text-muted-foreground block">
                Item Classification / Category *
              </label>
              <div className="grid grid-cols-2 p-1 bg-muted rounded-xl border border-border">
                <button
                  type="button"
                  onClick={() => createItemForm.setValue("isTelecomReload", false)}
                  className={`flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${!createItemForm.watch("isTelecomReload")
                    ? "bg-card text-foreground shadow-xs border border-border"
                    : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  <PackageIcon className="size-3.5" />
                  <span>Standard Product</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    createItemForm.setValue("isTelecomReload", true);
                    if (!createItemForm.watch("telecomOperator")) {
                      createItemForm.setValue("telecomOperator", "DIALOG");
                    }
                    if (!createItemForm.watch("commissionRate")) {
                      createItemForm.setValue("commissionRate", 4.0);
                    }
                  }}
                  className={`flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${createItemForm.watch("isTelecomReload")
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  <SmartphoneIcon className="size-3.5" />
                  <span>Telecom Reload</span>
                </button>
              </div>

              {createItemForm.watch("isTelecomReload") && (
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 space-y-2.5">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold uppercase text-muted-foreground">Mobile Provider *</label>
                      <select
                        {...createItemForm.register("telecomOperator")}
                        className="w-full h-8 rounded-md border border-border bg-card text-foreground px-2 text-xs font-medium outline-none focus:border-ring"
                      >
                        <option value="DIALOG">Dialog</option>
                        <option value="MOBITEL">Mobitel</option>
                        <option value="AIRTEL">Airtel</option>
                        <option value="HUTCH">Hutch</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold uppercase text-muted-foreground">Commission Rate (%) *</label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        placeholder="4.0"
                        {...createItemForm.register("commissionRate", { valueAsNumber: true })}
                        className="h-8 text-xs font-mono font-semibold"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Cashiers enter dynamic reload amounts or fixed packages at the POS. Base cost and profit are automatically computed.
                  </p>
                </div>
              )}
            </div>

            {!createItemForm.watch("isTelecomReload") ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">
                    Unit Cost Price (LKR) *
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    {...createItemForm.register("actualPrice", { valueAsNumber: true })}
                    className="h-9 text-xs font-mono font-semibold"
                  />
                  {createItemForm.formState.errors.actualPrice && (
                    <p className="text-xs text-destructive">{createItemForm.formState.errors.actualPrice.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">
                    Selling Unit Price (LKR) *
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    {...createItemForm.register("sellingPrice", { valueAsNumber: true })}
                    className="h-9 text-xs font-mono font-semibold"
                  />
                  {createItemForm.formState.errors.sellingPrice && (
                    <p className="text-xs text-destructive">{createItemForm.formState.errors.sellingPrice.message}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2 p-3 rounded-lg border border-primary/20 bg-primary/5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold uppercase text-muted-foreground">
                        Default Base Unit Price (LKR)
                      </label>
                      <span className="text-[10px] text-muted-foreground">(Optional)</span>
                    </div>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="e.g. 998 (or leave 0)"
                      {...createItemForm.register("actualPrice", { valueAsNumber: true })}
                      className="h-9 text-xs font-mono font-semibold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold uppercase text-muted-foreground">
                        Default Selling Price (LKR)
                      </label>
                      <span className="text-[10px] text-muted-foreground">(Optional)</span>
                    </div>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="e.g. 1000 (or leave 0)"
                      {...createItemForm.register("sellingPrice", { valueAsNumber: true })}
                      className="h-9 text-xs font-mono font-semibold"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  💡 <strong>Fixed Packages:</strong> Pre-configure package base face value (e.g. 998) and selling price (e.g. 1000). Leave 0 for flexible on-demand reload amounts.
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Description (Optional)</label>
              <Textarea
                placeholder="Item specifications or supplier details"
                {...createItemForm.register("description")}
                className="text-xs"
                rows={2}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setAddItemOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={createItemForm.formState.isSubmitting}>
                {createItemForm.formState.isSubmitting ? <Loader2Icon className="size-3.5 animate-spin mr-1" /> : null}
                Save Item
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT ITEM MODAL */}
      <Dialog open={editItemOpen} onOpenChange={setEditItemOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Inventory Item</DialogTitle>
            <DialogDescription>
              Modify pricing or details for {selectedItem?.itemCode}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={editItemForm.handleSubmit(onEditItem)} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Item Code</label>
              <Input
                placeholder="Item Code"
                {...editItemForm.register("itemCode")}
                className="h-9 text-xs font-mono uppercase"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Item Name</label>
              <Input
                placeholder="Item Name"
                {...editItemForm.register("name")}
                className="h-9 text-xs"
              />
            </div>

            {/* Telecom Reload Configuration */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase text-muted-foreground block">
                Item Classification / Category *
              </label>
              <div className="grid grid-cols-2 p-1 bg-muted rounded-xl border border-border">
                <button
                  type="button"
                  onClick={() => editItemForm.setValue("isTelecomReload", false)}
                  className={`flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${!editItemForm.watch("isTelecomReload")
                    ? "bg-card text-foreground shadow-xs border border-border"
                    : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  <PackageIcon className="size-3.5" />
                  <span>Standard Product</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    editItemForm.setValue("isTelecomReload", true);
                    if (!editItemForm.watch("telecomOperator")) {
                      editItemForm.setValue("telecomOperator", "DIALOG");
                    }
                    if (!editItemForm.watch("commissionRate")) {
                      editItemForm.setValue("commissionRate", 4.0);
                    }
                  }}
                  className={`flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${editItemForm.watch("isTelecomReload")
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  <SmartphoneIcon className="size-3.5" />
                  <span>Telecom Reload</span>
                </button>
              </div>

              {editItemForm.watch("isTelecomReload") && (
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 space-y-2.5">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold uppercase text-muted-foreground">Mobile Provider *</label>
                      <select
                        {...editItemForm.register("telecomOperator")}
                        className="w-full h-8 rounded-md border border-border bg-card text-foreground px-2 text-xs font-medium outline-none focus:border-ring"
                      >
                        <option value="DIALOG">Dialog</option>
                        <option value="MOBITEL">Mobitel</option>
                        <option value="AIRTEL">Airtel</option>
                        <option value="HUTCH">Hutch</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold uppercase text-muted-foreground">Commission Rate (%) *</label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        placeholder="4.0"
                        {...editItemForm.register("commissionRate", { valueAsNumber: true })}
                        className="h-8 text-xs font-mono font-semibold"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Cashiers enter dynamic reload amounts or fixed packages at the POS. Base cost and profit are automatically computed.
                  </p>
                </div>
              )}
            </div>

            {!editItemForm.watch("isTelecomReload") ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">
                    Unit Cost Price (LKR) *
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    {...editItemForm.register("actualPrice", { valueAsNumber: true })}
                    className="h-9 text-xs font-mono font-semibold"
                  />
                  {editItemForm.formState.errors.actualPrice && (
                    <p className="text-xs text-destructive">{editItemForm.formState.errors.actualPrice.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">
                    Selling Unit Price (LKR) *
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    {...editItemForm.register("sellingPrice", { valueAsNumber: true })}
                    className="h-9 text-xs font-mono font-semibold"
                  />
                  {editItemForm.formState.errors.sellingPrice && (
                    <p className="text-xs text-destructive">{editItemForm.formState.errors.sellingPrice.message}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2 p-3 rounded-lg border border-primary/20 bg-primary/5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold uppercase text-muted-foreground">
                        Default Base Unit Price (LKR)
                      </label>
                      <span className="text-[10px] text-muted-foreground">(Optional)</span>
                    </div>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="e.g. 998 (or leave 0)"
                      {...editItemForm.register("actualPrice", { valueAsNumber: true })}
                      className="h-9 text-xs font-mono font-semibold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold uppercase text-muted-foreground">
                        Default Selling Price (LKR)
                      </label>
                      <span className="text-[10px] text-muted-foreground">(Optional)</span>
                    </div>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="e.g. 1000 (or leave 0)"
                      {...editItemForm.register("sellingPrice", { valueAsNumber: true })}
                      className="h-9 text-xs font-mono font-semibold"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  💡 <strong>Fixed Packages:</strong> Pre-configure package base face value (e.g. 998) and selling price (e.g. 1000). Leave 0 for flexible on-demand reload amounts.
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Description</label>
              <Textarea
                {...editItemForm.register("description")}
                className="text-xs"
                rows={2}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditItemOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={editItemForm.formState.isSubmitting}>
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CUSTOMER CREDIT STATEMENT MODAL */}
      <Dialog open={statementOpen} onOpenChange={setStatementOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <FileTextIcon className="size-4 text-primary" />
              <span>Customer Credit Statement</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Complete history of purchases and debt settlements for this customer.
            </DialogDescription>
          </DialogHeader>

          {statementLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
              <Loader2Icon className="size-6 animate-spin text-primary" />
              <span>Loading customer ledger transactions...</span>
            </div>
          ) : customerStatement ? (
            <div className="space-y-4 py-1">
              {/* Customer Profile Banner */}
              <div className="p-3.5 rounded-xl border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div>
                  <h4 className="text-sm font-bold text-foreground">{customerStatement.customer.name}</h4>
                  <p className="text-xs font-mono text-muted-foreground">
                    Mobile: {customerStatement.customer.phone}
                  </p>
                  {customerStatement.customer.notes && (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Note: {customerStatement.customer.notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Total Credit</span>
                    <span className="text-xs font-mono font-semibold text-foreground">
                      LKR {Number(customerStatement.customer.totalCredit).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Total Paid</span>
                    <span className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                      LKR {Number(customerStatement.customer.totalPaid).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="text-right pl-3 border-l border-border">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Current Debt</span>
                    <span className="text-sm font-mono font-bold text-amber-600 dark:text-amber-400">
                      LKR {Number(customerStatement.customer.currentBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Transactions Ledger Table */}
              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 border-b border-border text-[11px] font-semibold text-muted-foreground">
                    <tr>
                      <th className="py-2 px-3 text-left">Date</th>
                      <th className="py-2 px-3 text-left">Type</th>
                      <th className="py-2 px-3 text-left">Bill / Ref</th>
                      <th className="py-2 px-3 text-left">Method / Account</th>
                      <th className="py-2 px-3 text-right">Amount (LKR)</th>
                      <th className="py-2 px-3 text-left">Recorded By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-mono">
                    {customerStatement.transactions && customerStatement.transactions.length > 0 ? (
                      customerStatement.transactions.map((t) => {
                        const isRepay = t.type === "REPAYMENT";
                        return (
                          <tr key={t._id} className="hover:bg-muted/30">
                            <td className="py-2 px-3 text-muted-foreground">
                              {new Date(t.date).toLocaleDateString()}
                            </td>
                            <td className="py-2 px-3 font-sans">
                              {isRepay ? (
                                <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-semibold">
                                  Repay
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold">
                                  Sale
                                </Badge>
                              )}
                            </td>
                            <td className="py-2 px-3 text-primary font-semibold">
                              {t.billNumber || "-"}
                            </td>
                            <td className="py-2 px-3 text-muted-foreground font-sans">
                              <div>{t.paymentMethod}</div>
                              {t.bankAccount && <div className="text-[10px] font-mono">{t.bankAccount}</div>}
                            </td>
                            <td className={`py-2 px-3 text-right font-bold ${isRepay ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                              {isRepay ? "-" : "+"} {Number(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2 px-3 text-muted-foreground font-sans text-[11px]">
                              <div>{t.recordedBy}</div>
                              {t.note && <div className="text-[10px] text-muted-foreground truncate max-w-[120px]">{t.note}</div>}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-xs text-muted-foreground font-sans">
                          No transactions recorded for this customer yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setStatementOpen(false)}>
              Close Statement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Inter-Branch Cash Settlement Modal */}
      <Dialog open={settleOpen} onOpenChange={setSettleOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Building2Icon className="size-5 text-blue-600" />
              Settle Inter-Branch Cash
            </DialogTitle>
            <DialogDescription className="text-xs">
              Record physical cash handover or bank deposit for cross-branch payments collected at {shop.name}.
            </DialogDescription>
          </DialogHeader>

          {selectedHoldingDue && (
            <form onSubmit={handleSettleSubmit} className="space-y-4 py-2">
              <div className="p-3 rounded-xl border border-blue-500/30 bg-blue-500/10 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground uppercase font-semibold text-[10px]">Beneficiary Branch:</span>
                  <span className="font-bold text-foreground">
                    {selectedHoldingDue.shopName} ({selectedHoldingDue.shopCode})
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground uppercase font-semibold text-[10px]">Total Cash to Settle:</span>
                  <span className="text-base font-bold font-mono text-blue-700 dark:text-blue-400">
                    LKR {Number(selectedHoldingDue.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground uppercase font-semibold text-[10px]">Transactions Included:</span>
                  <span className="font-mono text-muted-foreground font-medium">
                    {selectedHoldingDue.count} record(s)
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">
                  Settlement Method *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSettlementType("HANDOVER_TO_BRANCH")}
                    className={`p-2 rounded-lg text-xs font-semibold border flex flex-col items-center justify-center text-center gap-1 transition-all ${settlementType === "HANDOVER_TO_BRANCH"
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : "border-border text-muted-foreground hover:bg-muted"
                      }`}
                  >
                    <HandCoinsIcon className="size-4" />
                    <span>Physical Handover</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettlementType("DEPOSITED_TO_BANK")}
                    className={`p-2 rounded-lg text-xs font-semibold border flex flex-col items-center justify-center text-center gap-1 transition-all ${settlementType === "DEPOSITED_TO_BANK"
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : "border-border text-muted-foreground hover:bg-muted"
                      }`}
                  >
                    <LandmarkIcon className="size-4" />
                    <span>Bank Deposit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettlementType("DIRECT_OFFSET")}
                    className={`p-2 rounded-lg text-xs font-semibold border flex flex-col items-center justify-center text-center gap-1 transition-all ${settlementType === "DIRECT_OFFSET"
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : "border-border text-muted-foreground hover:bg-muted"
                      }`}
                  >
                    <ArrowUpDownIcon className="size-4" />
                    <span>Direct Offset</span>
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {settlementType === "HANDOVER_TO_BRANCH" && "Physical cash is transferred from this shop drawer directly to the target branch drawer."}
                  {settlementType === "DEPOSITED_TO_BANK" && "Physical cash from this drawer is deposited directly into a company bank account."}
                  {settlementType === "DIRECT_OFFSET" && "Offsets mutual debt balances between the two branches without moving cash."}
                </p>
              </div>

              {settlementType === "DEPOSITED_TO_BANK" && (
                <div className="space-y-1.5 p-3 rounded-lg border border-border bg-muted/20">
                  <label className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1">
                    <LandmarkIcon className="size-3.5 text-primary" />
                    Select Company Bank Account *
                  </label>
                  <select
                    value={settlementBankId || ""}
                    onChange={(e) => setSettlementBankId(e.target.value || null)}
                    className="w-full h-9 rounded-md border border-border bg-card text-foreground px-3 text-xs font-medium outline-none focus:border-ring"
                  >
                    <option value="">Choose Bank Account...</option>
                    {bankAccounts.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.bankName} - {b.accountName} ({b.accountNumber})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">
                    Reference / Slip No.
                  </label>
                  <Input
                    placeholder="e.g. SLIP-10293 or Handover ID"
                    value={settlementRef}
                    onChange={(e) => setSettlementRef(e.target.value)}
                    className="h-9 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">
                    Settlement Date
                  </label>
                  <Input
                    value={new Date().toLocaleDateString()}
                    disabled
                    className="h-9 text-xs bg-muted/50 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">
                  Settlement Notes / Handed Over By
                </label>
                <Textarea
                  placeholder="e.g. Physical cash handed over to branch manager / deposit slip verified..."
                  value={settlementNote}
                  onChange={(e) => setSettlementNote(e.target.value)}
                  className="text-xs"
                  rows={2}
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setSettleOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submittingSettlement}
                  className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 font-semibold"
                >
                  {submittingSettlement ? <Loader2Icon className="size-3.5 animate-spin mr-1" /> : <CheckCircle2Icon className="size-3.5" />}
                  Confirm Settlement
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* DAILY CASH FLOAT SETTLEMENT DIALOG */}
      <Dialog open={dailySettlementDialogOpen} onOpenChange={setDailySettlementDialogOpen}>
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CoinsIcon className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold">
                  Record Daily Cash Settlement
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Retain standard opening float and sweep surplus drawer cash to Petty Cash or Bank.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmitDailySettlement} className="space-y-4 pt-2">
            {/* Live Calculation Banner */}
            <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">Today's Available Cash in Drawer:</span>
                <span className="font-mono font-bold text-foreground text-sm">
                  LKR {dailySettlementCurrentCash.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                {/* Retained Float Input */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase flex items-center justify-between">
                    <span>Retained Float</span>
                    <span className="text-[10px] text-primary lowercase">(editable)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 text-xs font-mono text-muted-foreground">LKR</span>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      value={dailySettleRetainedFloat}
                      onChange={(e) => handleRetainedFloatChange(Number(e.target.value) || 0)}
                      className="h-8 text-xs font-mono pl-10 font-medium"
                      required
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Cash kept in drawer to start next day.
                  </p>
                </div>

                {/* Sweep / Transfer Amount */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase flex items-center justify-between">
                    <span>Surplus Sweep Amount</span>
                    <span className="text-[10px] text-emerald-600 font-semibold">(auto-calculated)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 text-xs font-mono text-muted-foreground">LKR</span>
                    <Input
                      type="number"
                      step="any"
                      min="0.01"
                      value={dailySettleTransferAmount}
                      onChange={(e) => handleTransferAmountChange(Number(e.target.value) || 0)}
                      className="h-8 text-xs font-mono pl-10 font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800"
                      required
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Amount transferred out of drawer.
                  </p>
                </div>
              </div>

              {/* Dynamic Calculation Summary Indicator */}
              <div className="rounded-lg bg-background p-2.5 border border-border/80 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Drawer Remaining After Sweep:</span>
                <span className="font-mono font-semibold text-foreground">
                  LKR {Math.max(0, dailySettlementCurrentCash - dailySettleTransferAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Destination Selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">
                Target Destination Source:
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setDailySettleDestinationType("PETTY_CASH")}
                  className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${dailySettleDestinationType === "PETTY_CASH"
                    ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary"
                    : "border-border bg-card text-muted-foreground hover:bg-muted/50"
                    }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <CoinsIcon className="size-4 text-blue-600" />
                    <span className="text-xs font-semibold">Central Petty Cash</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    Sweeps surplus cash directly into the central company petty cash float.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setDailySettleDestinationType("BANK_ACCOUNT")}
                  className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${dailySettleDestinationType === "BANK_ACCOUNT"
                    ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary"
                    : "border-border bg-card text-muted-foreground hover:bg-muted/50"
                    }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <LandmarkIcon className="size-4 text-indigo-600" />
                    <span className="text-xs font-semibold">Bank Account</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    Deposits surplus cash into a verified company bank account.
                  </span>
                </button>
              </div>
            </div>

            {/* Bank Account Dropdown if BANK_ACCOUNT selected */}
            {dailySettleDestinationType === "BANK_ACCOUNT" && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Select Destination Bank Account <span className="text-destructive">*</span>
                </label>
                {dailySettlementBankAccounts.length === 0 ? (
                  <p className="text-xs text-destructive">
                    No active company bank accounts found. Please add a bank account first.
                  </p>
                ) : (
                  <Select value={dailySettleBankAccountId} onValueChange={(val) => setDailySettleBankAccountId(val || "")}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Choose bank account..." />
                    </SelectTrigger>
                    <SelectContent>
                      {dailySettlementBankAccounts.map((b) => (
                        <SelectItem key={b._id} value={b._id}>
                          {b.bankName} - {b.accountNumber} ({b.accountName})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {/* Date and Reference */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase">
                  Settlement Date
                </label>
                <Input
                  type="date"
                  value={dailySettleDate}
                  onChange={(e) => setDailySettleDate(e.target.value)}
                  className="h-8 text-xs font-medium"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase">
                  Reference #
                </label>
                <Input
                  placeholder="e.g. SETTLE-00123"
                  value={dailySettleReference}
                  onChange={(e) => setDailySettleReference(e.target.value)}
                  className="h-8 text-xs font-medium"
                />
              </div>
            </div>

            {/* Optional Note */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase">
                Note / Remarks (Optional)
              </label>
              <Textarea
                placeholder="Additional notes for drawer closing or settlement handover..."
                value={dailySettleNote}
                onChange={(e) => setDailySettleNote(e.target.value)}
                className="text-xs min-h-[60px]"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDailySettlementDialogOpen(false)}
                disabled={isSubmittingDailySettlement}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmittingDailySettlement || dailySettleTransferAmount <= 0}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
              >
                {isSubmittingDailySettlement ? (
                  <>
                    <Loader2Icon className="size-3.5 mr-1.5 animate-spin" />
                    Processing Settlement...
                  </>
                ) : (
                  <>
                    <CheckCircle2Icon className="size-3.5 mr-1.5" />
                    Confirm & Sweep Float
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Cash Drawer Audit & Diagnostic Dialog */}
      <Dialog open={auditOpen} onOpenChange={setAuditOpen}>
        <DialogContent className="w-full sm:max-w-4xl lg:max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <WrenchIcon className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">
                  Cash Drawer Diagnostic & Balance Audit
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Inspect physical locker cash calculations, detect discrepancies, and view non-cash funds for {shop.name} ({shop.code}).
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {auditLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2Icon className="size-8 animate-spin text-primary" />
              <p className="text-xs">Analyzing ledger transactions & drawer state...</p>
            </div>
          ) : cashAuditData ? (
            <div className="space-y-5 py-2">
              {/* Top Banner: Status & Sync Check */}
              <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${cashAuditData.isOutOfSync
                ? "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-300"
                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-300"
                }`}>
                <div className="flex items-start gap-3">
                  {cashAuditData.isOutOfSync ? (
                    <AlertTriangleIcon className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2Icon className="size-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h5 className="font-semibold text-sm">
                      {cashAuditData.isOutOfSync ? "Drawer Balance Out of Sync" : "Drawer Balance Fully Synchronized"}
                    </h5>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {cashAuditData.isOutOfSync
                        ? `Live physical cash (LKR ${cashAuditData.currentDrawerBalance.toLocaleString()}) differs from the latest recorded running balance (LKR ${Number(cashAuditData.latestStoredRunningBalance || 0).toLocaleString()}) by LKR ${Math.abs(cashAuditData.discrepancyAmount).toLocaleString()}. Click Re-sync to align all records.`
                        : `The recorded ledger running balance matches the true calculated physical drawer cash of LKR ${cashAuditData.currentDrawerBalance.toLocaleString()}.`}
                    </p>
                  </div>
                </div>

                <Button
                  size="sm"
                  onClick={handleRecalculateAndSync}
                  disabled={syncingCash}
                  className="shrink-0 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                >
                  <RefreshCwIcon className={`size-3.5 ${syncingCash ? "animate-spin" : ""}`} />
                  {syncingCash ? "Recalculating..." : "Recalculate & Re-sync"}
                </Button>
              </div>

              {/* 3 Overview Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Card className="p-3.5 bg-card border-border">
                  <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                    Calculated Drawer Cash
                  </span>
                  <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                    LKR {cashAuditData.currentDrawerBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-0.5 block">
                    Actual physical notes & coins that must be in the locker
                  </span>
                </Card>

                <Card className="p-3.5 bg-card border-border">
                  <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                    Unsettled Cash Held for Others
                  </span>
                  <div className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-1">
                    LKR {cashAuditData.components.unsettledCollectingCashHeld.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-0.5 block">
                    Tuition fees / payments collected at this counter for other branches
                  </span>
                </Card>

                <Card className="p-3.5 bg-card border-border">
                  <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                    Direct Shop Net Cash
                  </span>
                  <div className={`text-xl font-bold font-mono mt-1 ${cashAuditData.components.standardNetCash >= 0 ? "text-chart-2" : "text-destructive"}`}>
                    LKR {cashAuditData.components.standardNetCash.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-0.5 block">
                    Direct branch cash inflow minus cash outflow
                  </span>
                </Card>
              </div>

              {/* Payment Methods Audit (Explaining why Petty Cash / Bank / Credit are NOT in Drawer) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h6 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Funds Breakdown by Payment Method
                  </h6>
                  <span className="text-[11px] text-muted-foreground">
                    Only "Physical Cash" moves the locker drawer
                  </span>
                </div>

                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/60 text-muted-foreground">
                      <tr>
                        <th className="py-2 px-3 text-left font-semibold">Payment Method</th>
                        <th className="py-2 px-3 text-right font-semibold">Inflow (LKR)</th>
                        <th className="py-2 px-3 text-right font-semibold">Outflow (LKR)</th>
                        <th className="py-2 px-3 text-right font-semibold">Net (LKR)</th>
                        <th className="py-2 px-3 text-center font-semibold">Affects Locker?</th>
                        <th className="py-2 px-3 text-left font-semibold">Account / Fund Location</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {cashAuditData.paymentMethods.map((pm: any) => (
                        <tr key={pm.method} className={pm.impactsLockerCash ? "bg-emerald-500/5 font-medium" : ""}>
                          <td className="py-2.5 px-3">
                            <span className="font-semibold">{pm.label}</span>
                            <span className="text-[10px] text-muted-foreground block font-mono">{pm.method}</span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                            +{pm.inflow.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">
                            -{pm.outflow.toLocaleString()}
                          </td>
                          <td className={`py-2.5 px-3 text-right font-mono font-bold ${pm.net >= 0 ? "text-chart-2" : "text-destructive"}`}>
                            {pm.net >= 0 ? "+" : ""}{pm.net.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {pm.impactsLockerCash ? (
                              <Badge className="bg-emerald-600 text-white text-[10px] px-2 py-0">
                                YES (Locker)
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] px-2 py-0 text-muted-foreground">
                                NO (Separate)
                              </Badge>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-[11px] text-muted-foreground max-w-xs">
                            {pm.explanation}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pending Cash Collections Notice */}
              {cashAuditData.pendingCashCollections && cashAuditData.pendingCashCollections.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangleIcon className="size-4 text-amber-500" />
                    <h6 className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                      Pending Cash Collections Physically In Locker ({cashAuditData.pendingCashCollections.length})
                    </h6>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    The following payments were received in cash at the counter and are physically in your locker right now, awaiting admin verification:
                  </p>

                  <div className="rounded-lg border border-border overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/60 text-muted-foreground">
                        <tr>
                          <th className="py-2 px-3 text-left font-semibold">Bill No</th>
                          <th className="py-2 px-3 text-left font-semibold">Date</th>
                          <th className="py-2 px-3 text-left font-semibold">Reason</th>
                          <th className="py-2 px-3 text-left font-semibold">Target Branch</th>
                          <th className="py-2 px-3 text-right font-semibold">Amount (LKR)</th>
                          <th className="py-2 px-3 text-center font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {cashAuditData.pendingCashCollections.map((pr: any) => (
                          <tr key={pr.recordId}>
                            <td className="py-2 px-3 font-mono font-semibold">{pr.billNumber}</td>
                            <td className="py-2 px-3 font-mono text-[11px]">{pr.date}</td>
                            <td className="py-2 px-3">{pr.reason}</td>
                            <td className="py-2 px-3">
                              <Badge variant="outline" className="text-[10px]">{pr.beneficiaryName}</Badge>
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-chart-2">
                              +LKR {pr.amount.toLocaleString()}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px]">
                                {pr.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Recent Cash Ledger Entries */}
              {cashAuditData.recentCashRecords && cashAuditData.recentCashRecords.length > 0 && (
                <div className="space-y-2">
                  <h6 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Recent Physical Cash Movements (Latest 10)
                  </h6>
                  <div className="rounded-lg border border-border overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/60 text-muted-foreground">
                        <tr>
                          <th className="py-2 px-3 text-left font-semibold">Date</th>
                          <th className="py-2 px-3 text-left font-semibold">Bill No</th>
                          <th className="py-2 px-3 text-left font-semibold">Reason</th>
                          <th className="py-2 px-3 text-right font-semibold">Amount (LKR)</th>
                          <th className="py-2 px-3 text-right font-semibold">Running Balance (LKR)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {cashAuditData.recentCashRecords.map((rec: any) => (
                          <tr key={rec.recordId}>
                            <td className="py-2 px-3 font-mono text-[11px]">{rec.date}</td>
                            <td className="py-2 px-3 font-mono">{rec.billNumber}</td>
                            <td className="py-2 px-3">{rec.reason}</td>
                            <td className={`py-2 px-3 text-right font-mono font-semibold ${rec.type === "INCOME" ? "text-chart-2" : "text-foreground"}`}>
                              {rec.type === "INCOME" ? "+" : "-"}LKR {Number(rec.amount).toLocaleString()}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-foreground">
                              LKR {Number(rec.runningBalance).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setAuditOpen(false)} className="text-xs">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
