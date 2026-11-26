import type { Metadata } from "next";
import { CircleCheck, CircleX, Star, Warehouse } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { MetricCard } from "@/components/shared/metric-card";
import { WarehouseExplorer } from "@/components/warehouses/warehouse-explorer";
import { requirePagePermission } from "@/lib/auth-guards";
import { can } from "@/lib/roles";
import {
  getWarehouseList,
  getWarehouseStats,
} from "@/lib/queries/warehouses";

export const metadata: Metadata = { title: "Manajemen Gudang" };

export const dynamic = "force-dynamic";

export default async function WarehousesPage() {
  const user = await requirePagePermission("warehouses.view");
  const canManage = can(user.role, "warehouses.manage");

  const [stats, list] = await Promise.all([
    getWarehouseStats(user.companyId),
    getWarehouseList({ companyId: user.companyId, pageSize: 100 }),
  ]);

  return (
    <div>
      <PageHeader
        eyebrow="Inventaris"
        title="Manajemen Gudang"
        description="Kelola lokasi penyimpanan dan saldo stok per gudang untuk perusahaan Anda."
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total Gudang"
          value={stats.total}
          icon={<Warehouse className="size-4" />}
          hint="Seluruh lokasi penyimpanan"
        />
        <MetricCard
          label="Gudang Aktif"
          value={stats.active}
          icon={<CircleCheck className="size-4" />}
          hint="Dapat dipakai transaksi"
          tone="positive"
        />
        <MetricCard
          label="Gudang Nonaktif"
          value={stats.inactive}
          icon={<CircleX className="size-4" />}
          hint="Disembunyikan dari transaksi baru"
          tone={stats.inactive > 0 ? "warning" : "default"}
        />
        <MetricCard
          label="Gudang Default"
          value={list.items.filter((item) => item.isDefault && item.isActive).length}
          icon={<Star className="size-4" />}
          hint="Lokasi utama untuk stok baru"
        />
      </div>

      <WarehouseExplorer warehouses={list.items} canManage={canManage} />
    </div>
  );
}
