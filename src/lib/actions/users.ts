"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireActionUser } from "@/lib/auth-guards";
import { ActionError, type ActionResult } from "@/lib/errors";
import { ROLES } from "@/lib/roles";

const roleEnum = z.enum(ROLES);

const nameField = z
  .string()
  .trim()
  .min(2, "Nama minimal 2 karakter.")
  .max(100, "Nama maksimal 100 karakter.");

const emailField = z
  .string()
  .trim()
  .email("Format email tidak valid.")
  .max(160, "Email terlalu panjang.")
  .transform((value) => value.toLowerCase());

const passwordField = z
  .string()
  .min(8, "Kata sandi minimal 8 karakter.")
  .max(72, "Kata sandi maksimal 72 karakter.");

const activeField = z.preprocess(
  (value) => value === "on" || value === "true" || value === true,
  z.boolean(),
);

const createSchema = z
  .object({
    fullName: nameField,
    email: emailField,
    role: z.enum(["MANAGER", "INVENTORY_STAFF", "CASHIER", "FINANCE"]),
    password: passwordField,
    confirmPassword: z.string(),
    isActive: activeField,
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Konfirmasi kata sandi tidak cocok.",
    path: ["confirmPassword"],
  });

const updateSchema = z.object({
  userId: z.string().uuid("Pengguna tidak valid."),
  fullName: nameField,
  email: emailField,
  role: roleEnum,
  isActive: activeField,
});

const resetSchema = z
  .object({
    userId: z.string().uuid("Pengguna tidak valid."),
    password: passwordField,
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Konfirmasi kata sandi tidak cocok.",
    path: ["confirmPassword"],
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

export async function createUserAction(
  _previousState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await requireActionUser("users.manage");
    const parsed = createSchema.safeParse({
      fullName: formData.get("fullName"),
      email: formData.get("email"),
      role: formData.get("role"),
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
      isActive: formData.get("isActive"),
    });

    if (!parsed.success) return validationError(parsed.error);

    const duplicate = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: { id: true },
    });
    if (duplicate) {
      return {
        ok: false,
        error: "Email sudah digunakan akun lain.",
        code: "CONFLICT",
        fieldErrors: { email: ["Email sudah digunakan."] },
      };
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);

    const created = await prisma.user.create({
      data: {
        companyId: user.companyId,
        fullName: parsed.data.fullName,
        email: parsed.data.email,
        role: parsed.data.role,
        passwordHash,
        isActive: parsed.data.isActive,
      },
      select: { id: true, fullName: true },
    });

    revalidatePath("/users");
    return {
      ok: true,
      id: created.id,
      message: `Pengguna "${created.fullName}" berhasil ditambahkan.`,
    };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function updateUserAction(
  _previousState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const actor = await requireActionUser("users.manage");
    const parsed = updateSchema.safeParse({
      userId: formData.get("userId"),
      fullName: formData.get("fullName"),
      email: formData.get("email"),
      role: formData.get("role"),
      isActive: formData.get("isActive"),
    });

    if (!parsed.success) return validationError(parsed.error);

    const target = await prisma.user.findFirst({
      where: { id: parsed.data.userId, companyId: actor.companyId },
      select: { id: true, role: true, isActive: true, fullName: true },
    });
    if (!target) throw new ActionError("Pengguna tidak ditemukan.", "NOT_FOUND");

    if (target.id === actor.id) {
      if (!parsed.data.isActive) {
        throw new ActionError(
          "Anda tidak dapat menonaktifkan akun sendiri.",
          "BUSINESS",
        );
      }
      if (parsed.data.role !== target.role) {
        throw new ActionError(
          "Anda tidak dapat mengubah peran akun sendiri.",
          "BUSINESS",
        );
      }
    }

    if (
      target.role === "OWNER" &&
      (parsed.data.role !== "OWNER" || !parsed.data.isActive)
    ) {
      const otherOwners = await prisma.user.count({
        where: {
          companyId: actor.companyId,
          role: "OWNER",
          isActive: true,
          NOT: { id: target.id },
        },
      });
      if (otherOwners === 0) {
        throw new ActionError(
          "Perusahaan harus memiliki setidaknya satu pemilik aktif.",
          "BUSINESS",
        );
      }
    }

    const duplicate = await prisma.user.findFirst({
      where: {
        email: parsed.data.email,
        NOT: { id: target.id },
      },
      select: { id: true },
    });
    if (duplicate) {
      return {
        ok: false,
        error: "Email sudah digunakan akun lain.",
        code: "CONFLICT",
        fieldErrors: { email: ["Email sudah digunakan."] },
      };
    }

    await prisma.user.update({
      where: { id: target.id },
      data: {
        fullName: parsed.data.fullName,
        email: parsed.data.email,
        role: parsed.data.role,
        isActive: parsed.data.isActive,
      },
    });

    revalidatePath("/users");
    revalidatePath("/", "layout");
    return {
      ok: true,
      id: target.id,
      message: `Data "${parsed.data.fullName}" diperbarui.`,
    };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function resetUserPasswordAction(
  _previousState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const actor = await requireActionUser("users.manage");
    const parsed = resetSchema.safeParse({
      userId: formData.get("userId"),
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
    });

    if (!parsed.success) return validationError(parsed.error);

    const target = await prisma.user.findFirst({
      where: { id: parsed.data.userId, companyId: actor.companyId },
      select: { id: true, fullName: true },
    });
    if (!target) throw new ActionError("Pengguna tidak ditemukan.", "NOT_FOUND");

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    await prisma.user.update({
      where: { id: target.id },
      data: { passwordHash },
    });

    revalidatePath("/users");
    return {
      ok: true,
      id: target.id,
      message: `Kata sandi "${target.fullName}" berhasil direset.`,
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
        error: "Email sudah digunakan akun lain.",
        code: "CONFLICT",
      };
    }
    if (error.code === "P2025") {
      return { ok: false, error: "Pengguna tidak ditemukan.", code: "NOT_FOUND" };
    }
  }
  console.error("[user action]", error);
  return {
    ok: false,
    error: "Terjadi kesalahan pada server. Silakan coba lagi.",
  };
}
