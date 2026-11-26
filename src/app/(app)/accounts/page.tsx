import type { Metadata } from "next";
import { BookOpenText, CircleCheck, CircleX, Layers } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { MetricCard } from "@/components/shared/metric-card";
import { AccountExplorer } from "@/components/accounts/account-explorer";
import { requirePagePermission } from "@/lib/auth-guards";
import { can } from "@/lib/roles";
import {
  getAccountHierarchy,
  getCoaTemplatePreview,
} from "@/lib/queries/accounts";
import { flattenAccountTree } from "@/lib/accounts-tree";

export const metadata: Metadata = { title: "Bagan Akun" };

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const user = await requirePagePermission("accounts.view");
  const canManage = can(user.role, "accounts.manage");

  const [tree, preview] = await Promise.all([
    getAccountHierarchy(user.companyId),
    canManage
      ? getCoaTemplatePreview(user.companyId)
      : Promise.resolve([]),
  ]);

  const all = flattenAccountTree(tree);
  const active = all.filter((node) => node.isActive).length;
  const inactive = all.length - active;
  const postable = all.filter((node) => node.isPostable).length;

  return (
    <div>
      <PageHeader
        eyebrow="Akuntansi"
        title="Bagan Akun"
        description="Struktur akun perusahaan untuk pelaporan keuangan. Kelola akun, hierarki, dan klasifikasi secara terpusat."
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total Akun"
          value={all.length}
          icon={<BookOpenText className="size-4" />}
          hint="Seluruh akun terdaftar"
        />
        <MetricCard
          label="Akun Aktif"
          value={active}
          icon={<CircleCheck className="size-4" />}
          hint="Dapat digunakan transaksi"
          tone="positive"
        />
        <MetricCard
          label="Akun Nonaktif"
          value={inactive}
          icon={<CircleX className="size-4" />}
          hint="Disembunyikan dari transaksi baru"
          tone={inactive > 0 ? "warning" : "default"}
        />
        <MetricCard
          label="Akun Posting"
          value={postable}
          icon={<Layers className="size-4" />}
          hint="Dapat menerima entri jurnal"
        />
      </div>

      <AccountExplorer tree={tree} preview={preview} canManage={canManage} />
    </div>
  );
}
