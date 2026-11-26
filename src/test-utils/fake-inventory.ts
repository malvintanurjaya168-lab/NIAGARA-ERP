/**
 * Minimal in-memory fake of the Prisma delegates used by inventory/sales
 * stock write-path tests: product, productStock, warehouse, stockMovement,
 * sale, and category. Supports the subset of query shapes those actions use.
 */

import { Prisma } from "@/generated/prisma/client";
import {
  fakeWarehousePrisma,
  makeWarehouse,
  resetWarehouseRows,
  warehouseRows,
  type FakeWarehouseRow,
} from "@/test-utils/fake-warehouses";

export interface FakeProductRow {
  id: string;
  companyId: string;
  categoryId: string | null;
  sku: string;
  name: string;
  unit: string;
  purchasePrice: Prisma.Decimal;
  sellingPrice: Prisma.Decimal;
  stockQuantity: Prisma.Decimal;
  minimumStock: Prisma.Decimal;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface FakeProductStockRow {
  id: string;
  companyId: string;
  productId: string;
  warehouseId: string;
  quantity: Prisma.Decimal;
  createdAt: Date;
  updatedAt: Date;
}

export interface FakeStockMovementRow {
  id: string;
  companyId: string;
  productId: string;
  movementType: string;
  quantityDelta: Prisma.Decimal;
  previousQuantity: Prisma.Decimal;
  newQuantity: Prisma.Decimal;
  reason: string;
  referenceType: string | null;
  referenceId: string | null;
  warehouseId: string | null;
  transferId: string | null;
  createdById: string;
  createdAt: Date;
}

export interface FakeStockTransferRow {
  id: string;
  companyId: string;
  transferNumber: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  status: string;
  note: string | null;
  createdById: string;
  completedAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FakeStockTransferItemRow {
  id: string;
  companyId: string;
  transferId: string;
  productId: string;
  quantity: Prisma.Decimal;
  createdAt: Date;
}

export interface FakeSaleRow {
  id: string;
  companyId: string;
  transactionNumber: string;
  cashierId: string;
  paymentMethod: string;
  status: string;
  totalAmount: Prisma.Decimal;
  clientRequestId: string | null;
  warehouseId: string | null;
  voidedAt: Date | null;
  voidedById: string | null;
  voidReason: string | null;
  items: { productId: string; quantity: Prisma.Decimal }[];
  createdAt: Date;
}

type Where = Record<string, unknown>;

export const productRows: FakeProductRow[] = [];
export const productStockRows: FakeProductStockRow[] = [];
export const stockMovementRows: FakeStockMovementRow[] = [];
export const saleRows: FakeSaleRow[] = [];
export const stockTransferRows: FakeStockTransferRow[] = [];
export const stockTransferItemRows: FakeStockTransferItemRow[] = [];

let idCounter = 0;

export function resetInventoryRows({
  products = [],
  productStocks = [],
  warehouses = [],
  sales = [],
  transfers = [],
  transferItems = [],
}: {
  products?: FakeProductRow[];
  productStocks?: FakeProductStockRow[];
  warehouses?: FakeWarehouseRow[];
  sales?: FakeSaleRow[];
  transfers?: FakeStockTransferRow[];
  transferItems?: FakeStockTransferItemRow[];
} = {}) {
  productRows.length = 0;
  productStockRows.length = 0;
  stockMovementRows.length = 0;
  saleRows.length = 0;
  stockTransferRows.length = 0;
  stockTransferItemRows.length = 0;
  productRows.push(...products);
  productStockRows.push(...productStocks);
  resetWarehouseRows(warehouses);
  saleRows.push(...sales);
  stockTransferRows.push(...transfers);
  stockTransferItemRows.push(...transferItems);
  idCounter = 0;
}

export { makeWarehouse, warehouseRows };
export type { FakeWarehouseRow };

export function makeProduct(
  overrides: Partial<FakeProductRow> & { id: string; companyId: string },
): FakeProductRow {
  const now = new Date("2026-01-01T00:00:00Z");
  return {
    categoryId: null,
    sku: overrides.id,
    name: `Produk ${overrides.id}`,
    unit: "pcs",
    purchasePrice: new Prisma.Decimal(1000),
    sellingPrice: new Prisma.Decimal(1500),
    stockQuantity: new Prisma.Decimal(0),
    minimumStock: new Prisma.Decimal(0),
    isActive: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function makeProductStock(
  overrides: Partial<FakeProductStockRow> & {
    id: string;
    companyId: string;
    productId: string;
    warehouseId: string;
  },
): FakeProductStockRow {
  const now = new Date("2026-01-01T00:00:00Z");
  return {
    quantity: new Prisma.Decimal(0),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function makeStockTransfer(
  overrides: Partial<FakeStockTransferRow> & {
    id: string;
    companyId: string;
    transferNumber: string;
    fromWarehouseId: string;
    toWarehouseId: string;
  },
): FakeStockTransferRow {
  const now = new Date("2026-01-01T00:00:00Z");
  return {
    status: "DRAFT",
    note: null,
    createdById: "user-1",
    completedAt: null,
    cancelledAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function makeStockTransferItem(
  overrides: Partial<FakeStockTransferItemRow> & {
    id: string;
    companyId: string;
    transferId: string;
    productId: string;
  },
): FakeStockTransferItemRow {
  return {
    quantity: new Prisma.Decimal(1),
    createdAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

function compareValues(value: unknown, operand: unknown): number {
  if (value instanceof Date && operand instanceof Date) {
    return value.getTime() - operand.getTime();
  }
  const a = value instanceof Prisma.Decimal ? value : new Prisma.Decimal(String(value ?? 0));
  const b = operand instanceof Prisma.Decimal ? operand : new Prisma.Decimal(String(operand ?? 0));
  return a.comparedTo(b);
}

function matchesCondition(value: unknown, condition: unknown): boolean {
  if (condition !== null && typeof condition === "object") {
    const cond = condition as Record<string, unknown>;
    if ("startsWith" in cond) {
      return String(value ?? "").startsWith(String(cond.startsWith ?? ""));
    }
    if (value instanceof Date) {
      const time = value.getTime();
      if ("gte" in cond && time < (cond.gte as Date).getTime()) return false;
      if ("gt" in cond && time <= (cond.gt as Date).getTime()) return false;
      if ("lt" in cond && time >= (cond.lt as Date).getTime()) return false;
      if ("lte" in cond && time > (cond.lte as Date).getTime()) return false;
      return true;
    }
    if ("contains" in cond) {
      return String(value ?? "")
        .toLowerCase()
        .includes(String(cond.contains ?? "").toLowerCase());
    }
    if ("in" in cond && Array.isArray(cond.in)) return cond.in.includes(value);
    if ("equals" in cond) return value === cond.equals;
    if ("gt" in cond) return compareValues(value, cond.gt) > 0;
    if ("gte" in cond) return compareValues(value, cond.gte) >= 0;
    if ("lt" in cond) return compareValues(value, cond.lt) < 0;
    if ("lte" in cond) return compareValues(value, cond.lte) <= 0;
    if ("increment" in cond || "decrement" in cond) return true;
    return false;
  }
  return value === condition;
}

function matchWhere<T extends Record<string, unknown>>(
  row: T,
  where: Where | undefined,
): boolean {
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
    if (!matchesCondition(row[key], condition)) return false;
  }
  return true;
}

function applyNumericUpdate(
  row: { [key: string]: unknown },
  field: string,
  data: unknown,
) {
  const update = (data as Record<string, unknown>)?.[field] as
    | { increment?: Prisma.Decimal; decrement?: Prisma.Decimal }
    | Prisma.Decimal
    | undefined;
  if (update === undefined) return;
  const current = row[field] as Prisma.Decimal;
  if (update instanceof Prisma.Decimal) {
    row[field] = update;
  } else if (typeof update === "object" && update !== null) {
    if (update.increment !== undefined) {
      row[field] = current.add(update.increment);
    }
    if (update.decrement !== undefined) {
      row[field] = current.sub(update.decrement);
    }
  }
}

interface Delegate {
  findFirst(args?: { where?: Where; orderBy?: unknown; select?: unknown }): Promise<unknown>;
  findMany(args?: { where?: Where; orderBy?: unknown; select?: unknown }): Promise<unknown[]>;
  findUnique(args?: { where?: Where; select?: unknown }): Promise<unknown>;
  count(args?: { where?: Where }): Promise<number>;
  create(args: { data: Record<string, unknown>; select?: unknown }): Promise<unknown>;
  update(args: { where?: Where; data: Record<string, unknown> }): Promise<unknown>;
  updateMany(args: { where?: Where; data: Record<string, unknown> }): Promise<{ count: number }>;
}

function makeRowsDelegate<T extends { id: string }>(
  rows: T[],
  defaults: () => Omit<T, "id">,
): Delegate {
  return {
    async findFirst(args: { where?: Where } = {}) {
      return rows.find((row) => matchWhere(row as never, args.where)) ?? null;
    },
    async findMany(args: { where?: Where } = {}) {
      return rows.filter((row) => matchWhere(row as never, args.where));
    },
    async findUnique(args: { where?: Where } = {}) {
      return rows.find((row) => matchWhere(row as never, args.where)) ?? null;
    },
    async count(args: { where?: Where } = {}) {
      return rows.filter((row) => matchWhere(row as never, args.where)).length;
    },
    async create(args: { data: Record<string, unknown> }) {
      const row = { id: `row-${++idCounter}`, ...defaults(), ...args.data } as T;
      rows.push(row);
      return row;
    },
    async update(args: { where?: Where; data: Record<string, unknown> }) {
      const row = rows.find((candidate) =>
        matchWhere(candidate as never, args.where),
      );
      if (!row) {
        const error = new Error("Record to update not found.") as Error & {
          code?: string;
        };
        error.code = "P2025";
        throw error;
      }
      Object.assign(row, args.data);
      return row;
    },
    async updateMany(args: { where?: Where; data: Record<string, unknown> }) {
      const matched = rows.filter((row) => matchWhere(row as never, args.where));
      for (const row of matched) {
        for (const [field, value] of Object.entries(args.data)) {
          if (field === "stockQuantity" || field === "quantity") {
            applyNumericUpdate(row as never, field, { [field]: value });
          } else {
            (row as Record<string, unknown>)[field] = value;
          }
        }
      }
      return { count: matched.length };
    },
  };
}

const productDelegate = makeRowsDelegate(productRows, () => ({
  companyId: "",
  categoryId: null,
  sku: "",
  name: "",
  unit: "pcs",
  purchasePrice: new Prisma.Decimal(0),
  sellingPrice: new Prisma.Decimal(0),
  stockQuantity: new Prisma.Decimal(0),
  minimumStock: new Prisma.Decimal(0),
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}));

const productStockDelegate = makeRowsDelegate(
  productStockRows,
  () => ({
    companyId: "",
    productId: "",
    warehouseId: "",
    quantity: new Prisma.Decimal(0),
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
);

const stockMovementDelegate = makeRowsDelegate(
  stockMovementRows,
  () => ({
    companyId: "",
    productId: "",
    movementType: "ADJUSTMENT",
    quantityDelta: new Prisma.Decimal(0),
    previousQuantity: new Prisma.Decimal(0),
    newQuantity: new Prisma.Decimal(0),
    reason: "",
    referenceType: null,
    referenceId: null,
    warehouseId: null,
    transferId: null,
    createdById: "",
    createdAt: new Date(),
  }),
);

const saleDelegate = {
  async findFirst(args: { where?: Where } = {}) {
    const row = saleRows.find((candidate) =>
      matchWhere(candidate as never, args.where),
    );
    return row ? { ...row, _count: { items: row.items.length } } : null;
  },
  async findMany(args: { where?: Where } = {}) {
    return saleRows.filter((row) => matchWhere(row as never, args.where));
  },
  async create(args: {
    data: Record<string, unknown>;
    select?: unknown;
  }) {
    const nestedItems =
      (args.data.items as { create?: Record<string, unknown>[] } | undefined)
        ?.create ?? [];
    const rest = { ...args.data };
    delete rest.items;
    const row: FakeSaleRow = {
      id: `sale-${++idCounter}`,
      companyId: "",
      transactionNumber: "",
      cashierId: "",
      paymentMethod: "CASH",
      status: "COMPLETED",
      totalAmount: new Prisma.Decimal(0),
      clientRequestId: null,
      warehouseId: null,
      voidedAt: null,
      voidedById: null,
      voidReason: null,
      createdAt: new Date(),
      ...rest,
      items: nestedItems.map((item) => ({
        productId: String(item.productId),
        quantity: item.quantity as Prisma.Decimal,
      })),
    } as FakeSaleRow;
    saleRows.push(row);
    return { id: row.id, transactionNumber: row.transactionNumber };
  },
  async updateMany(args: { where?: Where; data: Record<string, unknown> }) {
    const matched = saleRows.filter((row) => matchWhere(row as never, args.where));
    for (const row of matched) {
      Object.assign(row, args.data);
    }
    return { count: matched.length };
  },
};

function transferItemsOf(transferId: string, companyId: string) {
  return stockTransferItemRows
    .filter(
      (item) => item.transferId === transferId && item.companyId === companyId,
    )
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map((item) => {
      const product = productRows.find(
        (candidate) =>
          candidate.id === item.productId && candidate.companyId === companyId,
      );
      return {
        ...item,
        product: product
          ? { name: product.name, sku: product.sku, unit: product.unit }
          : null,
      };
    });
}

function decorateTransfer(row: FakeStockTransferRow) {
  const fromWarehouse = warehouseRows.find(
    (candidate) =>
      candidate.id === row.fromWarehouseId && candidate.companyId === row.companyId,
  );
  const toWarehouse = warehouseRows.find(
    (candidate) =>
      candidate.id === row.toWarehouseId && candidate.companyId === row.companyId,
  );
  return {
    ...row,
    fromWarehouse: fromWarehouse ?? null,
    toWarehouse: toWarehouse ?? null,
    createdBy: { fullName: `User ${row.createdById}` },
    items: transferItemsOf(row.id, row.companyId),
    _count: {
      items: stockTransferItemRows.filter(
        (item) => item.transferId === row.id && item.companyId === row.companyId,
      ).length,
    },
  };
}

function applyTransferOrderBy(
  rows: FakeStockTransferRow[],
  orderBy: unknown,
): FakeStockTransferRow[] {
  const clauses = Array.isArray(orderBy) ? orderBy : orderBy ? [orderBy] : [];
  if (clauses.length === 0) return rows;
  return [...rows].sort((a, b) => {
    for (const clause of clauses as Record<string, string>[]) {
      const [field, direction] = Object.entries(clause)[0] ?? [];
      if (!field) continue;
      const av = a[field as keyof FakeStockTransferRow];
      const bv = b[field as keyof FakeStockTransferRow];
      let cmp: number;
      if (av instanceof Date && bv instanceof Date) {
        cmp = av.getTime() - bv.getTime();
      } else {
        cmp = String(av ?? "").localeCompare(String(bv ?? ""));
      }
      if (cmp !== 0) return direction === "desc" ? -cmp : cmp;
    }
    return 0;
  });
}

const stockTransferDelegate = {
  async findFirst(args: { where?: Where; orderBy?: unknown } = {}) {
    const matched = stockTransferRows.filter((row) =>
      matchWhere(row as never, args.where),
    );
    const ordered = applyTransferOrderBy(matched, args.orderBy);
    const row = ordered[0];
    return row ? decorateTransfer(row) : null;
  },
  async findMany(
    args: {
      where?: Where;
      orderBy?: unknown;
      skip?: number;
      take?: number;
    } = {},
  ) {
    const matched = stockTransferRows.filter((row) =>
      matchWhere(row as never, args.where),
    );
    const ordered = applyTransferOrderBy(matched, args.orderBy);
    const sliced = ordered.slice(
      args.skip ?? 0,
      (args.skip ?? 0) + (args.take ?? ordered.length),
    );
    return sliced.map(decorateTransfer);
  },
  async count(args: { where?: Where } = {}) {
    return stockTransferRows.filter((row) =>
      matchWhere(row as never, args.where),
    ).length;
  },
  async create(args: {
    data: Record<string, unknown> & {
      items?: { create?: Record<string, unknown>[] };
    };
  }) {
    const now = new Date();
    const { items, ...rest } = args.data;
    const row: FakeStockTransferRow = {
      id: `transfer-${++idCounter}`,
      companyId: "",
      transferNumber: "",
      fromWarehouseId: "",
      toWarehouseId: "",
      status: "DRAFT",
      note: null,
      createdById: "",
      completedAt: null,
      cancelledAt: null,
      createdAt: now,
      updatedAt: now,
      ...rest,
    } as FakeStockTransferRow;
    stockTransferRows.push(row);
    for (const item of items?.create ?? []) {
      stockTransferItemRows.push({
        id: `ti-${++idCounter}`,
        companyId: String(item.companyId ?? row.companyId),
        transferId: row.id,
        productId: String(item.productId),
        quantity: item.quantity as Prisma.Decimal,
        createdAt: now,
      });
    }
    return decorateTransfer(row);
  },
  async updateMany(args: { where?: Where; data: Record<string, unknown> }) {
    const matched = stockTransferRows.filter((row) =>
      matchWhere(row as never, args.where),
    );
    for (const row of matched) {
      Object.assign(row, args.data, { updatedAt: new Date() });
    }
    return { count: matched.length };
  },
};

const stockTransferItemDelegate = {
  async create(args: { data: Record<string, unknown> }) {
    const row: FakeStockTransferItemRow = {
      id: `ti-${++idCounter}`,
      companyId: "",
      transferId: "",
      productId: "",
      quantity: new Prisma.Decimal(0),
      createdAt: new Date(),
      ...args.data,
    } as FakeStockTransferItemRow;
    stockTransferItemRows.push(row);
    return row;
  },
};

const categoryDelegate = makeRowsDelegate<{
  id: string;
  companyId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}>([] as never, () => ({
  companyId: "",
  name: "",
  description: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}));

interface FakeInventoryClient {
  product: Delegate;
  productStock: Omit<Delegate, "findUnique"> & {
    findUnique(args: { where: Where }): Promise<unknown>;
  };
  warehouse: (typeof fakeWarehousePrisma)["warehouse"];
  stockMovement: Delegate;
  sale: typeof saleDelegate;
  stockTransfer: typeof stockTransferDelegate;
  stockTransferItem: typeof stockTransferItemDelegate;
  category: Delegate;
  $transaction(
    callback: (tx: FakeInventoryClient) => Promise<unknown> | unknown,
  ): Promise<unknown>;
}

function cloneValue(value: unknown): unknown {
  if (value instanceof Prisma.Decimal) return new Prisma.Decimal(value.toString());
  if (value instanceof Date) return new Date(value.getTime());
  if (Array.isArray(value)) return value.map(cloneValue);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      out[key] = cloneValue(entry);
    }
    return out;
  }
  return value;
}

function snapshotRows() {
  return [
    productRows,
    productStockRows,
    stockMovementRows,
    saleRows,
    stockTransferRows,
    stockTransferItemRows,
    warehouseRows,
  ].map((rows) => rows.map((row) => cloneValue(row)));
}

function restoreRows(snapshot: unknown[][]) {
  const targets = [
    productRows,
    productStockRows,
    stockMovementRows,
    saleRows,
    stockTransferRows,
    stockTransferItemRows,
    warehouseRows,
  ];
  targets.forEach((rows, index) => {
    rows.length = 0;
    rows.push(...(snapshot[index] as never[]));
  });
}

const client: FakeInventoryClient = {
  product: productDelegate,
  productStock: {
    ...productStockDelegate,
    async findUnique(args: { where: Where }) {
      const compound = args.where.companyId_productId_warehouseId as
        | Where
        | undefined;
      if (compound) {
        return (
          productStockRows.find(
            (row) =>
              row.companyId === compound.companyId &&
              row.productId === compound.productId &&
              row.warehouseId === compound.warehouseId,
          ) ?? null
        );
      }
      return (
        productStockRows.find((row) => matchWhere(row as never, args.where)) ??
        null
      );
    },
  },
  warehouse: fakeWarehousePrisma.warehouse,
  stockMovement: stockMovementDelegate,
  sale: saleDelegate,
  stockTransfer: stockTransferDelegate,
  stockTransferItem: stockTransferItemDelegate,
  category: categoryDelegate as never,
  async $transaction(callback) {
    const snapshot = snapshotRows();
    try {
      return await callback(client);
    } catch (error) {
      restoreRows(snapshot);
      throw error;
    }
  },
};

export const fakeInventoryPrisma = client;
