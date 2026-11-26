"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireActionUser } from "@/lib/auth-guards";
import { ActionError, type ActionResult } from "@/lib/errors";

const warehouseSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Kode gudang wajib diisi.")
    .max(20, "Kode gudang maksimal 20 karakter.")
    .regex(/^[A-Za-z0-9.\-_]+$/, "Kode gudang hanya boleh berisi huruf, angka, titik, garis, dan garis bawah."),
  name: z
    .string()
    .trim()
    .min(2, "Nama gudang minimal 2 karakter.")
    .max(120, "Nama gudang maksimal 120 karakter."),
  address: z.preprocess(
    (value) => (value === null || value === "" ? undefined : value),
    z
      .string()
      .trim()
      .max(300, "Alamat maksimal 300 karakter.")
      .optional(),
  ),
});

const updateWarehouseSchema = warehouseSchema.extend({
  warehouseId: z.string().uuid("Gudang tidak valid."),
});

const warehouseIdSchema = z.string().uuid("Gudang tidak valid.");

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

function revalidateWarehouses() {
  revalidatePath("/warehouses");
}

async function assertNoDuplicateCode(
  companyId: string,
  code: string,
  excludeId?: string,
) {
  const duplicate = await prisma.warehouse.findFirst({
    where: {
      companyId,
      code,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: { id: true },
  });
  if (duplicate) {
    return {
      ok: false as const,
      error: `Kode gudang "${code}" sudah digunakan.`,
      code: "CONFLICT" as const,
      fieldErrors: { code: ["Kode gudang sudah digunakan."] },
    };
  }
  return null;
}

export async function createWarehouseAction(
  _previousState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await requireActionUser("warehouses.manage");
    const parsed = warehouseSchema.safeParse({
      code: formData.get("code"),
      name: formData.get("name"),
      address: formData.get("address"),
    });
    if (!parsed.success) return validationError(parsed.error);

    const data = parsed.data;

    const conflict = await assertNoDuplicateCode(user.companyId, data.code);
    if (conflict) return conflict;

    const warehouse = await prisma.warehouse.create({
      data: {
        companyId: user.companyId,
        code: data.code,
        name: data.name,
        address: data.address || null,
        isActive: true,
        isDefault: false,
      },
      select: { id: true, code: true, name: true },
    });

    revalidateWarehouses();
    return {
      ok: true,
      id: warehouse.id,
      message: `Gudang "${warehouse.code} - ${warehouse.name}" berhasil ditambahkan.`,
    };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function updateWarehouseAction(
  _previousState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await requireActionUser("warehouses.manage");
    const parsed = updateWarehouseSchema.safeParse({
      warehouseId: formData.get("warehouseId"),
      code: formData.get("code"),
      name: formData.get("name"),
      address: formData.get("address"),
    });
    if (!parsed.success) return validationError(parsed.error);

    const data = parsed.data;

    const existing = await prisma.warehouse.findFirst({
      where: { id: data.warehouseId, companyId: user.companyId },
      select: { id: true },
    });
    if (!existing) {
      throw new ActionError("Gudang tidak ditemukan.", "NOT_FOUND");
    }

    const conflict = await assertNoDuplicateCode(
      user.companyId,
      data.code,
      data.warehouseId,
    );
    if (conflict) return conflict;

    const warehouse = await prisma.warehouse.update({
      where: { id: data.warehouseId },
      data: {
        code: data.code,
        name: data.name,
        address: data.address || null,
      },
      select: { id: true, code: true, name: true },
    });

    revalidateWarehouses();
    return {
      ok: true,
      id: warehouse.id,
      message: `Gudang "${warehouse.code} - ${warehouse.name}" berhasil diperbarui.`,
    };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function activateWarehouseAction(
  _previousState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await requireActionUser("warehouses.manage");
    const parsed = warehouseIdSchema.safeParse(formData.get("warehouseId"));
    if (!parsed.success) return validationError(parsed.error);

    const warehouse = await prisma.warehouse.findFirst({
      where: { id: parsed.data, companyId: user.companyId },
      select: { id: true, code: true, name: true, isActive: true },
    });
    if (!warehouse) {
      throw new ActionError("Gudang tidak ditemukan.", "NOT_FOUND");
    }
    if (warehouse.isActive) {
      throw new ActionError("Gudang sudah aktif.", "CONFLICT");
    }

    await prisma.warehouse.update({
      where: { id: warehouse.id },
      data: { isActive: true },
    });

    revalidateWarehouses();
    return {
      ok: true,
      id: warehouse.id,
      message: `Gudang "${warehouse.code} - ${warehouse.name}" diaktifkan kembali.`,
    };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function deactivateWarehouseAction(
  _previousState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await requireActionUser("warehouses.manage");
    const parsed = warehouseIdSchema.safeParse(formData.get("warehouseId"));
    if (!parsed.success) return validationError(parsed.error);

    const warehouse = await prisma.warehouse.findFirst({
      where: { id: parsed.data, companyId: user.companyId },
      select: { id: true, code: true, name: true, isActive: true, isDefault: true },
    });
    if (!warehouse) {
      throw new ActionError("Gudang tidak ditemukan.", "NOT_FOUND");
    }
    if (!warehouse.isActive) {
      throw new ActionError("Gudang sudah nonaktif.", "CONFLICT");
    }
    if (warehouse.isDefault) {
      throw new ActionError(
        "Gudang default tidak dapat dinonaktifkan. Tetapkan gudang lain sebagai default terlebih dahulu.",
        "CONFLICT",
      );
    }

    await prisma.warehouse.update({
      where: { id: warehouse.id },
      data: { isActive: false },
    });

    revalidateWarehouses();
    return {
      ok: true,
      id: warehouse.id,
      message: `Gudang "${warehouse.code} - ${warehouse.name}" dinonaktifkan.`,
    };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function setDefaultWarehouseAction(
  _previousState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await requireActionUser("warehouses.manage");
    const parsed = warehouseIdSchema.safeParse(formData.get("warehouseId"));
    if (!parsed.success) return validationError(parsed.error);

    const warehouse = await prisma.warehouse.findFirst({
      where: { id: parsed.data, companyId: user.companyId },
      select: { id: true, code: true, name: true, isActive: true, isDefault: true },
    });
    if (!warehouse) {
      throw new ActionError("Gudang tidak ditemukan.", "NOT_FOUND");
    }
    if (!warehouse.isActive) {
      throw new ActionError("Gudang nonaktif tidak dapat dijadikan default.", "CONFLICT");
    }
    if (warehouse.isDefault) {
      throw new ActionError("Gudang ini sudah menjadi default.", "CONFLICT");
    }

    await prisma.$transaction(async (tx) => {
      await tx.warehouse.updateMany({
        where: { companyId: user.companyId, isDefault: true },
        data: { isDefault: false },
      });
      await tx.warehouse.update({
        where: { id: warehouse.id },
        data: { isDefault: true },
      });
    });

    revalidateWarehouses();
    return {
      ok: true,
      id: warehouse.id,
      message: `Gudang "${warehouse.code} - ${warehouse.name}" ditetapkan sebagai gudang default.`,
    };
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
  console.error("[warehouses action]", error);
  return {
    ok: false,
    error: "Terjadi kesalahan pada server. Silakan coba lagi.",
    code: "BUSINESS",
  };
}
