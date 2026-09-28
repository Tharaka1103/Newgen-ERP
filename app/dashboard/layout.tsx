import { auth } from "@/auth";
import { redirect } from "next/navigation";
import connectDB from "@/lib/mongodb";
import { User } from "@/models/User";
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

  await connectDB();
  const dbUser = await User.findById(session.user.id)
    .populate("shop", "name code shopType")
    .populate("shops", "name code shopType")
    .lean();

  let activeShopId = dbUser?.shop
    ? (dbUser.shop as any)._id?.toString() || dbUser.shop.toString()
    : null;
  let activeShopName = dbUser?.shop ? (dbUser.shop as any).name || null : null;

  let assignedShops: Array<{ _id: string; name: string; code: string; shopType?: string }> = [];

  if (dbUser?.shops && Array.isArray(dbUser.shops) && dbUser.shops.length > 0) {
    assignedShops = dbUser.shops.map((s: any) => ({
      _id: s._id?.toString() || s.toString(),
      name: s.name || "Branch",
      code: s.code || "",
      shopType: s.shopType || "STANDARD",
    }));
  } else if (dbUser?.shop) {
    const s = dbUser.shop as any;
    if (s._id) {
      assignedShops = [
        {
          _id: s._id.toString(),
          name: s.name,
          code: s.code,
          shopType: s.shopType || "STANDARD",
        },
      ];
    }
  }

  const user = {
    id: session.user.id,
    name: dbUser?.name || session.user.name,
    email: dbUser?.email || session.user.email,
    role: dbUser?.role || (session.user as { role: string }).role,
    shop: activeShopId,
    shopName: activeShopName,
    shops: assignedShops,
  };

  return <DashboardLayoutClient user={user}>{children}</DashboardLayoutClient>;
}
