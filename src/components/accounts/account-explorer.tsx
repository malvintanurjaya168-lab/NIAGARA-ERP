"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpenText,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SectionCard } from "@/components/shared/section-card";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";
import {
  ACCOUNT_TYPE_BADGE,
  ACCOUNT_TYPE_LABELS,
  ACCOUNT_TYPES,
  type AccountTypeValue,
} from "@/lib/constants";
import {
  activateAccountAction,
  deactivateAccountAction,
} from "@/lib/actions/accounts";
import type { ActionResult } from "@/lib/errors";
import type { AccountTreeNode } from "@/lib/queries/accounts";
import type { CoaTemplatePlanItem } from "@/lib/accounts-template";
import { flattenAccountTree } from "@/lib/accounts-tree";
import { useActionFeedback } from "@/lib/hooks/use-action-feedback";
import { AccountFormDialog } from "@/components/accounts/account-form-dialog";
import { TemplateDialog } from "@/components/accounts/template-dialog";

type StatusFilter = "all" | "active" | "inactive";

interface AccountExplorerProps {
  tree: AccountTreeNode[];
  preview: CoaTemplatePlanItem[];
  canManage: boolean;
}

export function AccountExplorer({
  tree,
  preview,
  canManage,
}: AccountExplorerProps) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | AccountTypeValue>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AccountTreeNode | null>(null);
  const [templateOpen, setTemplateOpen] = useState(false);

  const allNodes = useMemo(() => flattenAccountTree(tree), [tree]);
  const byId = useMemo(
    () => new Map(allNodes.map((node) => [node.id, node])),
    [allNodes],
  );

  const filtersActive =
    query.trim().length > 0 || typeFilter !== "all" || statusFilter !== "all";

  const filteredTree = useMemo(() => {
    const search = query.trim().toLowerCase();
    const matches = (node: AccountTreeNode): boolean => {
      if (typeFilter !== "all" && node.type !== typeFilter) return false;
      if (statusFilter === "active" && !node.isActive) return false;
      if (statusFilter === "inactive" && node.isActive) return false;
      if (
        search &&
        !node.code.toLowerCase().includes(search) &&
        !node.name.toLowerCase().includes(search)
      ) {
        return false;
      }
      return true;
    };

    const filterNode = (node: AccountTreeNode): AccountTreeNode | null => {
      const children = node.children
        .map(filterNode)
        .filter((child): child is AccountTreeNode => child !== null);
      if (matches(node) || children.length > 0) {
        return { ...node, children };
      }
      return null;
    };

    return tree.map(filterNode).filter((n): n is AccountTreeNode => n !== null);
  }, [tree, query, typeFilter, statusFilter]);

  const visibleCount = useMemo(
    () => flattenAccountTree(filteredTree).length,
    [filteredTree],
  );

  function toggleCollapse(id: string) {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function isExpanded(id: string) {
    return filtersActive ? true : !collapsed.has(id);
  }

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(node: AccountTreeNode) {
    setEditing(node);
    setFormOpen(true);
  }

  return (
    <>
      <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari kode atau nama akun…"
              aria-label="Cari akun"
              className="h-9 pl-9"
            />
          </div>

          <Select
            value={typeFilter}
            onValueChange={(value) =>
              setTypeFilter(value as "all" | AccountTypeValue)
            }
          >
            <SelectTrigger className="h-9 w-[150px] text-[12px]">
              <SelectValue placeholder="Semua jenis" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Jenis</SelectItem>
              {ACCOUNT_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {ACCOUNT_TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as StatusFilter)}
          >
            <SelectTrigger className="h-9 w-[130px] text-[12px]">
              <SelectValue placeholder="Semua status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="active">Aktif</SelectItem>
              <SelectItem value="inactive">Nonaktif</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {canManage ? (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setTemplateOpen(true)}
            >
              <Sparkles className="size-3.5" />
              Template COA
            </Button>
            <Button size="sm" className="gap-1.5" onClick={openCreate}>
              <Plus className="size-3.5" />
              Akun Baru
            </Button>
          </div>
        ) : null}
      </div>

      <SectionCard
        title="Struktur Akun"
        description={`${visibleCount} akun ditampilkan dari ${allNodes.length} akun terdaftar.`}
      >
        {allNodes.length === 0 ? (
          <EmptyState
            icon={<BookOpenText className="size-5" />}
            title="Belum ada akun"
            description={
              canManage
                ? "Mulai dengan template COA MSME atau tambahkan akun pertama perusahaan Anda."
                : "Bagan akun belum diisi untuk perusahaan ini."
            }
            action={
              canManage ? (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setTemplateOpen(true)}
                  >
                    <Sparkles className="size-3.5" />
                    Template COA
                  </Button>
                  <Button size="sm" className="gap-1.5" onClick={openCreate}>
                    <Plus className="size-3.5" />
                    Akun Baru
                  </Button>
                </div>
              ) : undefined
            }
            className="border-0 bg-transparent py-10"
          />
        ) : visibleCount === 0 ? (
          <EmptyState
            icon={<Search className="size-5" />}
            title="Tidak ada akun yang cocok"
            description="Coba ubah kata kunci atau filter yang dipilih."
            className="border-0 bg-transparent py-10"
          />
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[720px]">
              <div className="flex items-center gap-3 border-b border-border/70 px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                <span className="min-w-0 flex-1">Kode & Nama Akun</span>
                <span className="hidden w-[92px] md:block">Jenis</span>
                <span className="hidden w-[130px] lg:block">Induk</span>
                <span className="w-[76px]">Status</span>
                <span className="hidden w-[80px] sm:block">Posting</span>
                <span className="w-9" />
              </div>
              <ul className="divide-y divide-border/50">
                {filteredTree.map((node) => (
                  <AccountRow
                    key={node.id}
                    node={node}
                    depth={0}
                    byId={byId}
                    canManage={canManage}
                    isExpanded={isExpanded}
                    onToggle={toggleCollapse}
                    onEdit={openEdit}
                  />
                ))}
              </ul>
            </div>
          </div>
        )}
      </SectionCard>

      <AccountFormDialog
        key={editing?.id ?? "new"}
        open={formOpen}
        onOpenChange={setFormOpen}
        account={editing}
        allAccounts={allNodes}
      />
      <TemplateDialog
        open={templateOpen}
        onOpenChange={setTemplateOpen}
        preview={preview}
      />
    </>
  );
}

