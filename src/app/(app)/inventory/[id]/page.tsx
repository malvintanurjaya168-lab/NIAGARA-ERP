import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Boxes,
  History,
  Pencil,
  ReceiptText,
  TrendingUp,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { MetricCard } from "@/components/shared/metric-card";
import { SectionCard } from "@/components/shared/section-card";
import { EmptyState } from "@/components/shared/empty-state";
import { StockBadge } from "@/components/shared/badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StockAdjustDialog } from "@/components/inventory/stock-adjust-dialog";
import { requirePagePermission } from "@/lib/auth-guards";
import { can } from "@/lib/roles";
import { getProductDetail } from "@/lib/queries/inventory";
import { MOVEMENT_LABELS, MOVEMENT_TONES } from "@/lib/constants";
import {
  formatDate,
  formatDateTime,
  formatIDR,
  formatPercent,
  formatQuantity,
} from "@/lib/format";

export const metadata: Metadata = { title: "Detail Produk" };

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePagePermission("inventory.view");
  const { id } = await params;
  const product = await getProductDetail(user.companyId, id);

  if (!product) notFound();

  const canManage = can(user.role, "inventory.manage");
  const margin =
    product.sellingPrice > 0
      ? ((product.sellingPrice - product.purchasePrice) / product.sellingPrice) * 100
      : 0;
  const stockValue = product.stockQuantity * product.purchasePrice;

  return (
    <div>
      <PageHeader
        eyebrow={product.sku}
        title={product.name}
        description={`${product.category?.name ?? "Tanpa kategori"} · Satuan ${product.unit} · ${
          product.isActive ? "Produk aktif" : "Produk nonaktif"
        }`}
        actions={
          <>
            <Button asChild variant="ghost" size="sm" className="gap-1.5">
              <Link href="/inventory">
                <ArrowLeft className="size-3.5" />
                Kembali
              </Link>
            </Button>
            {canManage ? (
              <>
                <Button asChild variant="outline" size="sm" className="gap-1.5">
                  <Link href={`/inventory/${product.id}/edit`}>
                    <Pencil className="size-3.5" />
                    Ubah
                  </Link>
                </Button>
                <StockAdjustDialog
                  productId={product.id}
                  productName={product.name}
                  unit={product.unit}
                  stock={product.stockQuantity}
                />
              </>
            ) : null}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <MetricCard
          label="Stok Saat Ini"
          value={product.stockQuantity}
          icon={<Boxes className="size-4" />}
          hint={`Minimum ${formatQuantity(product.minimumStock, product.unit)}`}
          tone={
            product.stockQuantity <= 0
              ? "danger"
              : product.stockQuantity <= product.minimumStock
                ? "warning"
                : "positive"
          }
        />
        <MetricCard
          label="Total Terjual"
          value={product.soldUnits}
          icon={<ReceiptText className="size-4" />}
          hint="Dari transaksi selesai"
        />
        <MetricCard
          label="Pendapatan Produk"
          value={product.soldRevenue}
          variant="idr-compact"
          icon={<TrendingUp className="size-4" />}
          hint="Akumulasi penjualan"
          tone="positive"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <SectionCard
          title="Informasi Produk"
          description="Data master dan nilai persediaan."
        >
          <div className="divide-y divide-border/60">
            <InfoRow label="SKU">
              <span className="font-mono text-[11.5px]">{product.sku}</span>
            </InfoRow>
            <InfoRow label="Kategori">
              {product.category?.name ?? "Tanpa kategori"}
            </InfoRow>
            <InfoRow label="Satuan">{product.unit}</InfoRow>
            <InfoRow label="Harga Beli (HPP)">
              {formatIDR(product.purchasePrice)}
            </InfoRow>
            <InfoRow label="Harga Jual">{formatIDR(product.sellingPrice)}</InfoRow>
            <InfoRow label="Margin Kotor">{formatPercent(margin)}</InfoRow>
            <InfoRow label="Nilai Stok">{formatIDR(stockValue)}</InfoRow>
            <InfoRow label="Stok Minimum">
              {formatQuantity(product.minimumStock, product.unit)}
            </InfoRow>
            <InfoRow label="Status">
              <span className="flex items-center gap-2">
                <StockBadge
                  stock={product.stockQuantity}
                  minimum={product.minimumStock}
                  className="text-[9.5px]"
                />
                {!product.isActive ? (
                  <Badge
                    variant="outline"
                    className="border-border bg-muted text-[9px] text-muted-foreground"
                  >
                    Nonaktif
                  </Badge>
                ) : null}
              </span>
            </InfoRow>
            <InfoRow label="Dibuat">{formatDate(product.createdAt)}</InfoRow>
            <InfoRow label="Terakhir Diubah">
              {formatDateTime(product.updatedAt)}
            </InfoRow>
          </div>
        </SectionCard>

        <SectionCard
          className="xl:col-span-2"
          title="Riwayat Pergerakan Stok"
          description="Buku besar persediaan yang tidak dapat diubah. Menampilkan 20 pergerakan terakhir."
          action={
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-[10.5px] text-muted-foreground">
                <History className="size-3" />
                {product.movements.length} catatan
              </span>
              <Button asChild variant="ghost" size="sm" className="gap-1 text-[11px]">
                <Link
                  href={`/inventory/movements?q=${encodeURIComponent(product.sku)}`}
                >
                  Semua
                  <ArrowRight className="size-3" />
                </Link>
              </Button>
            </div>
          }
        >
          {product.movements.length === 0 ? (
            <EmptyState
              title="Belum ada pergerakan stok"
              description="Stok masuk, keluar, penjualan, dan penyesuaian akan tercatat di sini."
              className="border-0 bg-transparent py-10"
            />
          ) : (
            <div className="-mx-1 overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border/70 text-[10px] uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Waktu</th>
                    <th className="py-2 pr-3 font-medium">Jenis</th>
                    <th className="py-2 pr-3 text-right font-medium">Perubahan</th>
                    <th className="py-2 pr-3 text-right font-medium">Stok</th>
                    <th className="py-2 pr-3 font-medium">Catatan</th>
                    <th className="py-2 font-medium">Oleh</th>
                  </tr>
                </thead>
                <tbody>
                  {product.movements.map((movement) => (
                    <tr
                      key={movement.id}
                      className="border-b border-border/50 last:border-0"
                    >
                      <td className="whitespace-nowrap py-2.5 pr-3 text-[11px] text-muted-foreground">
                        {formatDateTime(movement.createdAt)}
                      </td>
                      <td className="py-2.5 pr-3">
                        <Badge
                          variant="outline"
                          className={`border text-[9px] font-medium ${
                            MOVEMENT_TONES[movement.movementType] ?? ""
                          }`}
                        >
                          {MOVEMENT_LABELS[movement.movementType] ??
                            movement.movementType}
                        </Badge>
                      </td>
                      <td
                        className={`whitespace-nowrap py-2.5 pr-3 text-right text-[11.5px] font-medium tabular-nums ${
                          movement.quantityDelta > 0
                            ? "text-emerald-600"
                            : movement.quantityDelta < 0
                              ? "text-rose-600"
                              : "text-muted-foreground"
                        }`}
                      >
                        {movement.quantityDelta > 0 ? "+" : ""}
                        {formatQuantity(movement.quantityDelta, product.unit)}
                      </td>
                      <td className="whitespace-nowrap py-2.5 pr-3 text-right text-[11px] tabular-nums text-muted-foreground">
                        {formatQuantity(movement.previousQuantity)} →{" "}
                        <span className="font-medium text-foreground">
                          {formatQuantity(movement.newQuantity)}
                        </span>
                      </td>
                      <td className="max-w-[220px] py-2.5 pr-3 text-[11px]">
                        <span className="line-clamp-2">{movement.reason}</span>
                      </td>
                      <td className="whitespace-nowrap py-2.5 text-[11px] text-muted-foreground">
                        {movement.createdBy}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <span className="text-[11.5px] text-muted-foreground">{label}</span>
      <span className="text-right text-[12px] font-medium">{children}</span>
    </div>
  );
}
