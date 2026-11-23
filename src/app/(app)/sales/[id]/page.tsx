import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Ban,
  Building2,
  CalendarClock,
  CreditCard,
  ReceiptText,
  UserRound,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { SaleStatusBadge } from "@/components/shared/badges";
import { Button } from "@/components/ui/button";
import { VoidSaleDialog } from "@/components/sales/void-sale-dialog";
import { requirePagePermission } from "@/lib/auth-guards";
import { can } from "@/lib/roles";
import { getSaleDetail } from "@/lib/queries/sales";
import { PAYMENT_LABELS } from "@/lib/constants";
import {
  formatDateTime,
  formatIDR,
  formatNumber,
  formatQuantity,
} from "@/lib/format";

export const metadata: Metadata = { title: "Detail Transaksi" };

export const dynamic = "force-dynamic";

export default async function SaleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePagePermission("sales.view");
  const { id } = await params;
  const sale = await getSaleDetail(user.companyId, id, {
    userId: user.id,
    viewAll: can(user.role, "sales.viewAll"),
  });

  if (!sale) notFound();

  const canVoid = can(user.role, "sales.void") && sale.status === "COMPLETED";
  const canSeeCosts = can(user.role, "costs.view");

  return (
    <div>
      <PageHeader
        eyebrow="Transaksi"
        title={sale.transactionNumber}
        description={`${formatDateTime(sale.soldAt)} · Diproses oleh ${sale.cashierName}`}
        actions={
          <>
            <Button asChild variant="ghost" size="sm" className="gap-1.5">
              <Link href="/sales">
                <ArrowLeft className="size-3.5" />
                Kembali
              </Link>
            </Button>
            {canVoid ? (
              <VoidSaleDialog
                saleId={sale.id}
                transactionNumber={sale.transactionNumber}
              />
            ) : null}
          </>
        }
      />

      {sale.status === "VOIDED" ? (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-rose-500/25 bg-rose-500/5 px-4 py-3">
          <Ban className="mt-0.5 size-4 shrink-0 text-rose-600" />
          <div>
            <p className="text-[12.5px] font-semibold text-rose-700">
              Transaksi dibatalkan
            </p>
            <p className="mt-0.5 text-[11.5px] text-rose-700/80">
              {sale.voidedAt ? `Dibatalkan ${formatDateTime(sale.voidedAt)}` : ""}
              {sale.voidedByName ? ` oleh ${sale.voidedByName}` : ""}
              {sale.voidReason ? ` — “${sale.voidReason}”` : ""}
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-3">
        <SectionCard
          className="xl:col-span-2"
          title="Rincian Transaksi"
          description="Snapshot harga dan produk pada saat transaksi terjadi."
          action={<SaleStatusBadge status={sale.status} />}
          contentClassName="p-0 sm:p-0"
        >
          <div className="border-b border-border/70 px-4 py-4">
            <div className="flex items-start gap-2.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/8 text-primary">
                <Building2 className="size-4" />
              </span>
              <div>
                <p className="text-[13px] font-semibold">{sale.company.name}</p>
                {sale.company.address ? (
                  <p className="text-[11px] text-muted-foreground">
                    {sale.company.address}
                  </p>
                ) : null}
                <p className="text-[11px] text-muted-foreground">
                  {[sale.company.phone, sale.company.contactEmail]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto px-4 py-3">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border/70 text-[10px] uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Produk</th>
                  <th className="py-2 pr-3 text-right font-medium">Harga</th>
                  <th className="py-2 pr-3 text-right font-medium">Qty</th>
                  <th className="py-2 text-right font-medium">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {sale.items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-border/50 last:border-0"
                  >
                    <td className="py-2.5 pr-3">
                      <p className="text-[12px] font-medium">{item.name}</p>
                      <p className="font-mono text-[9.5px] text-muted-foreground">
                        {item.sku}
                      </p>
                    </td>
                    <td className="whitespace-nowrap py-2.5 pr-3 text-right text-[11.5px] tabular-nums">
                      {formatIDR(item.sellingPrice)}
                    </td>
                    <td className="whitespace-nowrap py-2.5 pr-3 text-right text-[11.5px] tabular-nums text-muted-foreground">
                      {formatQuantity(item.quantity, item.unit)}
                    </td>
                    <td className="whitespace-nowrap py-2.5 text-right text-[11.5px] font-medium tabular-nums">
                      {formatIDR(item.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-border/70 px-4 py-3">
            <div className="ml-auto flex max-w-[240px] items-center justify-between">
              <span className="text-[12px] text-muted-foreground">Total</span>
              <span className="text-[18px] font-semibold tracking-tight tabular-nums">
                {formatIDR(sale.totalAmount)}
              </span>
            </div>
          </div>
        </SectionCard>

        <div className="space-y-4">
          <SectionCard title="Informasi Pembayaran">
            <div className="space-y-3">
              <InfoRow icon={<CreditCard className="size-3.5" />} label="Metode">
                {PAYMENT_LABELS[sale.paymentMethod] ?? sale.paymentMethod}
              </InfoRow>
              <InfoRow
                icon={<CalendarClock className="size-3.5" />}
                label="Waktu"
              >
                {formatDateTime(sale.soldAt)}
              </InfoRow>
              <InfoRow icon={<UserRound className="size-3.5" />} label="Kasir">
                {sale.cashierName}
              </InfoRow>
              <InfoRow icon={<ReceiptText className="size-3.5" />} label="Item">
                {formatNumber(sale.itemCount)} produk
              </InfoRow>
            </div>
          </SectionCard>

          {canSeeCosts ? (
            <SectionCard
              title="Ringkasan Laba"
              description="Berdasarkan HPP yang tersimpan saat transaksi."
            >
              <div className="space-y-2">
                <SummaryRow label="Total Penjualan" value={formatIDR(sale.totalAmount)} />
                <SummaryRow label="HPP" value={formatIDR(sale.cogs)} />
                <div className="flex items-center justify-between border-t border-border/70 pt-2">
                  <span className="text-[12px] font-medium">Laba Kotor</span>
                  <span className="text-[14px] font-semibold text-emerald-600 tabular-nums">
                    {formatIDR(sale.grossProfit)}
                  </span>
                </div>
              </div>
            </SectionCard>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="text-right text-[12px] font-medium">{children}</span>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11.5px] text-muted-foreground">{label}</span>
      <span className="text-[12px] font-medium tabular-nums">{value}</span>
    </div>
  );
}
