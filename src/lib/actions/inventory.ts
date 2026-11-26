"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireActionUser } from "@/lib/auth-guards";
import { ActionError, type ActionResult } from "@/lib/errors";
import { formatQuantity } from "@/lib/format";
import { applyStockDelta } from "@/lib/stock";

const money = z.coerce
  .number()
  .min(0, "Nilai tidak boleh negatif.")
  .max(1_000_000_000_000, "Nilai terlalu besar.");

const quantity = z.coerce
  .number()
  .min(0, "Jumlah tidak boleh negatif.")
  .max(1_000_000_000, "Jumlah terlalu besar.");

const optionalId = z.preprocess(
  (value) =>
    typeof value === "string" && (value.trim() === "" || value === "none")
      ? undefined
      : value,
  z.string().uuid("Kategori tidak valid.").optional(),
);

const optionalText = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().max(500, "Maksimal 500 karakter.").optional(),
);

const productSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nama produk minimal 2 karakter.")
    .max(120, "Nama produk maksimal 120 karakter."),
  sku: z
    .string()
    .trim()
    .min(2, "SKU minimal 2 karakter.")
    .max(40, "SKU maksimal 40 karakter.")
    .regex(/^[A-Za-z0-9._-]+$/, "SKU hanya boleh berisi huruf, angka, titik, garis, dan garis bawah.")
    .transform((value) => value.toUpperCase()),
  categoryId: optionalId,
  unit: z.string().trim().min(1, "Satuan wajib diisi.").max(20),
  purchasePrice: money,
  sellingPrice: money,
  minimumStock: quantity,
  stockQuantity: quantity,
  isActive: z.preprocess(
    (value) => value === "on" || value === "true" || value === true,
    z.boolean(),
  ),
});

const updateProductSchema = productSchema.omit({ stockQuantity: true }).extend({
  productId: z.string().uuid("Produk tidak valid."),
});

const adjustSchema = z
  .object({
    productId: z.string().uuid("Produk tidak valid."),
    warehouseId: z.preprocess(
      (value) =>
        value === null ||
        (typeof value === "string" && (value.trim() === "" || value === "none"))
          ? undefined
          : value,
      z.string().uuid("Gudang tidak valid.").optional(),
    ),
    movementType: z.enum(["STOCK_IN", "STOCK_OUT", "ADJUSTMENT"]),
    quantity: quantity,
    reason: z
      .string()
      .trim()
      .min(3, "Alasan minimal 3 karakter.")
      .max(200, "Alasan maksimal 200 karakter."),
  })
  .refine(
    (value) => value.movementType === "ADJUSTMENT" || value.quantity > 0,
    { message: "Jumlah harus lebih dari 0.", path: ["quantity"] },
  );

const categorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nama kategori minimal 2 karakter.")
    .max(80, "Nama kategori maksimal 80 karakter."),
  description: optionalText,
  isActive: z.preprocess(
    (value) => value === "on" || value === "true" || value === true,
    z.boolean(),
  ),
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

async function assertCategory(companyId: string, categoryId: string) {
  const category = await prisma.category.findFirst({
    where: { id: categoryId, companyId },
    select: { id: true },
  });
  if (!category) {
    throw new ActionError("Kategori tidak ditemukan.", "NOT_FOUND");
  }
}

function revalidateInventory(productId?: string) {
  revalidatePath("/inventory");
  revalidatePath("/inventory/categories");
  revalidatePath("/dashboard");
  if (productId) revalidatePath(`/inventory/${productId}`);
}

