import { auth } from "@/auth";
import connectDB from "@/lib/mongodb";
import { Shop } from "@/models/Shop";
import { getFinanceRecordsAction } from "@/actions/finances";
import { getActiveCategoriesAction } from "@/actions/categories";
import { getActiveBankAccountsAction } from "@/actions/bankAccounts";
import { getActiveShopsAction } from "@/actions/shops";
import { getCommunicationItemsAction } from "@/actions/communication";
import { FinancesView } from "@/components/staff/finances-view";

export default async function StaffFinancesPage() {
  const session = await auth();

  const userShopId = (session?.user as { shop?: string | null })?.shop || null;
  const userShopName = (session?.user as { shopName?: string | null })?.shopName || null;

  let userShopType = "STANDARD";
  if (userShopId) {
    await connectDB();
    const shopDoc = await Shop.findById(userShopId).select("shopType").lean();
    if (shopDoc && (shopDoc as any).shopType) {
      userShopType = (shopDoc as any).shopType;
    }
  }

  const [recordsRes, categoriesRes, bankAccountsRes, activeShopsRes, commItemsRes] =
    await Promise.all([
      getFinanceRecordsAction(),
      getActiveCategoriesAction(),
      getActiveBankAccountsAction(),
      getActiveShopsAction(),
      userShopId && userShopType === "COMMUNICATION"
        ? getCommunicationItemsAction(userShopId)
        : Promise.resolve({ success: true, items: [] }),
    ]);

  const records = recordsRes.success && recordsRes.records ? recordsRes.records : [];
  const categories = categoriesRes.success && categoriesRes.categories ? categoriesRes.categories : [];
  const bankAccounts = bankAccountsRes.success && bankAccountsRes.accounts ? bankAccountsRes.accounts : [];
  const activeShops = activeShopsRes.success && activeShopsRes.shops ? activeShopsRes.shops : [];
  const communicationItems = commItemsRes.success && commItemsRes.items ? commItemsRes.items : [];

  return (
    <div className="space-y-6">
      <FinancesView
        initialRecords={records}
        categories={categories}
        userShopId={userShopId}
        userShopName={userShopName}
        userShopType={userShopType}
        userId={session?.user?.id || ""}
        unassignedStaff={recordsRes.unassignedStaff}
        bankAccounts={bankAccounts}
        activeShops={activeShops}
        communicationItems={communicationItems}
      />
    </div>
  );
}
