"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeftRight,
  ArrowRight,
  CheckCircle2,
  Eye,
  Package,
  Plus,
  Search,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SectionCard } from "@/components/shared/section-card";
import { EmptyState } from "@/components/shared/empty-state";
import { SubmitButton } from "@/components/shared/submit-button";
import { cn } from "@/lib/utils";
import {
  cancelTransferAction,
  completeTransferAction,
} from "@/lib/actions/transfers";
import type { ActionResult } from "@/lib/errors";
import type { TransferRow } from "@/lib/queries/transfers";
import type { WarehouseOption } from "@/lib/queries/warehouses";
import type { TransferProductOption } from "@/lib/queries/transfers";
import { useActionFeedback } from "@/lib/hooks/use-action-feedback";
import { TransferFormDialog } from "@/components/transfers/transfer-form-dialog";
import { formatDateTime, formatNumber } from "@/lib/format";

type StatusFilter = "all" | "DRAFT" | "COMPLETED" | "CANCELLED";
type ConfirmKind = "complete" | "cancel" | null;

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

export function TransferExplorer({
  transfers,
  warehouses,
  products,
  canManage,
}: {
  transfers: TransferRow[];
  warehouses: WarehouseOption[];
  products: TransferProductOption[];
  canManage: boolean;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [formOpen, setFormOpen] = useState(false);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return transfers.filter((transfer) => {
      if (statusFilter !== "all" && transfer.status !== statusFilter) return false;
      if (
        search &&
        !transfer.transferNumber.toLowerCase().includes(search) &&
        !transfer.fromWarehouse.name.toLowerCase().includes(search) &&
        !transfer.toWarehouse.name.toLowerCase().includes(search)
      ) {
        return false;
      }
      return true;
    });
  }, [transfers, query, statusFilter]);

  return (
    <>
      <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari no. transfer atau gudang…"
              aria-label="Cari transfer"
              className="h-9 pl-9"
            />
          </div>

          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as StatusFilter)}
          >
            <SelectTrigger className="h-9 w-[140px] text-[12px]">
              <SelectValue placeholder="Semua status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="COMPLETED">Selesai</SelectItem>
              <SelectItem value="CANCELLED">Dibatalkan</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {canManage ? (
          <Button size="sm" className="gap-1.5" onClick={() => setFormOpen(true)}>
            <Plus className="size-3.5" />
            Transfer Baru
          </Button>
        ) : null}
      </div>

      <SectionCard
        title="Riwayat Transfer"
        description={`${filtered.length} transfer ditampilkan dari ${transfers.length} transfer terdaftar.`}
      >
        {transfers.length === 0 ? (
          <EmptyState
            icon={<ArrowLeftRight className="size-5" />}
            title="Belum ada transfer"
            description={
              canManage
                ? "Buat transfer stok pertama antar gudang perusahaan Anda."
                : "Belum ada transfer stok yang tercatat."
            }
            action={
              canManage ? (
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setFormOpen(true)}
                >
                  <Plus className="size-3.5" />
                  Transfer Baru
                </Button>
              ) : undefined
            }
            className="border-0 bg-transparent py-10"
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Search className="size-5" />}
            title="Tidak ada transfer yang cocok"
            description="Coba ubah kata kunci atau filter status."
            className="border-0 bg-transparent py-10"
          />
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[860px]">
              <div className="flex items-center gap-3 border-b border-border/70 px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                <span className="min-w-0 flex-1">Transfer</span>
                <span className="hidden w-[150px] lg:block">Rute</span>
                <span className="hidden w-[90px] xl:block">Item</span>
                <span className="hidden w-[130px] md:block">Tanggal</span>
                <span className="hidden w-[120px] xl:block">Oleh</span>
                <span className="w-[90px]">Status</span>
                <span className="w-[110px]" />
              </div>
              <ul className="divide-y divide-border/50">
                {filtered.map((transfer) => (
                  <TransferRowItem
                    key={transfer.id}
                    transfer={transfer}
                    canManage={canManage}
                  />
                ))}
              </ul>
            </div>
          </div>
        )}
      </SectionCard>

      <TransferFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        warehouses={warehouses}
        products={products}
      />
    </>
  );
}

