import { prisma } from "@/lib/prisma";

export interface PosProduct {
  id: string;
  name: string;
  sku: string;
  unit: string;
  sellingPrice: number;
  stockQuantity: number;
  category: { id: string; name: string } | null;
}

export async function getPosCatalog(companyId: string): Promise<PosProduct[]> {
  const products = await prisma.product.findMany({
    where: { companyId, isActive: true },
    orderBy: { name: "asc" },
    take: 500,
    select: {
      id: true,
      name: true,
      sku: true,
      unit: true,
      sellingPrice: true,
      stockQuantity: true,
      category: { select: { id: true, name: true } },
    },
  });

  return products.map((product) => ({
    id: product.id,
    name: product.name,
    sku: product.sku,
    unit: product.unit,
    sellingPrice: Number(product.sellingPrice),
    stockQuantity: Number(product.stockQuantity),
    category: product.category,
  }));
}
