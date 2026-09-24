import { getCategoriesAction } from "@/actions/categories";
import { CategoriesView } from "@/components/admin/categories-view";

export default async function AdminCategoriesPage() {
  const res = await getCategoriesAction();
  const categories = res.success && res.categories ? res.categories : [];

  return (
    <div className="space-y-6">
      <CategoriesView initialCategories={categories} />
    </div>
  );
}
