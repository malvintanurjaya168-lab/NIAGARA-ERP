"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  CircleMinus,
  FileSpreadsheet,
  Plus,
  XCircle,
} from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SubmitButton } from "@/components/shared/submit-button";
import { applyCoaTemplateAction } from "@/lib/actions/accounts";
import {
  ACCOUNT_TYPE_LABELS,
  type AccountTypeValue,
} from "@/lib/constants";
import type { CoaTemplatePlanItem } from "@/lib/accounts-template";
import { useActionFeedback } from "@/lib/hooks/use-action-feedback";
import type { ActionResult } from "@/lib/errors";
import { cn } from "@/lib/utils";

interface TemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preview: CoaTemplatePlanItem[];
}

const STATUS_META: Record<
  CoaTemplatePlanItem["status"],
  { label: string; className: string }
> = {
  create: {
    label: "Akan dibuat",
    className: "text-sky-600",
  },
  exists: {
    label: "Sudah ada",
    className: "text-emerald-600",
  },
  conflict: {
    label: "Konflik kode",
    className: "text-amber-600",
  },
  blocked: {
    label: "Dilewati",
    className: "text-muted-foreground",
  },
};

export function TemplateDialog({
  open,
  onOpenChange,
  preview,
}: TemplateDialogProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const router = useRouter();
  const [state, formAction] = useActionState<
    ActionResult | undefined,
    FormData
  >(applyCoaTemplateAction, undefined);

  const counts = preview.reduce(
    (acc, item) => {
      acc[item.status] += 1;
      return acc;
    },
    { create: 0, exists: 0, conflict: 0, blocked: 0 } as Record<
      CoaTemplatePlanItem["status"],
      number
    >,
  );

  useActionFeedback(state, {
    onSuccess: () => {
      setConfirmOpen(false);
      onOpenChange(false);
      router.refresh();
    },
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="size-4 text-primary" />
              Template COA MSME
            </DialogTitle>
            <DialogDescription>
              Pratinjau bagan akun standar untuk UMKM Indonesia. Akun yang sudah
              ada tidak akan diubah atau ditimpa.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap gap-2 text-[11px]">
            <SummaryChip className="text-sky-700" label={`${counts.create} akan dibuat`} />
            <SummaryChip className="text-emerald-700" label={`${counts.exists} sudah ada`} />
            <SummaryChip className="text-amber-700" label={`${counts.conflict} konflik`} />
            <SummaryChip className="text-muted-foreground" label={`${counts.blocked} dilewati`} />
          </div>

          <ScrollArea className="h-[320px] rounded-lg border border-border/70">
            <ul className="divide-y divide-border/50">
              {preview.map((item) => (
                <TemplateRow key={item.code} item={item} />
              ))}
            </ul>
          </ScrollArea>

          <div className="flex items-center justify-between gap-2 pt-1">
            <p className="text-[10.5px] leading-relaxed text-muted-foreground">
              Template bersifat opsional dan dapat disesuaikan setelah diterapkan.
            </p>
            <Button
              size="sm"
              className="gap-1.5"
              disabled={counts.create === 0}
              onClick={() => setConfirmOpen(true)}
            >
              <Plus className="size-3.5" />
              Terapkan Template
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Terapkan template COA MSME?</AlertDialogTitle>
            <AlertDialogDescription>
              {counts.create} akun baru akan ditambahkan ke bagan akun perusahaan.
              Akun yang sudah ada tetap dipertahankan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <form action={formAction}>
            <AlertDialogFooter>
              <AlertDialogCancel type="button">Batal</AlertDialogCancel>
              <SubmitButton size="sm" pendingText="Menerapkan…">
                Terapkan
              </SubmitButton>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function SummaryChip({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "rounded-full border border-border/70 bg-muted/50 px-2.5 py-1 font-medium",
        className,
      )}
    >
      {label}
    </span>
  );
}

function TemplateRow({ item }: { item: CoaTemplatePlanItem }) {
  const depth = item.code.split(".").length - 1;
  const meta = STATUS_META[item.status];

  return (
    <li
      className="flex items-center gap-3 px-3 py-2"
      style={{ paddingLeft: `${12 + depth * 18}px` }}
    >
      {item.status === "create" ? (
        <Plus className={cn("size-3.5 shrink-0", meta.className)} />
      ) : item.status === "exists" ? (
        <CheckCircle2 className={cn("size-3.5 shrink-0", meta.className)} />
      ) : item.status === "conflict" ? (
        <XCircle className={cn("size-3.5 shrink-0", meta.className)} />
      ) : (
        <CircleMinus className={cn("size-3.5 shrink-0", meta.className)} />
      )}
      <span className="w-[86px] shrink-0 font-mono text-[11px] font-medium">
        {item.code}
      </span>
      <span className="min-w-0 flex-1 truncate text-[12px]">{item.name}</span>
      <span className="hidden text-[10.5px] text-muted-foreground sm:block">
        {ACCOUNT_TYPE_LABELS[item.type as AccountTypeValue] ?? item.type}
      </span>
      <span className={cn("w-[86px] shrink-0 text-right text-[10px] font-medium", meta.className)}>
        {meta.label}
      </span>
    </li>
  );
}
