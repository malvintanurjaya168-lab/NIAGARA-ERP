import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  getAccountById,
  getAccountChildren,
  getAccountHierarchy,
  getAccountList,
  getParentAccountOptions,
} from "@/lib/queries/accounts";
import {
  accountRows,
  makeAccount,
  resetAccountRows,
} from "@/test-utils/fake-prisma";

vi.mock("@/lib/prisma", async () => {
  const { fakePrisma } = await import("@/test-utils/fake-prisma");
  return { prisma: fakePrisma };
});

function seed() {
  resetAccountRows([
    makeAccount({
      id: "a-root",
      companyId: "co-a",
      code: "1",
      name: "Aset",
      type: "ASSET",
      isPostable: false,
    }),
    makeAccount({
      id: "a-child",
      companyId: "co-a",
      code: "1.01",
      name: "Kas",
      type: "ASSET",
      parentId: "a-root",
      isPostable: true,
    }),
    makeAccount({
      id: "a-exp",
      companyId: "co-a",
      code: "5",
      name: "Beban",
      type: "EXPENSE",
      isPostable: false,
    }),
    makeAccount({
      id: "b-root",
      companyId: "co-b",
      code: "1",
      name: "Aset B",
      type: "ASSET",
    }),
  ]);
}

beforeEach(seed);

describe("getAccountList", () => {
  it("returns only accounts of the given company", async () => {
    const items = await getAccountList({ companyId: "co-a" });
    expect(items.map((i) => i.id).sort()).toEqual(["a-child", "a-exp", "a-root"]);
    expect(items.every((i) => i.parent !== undefined)).toBe(true);
  });

  it("filters by type, search, and status", async () => {
    const byType = await getAccountList({ companyId: "co-a", type: "EXPENSE" });
    expect(byType.map((i) => i.id)).toEqual(["a-exp"]);

    const bySearch = await getAccountList({ companyId: "co-a", q: "kas" });
    expect(bySearch.map((i) => i.id)).toEqual(["a-child"]);

    accountRows.find((r) => r.id === "a-exp")!.isActive = false;
    const inactive = await getAccountList({
      companyId: "co-a",
      status: "inactive",
    });
    expect(inactive.map((i) => i.id)).toEqual(["a-exp"]);
  });
});

describe("getAccountHierarchy", () => {
  it("nests children under parents", async () => {
    const tree = await getAccountHierarchy("co-a");
    expect(tree).toHaveLength(2);
    const aset = tree.find((n) => n.id === "a-root");
    expect(aset?.children.map((c) => c.id)).toEqual(["a-child"]);
  });
});

describe("getAccountById / getAccountChildren", () => {
  it("returns detail with children for own company", async () => {
    const detail = await getAccountById("co-a", "a-root");
    expect(detail?.children.map((c) => c.id)).toEqual(["a-child"]);
    expect(detail?.parent).toBeNull();
  });

  it("returns null for other companies", async () => {
    expect(await getAccountById("co-a", "b-root")).toBeNull();
    expect(await getAccountChildren("co-a", "b-root")).toEqual([]);
  });
});

describe("getParentAccountOptions", () => {
  it("excludes the account itself and its descendants", async () => {
    const options = await getParentAccountOptions("co-a", "a-root");
    expect(options.map((o) => o.id)).toEqual(["a-exp"]);
  });

  it("returns active accounts of the company only", async () => {
    const options = await getParentAccountOptions("co-a");
    expect(options.map((o) => o.id).sort()).toEqual([
      "a-child",
      "a-exp",
      "a-root",
    ]);
    expect(options.some((o) => o.id === "b-root")).toBe(false);
  });
});
