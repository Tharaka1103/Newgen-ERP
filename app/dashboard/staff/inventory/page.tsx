import { auth } from "@/auth";
import connectDB from "@/lib/mongodb";
import { User } from "@/models/User";
import { InventoryView } from "@/components/inventory/inventory-view";
import { redirect } from "next/navigation";
import { AlertCircleIcon } from "lucide-react";

export default async function StaffInventoryPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  await connectDB();
  const dbUser = await User.findById(session.user.id).populate("shop", "name code shopType").lean();

  const userShop = (dbUser as any)?.shop;
  if (!userShop) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center space-y-2">
        <AlertCircleIcon className="size-8 text-destructive mx-auto" />
        <h3 className="text-base font-semibold text-destructive">No Branch Assigned</h3>
        <p className="text-xs text-muted-foreground">
          You are not currently assigned to an operational branch. Please contact an Administrator to assign you to an Inventory branch.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <InventoryView
        shopId={userShop._id.toString()}
        shopName={userShop.name}
        shopCode={userShop.code}
        isStaff={true}
      />
    </div>
  );
}
