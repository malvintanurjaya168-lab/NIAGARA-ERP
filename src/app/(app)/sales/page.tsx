import type { Metadata } from "next";
import Link from "next/link";
import {
  ChevronRight,
  ReceiptText,
  RotateCcw,
  ScanLine,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { MetricCard } from "@/components/shared/metric-card";
import { SectionCard } from "@/components/shared/section-card";
import { EmptyState } from "@/components/shared/empty-state";
import { SaleStatusBadge } from "@/components/shared/badges";
import { Pagination } from "@/components/shared/pagination";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SalesFilters } from "./sales-filters";
import { requirePagePermission } from "@/lib/auth-guards";
import { can } from "@/lib/roles";
import { getCashierOptions, getSalesList } from "@/lib/queries/sales";
import { PAYMENT_METHODS, PAYMENT_SHORT_LABELS } from "@/lib/constants";
import { resolvePeriod } from "@/lib/periods";
import { formatDateTime, formatIDR, formatNumber } from "@/lib/format";

export const metadata: Metadata = { title: "Penjualan" };

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function single(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requirePagePermission("sales.view");
  const params = await searchParams;

  const q = single(params.q);
  const paymentRaw = single(params.payment);
  const statusRaw = single(params.status);
  const cashierRaw = single(params.cashier);
  const parsedPage = Number.parseInt(single(params.page), 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const payment = PAYMENT_METHODS.some((method) => method.value === paymentRaw)
    ? paymentRaw
    : "";
  const status =
    statusRaw === "COMPLETED" || statusRaw === "VOIDED" ? statusRaw : "";

  const range = resolvePeriod({
    preset: single(params.period) || "30d",
    from: single(params.from),
    to: single(params.to),
    fiscalYearStartMonth: user.company.fiscalYearStartMonth,
  });

  const viewAll = can(user.role, "sales.viewAll");
  const cashiers = viewAll ? await getCashierOptions(user.companyId) : [];
  const cashier =
    viewAll && cashiers.some((option) => option.id === cashierRaw)
      ? cashierRaw
      : "";

  const list = await getSalesList({
    companyId: user.companyId,
    scopeToCashierId: viewAll ? undefined : user.id,
    cashierId: cashier || undefined,
    from: range.from,
    to: range.to,
    q,
    paymentMethod: payment || undefined,
    status: status || undefined,
    page,
  });

  const hasFilters = Boolean(q || payment || status || cashier || range.preset !== "30d");

  function buildHref(nextPage: number): string {
    const search = new URLSearchParams();
    if (q) search.set("q", q);
    if (range.preset !== "30d") search.set("period", range.preset);
    if (range.preset === "custom") {
      search.set("from", range.fromKey);
      search.set("to", range.toKey);
    }
    if (payment) search.set("payment", payment);
    if (status) search.set("status", status);
    if (cashier) search.set("cashier", cashier);
    if (nextPage > 1) search.set("page", String(nextPage));
    const query = search.toString();
    return query ? `/sales?${query}` : "/sales";
  }

  return (
    <div>
      <PageHeader
        eyebrow="Riwayat transaksi"
        title="Penjualan"
        description={
          viewAll
            ? "Semua transaksi perusahaan pada periode terpilih. Transaksi yang dibatalkan tidak dihitung sebagai pendapatan."
            : "Transaksi yang Anda proses pada periode terpilih."
        }
        actions={
          can(user.role, "pos.use") ? (
            <Button asChild size="sm" className="gap-1.5">
              <Link href="/pos">
                <ScanLine className="size-3.5" />
                Transaksi Baru
              </Link>
            </Button>
          ) : null
        }
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard
          label="Pendapatan"
          value={list.revenue}
          variant="idr-compact"
          icon={<Wallet className="size-4" />}
          hint={range.label}
        />
        <MetricCard
          label="Transaksi Selesai"
          value={list.completedCount}
          icon={<ReceiptText className="size-4" />}
          hint={range.rangeLabel}
        />
        <MetricCard
          label="Rata-rata / Transaksi"
          value={list.average}
          variant="idr-compact"
          icon={<TrendingUp className="size-4" />}
          hint="Transaksi selesai"
        />
        <MetricCard
          label="Dibatalkan"
          value={list.voidedCount}
          icon={<RotateCcw className="size-4" />}
          hint="Stok dikembalikan"
          tone={list.voidedCount > 0 ? "warning" : "positive"}
        />
      </div>

      <SectionCard
        className="mt-4"
        title="Daftar Transaksi"
        description={`${list.total} transaksi · ${range.rangeLabel}`}
        contentClassName="space-y-4"
      >
        <SalesFilters
          q={q}
          period={range.preset}
          from={range.fromKey}
          to={range.toKey}
          payment={payment}
          status={status}
          cashier={cashier}
          cashiers={cashiers}
          showCashier={viewAll}
        />

        {list.items.length === 0 ? (
          <EmptyState
            title={hasFilters ? "Tidak ada transaksi yang cocok" : "Belum ada transaksi"}
            description={
              hasFilters
                ? "Coba ubah periode, metode pembayaran, atau kata kunci pencarian."
                : "Transaksi yang diproses melalui kasir akan muncul di sini."
            }
            action={
              can(user.role, "pos.use") && !hasFilters ? (
                <Button asChild size="sm" className="gap-1.5">
                  <Link href="/pos">
                    <ScanLine className="size-3.5" />
                    Buka Kasir
                  </Link>
                </Button>
              ) : null
            }
          />
        ) : (
          <>
            <div className="-mx-1 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-[10.5px] uppercase tracking-wide">
                      No. Transaksi
                    </TableHead>
                    <TableHead className="text-[10.5px] uppercase tracking-wide">
                      Waktu
                    </TableHead>
                    <TableHead className="text-[10.5px] uppercase tracking-wide">
                      Kasir
                    </TableHead>
                    <TableHead className="hidden text-right text-[10.5px] uppercase tracking-wide sm:table-cell">
                      Item
                    </TableHead>
                    <TableHead className="text-[10.5px] uppercase tracking-wide">
                      Metode
                    </TableHead>
                    <TableHead className="text-right text-[10.5px] uppercase tracking-wide">
                      Total
                    </TableHead>
                    <TableHead className="text-[10.5px] uppercase tracking-wide">
                      Status
                    </TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.items.map((sale) => (
                    <TableRow
                      key={sale.id}
                      className={sale.status === "VOIDED" ? "opacity-70" : undefined}
                    >
                      <TableCell>
                        <Link
                          href={`/sales/${sale.id}`}
                          className="font-mono text-[11px] font-medium text-primary hover:underline"
                        >
                          {sale.transactionNumber}
                        </Link>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-[11.5px] text-muted-foreground">
                        {formatDateTime(sale.soldAt)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-[11.5px]">
                        {sale.cashierName}
                      </TableCell>
                      <TableCell className="hidden text-right text-[11.5px] tabular-nums text-muted-foreground sm:table-cell">
                        {formatNumber(sale.itemCount)}
                      </TableCell>
                      <TableCell className="text-[11.5px]">
                        {PAYMENT_SHORT_LABELS[sale.paymentMethod] ?? sale.paymentMethod}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right text-[11.5px] font-semibold tabular-nums">
                        {formatIDR(sale.totalAmount)}
                      </TableCell>
                      <TableCell>
                        <SaleStatusBadge status={sale.status} className="text-[9.5px]" />
                      </TableCell>
                      <TableCell>
                        <Button
                          asChild
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground"
                        >
                          <Link
                            href={`/sales/${sale.id}`}
                            aria-label={`Lihat transaksi ${sale.transactionNumber}`}
                          >
                            <ChevronRight className="size-3.5" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <Pagination
              page={list.page}
              pageCount={list.pageCount}
              total={list.total}
              pageSize={list.pageSize}
              buildHref={buildHref}
            />
          </>
        )}
      </SectionCard>
    </div>
  );
}
