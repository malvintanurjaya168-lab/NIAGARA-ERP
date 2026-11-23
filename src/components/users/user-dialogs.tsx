"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
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
import {
  createUserAction,
  resetUserPasswordAction,
  updateUserAction,
} from "@/lib/actions/users";
import { ROLES, ROLE_LABELS } from "@/lib/roles";
import type { UserRow } from "@/lib/queries/users";
import { useActionFeedback } from "@/lib/hooks/use-action-feedback";
import type { ActionResult } from "@/lib/errors";

const CREATE_ROLES = ROLES.filter((role) => role !== "OWNER");

function useDialogAction(action: typeof createUserAction) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<ActionResult | undefined, FormData>(
    action,
    undefined,
  );

  useActionFeedback(state, {
    successMessage: "Data disimpan.",
    onSuccess: () => {
      setOpen(false);
      router.refresh();
    },
  });

  const errors = state && !state.ok ? state.fieldErrors : undefined;
  return { open, setOpen, state, formAction, errors };
}

export function CreateUserButton() {
  const { open, setOpen, state, formAction, errors } = useDialogAction(
    createUserAction,
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="size-3.5" />
          Tambah Pengguna
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Tambah Pengguna</DialogTitle>
          <DialogDescription>
            Buat akun baru untuk anggota tim. Kata sandi dapat diubah kapan saja.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          {state && !state.ok && !errors ? (
            <div className="rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-[11.5px] text-destructive">
              {state.error}
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="new-fullName">Nama Lengkap</Label>
            <Input
              id="new-fullName"
              name="fullName"
              placeholder="Nama anggota tim"
              maxLength={100}
              required
              aria-invalid={Boolean(errors?.fullName)}
            />
            <FieldError messages={errors?.fullName} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="new-email">Email</Label>
            <Input
              id="new-email"
              name="email"
              type="email"
              placeholder="nama@perusahaan.com"
              maxLength={160}
              required
              aria-invalid={Boolean(errors?.email)}
            />
            <FieldError messages={errors?.email} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="new-role">Peran</Label>
            <Select name="role" defaultValue="CASHIER">
              <SelectTrigger id="new-role" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CREATE_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError messages={errors?.role} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="new-password">Kata Sandi</Label>
              <Input
                id="new-password"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                aria-invalid={Boolean(errors?.password)}
              />
              <FieldError messages={errors?.password} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-confirmPassword">Ulangi Sandi</Label>
              <Input
                id="new-confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                aria-invalid={Boolean(errors?.confirmPassword)}
              />
              <FieldError messages={errors?.confirmPassword} />
            </div>
          </div>

          <label className="flex w-fit cursor-pointer items-center gap-2 text-[12px] font-medium">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked
              className="size-3.5 accent-primary"
            />
            Akun aktif
          </label>

          <DialogFooter className="gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Batal
            </Button>
            <SubmitButton size="sm" pendingText="Menyimpan…">
              Tambah Pengguna
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EditUserDialog({
  user,
  isSelf,
}: {
  user: UserRow;
  isSelf: boolean;
}) {
  const { open, setOpen, state, formAction, errors } = useDialogAction(
    updateUserAction,
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground"
          aria-label={`Ubah pengguna ${user.fullName}`}
        >
          <Pencil className="size-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Ubah Pengguna</DialogTitle>
          <DialogDescription>
            {isSelf
              ? "Anda dapat memperbarui nama dan email sendiri. Peran dan status tidak dapat diubah untuk akun yang sedang digunakan."
              : "Perubahan peran berlaku pada pengecekan izin berikutnya."}
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="userId" value={user.id} />

          {state && !state.ok && !errors ? (
            <div className="rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-[11.5px] text-destructive">
              {state.error}
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor={`edit-name-${user.id}`}>Nama Lengkap</Label>
            <Input
              id={`edit-name-${user.id}`}
              name="fullName"
              defaultValue={user.fullName}
              maxLength={100}
              required
              aria-invalid={Boolean(errors?.fullName)}
            />
            <FieldError messages={errors?.fullName} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`edit-email-${user.id}`}>Email</Label>
            <Input
              id={`edit-email-${user.id}`}
              name="email"
              type="email"
              defaultValue={user.email}
              maxLength={160}
              required
              aria-invalid={Boolean(errors?.email)}
            />
            <FieldError messages={errors?.email} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`edit-role-${user.id}`}>Peran</Label>
            <Select name="role" defaultValue={user.role} disabled={isSelf}>
              <SelectTrigger id={`edit-role-${user.id}`} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isSelf ? (
              <input type="hidden" name="role" value={user.role} />
            ) : null}
            <FieldError messages={errors?.role} />
          </div>

          <label className="flex w-fit cursor-pointer items-center gap-2 text-[12px] font-medium">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={user.isActive}
              disabled={isSelf}
              className="size-3.5 accent-primary"
            />
            Akun aktif
          </label>
          {isSelf ? <input type="hidden" name="isActive" value="on" /> : null}

          <DialogFooter className="gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Batal
            </Button>
            <SubmitButton size="sm" pendingText="Menyimpan…">
              Simpan Perubahan
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ResetPasswordDialog({ user }: { user: UserRow }) {
  const { open, setOpen, formAction, errors } = useDialogAction(
    resetUserPasswordAction,
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground"
          aria-label={`Reset kata sandi ${user.fullName}`}
        >
          <KeyRound className="size-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Reset Kata Sandi</DialogTitle>
          <DialogDescription>
            Atur kata sandi baru untuk {user.fullName} ({user.email}).
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="userId" value={user.id} />

          <div className="space-y-1.5">
            <Label htmlFor={`reset-password-${user.id}`}>Kata Sandi Baru</Label>
            <Input
              id={`reset-password-${user.id}`}
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              aria-invalid={Boolean(errors?.password)}
            />
            <FieldError messages={errors?.password} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`reset-confirm-${user.id}`}>Ulangi Kata Sandi</Label>
            <Input
              id={`reset-confirm-${user.id}`}
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              aria-invalid={Boolean(errors?.confirmPassword)}
            />
            <FieldError messages={errors?.confirmPassword} />
          </div>

          <DialogFooter className="gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Batal
            </Button>
            <SubmitButton size="sm" pendingText="Menyimpan…">
              Reset Kata Sandi
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
