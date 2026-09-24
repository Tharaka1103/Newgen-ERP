import { getFinanceRecordsAction } from "@/actions/finances";
import { getActiveShopsAction } from "@/actions/shops";
import { getActiveCategoriesAction } from "@/actions/categories";
import { RecordsView } from "@/components/verifier/records-view";

export default async function VerifierRecordsPage() {
  const [recordsRes, shopsRes, categoriesRes] = await Promise.all([
    getFinanceRecordsAction({ status: "PENDING" }),
    getActiveShopsAction(),
    getActiveCategoriesAction(),
  ]);

  const records = recordsRes.success && recordsRes.records ? recordsRes.records : [];
  const shops = shopsRes.success && shopsRes.shops ? shopsRes.shops : [];
  const categories = categoriesRes.success && categoriesRes.categories ? categoriesRes.categories : [];

  return (
    <div className="space-y-6">
      <RecordsView
        initialRecords={records}
        shops={shops}
        categories={categories}
      />
    </div>
  );
}
