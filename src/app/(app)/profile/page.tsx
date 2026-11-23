import type { Metadata } from "next";
import Link from "next/link";
import { Building2, Mail, Settings, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { PasswordForm } from "@/components/settings/password-form";
import { RoleBadge } from "@/components/users/role-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { requirePageUser } from "@/lib/auth-guards";
import { can, ROLE_DESCRIPTIONS } from "@/lib/roles";
import { initials } from "@/lib/format";

export const metadata: Metadata = { title: "Profil Saya" };

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await requirePageUser();
  const canManageSettings = can(user.role, "settings.manage");

  return (
    <div>
      <PageHeader
        eyebrow="Akun"
        title="Profil Saya"
        description="Lihat informasi akun Anda dan perbarui kata sandi. Perubahan peran dan data perusahaan dikelola oleh pemilik."
        actions={
          canManageSettings ? (
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link href="/settings">
                <Settings className="size-3.5" />
                Pengaturan Perusahaan
              </Link>
            </Button>
          ) : null
        }
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <SectionCard
          className="xl:col-span-2"
          title="Informasi Akun"
          description="Identitas yang digunakan untuk masuk dan mengakses modul."
        >
          <div className="flex items-center gap-3 rounded-lg border border-border/70 bg-muted/30 p-4">
            <Avatar className="size-12 border border-primary/15 bg-primary/10">
              <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                {initials(user.fullName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold">{user.fullName}</p>
              <p className="truncate text-[11.5px] text-muted-foreground">
                {user.email}
              </p>
              <div className="mt-1.5">
                <RoleBadge role={user.role} className="text-[9.5px]" />
              </div>
            </div>
          </div>

          <div className="mt-4 divide-y divide-border/60">
            <InfoRow icon={<Mail className="size-3.5" />} label="Email">
              {user.email}
            </InfoRow>
            <InfoRow icon={<ShieldCheck className="size-3.5" />} label="Peran">
              {ROLE_DESCRIPTIONS[user.role]}
            </InfoRow>
            <InfoRow icon={<Building2 className="size-3.5" />} label="Perusahaan">
              {user.company.name}
            </InfoRow>
          </div>

          {!canManageSettings ? (
            <p className="mt-4 rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
              Untuk mengubah nama, email, atau peran, hubungi pemilik perusahaan.
            </p>
          ) : null}
        </SectionCard>

        <SectionCard
          title="Keamanan Akun"
          description="Gunakan kata sandi yang kuat dan tidak dipakai ulang."
        >
          <PasswordForm />
        </SectionCard>
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5">
      <span className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="max-w-[60%] text-right text-[12px] font-medium">
        {children}
      </span>
    </div>
  );
}
