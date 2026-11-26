import { Prisma } from "@/generated/prisma/client";
import { ActionError } from "@/lib/errors";

type Tx = Prisma.TransactionClient;

export interface StockDeltaParams {
  companyId: string;
  productId: string;
  warehouseId: string;
  /** Signed change applied to the warehouse balance. */
  delta?: Prisma.Decimal;
  /** Absolute target for the warehouse balance (stock opname). */
  setQuantity?: Prisma.Decimal;
}

export interface StockBalance {
  previousQuantity: Prisma.Decimal;
  newQuantity: Prisma.Decimal;
}

/**
 * Atomically updates the per-warehouse balance (`product_stocks`) and the
 * company-wide total (`products.stock_quantity`) inside an existing
 * transaction.
 *
 * Invariant maintained:
 *   SUM(product_stocks.quantity) per product = products.stock_quantity
 *
 * Negative deltas are guarded by conditional updates on BOTH balances, so
 * concurrent checkouts/adjustments cannot oversell. Callers must create the
 * matching `stock_movements` row themselves (they own the reason/reference).
 */
export async function applyStockDelta(
  tx: Tx,
  params: StockDeltaParams,
): Promise<StockBalance> {
  const { companyId, productId, warehouseId } = params;

  const stock = await tx.productStock.findUnique({
    where: {
      companyId_productId_warehouseId: { companyId, productId, warehouseId },
    },
    select: { quantity: true },
  });

  const previous = stock?.quantity ?? new Prisma.Decimal(0);

  let next: Prisma.Decimal;
  let delta: Prisma.Decimal;
  if (params.setQuantity !== undefined) {
    next = params.setQuantity;
    delta = next.sub(previous);
  } else {
    if (params.delta === undefined) {
      throw new ActionError("Perubahan stok tidak valid.", "VALIDATION");
    }
    delta = params.delta;
    next = previous.add(delta);
  }

  if (next.lt(0)) {
    throw new ActionError(
      "Stok tidak mencukupi untuk perubahan ini.",
      "BUSINESS",
    );
  }

  if (delta.eq(0) && params.setQuantity === undefined) {
    return { previousQuantity: previous, newQuantity: next };
  }

  const decrement = delta.lt(0) ? delta.neg() : null;

  const stockUpdated = await tx.productStock.updateMany({
    where: {
      companyId,
      productId,
      warehouseId,
      ...(decrement ? { quantity: { gte: decrement } } : {}),
    },
    data: { quantity: { increment: delta } },
  });

  if (stockUpdated.count === 0) {
    if (decrement) {
      throw new ActionError(
        "Stok di gudang ini berubah atau tidak mencukupi. Muat ulang halaman dan coba lagi.",
        "CONFLICT",
      );
    }
    // No balance row yet and the delta is non-negative: create it.
    await tx.productStock.create({
      data: { companyId, productId, warehouseId, quantity: next },
    });
  }

  const productUpdated = await tx.product.updateMany({
    where: {
      id: productId,
      companyId,
      ...(decrement ? { stockQuantity: { gte: decrement } } : {}),
    },
    data: { stockQuantity: { increment: delta } },
  });

  if (productUpdated.count === 0) {
    throw new ActionError(
      "Total stok perusahaan berubah atau tidak mencukupi. Muat ulang halaman dan coba lagi.",
      "CONFLICT",
    );
  }

  return { previousQuantity: previous, newQuantity: next };
}
