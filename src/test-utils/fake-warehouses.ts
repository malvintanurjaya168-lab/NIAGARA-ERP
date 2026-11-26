/**
 * Minimal in-memory fake of the Prisma `warehouse` delegate used by unit
 * tests. Supports equality filters, `NOT`, `OR` with `contains`/
 * `mode: "insensitive"`, `orderBy` on `isDefault`/`code`, `skip`/`take`,
 * `_count.productStocks`, and writes including `updateMany`.
 */

export interface FakeWarehouseRow {
  id: string;
  companyId: string;
  code: string;
  name: string;
  address: string | null;
  isActive: boolean;
  isDefault: boolean;
  productStockCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

type Where = Record<string, unknown>;

export const warehouseRows: FakeWarehouseRow[] = [];
let idCounter = 0;

export function resetWarehouseRows(rows: FakeWarehouseRow[] = []) {
  warehouseRows.length = 0;
  warehouseRows.push(...rows);
  idCounter = 0;
}

export function makeWarehouse(
  overrides: Partial<FakeWarehouseRow> & { id: string; companyId: string },
): FakeWarehouseRow {
  const now = new Date("2026-01-01T00:00:00Z");
  return {
    code: overrides.id,
    name: `Gudang ${overrides.id}`,
    address: null,
    isActive: true,
    isDefault: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function matchesCondition(value: unknown, condition: unknown): boolean {
  if (condition !== null && typeof condition === "object") {
    const cond = condition as Record<string, unknown>;
    if ("contains" in cond) {
      const needle = String(cond.contains ?? "").toLowerCase();
      const haystack = String(value ?? "").toLowerCase();
      return haystack.includes(needle);
    }
    if ("in" in cond && Array.isArray(cond.in)) {
      return cond.in.includes(value);
    }
    if ("equals" in cond) {
      return value === cond.equals;
    }
    return false;
  }
  return value === condition;
}

function matchWhere(row: FakeWarehouseRow, where: Where | undefined): boolean {
  if (!where) return true;
  for (const [key, condition] of Object.entries(where)) {
    if (key === "OR" && Array.isArray(condition)) {
      if (!condition.some((sub) => matchWhere(row, sub as Where))) return false;
      continue;
    }
    if (key === "AND" && Array.isArray(condition)) {
      if (!condition.every((sub) => matchWhere(row, sub as Where))) return false;
      continue;
    }
    if (key === "NOT") {
      if (matchWhere(row, condition as Where)) return false;
      continue;
    }
    if (!matchesCondition(row[key as keyof FakeWarehouseRow], condition)) {
      return false;
    }
  }
  return true;
}

function decorate(row: FakeWarehouseRow) {
  return {
    ...row,
    _count: { productStocks: row.productStockCount ?? 0 },
  };
}

function applyOrderBy(
  rows: FakeWarehouseRow[],
  orderBy: unknown,
): FakeWarehouseRow[] {
  if (!Array.isArray(orderBy) || orderBy.length === 0) return rows;
  const clauses = (orderBy as Record<string, string>[]).map(
    (clause) => Object.entries(clause)[0] as [string, string],
  );
  return [...rows].sort((a, b) => {
    for (const [field, direction] of clauses) {
      const av = a[field as keyof FakeWarehouseRow];
      const bv = b[field as keyof FakeWarehouseRow];
      let cmp: number;
      if (typeof av === "boolean" && typeof bv === "boolean") {
        cmp = Number(av) - Number(bv);
      } else {
        cmp = String(av ?? "").localeCompare(String(bv ?? ""));
      }
      if (cmp !== 0) return direction === "desc" ? -cmp : cmp;
    }
    return 0;
  });
}

interface FakePrismaClient {
  warehouse: {
    findFirst(args?: { where?: Where }): Promise<unknown>;
    findMany(args?: {
      where?: Where;
      orderBy?: unknown;
      skip?: number;
      take?: number;
    }): Promise<unknown[]>;
    count(args?: { where?: Where }): Promise<number>;
    create(args: { data: Partial<FakeWarehouseRow> }): Promise<unknown>;
    update(args: {
      where?: Where;
      data: Partial<FakeWarehouseRow>;
    }): Promise<unknown>;
    updateMany(args: {
      where?: Where;
      data: Partial<FakeWarehouseRow>;
    }): Promise<{ count: number }>;
  };
  $transaction(
    callback: (tx: FakePrismaClient) => Promise<unknown> | unknown,
  ): Promise<unknown>;
}

function findRow(where: Where | undefined): FakeWarehouseRow | undefined {
  return warehouseRows.find((candidate) => matchWhere(candidate, where));
}

export const fakeWarehousePrisma: FakePrismaClient = {
  warehouse: {
    async findFirst(args: { where?: Where } = {}) {
      const row = findRow(args.where);
      return row ? decorate(row) : null;
    },
    async findMany(
      args: { where?: Where; orderBy?: unknown; skip?: number; take?: number } = {},
    ) {
      const matched = warehouseRows.filter((row) => matchWhere(row, args.where));
      const ordered = applyOrderBy(matched, args.orderBy);
      const sliced = ordered.slice(args.skip ?? 0, (args.skip ?? 0) + (args.take ?? ordered.length));
      return sliced.map(decorate);
    },
    async count(args: { where?: Where } = {}) {
      return warehouseRows.filter((row) => matchWhere(row, args.where)).length;
    },
    async create(args: { data: Partial<FakeWarehouseRow> }) {
      const now = new Date();
      const row: FakeWarehouseRow = {
        id: `wh-${String(++idCounter).padStart(4, "0")}`,
        companyId: "",
        code: "",
        name: "",
        address: null,
        isActive: true,
        isDefault: false,
        createdAt: now,
        updatedAt: now,
        ...args.data,
      } as FakeWarehouseRow;
      warehouseRows.push(row);
      return decorate(row);
    },
    async update(args: { where?: Where; data: Partial<FakeWarehouseRow> }) {
      const row = findRow(args.where);
      if (!row) {
        const error = new Error("Record to update not found.") as Error & {
          code?: string;
        };
        error.code = "P2025";
        throw error;
      }
      Object.assign(row, args.data, { updatedAt: new Date() });
      return decorate(row);
    },
    async updateMany(args: { where?: Where; data: Partial<FakeWarehouseRow> }) {
      const matched = warehouseRows.filter((row) => matchWhere(row, args.where));
      for (const row of matched) {
        Object.assign(row, args.data, { updatedAt: new Date() });
      }
      return { count: matched.length };
    },
  },
  $transaction(callback) {
    return Promise.resolve(callback(fakeWarehousePrisma));
  },
};
