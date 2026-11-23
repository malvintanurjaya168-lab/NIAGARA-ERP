import { prisma } from "@/lib/prisma";

export interface UserRow {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  salesCount: number;
}

export async function getUsers(companyId: string): Promise<UserRow[]> {
  const users = await prisma.user.findMany({
    where: { companyId },
    orderBy: [{ isActive: "desc" }, { fullName: "asc" }],
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      _count: { select: { sales: true } },
    },
  });

  return users.map((user) => ({
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
    salesCount: user._count.sales,
  }));
}

export interface UserStats {
  total: number;
  active: number;
  inactive: number;
  owners: number;
}

export async function getUserStats(companyId: string): Promise<UserStats> {
  const [total, active, owners] = await Promise.all([
    prisma.user.count({ where: { companyId } }),
    prisma.user.count({ where: { companyId, isActive: true } }),
    prisma.user.count({
      where: { companyId, isActive: true, role: "OWNER" },
    }),
  ]);

  return { total, active, inactive: total - active, owners };
}
