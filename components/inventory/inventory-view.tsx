"use client";

import * as React from "react";
import {
  getInventoryItemsAction,
  createInventoryItemAction,
  updateInventoryItemAction,
  deleteInventoryItemAction,
  recordInventoryUsageAction,
  getInventoryUsageHistoryAction,
  getInventoryAnalyticsAction,
} from "@/actions/inventory";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/toast";
import {
  PackageIcon,
  LayersIcon,
  AlertTriangleIcon,
  AlertCircleIcon,
  DollarSignIcon,
  PlusCircleIcon,
  MinusCircleIcon,
  EditIcon,
  Trash2Icon,
  SearchIcon,
  DownloadIcon,
  RefreshCwIcon,
  Loader2Icon,
  CheckCircle2Icon,
  LayoutDashboardIcon,
  HistoryIcon,
  MapPinIcon,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
} from "recharts";

interface InventoryViewProps {
  shopId: string;
  shopName: string;
  shopCode: string;
  isStaff?: boolean;
}

export function InventoryView({
  shopId,
  shopName,
  shopCode,
  isStaff = false,
}: InventoryViewProps) {
  const [activeTab, setActiveTab] = React.useState<"dashboard" | "items" | "history">("dashboard");

  // Data states
  const [items, setItems] = React.useState<any[]>([]);
  const [categories, setCategories] = React.useState<string[]>([]);
  const [usages, setUsages] = React.useState<any[]>([]);
  const [analytics, setAnalytics] = React.useState<{
    totalItems: number;
    totalStockCount: number;
    totalInventoryValue: number;
    lowStockCount: number;
    outOfStockCount: number;
    lowStockItems: any[];
    categoryBreakdown: Array<{ category: string; itemCount: number; totalValue: number }>;
    recentUsages: any[];
  }>({
    totalItems: 0,
    totalStockCount: 0,
    totalInventoryValue: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    lowStockItems: [],
    categoryBreakdown: [],
    recentUsages: [],
  });

  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  // Filters
  const [search, setSearch] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("ALL");
  const [statusFilter, setStatusFilter] = React.useState("ALL");

  // Create Modal
  const [createOpen, setCreateOpen] = React.useState(false);
  const [createForm, setCreateForm] = React.useState({
    name: "",
    itemCode: "",
    category: "General",
    quantity: 0,
    unit: "pcs",
    unitPrice: 0,
    minStockThreshold: 5,
    description: "",
    location: "",
  });
  const [isCreating, setIsCreating] = React.useState(false);

  // Edit Modal
  const [editOpen, setEditOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<any | null>(null);
  const [editForm, setEditForm] = React.useState({
    name: "",
    itemCode: "",
    category: "General",
    quantity: 0,
    unit: "pcs",
    unitPrice: 0,
    minStockThreshold: 5,
    description: "",
    location: "",
  });
  const [isUpdating, setIsUpdating] = React.useState(false);

  // Delete Modal
  const [deleteConfirmItem, setDeleteConfirmItem] = React.useState<any | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Record Usage Modal
  const [usageOpen, setUsageOpen] = React.useState(false);
  const [usageForm, setUsageForm] = React.useState({
    itemId: "",
    quantityUsed: 1,
    purpose: "",
    date: new Date().toISOString().split("T")[0],
    note: "",
  });
  const [isRecordingUsage, setIsRecordingUsage] = React.useState(false);

  // Post-usage low stock alert banner
  const [recentLowStockAlert, setRecentLowStockAlert] = React.useState<{
    itemName: string;
    itemCode: string;
    remaining: number;
    unit: string;
    threshold: number;
  } | null>(null);

  const fetchData = React.useCallback(async () => {
    if (!shopId) return;
    setLoading(true);

    try {
      const [itemsRes, analyticsRes, usagesRes] = await Promise.all([
        getInventoryItemsAction(
          shopId,
          search.trim() || undefined,
          categoryFilter !== "ALL" ? categoryFilter : undefined,
          statusFilter !== "ALL" ? statusFilter : undefined
        ),
        getInventoryAnalyticsAction(shopId),
        getInventoryUsageHistoryAction(shopId, undefined, 50),
      ]);

      if (itemsRes.success && itemsRes.items) {
        setItems(itemsRes.items);
        setCategories(itemsRes.categories || []);
      }
      if (analyticsRes.success && analyticsRes.analytics) {
        setAnalytics(analyticsRes.analytics);
      }
      if (usagesRes.success && usagesRes.usages) {
        setUsages(usagesRes.usages);
      }
    } catch (err) {
      console.error("Failed to load inventory data:", err);
      toast.create({
        title: "Load Error",
        description: "Failed to fetch inventory data.",
        type: "error",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [shopId, search, categoryFilter, statusFilter]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Create Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim() || !createForm.itemCode.trim()) {
      toast.create({
        title: "Validation Error",
        description: "Item Name and Item Code are required.",
        type: "error",
      });
      return;
    }

    setIsCreating(true);
    const res = await createInventoryItemAction({
      shopId,
      ...createForm,
      quantity: Number(createForm.quantity) || 0,
      unitPrice: Number(createForm.unitPrice) || 0,
      minStockThreshold: Number(createForm.minStockThreshold) || 5,
    });
    setIsCreating(false);

    if (res.success) {
      toast.create({
        title: "Item Registered",
        description: res.message,
        type: "success",
      });
      setCreateOpen(false);
      setCreateForm({
        name: "",
        itemCode: "",
        category: "General",
        quantity: 0,
        unit: "pcs",
        unitPrice: 0,
        minStockThreshold: 5,
        description: "",
        location: "",
      });
      fetchData();
    } else {
      toast.create({
        title: "Registration Failed",
        description: res.error || "Failed to create item",
        type: "error",
      });
    }
  };

  // Handle Edit Open
  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setEditForm({
      name: item.name || "",
      itemCode: item.itemCode || "",
      category: item.category || "General",
      quantity: Number(item.quantity || 0),
      unit: item.unit || "pcs",
      unitPrice: Number(item.unitPrice || 0),
      minStockThreshold: Number(item.minStockThreshold || 5),
      description: item.description || "",
      location: item.location || "",
    });
    setEditOpen(true);
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    setIsUpdating(true);
    const res = await updateInventoryItemAction({
      itemId: editingItem._id,
      ...editForm,
      quantity: Number(editForm.quantity) || 0,
      unitPrice: Number(editForm.unitPrice) || 0,
      minStockThreshold: Number(editForm.minStockThreshold) || 5,
    });
    setIsUpdating(false);

    if (res.success) {
      toast.create({
        title: "Item Updated",
        description: res.message,
        type: "success",
      });
      setEditOpen(false);
      setEditingItem(null);
      fetchData();
    } else {
      toast.create({
        title: "Update Failed",
        description: res.error || "Failed to update item",
        type: "error",
      });
    }
  };

  // Handle Delete Submit
  const handleDeleteSubmit = async () => {
    if (!deleteConfirmItem) return;

    setIsDeleting(true);
    const res = await deleteInventoryItemAction(deleteConfirmItem._id);
    setIsDeleting(false);

    if (res.success) {
      toast.create({
        title: "Item Deleted",
        description: res.message,
        type: "success",
      });
      setDeleteConfirmItem(null);
      fetchData();
    } else {
      toast.create({
        title: "Delete Failed",
        description: res.error || "Failed to delete item",
        type: "error",
      });
    }
  };

  // Handle Open Record Usage
  const handleOpenRecordUsage = (preselectedItemId?: string) => {
    setUsageForm({
      itemId: preselectedItemId || (items.length > 0 ? items[0]._id : ""),
      quantityUsed: 1,
      purpose: "",
      date: new Date().toISOString().split("T")[0],
      note: "",
    });
    setUsageOpen(true);
  };

  // Handle Usage Submit
  const handleUsageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usageForm.itemId) {
      toast.create({
        title: "Item Required",
        description: "Please select an inventory item.",
        type: "error",
      });
      return;
    }
    if (!usageForm.purpose.trim()) {
      toast.create({
        title: "Purpose Required",
        description: "Please enter the usage purpose or department.",
        type: "error",
      });
      return;
    }

    setIsRecordingUsage(true);
    const res = await recordInventoryUsageAction({
      shopId,
      ...usageForm,
      quantityUsed: Number(usageForm.quantityUsed),
    });
    setIsRecordingUsage(false);

    if (res.success) {
      toast.create({
        title: "Usage Recorded",
        description: res.message,
        type: "success",
      });

      // Low Stock Alert Check!
      if (res.isLowStock || res.isOutOfStock) {
        setRecentLowStockAlert({
          itemName: res.itemName,
          itemCode: res.itemCode,
          remaining: res.remainingQuantity,
          unit: res.unit,
          threshold: res.minStockThreshold,
        });
        toast.create({
          title: "⚠️ Low Stock Alert",
          description: `Warning: "${res.itemName}" is running low on stock! Remaining: ${res.remainingQuantity} ${res.unit} (Threshold: ${res.minStockThreshold}).`,
          type: "error",
        });
      } else {
        setRecentLowStockAlert(null);
      }

      setUsageOpen(false);
      fetchData();
    } else {
      toast.create({
        title: "Usage Failed",
        description: res.error || "Failed to record usage.",
        type: "error",
      });
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (items.length === 0) {
      toast.create({ title: "No Data", description: "No inventory items to export." });
      return;
    }

    const headers = [
      "Item Code",
      "Item Name",
      "Category",
      "Stock Quantity",
      "Unit",
      "Unit Price (LKR)",
      "Total Value (LKR)",
      "Min Threshold",
      "Status",
      "Location",
      "Description",
    ];

    const rows = items.map((i) => [
      `"${i.itemCode || ""}"`,
      `"${(i.name || "").replace(/"/g, '""')}"`,
      `"${i.category || "General"}"`,
      i.quantity || 0,
      `"${i.unit || "pcs"}"`,
      (i.unitPrice || 0).toFixed(2),
      ((i.quantity || 0) * (i.unitPrice || 0)).toFixed(2),
      i.minStockThreshold || 0,
      i.isOutOfStock ? "OUT_OF_STOCK" : i.isLowStock ? "LOW_STOCK" : "IN_STOCK",
      `"${(i.location || "").replace(/"/g, '""')}"`,
      `"${(i.description || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Inventory_${shopCode}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const selectedUsageItem = items.find((i) => i._id === usageForm.itemId);

  return (
    <div className="space-y-6">
      {/* Low Stock Alert Notification Banner if any */}
      {recentLowStockAlert && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-destructive flex items-start justify-between gap-3 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertTriangleIcon className="size-5 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-sm">Low Stock Alert Triggered!</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Item <strong className="text-foreground">{recentLowStockAlert.itemName} ({recentLowStockAlert.itemCode})</strong> has fallen to{" "}
                <span className="font-mono font-bold text-destructive">{recentLowStockAlert.remaining} {recentLowStockAlert.unit}</span>.
                The minimum reorder threshold is <span className="font-mono">{recentLowStockAlert.threshold} {recentLowStockAlert.unit}</span>.
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRecentLowStockAlert(null)}
            className="h-7 text-xs text-muted-foreground hover:text-foreground"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Header and Quick Actions Bar */}
      <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <PackageIcon className="size-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground tracking-tight">
                {shopName} Inventory Management
              </h2>
              <Badge variant="outline" className="font-mono text-xs">
                {shopCode}
              </Badge>
              <Badge variant="secondary" className="font-mono text-xs">
                📦 INVENTORY ONLY
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Track stock levels, monitor low stock reorder alerts, and record consumables usage. (Cash ledger disabled for this branch).
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              onClick={() => setCreateOpen(true)}
              size="sm"
              className="gap-2 text-xs font-semibold shadow-xs"
            >
              <PlusCircleIcon className="size-4" />
              Add Inventory Item
            </Button>

            <Button
              onClick={() => handleOpenRecordUsage()}
              variant="outline"
              size="sm"
              disabled={items.length === 0}
              className="gap-2 text-xs font-semibold"
            >
              <MinusCircleIcon className="size-4 text-primary" />
              Record Usage
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                setRefreshing(true);
                fetchData();
              }}
              disabled={refreshing}
              title="Refresh Data"
              className="h-9 w-9"
            >
              <RefreshCwIcon className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="space-y-6">
        <TabsList className="bg-muted">
          <TabsTrigger value="dashboard" className="text-xs gap-1.5">
            <LayoutDashboardIcon className="size-3.5" />
            <span>Dashboard &amp; Stats</span>
          </TabsTrigger>
          <TabsTrigger value="items" className="text-xs gap-1.5">
            <PackageIcon className="size-3.5" />
            <span>Inventory Items ({items.length})</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs gap-1.5">
            <HistoryIcon className="size-3.5" />
            <span>Usage History ({usages.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* 1. DASHBOARD TAB CONTENT */}
        <TabsContent value="dashboard" className="space-y-6 mt-0">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border border-border/80 bg-card shadow-sm">
              <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
                  Total Items
                </CardTitle>
                <PackageIcon className="size-4 text-primary" />
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="text-2xl font-bold font-mono text-foreground">
                  {analytics.totalItems}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Across {analytics.categoryBreakdown.length} categories
                </p>
              </CardContent>
            </Card>

            <Card className="border border-border/80 bg-card shadow-sm">
              <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
                  Stock Units
                </CardTitle>
                <LayersIcon className="size-4 text-primary" />
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="text-2xl font-bold font-mono text-foreground">
                  {analytics.totalStockCount.toLocaleString()}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Cumulative quantity in branch
                </p>
              </CardContent>
            </Card>

            <Card className="border border-border/80 bg-card shadow-sm">
              <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
                  Low Stock Items
                </CardTitle>
                <AlertTriangleIcon className="size-4 text-amber-500" />
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="flex items-baseline gap-2">
                  <span className={`text-2xl font-bold font-mono ${analytics.lowStockCount + analytics.outOfStockCount > 0 ? "text-destructive" : "text-foreground"}`}>
                    {analytics.lowStockCount + analytics.outOfStockCount}
                  </span>
                  {analytics.outOfStockCount > 0 && (
                    <span className="text-xs text-destructive font-semibold">
                      ({analytics.outOfStockCount} out of stock)
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Below reorder safety threshold
                </p>
              </CardContent>
            </Card>

            <Card className="border border-border/80 bg-card shadow-sm">
              <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
                  Total Inventory Value
                </CardTitle>
                <DollarSignIcon className="size-4 text-primary" />
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="text-2xl font-bold font-mono text-foreground">
                  LKR {analytics.totalInventoryValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  At base unit cost price
                </p>
              </CardContent>
            </Card>
          </div>

          {/* LOW STOCK ITEMS ALERT LIST */}
          {analytics.lowStockItems.length > 0 && (
            <Card className="border border-destructive/30 bg-destructive/5 shadow-sm">
              <CardHeader className="pb-3 pt-4 px-4 border-b border-destructive/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangleIcon className="size-4 text-destructive" />
                    <CardTitle className="text-sm font-semibold text-destructive">
                      Reorder Required: Low Stock Items ({analytics.lowStockItems.length})
                    </CardTitle>
                  </div>
                  <Badge variant="destructive" className="text-xs">
                    Needs Attention
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {analytics.lowStockItems.map((item) => (
                    <div
                      key={item._id}
                      className="rounded-lg border border-border bg-card p-3 flex flex-col justify-between gap-2 shadow-xs"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="font-mono text-xs font-bold text-foreground">
                            {item.itemCode}
                          </span>
                          <h5 className="font-medium text-xs text-foreground truncate max-w-[180px]">
                            {item.name}
                          </h5>
                          <span className="text-[11px] text-muted-foreground">{item.category}</span>
                        </div>
                        <Badge variant={item.isOutOfStock ? "destructive" : "outline"} className="text-[10px]">
                          {item.isOutOfStock ? "OUT OF STOCK" : "LOW STOCK"}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs">
                        <div>
                          <span className="text-muted-foreground">Remaining: </span>
                          <span className="font-mono font-bold text-destructive">
                            {item.quantity} {item.unit}
                          </span>
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                          Min: {item.minStockThreshold} {item.unit}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* CHARTS & RECENT USAGE SECTION */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Breakdown Chart */}
            <Card className="border border-border/80 bg-card shadow-sm">
              <CardHeader className="pb-2 pt-4 px-4 border-b border-border/40">
                <CardTitle className="text-sm font-semibold">Stock Units by Category</CardTitle>
                <CardDescription className="text-xs">
                  Distribution of inventory volume across registered categories
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                {analytics.categoryBreakdown.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-xs text-muted-foreground">
                    No category data available
                  </div>
                ) : (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.categoryBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                        <XAxis dataKey="category" tick={{ fontSize: 11 }} interval={0} angle={-25} textAnchor="end" />
                        <YAxis tick={{ fontSize: 11 }} />
                        <RechartsTooltip
                          formatter={(value: any) => [`${Number(value).toLocaleString()} units`, "Stock Quantity"]}
                          contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", fontSize: "12px", borderRadius: "8px" }}
                        />
                        <Bar dataKey="itemCount" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Consumption Activity */}
            <Card className="border border-border/80 bg-card shadow-sm">
              <CardHeader className="pb-2 pt-4 px-4 border-b border-border/40">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold">Recent Consumables Usage</CardTitle>
                    <CardDescription className="text-xs">
                      Latest recorded inventory deductions and usage purposes
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveTab("history")}
                    className="text-xs text-primary hover:underline h-7"
                  >
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {analytics.recentUsages.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    No recorded usages yet. Click &quot;Record Usage&quot; to log consumption.
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {analytics.recentUsages.slice(0, 5).map((u) => (
                      <div key={u._id} className="p-3.5 flex items-center justify-between text-xs">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-semibold text-foreground">
                              {u.item?.itemCode}
                            </span>
                            <span className="font-medium text-foreground">{u.item?.name}</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            Purpose: <strong className="text-foreground">{u.purpose}</strong>
                            {u.recordedBy?.name && ` • By ${u.recordedBy.name}`}
                          </p>
                        </div>

                        <div className="text-right">
                          <span className="font-mono font-bold text-destructive">
                            -{u.quantityUsed} {u.item?.unit}
                          </span>
                          <span className="block text-[10px] text-muted-foreground">
                            {new Date(u.date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 2. INVENTORY ITEMS TAB CONTENT */}
        <TabsContent value="items" className="space-y-4 mt-0">
          {/* Filters Bar */}
          <Card className="border border-border/80 bg-card shadow-sm">
            <CardContent className="p-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div className="relative">
                  <SearchIcon className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search name, code, description..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-8 text-xs pl-8 font-medium"
                  />
                </div>

                <Select value={categoryFilter} onValueChange={(val) => setCategoryFilter(val || "ALL")}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Categories</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || "ALL")}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="All Stock Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    <SelectItem value="IN_STOCK">In Stock Only</SelectItem>
                    <SelectItem value="LOW_STOCK">Low Stock Alert Only</SelectItem>
                    <SelectItem value="OUT_OF_STOCK">Out of Stock Only</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportCSV}
                    className="h-8 text-xs font-semibold gap-1.5"
                  >
                    <DownloadIcon className="size-3.5" />
                    <span>Export CSV</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Items Table */}
          <Card className="border border-border/80 bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="text-xs font-semibold">Code / SKU</TableHead>
                    <TableHead className="text-xs font-semibold">Item Name</TableHead>
                    <TableHead className="text-xs font-semibold">Category</TableHead>
                    <TableHead className="text-xs font-semibold">Current Stock</TableHead>
                    <TableHead className="text-xs font-semibold">Status</TableHead>
                    <TableHead className="text-xs font-semibold">Unit Price</TableHead>
                    <TableHead className="text-xs font-semibold">Total Value</TableHead>
                    <TableHead className="text-xs font-semibold">Min Threshold</TableHead>
                    <TableHead className="text-xs font-semibold">Location</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={10} className="h-32 text-center text-xs text-muted-foreground">
                        <Loader2Icon className="size-4 animate-spin inline mr-2" />
                        Loading inventory records...
                      </TableCell>
                    </TableRow>
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="h-32 text-center text-xs text-muted-foreground">
                        No inventory items found. Click &quot;Add Inventory Item&quot; to register your first item.
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item) => (
                      <TableRow key={item._id} className="hover:bg-muted/40">
                        <TableCell className="font-mono text-xs font-bold text-foreground">
                          {item.itemCode}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-xs text-foreground">{item.name}</span>
                            {item.description && (
                              <span className="text-[11px] text-muted-foreground truncate max-w-xs">
                                {item.description}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] font-normal">
                            {item.category || "General"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs font-bold">
                          <span className={item.isOutOfStock ? "text-destructive" : item.isLowStock ? "text-amber-500" : "text-foreground"}>
                            {item.quantity} {item.unit}
                          </span>
                        </TableCell>
                        <TableCell>
                          {item.isOutOfStock ? (
                            <Badge variant="destructive" className="text-[10px]">
                              Out of Stock
                            </Badge>
                          ) : item.isLowStock ? (
                            <Badge variant="secondary" className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20">
                              Low Stock
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                              In Stock
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          LKR {Number(item.unitPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="font-mono text-xs font-semibold">
                          LKR {Number(item.totalValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {item.minStockThreshold} {item.unit}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {item.location ? (
                            <span className="inline-flex items-center gap-1">
                              <MapPinIcon className="size-3" />
                              {item.location}
                            </span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenRecordUsage(item._id)}
                              title="Record Usage"
                              className="h-7 px-2 text-xs font-semibold text-primary hover:text-primary hover:bg-primary/10 gap-1"
                            >
                              <MinusCircleIcon className="size-3.5" />
                              <span>Use</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEdit(item)}
                              title="Edit Item"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            >
                              <EditIcon className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteConfirmItem(item)}
                              title="Delete Item"
                              className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2Icon className="size-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* 3. USAGE HISTORY TAB CONTENT */}
        <TabsContent value="history" className="space-y-4 mt-0">
          <Card className="border border-border/80 bg-card shadow-sm overflow-hidden">
            <CardHeader className="pb-3 pt-4 px-4 border-b border-border/40">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold">Usage &amp; Consumption Log</CardTitle>
                  <CardDescription className="text-xs">
                    Audit trail of all materials, components, and items issued or consumed
                  </CardDescription>
                </div>
                <Button
                  onClick={() => handleOpenRecordUsage()}
                  size="sm"
                  className="gap-1.5 text-xs font-semibold"
                >
                  <MinusCircleIcon className="size-3.5" />
                  Record Usage
                </Button>
              </div>
            </CardHeader>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="text-xs font-semibold">Date</TableHead>
                    <TableHead className="text-xs font-semibold">Item Code</TableHead>
                    <TableHead className="text-xs font-semibold">Item Name</TableHead>
                    <TableHead className="text-xs font-semibold">Qty Deducted</TableHead>
                    <TableHead className="text-xs font-semibold">Remaining Stock</TableHead>
                    <TableHead className="text-xs font-semibold">Purpose / Department</TableHead>
                    <TableHead className="text-xs font-semibold">Issued By</TableHead>
                    <TableHead className="text-xs font-semibold">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usages.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-32 text-center text-xs text-muted-foreground">
                        No usage entries recorded yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    usages.map((u) => (
                      <TableRow key={u._id} className="hover:bg-muted/40 text-xs">
                        <TableCell className="font-mono text-muted-foreground">
                          {new Date(u.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="font-mono font-bold text-foreground">
                          {u.item?.itemCode}
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          {u.item?.name}
                        </TableCell>
                        <TableCell className="font-mono font-bold text-destructive">
                          -{u.quantityUsed} {u.item?.unit}
                        </TableCell>
                        <TableCell className="font-mono text-foreground">
                          {u.remainingQuantity} {u.item?.unit}
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          {u.purpose}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {u.recordedBy?.name || "System"}
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-xs truncate">
                          {u.note || "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* CREATE ITEM MODAL */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PackageIcon className="size-4 text-primary" />
              <span>Register New Inventory Item</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Add a new component, consumable, or item to branch stock.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground uppercase">Item Name *</label>
                <Input
                  placeholder="e.g. Arduino Uno R3, Copper Wire"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground uppercase">Item Code / SKU *</label>
                <Input
                  placeholder="e.g. ARD-001, WIRE-CU"
                  value={createForm.itemCode}
                  onChange={(e) => setCreateForm({ ...createForm, itemCode: e.target.value })}
                  className="h-9 text-xs font-mono uppercase"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground uppercase">Category</label>
                <Input
                  placeholder="e.g. Electronics, Stationary, Tools"
                  value={createForm.category}
                  onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground uppercase">Unit of Measure</label>
                <Input
                  placeholder="e.g. pcs, box, kg, pack"
                  value={createForm.unit}
                  onChange={(e) => setCreateForm({ ...createForm, unit: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground uppercase">Initial Stock</label>
                <Input
                  type="number"
                  min="0"
                  value={createForm.quantity}
                  onChange={(e) => setCreateForm({ ...createForm, quantity: Number(e.target.value) })}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground uppercase">Unit Cost (LKR)</label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={createForm.unitPrice}
                  onChange={(e) => setCreateForm({ ...createForm, unitPrice: Number(e.target.value) })}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground uppercase">Min Alert Level</label>
                <Input
                  type="number"
                  min="0"
                  value={createForm.minStockThreshold}
                  onChange={(e) => setCreateForm({ ...createForm, minStockThreshold: Number(e.target.value) })}
                  className="h-9 text-xs font-mono"
                  title="Alert is triggered when stock drops below this number"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground uppercase">Shelf / Rack Location</label>
              <Input
                placeholder="e.g. Shelf A-3, Cabinet 2, Bin 12"
                value={createForm.location}
                onChange={(e) => setCreateForm({ ...createForm, location: e.target.value })}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground uppercase">Description / Specifications</label>
              <Textarea
                placeholder="Product details, voltage, tolerance, supplier..."
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                className="text-xs"
                rows={2}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isCreating} className="font-semibold">
                {isCreating ? <Loader2Icon className="size-3.5 animate-spin mr-1" /> : null}
                Save Item
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT ITEM MODAL */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <EditIcon className="size-4 text-primary" />
              <span>Edit Inventory Item</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Update item specifications, stock quantity, or low stock threshold.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground uppercase">Item Name *</label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground uppercase">Item Code / SKU *</label>
                <Input
                  value={editForm.itemCode}
                  onChange={(e) => setEditForm({ ...editForm, itemCode: e.target.value })}
                  className="h-9 text-xs font-mono uppercase"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground uppercase">Category</label>
                <Input
                  value={editForm.category}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground uppercase">Unit of Measure</label>
                <Input
                  value={editForm.unit}
                  onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground uppercase">Current Stock</label>
                <Input
                  type="number"
                  min="0"
                  value={editForm.quantity}
                  onChange={(e) => setEditForm({ ...editForm, quantity: Number(e.target.value) })}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground uppercase">Unit Cost (LKR)</label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={editForm.unitPrice}
                  onChange={(e) => setEditForm({ ...editForm, unitPrice: Number(e.target.value) })}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground uppercase">Min Alert Level</label>
                <Input
                  type="number"
                  min="0"
                  value={editForm.minStockThreshold}
                  onChange={(e) => setEditForm({ ...editForm, minStockThreshold: Number(e.target.value) })}
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground uppercase">Shelf / Rack Location</label>
              <Input
                value={editForm.location}
                onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground uppercase">Description</label>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                className="text-xs"
                rows={2}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isUpdating} className="font-semibold">
                {isUpdating ? <Loader2Icon className="size-3.5 animate-spin mr-1" /> : null}
                Update Item
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* RECORD USAGE MODAL */}
      <Dialog open={usageOpen} onOpenChange={setUsageOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MinusCircleIcon className="size-5 text-primary" />
              <span>Record Inventory Usage</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Deduct consumed parts, materials, or supplies from available branch inventory.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUsageSubmit} className="space-y-4 py-2">
            {/* Item selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground uppercase">Select Item *</label>
              <Select
                value={usageForm.itemId}
                onValueChange={(val) => setUsageForm({ ...usageForm, itemId: val || "" })}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Choose an item..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {items.map((i) => (
                    <SelectItem key={i._id} value={i._id} className="text-xs">
                      {i.itemCode} - {i.name} (Stock: {i.quantity} {i.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Selected item stock status card */}
            {selectedUsageItem && (
              <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-1 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Available Stock:</span>
                  <span className="font-mono font-bold text-foreground">
                    {selectedUsageItem.quantity} {selectedUsageItem.unit}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Reorder Threshold:</span>
                  <span className="font-mono text-muted-foreground">
                    {selectedUsageItem.minStockThreshold} {selectedUsageItem.unit}
                  </span>
                </div>
                {selectedUsageItem.quantity <= selectedUsageItem.minStockThreshold && (
                  <div className="text-[11px] text-destructive font-medium pt-1 border-t border-border flex items-center gap-1">
                    <AlertTriangleIcon className="size-3.5" />
                    <span>This item is currently at or below minimum threshold!</span>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground uppercase">Quantity Used *</label>
                <Input
                  type="number"
                  min="1"
                  max={selectedUsageItem ? selectedUsageItem.quantity : undefined}
                  value={usageForm.quantityUsed}
                  onChange={(e) => setUsageForm({ ...usageForm, quantityUsed: Number(e.target.value) })}
                  className="h-9 text-xs font-mono font-bold"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground uppercase">Date *</label>
                <Input
                  type="date"
                  value={usageForm.date}
                  onChange={(e) => setUsageForm({ ...usageForm, date: e.target.value })}
                  className="h-9 text-xs"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground uppercase">
                Purpose / Department / Recipient *
              </label>
              <Input
                placeholder="e.g. Lab Project #4, Student Demo, Maintenance"
                value={usageForm.purpose}
                onChange={(e) => setUsageForm({ ...usageForm, purpose: e.target.value })}
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground uppercase">Additional Note</label>
              <Textarea
                placeholder="Optional notes or authorization details..."
                value={usageForm.note}
                onChange={(e) => setUsageForm({ ...usageForm, note: e.target.value })}
                className="text-xs"
                rows={2}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setUsageOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isRecordingUsage || !selectedUsageItem || selectedUsageItem.quantity <= 0}
                className="font-semibold"
              >
                {isRecordingUsage ? <Loader2Icon className="size-3.5 animate-spin mr-1" /> : null}
                Confirm Usage &amp; Deduct Stock
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <AlertDialog
        open={!!deleteConfirmItem}
        onOpenChange={(open) => !open && setDeleteConfirmItem(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2Icon className="size-5" />
              <span>Delete Inventory Item?</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Are you sure you want to remove{" "}
              <span className="font-semibold text-foreground">
                {deleteConfirmItem?.name} ({deleteConfirmItem?.itemCode})
              </span>{" "}
              from branch inventory? This item will no longer appear in the active inventory catalog. Past usage records will remain intact for audit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSubmit}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs font-semibold"
            >
              {isDeleting ? <Loader2Icon className="size-3.5 animate-spin mr-1" /> : null}
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
