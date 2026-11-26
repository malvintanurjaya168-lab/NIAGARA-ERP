import { describe, expect, it } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import { applyStockDelta } from "@/lib/stock";
import { fakeInventoryPrisma } from "@/test-utils/fake-inventory";
import {
  makeProduct,
  makeProductStock,
  makeWarehouse,
  productRows,
  productStockRows,
  resetInventoryRows,
} from "@/test-utils/fake-inventory";

const CO = "co-a";
const WH = "wh-1";
const WH2 = "wh-2";
const PROD = "prod-1";

function seed() {
  resetInventoryRows({
    warehouses: [
      makeWarehouse({ id: WH, companyId: CO, code: "D", isDefault: true }),
      makeWarehouse({ id: WH2, companyId: CO, code: "W2" }),
    ],
    products: [
      makeProduct({
        id: PROD,
        companyId: CO,
        sku: "SKU-1",
        stockQuantity: new Prisma.Decimal(14),
      }),
    ],
    productStocks: [
      makeProductStock({
        id: "ps-1",
        companyId: CO,
        productId: PROD,
        warehouseId: WH,
        quantity: new Prisma.Decimal(10),
      }),
      makeProductStock({
        id: "ps-2",
        companyId: CO,
        productId: PROD,
        warehouseId: WH2,
        quantity: new Prisma.Decimal(4),
      }),
    ],
  });
}

const tx = fakeInventoryPrisma as never;

describe("applyStockDelta", () => {
  it("decrements warehouse balance and company total atomically", async () => {
    seed();
    const result = await applyStockDelta(tx, {
      companyId: CO,
      productId: PROD,
      warehouseId: WH,
      delta: new Prisma.Decimal(-3),
    });
    expect(result.previousQuantity.toString()).toBe("10");
    expect(result.newQuantity.toString()).toBe("7");
    expect(productStockRows.find((r) => r.id === "ps-1")?.quantity.toString()).toBe("7");
    expect(productStockRows.find((r) => r.id === "ps-2")?.quantity.toString()).toBe("4");
    expect(productRows[0]?.stockQuantity.toString()).toBe("11");
  });

  it("increments both balances", async () => {
    seed();
    const result = await applyStockDelta(tx, {
      companyId: CO,
      productId: PROD,
      warehouseId: WH2,
      delta: new Prisma.Decimal(5),
    });
    expect(result.newQuantity.toString()).toBe("9");
    expect(productRows[0]?.stockQuantity.toString()).toBe("19");
  });

  it("sets absolute warehouse quantity and adjusts total by delta", async () => {
    seed();
    const result = await applyStockDelta(tx, {
      companyId: CO,
      productId: PROD,
      warehouseId: WH,
      setQuantity: new Prisma.Decimal(2),
    });
    expect(result.newQuantity.toString()).toBe("2");
    // WH 10 -> 2 (delta -8); total 14 - 8 = 6 (WH2 still holds 4)
    expect(productRows[0]?.stockQuantity.toString()).toBe("6");
  });

  it("rejects decrement beyond warehouse stock", async () => {
    seed();
    await expect(
      applyStockDelta(tx, {
        companyId: CO,
        productId: PROD,
        warehouseId: WH2,
        delta: new Prisma.Decimal(-5),
      }),
    ).rejects.toMatchObject({ code: "BUSINESS" });
    expect(productStockRows.find((r) => r.id === "ps-2")?.quantity.toString()).toBe("4");
    expect(productRows[0]?.stockQuantity.toString()).toBe("14");
  });

  it("creates a balance row for a warehouse without one", async () => {
    seed();
    const result = await applyStockDelta(tx, {
      companyId: CO,
      productId: PROD,
      warehouseId: "wh-new",
      delta: new Prisma.Decimal(6),
    });
    expect(result.newQuantity.toString()).toBe("6");
    expect(productStockRows).toHaveLength(3);
    expect(productRows[0]?.stockQuantity.toString()).toBe("20");
  });

  it("does not touch another company's balances", async () => {
    seed();
    productRows.push(
      makeProduct({
        id: "prod-b",
        companyId: "co-b",
        stockQuantity: new Prisma.Decimal(3),
      }),
    );
    await applyStockDelta(tx, {
      companyId: CO,
      productId: PROD,
      warehouseId: WH,
      delta: new Prisma.Decimal(-1),
    });
    expect(productRows.find((r) => r.id === "prod-b")?.stockQuantity.toString()).toBe("3");
  });
});
