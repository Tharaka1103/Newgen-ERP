"use client";

import * as React from "react";
import {
  getUsersAction,
  createUserAction,
  updateUserAction,
  toggleUserActiveAction,
  reassignShopAction,
  unassignShopAction,
} from "@/actions/users";
import { DataTable } from "@/components/shared/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  createUserSchema,
  updateUserSchema,
  CreateUserInput,
  UpdateUserInput,
} from "@/schemas/user";
import {
  UserPlusIcon,
  EditIcon,
  StoreIcon,
  UserXIcon,
  UserCheckIcon,
  ShieldIcon,
  BuildingIcon,
  Loader2Icon,
  CheckIcon,
} from "lucide-react";
import { toast } from "@/components/ui/toast";

interface ShopOption {
  _id: string;
  name: string;
  code: string;
}

interface UserItem {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: "STAFF" | "VERIFIER" | "ADMIN";
  shop?: { _id: string; name: string; code: string } | null;
  shops?: Array<{ _id: string; name: string; code: string }>;
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
}

function BranchCheckboxList({
  shops,
  selectedShopIds,
  onChange,
}: {
  shops: ShopOption[];
  selectedShopIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const allSelected = shops.length > 0 && selectedShopIds.length === shops.length;

  const toggleShop = (shopId: string) => {
    if (selectedShopIds.includes(shopId)) {
      onChange(selectedShopIds.filter((id) => id !== shopId));
    } else {
      onChange([...selectedShopIds, shopId]);
    }
  };

  const toggleAll = () => {
    if (allSelected) {
      onChange([]);
    } else {
      onChange(shops.map((s) => s._id));
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold uppercase text-muted-foreground flex items-center gap-1.5">
          <BuildingIcon className="size-3.5 text-primary" />
          <span>Assigned Branches ({selectedShopIds.length}/{shops.length})</span>
        </span>
        <button
          type="button"
          onClick={toggleAll}
          className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
        >
          {allSelected ? "Clear All" : "Select All"}
        </button>
      </div>

      <div className="max-h-52 overflow-y-auto rounded-lg border border-border bg-card p-1.5 space-y-1 divide-y divide-border/30">
        {shops.length === 0 ? (
          <div className="p-3 text-center text-xs text-muted-foreground">No active branches found.</div>
        ) : (
          shops.map((s) => {
            const isChecked = selectedShopIds.includes(s._id);
            return (
              <div
                key={s._id}
                onClick={() => toggleShop(s._id)}
                className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors text-xs select-none ${
                  isChecked
                    ? "bg-primary/10 border border-primary/30 text-foreground"
                    : "hover:bg-muted/40 text-muted-foreground"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`size-4 rounded flex items-center justify-center border transition-colors ${
                      isChecked
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-border bg-background"
                    }`}
                  >
                    {isChecked && <CheckIcon className="size-3" />}
                  </div>
                  <span className={`font-medium ${isChecked ? "text-foreground font-semibold" : "text-foreground/90"}`}>
                    {s.name}
                  </span>
                </div>
                <Badge variant="outline" className="font-mono text-[10px] uppercase">
                  {s.code}
                </Badge>
              </div>
            );
          })
        )}
      </div>
      {selectedShopIds.length === 0 && (
        <p className="text-[11px] text-destructive">Please select at least one branch for this staff member.</p>
      )}
    </div>
  );
}

export function UsersView({
  initialUsers,
  shops,
}: {
  initialUsers: UserItem[];
  shops: ShopOption[];
}) {
  const [users, setUsers] = React.useState<UserItem[]>(initialUsers);
  const [loading, setLoading] = React.useState(false);

  // Modal states
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [reassignOpen, setReassignOpen] = React.useState(false);
  const [confirmToggleUser, setConfirmToggleUser] = React.useState<UserItem | null>(null);

  const [selectedUser, setSelectedUser] = React.useState<UserItem | null>(null);

  // Multi-shop selection states
  const [createShopIds, setCreateShopIds] = React.useState<string[]>(
    shops[0]?._id ? [shops[0]._id] : []
  );
  const [editShopIds, setEditShopIds] = React.useState<string[]>([]);
  const [reassignShopIds, setReassignShopIds] = React.useState<string[]>([]);

  // Create Form
  const createForm = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      phone: "",
      role: "STAFF",
      shop: shops[0]?._id || "",
    },
  });

  // Edit Form
  const editForm = useForm<UpdateUserInput>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      role: "STAFF",
      shop: "",
      isActive: true,
      password: "",
    },
  });

  const selectedCreateRole = createForm.watch("role");
  const selectedEditRole = editForm.watch("role");

  const refreshUsers = async () => {
    setLoading(true);
    const res = await getUsersAction();
    if (res.success && res.users) {
      setUsers(res.users);
    }
    setLoading(false);
  };

  const onCreateSubmit = async (data: CreateUserInput) => {
    if (data.role === "STAFF" && createShopIds.length === 0) {
      toast.create({
        title: "Branch required",
        description: "Please select at least one branch for this staff member.",
        type: "error",
      });
      return;
    }

    const payload = {
      ...data,
      shops: data.role === "STAFF" ? createShopIds : [],
      shop: data.role === "STAFF" && createShopIds.length > 0 ? createShopIds[0] : null,
    };

    const res = await createUserAction(payload);
    if (res.success) {
      toast.create({
        title: "User created",
        description: "New user account created successfully.",
      });
      setCreateOpen(false);
      createForm.reset();
      setCreateShopIds(shops[0]?._id ? [shops[0]._id] : []);
      refreshUsers();
    } else {
      toast.create({
        title: "Failed to create user",
        description: res.error || "An error occurred",
        type: "error",
      });
    }
  };

  const onEditSubmit = async (data: UpdateUserInput) => {
    if (!selectedUser) return;
    if (data.role === "STAFF" && editShopIds.length === 0) {
      toast.create({
        title: "Branch required",
        description: "Please select at least one branch for this staff member.",
        type: "error",
      });
      return;
    }

    const payload = {
      ...data,
      shops: data.role === "STAFF" ? editShopIds : [],
      shop: data.role === "STAFF" && editShopIds.length > 0 ? editShopIds[0] : null,
    };

    const res = await updateUserAction(selectedUser._id, payload);
    if (res.success) {
      toast.create({
        title: "User updated",
        description: "User details updated successfully.",
      });
      setEditOpen(false);
      refreshUsers();
    } else {
      toast.create({
        title: "Failed to update user",
        description: res.error || "An error occurred",
        type: "error",
      });
    }
  };

  const openEditModal = (user: UserItem) => {
    setSelectedUser(user);
    const existingShopIds =
      user.shops && user.shops.length > 0
        ? user.shops.map((s) => s._id)
        : user.shop
        ? [user.shop._id]
        : [];
    setEditShopIds(existingShopIds);

    editForm.reset({
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      role: user.role,
      shop: user.shop?._id || "",
      isActive: user.isActive,
      password: "",
    });
    setEditOpen(true);
  };

  const openReassignModal = (user: UserItem) => {
    setSelectedUser(user);
    const existingShopIds =
      user.shops && user.shops.length > 0
        ? user.shops.map((s) => s._id)
        : user.shop
        ? [user.shop._id]
        : [];
    setReassignShopIds(existingShopIds);
    setReassignOpen(true);
  };

  const handleReassignSubmit = async () => {
    if (!selectedUser || reassignShopIds.length === 0) {
      toast.create({
        title: "Selection required",
        description: "Please select at least one branch to assign.",
        type: "error",
      });
      return;
    }
    const res = await reassignShopAction({
      userId: selectedUser._id,
      shopIds: reassignShopIds,
    });
    if (res.success) {
      toast.create({
        title: "Branches assigned",
        description: res.message || "Officer assigned successfully.",
      });
      setReassignOpen(false);
      refreshUsers();
    } else {
      toast.create({
        title: "Assignment failed",
        description: res.error || "Could not assign branches.",
        type: "error",
      });
    }
  };

  const handleUnassignShop = async (userId: string) => {
    const res = await unassignShopAction(userId);
    if (res.success) {
      toast.create({
        title: "Shops unassigned",
        description: res.message,
      });
      refreshUsers();
    } else {
      toast.create({
        title: "Action failed",
        description: res.error || "Failed to unassign shops",
        type: "error",
      });
    }
  };

  const handleToggleActive = async () => {
    if (!confirmToggleUser) return;
    const res = await toggleUserActiveAction(confirmToggleUser._id);
    if (res.success) {
      toast.create({
        title: res.isActive ? "User activated" : "User deactivated",
        description: `${confirmToggleUser.name} has been ${res.isActive ? "activated" : "deactivated"}.`,
      });
      setConfirmToggleUser(null);
      refreshUsers();
    } else {
      toast.create({
        title: "Action failed",
        description: res.error || "Failed to toggle user status",
        type: "error",
      });
    }
  };

  // Table Columns
  const columns: ColumnDef<UserItem>[] = [
    {
      accessorKey: "name",
      header: "Name & Contact",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-semibold text-foreground text-xs">{row.original.name}</span>
          <span className="text-[11px] text-muted-foreground">{row.original.email}</span>
        </div>
      ),
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => {
        const role = row.original.role;
        return (
          <Badge
            variant={role === "ADMIN" ? "default" : role === "VERIFIER" ? "outline" : "secondary"}
            className="text-[10px] font-mono uppercase"
          >
            {role === "ADMIN" ? "Administrator" : role === "VERIFIER" ? "Finance Verifier" : "Finance Officer"}
          </Badge>
        );
      },
    },
    {
      accessorKey: "shop.name",
      header: "Assigned Branches",
      cell: ({ row }) => {
        const user = row.original;
        if (user.role !== "STAFF") {
          return <span className="text-muted-foreground text-xs italic">All Branches (Global)</span>;
        }

        const userShops =
          user.shops && user.shops.length > 0
            ? user.shops
            : user.shop
            ? [user.shop]
            : [];

        if (userShops.length === 0) {
          return (
            <Badge variant="destructive" className="text-[10px]">
              Unassigned
            </Badge>
          );
        }

        const visibleShops = userShops.slice(0, 2);
        const hiddenCount = userShops.length - visibleShops.length;
        const allShopNames = userShops.map((s) => `${s.name} (${s.code})`).join(", ");

        return (
          <div className="flex flex-wrap items-center gap-1.5" title={allShopNames}>
            {visibleShops.map((s) => (
              <Badge
                key={s._id}
                variant="outline"
                className="text-[10px] font-mono bg-muted/40 border-border text-foreground"
              >
                {s.name} ({s.code})
              </Badge>
            ))}
            {hiddenCount > 0 && (
              <Badge
                variant="secondary"
                className="text-[10px] font-mono cursor-pointer hover:bg-muted"
                title={userShops.slice(2).map((s) => `${s.name} (${s.code})`).join(", ")}
              >
                +{hiddenCount} more
              </Badge>
            )}
          </div>
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
          {row.original.isActive ? "Active" : "Deactivated"}
        </Badge>
      ),
    },
    {
      accessorKey: "lastLoginAt",
      header: "Last Login",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground font-mono">
          {row.original.lastLoginAt ? new Date(row.original.lastLoginAt).toLocaleString() : "Never"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const user = row.original;
        const hasAssignedShops = Boolean(
          (user.shops && user.shops.length > 0) || user.shop
        );

        return (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => openEditModal(user)}
              title="Edit User"
            >
              <EditIcon className="size-3.5" />
            </Button>

            {user.role === "STAFF" && (
              <>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => openReassignModal(user)}
                  title="Assign / Reassign Branches"
                >
                  <StoreIcon className="size-3.5" />
                </Button>
                {hasAssignedShops && (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => handleUnassignShop(user._id)}
                    title="Unassign All Branches"
                    className="text-warning hover:text-warning"
                  >
                    <BuildingIcon className="size-3.5" />
                  </Button>
                )}
              </>
            )}

            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setConfirmToggleUser(user)}
              title={user.isActive ? "Deactivate User" : "Activate User"}
              className={user.isActive ? "text-destructive hover:text-destructive" : "text-chart-2 hover:text-chart-2"}
            >
              {user.isActive ? <UserXIcon className="size-3.5" /> : <UserCheckIcon className="size-3.5" />}
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">User Management</h2>
          <p className="text-xs text-muted-foreground">
            Control user access, assign multiple branches to officers, manage roles, and review security statuses
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} size="sm" className="gap-2">
          <UserPlusIcon className="size-4" />
          Add User
        </Button>
      </div>

      {/* Users Table */}
      <DataTable
        columns={columns}
        data={users}
        searchKey="name"
        searchPlaceholder="Search users by name..."
        loading={loading}
      />

      {/* CREATE USER DIALOG */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new user account with role-based permissions
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Full Name</label>
              <Input placeholder="John Doe" {...createForm.register("name")} className="h-9 text-xs" />
              {createForm.formState.errors.name && (
                <p className="text-xs text-destructive">{createForm.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Email</label>
              <Input type="email" placeholder="officer@newgen.lk" {...createForm.register("email")} className="h-9 text-xs" />
              {createForm.formState.errors.email && (
                <p className="text-xs text-destructive">{createForm.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Password (min 8 chars, 1 uppercase, 1 special)</label>
              <Input type="password" placeholder="••••••••" {...createForm.register("password")} className="h-9 text-xs" />
              {createForm.formState.errors.password && (
                <p className="text-xs text-destructive">{createForm.formState.errors.password.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Role</label>
              <select
                {...createForm.register("role")}
                className="w-full h-9 rounded-md border border-border bg-card text-foreground px-3 text-xs font-medium outline-none focus:border-ring [color-scheme:light] dark:[color-scheme:dark]"
              >
                <option value="STAFF" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Finance Officer (STAFF)</option>
                <option value="VERIFIER" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Finance Verifier</option>
                <option value="ADMIN" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Administrator</option>
              </select>
            </div>

            {selectedCreateRole === "STAFF" && (
              <BranchCheckboxList
                shops={shops}
                selectedShopIds={createShopIds}
                onChange={setCreateShopIds}
              />
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Phone</label>
              <Input placeholder="+94 77 123 4567" {...createForm.register("phone")} className="h-9 text-xs" />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={createForm.formState.isSubmitting}>
                {createForm.formState.isSubmitting ? (
                  <>
                    <Loader2Icon className="size-3.5 mr-1.5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create User"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT USER DIALOG */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Modify profile details, branch assignments, or reset password
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Full Name</label>
              <Input {...editForm.register("name")} className="h-9 text-xs" />
              {editForm.formState.errors.name && (
                <p className="text-xs text-destructive">{editForm.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Email</label>
              <Input type="email" {...editForm.register("email")} className="h-9 text-xs" />
              {editForm.formState.errors.email && (
                <p className="text-xs text-destructive">{editForm.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Reset Password (leave empty to keep current)</label>
              <Input type="password" placeholder="New password..." {...editForm.register("password")} className="h-9 text-xs" />
              {editForm.formState.errors.password && (
                <p className="text-xs text-destructive">{editForm.formState.errors.password.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Role</label>
              <select
                {...editForm.register("role")}
                className="w-full h-9 rounded-md border border-border bg-card text-foreground px-3 text-xs font-medium outline-none focus:border-ring [color-scheme:light] dark:[color-scheme:dark]"
              >
                <option value="STAFF" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Finance Officer (STAFF)</option>
                <option value="VERIFIER" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Finance Verifier</option>
                <option value="ADMIN" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Administrator</option>
              </select>
            </div>

            {selectedEditRole === "STAFF" && (
              <BranchCheckboxList
                shops={shops}
                selectedShopIds={editShopIds}
                onChange={setEditShopIds}
              />
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Phone</label>
              <Input placeholder="+94 77 123 4567" {...editForm.register("phone")} className="h-9 text-xs" />
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

      {/* REASSIGN / MULTI-BRANCH ASSIGN DIALOG */}
      <Dialog open={reassignOpen} onOpenChange={setReassignOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Branches</DialogTitle>
            <DialogDescription>
              Assign {selectedUser?.name} to one or more operational branches
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <BranchCheckboxList
              shops={shops}
              selectedShopIds={reassignShopIds}
              onChange={setReassignShopIds}
            />

            <p className="text-[11px] text-muted-foreground bg-muted/30 p-2.5 rounded-md border border-border/40">
              💡 <strong>Multi-Branch Access:</strong> The officer can switch between assigned branches at any time from their sidebar dashboard switcher.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setReassignOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleReassignSubmit}
              disabled={reassignShopIds.length === 0}
            >
              Save Branch Assignments
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONFIRM TOGGLE USER ALERT */}
      <AlertDialog open={!!confirmToggleUser} onOpenChange={(open) => !open && setConfirmToggleUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmToggleUser?.isActive ? "Deactivate User Account?" : "Activate User Account?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmToggleUser?.isActive
                ? `Deactivating ${confirmToggleUser.name} will immediately prevent them from logging in or creating records. Historical records remain preserved.`
                : `Activating ${confirmToggleUser?.name} will restore their system login privileges.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleActive}
              className={confirmToggleUser?.isActive ? "bg-destructive text-destructive-foreground hover:bg-destructive/80" : ""}
            >
              {confirmToggleUser?.isActive ? "Deactivate Account" : "Activate Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
