import { describe, expect, it, vi, beforeEach } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import { checkoutAction, voidSaleAction } from "@/lib/actions/sales";
import { requireActionUser } from "@/lib/auth-guards";
import {
  makeProduct,
  makeProductStock,
  makeWarehouse,
  productRows,
  productStockRows,
  resetInventoryRows,
  saleRows,
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

const CASHIER = {
  id: "11111111-1111-4111-8111-111111111111",
  companyId: "co-a",
  fullName: "Kasir",
  email: "kasir@a.test",
  role: "CASHIER",
  isActive: true,
};

const CLIENT_REQUEST_ID = "22222222-2222-4222-8222-222222222222";
const SALE_ID = "33333333-3333-4333-8333-333333333333";
const WH = "55555555-5555-4555-8555-555555555551";
const WH2 = "55555555-5555-4555-8555-555555555552";
const WH_B = "77777777-7777-4777-8777-777777777777";
const PROD = "44444444-4444-4444-8444-444444444444";

function fd(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

function checkoutFd(overrides: Record<string, string> = {}): FormData {
  return fd({
    paymentMethod: "CASH",
    clientRequestId: CLIENT_REQUEST_ID,
    items: JSON.stringify([{ productId: PROD, quantity: 2 }]),
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
    ],
    products: [
      makeProduct({
        id: PROD,
        companyId: "co-a",
        sku: "SKU-1",
        stockQuantity: new Prisma.Decimal(10),
        sellingPrice: new Prisma.Decimal(1500),
      }),
    ],
    productStocks: [
      makeProductStock({
        id: "ps-1",
        companyId: "co-a",
        productId: PROD,
        warehouseId: WH,
        quantity: new Prisma.Decimal(6),
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
  requireActionUserMock.mockResolvedValue(CASHIER as never);
});

describe("checkoutAction", () => {
  it("decrements default warehouse stock, records sale.warehouseId and movement", async () => {
    const result = await checkoutAction(checkoutFd());
    expect(result.ok).toBe(true);
    expect(productStockRows.find((r) => r.id === "ps-1")?.quantity.toString()).toBe("4");
    expect(productStockRows.find((r) => r.id === "ps-2")?.quantity.toString()).toBe("4");
    expect(productRows[0]?.stockQuantity.toString()).toBe("8");
    const sale = saleRows[0];
    expect(sale?.warehouseId).toBe(WH);
    expect(sale?.items).toHaveLength(1);
    const movement = stockMovementRows.at(-1);
    expect(movement?.warehouseId).toBe(WH);
    expect(movement?.movementType).toBe("SALE");
    expect(movement?.quantityDelta.toString()).toBe("-2");
  });

  it("rolls back when warehouse stock is insufficient even if total suffices", async () => {
    productStockRows.find((r) => r.id === "ps-1")!.quantity = new Prisma.Decimal(1);
    const result = await checkoutAction(
      checkoutFd({
        items: JSON.stringify([{ productId: PROD, quantity: 3 }]),
      }),
    );
    expect(result.ok).toBe(false);
    expect(saleRows).toHaveLength(0);
    expect(productStockRows.find((r) => r.id === "ps-1")?.quantity.toString()).toBe("1");
    expect(productStockRows.find((r) => r.id === "ps-2")?.quantity.toString()).toBe("4");
    expect(productRows[0]?.stockQuantity.toString()).toBe("10");
  });

  it("checks out from a non-default warehouse when warehouseId is given", async () => {
    const result = await checkoutAction(
      checkoutFd({ warehouseId: WH2 }),
    );
    expect(result.ok).toBe(true);
    expect(productStockRows.find((r) => r.id === "ps-2")?.quantity.toString()).toBe("2");
    expect(productStockRows.find((r) => r.id === "ps-1")?.quantity.toString()).toBe("6");
    expect(productRows[0]?.stockQuantity.toString()).toBe("8");
    expect(saleRows[0]?.warehouseId).toBe(WH2);
    expect(stockMovementRows.at(-1)?.warehouseId).toBe(WH2);
  });

  it("rejects a warehouse from another company", async () => {
    const result = await checkoutAction(
      checkoutFd({ warehouseId: WH_B }),
    );
    expect(result.ok).toBe(false);
    expect(saleRows).toHaveLength(0);
    expect(productRows[0]?.stockQuantity.toString()).toBe("10");
  });

  it("rejects an inactive warehouse", async () => {
    warehouseRows.find((row) => row.id === WH2)!.isActive = false;
    const result = await checkoutAction(
      checkoutFd({ warehouseId: WH2 }),
    );
    expect(result.ok).toBe(false);
    expect(saleRows).toHaveLength(0);
  });

  it("returns the recorded sale on clientRequestId retry", async () => {
    const first = await checkoutAction(checkoutFd());
    expect(first.ok).toBe(true);
    const second = await checkoutAction(checkoutFd());
    expect(second.ok).toBe(true);
    if (first.ok && second.ok) {
      expect(second.saleId).toBe(first.saleId);
      expect(second.alreadyRecorded).toBe(true);
    }
    expect(productRows[0]?.stockQuantity.toString()).toBe("8");
  });
});

describe("voidSaleAction", () => {
  function seedSale(overrides: Record<string, unknown> = {}) {
    saleRows.push({
      id: SALE_ID,
      companyId: "co-a",
      transactionNumber: "TRX-001",
      cashierId: CASHIER.id,
      paymentMethod: "CASH",
      status: "COMPLETED",
      totalAmount: new Prisma.Decimal(3000),
      clientRequestId: CLIENT_REQUEST_ID,
      warehouseId: WH2,
      voidedAt: null,
      voidedById: null,
      voidReason: null,
      items: [{ productId: PROD, quantity: new Prisma.Decimal(2) }],
      createdAt: new Date("2026-01-02T00:00:00Z"),
      ...overrides,
    } as never);
  }

  function voidFd() {
    return fd({ saleId: SALE_ID, reason: "Salah input" });
  }

  it("restores stock to the original sale warehouse", async () => {
    seedSale();
    const result = await voidSaleAction(undefined, voidFd());
    expect(result.ok).toBe(true);
    expect(productStockRows.find((r) => r.id === "ps-2")?.quantity.toString()).toBe("6");
    expect(productStockRows.find((r) => r.id === "ps-1")?.quantity.toString()).toBe("6");
    expect(productRows[0]?.stockQuantity.toString()).toBe("12");
    const movement = stockMovementRows.at(-1);
    expect(movement?.warehouseId).toBe(WH2);
    expect(movement?.movementType).toBe("SALE_VOID");
    expect(saleRows[0]?.status).toBe("VOIDED");
  });

  it("falls back to default warehouse for legacy sales without warehouseId", async () => {
    seedSale({ warehouseId: null });
    const result = await voidSaleAction(undefined, voidFd());
    expect(result.ok).toBe(true);
    expect(productStockRows.find((r) => r.id === "ps-1")?.quantity.toString()).toBe("8");
    expect(productStockRows.find((r) => r.id === "ps-2")?.quantity.toString()).toBe("4");
    expect(stockMovementRows.at(-1)?.warehouseId).toBe(WH);
  });

  it("rejects voiding an already voided sale", async () => {
    seedSale({ status: "VOIDED" });
    const result = await voidSaleAction(undefined, voidFd());
    expect(result.ok).toBe(false);
    expect(productStockRows.find((r) => r.id === "ps-2")?.quantity.toString()).toBe("4");
  });
});
