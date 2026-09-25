import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/rbac";
import { getAllTransactionsAdminAction } from "@/actions/adminTransactions";
import { getActiveShopsAction } from "@/actions/shops";
import { getActiveCategoriesAction } from "@/actions/categories";
import { getActiveBankAccountsAction } from "@/actions/bankAccounts";
import { AllTransactionsView } from "@/components/admin/all-transactions-view";

export default async function AdminTransactionsPage() {
  const session = await auth();
  const userRole = (session?.user as { role?: string })?.role;

  if (!session?.user?.id || !isAdmin(userRole)) {
    redirect("/dashboard/admin/dashboard");
  }

  const [transactionsRes, shopsRes, categoriesRes, bankAccountsRes] = await Promise.all([
    getAllTransactionsAdminAction({ page: 1, limit: 25 }),
    getActiveShopsAction(),
    getActiveCategoriesAction(),
    getActiveBankAccountsAction(),
  ]);

  const initialRecords = transactionsRes.success && transactionsRes.records ? transactionsRes.records : [];
  const initialTotal = transactionsRes.success && transactionsRes.total !== undefined ? transactionsRes.total : 0;
  const initialPage = transactionsRes.success && transactionsRes.page !== undefined ? transactionsRes.page : 1;
  const initialTotalPages = transactionsRes.success && transactionsRes.totalPages !== undefined ? transactionsRes.totalPages : 1;

  const shops = shopsRes.success && shopsRes.shops ? shopsRes.shops : [];
  const categories = categoriesRes.success && categoriesRes.categories ? categoriesRes.categories : [];
  const bankAccounts = bankAccountsRes.success && bankAccountsRes.accounts ? bankAccountsRes.accounts : [];

  return (
    <AllTransactionsView
      initialRecords={initialRecords}
      initialTotal={initialTotal}
      initialPage={initialPage}
      initialTotalPages={initialTotalPages}
      shops={shops}
      categories={categories}
      bankAccounts={bankAccounts}
    />
  );
}
