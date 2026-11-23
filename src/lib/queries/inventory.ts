import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { PAGE_SIZE, type StockMovementFilter } from "@/lib/constants";

export type InventoryStatus = "all" | "in" | "low" | "out" | "attention";
export type InventorySort = "recent" | "name" | "stock-asc" | "stock-desc" | "value";

export interface InventoryListParams {
  companyId: string;
  q?: string;
  categoryId?: string;
  status?: InventoryStatus;
  sort?: InventorySort;
  page?: number;
  pageSize?: number;
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  unit: string;
  purchasePrice: number;
  sellingPrice: number;
  stockQuantity: number;
  minimumStock: number;
  isActive: boolean;
  updatedAt: string;
  category: { id: string; name: string } | null;
}

export interface InventoryListResult {
  items: InventoryItem[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
}

function stockFilter(status: InventoryStatus): Prisma.ProductWhereInput {
  switch (status) {
    case "in":
      return { stockQuantity: { gt: prisma.product.fields.minimumStock } };
    case "low":
      return {
        stockQuantity: { gt: 0, lte: prisma.product.fields.minimumStock },
      };
    case "out":
      return { stockQuantity: { lte: 0 } };
    case "attention":
      return { stockQuantity: { lte: prisma.product.fields.minimumStock } };
    default:
      return {};
  }
}

function sortOrder(sort: InventorySort): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case "name":
      return [{ name: "asc" }];
    case "stock-asc":
      return [{ stockQuantity: "asc" }, { name: "asc" }];
    case "stock-desc":
      return [{ stockQuantity: "desc" }, { name: "asc" }];
    case "value":
      return [{ sellingPrice: "desc" }, { name: "asc" }];
    default:
      return [{ updatedAt: "desc" }];
  }
}

export async function getInventoryList({
  companyId,
  q,
  categoryId,
  status = "all",
  sort = "recent",
  page = 1,
  pageSize = PAGE_SIZE,
}: InventoryListParams): Promise<InventoryListResult> {
  const search = q?.trim();
  const safePage = Math.max(1, Math.floor(page));

  const where: Prisma.ProductWhereInput = {
    companyId,
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { sku: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(categoryId ? { categoryId } : {}),
    ...stockFilter(status),
  };

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: sortOrder(sort),
      skip: (safePage - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        sku: true,
        name: true,
        unit: true,
        purchasePrice: true,
        sellingPrice: true,
        stockQuantity: true,
        minimumStock: true,
        isActive: true,
        updatedAt: true,
        category: { select: { id: true, name: true } },
      },
    }),
  ]);

  return {
    items: products.map((product) => ({
      id: product.id,
      sku: product.sku,
      name: product.name,
      unit: product.unit,
      purchasePrice: Number(product.purchasePrice),
      sellingPrice: Number(product.sellingPrice),
      stockQuantity: Number(product.stockQuantity),
      minimumStock: Number(product.minimumStock),
      isActive: product.isActive,
      updatedAt: product.updatedAt.toISOString(),
      category: product.category,
    })),
    total,
    page: safePage,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    pageSize,
  };
}

export interface InventoryStats {
  totalProducts: number;
  activeProducts: number;
  lowStock: number;
  outOfStock: number;
  inventoryValue: number;
  totalStock: number;
  categoryCount: number;
}

export async function getInventoryStats(companyId: string): Promise<InventoryStats> {
  const [totalProducts, activeProducts, lowStock, outOfStock, categoryCount, products] =
    await Promise.all([
      prisma.product.count({ where: { companyId } }),
      prisma.product.count({ where: { companyId, isActive: true } }),
      prisma.product.count({
        where: {
          companyId,
          isActive: true,
          stockQuantity: { gt: 0, lte: prisma.product.fields.minimumStock },
        },
      }),
      prisma.product.count({
        where: { companyId, isActive: true, stockQuantity: { lte: 0 } },
      }),
      prisma.category.count({ where: { companyId, isActive: true } }),
      prisma.product.findMany({
        where: { companyId, isActive: true },
        select: { stockQuantity: true, purchasePrice: true },
      }),
    ]);

  let inventoryValue = new Prisma.Decimal(0);
  let totalStock = new Prisma.Decimal(0);
  for (const product of products) {
    inventoryValue = inventoryValue.add(
      product.stockQuantity.mul(product.purchasePrice),
    );
    totalStock = totalStock.add(product.stockQuantity);
  }

  return {
    totalProducts,
    activeProducts,
    lowStock,
    outOfStock,
    inventoryValue: Number(inventoryValue),
    totalStock: Number(totalStock),
    categoryCount,
  };
}

export interface CategoryOption {
  id: string;
  name: string;
}

