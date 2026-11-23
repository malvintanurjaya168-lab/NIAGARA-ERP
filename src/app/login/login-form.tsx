"use client";

import { useActionState, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  ChevronDown,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import { loginAction, type LoginState } from "@/lib/actions/auth";
import { DEMO_ACCOUNTS } from "@/lib/demo-accounts";
import { ROLE_LABELS } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    loginAction,
    undefined,
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-3xl border border-border/80 bg-card p-7 shadow-float sm:p-9"
    >
      <div className="space-y-1.5">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-[11px] font-medium text-secondary-foreground">
          <Sparkles className="size-3.5 text-primary" />
          Ruang kerja perusahaan
        </div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          Selamat datang kembali
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Masuk untuk melanjutkan pengelolaan operasional bisnis Anda.
        </p>
      </div>

      <form action={formAction} className="mt-7 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="nama@perusahaan.co.id"
              className="h-11 pl-9"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Kata Sandi</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              className="h-11 pl-9 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
              className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        {state?.error ? (
          <motion.div
            role="alert"
            initial={reduceMotion ? false : { opacity: 0, height: 0 }}
            animate={reduceMotion ? undefined : { opacity: 1, height: "auto" }}
            className="flex items-start gap-2.5 rounded-xl border border-destructive/25 bg-destructive/8 px-3.5 py-3 text-[13px] leading-relaxed text-destructive"
          >
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <span>{state.error}</span>
          </motion.div>
        ) : null}

        <Button
          type="submit"
          size="lg"
          disabled={pending}
          className="h-11 w-full gap-2 text-sm font-medium shadow-sm"
        >
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Memverifikasi...
            </>
          ) : (
            <>
              Masuk ke NIAGARA
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </form>

      <div className="mt-6">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="h-10 w-full justify-between text-[13px] text-muted-foreground"
            >
              <span className="inline-flex items-center gap-2">
                <Sparkles className="size-3.5" />
                Gunakan akun demo
              </span>
              <ChevronDown className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[300px]">
            <DropdownMenuLabel className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Akun demonstrasi
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {DEMO_ACCOUNTS.map((account) => (
              <DropdownMenuItem
                key={account.role}
                className="flex flex-col items-start gap-0.5 py-2"
                onClick={() => {
                  setEmail(account.email);
                  setPassword(account.password);
                  toast.success(`Akun ${ROLE_LABELS[account.role]} dipilih`, {
                    description: "Tekan Masuk untuk melanjutkan.",
                  });
                }}
              >
                <span className="text-[13px] font-medium">
                  {ROLE_LABELS[account.role]}
                </span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {account.email}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
}
