"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireActionUser } from "@/lib/auth-guards";
import { ActionError, type ActionResult } from "@/lib/errors";

const optionalText = (max: number) =>
  z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().trim().max(max, `Maksimal ${max} karakter.`).optional(),
  );

const companySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nama perusahaan minimal 2 karakter.")
    .max(120, "Nama perusahaan maksimal 120 karakter."),
  businessType: optionalText(80),
  address: optionalText(300),
  contactEmail: z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().trim().email("Format email tidak valid.").max(160).optional(),
  ),
  phone: optionalText(40),
  fiscalYearStartMonth: z.coerce
    .number()
    .int("Bulan harus berupa angka.")
    .min(1, "Bulan tidak valid.")
    .max(12, "Bulan tidak valid."),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Kata sandi saat ini wajib diisi."),
    password: z
      .string()
      .min(8, "Kata sandi baru minimal 8 karakter.")
      .max(72, "Kata sandi maksimal 72 karakter."),
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

export async function updateCompanyAction(
  _previousState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await requireActionUser("settings.manage");
    const parsed = companySchema.safeParse({
      name: formData.get("name"),
      businessType: formData.get("businessType"),
      address: formData.get("address"),
      contactEmail: formData.get("contactEmail"),
      phone: formData.get("phone"),
      fiscalYearStartMonth: formData.get("fiscalYearStartMonth"),
    });

    if (!parsed.success) return validationError(parsed.error);

    await prisma.company.update({
      where: { id: user.companyId },
      data: {
        name: parsed.data.name,
        businessType: parsed.data.businessType ?? null,
        address: parsed.data.address ?? null,
        contactEmail: parsed.data.contactEmail ?? null,
        phone: parsed.data.phone ?? null,
        fiscalYearStartMonth: parsed.data.fiscalYearStartMonth,
      },
    });

    revalidatePath("/", "layout");
    revalidatePath("/settings");
    revalidatePath("/reports/financial");
    revalidatePath("/dashboard");

    return { ok: true, message: "Profil perusahaan berhasil diperbarui." };
  } catch (error) {
    if (error instanceof ActionError) {
      return { ok: false, error: error.message, code: error.code };
    }
    console.error("[settings action]", error);
    return {
      ok: false,
      error: "Gagal menyimpan pengaturan. Silakan coba lagi.",
    };
  }
}

export async function changeOwnPasswordAction(
  _previousState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new ActionError(
        "Sesi Anda telah berakhir. Silakan masuk kembali.",
        "UNAUTHENTICATED",
      );
    }

    const parsed = passwordSchema.safeParse({
      currentPassword: formData.get("currentPassword"),
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
    });

    if (!parsed.success) return validationError(parsed.error);

    const account = await prisma.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true },
    });
    if (!account) throw new ActionError("Akun tidak ditemukan.", "NOT_FOUND");

    const valid = await bcrypt.compare(
      parsed.data.currentPassword,
      account.passwordHash,
    );
    if (!valid) {
      return {
        ok: false,
        error: "Kata sandi saat ini tidak sesuai.",
        code: "VALIDATION",
        fieldErrors: { currentPassword: ["Kata sandi saat ini tidak sesuai."] },
      };
    }

    if (parsed.data.currentPassword === parsed.data.password) {
      return {
        ok: false,
        error: "Kata sandi baru harus berbeda dari kata sandi saat ini.",
        code: "VALIDATION",
        fieldErrors: { password: ["Gunakan kata sandi yang berbeda."] },
      };
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    return { ok: true, message: "Kata sandi berhasil diubah." };
  } catch (error) {
    if (error instanceof ActionError) {
      return { ok: false, error: error.message, code: error.code };
    }
    console.error("[password action]", error);
    return {
      ok: false,
      error: "Gagal mengubah kata sandi. Silakan coba lagi.",
    };
  }
}
