"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getShopsAction,
  createShopAction,
  updateShopAction,
  toggleShopActiveAction,
} from "@/actions/shops";
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createShopSchema,
  updateShopSchema,
  CreateShopInput,
  UpdateShopInput,
} from "@/schemas/shop";
import {
  PlusIcon,
  EditIcon,
  EyeIcon,
  Building2Icon,
  PowerIcon,
  UsersIcon,
  MapPinIcon,
  WalletIcon,
  ClockIcon,
  CheckCircle2Icon,
  Loader2Icon,
} from "lucide-react";
import { toast } from "@/components/ui/toast";

interface ShopItem {
  _id: string;
  name: string;
  code: string;
  description?: string;
  address?: string;
  isActive: boolean;
  staffCount: number;
  recordsCount: number;
  currentBalance: number;
}

export function ShopsView({ initialShops }: { initialShops: ShopItem[] }) {
  const router = useRouter();
  const [shops, setShops] = React.useState<ShopItem[]>(initialShops);
  const [loading, setLoading] = React.useState(false);

  // Modals
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [confirmToggleShop, setConfirmToggleShop] = React.useState<ShopItem | null>(null);

  const [selectedShop, setSelectedShop] = React.useState<ShopItem | null>(null);

  const createForm = useForm<CreateShopInput>({
    resolver: zodResolver(createShopSchema),
    defaultValues: {
      name: "",
      code: "",
      description: "",
      address: "",
    },
  });

  const editForm = useForm<UpdateShopInput>({
    resolver: zodResolver(updateShopSchema),
    defaultValues: {
      name: "",
      code: "",
      description: "",
      address: "",
      isActive: true,
    },
  });

  const refreshShops = async () => {
    setLoading(true);
    const res = await getShopsAction();
    if (res.success && res.shops) {
      setShops(res.shops);
    }
    setLoading(false);
  };

  const onCreateSubmit = async (data: CreateShopInput) => {
    const res = await createShopAction(data);
    if (res.success) {
      toast.create({
        title: "Branch created",
        description: "New operational branch registered successfully.",
        type: "success",
      });
      setCreateOpen(false);
      createForm.reset();
      refreshShops();
    } else {
      toast.create({
        title: "Creation failed",
        description: res.error || "An error occurred",
        type: "error",
      });
    }
  };

  const onEditSubmit = async (data: UpdateShopInput) => {
    if (!selectedShop) return;
    const res = await updateShopAction(selectedShop._id, data);
    if (res.success) {
      toast.create({
        title: "Branch updated",
        description: "Branch details saved successfully.",
        type: "success",
      });
      setEditOpen(false);
      refreshShops();
    } else {
      toast.create({
        title: "Update failed",
        description: res.error || "An error occurred",
        type: "error",
      });
    }
  };

  const openEditModal = (shop: ShopItem) => {
    setSelectedShop(shop);
    editForm.reset({
      name: shop.name,
      code: shop.code,
      description: shop.description || "",
      address: shop.address || "",
      isActive: shop.isActive,
    });
    setEditOpen(true);
  };

  const handleToggleActive = async () => {
    if (!confirmToggleShop) return;
    const res = await toggleShopActiveAction(confirmToggleShop._id);
    if (res.success) {
      toast.create({
        title: res.isActive ? "Branch activated" : "Branch deactivated",
        description: `Branch is now ${res.isActive ? "active" : "disabled"}.`,
        type: "success",
      });
      setConfirmToggleShop(null);
      refreshShops();
    } else {
      toast.create({
        title: "Action failed",
        description: res.error || "Failed to toggle branch status",
        type: "error",
      });
    }
  };

  const columns: ColumnDef<ShopItem>[] = [
    {
      accessorKey: "code",
      header: "Code",
      cell: ({ row }) => (
        <span className="font-mono text-xs font-bold uppercase rounded-md bg-muted px-2 py-0.5 border border-border">
          {row.original.code}
        </span>
      ),
    },
    {
      accessorKey: "name",
      header: "Branch / Shop Name",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <Link
            href={`/dashboard/admin/shops/${row.original._id}`}
            className="font-semibold text-foreground text-xs hover:text-primary transition-colors cursor-pointer"
          >
            {row.original.name}
          </Link>
          <span className="text-[11px] text-muted-foreground truncate max-w-xs">
            {row.original.address || "No address specified"}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "staffCount",
      header: "Assigned Staff",
      cell: ({ row }) => (
        <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
          <UsersIcon className="size-3.5 text-muted-foreground" />
          {row.original.staffCount} Officer{row.original.staffCount !== 1 ? "s" : ""}
        </span>
      ),
    },
    {
      accessorKey: "currentBalance",
      header: "Current Cash Balance",
      cell: ({ row }) => {
        const bal = row.original.currentBalance || 0;
        return (
          <span className={`font-mono text-xs font-semibold ${bal >= 0 ? "text-chart-2" : "text-destructive"}`}>
            LKR {Number(bal).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        );
      },
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          variant={row.original.isActive ? "outline" : "destructive"}
          className={`text-[10px] ${row.original.isActive ? "border-chart-2/40 bg-chart-2/15 text-foreground" : ""}`}
        >
          {row.original.isActive ? "Operational" : "Closed"}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const shop = row.original;
        return (
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="xs"
              onClick={() => router.push(`/dashboard/admin/shops/${shop._id}`)}
              className="gap-1 text-xs text-primary hover:text-primary font-medium"
              title="View Branch Analytics & Summary"
            >
              <EyeIcon className="size-3.5" />
              <span>View</span>
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => openEditModal(shop)}
              title="Edit Branch"
            >
              <EditIcon className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setConfirmToggleShop(shop)}
              title={shop.isActive ? "Deactivate Branch" : "Activate Branch"}
              className={shop.isActive ? "text-destructive hover:text-destructive" : "text-chart-2 hover:text-chart-2"}
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
          <h2 className="text-lg font-semibold text-foreground">Branches & Operational Centers</h2>
          <p className="text-xs text-muted-foreground">
            Manage organization locations, short codes for sequential billing, and branch-assigned officers
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} size="sm" className="gap-1.5 text-xs">
          <PlusIcon className="size-3.5" />
          Add Branch
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={shops}
        searchKey="name"
        searchPlaceholder="Filter branches by name or code..."
        loading={loading}
      />

      {/* CREATE SHOP MODAL */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Branch / Shop</DialogTitle>
            <DialogDescription>Register an institute, online campus, or collection center</DialogDescription>
          </DialogHeader>

          <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Branch Name</label>
              <Input placeholder="e.g. Danuma Educational Institute" {...createForm.register("name")} className="h-9 text-xs" />
              {createForm.formState.errors.name && (
                <p className="text-xs text-destructive">{createForm.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Branch Code (Prefix used in Auto-Bill Numbers)
              </label>
              <Input
                placeholder="e.g. D, A, MT, OS"
                {...createForm.register("code")}
                className="h-9 text-xs font-mono uppercase"
              />
              {createForm.formState.errors.code && (
                <p className="text-xs text-destructive">{createForm.formState.errors.code.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Physical Address</label>
              <Input placeholder="Street, City, Postal Code" {...createForm.register("address")} className="h-9 text-xs" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Description / Notes</label>
              <Textarea placeholder="Location details or campus info" {...createForm.register("description")} className="text-xs" rows={2} />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={createForm.formState.isSubmitting}>
                {createForm.formState.isSubmitting ? <Loader2Icon className="size-3.5 animate-spin mr-1" /> : null}
                Save Branch
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT SHOP MODAL */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Branch Details</DialogTitle>
            <DialogDescription>Modify name, code prefix, or physical address</DialogDescription>
          </DialogHeader>

          <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Branch Name</label>
              <Input placeholder="Branch Name" {...editForm.register("name")} className="h-9 text-xs" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Branch Code</label>
              <Input placeholder="Code" {...editForm.register("code")} className="h-9 text-xs font-mono uppercase" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Address</label>
              <Input placeholder="Address" {...editForm.register("address")} className="h-9 text-xs" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Description</label>
              <Textarea {...editForm.register("description")} className="text-xs" rows={2} />
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

      {/* CONFIRM TOGGLE SHOP ALERT */}
      <AlertDialog open={!!confirmToggleShop} onOpenChange={(open) => !open && setConfirmToggleShop(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmToggleShop?.isActive ? "Deactivate Branch?" : "Activate Branch?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmToggleShop?.isActive
                ? `Deactivating "${confirmToggleShop.name}" safely disables new transactions while preserving all ${confirmToggleShop.recordsCount || 0} historical ledger transactions.`
                : `Activating "${confirmToggleShop?.name}" will re-enable it for finance officers.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleActive}
              className={confirmToggleShop?.isActive ? "bg-destructive text-destructive-foreground hover:bg-destructive/80" : ""}
            >
              {confirmToggleShop?.isActive ? "Deactivate Branch" : "Activate Branch"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
