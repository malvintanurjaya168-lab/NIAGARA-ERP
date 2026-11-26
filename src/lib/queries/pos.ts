import { prisma } from "@/lib/prisma";

export interface PosProduct {
  id: string;
  name: string;
  sku: string;
  unit: string;
  sellingPrice: number;
  /** Available quantity in the selected warehouse (ProductStock). */
  stockQuantity: number;
  category: { id: string; name: string } | null;
}

export interface PosWarehouse {
  id: string;
  code: string;
  name: string;
  isDefault: boolean;
}

export async function getPosWarehouses(companyId: string): Promise<PosWarehouse[]> {
  return prisma.warehouse.findMany({
    where: { companyId, isActive: true },
    orderBy: [{ isDefault: "desc" }, { code: "asc" }],
    select: { id: true, code: true, name: true, isDefault: true },
  });
}

export async function getPosCatalog(
  companyId: string,
  warehouseId: string,
): Promise<PosProduct[]> {
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
      category: { select: { id: true, name: true } },
    },
  });

  const stocks = await prisma.productStock.findMany({
    where: {
      companyId,
      warehouseId,
      productId: { in: products.map((product) => product.id) },
    },
    select: { productId: true, quantity: true },
  });
  const stockByProduct = new Map(
    stocks.map((stock) => [stock.productId, Number(stock.quantity)]),
  );

  return products.map((product) => ({
    id: product.id,
    name: product.name,
    sku: product.sku,
    unit: product.unit,
    sellingPrice: Number(product.sellingPrice),
    stockQuantity: stockByProduct.get(product.id) ?? 0,
    category: product.category,
  }));
}
