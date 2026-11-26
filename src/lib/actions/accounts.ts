"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireActionUser } from "@/lib/auth-guards";
import { ActionError, type ActionResult } from "@/lib/errors";
import type { AccountType } from "@/generated/prisma/enums";
import { planCoaTemplate } from "@/lib/accounts-template";

const ACCOUNT_TYPES = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"] as const;

const accountTypeSchema = z.enum(ACCOUNT_TYPES);

const optionalParentId = z.preprocess(
  (value) =>
    value === null ||
    (typeof value === "string" && (value.trim() === "" || value === "none"))
      ? undefined
      : value,
  z.string().uuid("Akun induk tidak valid.").optional(),
);

const accountSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Kode akun wajib diisi.")
    .max(20, "Kode akun maksimal 20 karakter.")
    .regex(/^[A-Za-z0-9.\-_]+$/, "Kode akun hanya boleh berisi huruf, angka, titik, garis, dan garis bawah."),
  name: z
    .string()
    .trim()
    .min(2, "Nama akun minimal 2 karakter.")
    .max(120, "Nama akun maksimal 120 karakter."),
  type: accountTypeSchema,
  parentId: optionalParentId,
  isPostable: z.preprocess(
    (value) => value === "on" || value === "true" || value === true,
    z.boolean(),
  ),
});

const updateAccountSchema = accountSchema.extend({
  accountId: z.string().uuid("Akun tidak valid."),
});

const accountIdSchema = z.string().uuid("Akun tidak valid.");

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

function revalidateAccounts(accountId?: string) {
  revalidatePath("/accounts");
  if (accountId) revalidatePath(`/accounts/${accountId}`);
}

/**
 * Verifies that `parentId` is a valid parent for an account of `type` inside
 * `companyId`: it must exist in the same company, share the account type, and
 * must not be a postable (leaf) account. Returns the parent row.
 */
async function assertValidParent(
  companyId: string,
  parentId: string,
  type: AccountType,
) {
  const parent = await prisma.account.findFirst({
    where: { id: parentId, companyId },
    select: { id: true, code: true, name: true, type: true, isPostable: true },
  });
  if (!parent) {
    throw new ActionError("Akun induk tidak ditemukan.", "NOT_FOUND");
  }
  if (parent.type !== type) {
    throw new ActionError(
      `Akun induk "${parent.code} - ${parent.name}" memiliki jenis ${parent.type} dan tidak kompatibel dengan jenis akun ${type}.`,
      "BUSINESS",
    );
  }
  if (parent.isPostable) {
    throw new ActionError(
      `Akun induk "${parent.code} - ${parent.name}" masih ditandai sebagai akun posting. Nonaktifkan flag posting pada akun induk terlebih dahulu.`,
      "BUSINESS",
    );
  }
  return parent;
}

/**
 * Walks up the ancestor chain of `startId`; returns true when `ancestorId`
 * appears, meaning `ancestorId` cannot become a descendant of `startId`.
 */
async function isAncestor(
  companyId: string,
  ancestorId: string,
  startId: string,
): Promise<boolean> {
  const accounts = await prisma.account.findMany({
    where: { companyId },
    select: { id: true, parentId: true },
  });
  const parentOf = new Map(accounts.map((a) => [a.id, a.parentId]));

  let current: string | null | undefined = startId;
  const seen = new Set<string>();
  while (current) {
    if (current === ancestorId) return true;
    if (seen.has(current)) return false;
    seen.add(current);
    current = parentOf.get(current) ?? null;
  }
  return false;
}

async function assertNoDuplicateCode(
  companyId: string,
  code: string,
  excludeId?: string,
) {
  const duplicate = await prisma.account.findFirst({
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
      error: `Kode akun "${code}" sudah digunakan.`,
      code: "CONFLICT" as const,
      fieldErrors: { code: ["Kode akun sudah digunakan."] },
    };
  }
  return null;
}