export async function createProductAction(
  _previousState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await requireActionUser("inventory.manage");
    const parsed = productSchema.safeParse({
      name: formData.get("name"),
      sku: formData.get("sku"),
      categoryId: formData.get("categoryId"),
      unit: formData.get("unit"),
      purchasePrice: formData.get("purchasePrice"),
      sellingPrice: formData.get("sellingPrice"),
      minimumStock: formData.get("minimumStock"),
      stockQuantity: formData.get("stockQuantity"),
      isActive: formData.get("isActive"),
    });

    if (!parsed.success) return validationError(parsed.error);

    const data = parsed.data;
    if (data.categoryId) await assertCategory(user.companyId, data.categoryId);

    const duplicate = await prisma.product.findFirst({
      where: { companyId: user.companyId, sku: data.sku },
      select: { id: true },
    });
    if (duplicate) {
      return {
        ok: false,
        error: `SKU "${data.sku}" sudah digunakan produk lain.`,
        code: "CONFLICT",
        fieldErrors: { sku: ["SKU sudah digunakan."] },
      };
    }

    const product = await prisma.$transaction(async (tx) => {
      const warehouse = await tx.warehouse.findFirst({
        where: { companyId: user.companyId, isDefault: true, isActive: true },
        select: { id: true },
      });
      if (!warehouse) {
        throw new ActionError(
          "Belum ada gudang default aktif untuk menampung stok awal produk.",
          "CONFLICT",
        );
      }

      const created = await tx.product.create({
        data: {
          companyId: user.companyId,
          name: data.name,
          sku: data.sku,
          categoryId: data.categoryId ?? null,
          unit: data.unit,
          purchasePrice: new Prisma.Decimal(data.purchasePrice),
          sellingPrice: new Prisma.Decimal(data.sellingPrice),
          stockQuantity: new Prisma.Decimal(data.stockQuantity),
          minimumStock: new Prisma.Decimal(data.minimumStock),
          isActive: data.isActive,
        },
        select: { id: true, name: true },
      });

      await tx.productStock.create({
        data: {
          companyId: user.companyId,
          productId: created.id,
          warehouseId: warehouse.id,
          quantity: new Prisma.Decimal(data.stockQuantity),
        },
      });

      if (data.stockQuantity > 0) {
        await tx.stockMovement.create({
          data: {
            companyId: user.companyId,
            productId: created.id,
            movementType: "STOCK_IN",
            quantityDelta: new Prisma.Decimal(data.stockQuantity),
            previousQuantity: new Prisma.Decimal(0),
            newQuantity: new Prisma.Decimal(data.stockQuantity),
            reason: "Stok awal produk",
            referenceType: "PRODUCT_CREATE",
            referenceId: created.id,
            warehouseId: warehouse.id,
            createdById: user.id,
          },
        });
      }

      return created;
    });

    revalidateInventory(product.id);
    return {
      ok: true,
      id: product.id,
      message: `Produk "${product.name}" berhasil ditambahkan.`,
    };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function updateProductAction(
  _previousState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await requireActionUser("inventory.manage");
    const parsed = updateProductSchema.safeParse({
      productId: formData.get("productId"),
      name: formData.get("name"),
      sku: formData.get("sku"),
      categoryId: formData.get("categoryId"),
      unit: formData.get("unit"),
      purchasePrice: formData.get("purchasePrice"),
      sellingPrice: formData.get("sellingPrice"),
      minimumStock: formData.get("minimumStock"),
      isActive: formData.get("isActive"),
    });

    if (!parsed.success) return validationError(parsed.error);

    const data = parsed.data;
    const existing = await prisma.product.findFirst({
      where: { id: data.productId, companyId: user.companyId },
      select: { id: true, name: true },
    });
    if (!existing) {
      throw new ActionError("Produk tidak ditemukan.", "NOT_FOUND");
    }

    if (data.categoryId) await assertCategory(user.companyId, data.categoryId);

    const duplicate = await prisma.product.findFirst({
      where: {
        companyId: user.companyId,
        sku: data.sku,
        NOT: { id: data.productId },
      },
      select: { id: true },
    });
    if (duplicate) {
      return {
        ok: false,
        error: `SKU "${data.sku}" sudah digunakan produk lain.`,
        code: "CONFLICT",
        fieldErrors: { sku: ["SKU sudah digunakan."] },
      };
    }

    await prisma.product.update({
      where: { id: data.productId },
      data: {
        name: data.name,
        sku: data.sku,
        categoryId: data.categoryId ?? null,
        unit: data.unit,
        purchasePrice: new Prisma.Decimal(data.purchasePrice),
        sellingPrice: new Prisma.Decimal(data.sellingPrice),
        minimumStock: new Prisma.Decimal(data.minimumStock),
        isActive: data.isActive,
      },
    });

    revalidateInventory(data.productId);
    return { ok: true, id: data.productId, message: "Perubahan produk disimpan." };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function adjustStockAction(
  _previousState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await requireActionUser("inventory.manage");
    const parsed = adjustSchema.safeParse({
      productId: formData.get("productId"),
      warehouseId: formData.get("warehouseId"),
      movementType: formData.get("movementType"),
      quantity: formData.get("quantity"),
      reason: formData.get("reason"),
    });

    if (!parsed.success) return validationError(parsed.error);

    const data = parsed.data;
    const amount = new Prisma.Decimal(data.quantity);

    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({
        where: { id: data.productId, companyId: user.companyId },
        select: { id: true, name: true, unit: true },
      });
      if (!product) {
        throw new ActionError("Produk tidak ditemukan.", "NOT_FOUND");
      }

      const warehouse = await tx.warehouse.findFirst({
        where: data.warehouseId
          ? { id: data.warehouseId, companyId: user.companyId, isActive: true }
          : { companyId: user.companyId, isDefault: true, isActive: true },
        select: { id: true, name: true },
      });
      if (!warehouse) {
        throw new ActionError(
          data.warehouseId
            ? "Gudang tidak ditemukan atau sudah nonaktif."
            : "Belum ada gudang default aktif untuk mencatat penyesuaian stok.",
          "NOT_FOUND",
        );
      }

      const stock = await tx.productStock.findUnique({
        where: {
          companyId_productId_warehouseId: {
            companyId: user.companyId,
            productId: product.id,
            warehouseId: warehouse.id,
          },
        },
        select: { quantity: true },
      });
      const previous = stock?.quantity ?? new Prisma.Decimal(0);

      let next: Prisma.Decimal;
      if (data.movementType === "STOCK_IN") {
        next = previous.add(amount);
      } else if (data.movementType === "STOCK_OUT") {
        next = previous.sub(amount);
      } else {
        next = amount;
      }

      if (next.lt(0)) {
        throw new ActionError(
          `Stok tidak mencukupi. Stok ${warehouse.name} saat ini ${formatQuantity(previous, product.unit)}.`,
          "BUSINESS",
        );
      }

      if (data.movementType === "ADJUSTMENT" && next.eq(previous)) {
        throw new ActionError(
          "Jumlah stok baru sama dengan stok saat ini. Tidak ada perubahan yang dicatat.",
          "BUSINESS",
        );
      }

      const balance = await applyStockDelta(tx, {
        companyId: user.companyId,
        productId: product.id,
        warehouseId: warehouse.id,
        ...(data.movementType === "ADJUSTMENT"
          ? { setQuantity: amount }
          : {
              delta:
                data.movementType === "STOCK_IN" ? amount : amount.neg(),
            }),
      });

      await tx.stockMovement.create({
        data: {
          companyId: user.companyId,
          productId: product.id,
          movementType: data.movementType,
          quantityDelta: balance.newQuantity.sub(balance.previousQuantity),
          previousQuantity: balance.previousQuantity,
          newQuantity: balance.newQuantity,
          reason: data.reason,
          referenceType: "MANUAL",
          warehouseId: warehouse.id,
          createdById: user.id,
        },
      });

      return {
        name: product.name,
        newQuantity: balance.newQuantity,
        unit: product.unit,
      };
    });

    revalidateInventory(data.productId);
    return {
      ok: true,
      id: data.productId,
      message: `Stok ${result.name} diperbarui menjadi ${formatQuantity(result.newQuantity, result.unit)}.`,
    };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function createCategoryAction(
  _previousState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await requireActionUser("inventory.manage");
    const parsed = categorySchema.safeParse({
      name: formData.get("name"),
      description: formData.get("description"),
      isActive: formData.get("isActive") ?? "on",
    });
    if (!parsed.success) return validationError(parsed.error);

    const duplicate = await prisma.category.findFirst({
      where: { companyId: user.companyId, name: parsed.data.name },
      select: { id: true },
    });
    if (duplicate) {
      return {
        ok: false,
        error: "Nama kategori sudah digunakan.",
        code: "CONFLICT",
        fieldErrors: { name: ["Nama kategori sudah digunakan."] },
      };
    }

    const category = await prisma.category.create({
      data: {
        companyId: user.companyId,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        isActive: parsed.data.isActive,
      },
      select: { id: true, name: true },
    });

    revalidateInventory();
    return { ok: true, id: category.id, message: `Kategori "${category.name}" ditambahkan.` };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function updateCategoryAction(
  _previousState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await requireActionUser("inventory.manage");
    const categoryId = formData.get("categoryId");
    if (typeof categoryId !== "string" || !categoryId) {
      throw new ActionError("Kategori tidak valid.", "VALIDATION");
    }

    const parsed = categorySchema.safeParse({
      name: formData.get("name"),
      description: formData.get("description"),
      isActive: formData.get("isActive"),
    });
    if (!parsed.success) return validationError(parsed.error);

    const existing = await prisma.category.findFirst({
      where: { id: categoryId, companyId: user.companyId },
      select: { id: true },
    });
    if (!existing) throw new ActionError("Kategori tidak ditemukan.", "NOT_FOUND");

    const duplicate = await prisma.category.findFirst({
      where: {
        companyId: user.companyId,
        name: parsed.data.name,
        NOT: { id: categoryId },
      },
      select: { id: true },
    });
    if (duplicate) {
      return {
        ok: false,
        error: "Nama kategori sudah digunakan.",
        code: "CONFLICT",
        fieldErrors: { name: ["Nama kategori sudah digunakan."] },
      };
    }

    await prisma.category.update({
      where: { id: categoryId },
      data: {
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        isActive: parsed.data.isActive,
      },
    });

    revalidateInventory();
    return { ok: true, id: categoryId, message: "Kategori diperbarui." };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function deleteCategoryAction(
  _previousState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await requireActionUser("inventory.manage");
    const categoryId = formData.get("categoryId");
    if (typeof categoryId !== "string" || !categoryId) {
      throw new ActionError("Kategori tidak valid.", "VALIDATION");
    }

    const category = await prisma.category.findFirst({
      where: { id: categoryId, companyId: user.companyId },
      select: { id: true, name: true, _count: { select: { products: true } } },
    });
    if (!category) throw new ActionError("Kategori tidak ditemukan.", "NOT_FOUND");

    if (category._count.products > 0) {
      throw new ActionError(
        `Kategori "${category.name}" masih digunakan oleh ${category._count.products} produk. Pindahkan produk terlebih dahulu.`,
        "BUSINESS",
      );
    }

    await prisma.category.delete({ where: { id: categoryId } });

    revalidateInventory();
    return { ok: true, message: `Kategori "${category.name}" dihapus.` };
  } catch (error) {
    return handleActionError(error);
  }
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
  console.error("[inventory action]", error);
  return {
    ok: false,
    error: "Terjadi kesalahan pada server. Silakan coba lagi.",
    code: "BUSINESS",
  };
}
