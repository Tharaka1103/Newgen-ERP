import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/rbac";
import { getAuditLogsAction } from "@/actions/audit";
import { AuditLogsView } from "@/components/admin/audit-logs-view";

export default async function AdminAuditPage() {
  const session = await auth();
  const userRole = (session?.user as { role?: string })?.role;

  if (!session?.user?.id || !isAdmin(userRole)) {
    redirect("/dashboard/admin/dashboard");
  }

  const logsRes = await getAuditLogsAction({ page: 1, limit: 25 });

  const initialLogs = logsRes.success && logsRes.logs ? logsRes.logs : [];
  const initialTotal = logsRes.success && logsRes.total !== undefined ? logsRes.total : 0;
  const initialPage = logsRes.success && logsRes.page !== undefined ? logsRes.page : 1;
  const initialTotalPages = logsRes.success && logsRes.totalPages !== undefined ? logsRes.totalPages : 1;

  return (
    <AuditLogsView
      initialLogs={initialLogs}
      initialTotal={initialTotal}
      initialPage={initialPage}
      initialTotalPages={initialTotalPages}
    />
  );
}
