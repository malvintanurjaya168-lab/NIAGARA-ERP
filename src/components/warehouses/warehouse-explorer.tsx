"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MapPin,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Star,
  Warehouse,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  activateWarehouseAction,
  deactivateWarehouseAction,
  setDefaultWarehouseAction,
} from "@/lib/actions/warehouses";
import type { ActionResult } from "@/lib/errors";
import type { WarehouseRow } from "@/lib/queries/warehouses";
import { useActionFeedback } from "@/lib/hooks/use-action-feedback";
import { WarehouseFormDialog } from "@/components/warehouses/warehouse-form-dialog";

type StatusFilter = "all" | "active" | "inactive";
type ConfirmKind = "deactivate" | "setDefault" | null;

interface WarehouseExplorerProps {
  warehouses: WarehouseRow[];
  canManage: boolean;
}

export function WarehouseExplorer({
  warehouses,
  canManage,
}: WarehouseExplorerProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<WarehouseRow | null>(null);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return warehouses.filter((warehouse) => {
      if (statusFilter === "active" && !warehouse.isActive) return false;
      if (statusFilter === "inactive" && warehouse.isActive) return false;
      if (
        search &&
        !warehouse.code.toLowerCase().includes(search) &&
        !warehouse.name.toLowerCase().includes(search) &&
        !(warehouse.address ?? "").toLowerCase().includes(search)
      ) {
        return false;
      }
      return true;
    });
  }, [warehouses, query, statusFilter]);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(warehouse: WarehouseRow) {
    setEditing(warehouse);
    setFormOpen(true);
  }

  return (
    <>
      <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari kode, nama, atau alamat…"
              aria-label="Cari gudang"
              className="h-9 pl-9"
            />
          </div>

          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as StatusFilter)}
          >
            <SelectTrigger className="h-9 w-[130px] text-[12px]">
              <SelectValue placeholder="Semua status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="active">Aktif</SelectItem>
              <SelectItem value="inactive">Nonaktif</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {canManage ? (
          <Button size="sm" className="gap-1.5" onClick={openCreate}>
            <Plus className="size-3.5" />
            Gudang Baru
          </Button>
        ) : null}
      </div>

      <SectionCard
        title="Daftar Gudang"
        description={`${filtered.length} gudang ditampilkan dari ${warehouses.length} gudang terdaftar.`}
      >
        {warehouses.length === 0 ? (
          <EmptyState
            icon={<Warehouse className="size-5" />}
            title="Belum ada gudang"
            description={
              canManage
                ? "Tambahkan lokasi penyimpanan pertama untuk perusahaan Anda."
                : "Belum ada gudang terdaftar untuk perusahaan ini."
            }
            action={
              canManage ? (
                <Button size="sm" className="gap-1.5" onClick={openCreate}>
                  <Plus className="size-3.5" />
                  Gudang Baru
                </Button>
              ) : undefined
            }
            className="border-0 bg-transparent py-10"
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Search className="size-5" />}
            title="Tidak ada gudang yang cocok"
            description="Coba ubah kata kunci atau filter yang dipilih."
            className="border-0 bg-transparent py-10"
          />
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[720px]">
              <div className="flex items-center gap-3 border-b border-border/70 px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                <span className="min-w-0 flex-1">Kode & Nama Gudang</span>
                <span className="hidden w-[110px] lg:block">Produk</span>
                <span className="w-[80px]">Status</span>
                <span className="hidden w-[110px] sm:block">Tanggal Dibuat</span>
                <span className="w-9" />
              </div>
              <ul className="divide-y divide-border/50">
                {filtered.map((warehouse) => (
                  <WarehouseRowItem
                    key={warehouse.id}
                    warehouse={warehouse}
                    canManage={canManage}
                    onEdit={openEdit}
                  />
                ))}
              </ul>
            </div>
          </div>
        )}
      </SectionCard>

      <WarehouseFormDialog
        key={editing?.id ?? "new"}
        open={formOpen}
        onOpenChange={setFormOpen}
        warehouse={editing}
      />
    </>
  );
}

