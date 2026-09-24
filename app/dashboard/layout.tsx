import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { DashboardLayoutClient } from "@/components/shared/dashboard-layout-client";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: (session.user as { role: string }).role,
    shop: (session.user as { shop?: string | null }).shop,
    shopName: (session.user as { shopName?: string | null }).shopName,
  };

  return (
    <DashboardLayoutClient user={user}>
      {children}
    </DashboardLayoutClient>
  );
}
