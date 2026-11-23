import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  addDaysKey,
  dayKeyOf,
  eachDayKey,
  jakartaDayStart,
  todayKey,
} from "@/lib/periods";

const ZERO = new Prisma.Decimal(0);

function decimal(value: Prisma.Decimal | string | number | null | undefined) {
  return new Prisma.Decimal(value ?? 0);
}

export interface SalesSeriesPoint {
  date: string;
  revenue: number;
  transactions: number;
}

export interface BestSeller {
  productId: string;
  name: string;
  sku: string;
  units: number;
  revenue: number;
}

export interface LowStockItem {
  id: string;
  name: string;
  sku: string;
  unit: string;
  stock: number;
  minimum: number;
}

export interface RecentSale {
  id: string;
  transactionNumber: string;
  soldAt: string;
  cashierName: string;
  totalAmount: number;
  paymentMethod: string;
  status: string;
  itemCount: number;
}

export interface DashboardData {
  metrics: {
    totalRevenue: number;
    todayRevenue: number;
    totalProducts: number;
    lowStockCount: number;
    outOfStockCount: number;
    totalTransactions: number;
    grossProfit: number;
    cogs: number;
    averageTransaction: number;
  };
  series: SalesSeriesPoint[];
  bestSellers: BestSeller[];
  lowStock: LowStockItem[];
  recentSales: RecentSale[];
}

export async function getDashboardData(companyId: string): Promise<DashboardData> {
  const today = todayKey();
  const todayStart = jakartaDayStart(today);
  const tomorrowStart = jakartaDayStart(addDaysKey(today, 1));
  const seriesStart = jakartaDayStart(addDaysKey(today, -364));

  const completed = { companyId, status: "COMPLETED" as const };

  const [
    totalRevenueAgg,
    todayRevenueAgg,
    totalTransactions,
    totalProducts,
    lowStockCount,
    outOfStockCount,
    cogsItems,
    seriesSales,
    bestSellerGroups,
    lowStockProducts,
    recentSales,
  ] = await Promise.all([
    prisma.sale.aggregate({
      where: completed,
      _sum: { totalAmount: true },
    }),
    prisma.sale.aggregate({
      where: {
        ...completed,
        soldAt: { gte: todayStart, lt: tomorrowStart },
      },
      _sum: { totalAmount: true },
    }),
    prisma.sale.count({ where: completed }),
    prisma.product.count({ where: { companyId, isActive: true } }),
    prisma.product.count({
      where: {
        companyId,
        isActive: true,
        stockQuantity: {
          gt: 0,
          lte: prisma.product.fields.minimumStock,
        },
      },
    }),
    prisma.product.count({
      where: {
        companyId,
        isActive: true,
        stockQuantity: { lte: 0 },
      },
    }),
    prisma.saleItem.findMany({
      where: { sale: { companyId, status: "COMPLETED" } },
      select: { quantity: true, purchaseCostSnapshot: true },
    }),
    prisma.sale.findMany({
      where: {
        ...completed,
        soldAt: { gte: seriesStart, lt: tomorrowStart },
      },
      select: { soldAt: true, totalAmount: true },
    }),
    prisma.saleItem.groupBy({
      by: ["productId"],
      where: { sale: { companyId, status: "COMPLETED" } },
      _sum: { quantity: true, subtotal: true },
      orderBy: { _sum: { subtotal: "desc" } },
      take: 5,
    }),
    prisma.product.findMany({
      where: {
        companyId,
        isActive: true,
        stockQuantity: { lte: prisma.product.fields.minimumStock },
      },
      select: {
        id: true,
        name: true,
        sku: true,
        unit: true,
        stockQuantity: true,
        minimumStock: true,
      },
      orderBy: { stockQuantity: "asc" },
      take: 5,
    }),
    prisma.sale.findMany({
      where: { companyId },
      orderBy: { soldAt: "desc" },
      take: 6,
      select: {
        id: true,
        transactionNumber: true,
        soldAt: true,
        totalAmount: true,
        paymentMethod: true,
        status: true,
        cashier: { select: { fullName: true } },
        _count: { select: { items: true } },
      },
    }),
  ]);

  const totalRevenue = decimal(totalRevenueAgg._sum.totalAmount);
  const todayRevenue = decimal(todayRevenueAgg._sum.totalAmount);

  let cogs = ZERO;
  for (const item of cogsItems) {
    cogs = cogs.add(
      decimal(item.purchaseCostSnapshot).mul(decimal(item.quantity)),
    );
  }

  const grossProfit = totalRevenue.sub(cogs);
  const averageTransaction =
    totalTransactions > 0
      ? totalRevenue.div(totalTransactions)
      : new Prisma.Decimal(0);

  const dayMap = new Map<
    string,
    { revenue: Prisma.Decimal; transactions: number }
  >();

  for (const sale of seriesSales) {
    const key = dayKeyOf(sale.soldAt);
    const entry = dayMap.get(key) ?? {
      revenue: new Prisma.Decimal(0),
      transactions: 0,
    };
    entry.revenue = entry.revenue.add(decimal(sale.totalAmount));
    entry.transactions += 1;
    dayMap.set(key, entry);
  }

  const series: SalesSeriesPoint[] = eachDayKey(
    addDaysKey(today, -364),
    today,
  ).map((date) => {
    const entry = dayMap.get(date);
    return {
      date,
      revenue: entry ? Number(entry.revenue) : 0,
      transactions: entry?.transactions ?? 0,
    };
  });

  const bestSellerIds = bestSellerGroups.map((group) => group.productId);
  const bestSellerProducts = bestSellerIds.length
    ? await prisma.product.findMany({
        where: { companyId, id: { in: bestSellerIds } },
        select: { id: true, name: true, sku: true },
      })
    : [];
  const productMap = new Map(
    bestSellerProducts.map((product) => [product.id, product]),
  );

  return {
    metrics: {
      totalRevenue: Number(totalRevenue),
      todayRevenue: Number(todayRevenue),
      totalProducts,
      lowStockCount,
      outOfStockCount,
      totalTransactions,
      grossProfit: Number(grossProfit),
      cogs: Number(cogs),
      averageTransaction: Number(averageTransaction),
    },
    series,
    bestSellers: bestSellerGroups.map((group) => {
      const product = productMap.get(group.productId);
      return {
        productId: group.productId,
        name: product?.name ?? "Produk",
        sku: product?.sku ?? "-",
        units: Number(group._sum.quantity ?? 0),
        revenue: Number(group._sum.subtotal ?? 0),
      };
    }),
    lowStock: lowStockProducts.map((product) => ({
      id: product.id,
      name: product.name,
      sku: product.sku,
      unit: product.unit,
      stock: Number(product.stockQuantity),
      minimum: Number(product.minimumStock),
    })),
    recentSales: recentSales.map((sale) => ({
      id: sale.id,
      transactionNumber: sale.transactionNumber,
      soldAt: sale.soldAt.toISOString(),
      cashierName: sale.cashier.fullName,
      totalAmount: Number(sale.totalAmount),
      paymentMethod: sale.paymentMethod,
      status: sale.status,
      itemCount: sale._count.items,
    })),
  };
}