function AccountRow({
  node,
  depth,
  byId,
  canManage,
  isExpanded,
  onToggle,
  onEdit,
}: {
  node: AccountTreeNode;
  depth: number;
  byId: Map<string, AccountTreeNode>;
  canManage: boolean;
  isExpanded: (id: string) => boolean;
  onToggle: (id: string) => void;
  onEdit: (node: AccountTreeNode) => void;
}) {
  const expanded = node.children.length > 0 && isExpanded(node.id);
  const parent = node.parentId ? byId.get(node.parentId) : undefined;
  const hasChildren = node.children.length > 0;

  return (
    <>
      <li className="flex items-center gap-3 px-3 py-2">
        <div
          className="flex min-w-0 flex-1 items-center gap-1.5"
          style={{ paddingLeft: depth * 20 }}
        >
          {hasChildren ? (
            <button
              type="button"
              onClick={() => onToggle(node.id)}
              aria-label={expanded ? "Ciutkan akun" : "Bentangkan akun"}
              aria-expanded={expanded}
              className="grid size-5 shrink-0 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {expanded ? (
                <ChevronDown className="size-3.5" />
              ) : (
                <ChevronRight className="size-3.5" />
              )}
            </button>
          ) : (
            <span className="size-5 shrink-0" />
          )}
          <span className="w-[86px] shrink-0 font-mono text-[11.5px] font-medium text-foreground">
            {node.code}
          </span>
          <span
            className={cn(
              "truncate text-[12.5px]",
              hasChildren
                ? "font-semibold text-foreground"
                : "font-normal text-foreground/90",
            )}
          >
            {node.name}
          </span>
        </div>

        <span className="hidden w-[92px] md:block">
          <Badge
            variant="outline"
            className={cn(
              "border px-1.5 py-0 text-[9.5px] font-medium",
              ACCOUNT_TYPE_BADGE[node.type],
            )}
          >
            {ACCOUNT_TYPE_LABELS[node.type]}
          </Badge>
        </span>

        <span className="hidden w-[130px] truncate text-[11px] text-muted-foreground lg:block">
          {parent ? `${parent.code} · ${parent.name}` : "—"}
        </span>

        <span className="w-[76px]">
          <Badge
            variant="outline"
            className={cn(
              "border px-1.5 py-0 text-[9.5px] font-medium",
              node.isActive
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
                : "border-border bg-muted text-muted-foreground",
            )}
          >
            {node.isActive ? "Aktif" : "Nonaktif"}
          </Badge>
        </span>

        <span className="hidden w-[80px] sm:block">
          <span
            className={cn(
              "text-[10.5px] font-medium",
              node.isPostable
                ? "text-primary"
                : "text-muted-foreground",
            )}
          >
            {node.isPostable ? "Posting" : "Kelompok"}
          </span>
        </span>

        <span className="flex w-9 justify-end">
          {canManage ? (
            <RowActions node={node} onEdit={onEdit} />
          ) : null}
        </span>
      </li>

      {expanded
        ? node.children.map((child) => (
            <AccountRow
              key={child.id}
              node={child}
              depth={depth + 1}
              byId={byId}
              canManage={canManage}
              isExpanded={isExpanded}
              onToggle={onToggle}
              onEdit={onEdit}
            />
          ))
        : null}
    </>
  );
}

function RowActions({
  node,
  onEdit,
}: {
  node: AccountTreeNode;
  onEdit: (node: AccountTreeNode) => void;
}) {
  const router = useRouter();
  const action = node.isActive ? deactivateAccountAction : activateAccountAction;
  const [state, formAction] = useActionState<
    ActionResult | undefined,
    FormData
  >(action, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useActionFeedback(state, {
    onSuccess: () => router.refresh(),
  });

  return (
    <>
      <form ref={formRef} action={formAction} className="hidden">
        <input type="hidden" name="accountId" value={node.id} />
      </form>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground"
            aria-label={`Aksi akun ${node.code}`}
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onSelect={() => onEdit(node)}>
            <Pencil className="size-3.5" />
            Ubah Akun
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => formRef.current?.requestSubmit()}
            className={node.isActive ? "text-destructive" : undefined}
          >
            {node.isActive ? "Nonaktifkan" : "Aktifkan"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
