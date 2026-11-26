/**
 * Minimal in-memory fake of the Prisma `account` delegate used by unit tests.
 * It supports the subset of query arguments the accounts queries/actions use:
 * equality filters, `NOT`, `OR` with `contains`/`mode: "insensitive"`,
 * `orderBy` on `code`, `parent`/`_count.children` decoration, and writes.
 */

export interface FakeAccountRow {
  id: string;
  companyId: string;
  code: string;
  name: string;
  type: string;
  parentId: string | null;
  isPostable: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

type Where = Record<string, unknown>;

export const accountRows: FakeAccountRow[] = [];
let idCounter = 0;

export function resetAccountRows(rows: FakeAccountRow[] = []) {
  accountRows.length = 0;
  accountRows.push(...rows);
  idCounter = 0;
}

export function makeAccount(
  overrides: Partial<FakeAccountRow> & { id: string; companyId: string },
): FakeAccountRow {
  const now = new Date("2026-01-01T00:00:00Z");
  return {
    code: overrides.id,
    name: `Akun ${overrides.id}`,
    type: "ASSET",
    parentId: null,
    isPostable: false,
    isActive: true,
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
      const mode = cond.mode === "insensitive" ? "insensitive" : "default";
      return mode === "insensitive"
        ? haystack.includes(needle)
        : String(value ?? "").includes(String(cond.contains ?? ""));
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

function matchWhere(row: FakeAccountRow, where: Where | undefined): boolean {
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
    if (!matchesCondition(row[key as keyof FakeAccountRow], condition)) {
      return false;
    }
  }
  return true;
}

function decorate(row: FakeAccountRow) {
  const parent = row.parentId
    ? accountRows.find(
        (candidate) =>
          candidate.id === row.parentId && candidate.companyId === row.companyId,
      )
    : undefined;
  const children = accountRows.filter(
    (candidate) =>
      candidate.parentId === row.id && candidate.companyId === row.companyId,
  );
  return {
    ...row,
    parent: parent ? { id: parent.id, code: parent.code, name: parent.name } : null,
    _count: { children: children.length },
    children: children.map((child) => ({
      id: child.id,
      code: child.code,
      name: child.name,
      type: child.type,
      isPostable: child.isPostable,
      isActive: child.isActive,
    })),
  };
}

function applyOrderBy(
  rows: FakeAccountRow[],
  orderBy: unknown,
): FakeAccountRow[] {
  if (!Array.isArray(orderBy) || orderBy.length === 0) return rows;
  const [{ code: direction }] = orderBy as { code?: string }[];
  if (direction !== "asc" && direction !== "desc") return rows;
  return [...rows].sort((a, b) =>
    direction === "asc" ? a.code.localeCompare(b.code) : b.code.localeCompare(a.code),
  );
}

interface FakePrismaClient {
  account: {
    findFirst(args?: { where?: Where }): Promise<unknown>;
    findMany(args?: { where?: Where; orderBy?: unknown }): Promise<unknown[]>;
    create(args: { data: Partial<FakeAccountRow> }): Promise<unknown>;
    update(args: {
      where?: Where;
      data: Partial<FakeAccountRow>;
    }): Promise<unknown>;
  };
  $transaction(
    callback: (tx: FakePrismaClient) => Promise<unknown> | unknown,
  ): Promise<unknown>;
}

export const fakePrisma: FakePrismaClient = {
  account: {
    async findFirst(args: { where?: Where } = {}) {
      const row = accountRows.find((candidate) => matchWhere(candidate, args.where));
      return row ? decorate(row) : null;
    },
    async findMany(args: { where?: Where; orderBy?: unknown } = {}) {
      const matched = accountRows.filter((row) => matchWhere(row, args.where));
      return applyOrderBy(matched, args.orderBy).map(decorate);
    },
    async create(args: { data: Partial<FakeAccountRow> }) {
      const now = new Date();
      const row: FakeAccountRow = {
        id: `acc-${String(++idCounter).padStart(4, "0")}`,
        companyId: "",
        code: "",
        name: "",
        type: "ASSET",
        parentId: null,
        isPostable: false,
        isActive: true,
        createdAt: now,
        updatedAt: now,
        ...args.data,
      } as FakeAccountRow;
      accountRows.push(row);
      return decorate(row);
    },
    async update(args: { where?: Where; data: Partial<FakeAccountRow> }) {
      const row = accountRows.find((candidate) =>
        matchWhere(candidate, args.where),
      );
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
  },
  $transaction(callback) {
    return Promise.resolve(callback(fakePrisma));
  },
};
