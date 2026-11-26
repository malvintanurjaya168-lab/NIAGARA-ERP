"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
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
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/shared/submit-button";
import { FieldError } from "@/components/shared/field-error";
import {
  createWarehouseAction,
  updateWarehouseAction,
} from "@/lib/actions/warehouses";
import { useActionFeedback } from "@/lib/hooks/use-action-feedback";
import type { ActionResult } from "@/lib/errors";
import type { WarehouseRow } from "@/lib/queries/warehouses";

interface WarehouseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouse: WarehouseRow | null;
}

export function WarehouseFormDialog({
  open,
  onOpenChange,
  warehouse,
}: WarehouseFormDialogProps) {
  const router = useRouter();
  const [state, formAction] = useActionState<
    ActionResult | undefined,
    FormData
  >(warehouse ? updateWarehouseAction : createWarehouseAction, undefined);

  useActionFeedback(state, {
    successMessage: "Gudang disimpan.",
    onSuccess: () => {
      onOpenChange(false);
      router.refresh();
    },
  });

  const errors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>
            {warehouse ? `Ubah Gudang ${warehouse.code}` : "Gudang Baru"}
          </DialogTitle>
          <DialogDescription>
            {warehouse
              ? "Perbarui kode, nama, dan alamat gudang."
              : "Tambahkan lokasi penyimpanan baru untuk perusahaan."}
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          {warehouse ? (
            <input type="hidden" name="warehouseId" value={warehouse.id} />
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="warehouse-code">Kode Gudang</Label>
              <Input
                id="warehouse-code"
                name="code"
                defaultValue={warehouse?.code}
                placeholder="Contoh: GUD-02"
                maxLength={20}
                required
                aria-invalid={Boolean(errors?.code)}
              />
              <FieldError messages={errors?.code} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="warehouse-name">Nama Gudang</Label>
              <Input
                id="warehouse-name"
                name="name"
                defaultValue={warehouse?.name}
                placeholder="Contoh: Gudang Cabang"
                maxLength={120}
                required
                aria-invalid={Boolean(errors?.name)}
              />
              <FieldError messages={errors?.name} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="warehouse-address">Alamat (opsional)</Label>
            <Textarea
              id="warehouse-address"
              name="address"
              defaultValue={warehouse?.address ?? ""}
              placeholder="Alamat atau keterangan lokasi gudang"
              maxLength={300}
              rows={3}
              aria-invalid={Boolean(errors?.address)}
            />
            <FieldError messages={errors?.address} />
          </div>

          <DialogFooter className="gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Batal
            </Button>
            <SubmitButton size="sm" pendingText="Menyimpan…">
              {warehouse ? "Simpan Perubahan" : "Tambah Gudang"}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
