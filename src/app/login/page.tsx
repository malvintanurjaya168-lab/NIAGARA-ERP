import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  BarChart3,
  Package,
  ScanLine,
  ShieldCheck,
  Waves,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { getCurrentUser } from "@/lib/auth-guards";
import { landingPathForRole } from "@/lib/roles";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Masuk",
  description: "Masuk ke ruang kerja NIAGARA ERP.",
};

export const dynamic = "force-dynamic";

const highlights = [
  {
    icon: Package,
    title: "Inventaris real-time",
    description: "Stok, pergerakan, dan penyesuaian tercatat permanen.",
  },
  {
    icon: ScanLine,
    title: "Point of Sale terkontrol",
    description: "Checkout cepat dengan pengurangan stok atomik.",
  },
  {
    icon: BarChart3,
    title: "Laporan keuangan akurat",
    description: "Pendapatan, HPP, dan laba kotor dalam Rupiah.",
  },
];

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect(landingPathForRole(user.role));
  }

  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-[#0B2929] px-12 py-14 text-white lg:flex lg:flex-col">
        <div className="aurora absolute inset-0 opacity-90" />
        <div className="absolute inset-0 surface-grid opacity-[0.18]" />
        <div className="relative z-10 flex items-center justify-between">
          <Logo tone="inverse" subtitle="ENTERPRISE RESOURCE PLANNING" />
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-medium tracking-wide text-white/70">
            <ShieldCheck className="size-3.5 text-brand-mint" />
            Enterprise-grade security
          </span>
        </div>

        <div className="relative z-10 my-auto max-w-xl py-16">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-brand-mint">
            <Waves className="size-3.5" />
            Untuk UMKM Indonesia
          </span>
          <h1 className="mt-7 text-balance text-4xl font-semibold leading-[1.12] tracking-tight xl:text-[3.15rem]">
            Kelola seluruh bisnis Anda dalam satu aliran kerja.
          </h1>
          <p className="mt-5 max-w-md text-pretty text-[15px] leading-relaxed text-white/65">
            NIAGARA menyatukan inventaris, penjualan, dan laporan keuangan dalam
            satu platform yang rapi, aman, dan mudah digunakan.
          </p>

          <div className="mt-12 space-y-5">
            {highlights.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex items-start gap-3.5">
                <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.06] text-brand-mint">
                  <Icon className="size-[18px]" />
                </span>
                <div>
                  <p className="text-sm font-medium text-white/90">{title}</p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-white/50">
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-[11px] text-white/40">
          <span>© {new Date().getFullYear()} NIAGARA ERP</span>
          <span>Isolasi data per perusahaan · RBAC · Jejak audit stok</span>
        </div>

        <svg
          aria-hidden
          viewBox="0 0 800 220"
          className="pointer-events-none absolute -bottom-6 left-0 w-full text-brand/30"
        >
          <path
            d="M0 150 C 120 90, 220 210, 340 150 S 560 90, 680 150 S 900 210, 1000 150"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M0 180 C 120 120, 220 240, 340 180 S 560 120, 680 180 S 900 240, 1000 180"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            opacity="0.55"
          />
        </svg>
      </section>

      <section className="relative flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="absolute inset-0 surface-grid opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
        <div className="relative z-10 w-full max-w-[420px]">
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <Logo />
            <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
              ERP
            </span>
          </div>
          <LoginForm />
          <p className="mt-8 text-center text-[11px] leading-relaxed text-muted-foreground">
            Dengan masuk, Anda menyetujui kebijakan penggunaan internal
            perusahaan. Akun demo hanya untuk lingkungan demonstrasi.
          </p>
        </div>
      </section>
    </main>
  );
}
