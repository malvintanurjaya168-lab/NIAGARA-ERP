import type { Metadata } from "next";
import { ArrowLeftRight, CircleCheck, CircleDashed, CircleX } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { MetricCard } from "@/components/shared/metric-card";
import { TransferExplorer } from "@/components/transfers/transfer-explorer";
import { requirePagePermission } from "@/lib/auth-guards";
import { can } from "@/lib/roles";
import {
  getTransferList,
  getTransferProductOptions,
  getTransferStats,
} from "@/lib/queries/transfers";
import { getWarehouseOptions } from "@/lib/queries/warehouses";

export const metadata: Metadata = { title: "Transfer Stok" };

export const dynamic = "force-dynamic";

export default async function TransfersPage() {
  const user = await requirePagePermission("transfers.view");
  const canManage = can(user.role, "transfers.manage");

  const [stats, list, warehouses, products] = await Promise.all([
    getTransferStats(user.companyId),
    getTransferList({ companyId: user.companyId, pageSize: 100 }),
    getWarehouseOptions(user.companyId),
    canManage ? getTransferProductOptions(user.companyId) : Promise.resolve([]),
  ]);

  return (
    <div>
      <PageHeader
        eyebrow="Inventaris"
        title="Transfer Stok"
        description="Pindahkan stok antar gudang. Transfer draft tidak mengubah stok sampai diselesaikan."
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total Transfer"
          value={stats.total}
          icon={<ArrowLeftRight className="size-4" />}
          hint="Seluruh riwayat transfer"
        />
        <MetricCard
          label="Draft"
          value={stats.draft}
          icon={<CircleDashed className="size-4" />}
          hint="Menunggu penyelesaian"
          tone={stats.draft > 0 ? "warning" : "default"}
        />
        <MetricCard
          label="Selesai"
          value={stats.completed}
          icon={<CircleCheck className="size-4" />}
          hint="Stok telah dipindahkan"
          tone="positive"
        />
        <MetricCard
          label="Dibatalkan"
          value={stats.cancelled}
          icon={<CircleX className="size-4" />}
          hint="Draft yang dibatalkan"
        />
      </div>

      <TransferExplorer
        transfers={list.items}
        warehouses={warehouses}
        products={products}
        canManage={canManage}
      />
    </div>
  );
}
