"use client";

import { useActionState, useMemo, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubmitButton } from "@/components/shared/submit-button";
import { FieldError } from "@/components/shared/field-error";
import {
  createAccountAction,
  updateAccountAction,
} from "@/lib/actions/accounts";
import {
  ACCOUNT_TYPE_LABELS,
  ACCOUNT_TYPES,
  type AccountTypeValue,
} from "@/lib/constants";
import type { AccountTreeNode } from "@/lib/queries/accounts";
import { isSelfOrDescendant } from "@/lib/accounts-tree";
import { useActionFeedback } from "@/lib/hooks/use-action-feedback";
import type { ActionResult } from "@/lib/errors";

interface AccountFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: AccountTreeNode | null;
  allAccounts: AccountTreeNode[];
}

export function AccountFormDialog({
  open,
  onOpenChange,
  account,
  allAccounts,
}: AccountFormDialogProps) {
  const router = useRouter();
  const [state, formAction] = useActionState<
    ActionResult | undefined,
    FormData
  >(account ? updateAccountAction : createAccountAction, undefined);

  const [type, setType] = useState<AccountTypeValue>(
    (account?.type as AccountTypeValue | undefined) ?? "ASSET",
  );
  const [parentId, setParentId] = useState(account?.parentId ?? "");

  const parentOf = useMemo(
    () => new Map(allAccounts.map((node) => [node.id, node.parentId])),
    [allAccounts],
  );

  const parentOptions = useMemo(() => {
    return allAccounts.filter((candidate) => {
      if (candidate.type !== type) return false;
      if (!candidate.isActive || candidate.isPostable) return false;
      if (account && isSelfOrDescendant(account.id, candidate.id, parentOf)) {
        return false;
      }
      return true;
    });
  }, [allAccounts, type, account, parentOf]);

  useActionFeedback(state, {
    successMessage: "Akun disimpan.",
    onSuccess: () => {
      onOpenChange(false);
      router.refresh();
    },
  });

  const errors = state && !state.ok ? state.fieldErrors : undefined;
  const parentLocked = Boolean(account && account.children.length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>
            {account ? `Ubah Akun ${account.code}` : "Akun Baru"}
          </DialogTitle>
          <DialogDescription>
            {account
              ? "Perbarui kode, nama, klasifikasi, dan posisi hierarki akun."
              : "Tambahkan akun baru ke bagan akun perusahaan."}
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          {account ? (
            <input type="hidden" name="accountId" value={account.id} />
          ) : null}
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="parentId" value={parentId} />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="account-code">Kode Akun</Label>
              <Input
                id="account-code"
                name="code"
                defaultValue={account?.code}
                placeholder="Contoh: 1.1.05"
                maxLength={20}
                required
                aria-invalid={Boolean(errors?.code)}
              />
              <FieldError messages={errors?.code} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="account-type">Jenis Akun</Label>
              <Select
                value={type}
                onValueChange={(value) => {
                  setType(value as AccountTypeValue);
                  setParentId("");
                }}
              >
                <SelectTrigger id="account-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {ACCOUNT_TYPE_LABELS[item]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError messages={errors?.type} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="account-name">Nama Akun</Label>
            <Input
              id="account-name"
              name="name"
              defaultValue={account?.name}
              placeholder="Contoh: Piutang Usaha"
              maxLength={120}
              required
              aria-invalid={Boolean(errors?.name)}
            />
            <FieldError messages={errors?.name} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="account-parent">Akun Induk (opsional)</Label>
            <Select
              value={parentId || "__none__"}
              onValueChange={(value) =>
                setParentId(value === "__none__" ? "" : value)
              }
            >
              <SelectTrigger id="account-parent" className="w-full">
                <SelectValue placeholder="Tanpa induk (akun utama)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Tanpa induk</SelectItem>
                {parentOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.code} — {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10.5px] text-muted-foreground">
              Hanya akun aktif non-posting dengan jenis yang sama yang dapat
              menjadi induk.
            </p>
            <FieldError messages={errors?.parentId} />
          </div>

          <label className="flex items-start gap-2.5 text-[12px] font-medium">
            <input
              type="checkbox"
              name="isPostable"
              defaultChecked={parentLocked ? false : (account?.isPostable ?? true)}
              disabled={parentLocked}
              className="mt-0.5 size-3.5 accent-primary"
            />
            <span>
              Akun posting
              <span className="block text-[10.5px] font-normal text-muted-foreground">
                {parentLocked
                  ? "Akun dengan akun anak tidak dapat menjadi akun posting."
                  : "Akun yang dapat menerima transaksi jurnal. Nonaktifkan untuk akun kelompok."}
              </span>
            </span>
          </label>

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
              {account ? "Simpan Perubahan" : "Tambah Akun"}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
