"use client";

import { useActionState, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftRight,
  ArrowRight,
  Package,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/shared/submit-button";
import { createTransferAction } from "@/lib/actions/transfers";
import type { ActionResult } from "@/lib/errors";
import type { WarehouseOption } from "@/lib/queries/warehouses";
import type { TransferProductOption } from "@/lib/queries/transfers";
import { useActionFeedback } from "@/lib/hooks/use-action-feedback";
import { formatQuantity } from "@/lib/format";

interface TransferLine {
  key: number;
  productId: string;
  quantity: string;
}

let lineKey = 0;

export function TransferFormDialog({
  open,
  onOpenChange,
  warehouses,
  products,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouses: WarehouseOption[];
  products: TransferProductOption[];
}) {
  const router = useRouter();
  const [fromWarehouseId, setFromWarehouseId] = useState("");
  const [toWarehouseId, setToWarehouseId] = useState("");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<TransferLine[]>([
    { key: ++lineKey, productId: "", quantity: "" },
  ]);

  const [state, formAction] = useActionState<
    ActionResult | undefined,
    FormData
  >(createTransferAction, undefined);

  useActionFeedback(state, {
    onSuccess: () => {
      onOpenChange(false);
      router.refresh();
    },
  });

  const productMap = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );

  const fromWarehouse = warehouses.find((w) => w.id === fromWarehouseId);
  const toWarehouse = warehouses.find((w) => w.id === toWarehouseId);

  const validLines = lines.filter(
    (line) => line.productId && Number(line.quantity) > 0,
  );

  const canSubmit =
    Boolean(fromWarehouseId) &&
    Boolean(toWarehouseId) &&
    fromWarehouseId !== toWarehouseId &&
    validLines.length > 0 &&
    warehouses.length >= 2;

  function updateLine(key: number, patch: Partial<TransferLine>) {
    setLines((previous) =>
      previous.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
  }

  function addLine() {
    setLines((previous) => [
      ...previous,
      { key: ++lineKey, productId: "", quantity: "" },
    ]);
  }

  function removeLine(key: number) {
    setLines((previous) =>
      previous.length > 1
        ? previous.filter((line) => line.key !== key)
        : previous,
    );
  }

  function stockFor(productId: string): number {
    if (!fromWarehouseId) return 0;
    return productMap.get(productId)?.stocks[fromWarehouseId] ?? 0;
  }

  const itemsJson = JSON.stringify(
    validLines.map((line) => ({
      productId: line.productId,
      quantity: Number(line.quantity),
    })),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="size-4 text-primary" />
            Transfer Stok Baru
          </DialogTitle>
          <DialogDescription>
            Buat draft transfer antar gudang. Stok baru berpindah setelah
            transfer diselesaikan.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="fromWarehouseId" value={fromWarehouseId} />
          <input type="hidden" name="toWarehouseId" value={toWarehouseId} />
          <input type="hidden" name="note" value={note} />
          <input type="hidden" name="items" value={itemsJson} />

          <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
            <div className="space-y-1.5">
              <Label>Gudang Asal</Label>
              <Select value={fromWarehouseId} onValueChange={setFromWarehouseId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih gudang asal" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((warehouse) => (
                    <SelectItem
                      key={warehouse.id}
                      value={warehouse.id}
                      disabled={warehouse.id === toWarehouseId}
                    >
                      {warehouse.code} — {warehouse.name}
                      {warehouse.isDefault ? " (Default)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <ArrowRight className="mx-auto mb-2 hidden size-4 text-muted-foreground sm:block" />
            <div className="space-y-1.5">
              <Label>Gudang Tujuan</Label>
              <Select value={toWarehouseId} onValueChange={setToWarehouseId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih gudang tujuan" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((warehouse) => (
                    <SelectItem
                      key={warehouse.id}
                      value={warehouse.id}
                      disabled={warehouse.id === fromWarehouseId}
                    >
                      {warehouse.code} — {warehouse.name}
                      {warehouse.isDefault ? " (Default)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Produk</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-[11.5px]"
                onClick={addLine}
              >
                <Plus className="size-3.5" />
                Tambah Produk
              </Button>
            </div>

            <div className="space-y-2">
              {lines.map((line) => {
                const product = productMap.get(line.productId);
                const available = stockFor(line.productId);
                const qty = Number(line.quantity);
                const overStock =
                  line.productId !== "" && qty > 0 && qty > available;
                return (
                  <div
                    key={line.key}
                    className="grid grid-cols-[1fr_96px_28px] items-center gap-2"
                  >
                    <div className="min-w-0">
                      <Select
                        value={line.productId}
                        onValueChange={(value) =>
                          updateLine(line.key, { productId: value })
                        }
                      >
                        <SelectTrigger className="h-9 w-full text-[12px]">
                          <SelectValue placeholder="Pilih produk" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((option) => (
                            <SelectItem key={option.id} value={option.id}>
                              {option.sku} — {option.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {line.productId ? (
                        <p
                          className={
                            overStock
                              ? "mt-1 text-[10px] font-medium text-destructive"
                              : "mt-1 text-[10px] text-muted-foreground"
                          }
                        >
                          Stok {fromWarehouse?.name ?? "gudang asal"}:{" "}
                          {formatQuantity(available, product?.unit ?? "")}
                          {overStock ? " — melebihi stok tersedia" : ""}
                        </p>
                      ) : null}
                    </div>
                    <Input
                      type="number"
                      min="0"
                      step="0.001"
                      inputMode="decimal"
                      value={line.quantity}
                      onChange={(event) =>
                        updateLine(line.key, { quantity: event.target.value })
                      }
                      placeholder="Qty"
                      className="h-9 text-[12px]"
                      aria-label="Jumlah"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground hover:text-destructive"
                      onClick={() => removeLine(line.key)}
                      disabled={lines.length <= 1}
                      aria-label="Hapus baris"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="transfer-note">Catatan (opsional)</Label>
            <Textarea
              id="transfer-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Contoh: Restock cabang…"
              rows={2}
              maxLength={300}
            />
          </div>

          {validLines.length > 0 ? (
            <div className="rounded-lg border border-border/70 bg-muted/40 p-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Ringkasan Transfer
              </p>
              <ul className="space-y-1">
                {validLines.map((line) => {
                  const product = productMap.get(line.productId);
                  return (
                    <li
                      key={line.key}
                      className="flex items-center justify-between gap-2 text-[11.5px]"
                    >
                      <span className="flex min-w-0 items-center gap-1.5">
                        <Package className="size-3 shrink-0 text-muted-foreground" />
                        <span className="truncate">
                          {product ? `${product.sku} — ${product.name}` : line.productId}
                        </span>
                      </span>
                      <span className="shrink-0 font-medium tabular-nums">
                        {formatQuantity(Number(line.quantity), product?.unit ?? "")}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-2 border-t border-border/60 pt-2 text-[10.5px] text-muted-foreground">
                {fromWarehouse?.name ?? "?"} → {toWarehouse?.name ?? "?"} ·{" "}
                {validLines.length} produk · Total stok perusahaan tidak berubah.
              </p>
            </div>
          ) : null}

          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Batal
            </Button>
            <SubmitButton
              size="sm"
              pendingText="Menyimpan…"
              disabled={!canSubmit}
            >
              Buat Draft Transfer
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
