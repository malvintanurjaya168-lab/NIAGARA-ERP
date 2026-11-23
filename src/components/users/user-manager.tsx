"use client";

import { SectionCard } from "@/components/shared/section-card";
import { EmptyState } from "@/components/shared/empty-state";
import { RoleBadge } from "@/components/users/role-badge";
import { Badge } from "@/components/ui/badge";
import {
  CreateUserButton,
  EditUserDialog,
  ResetPasswordDialog,
} from "@/components/users/user-dialogs";
import type { UserRow } from "@/lib/queries/users";
import { formatDate, formatNumber, initials } from "@/lib/format";

export function UserManager({
  users,
  currentUserId,
}: {
  users: UserRow[];
  currentUserId: string;
}) {
  return (
    <SectionCard
      title="Daftar Pengguna"
      description={`${users.length} akun terdaftar di perusahaan Anda.`}
      action={<CreateUserButton />}
    >
      {users.length === 0 ? (
        <EmptyState
          title="Belum ada pengguna"
          description="Tambahkan anggota tim untuk mulai menggunakan Niagara ERP."
        />
      ) : (
        <div className="-mx-1 overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border/70 text-[10px] uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Pengguna</th>
                <th className="py-2 pr-3 font-medium">Peran</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="hidden py-2 pr-3 text-right font-medium sm:table-cell">
                  Transaksi
                </th>
                <th className="hidden py-2 pr-3 font-medium md:table-cell">
                  Bergabung
                </th>
                <th className="w-20 py-2 text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-border/50 last:border-0"
                >
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-2.5">
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-[10.5px] font-semibold text-primary">
                        {initials(user.fullName)}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-[12.5px] font-medium">
                            {user.fullName}
                          </p>
                          {user.id === currentUserId ? (
                            <Badge
                              variant="outline"
                              className="border-border bg-muted text-[8.5px] text-muted-foreground"
                            >
                              Anda
                            </Badge>
                          ) : null}
                        </div>
                        <p className="truncate text-[10.5px] text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-3">
                    <RoleBadge role={user.role} className="text-[9.5px]" />
                  </td>
                  <td className="py-3 pr-3">
                    <span className="inline-flex items-center gap-1.5 text-[11px]">
                      <span
                        className={`size-1.5 rounded-full ${
                          user.isActive ? "bg-emerald-500" : "bg-muted-foreground/40"
                        }`}
                      />
                      {user.isActive ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  <td className="hidden py-3 pr-3 text-right text-[11px] tabular-nums text-muted-foreground sm:table-cell">
                    {formatNumber(user.salesCount)}
                  </td>
                  <td className="hidden whitespace-nowrap py-3 pr-3 text-[11px] text-muted-foreground md:table-cell">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="py-3">
                    <div className="flex items-center justify-end gap-0.5">
                      <EditUserDialog
                        user={user}
                        isSelf={user.id === currentUserId}
                      />
                      <ResetPasswordDialog user={user} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}
