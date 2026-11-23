import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("No database URL configured");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  const companies = await prisma.company.findMany({
    select: { id: true, name: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  console.log(`companies=${companies.length}`);
  for (const company of companies) {
    console.log(
      JSON.stringify({
        company: company.name,
        id: company.id,
        createdAt: company.createdAt.toISOString(),
      }),
    );
  }

  for (const company of companies) {
    console.log(`\n=== ${company.name} ===`);
    const [users, categories, products, sales, movements] = await Promise.all([
      prisma.user.findMany({
        where: { companyId: company.id },
        select: { role: true, isActive: true },
      }),
      prisma.category.findMany({
        where: { companyId: company.id },
        select: { name: true, isActive: true },
        orderBy: { name: "asc" },
      }),
      prisma.product.findMany({
        where: { companyId: company.id },
        select: {
          sku: true,
          name: true,
          unit: true,
          stockQuantity: true,
          minimumStock: true,
          isActive: true,
          category: { select: { name: true } },
        },
        orderBy: { sku: "asc" },
      }),
      prisma.sale.findMany({
        where: { companyId: company.id },
        select: {
          transactionNumber: true,
          status: true,
          paymentMethod: true,
          totalAmount: true,
          soldAt: true,
          voidedAt: true,
          items: { select: { subtotal: true, quantity: true } },
        },
        orderBy: { soldAt: "asc" },
      }),
      prisma.stockMovement.groupBy({
        by: ["movementType"],
        where: { companyId: company.id },
        _count: { _all: true },
      }),
    ]);

    const roleCounts = users.reduce<Record<string, number>>((acc, user) => {
      const key = `${user.role}:${user.isActive ? "active" : "inactive"}`;
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

    const paymentCounts = sales.reduce<Record<string, number>>((acc, sale) => {
      acc[sale.paymentMethod] = (acc[sale.paymentMethod] ?? 0) + 1;
      return acc;
    }, {});

    const statusCounts = sales.reduce<Record<string, number>>((acc, sale) => {
      acc[sale.status] = (acc[sale.status] ?? 0) + 1;
      return acc;
    }, {});

    const movementCounts = Object.fromEntries(
      movements.map((row) => [row.movementType, row._count._all]),
    );

    const soldAtTimes = sales.map((sale) => sale.soldAt.getTime());
    const dateRange =
      soldAtTimes.length > 0
        ? [
            new Date(Math.min(...soldAtTimes)).toISOString(),
            new Date(Math.max(...soldAtTimes)).toISOString(),
          ]
        : null;

    const mismatchedTotals = sales.filter((sale) => {
      const itemTotal = sale.items.reduce(
        (sum, item) => sum.add(item.subtotal),
        new Prisma.Decimal(0),
      );
      return !itemTotal.eq(sale.totalAmount);
    }).length;

    console.log(
      JSON.stringify({
        users: roleCounts,
        categories: categories.map((category) => category.name),
        categoryActive: categories.filter((category) => category.isActive).length,
        products: products.length,
        activeProducts: products.filter((product) => product.isActive).length,
        lowStock: products.filter(
          (product) =>
            product.isActive &&
            product.stockQuantity.gt(0) &&
            product.stockQuantity.lte(product.minimumStock),
        ).length,
        outOfStock: products.filter(
          (product) => product.isActive && product.stockQuantity.lte(0),
        ).length,
        negativeStock: products.filter((product) =>
          product.stockQuantity.lt(0),
        ).length,
        sales: sales.length,
        saleItems: sales.reduce((sum, sale) => sum + sale.items.length, 0),
        statusCounts,
        paymentCounts,
        dateRange,
        mismatchedSaleTotals: mismatchedTotals,
        movements: movementCounts,
      }),
    );

    console.log("PRODUCTS");
    for (const product of products) {
      console.log(
        [
          product.sku.padEnd(10),
          product.category?.name ?? "-",
          product.isActive ? "active" : "inactive",
          `stock=${product.stockQuantity.toString()}`,
          `min=${product.minimumStock.toString()}`,
          product.name,
        ].join(" | "),
      );
    }

    const latestMismatches: string[] = [];
    for (const product of products) {
      const movement = await prisma.stockMovement.findFirst({
        where: {
          companyId: company.id,
          product: { sku: product.sku },
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: { newQuantity: true, createdAt: true },
      });
      if (!movement || !movement.newQuantity.eq(product.stockQuantity)) {
        latestMismatches.push(
          `${product.sku}: product=${product.stockQuantity.toString()} latest=${movement?.newQuantity.toString() ?? "none"}`,
        );
      }
    }
    console.log(
      `latestMovementMismatches=${latestMismatches.length}${latestMismatches.length ? ` -> ${latestMismatches.join("; ")}` : ""}`,
    );

    const voided = sales.filter((sale) => sale.status === "VOIDED");
    console.log(
      `voided=${voided.length}, voidedWithReason=${voided.filter((sale) => sale.voidedAt).length}`,
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
