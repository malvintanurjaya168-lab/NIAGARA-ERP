"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownUp, Boxes } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { SubmitButton } from "@/components/shared/submit-button";
import { FieldError } from "@/components/shared/field-error";
import { adjustStockAction } from "@/lib/actions/inventory";
import { useActionFeedback } from "@/lib/hooks/use-action-feedback";
import { formatQuantity } from "@/lib/format";
import type { ActionResult } from "@/lib/errors";
import type { ProductWarehouseStock } from "@/lib/queries/warehouses";

interface StockAdjustDialogProps {
  productId: string;
  productName: string;
  unit: string;
  stock: number;
  warehouses: ProductWarehouseStock[];
}

const TYPES = [
  { value: "STOCK_IN", label: "Stok Masuk" },
  { value: "STOCK_OUT", label: "Stok Keluar" },
  { value: "ADJUSTMENT", label: "Penyesuaian (stok opname)" },
] as const;

export function StockAdjustDialog({
  productId,
  productName,
  unit,
  stock,
  warehouses,
}: StockAdjustDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [movementType, setMovementType] = useState("STOCK_IN");
  const defaultWarehouse =
    warehouses.find((warehouse) => warehouse.isDefault) ?? warehouses[0];
  const [warehouseId, setWarehouseId] = useState(
    defaultWarehouse?.warehouseId ?? "",
  );
  const selectedWarehouse =
    warehouses.find((warehouse) => warehouse.warehouseId === warehouseId) ??
    defaultWarehouse;
  const warehouseStock = selectedWarehouse?.quantity ?? 0;
  const [state, formAction] = useActionState<ActionResult | undefined, FormData>(
    adjustStockAction,
    undefined,
  );

  useActionFeedback(state, {
    successMessage: "Stok diperbarui.",
    onSuccess: () => {
      setOpen(false);
      router.refresh();
    },
  });

  const errors = state && !state.ok ? state.fieldErrors : undefined;

  const quantityLabel =
    movementType === "STOCK_IN"
      ? "Jumlah Masuk"
      : movementType === "STOCK_OUT"
        ? "Jumlah Keluar"
        : "Stok Fisik Baru";

  const helper =
    movementType === "STOCK_IN"
      ? "Jumlah ini akan ditambahkan ke stok saat ini."
      : movementType === "STOCK_OUT"
        ? "Jumlah ini akan dikurangi dari stok saat ini."
        : "Masukkan jumlah fisik hasil hitung ulang. Stok akan diset ke angka ini.";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <ArrowDownUp className="size-3.5" />
          Sesuaikan Stok
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Boxes className="size-4 text-primary" />
            Sesuaikan Stok
          </DialogTitle>
          <DialogDescription>
            {productName} · stok perusahaan{" "}
            <span className="font-medium text-foreground">
              {formatQuantity(stock, unit)}
            </span>
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="productId" value={productId} />
          <input type="hidden" name="warehouseId" value={warehouseId} />

          {warehouses.length > 1 ? (
            <div className="space-y-1.5">
              <Label htmlFor="warehouseId">Gudang</Label>
              <Select value={warehouseId} onValueChange={setWarehouseId}>
                <SelectTrigger id="warehouseId" className="w-full">
                  <SelectValue placeholder="Pilih gudang" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((warehouse) => (
                    <SelectItem
                      key={warehouse.warehouseId}
                      value={warehouse.warehouseId}
                    >
                      {warehouse.code} — {warehouse.name}
                      {warehouse.isDefault ? " (Default)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10.5px] text-muted-foreground">
                Stok gudang ini:{" "}
                <span className="font-medium text-foreground">
                  {formatQuantity(warehouseStock, unit)}
                </span>
              </p>
            </div>
          ) : selectedWarehouse ? (
            <p className="rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
              Gudang: <span className="font-medium text-foreground">{selectedWarehouse.name}</span>
              {" · "}stok gudang{" "}
              <span className="font-medium text-foreground">
                {formatQuantity(warehouseStock, unit)}
              </span>
            </p>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="movementType">Jenis Pergerakan</Label>
            <Select
              name="movementType"
              value={movementType}
              onValueChange={setMovementType}
            >
              <SelectTrigger id="movementType" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="quantity">{quantityLabel}</Label>
            <div className="relative">
              <Input
                key={warehouseId}
                id="quantity"
                name="quantity"
                type="number"
                min="0"
                step="0.001"
                defaultValue={
                  movementType === "ADJUSTMENT" ? warehouseStock : ""
                }
                placeholder="0"
                className="pr-14"
                required
                aria-invalid={Boolean(errors?.quantity)}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">
                {unit}
              </span>
            </div>
            <p className="text-[10.5px] text-muted-foreground">{helper}</p>
            <FieldError messages={errors?.quantity} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reason">Alasan / Catatan</Label>
            <Input
              id="reason"
              name="reason"
              placeholder="Contoh: Pembelian dari supplier"
              maxLength={200}
              required
              aria-invalid={Boolean(errors?.reason)}
            />
            <FieldError messages={errors?.reason} />
          </div>

          <DialogFooter className="gap-2 pt-1">
            <DialogClose asChild>
              <Button type="button" variant="ghost" size="sm">
                Batal
              </Button>
            </DialogClose>
            <SubmitButton size="sm" pendingText="Menyimpan…">
              Simpan
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
