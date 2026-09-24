"use client";

import * as React from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/shared/app-sidebar";
import { AppHeader } from "@/components/shared/app-header";
import { Toaster } from "@/components/ui/toast";

interface DashboardLayoutClientProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    role: "STAFF" | "VERIFIER" | "ADMIN" | string;
    shop?: string | null;
    shopName?: string | null;
  };
  children: React.ReactNode;
}

export function DashboardLayoutClient({
  user,
  children,
}: DashboardLayoutClientProps) {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen w-full overflow-hidden bg-background text-foreground antialiased">
        <AppSidebar user={user} />
        <div className="flex flex-1 flex-col h-screen overflow-hidden">
          <AppHeader user={user} />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            <div className="mx-auto max-w-7xl space-y-6">{children}</div>
          </main>
        </div>
      </div>
      <Toaster />
    </SidebarProvider>
  );
}
