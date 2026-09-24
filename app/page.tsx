import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const role = (session.user as { role?: string }).role;

  if (role === "ADMIN") {
    redirect("/dashboard/admin/dashboard");
  } else if (role === "VERIFIER") {
    redirect("/dashboard/verifier/dashboard");
  } else {
    redirect("/dashboard/staff/dashboard");
  }
}
