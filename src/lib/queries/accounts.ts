import { prisma } from "@/lib/prisma";
import type { AccountType } from "@/generated/prisma/enums";
import {
  planCoaTemplate,
  type CoaTemplatePlanItem,
} from "@/lib/accounts-template";

export type AccountStatusFilter = "all" | "active" | "inactive";

export interface AccountListParams {
  companyId: string;
  type?: AccountType;
  q?: string;
  status?: AccountStatusFilter;
}

export interface AccountListItem {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  parentId: string | null;
  isPostable: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  parent: { id: string; code: string; name: string } | null;
  childrenCount: number;
}

export interface AccountTreeNode extends Omit<AccountListItem, "parent" | "childrenCount"> {
  children: AccountTreeNode[];
}

export interface AccountDetail extends AccountListItem {
  children: { id: string; code: string; name: string; type: AccountType; isPostable: boolean; isActive: boolean }[];
}

export interface AccountParentOption {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  isPostable: boolean;
  isActive: boolean;
}

const accountSelect = {
  id: true,
  code: true,
  name: true,
  type: true,
  parentId: true,
  isPostable: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  parent: { select: { id: true, code: true, name: true } },
  _count: { select: { children: true } },
} as const;

type AccountRow = {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  parentId: string | null;
  isPostable: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  parent: { id: string; code: string; name: string } | null;
  _count: { children: number };
};

function toListItem(row: AccountRow): AccountListItem {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    type: row.type,
    parentId: row.parentId,
    isPostable: row.isPostable,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    parent: row.parent,
    childrenCount: row._count.children,
  };
}

export async function getAccountList({
  companyId,
  type,
  q,
  status = "all",
}: AccountListParams): Promise<AccountListItem[]> {
  const search = q?.trim();

  const rows = await prisma.account.findMany({
    where: {
      companyId,
      ...(type ? { type } : {}),
      ...(status === "active" ? { isActive: true } : {}),
      ...(status === "inactive" ? { isActive: false } : {}),
      ...(search
        ? {
            OR: [
              { code: { contains: search, mode: "insensitive" } },
              { name: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ code: "asc" }],
    select: accountSelect,
  });

  return rows.map(toListItem);
}

export async function getAccountHierarchy(
  companyId: string,
): Promise<AccountTreeNode[]> {
  const rows = await prisma.account.findMany({
    where: { companyId },
    orderBy: [{ code: "asc" }],
    select: accountSelect,
  });

  const nodes = new Map<string, AccountTreeNode>();
  const roots: AccountTreeNode[] = [];

  for (const row of rows) {
    const item = toListItem(row);
    nodes.set(item.id, { ...item, children: [] });
  }

  for (const row of rows) {
    const node = nodes.get(row.id);
    if (!node) continue;
    if (row.parentId && nodes.has(row.parentId)) {
      nodes.get(row.parentId)?.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export async function getAccountById(
  companyId: string,
  accountId: string,
): Promise<AccountDetail | null> {
  const row = await prisma.account.findFirst({
    where: { id: accountId, companyId },
    select: {
      ...accountSelect,
      children: {
        orderBy: [{ code: "asc" }],
        select: {
          id: true,
          code: true,
          name: true,
          type: true,
          isPostable: true,
          isActive: true,
        },
      },
    },
  });

  if (!row) return null;

  const { children, ...rest } = row;
  return { ...toListItem(rest), children };
}

export async function getAccountChildren(
  companyId: string,
  parentId: string,
): Promise<{ id: string; code: string; name: string }[]> {
  return prisma.account.findMany({
    where: { companyId, parentId },
    orderBy: [{ code: "asc" }],
    select: { id: true, code: true, name: true },
  });
}

/**
 * Returns accounts that may be selected as a parent. When `excludeAccountId`
 * is given, the account itself and all of its descendants are excluded so the
 * result never offers a choice that would create a circular hierarchy.
 */
export async function getParentAccountOptions(
  companyId: string,
  excludeAccountId?: string,
): Promise<AccountParentOption[]> {
  const rows = await prisma.account.findMany({
    where: { companyId, isActive: true },
    orderBy: [{ code: "asc" }],
    select: {
      id: true,
      code: true,
      name: true,
      type: true,
      parentId: true,
      isPostable: true,
      isActive: true,
    },
  });

  let excluded = new Set<string>();
  if (excludeAccountId) {
    const childrenByParent = new Map<string, string[]>();
    for (const row of rows) {
      if (!row.parentId) continue;
      const list = childrenByParent.get(row.parentId) ?? [];
      list.push(row.id);
      childrenByParent.set(row.parentId, list);
    }

    excluded = new Set([excludeAccountId]);
    const stack = [excludeAccountId];
    while (stack.length > 0) {
      const current = stack.pop();
      if (!current) continue;
      for (const childId of childrenByParent.get(current) ?? []) {
        if (!excluded.has(childId)) {
          excluded.add(childId);
          stack.push(childId);
        }
      }
    }
  }

  return rows
    .filter((row) => !excluded.has(row.id))
    .map(({ id, code, name, type, isPostable, isActive }) => ({
      id,
      code,
      name,
      type,
      isPostable,
      isActive,
    }));
}

/**
 * Preview of the MSME COA template for a company: which entries would be
 * created, which already exist, and which are skipped due to conflicts.
 */
export async function getCoaTemplatePreview(
  companyId: string,
): Promise<CoaTemplatePlanItem[]> {
  const existing = await prisma.account.findMany({
    where: { companyId },
    select: { id: true, code: true, type: true },
  });
  return planCoaTemplate(existing);
}
