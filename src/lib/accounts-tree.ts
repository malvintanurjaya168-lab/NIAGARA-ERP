/** Client-safe helpers for the account hierarchy tree. */

export interface AccountTreeLike {
  id: string;
  children: AccountTreeLike[];
}

/** Flattens a nested account tree into a depth-first list. */
export function flattenAccountTree<T extends AccountTreeLike>(nodes: T[]): T[] {
  const result: T[] = [];
  const walk = (items: T[]) => {
    for (const item of items) {
      result.push(item);
      walk(item.children as T[]);
    }
  };
  walk(nodes);
  return result;
}

/** Returns true when `candidateId` is `rootId` itself or one of its descendants. */
export function isSelfOrDescendant(
  rootId: string,
  candidateId: string,
  parentOf: Map<string, string | null>,
): boolean {
  let current: string | null | undefined = candidateId;
  const seen = new Set<string>();
  while (current) {
    if (current === rootId) return true;
    if (seen.has(current)) return false;
    seen.add(current);
    current = parentOf.get(current) ?? null;
  }
  return false;
}
