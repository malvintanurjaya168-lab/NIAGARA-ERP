"use client";

import { useActionState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/shared/submit-button";
import { FieldError } from "@/components/shared/field-error";
import { changeOwnPasswordAction } from "@/lib/actions/settings";
import { useActionFeedback } from "@/lib/hooks/use-action-feedback";
import type { ActionResult } from "@/lib/errors";

export function PasswordForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState<ActionResult | undefined, FormData>(
    changeOwnPasswordAction,
    undefined,
  );

  useActionFeedback(state, {
    successMessage: "Kata sandi diubah.",
    onSuccess: () => formRef.current?.reset(),
  });

  const errors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="currentPassword">Kata Sandi Saat Ini</Label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={Boolean(errors?.currentPassword)}
        />
        <FieldError messages={errors?.currentPassword} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="newPassword">Kata Sandi Baru</Label>
        <Input
          id="newPassword"
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
        <Label htmlFor="confirmNewPassword">Ulangi Kata Sandi Baru</Label>
        <Input
          id="confirmNewPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          aria-invalid={Boolean(errors?.confirmPassword)}
        />
        <FieldError messages={errors?.confirmPassword} />
      </div>

      <SubmitButton size="sm" className="w-full" pendingText="Menyimpan…">
        Ubah Kata Sandi
      </SubmitButton>
    </form>
  );
}
