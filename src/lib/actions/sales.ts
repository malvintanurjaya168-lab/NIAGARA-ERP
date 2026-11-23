"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireActionUser } from "@/lib/auth-guards";
import { ActionError, type ActionResult } from "@/lib/errors";
import { formatQuantity } from "@/lib/format";
import { todayKey } from "@/lib/periods";

export type CheckoutResult =
  | {
      ok: true;
      saleId: string;
      transactionNumber: string;
      totalAmount: number;
      paymentMethod: string;
      itemCount: number;
      alreadyRecorded?: boolean;
    }
  | { ok: false; error: string };

const checkoutSchema = z.object({
  paymentMethod: z.enum([
    "CASH",
    "BANK_TRANSFER",
    "QRIS",
    "CARD",
    "E_WALLET",
  ]),
  clientRequestId: z.string().uuid("Permintaan transaksi tidak valid."),
  items: z
    .array(
      z.object({
        productId: z.string().uuid("Produk tidak valid."),
        quantity: z.coerce
          .number()
          .positive("Jumlah harus lebih dari 0.")
          .max(1_000_000, "Jumlah terlalu besar."),
      }),
    )
    .min(1, "Keranjang masih kosong.")
    .max(100, "Terlalu banyak item dalam satu transaksi."),
});

async function nextTransactionNumber(companyId: string): Promise<string> {
  const prefix = `TRX-${todayKey().replaceAll("-", "")}`;
  const last = await prisma.sale.findFirst({
    where: { companyId, transactionNumber: { startsWith: prefix } },
    orderBy: { transactionNumber: "desc" },
    select: { transactionNumber: true },
  });

  let sequence = 1;
  if (last) {
    const parsed = Number.parseInt(last.transactionNumber.slice(prefix.length + 1), 10);
    if (Number.isFinite(parsed) && parsed >= 0) sequence = parsed + 1;
  }

  return `${prefix}-${String(sequence).padStart(4, "0")}`;
}

export async function checkoutAction(formData: FormData): Promise<CheckoutResult> {
  try {
    const user = await requireActionUser("pos.use");

    let rawItems: unknown;
    try {
      rawItems = JSON.parse(String(formData.get("items") ?? "[]"));
    } catch {
      return { ok: false, error: "Data keranjang tidak valid." };
    }

    const parsed = checkoutSchema.safeParse({
      paymentMethod: formData.get("paymentMethod"),
      clientRequestId: formData.get("clientRequestId"),
      items: rawItems,
    });

    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Data transaksi tidak valid.",
      };
    }

    const { paymentMethod, clientRequestId } = parsed.data;

    const existing = await prisma.sale.findFirst({
      where: { companyId: user.companyId, clientRequestId },
      select: {
        id: true,
        transactionNumber: true,
        totalAmount: true,
        paymentMethod: true,
        _count: { select: { items: true } },
      },
    });

    if (existing) {
      return {
        ok: true,
        saleId: existing.id,
        transactionNumber: existing.transactionNumber,
        totalAmount: Number(existing.totalAmount),
        paymentMethod: existing.paymentMethod,
        itemCount: existing._count.items,
        alreadyRecorded: true,
      };
    }

    const merged = new Map<string, number>();
    for (const item of parsed.data.items) {
      merged.set(item.productId, (merged.get(item.productId) ?? 0) + item.quantity);
    }

    const lines = [...merged.entries()].map(([productId, quantity]) => ({
      productId,
      quantity: new Prisma.Decimal(quantity),
    }));

    const products = await prisma.product.findMany({
      where: {
        companyId: user.companyId,
        isActive: true,
        id: { in: lines.map((line) => line.productId) },
      },
      select: {
        id: true,
        name: true,
        sku: true,
        unit: true,
        sellingPrice: true,
        purchasePrice: true,
        stockQuantity: true,
      },
    });

    const productMap = new Map(products.map((product) => [product.id, product]));

    for (const line of lines) {
      const product = productMap.get(line.productId);
      if (!product) {
        return {
          ok: false,
          error: "Salah satu produk tidak tersedia atau sudah dinonaktifkan.",
        };
      }
      if (product.stockQuantity.lt(line.quantity)) {
        return {
          ok: false,
          error: `Stok ${product.name} tidak mencukupi. Tersedia ${formatQuantity(product.stockQuantity, product.unit)}.`,
        };
      }
    }

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const transactionNumber = await nextTransactionNumber(user.companyId);

      try {
        const result = await prisma.$transaction(async (tx) => {
          const snapshots = [];

          for (const line of lines) {
            const product = productMap.get(line.productId);
            if (!product) {
              throw new ActionError("Produk tidak ditemukan.", "NOT_FOUND");
            }

            const updated = await tx.product.updateMany({
              where: {
                id: product.id,
                companyId: user.companyId,
                isActive: true,
                stockQuantity: { gte: line.quantity },
              },
              data: { stockQuantity: { decrement: line.quantity } },
            });

            if (updated.count === 0) {
              throw new ActionError(
                `Stok ${product.name} berubah atau tidak mencukupi. Muat ulang halaman dan coba lagi.`,
                "CONFLICT",
              );
            }

            const after = await tx.product.findUnique({
              where: { id: product.id },
              select: { stockQuantity: true },
            });
            const newQuantity = after?.stockQuantity ?? new Prisma.Decimal(0);

            snapshots.push({
              product,
              quantity: line.quantity,
              previousQuantity: newQuantity.add(line.quantity),
              newQuantity,
              subtotal: product.sellingPrice.mul(line.quantity),
            });
          }

          const totalAmount = snapshots.reduce(
            (sum, snapshot) => sum.add(snapshot.subtotal),
            new Prisma.Decimal(0),
          );

          const sale = await tx.sale.create({
            data: {
              companyId: user.companyId,
              transactionNumber,
              cashierId: user.id,
              paymentMethod,
              status: "COMPLETED",
              totalAmount,
              clientRequestId,
              items: {
                create: snapshots.map((snapshot) => ({
                  productId: snapshot.product.id,
                  productNameSnapshot: snapshot.product.name,
                  skuSnapshot: snapshot.product.sku,
                  unitSnapshot: snapshot.product.unit,
                  quantity: snapshot.quantity,
                  sellingPriceSnapshot: snapshot.product.sellingPrice,
                  purchaseCostSnapshot: snapshot.product.purchasePrice,
                  subtotal: snapshot.subtotal,
                })),
              },
            },
            select: { id: true, transactionNumber: true },
          });

          for (const snapshot of snapshots) {
            await tx.stockMovement.create({
              data: {
                companyId: user.companyId,
                productId: snapshot.product.id,
                movementType: "SALE",
                quantityDelta: snapshot.quantity.neg(),
                previousQuantity: snapshot.previousQuantity,
                newQuantity: snapshot.newQuantity,
                reason: `Penjualan ${sale.transactionNumber}`,
                referenceType: "SALE",
                referenceId: sale.id,
                createdById: user.id,
              },
            });
          }

          return {
            saleId: sale.id,
            transactionNumber: sale.transactionNumber,
            totalAmount,
            itemCount: snapshots.length,
          };
        });

        revalidatePath("/pos");
        revalidatePath("/sales");
        revalidatePath("/dashboard");
        revalidatePath("/inventory");

        return {
          ok: true,
          saleId: result.saleId,
          transactionNumber: result.transactionNumber,
          totalAmount: Number(result.totalAmount),
          paymentMethod,
          itemCount: result.itemCount,
        };
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          const duplicate = await prisma.sale.findFirst({
            where: { companyId: user.companyId, clientRequestId },
            select: {
              id: true,
              transactionNumber: true,
              totalAmount: true,
              paymentMethod: true,
              _count: { select: { items: true } },
            },
          });
          if (duplicate) {
            return {
              ok: true,
              saleId: duplicate.id,
              transactionNumber: duplicate.transactionNumber,
              totalAmount: Number(duplicate.totalAmount),
              paymentMethod: duplicate.paymentMethod,
              itemCount: duplicate._count.items,
              alreadyRecorded: true,
            };
          }
          continue;
        }
        throw error;
      }
    }

    throw new ActionError(
      "Gagal membuat nomor transaksi. Silakan coba lagi.",
      "CONFLICT",
    );
  } catch (error) {
    if (error instanceof ActionError) {
      return { ok: false, error: error.message };
    }
    console.error("[checkout action]", error);
    return {
      ok: false,
      error: "Transaksi gagal diproses. Silakan coba lagi.",
    };
  }
}

