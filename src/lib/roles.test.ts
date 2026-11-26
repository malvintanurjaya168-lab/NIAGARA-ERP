import { describe, expect, it } from "vitest";
import { can } from "@/lib/roles";

describe("accounts permissions", () => {
  it("OWNER can view and manage accounts", () => {
    expect(can("OWNER", "accounts.view")).toBe(true);
    expect(can("OWNER", "accounts.manage")).toBe(true);
  });

  it("MANAGER can view but not manage accounts", () => {
    expect(can("MANAGER", "accounts.view")).toBe(true);
    expect(can("MANAGER", "accounts.manage")).toBe(false);
  });

  it("FINANCE can view but not manage accounts", () => {
    expect(can("FINANCE", "accounts.view")).toBe(true);
    expect(can("FINANCE", "accounts.manage")).toBe(false);
  });

  it("INVENTORY_STAFF and CASHIER have no account access", () => {
    expect(can("INVENTORY_STAFF", "accounts.view")).toBe(false);
    expect(can("INVENTORY_STAFF", "accounts.manage")).toBe(false);
    expect(can("CASHIER", "accounts.view")).toBe(false);
    expect(can("CASHIER", "accounts.manage")).toBe(false);
  });
});

describe("warehouse permissions", () => {
  it("OWNER can view and manage warehouses", () => {
    expect(can("OWNER", "warehouses.view")).toBe(true);
    expect(can("OWNER", "warehouses.manage")).toBe(true);
  });

  it("MANAGER can view and manage warehouses", () => {
    expect(can("MANAGER", "warehouses.view")).toBe(true);
    expect(can("MANAGER", "warehouses.manage")).toBe(true);
  });

  it("INVENTORY_STAFF can view but not manage warehouses", () => {
    expect(can("INVENTORY_STAFF", "warehouses.view")).toBe(true);
    expect(can("INVENTORY_STAFF", "warehouses.manage")).toBe(false);
  });

  it("CASHIER and FINANCE have no warehouse access", () => {
    expect(can("CASHIER", "warehouses.view")).toBe(false);
    expect(can("CASHIER", "warehouses.manage")).toBe(false);
    expect(can("FINANCE", "warehouses.view")).toBe(false);
    expect(can("FINANCE", "warehouses.manage")).toBe(false);
  });

  it("OWNER, MANAGER, and INVENTORY_STAFF can manage transfers", () => {
    for (const role of ["OWNER", "MANAGER", "INVENTORY_STAFF"] as const) {
      expect(can(role, "transfers.view")).toBe(true);
      expect(can(role, "transfers.manage")).toBe(true);
    }
  });

  it("FINANCE can view but not manage transfers; CASHIER has no access", () => {
    expect(can("FINANCE", "transfers.view")).toBe(true);
    expect(can("FINANCE", "transfers.manage")).toBe(false);
    expect(can("CASHIER", "transfers.view")).toBe(false);
    expect(can("CASHIER", "transfers.manage")).toBe(false);
  });
});
