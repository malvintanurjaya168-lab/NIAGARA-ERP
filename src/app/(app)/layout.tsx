import { AppShell } from "@/components/layout/app-shell";
import { requirePageUser } from "@/lib/auth-guards";
import { getLayoutAlerts } from "@/lib/queries/layout";
import { can } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function ApplicationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requirePageUser();

  const { alerts, lowStockCount } = can(user.role, "inventory.view")
    ? await getLayoutAlerts(user.companyId)
    : { alerts: [], lowStockCount: 0 };

  return (
    <AppShell
      user={{
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      }}
      company={{
        name: user.company.name,
        businessType: user.company.businessType,
      }}
      alerts={alerts}
      lowStockCount={lowStockCount}
    >
      {children}
    </AppShell>
  );
}