export async function createAccountAction(
  _previousState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await requireActionUser("accounts.manage");
    const parsed = accountSchema.safeParse({
      code: formData.get("code"),
      name: formData.get("name"),
      type: formData.get("type"),
      parentId: formData.get("parentId"),
      isPostable: formData.get("isPostable"),
    });
    if (!parsed.success) return validationError(parsed.error);

    const data = parsed.data;

    const conflict = await assertNoDuplicateCode(user.companyId, data.code);
    if (conflict) return conflict;

    if (data.parentId) {
      await assertValidParent(user.companyId, data.parentId, data.type);
    }

    const account = await prisma.account.create({
      data: {
        companyId: user.companyId,
        code: data.code,
        name: data.name,
        type: data.type,
        parentId: data.parentId ?? null,
        isPostable: data.isPostable,
        isActive: true,
      },
      select: { id: true, code: true, name: true },
    });

    revalidateAccounts(account.id);
    return {
      ok: true,
      id: account.id,
      message: `Akun "${account.code} - ${account.name}" berhasil ditambahkan.`,
    };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function updateAccountAction(
  _previousState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await requireActionUser("accounts.manage");
    const parsed = updateAccountSchema.safeParse({
      accountId: formData.get("accountId"),
      code: formData.get("code"),
      name: formData.get("name"),
      type: formData.get("type"),
      parentId: formData.get("parentId"),
      isPostable: formData.get("isPostable"),
    });
    if (!parsed.success) return validationError(parsed.error);

    const data = parsed.data;

    const existing = await prisma.account.findFirst({
      where: { id: data.accountId, companyId: user.companyId },
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        parentId: true,
        isPostable: true,
        _count: { select: { children: true } },
      },
    });
    if (!existing) {
      throw new ActionError("Akun tidak ditemukan.", "NOT_FOUND");
    }

    const conflict = await assertNoDuplicateCode(
      user.companyId,
      data.code,
      existing.id,
    );
    if (conflict) return conflict;

    const hasChildren = existing._count.children > 0;

    if (data.type !== existing.type && hasChildren) {
      throw new ActionError(
        "Jenis akun tidak dapat diubah karena akun ini memiliki akun anak.",
        "BUSINESS",
      );
    }

    if (data.isPostable && hasChildren) {
      throw new ActionError(
        "Akun yang memiliki akun anak tidak dapat ditandai sebagai akun posting.",
        "BUSINESS",
      );
    }

    if (data.parentId === existing.id) {
      throw new ActionError(
        "Akun tidak dapat menjadi induk dirinya sendiri.",
        "BUSINESS",
      );
    }

    if (data.parentId) {
      await assertValidParent(user.companyId, data.parentId, data.type);
      if (await isAncestor(user.companyId, existing.id, data.parentId)) {
        throw new ActionError(
          "Perubahan induk akan membentuk hierarki melingkar.",
          "BUSINESS",
        );
      }
    }

    await prisma.account.update({
      where: { id: existing.id },
      data: {
        code: data.code,
        name: data.name,
        type: data.type,
        parentId: data.parentId ?? null,
        isPostable: data.isPostable,
      },
    });

    revalidateAccounts(existing.id);
    return { ok: true, id: existing.id, message: "Perubahan akun disimpan." };
  } catch (error) {
    return handleActionError(error);
  }
}

async function setAccountActive(
  accountId: string,
  isActive: boolean,
): Promise<ActionResult> {
  const user = await requireActionUser("accounts.manage");

  const parsedId = accountIdSchema.safeParse(accountId);
  if (!parsedId.success) return validationError(parsedId.error);

  const account = await prisma.account.findFirst({
    where: { id: parsedId.data, companyId: user.companyId },
    select: {
      id: true,
      code: true,
      name: true,
      isActive: true,
      _count: { select: { children: true } },
    },
  });
  if (!account) {
    throw new ActionError("Akun tidak ditemukan.", "NOT_FOUND");
  }

  if (!isActive && account._count.children > 0) {
    throw new ActionError(
      `Akun "${account.code} - ${account.name}" masih memiliki ${account._count.children} akun anak. Nonaktifkan akun anak terlebih dahulu.`,
      "BUSINESS",
    );
  }

  if (account.isActive === isActive) {
    return {
      ok: true,
      id: account.id,
      message: isActive
        ? `Akun "${account.code}" sudah aktif.`
        : `Akun "${account.code}" sudah nonaktif.`,
    };
  }

  await prisma.account.update({
    where: { id: account.id },
    data: { isActive },
  });

  revalidateAccounts(account.id);
  return {
    ok: true,
    id: account.id,
    message: isActive
      ? `Akun "${account.code} - ${account.name}" diaktifkan.`
      : `Akun "${account.code} - ${account.name}" dinonaktifkan.`,
  };
}

export async function activateAccountAction(
  _previousState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const accountId = formData.get("accountId");
    if (typeof accountId !== "string") {
      throw new ActionError("Akun tidak valid.", "VALIDATION");
    }
    return await setAccountActive(accountId, true);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function deactivateAccountAction(
  _previousState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const accountId = formData.get("accountId");
    if (typeof accountId !== "string") {
      throw new ActionError("Akun tidak valid.", "VALIDATION");
    }
    return await setAccountActive(accountId, false);
  } catch (error) {
    return handleActionError(error);
  }
}

/**
 * Provisions the built-in Indonesian MSME COA template for the session
 * company. Idempotent: accounts whose code already exists are never
 * overwritten, and the whole run happens inside one transaction.
 */
export async function applyCoaTemplateAction(): Promise<ActionResult> {
  try {
    const user = await requireActionUser("accounts.manage");

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.account.findMany({
        where: { companyId: user.companyId },
        select: { id: true, code: true, type: true },
      });
      const plan = planCoaTemplate(existing);

      const idByCode = new Map(existing.map((a) => [a.code, a.id]));
      let created = 0;
      let exists = 0;
      let skipped = 0;

      for (const item of plan) {
        if (item.status === "exists") {
          exists += 1;
          continue;
        }
        if (item.status !== "create") {
          skipped += 1;
          continue;
        }

        const parentId = item.parentCode
          ? (idByCode.get(item.parentCode) ?? null)
          : null;
        if (item.parentCode && !parentId) {
          skipped += 1;
          continue;
        }

        const createdAccount = await tx.account.create({
          data: {
            companyId: user.companyId,
            code: item.code,
            name: item.name,
            type: item.type,
            parentId,
            isPostable: item.postable,
            isActive: true,
          },
          select: { id: true, code: true },
        });
        idByCode.set(item.code, createdAccount.id);
        created += 1;
      }

      return { created, exists, skipped };
    });

    revalidatePath("/accounts");
    return {
      ok: true,
      message:
        `Template COA MSME diterapkan: ${result.created} akun baru dibuat, ` +
        `${result.exists} akun sudah ada, ${result.skipped} dilewati.`,
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
  console.error("[accounts action]", error);
  return {
    ok: false,
    error: "Terjadi kesalahan pada server. Silakan coba lagi.",
    code: "BUSINESS",
  };
}
