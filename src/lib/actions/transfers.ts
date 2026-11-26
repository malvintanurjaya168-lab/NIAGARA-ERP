"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireActionUser } from "@/lib/auth-guards";
import { ActionError, type ActionResult } from "@/lib/errors";
import { todayKey } from "@/lib/periods";

const transferItemSchema = z.object({
  productId: z.string().uuid("Produk tidak valid."),
  quantity: z.coerce
    .number()
    .positive("Jumlah harus lebih dari 0.")
    .max(1_000_000, "Jumlah terlalu besar."),
});

const createSchema = z.object({
  fromWarehouseId: z.string().uuid("Gudang asal tidak valid."),
  toWarehouseId: z.string().uuid("Gudang tujuan tidak valid."),
  note: z.preprocess(
    (value) =>
      value === null ||
      (typeof value === "string" && value.trim() === "")
        ? undefined
        : value,
    z.string().trim().max(300, "Catatan maksimal 300 karakter.").optional(),
  ),
  items: z
    .array(transferItemSchema)
    .min(1, "Minimal satu produk diperlukan.")
    .max(100, "Terlalu banyak produk dalam satu transfer."),
});

const idSchema = z.object({
  transferId: z.string().uuid("Transfer tidak valid."),
});

function validationError(error: z.ZodError): ActionResult {
  const flattened = error.flatten();
  const fieldErrors: Record<string, string[]> = {};
  const source = flattened.fieldErrors as Record<string, string[] | undefined>;
  for (const [key, messages] of Object.entries(source)) {
    if (messages?.length) fieldErrors[key] = messages;
  }
  return {
    ok: false,
    error: "Periksa kembali data yang Anda masukkan.",
    code: "VALIDATION",
    fieldErrors,
  };
}

function handleActionError(error: unknown): ActionResult {
  if (error instanceof ActionError) {
    return { ok: false, error: error.message, code: error.code };
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return {
        ok: false,
        error: "Data dengan nilai unik tersebut sudah ada.",
        code: "CONFLICT",
      };
    }
    if (error.code === "P2025") {
      return { ok: false, error: "Data tidak ditemukan.", code: "NOT_FOUND" };
    }
  }
  console.error("[transfers action]", error);
  return {
    ok: false,
    error: "Terjadi kesalahan pada server. Silakan coba lagi.",
    code: "BUSINESS",
  };
}

function revalidateTransfers(transferId?: string) {
  revalidatePath("/inventory/transfers");
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  if (transferId) revalidatePath(`/inventory/transfers/${transferId}`);
}

async function nextTransferNumber(
  tx: Prisma.TransactionClient,
  companyId: string,
): Promise<string> {
  const prefix = `TRF-${todayKey().replaceAll("-", "")}`;
  const last = await tx.stockTransfer.findFirst({
    where: { companyId, transferNumber: { startsWith: prefix } },
    orderBy: { transferNumber: "desc" },
    select: { transferNumber: true },
  });

  let sequence = 1;
  if (last) {
    const parsed = Number.parseInt(
      last.transferNumber.slice(last.transferNumber.lastIndexOf("-") + 1),
      10,
    );
    if (Number.isFinite(parsed) && parsed >= 0) sequence = parsed + 1;
  }

  return `${prefix}-${String(sequence).padStart(4, "0")}`;
}

async function assertTransferableWarehouses(
  tx: Prisma.TransactionClient,
  companyId: string,
  fromWarehouseId: string,
  toWarehouseId: string,
) {
  if (fromWarehouseId === toWarehouseId) {
    throw new ActionError(
      "Gudang asal dan tujuan tidak boleh sama.",
      "VALIDATION",
    );
  }

  const warehouses = await tx.warehouse.findMany({
    where: {
      companyId,
      id: { in: [fromWarehouseId, toWarehouseId] },
    },
    select: { id: true, isActive: true },
  });

  if (warehouses.length !== 2) {
    throw new ActionError(
      "Salah satu gudang tidak ditemukan di perusahaan ini.",
      "NOT_FOUND",
    );
  }
  if (warehouses.some((warehouse) => !warehouse.isActive)) {
    throw new ActionError(
      "Transfer hanya dapat dilakukan antar gudang yang aktif.",
      "BUSINESS",
    );
  }
}

