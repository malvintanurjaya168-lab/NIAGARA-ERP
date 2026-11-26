import { prisma } from "@/lib/prisma";
import { PAGE_SIZE } from "@/lib/constants";

export type WarehouseStatusFilter = "all" | "active" | "inactive";

export interface WarehouseListParams {
  companyId: string;
  q?: string;
  status?: WarehouseStatusFilter;
  page?: number;
  pageSize?: number;
}

export interface WarehouseRow {
  id: string;
  code: string;
  name: string;
  address: string | null;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  productCount: number;
}

export interface WarehouseListResult {
  items: WarehouseRow[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
}

export async function getWarehouseList({
  companyId,
  q,
  status = "all",
  page = 1,
  pageSize = PAGE_SIZE,
}: WarehouseListParams): Promise<WarehouseListResult> {
  const search = q?.trim();
  const safePage = Math.max(1, Math.floor(page));

  const where = {
    companyId,
    ...(status === "active" ? { isActive: true } : {}),
    ...(status === "inactive" ? { isActive: false } : {}),
    ...(search
      ? {
          OR: [
            { code: { contains: search, mode: "insensitive" as const } },
            { name: { contains: search, mode: "insensitive" as const } },
            { address: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, warehouses] = await Promise.all([
    prisma.warehouse.count({ where }),
    prisma.warehouse.findMany({
      where,
      orderBy: [{ isDefault: "desc" }, { code: "asc" }],
      skip: (safePage - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        code: true,
        name: true,
        address: true,
        isActive: true,
        isDefault: true,
        createdAt: true,
        _count: { select: { productStocks: true } },
      },
    }),
  ]);

  return {
    items: warehouses.map((warehouse) => ({
      id: warehouse.id,
      code: warehouse.code,
      name: warehouse.name,
      address: warehouse.address,
      isActive: warehouse.isActive,
      isDefault: warehouse.isDefault,
      createdAt: warehouse.createdAt.toISOString(),
      productCount: warehouse._count.productStocks,
    })),
    total,
    page: safePage,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    pageSize,
  };
}

export interface WarehouseStats {
  total: number;
  active: number;
  inactive: number;
}

export async function getWarehouseStats(companyId: string): Promise<WarehouseStats> {
  const [total, active, inactive] = await Promise.all([
    prisma.warehouse.count({ where: { companyId } }),
    prisma.warehouse.count({ where: { companyId, isActive: true } }),
    prisma.warehouse.count({ where: { companyId, isActive: false } }),
  ]);

  return { total, active, inactive };
}

export interface WarehouseDetail {
  id: string;
  code: string;
  name: string;
  address: string | null;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function getWarehouseById(
  companyId: string,
  warehouseId: string,
): Promise<WarehouseDetail | null> {
  const warehouse = await prisma.warehouse.findFirst({
    where: { id: warehouseId, companyId },
    select: {
      id: true,
      code: true,
      name: true,
      address: true,
      isActive: true,
      isDefault: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!warehouse) return null;

  return {
    ...warehouse,
    createdAt: warehouse.createdAt.toISOString(),
    updatedAt: warehouse.updatedAt.toISOString(),
  };
}

export async function getDefaultWarehouse(companyId: string) {
  return prisma.warehouse.findFirst({
    where: { companyId, isDefault: true, isActive: true },
    select: { id: true, code: true, name: true },
  });
}

export interface WarehouseOption {
  id: string;
  code: string;
  name: string;
  isDefault: boolean;
}

export async function getWarehouseOptions(companyId: string): Promise<WarehouseOption[]> {
  const warehouses = await prisma.warehouse.findMany({
    where: { companyId, isActive: true },
    orderBy: [{ isDefault: "desc" }, { code: "asc" }],
    select: { id: true, code: true, name: true, isDefault: true },
  });
  return warehouses;
}

export interface ProductWarehouseStock {
  warehouseId: string;
  code: string;
  name: string;
  isDefault: boolean;
  quantity: number;
}

export async function getProductWarehouseStocks(
  companyId: string,
  productId: string,
): Promise<ProductWarehouseStock[]> {
  const warehouses = await prisma.warehouse.findMany({
    where: { companyId, isActive: true },
    orderBy: [{ isDefault: "desc" }, { code: "asc" }],
    select: {
      id: true,
      code: true,
      name: true,
      isDefault: true,
      productStocks: {
        where: { productId },
        select: { quantity: true },
      },
    },
  });

  return warehouses.map((warehouse) => ({
    warehouseId: warehouse.id,
    code: warehouse.code,
    name: warehouse.name,
    isDefault: warehouse.isDefault,
    quantity: Number(warehouse.productStocks[0]?.quantity ?? 0),
  }));
}
