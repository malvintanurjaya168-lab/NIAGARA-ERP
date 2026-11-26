import { describe, expect, it, vi, beforeEach } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import {
  cancelTransferAction,
  completeTransferAction,
  createTransferAction,
} from "@/lib/actions/transfers";
import { requireActionUser } from "@/lib/auth-guards";
import {
  makeProduct,
  makeProductStock,
  makeStockTransfer,
  makeStockTransferItem,
  makeWarehouse,
  productRows,
  productStockRows,
  resetInventoryRows,
  stockMovementRows,
  stockTransferItemRows,
  stockTransferRows,
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

const STAFF = {
  id: "user-1",
  companyId: "co-a",
  fullName: "Staf",
  email: "staff@a.test",
  role: "INVENTORY_STAFF",
  isActive: true,
};

const WH = "55555555-5555-4555-8555-555555555551";
const WH2 = "55555555-5555-4555-8555-555555555552";
const WH_B = "77777777-7777-4777-8777-777777777777";
const PROD = "44444444-4444-4444-8444-444444444444";
const PROD2 = "44444444-4444-4444-8444-444444444445";
const T1 = "88888888-8888-4888-8888-888888888888";

function fd(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

function createFd(overrides: Record<string, string> = {}): FormData {
  return fd({
    fromWarehouseId: WH,
    toWarehouseId: WH2,
    items: JSON.stringify([{ productId: PROD, quantity: 3 }]),
    ...overrides,
  });
}

function seed() {
  resetInventoryRows({
    warehouses: [
      makeWarehouse({ id: WH, companyId: "co-a", code: "D", isDefault: true }),
      makeWarehouse({ id: WH2, companyId: "co-a", code: "W2" }),
      makeWarehouse({
        id: WH_B,
        companyId: "co-b",
        code: "DB",
        isDefault: true,
      }),
      makeWarehouse({
        id: "99999999-9999-4999-8999-999999999999",
        companyId: "co-a",
        code: "OFF",
        isActive: false,
      }),
    ],
    products: [
      makeProduct({
        id: PROD,
        companyId: "co-a",
        sku: "SKU-1",
        stockQuantity: new Prisma.Decimal(14),
      }),
      makeProduct({
        id: PROD2,
        companyId: "co-a",
        sku: "SKU-2",
        stockQuantity: new Prisma.Decimal(5),
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
      makeProductStock({
        id: "ps-3",
        companyId: "co-a",
        productId: PROD2,
        warehouseId: WH,
        quantity: new Prisma.Decimal(5),
      }),
    ],
  });
}

function seedDraft(overrides: Record<string, unknown> = {}) {
  stockTransferRows.push(
    makeStockTransfer({
      id: T1,
      companyId: "co-a",
      transferNumber: "TRF-20260101-0001",
      fromWarehouseId: WH,
      toWarehouseId: WH2,
      ...overrides,
    }),
  );
  stockTransferItemRows.push(
    makeStockTransferItem({
      id: "ti-1",
      companyId: "co-a",
      transferId: T1,
      productId: PROD,
      quantity: new Prisma.Decimal(3),
    }),
  );
}

beforeEach(() => {
  seed();
  requireActionUserMock.mockReset();
  requireActionUserMock.mockResolvedValue(STAFF as never);
});

describe("createTransferAction", () => {
  it("creates a draft transfer with items and a transfer number", async () => {
    const result = await createTransferAction(undefined, createFd());
    expect(result.ok).toBe(true);
    const transfer = stockTransferRows[0];
    expect(transfer?.status).toBe("DRAFT");
    expect(transfer?.transferNumber).toMatch(/^TRF-\d{8}-\d{4}$/);
    expect(stockTransferItemRows).toHaveLength(1);
    // draft must not touch inventory
    expect(productStockRows.find((r) => r.id === "ps-1")?.quantity.toString()).toBe("10");
    expect(stockMovementRows).toHaveLength(0);
  });

  it("merges duplicate product lines", async () => {
    const result = await createTransferAction(
      undefined,
      createFd({
        items: JSON.stringify([
          { productId: PROD, quantity: 2 },
          { productId: PROD, quantity: 3 },
        ]),
      }),
    );
    expect(result.ok).toBe(true);
    expect(stockTransferItemRows).toHaveLength(1);
    expect(stockTransferItemRows[0]?.quantity.toString()).toBe("5");
  });

  it("rejects same source and destination", async () => {
    const result = await createTransferAction(
      undefined,
      createFd({ toWarehouseId: WH }),
    );
    expect(result.ok).toBe(false);
  });

  it("rejects warehouses from another company", async () => {
    const result = await createTransferAction(
      undefined,
      createFd({ toWarehouseId: WH_B }),
    );
    expect(result.ok).toBe(false);
  });

  it("rejects inactive warehouses", async () => {
    const result = await createTransferAction(
      undefined,
      createFd({ toWarehouseId: "99999999-9999-4999-8999-999999999999" }),
    );
    expect(result.ok).toBe(false);
  });

  it("rejects invalid quantities", async () => {
    const result = await createTransferAction(
      undefined,
      createFd({
        items: JSON.stringify([{ productId: PROD, quantity: 0 }]),
      }),
    );
    expect(result.ok).toBe(false);
  });
});

describe("completeTransferAction", () => {
  it("moves stock between warehouses without changing the company total", async () => {
    seedDraft();
    const result = await completeTransferAction(
      undefined,
      fd({ transferId: T1 }),
    );
    expect(result.ok).toBe(true);
    expect(productStockRows.find((r) => r.id === "ps-1")?.quantity.toString()).toBe("7");
    expect(productStockRows.find((r) => r.id === "ps-2")?.quantity.toString()).toBe("7");
    // aggregate unchanged: 14
    expect(productRows[0]?.stockQuantity.toString()).toBe("14");
    expect(stockTransferRows[0]?.status).toBe("COMPLETED");
    expect(stockTransferRows[0]?.completedAt).toBeInstanceOf(Date);

    const movements = stockMovementRows.filter((m) => m.transferId === T1);
    expect(movements).toHaveLength(2);
    const out = movements.find((m) => m.movementType === "TRANSFER_OUT");
    const inn = movements.find((m) => m.movementType === "TRANSFER_IN");
    expect(out?.warehouseId).toBe(WH);
    expect(out?.quantityDelta.toString()).toBe("-3");
    expect(out?.previousQuantity.toString()).toBe("10");
    expect(out?.newQuantity.toString()).toBe("7");
    expect(inn?.warehouseId).toBe(WH2);
    expect(inn?.quantityDelta.toString()).toBe("3");
    expect(inn?.previousQuantity.toString()).toBe("4");
    expect(inn?.newQuantity.toString()).toBe("7");
  });

  it("creates a destination balance row when none exists", async () => {
    // PROD2 has stock only in WH; transfer to WH2 which has no row.
    stockTransferRows.push(
      makeStockTransfer({
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        companyId: "co-a",
        transferNumber: "TRF-20260101-0002",
        fromWarehouseId: WH,
        toWarehouseId: WH2,
      }),
    );
    stockTransferItemRows.push(
      makeStockTransferItem({
        id: "ti-2",
        companyId: "co-a",
        transferId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        productId: PROD2,
        quantity: new Prisma.Decimal(2),
      }),
    );
    const result = await completeTransferAction(
      undefined,
      fd({ transferId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }),
    );
    expect(result.ok).toBe(true);
    const dest = productStockRows.find(
      (r) => r.productId === PROD2 && r.warehouseId === WH2,
    );
    expect(dest?.quantity.toString()).toBe("2");
    expect(productRows.find((r) => r.id === PROD2)?.stockQuantity.toString()).toBe("5");
  });

  it("rejects completion when source stock is insufficient and rolls back", async () => {
    seedDraft();
    stockTransferItemRows[0]!.quantity = new Prisma.Decimal(50);
    const result = await completeTransferAction(
      undefined,
      fd({ transferId: T1 }),
    );
    expect(result.ok).toBe(false);
    expect(productStockRows.find((r) => r.id === "ps-1")?.quantity.toString()).toBe("10");
    expect(productStockRows.find((r) => r.id === "ps-2")?.quantity.toString()).toBe("4");
    expect(stockTransferRows[0]?.status).toBe("DRAFT");
    expect(stockMovementRows).toHaveLength(0);
  });

  it("prevents completing an already completed transfer", async () => {
    seedDraft({ status: "COMPLETED" });
    const result = await completeTransferAction(
      undefined,
      fd({ transferId: T1 }),
    );
    expect(result.ok).toBe(false);
    expect(productStockRows.find((r) => r.id === "ps-1")?.quantity.toString()).toBe("10");
  });

  it("rejects transfers from another company", async () => {
    seedDraft({ companyId: "co-b" });
    const result = await completeTransferAction(
      undefined,
      fd({ transferId: T1 }),
    );
    expect(result.ok).toBe(false);
  });
});

describe("cancelTransferAction", () => {
  it("cancels a draft without touching stock", async () => {
    seedDraft();
    const result = await cancelTransferAction(
      undefined,
      fd({ transferId: T1 }),
    );
    expect(result.ok).toBe(true);
    expect(stockTransferRows[0]?.status).toBe("CANCELLED");
    expect(stockTransferRows[0]?.cancelledAt).toBeInstanceOf(Date);
    expect(productStockRows.find((r) => r.id === "ps-1")?.quantity.toString()).toBe("10");
  });

  it("refuses to cancel a completed transfer", async () => {
    seedDraft({ status: "COMPLETED" });
    const result = await cancelTransferAction(
      undefined,
      fd({ transferId: T1 }),
    );
    expect(result.ok).toBe(false);
    expect(stockTransferRows[0]?.status).toBe("COMPLETED");
  });
});
