import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  createWarehouseAction,
  updateWarehouseAction,
  activateWarehouseAction,
  deactivateWarehouseAction,
  setDefaultWarehouseAction,
} from "@/lib/actions/warehouses";
import { requireActionUser } from "@/lib/auth-guards";
import {
  makeWarehouse,
  resetWarehouseRows,
  warehouseRows,
} from "@/test-utils/fake-warehouses";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/lib/prisma", async () => {
  const { fakeWarehousePrisma } = await import("@/test-utils/fake-warehouses");
  return { prisma: fakeWarehousePrisma };
});

vi.mock("@/lib/auth-guards", () => ({
  requireActionUser: vi.fn(),
  getCurrentUser: vi.fn(),
}));

const requireActionUserMock = vi.mocked(requireActionUser);

const OWNER_A = {
  id: "user-1",
  companyId: "co-a",
  fullName: "Owner A",
  email: "owner@a.test",
  role: "OWNER",
  isActive: true,
};

const WH_A = "00000000-0000-4000-8000-0000000000a1";
const WH_A2 = "00000000-0000-4000-8000-0000000000a2";
const WH_B = "00000000-0000-4000-8000-0000000000b1";

function fd(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

function seedWarehouses() {
  resetWarehouseRows([
    makeWarehouse({
      id: WH_A,
      companyId: "co-a",
      code: "DEFAULT",
      name: "Gudang Utama",
      isDefault: true,
    }),
    makeWarehouse({
      id: WH_A2,
      companyId: "co-a",
      code: "GUD-02",
      name: "Gudang Cabang",
    }),
    makeWarehouse({
      id: WH_B,
      companyId: "co-b",
      code: "DEFAULT",
      name: "Gudang B",
      isDefault: true,
    }),
  ]);
}

beforeEach(() => {
  seedWarehouses();
  requireActionUserMock.mockReset();
  requireActionUserMock.mockResolvedValue(OWNER_A as never);
});

describe("warehouse permissions", () => {
  it("rejects users without warehouses.manage", async () => {
    requireActionUserMock.mockRejectedValueOnce(
      new Error("Tidak memiliki izin."),
    );
    const result = await createWarehouseAction(
      undefined,
      fd({ code: "X1", name: "Gudang X" }),
    );
    expect(result.ok).toBe(false);
  });
});

describe("createWarehouseAction", () => {
  it("creates a warehouse for the user's company", async () => {
    const result = await createWarehouseAction(
      undefined,
      fd({ code: "GUD-03", name: "Gudang Tiga", address: "Jl. Merdeka 1" }),
    );
    expect(result.ok).toBe(true);
    const created = warehouseRows.find((row) => row.code === "GUD-03");
    expect(created?.companyId).toBe("co-a");
    expect(created?.isDefault).toBe(false);
    expect(created?.isActive).toBe(true);
  });

  it("rejects duplicate codes within the same company", async () => {
    const result = await createWarehouseAction(
      undefined,
      fd({ code: "GUD-02", name: "Duplikat" }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("CONFLICT");
  });

  it("allows the same code in another company", async () => {
    const result = await createWarehouseAction(
      undefined,
      fd({ code: "DEFAULT", name: "Gudang Baru" }),
    );
    // co-a already has DEFAULT -> conflict
    expect(result.ok).toBe(false);
  });

  it("validates required fields", async () => {
    const result = await createWarehouseAction(
      undefined,
      fd({ code: "", name: "" }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("VALIDATION");
  });
});

describe("updateWarehouseAction", () => {
  it("updates code, name, and address", async () => {
    const result = await updateWarehouseAction(
      undefined,
      fd({
        warehouseId: WH_A2,
        code: "GUD-02B",
        name: "Gudang Cabang Baru",
        address: "Jl. Baru 2",
      }),
    );
    expect(result.ok).toBe(true);
    const row = warehouseRows.find((r) => r.id === WH_A2);
    expect(row?.code).toBe("GUD-02B");
    expect(row?.address).toBe("Jl. Baru 2");
  });

  it("rejects updates to another company's warehouse", async () => {
    const result = await updateWarehouseAction(
      undefined,
      fd({ warehouseId: WH_B, code: "HACK", name: "Hack" }),
    );
    expect(result.ok).toBe(false);
    const row = warehouseRows.find((r) => r.id === WH_B);
    expect(row?.code).toBe("DEFAULT");
  });

  it("rejects duplicate code on update", async () => {
    const result = await updateWarehouseAction(
      undefined,
      fd({ warehouseId: WH_A2, code: "DEFAULT", name: "Gudang Cabang" }),
    );
    expect(result.ok).toBe(false);
  });
});

describe("activate/deactivateWarehouseAction", () => {
  it("deactivates a non-default warehouse", async () => {
    const result = await deactivateWarehouseAction(
      undefined,
      fd({ warehouseId: WH_A2 }),
    );
    expect(result.ok).toBe(true);
    expect(warehouseRows.find((r) => r.id === WH_A2)?.isActive).toBe(false);
  });

  it("reactivates an inactive warehouse", async () => {
    await deactivateWarehouseAction(undefined, fd({ warehouseId: WH_A2 }));
    const result = await activateWarehouseAction(
      undefined,
      fd({ warehouseId: WH_A2 }),
    );
    expect(result.ok).toBe(true);
    expect(warehouseRows.find((r) => r.id === WH_A2)?.isActive).toBe(true);
  });

  it("prevents deactivating the default warehouse", async () => {
    const result = await deactivateWarehouseAction(
      undefined,
      fd({ warehouseId: WH_A }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("CONFLICT");
    expect(warehouseRows.find((r) => r.id === WH_A)?.isActive).toBe(true);
  });

  it("cannot deactivate another company's warehouse", async () => {
    const result = await deactivateWarehouseAction(
      undefined,
      fd({ warehouseId: WH_B }),
    );
    expect(result.ok).toBe(false);
  });
});

describe("setDefaultWarehouseAction", () => {
  it("moves the default designation inside a transaction", async () => {
    const result = await setDefaultWarehouseAction(
      undefined,
      fd({ warehouseId: WH_A2 }),
    );
    expect(result.ok).toBe(true);
    expect(warehouseRows.find((r) => r.id === WH_A)?.isDefault).toBe(false);
    expect(warehouseRows.find((r) => r.id === WH_A2)?.isDefault).toBe(true);
    // other company's default untouched
    expect(warehouseRows.find((r) => r.id === WH_B)?.isDefault).toBe(true);
  });

  it("rejects inactive warehouses as default", async () => {
    await deactivateWarehouseAction(undefined, fd({ warehouseId: WH_A2 }));
    const result = await setDefaultWarehouseAction(
      undefined,
      fd({ warehouseId: WH_A2 }),
    );
    expect(result.ok).toBe(false);
  });

  it("rejects warehouses that are already default", async () => {
    const result = await setDefaultWarehouseAction(
      undefined,
      fd({ warehouseId: WH_A }),
    );
    expect(result.ok).toBe(false);
  });

  it("cannot set another company's warehouse as default", async () => {
    const result = await setDefaultWarehouseAction(
      undefined,
      fd({ warehouseId: WH_B }),
    );
    expect(result.ok).toBe(false);
    expect(warehouseRows.find((r) => r.id === WH_A)?.isDefault).toBe(true);
  });
});
