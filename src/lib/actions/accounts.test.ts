import { describe, expect, it, vi, beforeEach } from "vitest";
import { ActionError } from "@/lib/errors";
import {
  createAccountAction,
  updateAccountAction,
  activateAccountAction,
  deactivateAccountAction,
  applyCoaTemplateAction,
} from "@/lib/actions/accounts";
import { MSME_COA_TEMPLATE } from "@/lib/accounts-template";
import { requireActionUser } from "@/lib/auth-guards";
import {
  accountRows,
  makeAccount,
  resetAccountRows,
} from "@/test-utils/fake-prisma";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/lib/prisma", async () => {
  const { fakePrisma } = await import("@/test-utils/fake-prisma");
  return { prisma: fakePrisma };
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

function fd(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

function seedAccounts() {
  resetAccountRows([
    makeAccount({
      id: "00000000-0000-4000-8000-000000000001",
      companyId: "co-a",
      code: "1",
      name: "Aset",
      type: "ASSET",
      parentId: null,
      isPostable: false,
    }),
    makeAccount({
      id: "00000000-0000-4000-8000-000000000002",
      companyId: "co-a",
      code: "1.01",
      name: "Kas",
      type: "ASSET",
      parentId: "00000000-0000-4000-8000-000000000001",
      isPostable: true,
    }),
    makeAccount({
      id: "00000000-0000-4000-8000-000000000003",
      companyId: "co-b",
      code: "1",
      name: "Aset B",
      type: "ASSET",
      parentId: null,
      isPostable: false,
    }),
  ]);
}

beforeEach(() => {
  seedAccounts();
  requireActionUserMock.mockReset();
  requireActionUserMock.mockResolvedValue(OWNER_A as never);
});

describe("permission enforcement", () => {
  it("requires accounts.manage for create", async () => {
    const result = await createAccountAction(
      undefined,
      fd({ code: "2", name: "Hutang", type: "LIABILITY" }),
    );
    expect(result.ok).toBe(true);
    expect(requireActionUserMock).toHaveBeenCalledWith("accounts.manage");
  });

  it("rejects forbidden users", async () => {
    requireActionUserMock.mockRejectedValue(
      new ActionError("tidak ada izin", "FORBIDDEN"),
    );
    const result = await createAccountAction(
      undefined,
      fd({ code: "2", name: "Hutang", type: "LIABILITY" }),
    );
    expect(result).toMatchObject({ ok: false, code: "FORBIDDEN" });
  });

  it("rejects unauthenticated users", async () => {
    requireActionUserMock.mockRejectedValue(
      new ActionError("sesi berakhir", "UNAUTHENTICATED"),
    );
    const result = await deactivateAccountAction(
      undefined,
      fd({ accountId: "00000000-0000-4000-8000-000000000002" }),
    );
    expect(result).toMatchObject({ ok: false, code: "UNAUTHENTICATED" });
  });
});

describe("createAccountAction", () => {
  it("creates an account scoped to the session company", async () => {
    const result = await createAccountAction(
      undefined,
      fd({ code: "2", name: "Hutang Usaha", type: "LIABILITY" }),
    );
    expect(result.ok).toBe(true);
    const created = accountRows.find((row) => row.code === "2");
    expect(created?.companyId).toBe("co-a");
    expect(created?.type).toBe("LIABILITY");
  });

  it("rejects duplicate codes within the same company", async () => {
    const result = await createAccountAction(
      undefined,
      fd({ code: "1", name: "Duplikat", type: "ASSET" }),
    );
    expect(result).toMatchObject({ ok: false, code: "CONFLICT" });
  });

  it("allows the same code in a different company", async () => {
    requireActionUserMock.mockResolvedValue({
      ...OWNER_A,
      companyId: "co-c",
    } as never);
    const result = await createAccountAction(
      undefined,
      fd({ code: "1", name: "Aset Baru", type: "ASSET" }),
    );
    expect(result.ok).toBe(true);
  });

  it("rejects invalid input", async () => {
    const result = await createAccountAction(
      undefined,
      fd({ code: "kode dengan spasi!", name: "X", type: "ASSET" }),
    );
    expect(result).toMatchObject({ ok: false, code: "VALIDATION" });
  });

  it("rejects a parent from another company", async () => {
    const result = await createAccountAction(
      undefined,
      fd({
        code: "1.02",
        name: "Bank",
        type: "ASSET",
        parentId: "00000000-0000-4000-8000-000000000003",
      }),
    );
    expect(result).toMatchObject({ ok: false, code: "NOT_FOUND" });
  });

  it("rejects a parent with an incompatible type", async () => {
    const result = await createAccountAction(
      undefined,
      fd({
        code: "5.01",
        name: "Beban",
        type: "EXPENSE",
        parentId: "00000000-0000-4000-8000-000000000001",
      }),
    );
    expect(result).toMatchObject({ ok: false, code: "BUSINESS" });
  });

  it("rejects a postable account as parent", async () => {
    const result = await createAccountAction(
      undefined,
      fd({
        code: "1.01.01",
        name: "Sub Kas",
        type: "ASSET",
        parentId: "00000000-0000-4000-8000-000000000002",
      }),
    );
    expect(result).toMatchObject({ ok: false, code: "BUSINESS" });
  });

  it("creates a child under a valid group", async () => {
    const result = await createAccountAction(
      undefined,
      fd({
        code: "1.02",
        name: "Bank",
        type: "ASSET",
        parentId: "00000000-0000-4000-8000-000000000001",
        isPostable: "on",
      }),
    );
    expect(result.ok).toBe(true);
    const created = accountRows.find((row) => row.code === "1.02");
    expect(created?.parentId).toBe("00000000-0000-4000-8000-000000000001");
    expect(created?.isPostable).toBe(true);
  });
});

describe("updateAccountAction", () => {
  const baseForm = {
    accountId: "00000000-0000-4000-8000-000000000002",
    code: "1.01",
    name: "Kas Besar",
    type: "ASSET",
    parentId: "00000000-0000-4000-8000-000000000001",
    isPostable: "on",
  };

  it("updates account fields", async () => {
    const result = await updateAccountAction(undefined, fd(baseForm));
    expect(result.ok).toBe(true);
    const row = accountRows.find((r) => r.id === "00000000-0000-4000-8000-000000000002");
    expect(row?.name).toBe("Kas Besar");
  });

  it("returns NOT_FOUND for accounts of other companies", async () => {
    const result = await updateAccountAction(
      undefined,
      fd({ ...baseForm, accountId: "00000000-0000-4000-8000-000000000003" }),
    );
    expect(result).toMatchObject({ ok: false, code: "NOT_FOUND" });
  });

  it("rejects an account as its own parent", async () => {
    const result = await updateAccountAction(
      undefined,
      fd({ ...baseForm, parentId: "00000000-0000-4000-8000-000000000002" }),
    );
    expect(result).toMatchObject({ ok: false, code: "BUSINESS" });
  });

  it("rejects circular hierarchy", async () => {
    accountRows.push(
      makeAccount({
        id: "00000000-0000-4000-8000-000000000004",
        companyId: "co-a",
        code: "3",
        name: "Grup P",
        type: "ASSET",
        parentId: null,
        isPostable: false,
      }),
      makeAccount({
        id: "00000000-0000-4000-8000-000000000005",
        companyId: "co-a",
        code: "3.01",
        name: "Sub P",
        type: "ASSET",
        parentId: "00000000-0000-4000-8000-000000000004",
        isPostable: false,
      }),
    );
    const result = await updateAccountAction(
      undefined,
      fd({
        accountId: "00000000-0000-4000-8000-000000000004",
        code: "3",
        name: "Grup P",
        type: "ASSET",
        parentId: "00000000-0000-4000-8000-000000000005",
      }),
    );
    expect(result).toMatchObject({ ok: false, code: "BUSINESS" });
  });

  it("rejects type change when the account has children", async () => {
    const result = await updateAccountAction(
      undefined,
      fd({
        accountId: "00000000-0000-4000-8000-000000000001",
        code: "1",
        name: "Aset",
        type: "LIABILITY",
      }),
    );
    expect(result).toMatchObject({ ok: false, code: "BUSINESS" });
  });

  it("rejects marking a parent account as postable", async () => {
    const result = await updateAccountAction(
      undefined,
      fd({
        accountId: "00000000-0000-4000-8000-000000000001",
        code: "1",
        name: "Aset",
        type: "ASSET",
        isPostable: "on",
      }),
    );
    expect(result).toMatchObject({ ok: false, code: "BUSINESS" });
  });

  it("rejects duplicate codes excluding itself", async () => {
    accountRows.push(
      makeAccount({
        id: "00000000-0000-4000-8000-000000000006",
        companyId: "co-a",
        code: "1.02",
        name: "Bank",
        type: "ASSET",
        parentId: "00000000-0000-4000-8000-000000000001",
        isPostable: true,
      }),
    );
    const result = await updateAccountAction(
      undefined,
      fd({ ...baseForm, code: "1.02" }),
    );
    expect(result).toMatchObject({ ok: false, code: "CONFLICT" });
  });
});

describe("activate/deactivateAccountAction", () => {
  it("deactivates a leaf account", async () => {
    const result = await deactivateAccountAction(
      undefined,
      fd({ accountId: "00000000-0000-4000-8000-000000000002" }),
    );
    expect(result.ok).toBe(true);
    expect(accountRows.find((r) => r.id === "00000000-0000-4000-8000-000000000002")?.isActive).toBe(false);
  });

  it("reactivates an inactive account", async () => {
    await deactivateAccountAction(undefined, fd({ accountId: "00000000-0000-4000-8000-000000000002" }));
    const result = await activateAccountAction(
      undefined,
      fd({ accountId: "00000000-0000-4000-8000-000000000002" }),
    );
    expect(result.ok).toBe(true);
    expect(accountRows.find((r) => r.id === "00000000-0000-4000-8000-000000000002")?.isActive).toBe(true);
  });

  it("rejects deactivating an account with children", async () => {
    const result = await deactivateAccountAction(
      undefined,
      fd({ accountId: "00000000-0000-4000-8000-000000000001" }),
    );
    expect(result).toMatchObject({ ok: false, code: "BUSINESS" });
    expect(accountRows.find((r) => r.id === "00000000-0000-4000-8000-000000000001")?.isActive).toBe(true);
  });

  it("rejects accounts of other companies", async () => {
    const result = await deactivateAccountAction(
      undefined,
      fd({ accountId: "00000000-0000-4000-8000-000000000003" }),
    );
    expect(result).toMatchObject({ ok: false, code: "NOT_FOUND" });
  });

  it("rejects malformed account ids", async () => {
    const result = await activateAccountAction(
      undefined,
      fd({ accountId: "not-a-uuid" }),
    );
    expect(result).toMatchObject({ ok: false, code: "VALIDATION" });
  });
});

describe("applyCoaTemplateAction", () => {
  it("requires accounts.manage", async () => {
    requireActionUserMock.mockRejectedValue(
      new ActionError("tidak ada izin", "FORBIDDEN"),
    );
    const result = await applyCoaTemplateAction();
    expect(result).toMatchObject({ ok: false, code: "FORBIDDEN" });
  });

  it("creates missing template accounts with resolved parents", async () => {
    const result = await applyCoaTemplateAction();
    expect(result.ok).toBe(true);

    // Seed already contains code "1" (ASSET) for co-a, so it is kept as-is.
    const root = accountRows.find((r) => r.id === "00000000-0000-4000-8000-000000000001");
    expect(root?.name).toBe("Aset");

    const created = accountRows.filter((r) => r.companyId === "co-a");
    expect(created.length).toBe(MSME_COA_TEMPLATE.length + 1); // + leaf-1 custom

    const group11 = created.find((r) => r.code === "1.1");
    const leaf101 = created.find((r) => r.code === "1.1.01");
    expect(group11?.parentId).toBe(root?.id);
    expect(leaf101?.parentId).toBe(group11?.id);
    expect(leaf101?.isPostable).toBe(true);
    expect(group11?.isPostable).toBe(false);

    // Custom account from another company is untouched.
    expect(accountRows.find((r) => r.id === "00000000-0000-4000-8000-000000000003")?.companyId).toBe("co-b");
  });

  it("is idempotent on a second run", async () => {
    await applyCoaTemplateAction();
    const before = accountRows.filter((r) => r.companyId === "co-a").length;
    const result = await applyCoaTemplateAction();
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("template apply failed");
    expect(result.message).toContain("0 akun baru dibuat");
    expect(accountRows.filter((r) => r.companyId === "co-a").length).toBe(before);
  });

  it("skips conflicting codes and their template descendants", async () => {
    accountRows.push(
      makeAccount({
        id: "00000000-0000-4000-8000-000000000007",
        companyId: "co-a",
        code: "4",
        name: "Kode Kustom",
        type: "EXPENSE",
        isPostable: false,
      }),
    );
    const result = await applyCoaTemplateAction();
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("template apply failed");
    expect(result.message).toContain("dilewati");

    const coA = accountRows.filter((r) => r.companyId === "co-a");
    expect(coA.find((r) => r.code === "4")?.name).toBe("Kode Kustom");
    expect(coA.some((r) => r.code === "4.1")).toBe(false);
    expect(coA.some((r) => r.code === "4.1.01")).toBe(false);
    expect(coA.some((r) => r.code === "1.1.01")).toBe(true);
  });
});
