import type { Metadata } from "next";
import { ShieldCheck, UserCheck, UserX, Users } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { MetricCard } from "@/components/shared/metric-card";
import { SectionCard } from "@/components/shared/section-card";
import { RoleBadge } from "@/components/users/role-badge";
import { UserManager } from "@/components/users/user-manager";
import { requirePagePermission } from "@/lib/auth-guards";
import { getUsers, getUserStats } from "@/lib/queries/users";
import { ROLE_DESCRIPTIONS, ROLES } from "@/lib/roles";

export const metadata: Metadata = { title: "Pengguna & Peran" };

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const user = await requirePagePermission("users.manage");
  const [users, stats] = await Promise.all([
    getUsers(user.companyId),
    getUserStats(user.companyId),
  ]);

  return (
    <div>
      <PageHeader
        eyebrow="Administrasi"
        title="Pengguna & Peran"
        description="Kelola akses anggota tim. Setiap peran memiliki izin yang berbeda dan diperiksa kembali di server pada setiap permintaan."
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard
          label="Total Pengguna"
          value={stats.total}
          icon={<Users className="size-4" />}
          hint="Seluruh akun"
        />
        <MetricCard
          label="Akun Aktif"
          value={stats.active}
          icon={<UserCheck className="size-4" />}
          hint="Dapat masuk"
          tone="positive"
        />
        <MetricCard
          label="Akun Nonaktif"
          value={stats.inactive}
          icon={<UserX className="size-4" />}
          hint="Akses ditangguhkan"
          tone={stats.inactive > 0 ? "warning" : "default"}
        />
        <MetricCard
          label="Pemilik Aktif"
          value={stats.owners}
          icon={<ShieldCheck className="size-4" />}
          hint="Akses penuh"
        />
      </div>

      <div className="mt-4">
        <UserManager users={users} currentUserId={user.id} />
      </div>

      <SectionCard
        className="mt-4"
        title="Matriks Peran"
        description="Ringkasan tanggung jawab setiap peran. Izin terperinci ditegakkan di server."
      >
        <ul className="divide-y divide-border/60">
          {ROLES.map((role) => (
            <li
              key={role}
              className="flex flex-col gap-1 py-2.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
            >
              <RoleBadge role={role} className="w-fit text-[10px]" />
              <p className="text-[11.5px] text-muted-foreground sm:text-right">
                {ROLE_DESCRIPTIONS[role]}
              </p>
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}
