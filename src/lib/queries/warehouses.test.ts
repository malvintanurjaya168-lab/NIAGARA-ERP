import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  getDefaultWarehouse,
  getWarehouseById,
  getWarehouseList,
  getWarehouseOptions,
  getWarehouseStats,
} from "@/lib/queries/warehouses";
import {
  makeWarehouse,
  resetWarehouseRows,
} from "@/test-utils/fake-warehouses";

vi.mock("@/lib/prisma", async () => {
  const { fakeWarehousePrisma } = await import("@/test-utils/fake-warehouses");
  return { prisma: fakeWarehousePrisma };
});

const WH_A = "00000000-0000-4000-8000-0000000000a1";
const WH_A2 = "00000000-0000-4000-8000-0000000000a2";
const WH_A3 = "00000000-0000-4000-8000-0000000000a3";
const WH_B = "00000000-0000-4000-8000-0000000000b1";

beforeEach(() => {
  resetWarehouseRows([
    makeWarehouse({
      id: WH_A,
      companyId: "co-a",
      code: "DEFAULT",
      name: "Gudang Utama",
      isDefault: true,
      productStockCount: 3,
    }),
    makeWarehouse({
      id: WH_A2,
      companyId: "co-a",
      code: "GUD-02",
      name: "Gudang Cabang",
      isActive: false,
    }),
    makeWarehouse({
      id: WH_A3,
      companyId: "co-a",
      code: "GUD-03",
      name: "Gudang Tiga",
      address: "Jl. Melati 5",
    }),
    makeWarehouse({
      id: WH_B,
      companyId: "co-b",
      code: "DEFAULT",
      name: "Gudang B",
      isDefault: true,
    }),
  ]);
});

describe("getWarehouseList", () => {
  it("returns only the company's warehouses ordered by default first", async () => {
    const result = await getWarehouseList({ companyId: "co-a" });
    expect(result.total).toBe(3);
    expect(result.items[0]?.id).toBe(WH_A);
    expect(result.items.map((item) => item.id)).not.toContain(WH_B);
  });

  it("filters by status", async () => {
    const active = await getWarehouseList({ companyId: "co-a", status: "active" });
    expect(active.total).toBe(2);
    const inactive = await getWarehouseList({
      companyId: "co-a",
      status: "inactive",
    });
    expect(inactive.total).toBe(1);
    expect(inactive.items[0]?.id).toBe(WH_A2);
  });

  it("searches code, name, and address", async () => {
    const byCode = await getWarehouseList({ companyId: "co-a", q: "gud-03" });
    expect(byCode.items.map((item) => item.id)).toEqual([WH_A3]);
    const byAddress = await getWarehouseList({ companyId: "co-a", q: "melati" });
    expect(byAddress.items.map((item) => item.id)).toEqual([WH_A3]);
  });

  it("paginates results", async () => {
    const page = await getWarehouseList({ companyId: "co-a", page: 2, pageSize: 2 });
    expect(page.items).toHaveLength(1);
    expect(page.page).toBe(2);
  });
});

describe("getWarehouseStats", () => {
  it("counts total, active, and inactive warehouses", async () => {
    const stats = await getWarehouseStats("co-a");
    expect(stats).toEqual({ total: 3, active: 2, inactive: 1 });
  });
});

describe("getWarehouseById", () => {
  it("returns warehouse detail within the company", async () => {
    const detail = await getWarehouseById("co-a", WH_A2);
    expect(detail?.code).toBe("GUD-02");
  });

  it("returns null for another company's warehouse", async () => {
    expect(await getWarehouseById("co-a", WH_B)).toBeNull();
  });
});

describe("getDefaultWarehouse / getWarehouseOptions", () => {
  it("returns the active default warehouse", async () => {
    const def = await getDefaultWarehouse("co-a");
    expect(def?.id).toBe(WH_A);
  });

  it("returns only active warehouses as options", async () => {
    const options = await getWarehouseOptions("co-a");
    expect(options.map((option) => option.id)).not.toContain(WH_A2);
    expect(options[0]?.isDefault).toBe(true);
  });
});