export async function createTransferAction(
  _previousState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await requireActionUser("transfers.manage");

    let rawItems: unknown;
    try {
      rawItems = JSON.parse(String(formData.get("items") ?? "[]"));
    } catch {
      return { ok: false, error: "Data produk transfer tidak valid." };
    }

    const parsed = createSchema.safeParse({
      fromWarehouseId: formData.get("fromWarehouseId"),
      toWarehouseId: formData.get("toWarehouseId"),
      note: formData.get("note"),
      items: rawItems,
    });
    if (!parsed.success) return validationError(parsed.error);

    const data = parsed.data;

    // Merge duplicate product lines by summing quantities.
    const merged = new Map<string, Prisma.Decimal>();
    for (const item of data.items) {
      const qty = new Prisma.Decimal(item.quantity);
      merged.set(
        item.productId,
        (merged.get(item.productId) ?? new Prisma.Decimal(0)).add(qty),
      );
    }
    const lines = [...merged.entries()].map(([productId, quantity]) => ({
      productId,
      quantity,
    }));

    let transfer: { id: string; transferNumber: string } | null = null;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        transfer = await prisma.$transaction(async (tx) => {
          await assertTransferableWarehouses(
            tx,
            user.companyId,
            data.fromWarehouseId,
            data.toWarehouseId,
          );

          const products = await tx.product.findMany({
            where: {
              companyId: user.companyId,
              isActive: true,
              id: { in: lines.map((line) => line.productId) },
            },
            select: { id: true },
          });
          if (products.length !== lines.length) {
            throw new ActionError(
              "Salah satu produk tidak ditemukan atau sudah nonaktif.",
              "NOT_FOUND",
            );
          }

          const transferNumber = await nextTransferNumber(tx, user.companyId);

          return tx.stockTransfer.create({
            data: {
              companyId: user.companyId,
              transferNumber,
              fromWarehouseId: data.fromWarehouseId,
              toWarehouseId: data.toWarehouseId,
              status: "DRAFT",
              note: data.note || null,
              createdById: user.id,
              items: {
                create: lines.map((line) => ({
                  companyId: user.companyId,
                  productId: line.productId,
                  quantity: line.quantity,
                })),
              },
            },
            select: { id: true, transferNumber: true },
          });
        });
        break;
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          continue;
        }
        throw error;
      }
    }

    if (!transfer) {
      throw new ActionError(
        "Gagal membuat nomor transfer. Silakan coba lagi.",
        "CONFLICT",
      );
    }

    revalidateTransfers(transfer.id);
    return {
      ok: true,
      id: transfer.id,
      message: `Draft transfer ${transfer.transferNumber} dibuat.`,
    };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function completeTransferAction(
  _previousState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await requireActionUser("transfers.manage");
    const parsed = idSchema.safeParse({ transferId: formData.get("transferId") });
    if (!parsed.success) return validationError(parsed.error);

    const { transferId } = parsed.data;

    await prisma.$transaction(async (tx) => {
      const transfer = await tx.stockTransfer.findFirst({
        where: { id: transferId, companyId: user.companyId },
        select: {
          id: true,
          status: true,
          fromWarehouseId: true,
          toWarehouseId: true,
          items: {
            select: { productId: true, quantity: true },
            orderBy: { productId: "asc" },
          },
        },
      });

      if (!transfer) {
        throw new ActionError("Transfer tidak ditemukan.", "NOT_FOUND");
      }
      if (transfer.status !== "DRAFT") {
        throw new ActionError(
          transfer.status === "COMPLETED"
            ? "Transfer ini sudah diselesaikan."
            : "Transfer yang dibatalkan tidak dapat diselesaikan.",
          "CONFLICT",
        );
      }

      await assertTransferableWarehouses(
        tx,
        user.companyId,
        transfer.fromWarehouseId,
        transfer.toWarehouseId,
      );

      // Claim the transfer atomically: only a DRAFT row can transition, so
      // concurrent completion attempts lose the race here.
      const claimed = await tx.stockTransfer.updateMany({
        where: { id: transfer.id, companyId: user.companyId, status: "DRAFT" },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
      if (claimed.count === 0) {
        throw new ActionError(
          "Transfer sudah diproses oleh pengguna lain.",
          "CONFLICT",
        );
      }

      // Deterministic ordering keeps concurrent transfers deadlock-free.
      const items = [...transfer.items].sort((a, b) =>
        a.productId.localeCompare(b.productId),
      );

      for (const item of items) {
        const qty = item.quantity;

        const sourceStock = await tx.productStock.findUnique({
          where: {
            companyId_productId_warehouseId: {
              companyId: user.companyId,
              productId: item.productId,
              warehouseId: transfer.fromWarehouseId,
            },
          },
          select: { quantity: true },
        });
        const sourcePrevious = sourceStock?.quantity ?? new Prisma.Decimal(0);
        const sourceNext = sourcePrevious.sub(qty);
        if (sourceNext.lt(0)) {
          throw new ActionError(
            "Stok di gudang asal tidak mencukupi untuk transfer ini.",
            "BUSINESS",
          );
        }

        const sourceUpdated = await tx.productStock.updateMany({
          where: {
            companyId: user.companyId,
            productId: item.productId,
            warehouseId: transfer.fromWarehouseId,
            quantity: { gte: qty },
          },
          data: { quantity: { decrement: qty } },
        });
        if (sourceUpdated.count === 0) {
          // No balance row existed yet but the check above passed only when
          // previous >= qty; with no row previous is 0, so this is unreachable
          // for positive qty — guard anyway.
          if (sourceStock) {
            throw new ActionError(
              "Stok gudang asal berubah. Muat ulang dan coba lagi.",
              "CONFLICT",
            );
          }
          await tx.productStock.create({
            data: {
              companyId: user.companyId,
              productId: item.productId,
              warehouseId: transfer.fromWarehouseId,
              quantity: sourceNext,
            },
          });
        }

        const destStock = await tx.productStock.findUnique({
          where: {
            companyId_productId_warehouseId: {
              companyId: user.companyId,
              productId: item.productId,
              warehouseId: transfer.toWarehouseId,
            },
          },
          select: { quantity: true },
        });
        const destPrevious = destStock?.quantity ?? new Prisma.Decimal(0);
        const destNext = destPrevious.add(qty);

        const destUpdated = await tx.productStock.updateMany({
          where: {
            companyId: user.companyId,
            productId: item.productId,
            warehouseId: transfer.toWarehouseId,
          },
          data: { quantity: { increment: qty } },
        });
        if (destUpdated.count === 0) {
          await tx.productStock.create({
            data: {
              companyId: user.companyId,
              productId: item.productId,
              warehouseId: transfer.toWarehouseId,
              quantity: destNext,
            },
          });
        }

        const reason = `Transfer ${transfer.id}`;
        await tx.stockMovement.create({
          data: {
            companyId: user.companyId,
            productId: item.productId,
            movementType: "TRANSFER_OUT",
            quantityDelta: qty.neg(),
            previousQuantity: sourcePrevious,
            newQuantity: sourceNext,
            reason,
            referenceType: "TRANSFER",
            referenceId: transfer.id,
            warehouseId: transfer.fromWarehouseId,
            transferId: transfer.id,
            createdById: user.id,
          },
        });
        await tx.stockMovement.create({
          data: {
            companyId: user.companyId,
            productId: item.productId,
            movementType: "TRANSFER_IN",
            quantityDelta: qty,
            previousQuantity: destPrevious,
            newQuantity: destNext,
            reason,
            referenceType: "TRANSFER",
            referenceId: transfer.id,
            warehouseId: transfer.toWarehouseId,
            transferId: transfer.id,
            createdById: user.id,
          },
        });
      }
    });

    revalidateTransfers(transferId);
    return { ok: true, message: "Transfer selesai. Stok telah dipindahkan." };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function cancelTransferAction(
  _previousState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await requireActionUser("transfers.manage");
    const parsed = idSchema.safeParse({ transferId: formData.get("transferId") });
    if (!parsed.success) return validationError(parsed.error);

    const { transferId } = parsed.data;

    const result = await prisma.stockTransfer.updateMany({
      where: {
        id: transferId,
        companyId: user.companyId,
        status: "DRAFT",
      },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });

    if (result.count === 0) {
      const existing = await prisma.stockTransfer.findFirst({
        where: { id: transferId, companyId: user.companyId },
        select: { status: true },
      });
      if (!existing) {
        throw new ActionError("Transfer tidak ditemukan.", "NOT_FOUND");
      }
      throw new ActionError(
        existing.status === "COMPLETED"
          ? "Transfer yang sudah selesai tidak dapat dibatalkan. Buat transfer balik untuk koreksi."
          : "Transfer ini sudah dibatalkan.",
        "CONFLICT",
      );
    }

    revalidateTransfers(transferId);
    return { ok: true, message: "Draft transfer dibatalkan." };
  } catch (error) {
    return handleActionError(error);
  }
}
