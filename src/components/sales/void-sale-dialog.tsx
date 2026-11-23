"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/shared/submit-button";
import { FieldError } from "@/components/shared/field-error";
import { voidSaleAction } from "@/lib/actions/sales";
import { useActionFeedback } from "@/lib/hooks/use-action-feedback";
import type { ActionResult } from "@/lib/errors";

export function VoidSaleDialog({
  saleId,
  transactionNumber,
}: {
  saleId: string;
  transactionNumber: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<ActionResult | undefined, FormData>(
    voidSaleAction,
    undefined,
  );

  useActionFeedback(state, {
    successMessage: "Transaksi dibatalkan.",
    onSuccess: () => {
      setOpen(false);
      router.refresh();
    },
  });

  const errors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" className="gap-1.5">
          <Ban className="size-3.5" />
          Batalkan Transaksi
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Batalkan {transactionNumber}?</AlertDialogTitle>
          <AlertDialogDescription>
            Transaksi akan ditandai dibatalkan, tidak lagi dihitung sebagai
            pendapatan, dan seluruh stok produk dikembalikan. Tindakan ini
            tercatat permanen dan tidak dapat diurungkan.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <form action={formAction} className="space-y-3">
          <input type="hidden" name="saleId" value={saleId} />
          <div className="space-y-1.5">
            <Label htmlFor="void-reason">Alasan Pembatalan</Label>
            <Textarea
              id="void-reason"
              name="reason"
              placeholder="Contoh: Salah input metode pembayaran"
              rows={3}
              maxLength={300}
              required
              aria-invalid={Boolean(errors?.reason)}
            />
            <FieldError messages={errors?.reason} />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel type="button">Kembali</AlertDialogCancel>
            <SubmitButton
              size="sm"
              variant="destructive"
              pendingText="Membatalkan…"
            >
              Ya, Batalkan
            </SubmitButton>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
