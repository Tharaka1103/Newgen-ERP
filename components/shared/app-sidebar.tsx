"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { DashboardCardVisual } from "@/components/shared/dashboard-card-visual";
import { usePathname, useRouter } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/actions/auth";
import { switchActiveShopAction } from "@/actions/users";
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
import { toast } from "@/components/ui/toast";
import {
  LayoutDashboardIcon,
  BarChart3Icon,
  UsersIcon,
  TagsIcon,
  Building2Icon,
  ReceiptIcon,
  CheckCheckIcon,
  SettingsIcon,
  LandmarkIcon,
  LogOutIcon,
  WalletIcon,
  HistoryIcon,
  ArrowLeftRightIcon,
  Loader2Icon,
} from "lucide-react";

interface AppSidebarProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    role: "STAFF" | "VERIFIER" | "ADMIN" | string;
    shop?: string | null;
    shopName?: string | null;
    shops?: Array<{ _id: string; name: string; code: string; shopType?: string }>;
  };
}

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [logoutDialogOpen, setLogoutDialogOpen] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const [isSwitchingShop, setIsSwitchingShop] = React.useState(false);
  const [selectedShopId, setSelectedShopId] = React.useState(user.shop || "");

  React.useEffect(() => {
    if (user.shop) {
      setSelectedShopId(user.shop);
    }
  }, [user.shop]);

  const handleShopChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newShopId = e.target.value;
    if (!newShopId || newShopId === user.shop || isSwitchingShop) return;

    setSelectedShopId(newShopId);
    setIsSwitchingShop(true);

    try {
      const res = await switchActiveShopAction(newShopId);
      if (res.success) {
        toast.create({
          title: "Active Branch Switched",
          description: `Switched active branch to ${res.shopName}. Refreshing views...`,
        });
        router.refresh();
      } else {
        setSelectedShopId(user.shop || "");
        toast.create({
          title: "Switch Failed",
          description: res.error || "Could not switch branch.",
          type: "error",
        });
      }
    } catch (err) {
      console.error("Failed to switch branch:", err);
      setSelectedShopId(user.shop || "");
      toast.create({
        title: "Error",
        description: "An unexpected error occurred while switching branches.",
        type: "error",
      });
    } finally {
      setIsSwitchingShop(false);
    }
  };

  const handleLogout = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setIsLoggingOut(true);
    toast.create({
      title: "Logging you out...",
      description: "Please wait while we safely end your session.",
      type: "info",
    });
    try {
      await logoutAction();
    } catch (err) {
      console.error("Logout error:", err);
      setIsLoggingOut(false);
    }
  };

  const adminNav = [
    { title: "Dashboard", href: "/dashboard/admin/dashboard", icon: LayoutDashboardIcon },
    { title: "All Transactions", href: "/dashboard/admin/transactions", icon: ArrowLeftRightIcon },
    { title: "Petty Cash", href: "/dashboard/admin/petty-cash", icon: WalletIcon },
    { title: "Bank Accounts", href: "/dashboard/admin/bank-accounts", icon: LandmarkIcon },
    { title: "Summary & Reports", href: "/dashboard/admin/summary", icon: BarChart3Icon },
    { title: "Branches / Shops", href: "/dashboard/admin/shops", icon: Building2Icon },
    { title: "Categories", href: "/dashboard/admin/categories", icon: TagsIcon },
    { title: "User Management", href: "/dashboard/admin/users", icon: UsersIcon },
    { title: "Audit Trail", href: "/dashboard/admin/audit", icon: HistoryIcon },
    { title: "My Settings", href: "/dashboard/admin/settings", icon: SettingsIcon },
  ];

  const staffNav = [
    { title: "Dashboard", href: "/dashboard/staff/dashboard", icon: LayoutDashboardIcon },
    { title: "Finances & Entries", href: "/dashboard/staff/finances", icon: ReceiptIcon },
    { title: "My Settings", href: "/dashboard/staff/settings", icon: SettingsIcon },
  ];

  const verifierNav = [
    { title: "Dashboard", href: "/dashboard/verifier/dashboard", icon: LayoutDashboardIcon },
    { title: "Verify Records", href: "/dashboard/verifier/records", icon: CheckCheckIcon },
    { title: "My Settings", href: "/dashboard/verifier/settings", icon: SettingsIcon },
  ];

  const navItems =
    user.role === "ADMIN"
      ? adminNav
      : user.role === "VERIFIER"
        ? verifierNav
        : staffNav;

  const roleLabel =
    user.role === "ADMIN"
      ? "Administrator"
      : user.role === "VERIFIER"
        ? "Finance Verifier"
        : "Finance Officer";

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <LandmarkIcon className="size-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">
              Newgen ERP
            </span>
            <span className="text-xs text-muted-foreground">Finance Management</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="p-2 flex flex-col justify-between">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1.5">
            {roleLabel} Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={
                        <Link
                          href={item.href}
                          className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                            : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                            }`}
                        />
                      }
                    >
                      <Icon className="size-4 shrink-0" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Portrait Visual Card (Positioned directly above the footer top border) */}
        <div className="mt-auto px-2 pb-2">
          <div className="relative overflow-hidden p-1.5">
            <div className="relative w-full aspect-[842/1190] max-h-[290px] overflow-hidden flex items-center justify-center">
              <DashboardCardVisual
                className="h-full w-full object-contain transition-transform duration-300"
              />
            </div>
          </div>
        </div>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3 space-y-2.5">
        {user.role === "STAFF" && (
          <div className="rounded-lg bg-card/70 p-2.5 border border-border text-xs space-y-1.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Building2Icon className="size-3.5 text-primary" />
                <span>Active Branch</span>
              </span>
              {user.shops && user.shops.length > 1 ? (
                <Badge variant="secondary" className="text-[10px] font-mono px-1.5 py-0 bg-primary/10 text-primary border-primary/20">
                  {user.shops.length} Assigned
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] uppercase font-mono">
                  Staff
                </Badge>
              )}
            </div>

            {user.shops && user.shops.length > 1 ? (
              <div className="relative">
                <select
                  value={selectedShopId}
                  onChange={handleShopChange}
                  disabled={isSwitchingShop}
                  className="w-full h-8.5 rounded-md border border-border bg-background text-foreground px-2 text-xs font-medium outline-none focus:border-ring transition-colors [color-scheme:light] dark:[color-scheme:dark] cursor-pointer disabled:opacity-60 pr-7"
                >
                  {user.shops.map((s) => (
                    <option
                      key={s._id}
                      value={s._id}
                      className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100 font-medium"
                    >
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
                {isSwitchingShop && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Loader2Icon className="size-3.5 animate-spin text-primary" />
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between pt-0.5">
                <span className="font-semibold text-foreground truncate">
                  {user.shopName || (user.shops && user.shops[0]?.name) || "Unassigned"}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Version Number (positioned above the logout button) */}
        <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
          <span>v1.5.3</span>
          <span className="flex items-center gap-1.5">
            <span className="text-[10px]">Online</span>
            <span className="size-1.5 rounded-full bg-green-400 animate-pulse" />
          </span>
        </div>

        {/* Logout Button (at the very bottom) */}
        <Button
          type="button"
          onClick={() => setLogoutDialogOpen(true)}
          variant="destructive"
          size="sm"
          className="w-full justify-center gap-2 text-xs font-semibold h-8.5 rounded-lg cursor-pointer"
        >
          <LogOutIcon className="size-3.5" />
          <span>Log Out</span>
        </Button>
      </SidebarFooter>

      {/* Logout Confirmation Dialog */}
      <AlertDialog
        open={logoutDialogOpen}
        onOpenChange={(open) => !isLoggingOut && setLogoutDialogOpen(open)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              <LogOutIcon className="size-5" />
              <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              Are you sure you want to log out of your session? Any unsaved changes in your current view may be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoggingOut}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2 font-semibold"
            >
              {isLoggingOut ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  <span>Logging you out...</span>
                </>
              ) : (
                <>
                  <LogOutIcon className="size-4" />
                  <span>Log Out</span>
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sidebar>
  );
}
