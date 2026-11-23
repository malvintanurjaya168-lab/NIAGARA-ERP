import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Building2, CalendarRange, Clock, LockKeyhole } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { CompanySettingsForm } from "@/components/settings/company-settings-form";
import { PasswordForm } from "@/components/settings/password-form";
import { requirePagePermission } from "@/lib/auth-guards";
import { getCompanySettings } from "@/lib/queries/settings";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Pengaturan" };

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requirePagePermission("settings.manage");
  const company = await getCompanySettings(user.companyId);

  if (!company) notFound();

  const fiscalMonth = new Intl.DateTimeFormat("id-ID", { month: "long" }).format(
    new Date(2026, company.fiscalYearStartMonth - 1, 1),
  );

  return (
    <div>
      <PageHeader
        eyebrow="Administrasi"
        title="Pengaturan"
        description="Kelola identitas perusahaan, preferensi laporan, dan keamanan akun Anda."
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <SectionCard
          className="xl:col-span-2"
          title="Profil Perusahaan"
          description="Informasi ini tampil pada struk dan laporan."
          action={
            <span className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
              <Building2 className="size-3.5" />
              {company.userCount} pengguna · {company.productCount} produk
            </span>
          }
        >
          <CompanySettingsForm company={company} />
        </SectionCard>

        <div className="space-y-4">
          <SectionCard
            title="Keamanan Akun"
            description="Gunakan kata sandi yang kuat dan tidak dipakai ulang."
            action={<LockKeyhole className="size-4 text-muted-foreground" />}
          >
            <PasswordForm />
          </SectionCard>

          <SectionCard title="Informasi Sistem">
            <div className="space-y-3">
              <InfoRow
                icon={<Clock className="size-3.5" />}
                label="Zona Waktu"
                value={`${company.timezone} (UTC+7)`}
              />
              <InfoRow
                icon={<CalendarRange className="size-3.5" />}
                label="Tahun Fiskal"
                value={`Mulai ${fiscalMonth}`}
              />
              <InfoRow
                icon={<Building2 className="size-3.5" />}
                label="Mata Uang"
                value="IDR (Rupiah)"
              />
              <div className="border-t border-border/70 pt-2 text-[10.5px] text-muted-foreground">
                Perusahaan terdaftar sejak {formatDate(company.createdAt)}.
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="text-right text-[12px] font-medium">{value}</span>
    </div>
  );
}
