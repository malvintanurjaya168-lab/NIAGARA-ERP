import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requirePageUser } from "@/lib/auth-guards";
import { landingPathForRole } from "@/lib/roles";

export const metadata: Metadata = { title: "Akses Ditolak" };

export default async function UnauthorizedPage() {
  const user = await requirePageUser();
  const home = landingPathForRole(user.role);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="mx-auto max-w-md text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-amber-500/10 text-amber-600">
          <ShieldAlert className="size-7" />
        </span>
        <h1 className="mt-4 text-[22px] font-semibold tracking-tight">
          Akses ditolak
        </h1>
        <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
          Peran Anda saat ini tidak memiliki izin untuk membuka halaman ini.
          Hubungi pemilik atau manajer apabila Anda memerlukan akses tambahan.
        </p>
        <div className="mt-5 flex items-center justify-center gap-2">
          <Button asChild size="sm" className="gap-1.5">
            <Link href={home}>
              <ArrowLeft className="size-3.5" />
              Kembali ke Halaman Utama
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