function WarehouseRowItem({
  warehouse,
  canManage,
  onEdit,
}: {
  warehouse: WarehouseRow;
  canManage: boolean;
  onEdit: (warehouse: WarehouseRow) => void;
}) {
  const [confirm, setConfirm] = useState<ConfirmKind>(null);

  return (
    <li className="flex items-center gap-3 px-3 py-2.5">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="w-[86px] shrink-0 font-mono text-[11.5px] font-medium text-foreground">
          {warehouse.code}
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[12.5px] font-medium text-foreground">
              {warehouse.name}
            </span>
            {warehouse.isDefault ? (
              <Badge
                variant="outline"
                className="border-amber-500/30 bg-amber-500/10 px-1.5 py-0 text-[9.5px] font-medium text-amber-700"
              >
                <Star className="mr-0.5 size-2.5 fill-amber-500 text-amber-500" />
                Default
              </Badge>
            ) : null}
          </div>
          {warehouse.address ? (
            <p className="mt-0.5 flex items-center gap-1 truncate text-[10.5px] text-muted-foreground">
              <MapPin className="size-3 shrink-0" />
              {warehouse.address}
            </p>
          ) : null}
        </div>
      </div>

      <span className="hidden w-[110px] text-[11.5px] text-muted-foreground lg:block">
        {warehouse.productCount} produk
      </span>

      <span className="w-[80px]">
        <Badge
          variant="outline"
          className={cn(
            "border px-1.5 py-0 text-[9.5px] font-medium",
            warehouse.isActive
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
              : "border-border bg-muted text-muted-foreground",
          )}
        >
          {warehouse.isActive ? "Aktif" : "Nonaktif"}
        </Badge>
      </span>

      <span className="hidden w-[110px] text-[11px] text-muted-foreground sm:block">
        {new Date(warehouse.createdAt).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}
      </span>

      <span className="flex w-9 justify-end">
        {canManage ? (
          <RowActions
            warehouse={warehouse}
            onEdit={onEdit}
            onConfirm={setConfirm}
          />
        ) : null}
      </span>

      <ConfirmDeactivateDialog
        warehouse={warehouse}
        open={confirm === "deactivate"}
        onOpenChange={(open) => setConfirm(open ? "deactivate" : null)}
      />
      <ConfirmSetDefaultDialog
        warehouse={warehouse}
        open={confirm === "setDefault"}
        onOpenChange={(open) => setConfirm(open ? "setDefault" : null)}
      />
    </li>
  );
}

function RowActions({
  warehouse,
  onEdit,
  onConfirm,
}: {
  warehouse: WarehouseRow;
  onEdit: (warehouse: WarehouseRow) => void;
  onConfirm: (kind: ConfirmKind) => void;
}) {
  const router = useRouter();
  const toggleAction = warehouse.isActive
    ? deactivateWarehouseAction
    : activateWarehouseAction;
  const [toggleState, toggleFormAction] = useActionState<
    ActionResult | undefined,
    FormData
  >(toggleAction, undefined);
  const toggleFormRef = useRef<HTMLFormElement>(null);

  useActionFeedback(toggleState, {
    onSuccess: () => router.refresh(),
  });

  return (
    <>
      <form ref={toggleFormRef} action={toggleFormAction} className="hidden">
        <input type="hidden" name="warehouseId" value={warehouse.id} />
      </form>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground"
            aria-label={`Aksi gudang ${warehouse.code}`}
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onSelect={() => onEdit(warehouse)}>
            <Pencil className="size-3.5" />
            Ubah Gudang
          </DropdownMenuItem>
          {!warehouse.isDefault && warehouse.isActive ? (
            <DropdownMenuItem onSelect={() => onConfirm("setDefault")}>
              <Star className="size-3.5" />
              Jadikan Default
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          {warehouse.isActive ? (
            <DropdownMenuItem
              onSelect={() => {
                if (warehouse.isDefault) {
                  onConfirm("deactivate");
                } else {
                  toggleFormRef.current?.requestSubmit();
                }
              }}
              className="text-destructive"
            >
              Nonaktifkan
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onSelect={() => toggleFormRef.current?.requestSubmit()}
            >
              Aktifkan
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

function ConfirmDeactivateDialog({
  warehouse,
  open,
  onOpenChange,
}: {
  warehouse: WarehouseRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState<
    ActionResult | undefined,
    FormData
  >(deactivateWarehouseAction, undefined);

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
          <AlertDialogTitle>Nonaktifkan gudang ini?</AlertDialogTitle>
          <AlertDialogDescription>
            Gudang &quot;{warehouse.code} - {warehouse.name}&quot; tidak akan
            dapat dipakai untuk transaksi baru. Data stok historis tetap
            tersimpan.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form action={formAction}>
          <input type="hidden" name="warehouseId" value={warehouse.id} />
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Batal</AlertDialogCancel>
            <SubmitButton size="sm" pendingText="Menonaktifkan…">
              Nonaktifkan
            </SubmitButton>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ConfirmSetDefaultDialog({
  warehouse,
  open,
  onOpenChange,
}: {
  warehouse: WarehouseRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState<
    ActionResult | undefined,
    FormData
  >(setDefaultWarehouseAction, undefined);

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
          <AlertDialogTitle>Jadikan gudang default?</AlertDialogTitle>
          <AlertDialogDescription>
            Gudang &quot;{warehouse.code} - {warehouse.name}&quot; akan menjadi
            gudang utama perusahaan. Gudang default sebelumnya akan dilepas.
            Saldo stok tidak berubah.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form action={formAction}>
          <input type="hidden" name="warehouseId" value={warehouse.id} />
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Batal</AlertDialogCancel>
            <SubmitButton size="sm" pendingText="Menetapkan…">
              Tetapkan Default
            </SubmitButton>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
