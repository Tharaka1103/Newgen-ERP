"use client";

import * as React from "react";
import {
  getCategoriesAction,
  createCategoryAction,
  updateCategoryAction,
  toggleCategoryActiveAction,
} from "@/actions/categories";
import { getSummaryAnalyticsAction } from "@/actions/reports";
import { DataTable } from "@/components/shared/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createCategorySchema,
  updateCategorySchema,
  CreateCategoryInput,
  UpdateCategoryInput,
} from "@/schemas/category";
import { CategoryBadge, ColorSwatchSelector } from "@/components/shared/category-badge";
import {
  PlusIcon,
  EditIcon,
  TagIcon,
  PowerIcon,
  ReceiptIcon,
  Loader2Icon,
  RefreshCwIcon,
  LayersIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  ClockIcon,
  CheckCircle2Icon,
  FilterIcon,
} from "lucide-react";
import { toast } from "@/components/ui/toast";

interface CategoryItem {
  _id: string;
  name: string;
  description?: string;
  type: "EXPENSE" | "INCOME";
  colorToken: "chart-1" | "chart-2" | "chart-3" | "chart-4" | "chart-5";
  isActive: boolean;
  recordsCount?: number;
}

export function CategoriesView({
  initialCategories,
}: {
  initialCategories: CategoryItem[];
}) {
  const [categories, setCategories] = React.useState<CategoryItem[]>(initialCategories);
  const [loading, setLoading] = React.useState(false);

  // Period and Category Filter (Defaults: "today", "ALL")
  const [period, setPeriod] = React.useState<"today" | "week" | "month" | "year" | "custom">("today");
  const [selectedCategoryId, setSelectedCategoryId] = React.useState<string>("ALL");
  const [startDate, setStartDate] = React.useState<string>("");
  const [endDate, setEndDate] = React.useState<string>("");

  const [statsLoading, setStatsLoading] = React.useState(false);
  const [statsData, setStatsData] = React.useState<{
    kpis: {
      totalTransactions: number;
      totalExpense: number;
      totalIncome: number;
      pendingApprovals: number;
      approvedAmount: number;
      rejectedAmount: number;
      netBalance: number;
    };
    categoryBreakdownData: Array<{ category: string; colorToken: string; total: number; type: string; count: number }>;
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
    categoryBreakdownData: [],
  });

  const fetchCategoryStats = React.useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await getSummaryAnalyticsAction({
        period,
        startDate: period === "custom" ? startDate : undefined,
        endDate: period === "custom" ? endDate : undefined,
        categoryId: selectedCategoryId,
      });

      if (res.success && res.kpis) {
        setStatsData({
          kpis: res.kpis,
          categoryBreakdownData: (res.categoryBreakdownData as any) || [],
        });
      }
    } catch (err) {
      console.error("Failed to load category stats:", err);
    } finally {
      setStatsLoading(false);
    }
  }, [period, startDate, endDate, selectedCategoryId]);

  React.useEffect(() => {
    fetchCategoryStats();
  }, [fetchCategoryStats]);

  const selectedCategoryObj = React.useMemo(() => {
    if (selectedCategoryId === "ALL") return null;
    return categories.find((c) => c._id === selectedCategoryId) || null;
  }, [categories, selectedCategoryId]);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [confirmToggleCat, setConfirmToggleCat] = React.useState<CategoryItem | null>(null);
  const [selectedCat, setSelectedCat] = React.useState<CategoryItem | null>(null);

  const createForm = useForm<CreateCategoryInput>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: {
      name: "",
      description: "",
      type: "EXPENSE",
      colorToken: "chart-1",
    },
  });

  const editForm = useForm<UpdateCategoryInput>({
    resolver: zodResolver(updateCategorySchema),
    defaultValues: {
      name: "",
      description: "",
      type: "EXPENSE",
      colorToken: "chart-1",
      isActive: true,
    },
  });

  const refreshCategories = async () => {
    setLoading(true);
    const res = await getCategoriesAction();
    if (res.success && res.categories) {
      setCategories(res.categories);
    }
    setLoading(false);
  };

  const onCreateSubmit = async (data: CreateCategoryInput) => {
    const res = await createCategoryAction(data);
    if (res.success) {
      toast.create({
        title: "Category created",
        description: "New financial category registered.",
        type: "success",
      });
      setCreateOpen(false);
      createForm.reset();
      refreshCategories();
    } else {
      toast.create({
        title: "Failed to create",
        description: res.error || "An error occurred",
        type: "error",
      });
    }
  };

  const onEditSubmit = async (data: UpdateCategoryInput) => {
    if (!selectedCat) return;
    const res = await updateCategoryAction(selectedCat._id, data);
    if (res.success) {
      toast.create({
        title: "Category updated",
        description: "Category attributes modified.",
        type: "success",
      });
      setEditOpen(false);
      refreshCategories();
    } else {
      toast.create({
        title: "Failed to update",
        description: res.error || "An error occurred",
        type: "error",
      });
    }
  };

  const openEditModal = (cat: CategoryItem) => {
    setSelectedCat(cat);
    editForm.reset({
      name: cat.name,
      description: cat.description || "",
      type: cat.type,
      colorToken: cat.colorToken,
      isActive: cat.isActive,
    });
    setEditOpen(true);
  };

  const handleToggleActive = async () => {
    if (!confirmToggleCat) return;
    const res = await toggleCategoryActiveAction(confirmToggleCat._id);
    if (res.success) {
      toast.create({
        title: res.isActive ? "Category activated" : "Category deactivated",
        description: `Category is now ${res.isActive ? "available" : "disabled"} for new entries.`,
        type: "success",
      });
      setConfirmToggleCat(null);
      refreshCategories();
    } else {
      toast.create({
        title: "Action failed",
        description: res.error || "Failed to toggle status",
        type: "error",
      });
    }
  };

  const columns: ColumnDef<CategoryItem>[] = [
    {
      accessorKey: "name",
      header: "Category & Visual Token",
      cell: ({ row }) => (
        <div className="flex items-center gap-2 max-w-[200px] min-w-0">
          <CategoryBadge
            name={row.original.name}
            colorToken={row.original.colorToken}
          />
        </div>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => {
        const isIncome = row.original.type === "INCOME";
        return (
          <Badge
            variant={isIncome ? "outline" : "secondary"}
            className={`text-[10px] font-mono uppercase ${
              isIncome ? "border-chart-2/40 bg-chart-2/15 text-foreground" : ""
            }`}
          >
            {row.original.type}
          </Badge>
        );
      },
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground truncate max-w-xs block">
          {row.original.description || "—"}
        </span>
      ),
    },
    {
      accessorKey: "recordsCount",
      header: "Associated Records",
      cell: ({ row }) => (
        <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
          <ReceiptIcon className="size-3" />
          {row.original.recordsCount || 0}
        </span>
      ),
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          variant={row.original.isActive ? "outline" : "destructive"}
          className={`text-[10px] ${row.original.isActive ? "border-chart-2/40 bg-chart-2/15 text-foreground" : ""}`}
        >
          {row.original.isActive ? "Active" : "Disabled"}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const cat = row.original;
        return (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => openEditModal(cat)}
              title="Edit Category"
            >
              <EditIcon className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setConfirmToggleCat(cat)}
              title={cat.isActive ? "Deactivate Category" : "Activate Category"}
              className={cat.isActive ? "text-destructive hover:text-destructive" : "text-chart-2 hover:text-chart-2"}
            >
              <PowerIcon className="size-3.5" />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Transaction Categories</h2>
          <p className="text-xs text-muted-foreground">
            Classify cash flows into income or expense buckets with theme-safe color tokens
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} size="sm" className="gap-1.5 text-xs">
          <PlusIcon className="size-3.5" />
          Create Category
        </Button>
      </div>

      {/* FILTER & PERIOD / CATEGORY CONTROLS */}
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <Tabs
            value={period}
            onValueChange={(val: any) => setPeriod(val)}
            className="w-auto"
          >
            <TabsList className="bg-muted">
              <TabsTrigger value="today" className="text-xs">
                Day (Today)
              </TabsTrigger>
              <TabsTrigger value="week" className="text-xs">
                Week
              </TabsTrigger>
              <TabsTrigger value="month" className="text-xs">
                Month
              </TabsTrigger>
              <TabsTrigger value="year" className="text-xs">
                Year
              </TabsTrigger>
              <TabsTrigger value="custom" className="text-xs">
                Custom Range
              </TabsTrigger>
            </TabsList>
          </Tabs>

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

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
              Category:
            </span>
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="h-9 min-w-[210px] rounded-md border border-border bg-card text-foreground px-3 text-xs font-medium outline-none focus:border-ring [color-scheme:light] dark:[color-scheme:dark]"
            >
              <option value="ALL" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100 font-semibold">
                All Categories (Default)
              </option>
              <optgroup label="Expense Categories">
                {categories
                  .filter((c) => c.type === "EXPENSE")
                  .map((cat) => (
                    <option
                      key={cat._id}
                      value={cat._id}
                      className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100"
                    >
                      {cat.name}
                    </option>
                  ))}
              </optgroup>
              <optgroup label="Income Categories">
                {categories
                  .filter((c) => c.type === "INCOME")
                  .map((cat) => (
                    <option
                      key={cat._id}
                      value={cat._id}
                      className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100"
                    >
                      {cat.name}
                    </option>
                  ))}
              </optgroup>
            </select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchCategoryStats}
            disabled={statsLoading}
            className="gap-1.5 text-xs h-9 shrink-0"
            title="Refresh statistics"
          >
            <RefreshCwIcon className={`size-3.5 ${statsLoading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* STATS KPI CARDS */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        <Card className="border-border bg-card shadow-sm p-3.5 col-span-1 min-w-0 overflow-hidden">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate" title="Total Transactions">
            Transactions
          </div>
          <div className="text-xl font-bold mt-1 text-foreground truncate font-mono">
            {statsData.kpis.totalTransactions}
          </div>
          <div className="text-[10px] text-muted-foreground truncate">
            {period === "today" ? "Recorded today" : "In selected period"}
          </div>
        </Card>

        <Card className="border-border bg-card shadow-sm p-3.5 col-span-1 min-w-0 overflow-hidden">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate" title="Total Expenses">
            Total Expense
          </div>
          <div className="text-xl font-bold mt-1 text-foreground truncate font-mono">
            LKR {statsData.kpis.totalExpense.toLocaleString()}
          </div>
          <div className="text-[10px] text-muted-foreground truncate">
            Operational spending
          </div>
        </Card>

        <Card className="border-border bg-card shadow-sm p-3.5 col-span-1 min-w-0 overflow-hidden">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate" title="Total Income">
            Total Income
          </div>
          <div className="text-xl font-bold mt-1 text-chart-2 truncate font-mono">
            LKR {statsData.kpis.totalIncome.toLocaleString()}
          </div>
          <div className="text-[10px] text-muted-foreground truncate">
            Fee collections & deposits
          </div>
        </Card>

        <Card className="border-border bg-card shadow-sm p-3.5 col-span-1 min-w-0 overflow-hidden">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate" title="Net Flow">
            {selectedCategoryObj ? "Category Flow" : "Net Flow"}
          </div>
          <div
            className={`text-xl font-bold mt-1 truncate font-mono ${statsData.kpis.netBalance >= 0 ? "text-chart-2" : "text-destructive"}`}
          >
            LKR {statsData.kpis.netBalance.toLocaleString()}
          </div>
          <div className="text-[10px] text-muted-foreground truncate">
            Inflow minus Outflow
          </div>
        </Card>

        <Card className="border-border bg-card shadow-sm p-3.5 col-span-1 min-w-0 overflow-hidden">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate" title="Pending Approvals">
            Pending
          </div>
          <div className="text-xl font-bold mt-1 text-warning truncate font-mono">
            {statsData.kpis.pendingApprovals}
          </div>
          <div className="text-[10px] text-muted-foreground truncate">
            Awaiting verifier review
          </div>
        </Card>

        <Card className="border-border bg-card shadow-sm p-3.5 col-span-1 min-w-0 overflow-hidden">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate" title="Approved Capital">
            Approved Value
          </div>
          <div className="text-xl font-bold mt-1 text-chart-2 truncate font-mono">
            LKR {statsData.kpis.approvedAmount.toLocaleString()}
          </div>
          <div className="text-[10px] text-muted-foreground truncate">
            Finalized capital
          </div>
        </Card>

        <Card className="border-border bg-card shadow-sm p-3.5 col-span-1 min-w-0 overflow-hidden">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate" title={selectedCategoryObj ? "Average Value" : "Top Category"}>
            {selectedCategoryObj ? "Avg / Entry" : "Top Category"}
          </div>
          <div className="text-xl font-bold mt-1 text-foreground truncate font-mono">
            {selectedCategoryObj
              ? `LKR ${statsData.kpis.totalTransactions > 0 ? Math.round((statsData.kpis.totalExpense + statsData.kpis.totalIncome) / statsData.kpis.totalTransactions).toLocaleString() : "0"}`
              : (statsData.categoryBreakdownData[0]?.category || "—")}
          </div>
          <div className="text-[10px] text-muted-foreground truncate">
            {selectedCategoryObj
              ? "Per transaction average"
              : (statsData.categoryBreakdownData[0]
                ? `LKR ${statsData.categoryBreakdownData[0].total.toLocaleString()}`
                : "No entries")}
          </div>
        </Card>
      </div>

      {/* ACTIVE CATEGORY OR DISTRIBUTION PREVIEW */}
      {selectedCategoryObj ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/20 px-4 py-3 text-xs">
          <div className="flex items-center gap-3 min-w-0">
            <CategoryBadge name={selectedCategoryObj.name} colorToken={selectedCategoryObj.colorToken} />
            <span className="text-muted-foreground truncate">
              {selectedCategoryObj.description || "Filtered view for " + selectedCategoryObj.name}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={selectedCategoryObj.type === "INCOME" ? "outline" : "secondary"} className="text-[10px] font-mono">
              {selectedCategoryObj.type}
            </Badge>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => setSelectedCategoryId("ALL")}
              className="text-[11px] text-muted-foreground hover:text-foreground h-6 px-2"
            >
              Clear Filter (Show All)
            </Button>
          </div>
        </div>
      ) : (
        statsData.categoryBreakdownData.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <LayersIcon className="size-4 text-primary" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                  Active Category Distribution ({period === "today" ? "Today" : period.toUpperCase()})
                </h3>
              </div>
              <span className="text-[11px] text-muted-foreground">
                {statsData.categoryBreakdownData.length} active categor{statsData.categoryBreakdownData.length !== 1 ? "ies" : "y"} in period
              </span>
            </div>
            <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              {statsData.categoryBreakdownData.slice(0, 4).map((item) => (
                <div
                  key={item.category}
                  onClick={() => {
                    const found = categories.find((c) => c.name === item.category);
                    if (found) setSelectedCategoryId(found._id);
                  }}
                  className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/20 p-2.5 cursor-pointer hover:bg-muted/40 transition-colors"
                  title="Click to filter stats by this category"
                >
                  <div className="min-w-0 pr-2">
                    <CategoryBadge name={item.category} colorToken={item.colorToken as any} />
                    <span className="text-[10px] text-muted-foreground block mt-1 font-mono">
                      {item.count || 0} transaction{(item.count || 0) !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-xs font-mono font-bold ${item.type === "INCOME" ? "text-chart-2" : "text-foreground"}`}>
                      LKR {Number(item.total).toLocaleString()}
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {item.type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      )}

      <DataTable
        columns={columns}
        data={categories}
        searchKey="name"
        searchPlaceholder="Filter categories..."
        loading={loading}
      />

      {/* CREATE CATEGORY MODAL */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Financial Category</DialogTitle>
            <DialogDescription>Define a new classification bucket for expenses or income</DialogDescription>
          </DialogHeader>

          <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Category Name</label>
              <Input placeholder="e.g. Utility Bills" {...createForm.register("name")} className="h-9 text-xs" />
              {createForm.formState.errors.name && (
                <p className="text-xs text-destructive">{createForm.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Flow Type</label>
              <select
                {...createForm.register("type")}
                className="w-full h-9 rounded-md border border-border bg-card text-foreground px-3 text-xs font-medium outline-none focus:border-ring [color-scheme:light] dark:[color-scheme:dark]"
              >
                <option value="EXPENSE" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Expense (Cash Outflow)</option>
                <option value="INCOME" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Income / Deposit (Cash Inflow)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Theme Color Token (chart-1 to chart-5)
              </label>
              <ColorSwatchSelector
                value={createForm.watch("colorToken")}
                onChange={(token) => createForm.setValue("colorToken", token as any)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Description</label>
              <Textarea
                placeholder="Brief notes about which receipts belong here..."
                {...createForm.register("description")}
                className="text-xs"
                rows={3}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={createForm.formState.isSubmitting}>
                {createForm.formState.isSubmitting ? <Loader2Icon className="size-3.5 animate-spin mr-1" /> : null}
                Save Category
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT CATEGORY MODAL */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>Modify category name, description, or color</DialogDescription>
          </DialogHeader>

          <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Category Name</label>
              <Input placeholder="Category Name" {...editForm.register("name")} className="h-9 text-xs" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Flow Type</label>
              <select
                {...editForm.register("type")}
                className="w-full h-9 rounded-md border border-border bg-card text-foreground px-3 text-xs font-medium outline-none focus:border-ring [color-scheme:light] dark:[color-scheme:dark]"
              >
                <option value="EXPENSE" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Expense</option>
                <option value="INCOME" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Income</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Theme Color Swatch</label>
              <ColorSwatchSelector
                value={editForm.watch("colorToken")}
                onChange={(token) => editForm.setValue("colorToken", token as any)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Description</label>
              <Textarea {...editForm.register("description")} className="text-xs" rows={3} />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={editForm.formState.isSubmitting}>
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DEACTIVATE CONFIRMATION ALERT */}
      <AlertDialog open={!!confirmToggleCat} onOpenChange={(open) => !open && setConfirmToggleCat(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmToggleCat?.isActive ? "Deactivate Category?" : "Activate Category?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmToggleCat?.isActive
                ? `Deactivating "${confirmToggleCat.name}" ensures that no new records can select this category, preserving all ${confirmToggleCat.recordsCount || 0} historical records intact.`
                : `Activating "${confirmToggleCat?.name}" will re-enable it for finance officers when logging new records.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleActive}
              className={confirmToggleCat?.isActive ? "bg-destructive text-destructive-foreground hover:bg-destructive/80" : ""}
            >
              {confirmToggleCat?.isActive ? "Deactivate Category" : "Activate Category"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
