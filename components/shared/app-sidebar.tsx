"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
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
} from "lucide-react";

interface AppSidebarProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    role: "STAFF" | "VERIFIER" | "ADMIN" | string;
    shop?: string | null;
    shopName?: string | null;
  };
}

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();

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
          <div className="relative overflow-hidden  p-1.5">
            <div className="relative w-full aspect-[842/1190] max-h-[290px] overflow-hidden flex items-center justify-center">
              <Image
                src="/dashboard-card.svg"
                alt="Newgen Finance Card"
                width={842}
                height={1190}
                loading="lazy"
                decoding="async"
                unoptimized
                className="h-full w-full object-contain transition-transform duration-300"
              />
            </div>
          </div>
        </div>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3 space-y-2.5">
        {user.role === "STAFF" && (
          <div className="rounded-lg bg-card/60 p-2.5 border border-border/60 text-xs">
            <div className="text-muted-foreground font-medium">Assigned Branch:</div>
            <div className="mt-1 flex items-center justify-between">
              <span className="font-semibold text-foreground truncate">
                {user.shopName || "Unassigned"}
              </span>
              <Badge variant="outline" className="text-[10px] uppercase font-mono">
                Staff
              </Badge>
            </div>
          </div>
        )}

        {/* Version Number (positioned above the logout button) */}
        <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
          <span>v1.2.0</span>
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-chart-2 animate-pulse" />
            <span className="text-[10px]">Online</span>
          </span>
        </div>

        {/* Logout Button (at the very bottom) */}
        <form action={logoutAction} className="w-full">
          <Button
            type="submit"
            variant="destructive"
            size="sm"
            className="w-full justify-center gap-2 text-xs font-semibold h-8.5 rounded-lg"
          >
            <LogOutIcon className="size-3.5" />
            <span>Log Out</span>
          </Button>
        </form>
      </SidebarFooter>
    </Sidebar>
  );
}
