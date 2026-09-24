import { notFound } from "next/navigation";
import { getShopDetailsAction } from "@/actions/shops";
import { SingleShopView } from "@/components/admin/single-shop-view";
import type { Metadata } from "next";

interface SingleShopPageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({ params }: SingleShopPageProps): Promise<Metadata> {
  const { id } = await params;
  const res = await getShopDetailsAction(id);
  if (!res.success || !res.shop) {
    return { title: "Branch Details | Newgen ERP" };
  }
  return {
    title: `${res.shop.name} (${res.shop.code}) | Branch Analytics`,
    description: `Financial summary, charts, and ledger for ${res.shop.name}`,
  };
}

export default async function SingleShopPage({ params }: SingleShopPageProps) {
  const { id } = await params;
  const res = await getShopDetailsAction(id);

  if (!res.success || !res.shop) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <SingleShopView
        initialShop={res.shop}
        initialStaff={res.assignedStaff || []}
        initialStats={
          res.stats || {
            recordsCount: 0,
            pendingCount: 0,
            approvedCount: 0,
            currentBalance: 0,
          }
        }
      />
    </div>
  );
}
