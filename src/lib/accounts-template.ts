import type { AccountType } from "@/generated/prisma/enums";

/**
 * Standard Indonesian MSME starter Chart of Accounts.
 *
 * Entries are ordered parent-first so provisioning can resolve `parentCode`
 * sequentially. Group accounts are non-postable; leaf accounts are postable.
 * This is a configurable starter template — it is not a guarantee of SAK EMKM
 * compliance by itself.
 */
export interface CoaTemplateEntry {
  code: string;
  name: string;
  type: AccountType;
  parentCode: string | null;
  postable: boolean;
}

export const MSME_COA_TEMPLATE: readonly CoaTemplateEntry[] = [
  // 1 — Aset
  { code: "1", name: "Aset", type: "ASSET", parentCode: null, postable: false },
  { code: "1.1", name: "Aset Lancar", type: "ASSET", parentCode: "1", postable: false },
  { code: "1.1.01", name: "Kas", type: "ASSET", parentCode: "1.1", postable: true },
  { code: "1.1.02", name: "Bank", type: "ASSET", parentCode: "1.1", postable: true },
  { code: "1.1.03", name: "Piutang Usaha", type: "ASSET", parentCode: "1.1", postable: true },
  { code: "1.1.04", name: "Persediaan Barang", type: "ASSET", parentCode: "1.1", postable: true },
  { code: "1.2", name: "Aset Tetap", type: "ASSET", parentCode: "1", postable: false },
  { code: "1.2.01", name: "Peralatan Kantor", type: "ASSET", parentCode: "1.2", postable: true },
  { code: "1.2.02", name: "Kendaraan", type: "ASSET", parentCode: "1.2", postable: true },
  { code: "1.2.03", name: "Akumulasi Penyusutan", type: "ASSET", parentCode: "1.2", postable: true },

  // 2 — Utang
  { code: "2", name: "Utang", type: "LIABILITY", parentCode: null, postable: false },
  { code: "2.1", name: "Utang Lancar", type: "LIABILITY", parentCode: "2", postable: false },
  { code: "2.1.01", name: "Utang Usaha", type: "LIABILITY", parentCode: "2.1", postable: true },
  { code: "2.1.02", name: "Utang Pajak", type: "LIABILITY", parentCode: "2.1", postable: true },
  { code: "2.2", name: "Utang Jangka Panjang", type: "LIABILITY", parentCode: "2", postable: true },

  // 3 — Modal
  { code: "3", name: "Modal", type: "EQUITY", parentCode: null, postable: false },
  { code: "3.1", name: "Modal Pemilik", type: "EQUITY", parentCode: "3", postable: true },
  { code: "3.2", name: "Laba Ditahan", type: "EQUITY", parentCode: "3", postable: true },
  { code: "3.3", name: "Laba Tahun Berjalan", type: "EQUITY", parentCode: "3", postable: true },

  // 4 — Pendapatan
  { code: "4", name: "Pendapatan", type: "REVENUE", parentCode: null, postable: false },
  { code: "4.1", name: "Pendapatan Usaha", type: "REVENUE", parentCode: "4", postable: false },
  { code: "4.1.01", name: "Penjualan Barang", type: "REVENUE", parentCode: "4.1", postable: true },
  { code: "4.1.02", name: "Penjualan Jasa", type: "REVENUE", parentCode: "4.1", postable: true },
  { code: "4.2", name: "Pendapatan Lain-lain", type: "REVENUE", parentCode: "4", postable: true },

  // 5 — Beban
  { code: "5", name: "Beban", type: "EXPENSE", parentCode: null, postable: false },
  { code: "5.1", name: "Beban Pokok Penjualan", type: "EXPENSE", parentCode: "5", postable: false },
  { code: "5.1.01", name: "Beban Pokok Penjualan", type: "EXPENSE", parentCode: "5.1", postable: true },
  { code: "5.2", name: "Beban Operasional", type: "EXPENSE", parentCode: "5", postable: false },
  { code: "5.2.01", name: "Beban Gaji", type: "EXPENSE", parentCode: "5.2", postable: true },
  { code: "5.2.02", name: "Beban Sewa", type: "EXPENSE", parentCode: "5.2", postable: true },
  { code: "5.2.03", name: "Beban Listrik dan Air", type: "EXPENSE", parentCode: "5.2", postable: true },
  { code: "5.2.04", name: "Beban Operasional Lainnya", type: "EXPENSE", parentCode: "5.2", postable: true },
  { code: "5.3", name: "Beban Lain-lain", type: "EXPENSE", parentCode: "5", postable: false },
  { code: "5.3.01", name: "Beban Penyusutan", type: "EXPENSE", parentCode: "5.3", postable: true },
  { code: "5.3.02", name: "Beban Lain-lain", type: "EXPENSE", parentCode: "5.3", postable: true },
];

export type CoaTemplateStatus = "create" | "exists" | "conflict" | "blocked";

export interface CoaTemplatePlanItem extends CoaTemplateEntry {
  status: CoaTemplateStatus;
  /** Existing account id when status is "exists". */
  accountId: string | null;
}

export interface ExistingAccountRef {
  id: string;
  code: string;
  type: AccountType;
}

/**
 * Computes which template entries still need to be created for a company.
 *
 * - "exists": an account with the same code already exists with the same type
 *   (never overwritten).
 * - "conflict": an account with the same code exists but has a different type,
 *   or a template parent resolved to an incompatible type. The entry and its
 *   template descendants are skipped.
 * - "blocked": a required template ancestor was skipped, so this entry cannot
 *   be placed correctly.
 * - "create": safe to insert; `parentCode` resolves to an existing or planned
 *   account of the same type.
 */
export function planCoaTemplate(
  existing: readonly ExistingAccountRef[],
): CoaTemplatePlanItem[] {
  const byCode = new Map(existing.map((account) => [account.code, account]));
  const resolved = new Map<
    string,
    { id: string | null; type: AccountType; blocked: boolean }
  >();
  const plan: CoaTemplatePlanItem[] = [];

  for (const entry of MSME_COA_TEMPLATE) {
    const current = byCode.get(entry.code);

    if (current) {
      const conflict = current.type !== entry.type;
      resolved.set(entry.code, {
        id: current.id,
        type: current.type,
        blocked: conflict,
      });
      plan.push({
        ...entry,
        status: conflict ? "conflict" : "exists",
        accountId: current.id,
      });
      continue;
    }

    const parent = entry.parentCode ? resolved.get(entry.parentCode) : null;
    const parentMissing = Boolean(entry.parentCode) && !parent;
    const parentBlocked = Boolean(parent?.blocked) || parentMissing;

    if (parentMissing || parentBlocked) {
      resolved.set(entry.code, {
        id: null,
        type: entry.type,
        blocked: true,
      });
      plan.push({ ...entry, status: "blocked", accountId: null });
      continue;
    }

    if (parent && parent.type !== entry.type) {
      resolved.set(entry.code, {
        id: null,
        type: entry.type,
        blocked: true,
      });
      plan.push({ ...entry, status: "conflict", accountId: null });
      continue;
    }

    resolved.set(entry.code, { id: null, type: entry.type, blocked: false });
    plan.push({ ...entry, status: "create", accountId: null });
  }

  return plan;
}
