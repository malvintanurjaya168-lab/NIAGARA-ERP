import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PosTerminal } from "@/components/pos/pos-terminal";
import { requirePagePermission } from "@/lib/auth-guards";
import { getPosCatalog } from "@/lib/queries/pos";

export const metadata: Metadata = { title: "Kasir" };

export const dynamic = "force-dynamic";

export default async function PosPage() {
  const user = await requirePagePermission("pos.use");
  const products = await getPosCatalog(user.companyId);

  return (
    <div>
      <PageHeader
        eyebrow="Point of Sale"
        title="Kasir"
        description="Pilih produk, atur jumlah, lalu proses pembayaran. Harga dan stok selalu mengikuti data terbaru."
      />
      <PosTerminal products={products} />
    </div>
  );
}
