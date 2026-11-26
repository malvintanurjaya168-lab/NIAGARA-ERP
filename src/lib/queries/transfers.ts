import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { PAGE_SIZE } from "@/lib/constants";

export type TransferStatusFilter = "all" | "DRAFT" | "COMPLETED" | "CANCELLED";

export interface TransferListParams {
  companyId: string;
  status?: TransferStatusFilter;
  q?: string;
  from?: Date;
  to?: Date;
  page?: number;
  pageSize?: number;
}

export interface TransferRow {
  id: string;
  transferNumber: string;
  status: string;
  note: string | null;
  createdAt: string;
  completedAt: string | null;
  cancelledAt: string | null;
  itemCount: number;
  fromWarehouse: { code: string; name: string };
  toWarehouse: { code: string; name: string };
  createdByName: string;
}

export interface TransferListResult {
  items: TransferRow[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
}

export async function getTransferList({
  companyId,
  status = "all",
  q,
  from,
  to,
  page = 1,
  pageSize = PAGE_SIZE,
}: TransferListParams): Promise<TransferListResult> {
  const search = q?.trim();
  const safePage = Math.max(1, Math.floor(page));

  const where: Prisma.StockTransferWhereInput = {
    companyId,
    ...(status !== "all" ? { status: status as Prisma.StockTransferWhereInput["status"] } : {}),
    ...(from || to
      ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lt: to } : {}) } }
      : {}),
    ...(search
      ? { transferNumber: { contains: search, mode: "insensitive" } }
      : {}),
  };

  const [total, transfers] = await Promise.all([
    prisma.stockTransfer.count({ where }),
    prisma.stockTransfer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (safePage - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        transferNumber: true,
        status: true,
        note: true,
        createdAt: true,
        completedAt: true,
        cancelledAt: true,
        fromWarehouse: { select: { code: true, name: true } },
        toWarehouse: { select: { code: true, name: true } },
        createdBy: { select: { fullName: true } },
        _count: { select: { items: true } },
      },
    }),
  ]);

  return {
    items: transfers.map((transfer) => ({
      id: transfer.id,
      transferNumber: transfer.transferNumber,
      status: transfer.status,
      note: transfer.note,
      createdAt: transfer.createdAt.toISOString(),
      completedAt: transfer.completedAt?.toISOString() ?? null,
      cancelledAt: transfer.cancelledAt?.toISOString() ?? null,
      itemCount: transfer._count.items,
      fromWarehouse: transfer.fromWarehouse,
      toWarehouse: transfer.toWarehouse,
      createdByName: transfer.createdBy.fullName,
    })),
    total,
    page: safePage,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    pageSize,
  };
}

export interface TransferStats {
  total: number;
  draft: number;
  completed: number;
  cancelled: number;
}

export async function getTransferStats(companyId: string): Promise<TransferStats> {
  const [total, draft, completed, cancelled] = await Promise.all([
    prisma.stockTransfer.count({ where: { companyId } }),
    prisma.stockTransfer.count({ where: { companyId, status: "DRAFT" } }),
    prisma.stockTransfer.count({ where: { companyId, status: "COMPLETED" } }),
    prisma.stockTransfer.count({ where: { companyId, status: "CANCELLED" } }),
  ]);
  return { total, draft, completed, cancelled };
}

export interface TransferItemDetail {
  id: string;
  productId: string;
  name: string;
  sku: string;
  unit: string;
  quantity: number;
}

export interface TransferDetail {
  id: string;
  transferNumber: string;
  status: string;
  note: string | null;
  createdAt: string;
  completedAt: string | null;
  cancelledAt: string | null;
  fromWarehouse: { code: string; name: string };
  toWarehouse: { code: string; name: string };
  createdByName: string;
  items: TransferItemDetail[];
}

export async function getTransferDetail(
  companyId: string,
  transferId: string,
): Promise<TransferDetail | null> {
  const transfer = await prisma.stockTransfer.findFirst({
    where: { id: transferId, companyId },
    select: {
      id: true,
      transferNumber: true,
      status: true,
      note: true,
      createdAt: true,
      completedAt: true,
      cancelledAt: true,
      fromWarehouse: { select: { code: true, name: true } },
      toWarehouse: { select: { code: true, name: true } },
      createdBy: { select: { fullName: true } },
      items: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          productId: true,
          quantity: true,
          product: { select: { name: true, sku: true, unit: true } },
        },
      },
    },
  });

  if (!transfer) return null;

  return {
    id: transfer.id,
    transferNumber: transfer.transferNumber,
    status: transfer.status,
    note: transfer.note,
    createdAt: transfer.createdAt.toISOString(),
    completedAt: transfer.completedAt?.toISOString() ?? null,
    cancelledAt: transfer.cancelledAt?.toISOString() ?? null,
    fromWarehouse: transfer.fromWarehouse,
    toWarehouse: transfer.toWarehouse,
    createdByName: transfer.createdBy.fullName,
    items: transfer.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      name: item.product.name,
      sku: item.product.sku,
      unit: item.product.unit,
      quantity: Number(item.quantity),
    })),
  };
}

export interface TransferProductOption {
  id: string;
  name: string;
  sku: string;
  unit: string;
  /** quantity per warehouseId */
  stocks: Record<string, number>;
}

export async function getTransferProductOptions(
  companyId: string,
): Promise<TransferProductOption[]> {
  const products = await prisma.product.findMany({
    where: { companyId, isActive: true },
    orderBy: { name: "asc" },
    take: 500,
    select: {
      id: true,
      name: true,
      sku: true,
      unit: true,
      productStocks: { select: { warehouseId: true, quantity: true } },
    },
  });

  return products.map((product) => {
    const stocks: Record<string, number> = {};
    for (const stock of product.productStocks) {
      stocks[stock.warehouseId] = Number(stock.quantity);
    }
    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      unit: product.unit,
      stocks,
    };
  });
}