export async function getCategoryOptions(companyId: string): Promise<CategoryOption[]> {
  return prisma.category.findMany({
    where: { companyId, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export interface CategoryRow extends CategoryOption {
  description: string | null;
  isActive: boolean;
  productCount: number;
}

export async function getCategories(companyId: string): Promise<CategoryRow[]> {
  const categories = await prisma.category.findMany({
    where: { companyId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      isActive: true,
      _count: { select: { products: true } },
    },
  });

  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    description: category.description,
    isActive: category.isActive,
    productCount: category._count.products,
  }));
}

export interface StockMovementListParams {
  companyId: string;
  q?: string;
  type?: StockMovementFilter;
  page?: number;
  pageSize?: number;
}

export interface StockMovementRow {
  id: string;
  movementType: string;
  quantityDelta: number;
  previousQuantity: number;
  newQuantity: number;
  reason: string;
  referenceType: string | null;
  referenceId: string | null;
  createdAt: string;
  createdBy: string;
  product: { id: string; name: string; sku: string; unit: string };
}

export interface StockMovementListResult {
  items: StockMovementRow[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
}

export async function getStockMovements({
  companyId,
  q,
  type = "all",
  page = 1,
  pageSize = PAGE_SIZE,
}: StockMovementListParams): Promise<StockMovementListResult> {
  const search = q?.trim();
  const safePage = Math.max(1, Math.floor(page));

  const where: Prisma.StockMovementWhereInput = {
    companyId,
    ...(type !== "all" ? { movementType: type } : {}),
    ...(search
      ? {
          product: {
            is: {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { sku: { contains: search, mode: "insensitive" } },
              ],
            },
          },
        }
      : {}),
  };

  const [total, movements] = await Promise.all([
    prisma.stockMovement.count({ where }),
    prisma.stockMovement.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (safePage - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        movementType: true,
        quantityDelta: true,
        previousQuantity: true,
        newQuantity: true,
        reason: true,
        referenceType: true,
        referenceId: true,
        createdAt: true,
        product: { select: { id: true, name: true, sku: true, unit: true } },
        createdBy: { select: { fullName: true } },
      },
    }),
  ]);

  return {
    items: movements.map((movement) => ({
      id: movement.id,
      movementType: movement.movementType,
      quantityDelta: Number(movement.quantityDelta),
      previousQuantity: Number(movement.previousQuantity),
      newQuantity: Number(movement.newQuantity),
      reason: movement.reason,
      referenceType: movement.referenceType,
      referenceId: movement.referenceId,
      createdAt: movement.createdAt.toISOString(),
      createdBy: movement.createdBy.fullName,
      product: movement.product,
    })),
    total,
    page: safePage,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    pageSize,
  };
}

export interface ProductMovement {
  id: string;
  movementType: string;
  quantityDelta: number;
  previousQuantity: number;
  newQuantity: number;
  reason: string;
  createdAt: string;
  createdBy: string;
}

export interface ProductDetail {
  id: string;
  sku: string;
  name: string;
  unit: string;
  purchasePrice: number;
  sellingPrice: number;
  stockQuantity: number;
  minimumStock: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  category: { id: string; name: string } | null;
  movements: ProductMovement[];
  soldUnits: number;
  soldRevenue: number;
}

export async function getProductDetail(
  companyId: string,
  productId: string,
): Promise<ProductDetail | null> {
  const product = await prisma.product.findFirst({
    where: { id: productId, companyId },
    select: {
      id: true,
      sku: true,
      name: true,
      unit: true,
      purchasePrice: true,
      sellingPrice: true,
      stockQuantity: true,
      minimumStock: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      category: { select: { id: true, name: true } },
      stockMovements: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          movementType: true,
          quantityDelta: true,
          previousQuantity: true,
          newQuantity: true,
          reason: true,
          createdAt: true,
          createdBy: { select: { fullName: true } },
        },
      },
    },
  });

  if (!product) return null;

  const sold = await prisma.saleItem.aggregate({
    where: { productId, sale: { companyId, status: "COMPLETED" } },
    _sum: { quantity: true, subtotal: true },
  });

  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    unit: product.unit,
    purchasePrice: Number(product.purchasePrice),
    sellingPrice: Number(product.sellingPrice),
    stockQuantity: Number(product.stockQuantity),
    minimumStock: Number(product.minimumStock),
    isActive: product.isActive,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
    category: product.category,
    movements: product.stockMovements.map((movement) => ({
      id: movement.id,
      movementType: movement.movementType,
      quantityDelta: Number(movement.quantityDelta),
      previousQuantity: Number(movement.previousQuantity),
      newQuantity: Number(movement.newQuantity),
      reason: movement.reason,
      createdAt: movement.createdAt.toISOString(),
      createdBy: movement.createdBy.fullName,
    })),
    soldUnits: Number(sold._sum.quantity ?? 0),
    soldRevenue: Number(sold._sum.subtotal ?? 0),
  };
}
