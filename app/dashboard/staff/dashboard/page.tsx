import { auth } from "@/auth";
import connectDB from "@/lib/mongodb";
import { User } from "@/models/User";
import { getSummaryAnalyticsAction } from "@/actions/reports";
import { StaffDashboardView } from "@/components/staff/dashboard-view";
import { InventoryView } from "@/components/inventory/inventory-view";

export default async function StaffDashboardPage() {
  const session = await auth();

  await connectDB();
  const dbUser = session?.user?.id
    ? await User.findById(session.user.id).populate("shop", "name code shopType").lean()
    : null;

  const userShop = (dbUser as any)?.shop;
  const userShopId = userShop?._id?.toString() || userShop?.toString() || (session?.user as { shop?: string | null })?.shop || null;
  const userShopName = userShop?.name || (session?.user as { shopName?: string | null })?.shopName || null;
  const userShopCode = userShop?.code || "";
  const isInventoryShop = userShop?.shopType === "INVENTORY";

  if (isInventoryShop && userShopId) {
    return (
      <div className="space-y-6">
        <InventoryView
          shopId={userShopId}
          shopName={userShopName || "Branch"}
          shopCode={userShopCode}
          isStaff={true}
        />
      </div>
    );
  }

  // SSR initial load with "today" as default period
  const res = await getSummaryAnalyticsAction({ period: "today" });

  const kpis = res.success && res.kpis ? res.kpis : {
    totalTransactions: 0,
    totalExpense: 0,
    totalIncome: 0,
    pendingApprovals: 0,
    approvedAmount: 0,
    rejectedAmount: 0,
    netBalance: 0,
  };

  const initialRecords = res.records ? [...res.records].reverse().slice(0, 5) : [];

  return (
    <StaffDashboardView
      initialKpis={kpis}
      initialRecords={initialRecords}
      userShopId={userShopId}
      userShopName={userShopName}
    />
  );
}
