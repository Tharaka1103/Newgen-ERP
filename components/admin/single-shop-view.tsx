"use client";

import * as React from "react";
import Link from "next/link";
import { getSummaryAnalyticsAction } from "@/actions/reports";
import { getShopDetailsAction } from "@/actions/shops";
import {
  getCommunicationItemsAction,
  createCommunicationItemAction,
  updateCommunicationItemAction,
  deleteCommunicationItemAction,
  getCommunicationAnalyticsAction,
} from "@/actions/communication";
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
} from "lucide-react";
import { toast } from "@/components/ui/toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createCommunicationItemSchema,
  updateCommunicationItemSchema,
  CreateCommunicationItemInput,
  UpdateCommunicationItemInput,
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
    shopType?: "STANDARD" | "COMMUNICATION";
    isActive: boolean;
  };
  initialStaff: AssignedStaff[];
  initialStats: {
    recordsCount: number;
    pendingCount: number;
    approvedCount: number;
    currentBalance: number;
  };
}

export function SingleShopView({
  initialShop,
  initialStaff,
  initialStats,
}: SingleShopViewProps) {
  const isCommunication = initialShop.shopType === "COMMUNICATION";

  const [activeTab, setActiveTab] = React.useState<"overview" | "items" | "staff">("overview");
  const [period, setPeriod] = React.useState<"today" | "week" | "month" | "year" | "custom">("month");
  const [startDate, setStartDate] = React.useState<string>("");
  const [endDate, setEndDate] = React.useState<string>("");
  const [itemFilter, setItemFilter] = React.useState<string>("ALL");
  const [loading, setLoading] = React.useState<boolean>(false);

  const [shop, setShop] = React.useState(initialShop);
  const [staff, setStaff] = React.useState<AssignedStaff[]>(initialStaff);
  const [stats, setStats] = React.useState(initialStats);

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
  }>({
    totalRevenue: 0,
    totalCost: 0,
    netProfit: 0,
    totalTransactions: 0,
    branchRelatedCount: 0,
    nonBranchCount: 0,
    records: [],
    itemBreakdown: [],
  });

  // Modals for Communication Items
  const [addItemOpen, setAddItemOpen] = React.useState(false);
  const [editItemOpen, setEditItemOpen] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState<any | null>(null);

  const createItemForm = useForm<CreateCommunicationItemInput>({
    resolver: zodResolver(createCommunicationItemSchema),
    defaultValues: {
      shopId: initialShop._id,
      itemCode: "",
      name: "",
      actualPrice: 0,
      description: "",
    },
  });

  const editItemForm = useForm<UpdateCommunicationItemInput>({
    resolver: zodResolver(updateCommunicationItemSchema),
    defaultValues: {
      itemId: "",
      itemCode: "",
      name: "",
      actualPrice: 0,
      description: "",
      isActive: true,
    },
  });

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
    },
    timelineData: [],
    categoryBreakdownData: [],
    records: [],
  });

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

      // If communication, also fetch items & communication analytics
      if (isCommunication) {
        const [itemsRes, commAnalyticsRes] = await Promise.all([
          getCommunicationItemsAction(shop._id),
          getCommunicationAnalyticsAction({
            shopId: shop._id,
            period,
            startDate: period === "custom" ? startDate : undefined,
            endDate: period === "custom" ? endDate : undefined,
            itemCodeFilter: itemFilter,
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
  }, [period, startDate, endDate, itemFilter, shop._id, isCommunication]);

  React.useEffect(() => {
    fetchShopData();
  }, [fetchShopData]);

  // Item Management Handlers
  const onAddItem = async (data: CreateCommunicationItemInput) => {
    try {
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

  // Table Columns for Standard Branch
  const standardColumns: ColumnDef<any>[] = [
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
      header: "Date",
      cell: ({ row }) => (
        <span className="font-mono text-xs">{new Date(row.original.date).toLocaleDateString()}</span>
      ),
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
      header: "Branch Link",
      cell: ({ row }) => (
        row.original.isRelatedToBranch ? (
          <Badge variant="outline" className="text-[10px] border-primary/40 bg-primary/10 text-primary">
            {row.original.relatedBranch?.name || "Branch Linked"}
          </Badge>
        ) : (
          <span className="text-[11px] text-muted-foreground">Direct Retail</span>
        )
      ),
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
      cell: ({ row }) => (
        <span className="font-mono text-xs font-bold uppercase rounded-md bg-muted px-2 py-0.5 border border-border">
          {row.original.itemCode}
        </span>
      ),
    },
    {
      accessorKey: "name",
      header: "Item Name",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-semibold text-xs text-foreground">{row.original.name}</span>
          {row.original.description && (
            <span className="text-[11px] text-muted-foreground truncate max-w-xs">{row.original.description}</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "actualPrice",
      header: "Unit Cost Price (LKR)",
      cell: ({ row }) => (
        <span className="font-mono text-xs font-semibold text-foreground">
          LKR {Number(row.original.actualPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      ),
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
                  actualPrice: item.actualPrice,
                  description: item.description || "",
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

            <div className="flex flex-col sm:items-end justify-center pl-3 border-l border-border">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Branch Balance
              </div>
              <div className={`text-xl font-bold font-mono ${stats.currentBalance >= 0 ? "text-chart-2" : "text-destructive"}`}>
                LKR {Number(stats.currentBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
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
              <TabsTrigger value="items" className="text-xs">
                Items & Inventory ({commItems.length})
              </TabsTrigger>
            )}
            <TabsTrigger value="staff" className="text-xs">
              Assigned Officers ({staff.length})
            </TabsTrigger>
          </TabsList>
        </div>

        {/* OVERVIEW TAB CONTENT */}
        <TabsContent value="overview" className="space-y-6 mt-0">
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
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
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
            </div>
          ) : (
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-4">
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

        {/* ITEMS & INVENTORY TAB CONTENT */}
        {isCommunication && (
          <TabsContent value="items" className="space-y-4 mt-0">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-foreground">Registered Products & Services</h3>
                <p className="text-xs text-muted-foreground">
                  Manage inventory item codes, wholesale cost prices, and standard selling prices
                </p>
              </div>

              <Button
                onClick={() => {
                  createItemForm.reset({
                    shopId: shop._id,
                    itemCode: "",
                    name: "",
                    actualPrice: 0,
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
            </div>

            <DataTable
              columns={itemColumns}
              data={commItems}
              searchKey="name"
              searchPlaceholder="Search items by name or code..."
              loading={loading}
            />
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
                placeholder="e.g. A4-COPY, BIND-01, PEN-BL"
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
                placeholder="e.g. Photocopy A4 Single Side"
                {...createItemForm.register("name")}
                className="h-9 text-xs"
              />
              {createItemForm.formState.errors.name && (
                <p className="text-xs text-destructive">{createItemForm.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Unit Cost Price (LKR) *</label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                {...createItemForm.register("actualPrice", { valueAsNumber: true })}
                className="h-9 text-xs font-mono font-semibold"
              />
              {createItemForm.formState.errors.actualPrice && (
                <p className="text-xs text-destructive">{createItemForm.formState.errors.actualPrice.message}</p>
              )}
            </div>

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

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Unit Cost Price (LKR) *</label>
              <Input
                type="number"
                step="0.01"
                {...editItemForm.register("actualPrice", { valueAsNumber: true })}
                className="h-9 text-xs font-mono font-semibold"
              />
            </div>

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
    </div>
  );
}