function TransferRowItem({
  transfer,
  canManage,
}: {
  transfer: TransferRow;
  canManage: boolean;
}) {
  const [confirm, setConfirm] = useState<ConfirmKind>(null);
  const isDraft = transfer.status === "DRAFT";

  return (
    <li className="flex items-center gap-3 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Link
            href={`/inventory/transfers/${transfer.id}`}
            className="font-mono text-[11.5px] font-medium text-primary hover:underline"
          >
            {transfer.transferNumber}
          </Link>
          {transfer.note ? (
            <span className="truncate text-[10.5px] text-muted-foreground">
              · {transfer.note}
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 flex items-center gap-1 text-[10.5px] text-muted-foreground lg:hidden">
          {transfer.fromWarehouse.code}
          <ArrowRight className="size-3" />
          {transfer.toWarehouse.code}
        </p>
      </div>

      <span className="hidden w-[150px] items-center gap-1 text-[11px] text-muted-foreground lg:flex">
        <span className="truncate">{transfer.fromWarehouse.name}</span>
        <ArrowRight className="size-3 shrink-0" />
        <span className="truncate">{transfer.toWarehouse.name}</span>
      </span>

      <span className="hidden w-[90px] items-center gap-1 text-[11px] text-muted-foreground xl:flex">
        <Package className="size-3" />
        {formatNumber(transfer.itemCount)}
      </span>

      <span className="hidden w-[130px] text-[11px] text-muted-foreground md:block">
        {formatDateTime(transfer.createdAt)}
      </span>

      <span className="hidden w-[120px] truncate text-[11px] text-muted-foreground xl:block">
        {transfer.createdByName}
      </span>

      <span className="w-[90px]">
        <Badge
          variant="outline"
          className={cn(
            "border px-1.5 py-0 text-[9.5px] font-medium",
            STATUS_STYLES[transfer.status] ?? STATUS_STYLES.CANCELLED,
          )}
        >
          {STATUS_LABELS[transfer.status] ?? transfer.status}
        </Badge>
      </span>

      <span className="flex w-[110px] items-center justify-end gap-1">
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground"
        >
          <Link
            href={`/inventory/transfers/${transfer.id}`}
            aria-label={`Lihat ${transfer.transferNumber}`}
          >
            <Eye className="size-3.5" />
          </Link>
        </Button>
        {canManage && isDraft ? (
          <>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 text-emerald-600 hover:text-emerald-700"
              onClick={() => setConfirm("complete")}
              aria-label={`Selesaikan ${transfer.transferNumber}`}
            >
              <CheckCircle2 className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-destructive"
              onClick={() => setConfirm("cancel")}
              aria-label={`Batalkan ${transfer.transferNumber}`}
            >
              <XCircle className="size-3.5" />
            </Button>
          </>
        ) : null}
      </span>

      <ConfirmCompleteDialog
        transfer={transfer}
        open={confirm === "complete"}
        onOpenChange={(open) => setConfirm(open ? "complete" : null)}
      />
      <ConfirmCancelDialog
        transfer={transfer}
        open={confirm === "cancel"}
        onOpenChange={(open) => setConfirm(open ? "cancel" : null)}
      />
    </li>
  );
}

function ConfirmCompleteDialog({
  transfer,
  open,
  onOpenChange,
}: {
  transfer: TransferRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState<
    ActionResult | undefined,
    FormData
  >(completeTransferAction, undefined);

  useActionFeedback(state, {
    onSuccess: () => {
      onOpenChange(false);
      router.refresh();
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Selesaikan transfer ini?</AlertDialogTitle>
          <AlertDialogDescription>
            Stok akan dipindahkan dari {transfer.fromWarehouse.name} ke{" "}
            {transfer.toWarehouse.name} untuk {formatNumber(transfer.itemCount)}{" "}
            produk. Total stok perusahaan tidak berubah. Tindakan ini tidak
            dapat dibatalkan.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form action={formAction}>
          <input type="hidden" name="transferId" value={transfer.id} />
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Kembali</AlertDialogCancel>
            <SubmitButton size="sm" pendingText="Memproses…">
              Selesaikan Transfer
            </SubmitButton>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ConfirmCancelDialog({
  transfer,
  open,
  onOpenChange,
}: {
  transfer: TransferRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState<
    ActionResult | undefined,
    FormData
  >(cancelTransferAction, undefined);

  useActionFeedback(state, {
    onSuccess: () => {
      onOpenChange(false);
      router.refresh();
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Batalkan draft transfer?</AlertDialogTitle>
          <AlertDialogDescription>
            Draft {transfer.transferNumber} akan ditandai dibatalkan dan tidak
            dapat diselesaikan. Stok tidak berubah karena transfer belum
            diproses.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form action={formAction}>
          <input type="hidden" name="transferId" value={transfer.id} />
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Kembali</AlertDialogCancel>
            <SubmitButton size="sm" variant="destructive" pendingText="Membatalkan…">
              Batalkan Draft
            </SubmitButton>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
