"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import type { ActionResult } from "@/lib/errors";

interface ActionFeedbackOptions {
  successMessage?: string;
  onSuccess?: () => void;
}

/**
 * Shows a toast for a server action result and runs a success callback.
 * Callbacks are kept in refs so the effect only reacts to a new action result.
 */
export function useActionFeedback(
  state: ActionResult | undefined,
  options: ActionFeedbackOptions = {},
) {
  const onSuccessRef = useRef(options.onSuccess);
  const messageRef = useRef(options.successMessage);

  useEffect(() => {
    onSuccessRef.current = options.onSuccess;
    messageRef.current = options.successMessage;
  });

  useEffect(() => {
    if (!state) return;

    if (state.ok) {
      toast.success(
        state.message ?? messageRef.current ?? "Perubahan berhasil disimpan.",
      );
      onSuccessRef.current?.();
    } else {
      toast.error(state.error);
    }
  }, [state]);
}
