import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PosTerminal } from "@/components/pos/pos-terminal";
import { requirePagePermission } from "@/lib/auth-guards";
import { getPosCatalog, getPosWarehouses } from "@/lib/queries/pos";

export const metadata: Metadata = { title: "Kasir" };

export const dynamic = "force-dynamic";

export default async function PosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePagePermission("pos.use");
  const params = await searchParams;
  const requested = Array.isArray(params.gudang) ? params.gudang[0] : params.gudang;

  const warehouses = await getPosWarehouses(user.companyId);
  const selected =
    warehouses.find((warehouse) => warehouse.id === requested) ??
    warehouses.find((warehouse) => warehouse.isDefault) ??
    warehouses[0];

  const products = selected
    ? await getPosCatalog(user.companyId, selected.id)
    : [];

  return (
    <div>
      <PageHeader
        eyebrow="Point of Sale"
        title="Kasir"
        description="Pilih produk, atur jumlah, lalu proses pembayaran. Harga dan stok selalu mengikuti data terbaru."
      />
      <PosTerminal
        products={products}
        warehouses={warehouses}
        selectedWarehouseId={selected?.id ?? ""}
      />
    </div>
  );
}
