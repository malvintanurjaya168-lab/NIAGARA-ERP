import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ActionError } from "@/lib/errors";
import { can, type Permission } from "@/lib/roles";

export type CurrentUser = {
  id: string;
  companyId: string;
  fullName: string;
  email: string;
  role: import("@/lib/roles").Role;
  isActive: boolean;
  company: {
    id: string;
    name: string;
    businessType: string | null;
    currency: string;
    timezone: string;
    fiscalYearStartMonth: number;
  };
};

/**
 * Resolves the authenticated user from the signed session cookie, then reloads
 * the authoritative role/company/status from PostgreSQL. Never trust the JWT
 * payload for authorization decisions.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      companyId: true,
      fullName: true,
      email: true,
      role: true,
      isActive: true,
      company: {
        select: {
          id: true,
          name: true,
          businessType: true,
          currency: true,
          timezone: true,
          fiscalYearStartMonth: true,
        },
      },
    },
  });

  if (!user || !user.isActive) return null;
  return user;
});

/** For pages/layouts: redirects unauthenticated visitors to the login page. */
export async function requirePageUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** For pages/layouts: redirects users who lack the permission to /unauthorized. */
export async function requirePagePermission(permission: Permission): Promise<CurrentUser> {
  const user = await requirePageUser();
  if (!can(user.role, permission)) redirect("/unauthorized");
  return user;
}

/** For Server Actions: throws a typed error that actions convert to a result. */
export async function requireActionUser(permission: Permission): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new ActionError(
      "Sesi Anda telah berakhir. Silakan masuk kembali.",
      "UNAUTHENTICATED",
    );
  }
  if (!can(user.role, permission)) {
    throw new ActionError(
      "Anda tidak memiliki izin untuk melakukan tindakan ini.",
      "FORBIDDEN",
    );
  }
  return user;
}
