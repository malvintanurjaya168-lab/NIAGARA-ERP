import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { SALES_PAGE_SIZE } from "@/lib/constants";

export interface SalesListParams {
  companyId: string;
  cashierId?: string;
  scopeToCashierId?: string;
  from: Date;
  to: Date;
  q?: string;
  paymentMethod?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface SaleRow {
  id: string;
  transactionNumber: string;
  soldAt: string;
  cashierName: string;
  warehouseName: string | null;
  paymentMethod: string;
  status: string;
  totalAmount: number;
  itemCount: number;
}

export interface SalesListResult {
  items: SaleRow[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
  revenue: number;
  completedCount: number;
  voidedCount: number;
  average: number;
}

export async function getSalesList({
  companyId,
  cashierId,
  scopeToCashierId,
  from,
  to,
  q,
  paymentMethod,
  status,
  page = 1,
  pageSize = SALES_PAGE_SIZE,
}: SalesListParams): Promise<SalesListResult> {
  const safePage = Math.max(1, Math.floor(page));
  const search = q?.trim();

  const base: Prisma.SaleWhereInput = {
    companyId,
    soldAt: { gte: from, lt: to },
    ...(scopeToCashierId ? { cashierId: scopeToCashierId } : {}),
    ...(cashierId ? { cashierId } : {}),
    ...(paymentMethod
      ? { paymentMethod: paymentMethod as Prisma.SaleWhereInput["paymentMethod"] }
      : {}),
    ...(search
      ? { transactionNumber: { contains: search, mode: "insensitive" } }
      : {}),
  };

  const where: Prisma.SaleWhereInput = {
    ...base,
    ...(status === "COMPLETED" || status === "VOIDED" ? { status } : {}),
  };

  const [total, sales, completedAgg, voidedCount] = await Promise.all([
    prisma.sale.count({ where }),
    prisma.sale.findMany({
      where,
      orderBy: { soldAt: "desc" },
      skip: (safePage - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        transactionNumber: true,
        soldAt: true,
        paymentMethod: true,
        status: true,
        totalAmount: true,
        cashier: { select: { fullName: true } },
        warehouse: { select: { name: true, code: true } },
        _count: { select: { items: true } },
      },
    }),
    prisma.sale.aggregate({
      where: { ...base, status: "COMPLETED" },
      _sum: { totalAmount: true },
      _count: { _all: true },
    }),
    prisma.sale.count({ where: { ...base, status: "VOIDED" } }),
  ]);

  const revenue = Number(completedAgg._sum.totalAmount ?? 0);
  const completedCount = completedAgg._count._all;

  return {
    items: sales.map((sale) => ({
      id: sale.id,
      transactionNumber: sale.transactionNumber,
      soldAt: sale.soldAt.toISOString(),
      cashierName: sale.cashier.fullName,
      warehouseName: sale.warehouse
        ? `${sale.warehouse.code} — ${sale.warehouse.name}`
        : null,
      paymentMethod: sale.paymentMethod,
      status: sale.status,
      totalAmount: Number(sale.totalAmount),
      itemCount: sale._count.items,
    })),
    total,
    page: safePage,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    pageSize,
    revenue,
    completedCount,
    voidedCount,
    average: completedCount > 0 ? revenue / completedCount : 0,
  };
}

export interface CashierOption {
  id: string;
  fullName: string;
}

export async function getCashierOptions(companyId: string): Promise<CashierOption[]> {
  return prisma.user.findMany({
    where: { companyId, sales: { some: {} } },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true },
  });
}

export interface SaleItemDetail {
  id: string;
  productId: string;
  name: string;
  sku: string;
  unit: string;
  quantity: number;
  sellingPrice: number;
  purchaseCost: number;
  subtotal: number;
}

export interface SaleDetail {
  id: string;
  transactionNumber: string;
  soldAt: string;
  paymentMethod: string;
  status: string;
  totalAmount: number;
  clientRequestId: string | null;
  voidedAt: string | null;
  voidReason: string | null;
  voidedByName: string | null;
  cashierName: string;
  cashierId: string;
  warehouse: { name: string; code: string } | null;
  items: SaleItemDetail[];
  itemCount: number;
  cogs: number;
  grossProfit: number;
  company: {
    name: string;
    address: string | null;
    phone: string | null;
    contactEmail: string | null;
  };
}

export async function getSaleDetail(
  companyId: string,
  saleId: string,
  options: { userId: string; viewAll: boolean },
): Promise<SaleDetail | null> {
  const sale = await prisma.sale.findFirst({
    where: {
      id: saleId,
      companyId,
      ...(options.viewAll ? {} : { cashierId: options.userId }),
    },
    select: {
      id: true,
      transactionNumber: true,
      soldAt: true,
      paymentMethod: true,
      status: true,
      totalAmount: true,
      clientRequestId: true,
      voidedAt: true,
      voidReason: true,
      cashierId: true,
      cashier: { select: { fullName: true } },
      voidedBy: { select: { fullName: true } },
      warehouse: { select: { name: true, code: true } },
      company: {
        select: {
          name: true,
          address: true,
          phone: true,
          contactEmail: true,
        },
      },
      items: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          productId: true,
          productNameSnapshot: true,
          skuSnapshot: true,
          unitSnapshot: true,
          quantity: true,
          sellingPriceSnapshot: true,
          purchaseCostSnapshot: true,
          subtotal: true,
        },
      },
    },
  });

  if (!sale) return null;

  const cogs = sale.items.reduce(
    (sum, item) => sum.add(item.purchaseCostSnapshot.mul(item.quantity)),
    new Prisma.Decimal(0),
  );

  return {
    id: sale.id,
    transactionNumber: sale.transactionNumber,
    soldAt: sale.soldAt.toISOString(),
    paymentMethod: sale.paymentMethod,
    status: sale.status,
    totalAmount: Number(sale.totalAmount),
    clientRequestId: sale.clientRequestId,
    voidedAt: sale.voidedAt?.toISOString() ?? null,
    voidReason: sale.voidReason,
    voidedByName: sale.voidedBy?.fullName ?? null,
    cashierName: sale.cashier.fullName,
    cashierId: sale.cashierId,
    warehouse: sale.warehouse,
    itemCount: sale.items.length,
    items: sale.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      name: item.productNameSnapshot,
      sku: item.skuSnapshot,
      unit: item.unitSnapshot,
      quantity: Number(item.quantity),
      sellingPrice: Number(item.sellingPriceSnapshot),
      purchaseCost: Number(item.purchaseCostSnapshot),
      subtotal: Number(item.subtotal),
    })),
    cogs: Number(cogs),
    grossProfit: Number(sale.totalAmount.sub(cogs)),
    company: sale.company,
  };
}
