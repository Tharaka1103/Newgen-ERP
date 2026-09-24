import { getUsersAction } from "@/actions/users";
import { getActiveShopsAction } from "@/actions/shops";
import { UsersView } from "@/components/admin/users-view";

export default async function AdminUsersPage() {
  const [usersRes, shopsRes] = await Promise.all([
    getUsersAction(),
    getActiveShopsAction(),
  ]);

  const users = usersRes.success && usersRes.users ? usersRes.users : [];
  const shops = shopsRes.success && shopsRes.shops ? shopsRes.shops : [];

  return (
    <div className="space-y-6">
      <UsersView initialUsers={users} shops={shops} />
    </div>
  );
}