const voidSchema = z.object({
  saleId: z.string().uuid("Transaksi tidak valid."),
  reason: z
    .string()
    .trim()
    .min(5, "Alasan pembatalan minimal 5 karakter.")
    .max(300, "Alasan maksimal 300 karakter."),
});

export async function voidSaleAction(
  _previousState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await requireActionUser("sales.void");
    const parsed = voidSchema.safeParse({
      saleId: formData.get("saleId"),
      reason: formData.get("reason"),
    });

    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Data tidak valid.",
        code: "VALIDATION",
      };
    }

    const sale = await prisma.sale.findFirst({
      where: { id: parsed.data.saleId, companyId: user.companyId },
      select: {
        id: true,
        transactionNumber: true,
        status: true,
        items: {
          select: { productId: true, quantity: true },
        },
      },
    });

    if (!sale) {
      throw new ActionError("Transaksi tidak ditemukan.", "NOT_FOUND");
    }

    if (sale.status === "VOIDED") {
      throw new ActionError("Transaksi ini sudah dibatalkan.", "CONFLICT");
    }

    await prisma.$transaction(async (tx) => {
      const updated = await tx.sale.updateMany({
        where: {
          id: sale.id,
          companyId: user.companyId,
          status: "COMPLETED",
        },
        data: {
          status: "VOIDED",
          voidedAt: new Date(),
          voidedById: user.id,
          voidReason: parsed.data.reason,
        },
      });

      if (updated.count === 0) {
        throw new ActionError(
          "Transaksi sudah dibatalkan oleh pengguna lain.",
          "CONFLICT",
        );
      }

      for (const item of sale.items) {
        const product = await tx.product.update({
          where: { id: item.productId },
          data: { stockQuantity: { increment: item.quantity } },
          select: { stockQuantity: true },
        });
        const previous = product.stockQuantity.sub(item.quantity);

        await tx.stockMovement.create({
          data: {
            companyId: user.companyId,
            productId: item.productId,
            movementType: "SALE_VOID",
            quantityDelta: item.quantity,
            previousQuantity: previous,
            newQuantity: product.stockQuantity,
            reason: `Pembatalan ${sale.transactionNumber}: ${parsed.data.reason}`,
            referenceType: "SALE_VOID",
            referenceId: sale.id,
            createdById: user.id,
          },
        });
      }
    });

    revalidatePath("/sales");
    revalidatePath(`/sales/${sale.id}`);
    revalidatePath("/dashboard");
    revalidatePath("/inventory");
    revalidatePath("/reports/financial");

    return {
      ok: true,
      id: sale.id,
      message: `Transaksi ${sale.transactionNumber} dibatalkan dan stok dikembalikan.`,
    };
  } catch (error) {
    if (error instanceof ActionError) {
      return { ok: false, error: error.message, code: error.code };
    }
    console.error("[void sale action]", error);
    return {
      ok: false,
      error: "Gagal membatalkan transaksi. Silakan coba lagi.",
    };
  }
}
