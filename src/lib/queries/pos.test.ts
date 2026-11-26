import { describe, expect, it, vi } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import { getPosCatalog, getPosWarehouses } from "@/lib/queries/pos";
import {
  makeProduct,
  makeProductStock,
  makeWarehouse,
  resetInventoryRows,
} from "@/test-utils/fake-inventory";

vi.mock("@/lib/prisma", async () => {
  const { fakeInventoryPrisma } = await import("@/test-utils/fake-inventory");
  return { prisma: fakeInventoryPrisma };
});

const CO = "co-a";
const WH = "55555555-5555-4555-8555-555555555551";
const WH2 = "55555555-5555-4555-8555-555555555552";
const P1 = "44444444-4444-4444-8444-444444444444";
const P2 = "44444444-4444-4444-8444-444444444445";

function seed() {
  resetInventoryRows({
    warehouses: [
      makeWarehouse({ id: WH, companyId: CO, code: "D", isDefault: true }),
      makeWarehouse({ id: WH2, companyId: CO, code: "W2" }),
      makeWarehouse({ id: "wh-off", companyId: CO, code: "OFF", isActive: false }),
    ],
    products: [
      makeProduct({
        id: P1,
        companyId: CO,
        sku: "SKU-1",
        stockQuantity: new Prisma.Decimal(10),
      }),
      makeProduct({
        id: P2,
        companyId: CO,
        sku: "SKU-2",
        stockQuantity: new Prisma.Decimal(3),
      }),
      makeProduct({
        id: "prod-off",
        companyId: CO,
        sku: "SKU-3",
        isActive: false,
      }),
    ],
    productStocks: [
      makeProductStock({
        id: "ps-1",
        companyId: CO,
        productId: P1,
        warehouseId: WH,
        quantity: new Prisma.Decimal(6),
      }),
      makeProductStock({
        id: "ps-2",
        companyId: CO,
        productId: P1,
        warehouseId: WH2,
        quantity: new Prisma.Decimal(4),
      }),
      // P2 has stock only in WH2 — zero in WH.
      makeProductStock({
        id: "ps-3",
        companyId: CO,
        productId: P2,
        warehouseId: WH2,
        quantity: new Prisma.Decimal(3),
      }),
    ],
  });
}

describe("getPosWarehouses", () => {
  it("returns only active warehouses, default first", async () => {
    seed();
    const warehouses = await getPosWarehouses(CO);
    expect(warehouses.map((w) => w.id)).toEqual([WH, WH2]);
    expect(warehouses[0]?.isDefault).toBe(true);
  });
});

describe("getPosCatalog", () => {
  it("reports warehouse-specific availability, not the company total", async () => {
    seed();
    const catalog = await getPosCatalog(CO, WH);
    const p1 = catalog.find((p) => p.id === P1);
    const p2 = catalog.find((p) => p.id === P2);
    expect(p1?.stockQuantity).toBe(6); // WH balance, not total 10
    expect(p2?.stockQuantity).toBe(0); // no stock row in WH
    expect(catalog.find((p) => p.id === "prod-off")).toBeUndefined();
  });

  it("reflects the other warehouse's balances after switching", async () => {
    seed();
    const catalog = await getPosCatalog(CO, WH2);
    expect(catalog.find((p) => p.id === P1)?.stockQuantity).toBe(4);
    expect(catalog.find((p) => p.id === P2)?.stockQuantity).toBe(3);
  });
});
