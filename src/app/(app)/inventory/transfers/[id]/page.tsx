import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  Ban,
  CalendarClock,
  CheckCircle2,
  StickyNote,
  UserRound,
  Warehouse,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
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
import { requirePagePermission } from "@/lib/auth-guards";
import { getTransferDetail } from "@/lib/queries/transfers";
import { formatDateTime, formatQuantity } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Detail Transfer" };

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
};

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "border-amber-500/25 bg-amber-500/10 text-amber-700",
  COMPLETED: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700",
  CANCELLED: "border-border bg-muted text-muted-foreground",
};

export default async function TransferDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePagePermission("transfers.view");
  const { id } = await params;
  const transfer = await getTransferDetail(user.companyId, id);

  if (!transfer) notFound();

  return (
    <div>
      <PageHeader
        eyebrow="Transfer Stok"
        title={transfer.transferNumber}
        description={`${formatDateTime(transfer.createdAt)} · oleh ${transfer.createdByName}`}
        actions={
          <Button asChild variant="ghost" size="sm" className="gap-1.5">
            <Link href="/inventory/transfers">
              <ArrowLeft className="size-3.5" />
              Kembali
            </Link>
          </Button>
        }
      />

      {transfer.status === "CANCELLED" ? (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-border bg-muted/50 px-4 py-3">
          <Ban className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-[12.5px] font-semibold">Transfer dibatalkan</p>
            <p className="mt-0.5 text-[11.5px] text-muted-foreground">
              {transfer.cancelledAt
                ? `Dibatalkan ${formatDateTime(transfer.cancelledAt)}`
                : ""}
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-3">
        <SectionCard
          className="xl:col-span-2"
          title="Rincian Transfer"
          description="Produk yang dipindahkan beserta jumlahnya."
          action={
            <Badge
              variant="outline"
              className={cn(
                "border px-1.5 py-0 text-[10px] font-medium",
                STATUS_STYLES[transfer.status] ?? STATUS_STYLES.CANCELLED,
              )}
            >
              {STATUS_LABELS[transfer.status] ?? transfer.status}
            </Badge>
          }
          contentClassName="p-0 sm:p-0"
        >
          <div className="border-b border-border/70 px-4 py-4">
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-center sm:gap-6">
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/8 text-primary">
                  <Warehouse className="size-4" />
                </span>
                <div>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {transfer.fromWarehouse.code}
                  </p>
                  <p className="text-[13px] font-semibold">
                    {transfer.fromWarehouse.name}
                  </p>
                </div>
              </div>
              <ArrowLeftRight className="hidden size-4 text-muted-foreground sm:block" />
              <ArrowRight className="size-4 text-muted-foreground sm:hidden" />
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600">
                  <Warehouse className="size-4" />
                </span>
                <div>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {transfer.toWarehouse.code}
                  </p>
                  <p className="text-[13px] font-semibold">
                    {transfer.toWarehouse.name}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto px-4 py-3">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[10.5px] uppercase tracking-wide">
                    Produk
                  </TableHead>
                  <TableHead className="text-[10.5px] uppercase tracking-wide">
                    SKU
                  </TableHead>
                  <TableHead className="text-right text-[10.5px] uppercase tracking-wide">
                    Jumlah
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfer.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-[12px] font-medium">
                      {item.name}
                    </TableCell>
                    <TableCell className="font-mono text-[10.5px] text-muted-foreground">
                      {item.sku}
                    </TableCell>
                    <TableCell className="text-right text-[12px] font-medium tabular-nums">
                      {formatQuantity(item.quantity, item.unit)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </SectionCard>

        <div className="space-y-4">
          <SectionCard title="Informasi Transfer">
            <div className="space-y-3">
              <InfoRow
                icon={<CalendarClock className="size-3.5" />}
                label="Dibuat"
              >
                {formatDateTime(transfer.createdAt)}
              </InfoRow>
              <InfoRow icon={<UserRound className="size-3.5" />} label="Oleh">
                {transfer.createdByName}
              </InfoRow>
              {transfer.completedAt ? (
                <InfoRow
                  icon={<CheckCircle2 className="size-3.5" />}
                  label="Selesai"
                >
                  {formatDateTime(transfer.completedAt)}
                </InfoRow>
              ) : null}
              {transfer.note ? (
                <InfoRow icon={<StickyNote className="size-3.5" />} label="Catatan">
                  <span className="text-right">{transfer.note}</span>
                </InfoRow>
              ) : null}
            </div>
          </SectionCard>
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
