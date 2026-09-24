import { auth } from "@/auth";
import { getFinanceRecordsAction } from "@/actions/finances";
import { getActiveCategoriesAction } from "@/actions/categories";
import { FinancesView } from "@/components/staff/finances-view";

export default async function StaffFinancesPage() {
  const session = await auth();

  const [recordsRes, categoriesRes] = await Promise.all([
    getFinanceRecordsAction(),
    getActiveCategoriesAction(),
  ]);

  const records = recordsRes.success && recordsRes.records ? recordsRes.records : [];
  const categories = categoriesRes.success && categoriesRes.categories ? categoriesRes.categories : [];

  const userShopId = (session?.user as { shop?: string | null })?.shop || null;
  const userShopName = (session?.user as { shopName?: string | null })?.shopName || null;

  return (
    <div className="space-y-6">
      <FinancesView
        initialRecords={records}
        categories={categories}
        userShopId={userShopId}
        userShopName={userShopName}
        userId={session?.user?.id || ""}
        unassignedStaff={recordsRes.unassignedStaff}
      />
    </div>
  );
}
