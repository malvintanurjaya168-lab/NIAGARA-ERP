import { describe, expect, it, vi, beforeEach } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import {
  adjustStockAction,
  createProductAction,
} from "@/lib/actions/inventory";
import { requireActionUser } from "@/lib/auth-guards";
import {
  makeProduct,
  makeProductStock,
  makeWarehouse,
  productRows,
  productStockRows,
  resetInventoryRows,
  stockMovementRows,
  warehouseRows,
} from "@/test-utils/fake-inventory";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/lib/prisma", async () => {
  const { fakeInventoryPrisma } = await import("@/test-utils/fake-inventory");
  return { prisma: fakeInventoryPrisma };
});

vi.mock("@/lib/auth-guards", () => ({
  requireActionUser: vi.fn(),
  getCurrentUser: vi.fn(),
}));

const requireActionUserMock = vi.mocked(requireActionUser);

const USER = {
  id: "user-1",
  companyId: "co-a",
  fullName: "Staf",
  email: "staff@a.test",
  role: "INVENTORY_STAFF",
  isActive: true,
};

const WH = "55555555-5555-4555-8555-555555555551";
const WH2 = "55555555-5555-4555-8555-555555555552";
const PROD = "44444444-4444-4444-8444-444444444444";

function fd(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

function seed() {
  resetInventoryRows({
    warehouses: [
      makeWarehouse({ id: WH, companyId: "co-a", code: "D", isDefault: true }),
      makeWarehouse({ id: WH2, companyId: "co-a", code: "W2" }),
      makeWarehouse({
        id: "66666666-6666-4666-8666-666666666666",
        companyId: "co-b",
        code: "DB",
        isDefault: true,
      }),
    ],
    products: [
      makeProduct({
        id: PROD,
        companyId: "co-a",
        sku: "SKU-1",
        stockQuantity: new Prisma.Decimal(14),
      }),
    ],
    productStocks: [
      makeProductStock({
        id: "ps-1",
        companyId: "co-a",
        productId: PROD,
        warehouseId: WH,
        quantity: new Prisma.Decimal(10),
      }),
      makeProductStock({
        id: "ps-2",
        companyId: "co-a",
        productId: PROD,
        warehouseId: WH2,
        quantity: new Prisma.Decimal(4),
      }),
    ],
  });
}

beforeEach(() => {
  seed();
  requireActionUserMock.mockReset();
  requireActionUserMock.mockResolvedValue(USER as never);
});

describe("adjustStockAction", () => {
  it("STOCK_IN increments the selected warehouse and total", async () => {
    const result = await adjustStockAction(
      undefined,
      fd({
        productId: PROD,
        warehouseId: WH2,
        movementType: "STOCK_IN",
        quantity: "3",
        reason: "Pembelian supplier",
      }),
    );
    expect(result.ok).toBe(true);
    expect(productStockRows.find((r) => r.id === "ps-2")?.quantity.toString()).toBe("7");
    expect(productRows[0]?.stockQuantity.toString()).toBe("17");
    const movement = stockMovementRows.at(-1);
    expect(movement?.warehouseId).toBe(WH2);
    expect(movement?.previousQuantity.toString()).toBe("4");
    expect(movement?.newQuantity.toString()).toBe("7");
  });

  it("STOCK_OUT decrements only the selected warehouse", async () => {
    const result = await adjustStockAction(
      undefined,
      fd({
        productId: PROD,
        warehouseId: WH2,
        movementType: "STOCK_OUT",
        quantity: "2",
        reason: "Barang rusak",
      }),
    );
    expect(result.ok).toBe(true);
    expect(productStockRows.find((r) => r.id === "ps-2")?.quantity.toString()).toBe("2");
    expect(productStockRows.find((r) => r.id === "ps-1")?.quantity.toString()).toBe("10");
    expect(productRows[0]?.stockQuantity.toString()).toBe("12");
  });

  it("ADJUSTMENT sets the warehouse balance and adjusts total by delta", async () => {
    const result = await adjustStockAction(
      undefined,
      fd({
        productId: PROD,
        warehouseId: WH,
        movementType: "ADJUSTMENT",
        quantity: "8",
        reason: "Stok opname",
      }),
    );
    expect(result.ok).toBe(true);
    expect(productStockRows.find((r) => r.id === "ps-1")?.quantity.toString()).toBe("8");
    expect(productRows[0]?.stockQuantity.toString()).toBe("12");
  });

  it("defaults to the company default warehouse when none selected", async () => {
    const result = await adjustStockAction(
      undefined,
      fd({
        productId: PROD,
        movementType: "STOCK_IN",
        quantity: "1",
        reason: "Stok masuk",
      }),
    );
    expect(result.ok).toBe(true);
    expect(productStockRows.find((r) => r.id === "ps-1")?.quantity.toString()).toBe("11");
    expect(stockMovementRows.at(-1)?.warehouseId).toBe(WH);
  });

  it("rejects insufficient warehouse stock for STOCK_OUT", async () => {
    const result = await adjustStockAction(
      undefined,
      fd({
        productId: PROD,
        warehouseId: WH2,
        movementType: "STOCK_OUT",
        quantity: "10",
        reason: "Terlalu banyak",
      }),
    );
    expect(result.ok).toBe(false);
    expect(productStockRows.find((r) => r.id === "ps-2")?.quantity.toString()).toBe("4");
    expect(productRows[0]?.stockQuantity.toString()).toBe("14");
    expect(stockMovementRows).toHaveLength(0);
  });

  it("rejects warehouses from another company", async () => {
    const result = await adjustStockAction(
      undefined,
      fd({
        productId: PROD,
        warehouseId: "66666666-6666-4666-8666-666666666666",
        movementType: "STOCK_IN",
        quantity: "1",
        reason: "Coba gudang lain",
      }),
    );
    expect(result.ok).toBe(false);
  });

  it("rejects inactive warehouses", async () => {
    warehouseRows.find((r) => r.id === WH2)!.isActive = false;
    const result = await adjustStockAction(
      undefined,
      fd({
        productId: PROD,
        warehouseId: WH2,
        movementType: "STOCK_IN",
        quantity: "1",
        reason: "Gudang nonaktif",
      }),
    );
    expect(result.ok).toBe(false);
  });
});

describe("createProductAction", () => {
  it("allocates opening stock to the default warehouse", async () => {
    const result = await createProductAction(
      undefined,
      fd({
        name: "Produk Baru",
        sku: "NEW-1",
        categoryId: "",
        unit: "pcs",
        purchasePrice: "1000",
        sellingPrice: "1500",
        minimumStock: "0",
        stockQuantity: "12",
        isActive: "on",
      }),
    );
    expect(result.ok).toBe(true);
    const created = productRows.find((row) => row.sku === "NEW-1");
    expect(created?.stockQuantity.toString()).toBe("12");
    const stock = productStockRows.find(
      (row) => row.productId === created?.id && row.warehouseId === WH,
    );
    expect(stock?.quantity.toString()).toBe("12");
    const movement = stockMovementRows.at(-1);
    expect(movement?.warehouseId).toBe(WH);
    expect(movement?.movementType).toBe("STOCK_IN");
  });
});
