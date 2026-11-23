import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Package,
  ReceiptText,
  ScanLine,
  TrendingUp,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { MetricCard } from "@/components/shared/metric-card";
import { SectionCard } from "@/components/shared/section-card";
import { StaggerGroup, StaggerItem } from "@/components/motion/stagger";
import { SalesPerformanceChart } from "@/components/dashboard/sales-performance-chart";
import { EmptyState } from "@/components/shared/empty-state";
import { SaleStatusBadge, StockBadge } from "@/components/shared/badges";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requirePagePermission } from "@/lib/auth-guards";
import { getDashboardData } from "@/lib/queries/dashboard";
import { can } from "@/lib/roles";
import { PAYMENT_SHORT_LABELS } from "@/lib/constants";
import {
  formatDate,
  formatDateTime,
  formatIDR,
  formatNumber,
  formatQuantity,
} from "@/lib/format";

export const metadata: Metadata = { title: "Dasbor" };

export const dynamic = "force-dynamic";

function greeting(): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Jakarta",
      hour: "2-digit",
      hour12: false,
    }).format(new Date()),
  );
  if (hour < 11) return "Selamat pagi";
  if (hour < 15) return "Selamat siang";
  if (hour < 19) return "Selamat sore";
  return "Selamat malam";
}

export default async function DashboardPage() {
  const user = await requirePagePermission("dashboard.view");
  const data = await getDashboardData(user.companyId);
  const { metrics } = data;

  const firstName = user.fullName.split(" ")[0];
  const canUsePos = can(user.role, "pos.use");
  const canViewReports = can(user.role, "reports.view");
  const canViewInventory = can(user.role, "inventory.view");
  const maxBestSellerRevenue = data.bestSellers[0]?.revenue ?? 0;

  return (
    <div>
      <PageHeader
        eyebrow={`Ringkasan bisnis · ${formatDate(new Date())}`}
        title={`${greeting()}, ${firstName}`}
        description={`Pantau performa ${user.company.name} secara real-time. Semua angka dihitung langsung dari transaksi yang tersimpan di database.`}
        actions={
          <>
            {canViewReports ? (
              <Button asChild variant="outline" size="sm" className="gap-1.5">
                <Link href="/reports/financial">
                  <BarChart3 className="size-3.5" />
                  Laporan
                </Link>
              </Button>
            ) : null}
            {canUsePos ? (
              <Button asChild size="sm" className="gap-1.5">
                <Link href="/pos">
                  <ScanLine className="size-3.5" />
                  Transaksi Baru
                </Link>
              </Button>
            ) : null}
          </>
        }
      />

      <StaggerGroup className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StaggerItem>
          <MetricCard
            label="Total Pendapatan"
            value={metrics.totalRevenue}
            variant="idr"
            icon={<Wallet className="size-4" />}
            hint="Transaksi selesai"
          />
        </StaggerItem>
        <StaggerItem>
          <MetricCard
            label="Pendapatan Hari Ini"
            value={metrics.todayRevenue}
            variant="idr"
            icon={<CalendarClock className="size-4" />}
            hint="Asia/Jakarta"
            tone="positive"
          />
        </StaggerItem>
        <StaggerItem>
          <MetricCard
            label="Total Produk"
            value={metrics.totalProducts}
            icon={<Package className="size-4" />}
            hint={`${metrics.outOfStockCount} produk habis`}
          />
        </StaggerItem>
        <StaggerItem>
          <MetricCard
            label="Stok Menipis"
            value={metrics.lowStockCount}
            icon={<TriangleAlert className="size-4" />}
            hint="Di bawah batas minimum"
            tone={metrics.lowStockCount > 0 ? "warning" : "positive"}
          />
        </StaggerItem>
        <StaggerItem>
          <MetricCard
            label="Total Transaksi"
            value={metrics.totalTransactions}
            icon={<ReceiptText className="size-4" />}
            hint={`Rata-rata ${formatIDR(metrics.averageTransaction)}`}
          />
        </StaggerItem>
        <StaggerItem>
          <MetricCard
            label="Laba Kotor"
            value={metrics.grossProfit}
            variant="idr"
            icon={<TrendingUp className="size-4" />}
            hint={`HPP ${formatIDR(metrics.cogs)}`}
            tone="positive"
          />
        </StaggerItem>
      </StaggerGroup>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <SectionCard
          className="xl:col-span-2"
          title="Performa Penjualan"
          description="Tren pendapatan dari transaksi yang selesai."
          action={
            canViewReports ? (
              <Button asChild variant="ghost" size="sm" className="gap-1 text-[11px]">
                <Link href="/reports/financial">
                  Detail
                  <ArrowRight className="size-3" />
                </Link>
              </Button>
            ) : null
          }
        >
          <SalesPerformanceChart series={data.series} />
        </SectionCard>

        <SectionCard
          title="Produk Terlaris"
          description="Berdasarkan pendapatan sepanjang waktu."
        >
          {data.bestSellers.length === 0 ? (
            <EmptyState
              title="Belum ada penjualan"
              description="Produk terlaris akan muncul setelah transaksi pertama tercatat."
              className="border-0 bg-transparent py-10"
            />
          ) : (
            <ul className="space-y-3.5">
              {data.bestSellers.map((seller, index) => (
                <li key={seller.productId}>
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md bg-primary/8 text-[10px] font-semibold text-primary">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-[12.5px] font-medium">
                            {seller.name}
                          </p>
                          <p className="font-mono text-[10px] text-muted-foreground">
                            {seller.sku}
                          </p>
                        </div>
                        <p className="shrink-0 text-right text-[11.5px] font-semibold tabular-nums">
                          {formatIDR(seller.revenue)}
                        </p>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-primary to-brand-mint"
                            style={{
                              width: `${
                                maxBestSellerRevenue > 0
                                  ? Math.max(
                                      6,
                                      (seller.revenue / maxBestSellerRevenue) * 100,
                                    )
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {formatNumber(seller.units)} terjual
                        </span>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        {canViewInventory ? (
          <SectionCard
            title="Peringatan Stok"
            description="Produk pada atau di bawah batas minimum."
            action={
              <Button asChild variant="ghost" size="sm" className="gap-1 text-[11px]">
                <Link href="/inventory?status=attention">
                  Semua
                  <ArrowRight className="size-3" />
                </Link>
              </Button>
            }
          >
            {data.lowStock.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <span className="grid size-10 place-items-center rounded-full bg-emerald-500/10 text-emerald-600">
                  <CheckCircle2 className="size-5" />
                </span>
                <p className="text-[12.5px] font-medium">Stok dalam kondisi baik</p>
                <p className="text-[11px] text-muted-foreground">
                  Tidak ada produk yang perlu segera diisi ulang.
                </p>
              </div>
            ) : (
              <ul className="space-y-1">
                {data.lowStock.map((product) => (
                  <li key={product.id}>
                    <Link
                      href={`/inventory/${product.id}`}
                      className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[12px] font-medium">
                          {product.name}
                        </p>
                        <p className="text-[10.5px] text-muted-foreground">
                          {formatQuantity(product.stock, product.unit)} · min.{" "}
                          {formatQuantity(product.minimum, product.unit)}
                        </p>
                      </div>
                      <StockBadge
                        stock={product.stock}
                        minimum={product.minimum}
                        className="shrink-0 text-[9.5px]"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        ) : null}

        <SectionCard
          className={canViewInventory ? "xl:col-span-2" : "xl:col-span-3"}
          title="Transaksi Terbaru"
          description="Enam transaksi terakhir di perusahaan Anda."
          action={
            <Button asChild variant="ghost" size="sm" className="gap-1 text-[11px]">
              <Link href="/sales">
                Lihat semua
                <ArrowRight className="size-3" />
              </Link>
            </Button>
          }
        >
          {data.recentSales.length === 0 ? (
            <EmptyState
              title="Belum ada transaksi"
              description="Transaksi baru akan muncul di sini setelah checkout pertama."
              className="border-0 bg-transparent py-10"
            />
          ) : (
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
                    <TableHead className="text-[10.5px] uppercase tracking-wide">
                      Metode
                    </TableHead>
                    <TableHead className="text-right text-[10.5px] uppercase tracking-wide">
                      Total
                    </TableHead>
                    <TableHead className="text-right text-[10.5px] uppercase tracking-wide">
                      Status
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentSales.map((sale) => (
                    <TableRow key={sale.id}>
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
                      <TableCell className="text-[11.5px]">
                        {PAYMENT_SHORT_LABELS[sale.paymentMethod] ?? sale.paymentMethod}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right text-[11.5px] font-semibold tabular-nums">
                        {formatIDR(sale.totalAmount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <SaleStatusBadge
                          status={sale.status}
                          className="text-[9.5px]"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
