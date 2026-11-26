import { describe, expect, it } from "vitest";
import {
  MSME_COA_TEMPLATE,
  planCoaTemplate,
  type ExistingAccountRef,
} from "@/lib/accounts-template";

function ref(
  code: string,
  type: ExistingAccountRef["type"],
  id = `id-${code}`,
): ExistingAccountRef {
  return { id, code, type };
}

describe("MSME_COA_TEMPLATE", () => {
  it("is ordered parent-first with consistent types", () => {
    const seen = new Set<string>();
    for (const entry of MSME_COA_TEMPLATE) {
      if (entry.parentCode) {
        expect(seen.has(entry.parentCode)).toBe(true);
        const parent = MSME_COA_TEMPLATE.find(
          (candidate) => candidate.code === entry.parentCode,
        );
        expect(parent?.type).toBe(entry.type);
        expect(parent?.postable).toBe(false);
      }
      seen.add(entry.code);
    }
  });
});

describe("planCoaTemplate", () => {
  it("plans to create every entry when the company has no accounts", () => {
    const plan = planCoaTemplate([]);
    expect(plan).toHaveLength(MSME_COA_TEMPLATE.length);
    expect(plan.every((item) => item.status === "create")).toBe(true);
  });

  it("marks matching existing accounts as exists without overwriting", () => {
    const plan = planCoaTemplate([
      ref("1", "ASSET", "existing-1"),
      ref("1.1", "ASSET", "existing-1.1"),
    ]);
    const root = plan.find((item) => item.code === "1");
    const group = plan.find((item) => item.code === "1.1");
    expect(root).toMatchObject({ status: "exists", accountId: "existing-1" });
    expect(group).toMatchObject({ status: "exists", accountId: "existing-1.1" });
    expect(plan.filter((item) => item.status === "create")).toHaveLength(
      MSME_COA_TEMPLATE.length - 2,
    );
  });

  it("is idempotent: a second plan after full provisioning creates nothing", () => {
    const first = planCoaTemplate([]);
    const existing = first
      .filter((item) => item.status === "create")
      .map((item) => ref(item.code, item.type));
    const second = planCoaTemplate(existing);
    expect(second.every((item) => item.status === "exists")).toBe(true);
  });

  it("skips entries whose code exists with a different type and blocks descendants", () => {
    const plan = planCoaTemplate([ref("4", "EXPENSE")]);
    expect(plan.find((item) => item.code === "4")?.status).toBe("conflict");
    for (const code of ["4.1", "4.1.01", "4.1.02", "4.2"]) {
      expect(plan.find((item) => item.code === code)?.status).toBe("blocked");
    }
    expect(plan.find((item) => item.code === "1")?.status).toBe("create");
    expect(plan.find((item) => item.code === "5")?.status).toBe("create");
  });

  it("blocks only the affected subtree on a mid-level conflict", () => {
    const plan = planCoaTemplate([
      ref("1", "ASSET"),
      ref("1.1", "LIABILITY"),
    ]);
    expect(plan.find((item) => item.code === "1")?.status).toBe("exists");
    expect(plan.find((item) => item.code === "1.1")?.status).toBe("conflict");
    for (const code of ["1.1.01", "1.1.02", "1.1.03", "1.1.04"]) {
      expect(plan.find((item) => item.code === code)?.status).toBe("blocked");
    }
    expect(plan.find((item) => item.code === "1.2")?.status).toBe("create");
  });
});
