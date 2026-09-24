import { auth } from "@/auth";
import { SettingsView } from "@/components/shared/settings-view";

export default async function StaffSettingsPage() {
  const session = await auth();

  const user = {
    id: session?.user?.id || "",
    name: session?.user?.name || "",
    email: session?.user?.email || "",
    role: (session?.user as { role: string })?.role || "STAFF",
    shop: (session?.user as { shop?: string | null })?.shop || null,
    shopName: (session?.user as { shopName?: string | null })?.shopName || null,
  };

  return <SettingsView user={user} />;
}
