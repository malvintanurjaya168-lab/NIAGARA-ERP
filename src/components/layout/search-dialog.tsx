"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CornerDownLeft,
  PackagePlus,
  ScanLine,
  Search,
  TrendingUp,
  History,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { NAV_ITEMS } from "@/components/layout/nav-config";
import { can, type Permission, type Role } from "@/lib/roles";
import { cn } from "@/lib/utils";

interface SearchAction {
  href: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  permission: Permission;
  keywords: string;
}

const EXTRA_ACTIONS: SearchAction[] = [
  {
    href: "/pos",
    label: "Transaksi baru",
    description: "Buka Point of Sale",
    icon: ScanLine,
    permission: "pos.use",
    keywords: "checkout kasir jual bayar",
  },
  {
    href: "/inventory/new",
    label: "Tambah produk",
    description: "Daftarkan produk baru",
    icon: PackagePlus,
    permission: "inventory.manage",
    keywords: "produk baru sku stok",
  },
  {
    href: "/inventory/movements",
    label: "Riwayat pergerakan stok",
    description: "Audit stok masuk, keluar, dan penyesuaian",
    icon: History,
    permission: "inventory.movements",
    keywords: "audit ledger mutasi",
  },
  {
    href: "/reports/financial?preset=month",
    label: "Laporan bulan ini",
    description: "Pendapatan, HPP, dan laba kotor",
    icon: TrendingUp,
    permission: "reports.view",
    keywords: "laba keuangan omzet",
  },
];

export function SearchDialog({ role }: { role: Role }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    function handleKeydown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    }
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, []);

  const actions = useMemo<SearchAction[]>(() => {
    const navigation = NAV_ITEMS.filter((item) => can(role, item.permission)).map(
      (item) => ({
        href: item.href,
        label: item.label,
        description: item.description,
        icon: item.icon,
        permission: item.permission,
        keywords: `${item.label} ${item.description}`.toLowerCase(),
      }),
    );

    const extras = EXTRA_ACTIONS.filter((item) => can(role, item.permission));

    return [...navigation, ...extras];
  }, [role]);

  const normalized = query.trim().toLowerCase();
  const results = normalized
    ? actions.filter((action) =>
        `${action.label} ${action.description} ${action.keywords}`
          .toLowerCase()
          .includes(normalized),
      )
    : actions;

  function go(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          className="hidden h-9 w-[230px] items-center gap-2 rounded-lg border border-border bg-card/70 px-3 text-[13px] text-muted-foreground shadow-[0_1px_0_rgba(16,49,48,0.03)] transition-colors hover:border-primary/30 hover:bg-card md:flex xl:w-[270px]"
        >
          <Search className="size-4 shrink-0" />
          <span className="flex-1 truncate text-left">Cari menu atau aksi…</span>
          <kbd className="pointer-events-none inline-flex h-5 items-center gap-0.5 rounded border border-border bg-muted px-1 font-mono text-[10px] font-medium text-muted-foreground">
            Ctrl K
          </kbd>
        </button>
      </DialogTrigger>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label="Cari"
          className="grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
        >
          <Search className="size-[18px]" />
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-lg gap-0 overflow-hidden p-0" showCloseButton={false}>
        <DialogTitle className="sr-only">Pencarian NIAGARA</DialogTitle>
        <DialogDescription className="sr-only">
          Cari menu dan aksi yang tersedia untuk peran Anda.
        </DialogDescription>
        <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
          <Search className="size-4 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && results[0]) {
                go(results[0].href);
              }
            }}
            placeholder="Cari menu, modul, atau aksi…"
            className="h-8 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            Esc
          </kbd>
        </div>

        <div className="max-h-[340px] overflow-y-auto p-2">
          {results.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm font-medium">Tidak ada hasil</p>
              <p className="mt-1 text-[12px] text-muted-foreground">
                Coba kata kunci lain seperti “stok” atau “laporan”.
              </p>
            </div>
          ) : (
            <ul className="space-y-0.5">
              {results.map((action, index) => {
                const Icon = action.icon;
                return (
                  <li key={`${action.href}-${action.label}`}>
                    <button
                      type="button"
                      onClick={() => go(action.href)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none",
                        index === 0 && "bg-accent/40",
                      )}
                    >
                      <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-border bg-card text-primary">
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium">
                          {action.label}
                        </span>
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {action.description}
                        </span>
                      </span>
                      <ArrowRight className="size-3.5 text-muted-foreground/60" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border bg-muted/40 px-4 py-2 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <CornerDownLeft className="size-3" />
            Enter untuk membuka
          </span>
          <span>{results.length} hasil</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
