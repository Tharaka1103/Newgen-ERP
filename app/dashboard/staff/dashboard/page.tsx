import { auth } from "@/auth";
import connectDB from "@/lib/mongodb";
import { User } from "@/models/User";
import { getSummaryAnalyticsAction } from "@/actions/reports";
import { StaffDashboardView } from "@/components/staff/dashboard-view";

export default async function StaffDashboardPage() {
  const session = await auth();

  await connectDB();
  const dbUser = session?.user?.id
    ? await User.findById(session.user.id).populate("shop", "name code").lean()
    : null;

  const userShopId = dbUser?.shop
    ? (dbUser.shop as any)._id?.toString() || dbUser.shop.toString()
    : (session?.user as { shop?: string | null })?.shop || null;
  const userShopName = dbUser?.shop
    ? (dbUser.shop as any).name || null
    : (session?.user as { shopName?: string | null })?.shopName || null;

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
