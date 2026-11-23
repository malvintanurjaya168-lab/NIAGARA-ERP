import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, History } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { EmptyState } from "@/components/shared/empty-state";
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
import { MovementFilters } from "./movement-filters";
import { requirePagePermission } from "@/lib/auth-guards";
import { getStockMovements } from "@/lib/queries/inventory";
import {
  MOVEMENT_LABELS,
  MOVEMENT_TONES,
  STOCK_MOVEMENT_FILTERS,
  type StockMovementFilter,
} from "@/lib/constants";
import { formatDateTime, formatQuantity } from "@/lib/format";

export const metadata: Metadata = { title: "Riwayat Pergerakan Stok" };

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function single(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export default async function StockMovementsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requirePagePermission("inventory.movements");
  const params = await searchParams;

  const q = single(params.q);
  const rawType = single(params.type);
  const type = STOCK_MOVEMENT_FILTERS.includes(rawType as StockMovementFilter)
    ? (rawType as StockMovementFilter)
    : "all";
  const parsedPage = Number.parseInt(single(params.page), 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const list = await getStockMovements({
    companyId: user.companyId,
    q,
    type,
    page,
  });

  const hasFilters = Boolean(q || type !== "all");

  function buildHref(nextPage: number): string {
    const search = new URLSearchParams();
    if (q) search.set("q", q);
    if (type !== "all") search.set("type", type);
    if (nextPage > 1) search.set("page", String(nextPage));
    const query = search.toString();
    return query ? `/inventory/movements?${query}` : "/inventory/movements";
  }

  return (
    <div>
      <PageHeader
        eyebrow="Audit persediaan"
        title="Riwayat Pergerakan Stok"
        description="Buku besar stok yang tidak dapat diubah. Setiap stok masuk, keluar, penjualan, pembatalan, dan penyesuaian tercatat lengkap dengan saldo sebelum dan sesudah."
        actions={
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link href="/inventory">
              <ArrowLeft className="size-3.5" />
              Kembali ke Inventaris
            </Link>
          </Button>
        }
      />

      <SectionCard
        title="Buku Besar Stok"
        description={`${list.total} catatan ditemukan${hasFilters ? " untuk filter ini" : ""}.`}
        contentClassName="space-y-4"
        action={
          <span className="flex items-center gap-1 text-[10.5px] text-muted-foreground">
            <History className="size-3" />
            Kronologis terbaru
          </span>
        }
      >
        <MovementFilters q={q} type={type} />

        {list.items.length === 0 ? (
          <EmptyState
            title={hasFilters ? "Tidak ada pergerakan yang cocok" : "Belum ada pergerakan stok"}
            description={
              hasFilters
                ? "Coba ubah kata kunci atau jenis pergerakan."
                : "Stok masuk, keluar, penjualan, dan penyesuaian akan muncul di sini setelah aktivitas pertama tercatat."
            }
          />
        ) : (
          <>
            <div className="-mx-1 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-[10.5px] uppercase tracking-wide">
                      Waktu
                    </TableHead>
                    <TableHead className="text-[10.5px] uppercase tracking-wide">
                      Produk
                    </TableHead>
                    <TableHead className="text-[10.5px] uppercase tracking-wide">
                      Jenis
                    </TableHead>
                    <TableHead className="text-right text-[10.5px] uppercase tracking-wide">
                      Perubahan
                    </TableHead>
                    <TableHead className="text-right text-[10.5px] uppercase tracking-wide">
                      Saldo Stok
                    </TableHead>
                    <TableHead className="text-[10.5px] uppercase tracking-wide">
                      Catatan
                    </TableHead>
                    <TableHead className="text-[10.5px] uppercase tracking-wide">
                      Oleh
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.items.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell className="whitespace-nowrap text-[11px] text-muted-foreground">
                        {formatDateTime(movement.createdAt)}
                      </TableCell>
                      <TableCell className="max-w-[220px]">
                        <Link
                          href={`/inventory/${movement.product.id}`}
                          className="truncate text-[12.5px] font-medium hover:text-primary hover:underline"
                        >
                          {movement.product.name}
                        </Link>
                        <p className="font-mono text-[10px] text-muted-foreground">
                          {movement.product.sku}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`border text-[9px] font-medium ${
                            MOVEMENT_TONES[movement.movementType] ?? ""
                          }`}
                        >
                          {MOVEMENT_LABELS[movement.movementType] ??
                            movement.movementType}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className={`whitespace-nowrap text-right text-[11.5px] font-medium tabular-nums ${
                          movement.quantityDelta > 0
                            ? "text-emerald-600"
                            : movement.quantityDelta < 0
                              ? "text-rose-600"
                              : "text-muted-foreground"
                        }`}
                      >
                        {movement.quantityDelta > 0 ? "+" : ""}
                        {formatQuantity(
                          movement.quantityDelta,
                          movement.product.unit,
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right text-[11px] tabular-nums text-muted-foreground">
                        {formatQuantity(
                          movement.previousQuantity,
                          movement.product.unit,
                        )}{" "}
                        →{" "}
                        <span className="font-medium text-foreground">
                          {formatQuantity(
                            movement.newQuantity,
                            movement.product.unit,
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[240px]">
                        <span className="line-clamp-2 text-[11px]">
                          {movement.reason}
                        </span>
                        {movement.referenceId ? (
                          <p className="mt-0.5 font-mono text-[9.5px] text-muted-foreground">
                            {movement.referenceType ?? "REF"} ·{" "}
                            {movement.referenceId.slice(0, 8)}
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-[11px] text-muted-foreground">
                        {movement.createdBy}
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
