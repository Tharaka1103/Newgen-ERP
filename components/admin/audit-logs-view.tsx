"use client";

import * as React from "react";
import { getAuditLogsAction } from "@/actions/audit";
import { DataTable } from "@/components/shared/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  HistoryIcon,
  FilterIcon,
  RefreshCwIcon,
  DownloadIcon,
  RotateCcwIcon,
  SearchIcon,
  EyeIcon,
  ShieldCheckIcon,
  ShieldAlertIcon,
  GlobeIcon,
  UserIcon,
  ArrowRightIcon,
  ClockIcon,
} from "lucide-react";
import { toast } from "@/components/ui/toast";

interface AuditLogsViewProps {
  initialLogs: any[];
  initialTotal: number;
  initialPage: number;
  initialTotalPages: number;
}

export function AuditLogsView({
  initialLogs,
  initialTotal,
  initialPage,
  initialTotalPages,
}: AuditLogsViewProps) {
  const [logs, setLogs] = React.useState<any[]>(initialLogs);
  const [total, setTotal] = React.useState<number>(initialTotal);
  const [page, setPage] = React.useState<number>(initialPage);
  const [totalPages, setTotalPages] = React.useState<number>(initialTotalPages);
  const [loading, setLoading] = React.useState(false);

  // Filters
  const [actionFilter, setActionFilter] = React.useState("ALL");
  const [targetTypeFilter, setTargetTypeFilter] = React.useState("ALL");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [search, setSearch] = React.useState("");

  // Inspect Modal
  const [inspectLog, setInspectLog] = React.useState<any | null>(null);

  const fetchLogs = async (targetPage = page) => {
    setLoading(true);
    const res = await getAuditLogsAction({
      action: actionFilter !== "ALL" ? actionFilter : undefined,
      targetType: targetTypeFilter !== "ALL" ? targetTypeFilter : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      search: search.trim() || undefined,
      page: targetPage,
      limit: 25,
    });

    if (res.success && res.logs) {
      setLogs(res.logs);
      setTotal(res.total || 0);
      setPage(res.page || 1);
      setTotalPages(res.totalPages || 1);
    } else {
      toast.create({
        title: "Failed to load audit logs",
        description: res.error || "An error occurred while fetching logs",
        type: "error",
      });
    }
    setLoading(false);
  };

  const handleApplyFilters = () => {
    fetchLogs(1);
  };

  const handleResetFilters = () => {
    setActionFilter("ALL");
    setTargetTypeFilter("ALL");
    setStartDate("");
    setEndDate("");
    setSearch("");
    setTimeout(() => {
      fetchLogs(1);
    }, 50);
  };

  const handleExportCSV = () => {
    if (logs.length === 0) {
      toast.create({
        title: "No logs to export",
        description: "No audit records match the current filter selection.",
        type: "warning",
      });
      return;
    }

    const headers = [
      "Timestamp",
      "Actor Name",
      "Actor Email",
      "Actor Role",
      "Action",
      "Target Type",
      "Target ID",
      "Bill Number",
      "Reason / Note",
      "IP Address",
    ];

    const rows = logs.map((l) => [
      new Date(l.createdAt).toLocaleString(),
      l.actorName || l.actor?.name || "System",
      l.actorEmail || l.actor?.email || "",
      l.actorRole || l.actor?.role || "",
      l.action || "",
      l.targetType || "",
      l.targetId ? String(l.targetId) : "",
      l.metadata?.billNumber || "",
      l.metadata?.editReason || l.metadata?.deletionReason || l.metadata?.remarks || "",
      l.ipAddress || "",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [
        headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(","),
        ...rows.map((row) =>
          row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(",")
        ),
      ].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `audit-trail-report-${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.create({
      title: "Audit CSV Exported",
      description: `Exported ${logs.length} audit records successfully.`,
      type: "success",
    });
  };

  const renderActionBadge = (action: string) => {
    if (action.includes("DELETE")) {
      return (
        <Badge variant="destructive" className="text-[10px] font-mono uppercase">
          {action.replace(/_/g, " ")}
        </Badge>
      );
    }
    if (action.includes("EDIT") || action.includes("UPDATE")) {
      return (
        <Badge variant="outline" className="text-[10px] font-mono uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
          {action.replace(/_/g, " ")}
        </Badge>
      );
    }
    if (action.includes("REVIEW") || action.includes("APPROVE")) {
      return (
        <Badge variant="outline" className="text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
          {action.replace(/_/g, " ")}
        </Badge>
      );
    }
    if (action.includes("TOPUP") || action.includes("DEPOSIT")) {
      return (
        <Badge variant="outline" className="text-[10px] font-mono uppercase bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
          {action.replace(/_/g, " ")}
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="text-[10px] font-mono uppercase">
        {action.replace(/_/g, " ")}
      </Badge>
    );
  };

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "createdAt",
      header: "Timestamp",
      cell: ({ row }) => (
        <div className="flex flex-col font-mono text-[11px]">
          <span className="font-semibold text-foreground">
            {new Date(row.original.createdAt).toLocaleDateString()}
          </span>
          <span className="text-muted-foreground text-[10px]">
            {new Date(row.original.createdAt).toLocaleTimeString()}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "actorName",
      header: "Actor / User",
      cell: ({ row }) => {
        const l = row.original;
        const name = l.actorName || l.actor?.name || "System";
        const email = l.actorEmail || l.actor?.email || "";
        const role = l.actorRole || l.actor?.role || "USER";

        return (
          <div className="flex flex-col max-w-[170px]">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-foreground truncate">{name}</span>
              <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 uppercase font-mono">
                {role}
              </Badge>
            </div>
            <span className="text-[10px] text-muted-foreground truncate">{email}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "action",
      header: "Action",
      cell: ({ row }) => renderActionBadge(row.original.action),
    },
    {
      accessorKey: "targetType",
      header: "Target / Entity",
      cell: ({ row }) => {
        const l = row.original;
        const billNumber = l.metadata?.billNumber;
        return (
          <div className="flex flex-col max-w-[160px]">
            <span className="text-xs font-semibold text-foreground">
              {l.targetType}
            </span>
            {billNumber ? (
              <span className="text-[10px] font-mono text-primary truncate">
                Bill: {billNumber}
              </span>
            ) : l.targetId ? (
              <span className="text-[10px] font-mono text-muted-foreground truncate">
                ID: {String(l.targetId).slice(-6)}
              </span>
            ) : null}
          </div>
        );
      },
    },
    {
      accessorKey: "ipAddress",
      header: "IP / Origin",
      cell: ({ row }) => (
        <div className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground">
          <GlobeIcon className="size-3 shrink-0" />
          <span>{row.original.ipAddress || "127.0.0.1"}</span>
        </div>
      ),
    },
    {
      id: "inspect",
      header: "Details",
      cell: ({ row }) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setInspectLog(row.original)}
          className="h-7 px-2.5 text-[11px] font-medium gap-1"
        >
          <EyeIcon className="size-3" />
          Inspect
        </Button>
      ),
    },
  ];

  // Helper to compute diff between previousState and newState
  const renderStateDiff = (log: any) => {
    const prev = log.metadata?.previousState;
    const next = log.metadata?.newState;

    if (!prev && !next) {
      return (
        <div className="p-3 rounded-lg border border-border bg-muted/30 text-xs text-muted-foreground">
          No state modifications captured for this event.
        </div>
      );
    }

    if (prev && !next) {
      // Deletion snapshot
      return (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase text-muted-foreground">
            Snapshot Before Deletion
          </h4>
          <div className="grid grid-cols-2 gap-2 p-3 rounded-lg border border-destructive/20 bg-destructive/5 text-xs">
            {Object.entries(prev).map(([k, v]) => (
              <div key={k} className="flex flex-col">
                <span className="text-[10px] uppercase font-mono text-muted-foreground">{k}</span>
                <span className="font-semibold text-foreground font-mono">{String(v ?? "—")}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Comparison diff
    const allKeys = Array.from(new Set([...Object.keys(prev || {}), ...Object.keys(next || {})]));
    const changedKeys = allKeys.filter((k) => String(prev?.[k]) !== String(next?.[k]));

    return (
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase text-muted-foreground flex items-center justify-between">
          <span>Field Modifications ({changedKeys.length} changed)</span>
          <span className="text-[10px] text-muted-foreground font-normal">
            Old Value &rarr; New Value
          </span>
        </h4>

        {changedKeys.length === 0 ? (
          <p className="text-xs text-muted-foreground">No field differences detected.</p>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
            {changedKeys.map((k) => (
              <div key={k} className="grid grid-cols-12 p-2.5 text-xs items-center gap-2 bg-card">
                <div className="col-span-3 font-mono text-[11px] font-semibold text-muted-foreground uppercase">
                  {k}
                </div>
                <div className="col-span-4 font-mono text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-1 rounded truncate">
                  {String(prev?.[k] ?? "null")}
                </div>
                <div className="col-span-1 flex justify-center text-muted-foreground">
                  <ArrowRightIcon className="size-3" />
                </div>
                <div className="col-span-4 font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded font-semibold truncate">
                  {String(next?.[k] ?? "null")}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Audit Trail
            </h1>
            <Badge variant="outline" className="text-xs font-mono bg-primary/10 text-primary border-primary/20">
              <ShieldCheckIcon className="size-3 mr-1" />
              Immutable
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cryptographically sound, non-repudiable audit logs recording all transactions, overrides, deletions, and actor details.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchLogs(page)}
            disabled={loading}
            className="h-8 text-xs font-medium"
          >
            <RefreshCwIcon className={`size-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={handleExportCSV}
            className="h-8 text-xs font-medium"
          >
            <DownloadIcon className="size-3.5 mr-1.5" />
            Export Audit CSV
          </Button>
        </div>
      </div>

      {/* Filters Card */}
      <Card className="border border-border/80 bg-card shadow-sm">
        <CardHeader className="pb-3 pt-4 px-4 border-b border-border/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FilterIcon className="size-4 text-primary" />
              <CardTitle className="text-sm font-semibold">Filter Audit Records</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcwIcon className="size-3 mr-1" />
              Reset Filters
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Search */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase">
                Search
              </label>
              <div className="relative">
                <SearchIcon className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                <Input
                  placeholder="Actor, email, bill, reason..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
                  className="h-8 text-xs pl-8 font-medium"
                />
              </div>
            </div>

            {/* Action Filter */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase">
                Action Type
              </label>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="w-full h-8 rounded-md border border-border bg-card text-foreground px-2.5 text-xs font-medium outline-none focus:border-ring [color-scheme:light] dark:[color-scheme:dark]"
              >
                <option value="ALL" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">All Actions</option>
                <option value="ADMIN_EDIT_TRANSACTION" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Admin Edit Transaction</option>
                <option value="ADMIN_DELETE_TRANSACTION" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Admin Delete Transaction</option>
                <option value="TRANSACTION_REVIEW" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Transaction Review</option>
                <option value="PETTY_CASH_TOPUP" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Petty Cash Top-Up</option>
                <option value="PETTY_CASH_WITHDRAWAL" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Petty Cash Withdrawal</option>
                <option value="BANK_DEPOSIT" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Bank Deposit</option>
                <option value="BANK_WITHDRAWAL" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Bank Withdrawal</option>
              </select>
            </div>

            {/* Target Type */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase">
                Target Entity
              </label>
              <select
                value={targetTypeFilter}
                onChange={(e) => setTargetTypeFilter(e.target.value)}
                className="w-full h-8 rounded-md border border-border bg-card text-foreground px-2.5 text-xs font-medium outline-none focus:border-ring [color-scheme:light] dark:[color-scheme:dark]"
              >
                <option value="ALL" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">All Entities</option>
                <option value="FinanceRecord" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Finance Record</option>
                <option value="BankAccount" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Bank Account</option>
                <option value="PettyCashAccount" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Petty Cash Account</option>
                <option value="Shop" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Shop / Branch</option>
                <option value="CommunicationItem" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Communication Item</option>
                <option value="User" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">User</option>
                <option value="Category" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Category</option>
              </select>
            </div>

            {/* Date Range */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase">
                Date Range
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-8 text-[11px] px-2"
                />
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-8 text-[11px] px-2"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <Button
              size="sm"
              onClick={handleApplyFilters}
              disabled={loading}
              className="h-8 px-4 text-xs font-semibold"
            >
              <FilterIcon className="size-3.5 mr-1.5" />
              Apply Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span>
            Displaying <strong className="text-foreground">{logs.length}</strong> of{" "}
            <strong className="text-foreground">{total}</strong> total audit events
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || loading}
                onClick={() => fetchLogs(page - 1)}
                className="h-7 px-2.5 text-xs"
              >
                Previous
              </Button>
              <span className="font-mono text-xs px-1">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages || loading}
                onClick={() => fetchLogs(page + 1)}
                className="h-7 px-2.5 text-xs"
              >
                Next
              </Button>
            </div>
          )}
        </div>

        <DataTable
          columns={columns}
          data={logs}
          searchKey="action"
          searchPlaceholder="Filter action in current page..."
          loading={loading}
        />
      </div>

      {/* INSPECT LOG DETAILS DIALOG */}
      <Dialog open={!!inspectLog} onOpenChange={(open) => !open && setInspectLog(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HistoryIcon className="size-4 text-primary" />
              Audit Log Details
            </DialogTitle>
            <DialogDescription>
              Detailed record of action, modifications, and environmental metadata.
            </DialogDescription>
          </DialogHeader>

          {inspectLog && (
            <div className="space-y-4 py-2">
              {/* Event Overview Box */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-lg border border-border bg-muted/40">
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-mono text-muted-foreground">Actor</span>
                  <p className="text-xs font-semibold text-foreground truncate">
                    {inspectLog.actorName || inspectLog.actor?.name || "System"}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-mono truncate">
                    {inspectLog.actorEmail || inspectLog.actor?.email}
                  </p>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-mono text-muted-foreground">Role</span>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {inspectLog.actorRole || inspectLog.actor?.role || "USER"}
                  </Badge>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-mono text-muted-foreground">IP Address</span>
                  <p className="text-xs font-mono font-semibold text-foreground">
                    {inspectLog.ipAddress || "127.0.0.1"}
                  </p>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-mono text-muted-foreground">Timestamp</span>
                  <p className="text-xs font-mono text-foreground">
                    {new Date(inspectLog.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Justification / Reason callout if available */}
              {(inspectLog.metadata?.editReason || inspectLog.metadata?.deletionReason || inspectLog.metadata?.remarks) && (
                <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 space-y-1">
                  <span className="text-[11px] font-bold uppercase text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                    <ShieldAlertIcon className="size-3.5" />
                    Audit Justification / Stated Reason
                  </span>
                  <p className="text-xs text-foreground font-medium">
                    {inspectLog.metadata.editReason || inspectLog.metadata.deletionReason || inspectLog.metadata.remarks}
                  </p>
                </div>
              )}

              {/* State Diff / Changes */}
              {renderStateDiff(inspectLog)}

              {/* Raw Metadata Details */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold uppercase text-muted-foreground">
                  Raw Event Metadata
                </span>
                <pre className="p-3 rounded-lg border border-border bg-muted/60 text-[11px] font-mono overflow-x-auto text-foreground max-h-48">
                  {JSON.stringify(inspectLog.metadata || {}, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
