import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { PAYMENT_METHODS } from "@/lib/constants";
import { dayKeyOf, eachDayKey } from "@/lib/periods";

export interface ReportSeriesPoint {
  date: string;
  revenue: number;
  cogs: number;
  profit: number;
  transactions: number;
}

export interface PaymentBreakdown {
  method: string;
  label: string;
  count: number;
  revenue: number;
  share: number;
}

export interface TopProduct {
  productId: string;
  name: string;
  sku: string;
  units: number;
  revenue: number;
  profit: number;
}

export interface FinancialReport {
  revenue: number;
  cogs: number;
  grossProfit: number;
  margin: number;
  transactionCount: number;
  average: number;
  itemCount: number;
  series: ReportSeriesPoint[];
  payments: PaymentBreakdown[];
  topProducts: TopProduct[];
}

export async function getFinancialReport(
  companyId: string,
  from: Date,
  to: Date,
): Promise<FinancialReport> {
  const sales = await prisma.sale.findMany({
    where: {
      companyId,
      status: "COMPLETED",
      soldAt: { gte: from, lt: to },
    },
    orderBy: { soldAt: "asc" },
    select: {
      id: true,
      soldAt: true,
      totalAmount: true,
      paymentMethod: true,
      items: {
        select: {
          productId: true,
          productNameSnapshot: true,
          skuSnapshot: true,
          quantity: true,
          purchaseCostSnapshot: true,
          subtotal: true,
        },
      },
    },
  });

  let revenue = new Prisma.Decimal(0);
  let cogs = new Prisma.Decimal(0);
  let itemCount = new Prisma.Decimal(0);

  const dayMap = new Map<
    string,
    {
      revenue: Prisma.Decimal;
      cogs: Prisma.Decimal;
      transactions: number;
    }
  >();

  const paymentMap = new Map<
    string,
    { count: number; revenue: Prisma.Decimal }
  >();

  const productMap = new Map<
    string,
    {
      name: string;
      sku: string;
      units: Prisma.Decimal;
      revenue: Prisma.Decimal;
      profit: Prisma.Decimal;
    }
  >();

  for (const sale of sales) {
    revenue = revenue.add(sale.totalAmount);

    const dayKey = dayKeyOf(sale.soldAt);
    const day = dayMap.get(dayKey) ?? {
      revenue: new Prisma.Decimal(0),
      cogs: new Prisma.Decimal(0),
      transactions: 0,
    };
    day.revenue = day.revenue.add(sale.totalAmount);
    day.transactions += 1;

    const payment = paymentMap.get(sale.paymentMethod) ?? {
      count: 0,
      revenue: new Prisma.Decimal(0),
    };
    payment.count += 1;
    payment.revenue = payment.revenue.add(sale.totalAmount);
    paymentMap.set(sale.paymentMethod, payment);

    for (const item of sale.items) {
      const itemCost = item.purchaseCostSnapshot.mul(item.quantity);
      cogs = cogs.add(itemCost);
      day.cogs = day.cogs.add(itemCost);
      itemCount = itemCount.add(item.quantity);

      const product = productMap.get(item.productId) ?? {
        name: item.productNameSnapshot,
        sku: item.skuSnapshot,
        units: new Prisma.Decimal(0),
        revenue: new Prisma.Decimal(0),
        profit: new Prisma.Decimal(0),
      };
      product.units = product.units.add(item.quantity);
      product.revenue = product.revenue.add(item.subtotal);
      product.profit = product.profit.add(item.subtotal.sub(itemCost));
      productMap.set(item.productId, product);
    }

    dayMap.set(dayKey, day);
  }

  const fromKey = dayKeyOf(from);
  const toKey = dayKeyOf(new Date(to.getTime() - 1));
  const series: ReportSeriesPoint[] = eachDayKey(fromKey, toKey).map((date) => {
    const day = dayMap.get(date);
    const dayRevenue = day?.revenue ?? new Prisma.Decimal(0);
    const dayCogs = day?.cogs ?? new Prisma.Decimal(0);
    return {
      date,
      revenue: Number(dayRevenue),
      cogs: Number(dayCogs),
      profit: Number(dayRevenue.sub(dayCogs)),
      transactions: day?.transactions ?? 0,
    };
  });

  const grossProfit = revenue.sub(cogs);
  const revenueNumber = Number(revenue);
  const transactionCount = sales.length;

  const payments: PaymentBreakdown[] = PAYMENT_METHODS.map((method) => {
    const entry = paymentMap.get(method.value);
    return {
      method: method.value,
      label: method.label,
      count: entry?.count ?? 0,
      revenue: Number(entry?.revenue ?? 0),
      share:
        revenueNumber > 0 ? (Number(entry?.revenue ?? 0) / revenueNumber) * 100 : 0,
    };
  });

  const topProducts: TopProduct[] = [...productMap.entries()]
    .map(([productId, value]) => ({
      productId,
      name: value.name,
      sku: value.sku,
      units: Number(value.units),
      revenue: Number(value.revenue),
      profit: Number(value.profit),
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);

  return {
    revenue: revenueNumber,
    cogs: Number(cogs),
    grossProfit: Number(grossProfit),
    margin:
      revenueNumber > 0 ? (Number(grossProfit) / revenueNumber) * 100 : 0,
    transactionCount,
    average: transactionCount > 0 ? revenueNumber / transactionCount : 0,
    itemCount: Number(itemCount),
    series,
    payments,
    topProducts,
  };
}
