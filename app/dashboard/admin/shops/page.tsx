import { getShopsAction } from "@/actions/shops";
import { ShopsView } from "@/components/admin/shops-view";

export default async function AdminShopsPage() {
  const res = await getShopsAction();
  const shops = res.success && res.shops ? res.shops : [];

  return (
    <div className="space-y-6">
      <ShopsView initialShops={shops} />
    </div>
  );
}
