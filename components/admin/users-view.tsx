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
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
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
  const [reassignShopId, setReassignShopId] = React.useState<string>("");

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
    const res = await createUserAction(data);
    if (res.success) {
      toast.create({
        title: "User created",
        description: "New user account created successfully.",
        type: "success",
      });
      setCreateOpen(false);
      createForm.reset();
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
    const res = await updateUserAction(selectedUser._id, data);
    if (res.success) {
      toast.create({
        title: "User updated",
        description: "User details updated successfully.",
        type: "success",
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
    setReassignShopId(user.shop?._id || "");
    setReassignOpen(true);
  };

  const handleReassignSubmit = async () => {
    if (!selectedUser || !reassignShopId) return;
    const res = await reassignShopAction({
      userId: selectedUser._id,
      shopId: reassignShopId,
    });
    if (res.success) {
      toast.create({
        title: "Shop reassigned",
        description: res.message || "Officer reassigned successfully.",
        type: "success",
      });
      setReassignOpen(false);
      refreshUsers();
    } else {
      toast.create({
        title: "Reassignment failed",
        description: res.error || "Could not reassign shop",
        type: "error",
      });
    }
  };

  const handleUnassignShop = async (userId: string) => {
    const res = await unassignShopAction(userId);
    if (res.success) {
      toast.create({
        title: "Shop unassigned",
        description: res.message,
        type: "success",
      });
      refreshUsers();
    } else {
      toast.create({
        title: "Action failed",
        description: res.error || "Could not unassign shop",
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
        description: `Account has been ${res.isActive ? "activated" : "deactivated"}.`,
        type: "success",
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
      header: "Assigned Branch",
      cell: ({ row }) => {
        const shop = row.original.shop;
        if (row.original.role !== "STAFF") {
          return <span className="text-muted-foreground text-xs italic">All Branches (Global)</span>;
        }
        if (!shop) {
          return (
            <Badge variant="destructive" className="text-[10px]">
              Unassigned
            </Badge>
          );
        }
        return (
          <span className="font-medium text-xs text-foreground flex items-center gap-1.5">
            <BuildingIcon className="size-3.5 text-muted-foreground" />
            {shop.name} ({shop.code})
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
                  title="Reassign Shop"
                >
                  <StoreIcon className="size-3.5" />
                </Button>
                {user.shop && (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => handleUnassignShop(user._id)}
                    title="Unassign Shop"
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">User Accounts & Roles</h2>
          <p className="text-xs text-muted-foreground">
            Manage administrative personnel, verification officers, and shop-assigned finance officers
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} size="sm" className="gap-1.5 text-xs">
          <UserPlusIcon className="size-3.5" />
          Create User
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={users}
        searchKey="name"
        searchPlaceholder="Filter users by name or email..."
        loading={loading}
      />

      {/* CREATE USER DIALOG */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Organization User</DialogTitle>
            <DialogDescription>
              Assign credential access and branch ownership
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

            <div className="grid grid-cols-2 gap-3">
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
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">Branch / Shop</label>
                  <select
                    {...createForm.register("shop")}
                    className="w-full h-9 rounded-md border border-border bg-card text-foreground px-3 text-xs font-medium outline-none focus:border-ring [color-scheme:light] dark:[color-scheme:dark]"
                  >
                    <option value="" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Select branch...</option>
                    {shops.map((s) => (
                      <option key={s._id} value={s._id} className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                  {createForm.formState.errors.shop && (
                    <p className="text-xs text-destructive">{createForm.formState.errors.shop.message}</p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Phone (Optional)</label>
              <Input placeholder="+94 77 123 4567" {...createForm.register("phone")} className="h-9 text-xs" />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={createForm.formState.isSubmitting}>
                {createForm.formState.isSubmitting ? <Loader2Icon className="size-3.5 animate-spin mr-1" /> : null}
                Create User
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT USER DIALOG */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User Account</DialogTitle>
            <DialogDescription>Modify access permissions or reset password</DialogDescription>
          </DialogHeader>

          <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Full Name</label>
              <Input placeholder="John Doe" {...editForm.register("name")} className="h-9 text-xs" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Email</label>
              <Input type="email" {...editForm.register("email")} className="h-9 text-xs" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Reset Password (leave blank to keep current)</label>
              <Input type="password" placeholder="New password" {...editForm.register("password")} className="h-9 text-xs" />
            </div>

            <div className="grid grid-cols-2 gap-3">
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
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">Branch / Shop</label>
                  <select
                    {...editForm.register("shop")}
                    className="w-full h-9 rounded-md border border-border bg-card text-foreground px-3 text-xs font-medium outline-none focus:border-ring [color-scheme:light] dark:[color-scheme:dark]"
                  >
                    <option value="" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Unassigned</option>
                    {shops.map((s) => (
                      <option key={s._id} value={s._id} className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

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

      {/* REASSIGN SHOP DIALOG */}
      <Dialog open={reassignOpen} onOpenChange={setReassignOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Reassign Branch</DialogTitle>
            <DialogDescription>
              Assign {selectedUser?.name} to a different operational shop
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Select New Branch</label>
              <select
                value={reassignShopId}
                onChange={(e) => setReassignShopId(e.target.value)}
                className="w-full h-9 rounded-md border border-border bg-card text-foreground px-3 text-xs font-medium outline-none focus:border-ring [color-scheme:light] dark:[color-scheme:dark]"
              >
                <option value="" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Select branch...</option>
                {shops.map((s) => (
                  <option key={s._id} value={s._id} className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Past records created by this officer will retain historical integrity.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setReassignOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleReassignSubmit} disabled={!reassignShopId}>
              Confirm Reassignment
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
