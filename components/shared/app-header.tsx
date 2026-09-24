"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { logoutAction } from "@/actions/auth";
import {
  SunIcon,
  MoonIcon,
  LogOutIcon,
  SettingsIcon,
  UserIcon,
  ShieldCheckIcon,
  BuildingIcon,
  ClockIcon,
} from "lucide-react";

interface AppHeaderProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    role: "STAFF" | "VERIFIER" | "ADMIN" | string;
    shop?: string | null;
    shopName?: string | null;
  };
}

export function AppHeader({ user }: AppHeaderProps) {
  const pathname = usePathname();
  const [isDark, setIsDark] = React.useState(false);
  const [profileOpen, setProfileOpen] = React.useState(false);

  React.useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const isDarkMode =
      savedTheme === "dark" ||
      (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches);

    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      document.documentElement.style.colorScheme = "dark";
      setIsDark(true);
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.style.colorScheme = "light";
      setIsDark(false);
    }
  }, []);

  const toggleTheme = () => {
    if (document.documentElement.classList.contains("dark")) {
      document.documentElement.classList.remove("dark");
      document.documentElement.style.colorScheme = "light";
      localStorage.setItem("theme", "light");
      setIsDark(false);
    } else {
      document.documentElement.classList.add("dark");
      document.documentElement.style.colorScheme = "dark";
      localStorage.setItem("theme", "dark");
      setIsDark(true);
    }
  };

  // Generate breadcrumb items from URL
  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbItems = segments.map((seg, idx) => {
    const url = "/" + segments.slice(0, idx + 1).join("/");
    const formatted = seg.charAt(0).toUpperCase() + seg.slice(1);
    const isLast = idx === segments.length - 1;
    return { name: formatted, url, isLast };
  });

  const initials = user.name
    ? user.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
    : "U";

  const settingsHref =
    user.role === "ADMIN"
      ? "/dashboard/admin/settings"
      : user.role === "VERIFIER"
        ? "/dashboard/verifier/settings"
        : "/dashboard/staff/settings";

  return (
    <header className="sticky top-0 z-40 shrink-0 flex h-14 w-full items-center justify-between border-b border-border bg-card/95 px-4 backdrop-blur-md transition-colors shadow-xs">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="h-8 w-8 text-muted-foreground hover:text-foreground" />
        <div className="hidden sm:block">
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumbItems.map((item, index) => (
                <React.Fragment key={item.url}>
                  {index > 0 && <BreadcrumbSeparator />}
                  <BreadcrumbItem>
                    {item.isLast ? (
                      <BreadcrumbPage className="font-semibold text-foreground">
                        {item.name}
                      </BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink render={<Link href={item.url} />}>
                        {item.name}
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </React.Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleTheme}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Toggle theme"
        >
          {isDark ? (
            <SunIcon className="size-4 text-warning" />
          ) : (
            <MoonIcon className="size-4" />
          )}
        </Button>

        {/* Profile Dialog */}
        <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
          <DialogTrigger
            render={
              <Button
                variant="ghost"
                className="relative flex items-center gap-2 rounded-full p-1 pl-2 hover:bg-muted/60"
              />
            }
          >
            <span className="hidden md:inline-block text-xs font-medium text-foreground">
              {user.name}
            </span>
            <Avatar className="size-8 border border-border">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </DialogTrigger>

          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserIcon className="size-5 text-primary" />
                <span>User Profile</span>
              </DialogTitle>
              <DialogDescription>
                Your authenticated account details and access privileges
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3">
                <Avatar className="size-12 border border-border">
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                  <span className="font-semibold text-sm text-foreground truncate">
                    {user.name}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    {user.email}
                  </span>
                  <div className="mt-1">
                    <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wider">
                      {user.role}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg border border-border/60 bg-card p-2.5">
                  <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                    <ShieldCheckIcon className="size-3.5" />
                    <span>Role Access</span>
                  </div>
                  <span className="font-medium text-foreground">
                    {user.role === "ADMIN"
                      ? "Administrator (Full)"
                      : user.role === "VERIFIER"
                        ? "Verifier (All Shops)"
                        : "Finance Officer (Assigned Shop)"}
                  </span>
                </div>

                <div className="rounded-lg border border-border/60 bg-card p-2.5">
                  <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                    <BuildingIcon className="size-3.5" />
                    <span>Assigned Shop</span>
                  </div>
                  <span className="font-medium text-foreground truncate block">
                    {user.shopName || "Global / Unassigned"}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border">
                <div className="flex items-center gap-1">
                  <ClockIcon className="size-3" />
                  <span>Session Active: 8h Token</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-border pt-4">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                render={<Link href={settingsHref} onClick={() => setProfileOpen(false)} />}
              >
                <SettingsIcon className="size-4" />
                <span>Full Settings</span>
              </Button>

              <form action={logoutAction}>
                <Button variant="destructive" size="sm" type="submit" className="gap-1.5">
                  <LogOutIcon className="size-4" />
                  <span>Log Out</span>
                </Button>
              </form>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </header>
  );
}
