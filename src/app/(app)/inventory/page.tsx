import type { Metadata } from "next";
import Link from "next/link";
import {
  Boxes,
  ChevronRight,
  History,
  Package,
  Pencil,
  Plus,
  Tags,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { MetricCard } from "@/components/shared/metric-card";
import { SectionCard } from "@/components/shared/section-card";
import { EmptyState } from "@/components/shared/empty-state";
import { StockBadge } from "@/components/shared/badges";
import { Pagination } from "@/components/shared/pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { InventoryFilters } from "./inventory-filters";
import { requirePagePermission } from "@/lib/auth-guards";
import { can } from "@/lib/roles";
import {
  getCategoryOptions,
  getInventoryList,
  getInventoryStats,
  type InventorySort,
  type InventoryStatus,
} from "@/lib/queries/inventory";
import { formatIDR, formatQuantity } from "@/lib/format";

export const metadata: Metadata = { title: "Inventaris" };

export const dynamic = "force-dynamic";

const STATUSES: InventoryStatus[] = ["all", "in", "low", "out", "attention"];
const SORTS: InventorySort[] = ["recent", "name", "stock-asc", "stock-desc", "value"];

type SearchParams = Record<string, string | string[] | undefined>;

function single(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requirePagePermission("inventory.view");
  const params = await searchParams;

  const q = single(params.q);
  const categoryId = single(params.category);
  const rawStatus = single(params.status) as InventoryStatus;
  const rawSort = single(params.sort) as InventorySort;
  const status = STATUSES.includes(rawStatus) ? rawStatus : "all";
  const sort = SORTS.includes(rawSort) ? rawSort : "recent";
  const parsedPage = Number.parseInt(single(params.page), 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const [list, stats, categories] = await Promise.all([
    getInventoryList({
      companyId: user.companyId,
      q,
      categoryId: categoryId || undefined,
      status,
      sort,
      page,
    }),
    getInventoryStats(user.companyId),
    getCategoryOptions(user.companyId),
  ]);

  const canManage = can(user.role, "inventory.manage");
  const canViewMovements = can(user.role, "inventory.movements");

  function buildHref(nextPage: number): string {
    const search = new URLSearchParams();
    if (q) search.set("q", q);
    if (categoryId) search.set("category", categoryId);
    if (status !== "all") search.set("status", status);
    if (sort !== "recent") search.set("sort", sort);
    if (nextPage > 1) search.set("page", String(nextPage));
    const query = search.toString();
    return query ? `/inventory?${query}` : "/inventory";
  }

  const hasFilters = Boolean(q || categoryId || status !== "all");

  return (
    <div>
      <PageHeader
        eyebrow="Manajemen persediaan"
        title="Inventaris"
        description="Kelola produk, harga, dan stok. Setiap perubahan stok tercatat permanen di buku besar persediaan."
        actions={
          <>
            {canViewMovements ? (
              <Button asChild variant="outline" size="sm" className="gap-1.5">
                <Link href="/inventory/movements">
                  <History className="size-3.5" />
                  Riwayat Stok
                </Link>
              </Button>
            ) : null}
            {canManage ? (
              <>
                <Button asChild variant="outline" size="sm" className="gap-1.5">
                  <Link href="/inventory/categories">
                    <Tags className="size-3.5" />
                    Kategori
                  </Link>
                </Button>
                <Button asChild size="sm" className="gap-1.5">
                  <Link href="/inventory/new">
                    <Plus className="size-3.5" />
                    Tambah Produk
                  </Link>
                </Button>
              </>
            ) : null}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard
          label="Total Produk"
          value={stats.totalProducts}
          icon={<Package className="size-4" />}
          hint={`${stats.activeProducts} produk aktif`}
        />
        <MetricCard
          label="Nilai Persediaan"
          value={stats.inventoryValue}
          variant="idr-compact"
          icon={<Wallet className="size-4" />}
          hint={`${formatQuantity(stats.totalStock)} unit tersimpan`}
        />
        <MetricCard
          label="Stok Menipis"
          value={stats.lowStock}
          icon={<TriangleAlert className="size-4" />}
          hint="Di bawah batas minimum"
          tone={stats.lowStock > 0 ? "warning" : "positive"}
        />
        <MetricCard
          label="Stok Habis"
          value={stats.outOfStock}
          icon={<Boxes className="size-4" />}
          hint="Perlu segera diisi ulang"
          tone={stats.outOfStock > 0 ? "danger" : "positive"}
        />
      </div>

      <SectionCard
        className="mt-4"
        title="Daftar Produk"
        description={`${list.total} produk ditemukan${hasFilters ? " untuk filter ini" : ""}.`}
        contentClassName="space-y-4"
      >
        <InventoryFilters
          categories={categories}
          q={q}
          categoryId={categoryId}
          status={status}
          sort={sort}
        />

        {list.items.length === 0 ? (
          <EmptyState
            title={hasFilters ? "Tidak ada produk yang cocok" : "Belum ada produk"}
            description={
              hasFilters
                ? "Coba ubah kata kunci atau filter status dan kategori."
                : "Tambahkan produk pertama Anda untuk mulai mengelola persediaan."
            }
            action={
              canManage && !hasFilters ? (
                <Button asChild size="sm" className="gap-1.5">
                  <Link href="/inventory/new">
                    <Plus className="size-3.5" />
                    Tambah Produk
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
                      Produk
                    </TableHead>
                    <TableHead className="text-[10.5px] uppercase tracking-wide">
                      Kategori
                    </TableHead>
                    <TableHead className="hidden text-right text-[10.5px] uppercase tracking-wide md:table-cell">
                      Harga Beli
                    </TableHead>
                    <TableHead className="text-right text-[10.5px] uppercase tracking-wide">
                      Harga Jual
                    </TableHead>
                    <TableHead className="text-right text-[10.5px] uppercase tracking-wide">
                      Stok
                    </TableHead>
                    <TableHead className="text-[10.5px] uppercase tracking-wide">
                      Status
                    </TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.items.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="max-w-[240px]">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/inventory/${product.id}`}
                            className="truncate text-[12.5px] font-medium hover:text-primary hover:underline"
                          >
                            {product.name}
                          </Link>
                          {!product.isActive ? (
                            <Badge
                              variant="outline"
                              className="border-border bg-muted text-[9px] text-muted-foreground"
                            >
                              Nonaktif
                            </Badge>
                          ) : null}
                        </div>
                        <p className="font-mono text-[10px] text-muted-foreground">
                          {product.sku}
                        </p>
                      </TableCell>
                      <TableCell className="text-[11.5px] text-muted-foreground">
                        {product.category?.name ?? "—"}
                      </TableCell>
                      <TableCell className="hidden text-right text-[11.5px] tabular-nums text-muted-foreground md:table-cell">
                        {formatIDR(product.purchasePrice)}
                      </TableCell>
                      <TableCell className="text-right text-[11.5px] font-medium tabular-nums">
                        {formatIDR(product.sellingPrice)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right text-[11.5px] tabular-nums">
                        {formatQuantity(product.stockQuantity, product.unit)}
                      </TableCell>
                      <TableCell>
                        <StockBadge
                          stock={product.stockQuantity}
                          minimum={product.minimumStock}
                          className="text-[9.5px]"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          asChild
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground"
                        >
                          <Link
                            href={
                              canManage
                                ? `/inventory/${product.id}/edit`
                                : `/inventory/${product.id}`
                            }
                            aria-label={
                              canManage ? "Ubah produk" : "Lihat detail produk"
                            }
                          >
                            {canManage ? (
                              <Pencil className="size-3.5" />
                            ) : (
                              <ChevronRight className="size-3.5" />
                            )}
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
