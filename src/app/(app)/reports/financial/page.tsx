import type { Metadata } from "next";
import {
  Coins,
  Percent,
  ReceiptText,
  TrendingUp,
  Wallet,
  Landmark,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { MetricCard } from "@/components/shared/metric-card";
import { SectionCard } from "@/components/shared/section-card";
import { EmptyState } from "@/components/shared/empty-state";
import { ProfitChart } from "@/components/reports/profit-chart";
import { ReportFilters } from "./report-filters";
import { requirePagePermission } from "@/lib/auth-guards";
import { getFinancialReport } from "@/lib/queries/reports";
import { resolvePeriod } from "@/lib/periods";
import {
  formatIDR,
  formatIDRCompact,
  formatNumber,
  formatPercent,
} from "@/lib/format";

export const metadata: Metadata = { title: "Laporan Keuangan" };

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function single(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export default async function FinancialReportPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requirePagePermission("reports.view");
  const params = await searchParams;

  const range = resolvePeriod({
    preset: single(params.period) || "30d",
    from: single(params.from),
    to: single(params.to),
    fiscalYearStartMonth: user.company.fiscalYearStartMonth,
  });

  const report = await getFinancialReport(user.companyId, range.from, range.to);
  const hasSales = report.transactionCount > 0;

  return (
    <div>
      <PageHeader
        eyebrow="Laporan"
        title="Laporan Keuangan"
        description="Ringkasan pendapatan, HPP, dan laba kotor berdasarkan transaksi selesai. Transaksi yang dibatalkan tidak dihitung."
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Periode laporan
          </p>
          <p className="text-[13px] font-medium">{range.rangeLabel}</p>
        </div>
        <ReportFilters
          period={range.preset}
          from={range.fromKey}
          to={range.toKey}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <MetricCard
          label="Pendapatan"
          value={report.revenue}
          variant="idr-compact"
          icon={<Wallet className="size-4" />}
          hint={`${formatNumber(report.transactionCount)} transaksi`}
        />
        <MetricCard
          label="HPP"
          value={report.cogs}
          variant="idr-compact"
          icon={<Coins className="size-4" />}
          hint="Harga pokok penjualan"
        />
        <MetricCard
          label="Laba Kotor"
          value={report.grossProfit}
          variant="idr-compact"
          icon={<TrendingUp className="size-4" />}
          hint="Pendapatan − HPP"
          tone="positive"
        />
        <MetricCard
          label="Margin Kotor (%)"
          value={report.margin}
          icon={<Percent className="size-4" />}
          hint="Terhadap pendapatan"
          tone={report.margin >= 0 ? "positive" : "danger"}
        />
        <MetricCard
          label="Transaksi"
          value={report.transactionCount}
          icon={<ReceiptText className="size-4" />}
          hint="Status selesai"
        />
        <MetricCard
          label="Rata-rata / Transaksi"
          value={report.average}
          variant="idr-compact"
          icon={<Landmark className="size-4" />}
          hint="Nilai keranjang rata-rata"
        />
      </div>

      <SectionCard
        className="mt-4"
        title="Tren Pendapatan & Laba"
        description={`Pergerakan harian pada ${range.rangeLabel}.`}
      >
        {hasSales ? (
          <ProfitChart series={report.series} />
        ) : (
          <EmptyState
            title="Belum ada transaksi pada periode ini"
            description="Pilih periode lain atau proses transaksi baru melalui kasir."
            className="border-0 bg-transparent py-12"
          />
        )}
      </SectionCard>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <SectionCard
          title="Metode Pembayaran"
          description="Kontribusi setiap metode terhadap pendapatan."
        >
          {hasSales ? (
            <ul className="space-y-3">
              {report.payments.map((payment) => (
                <li key={payment.method}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-primary/70" />
                      <span className="text-[12px] font-medium">
                        {payment.label}
                      </span>
                      <span className="text-[10.5px] text-muted-foreground">
                        {formatNumber(payment.count)} transaksi
                      </span>
                    </div>
                    <span className="text-[12px] font-semibold tabular-nums">
                      {formatIDR(payment.revenue)}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-brand-mint"
                        style={{ width: `${Math.min(100, payment.share)}%` }}
                      />
                    </div>
                    <span className="w-10 text-right text-[10px] tabular-nums text-muted-foreground">
                      {formatPercent(payment.share)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="Belum ada data"
              description="Rincian metode pembayaran muncul setelah ada transaksi."
              className="border-0 bg-transparent py-10"
            />
          )}
        </SectionCard>

        <SectionCard
          title="Produk Paling Menguntungkan"
          description="Diurutkan berdasarkan pendapatan pada periode ini."
        >
          {report.topProducts.length > 0 ? (
            <div className="-mx-1 overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border/70 text-[10px] uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Produk</th>
                    <th className="py-2 pr-3 text-right font-medium">Terjual</th>
                    <th className="py-2 pr-3 text-right font-medium">Pendapatan</th>
                    <th className="py-2 text-right font-medium">Laba</th>
                  </tr>
                </thead>
                <tbody>
                  {report.topProducts.map((product) => (
                    <tr
                      key={product.productId}
                      className="border-b border-border/50 last:border-0"
                    >
                      <td className="max-w-[180px] py-2.5 pr-3">
                        <p className="truncate text-[12px] font-medium">
                          {product.name}
                        </p>
                        <p className="font-mono text-[9.5px] text-muted-foreground">
                          {product.sku}
                        </p>
                      </td>
                      <td className="whitespace-nowrap py-2.5 pr-3 text-right text-[11px] tabular-nums text-muted-foreground">
                        {formatNumber(product.units)}
                      </td>
                      <td className="whitespace-nowrap py-2.5 pr-3 text-right text-[11.5px] font-medium tabular-nums">
                        {formatIDR(product.revenue)}
                      </td>
                      <td className="whitespace-nowrap py-2.5 text-right text-[11.5px] font-medium text-emerald-600 tabular-nums">
                        {formatIDR(product.profit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="Belum ada penjualan"
              description="Produk terlaris akan muncul setelah transaksi tercatat."
              className="border-0 bg-transparent py-10"
            />
          )}
        </SectionCard>
      </div>

      <div className="mt-4 rounded-xl border border-border/70 bg-muted/30 px-4 py-3">
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">Catatan perhitungan:</span>{" "}
          Pendapatan dihitung dari total transaksi berstatus selesai. HPP
          menggunakan harga beli yang tersimpan pada setiap item transaksi
          (snapshot), sehingga perubahan harga produk tidak mengubah laporan
          historis. Nilai total HPP periode ini{" "}
          {formatIDRCompact(report.cogs)} dan laba kotor{" "}
          {formatIDRCompact(report.grossProfit)}. Biaya operasional di luar HPP
          belum dicatat pada Phase 1.
        </p>
      </div>
    </div>
  );
}
