import { prisma } from "@/lib/prisma";
import type { ShellAlert } from "@/components/layout/types";

export async function getLayoutAlerts(
  companyId: string,
  limit = 6,
): Promise<{ alerts: ShellAlert[]; lowStockCount: number }> {
  const where = {
    companyId,
    isActive: true,
    stockQuantity: { lte: prisma.product.fields.minimumStock },
  } as const;

  const [products, lowStockCount] = await Promise.all([
    prisma.product.findMany({
      where,
      select: {
        id: true,
        name: true,
        sku: true,
        unit: true,
        stockQuantity: true,
        minimumStock: true,
      },
      orderBy: { stockQuantity: "asc" },
      take: limit,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    lowStockCount,
    alerts: products.map((product) => ({
      id: product.id,
      name: product.name,
      sku: product.sku,
      unit: product.unit,
      stock: Number(product.stockQuantity),
      minimum: Number(product.minimumStock),
    })),
  };
}
