"use client";

import { Fragment, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Building2,
  ChevronDown,
  ChevronRight,
  Loader2,
  LogOut,
  Menu,
  Settings,
  UserRound,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationsPopover } from "@/components/layout/notifications-popover";
import { SearchDialog } from "@/components/layout/search-dialog";
import { PATH_LABELS } from "@/components/layout/nav-config";
import type {
  ShellAlert,
  ShellCompany,
  ShellUser,
} from "@/components/layout/types";
import { logoutAction } from "@/lib/actions/auth";
import { initials } from "@/lib/format";
import { can, ROLE_LABELS } from "@/lib/roles";
import { cn } from "@/lib/utils";

interface TopbarProps {
  user: ShellUser;
  company: ShellCompany;
  alerts: ShellAlert[];
  lowStockCount: number;
  onOpenMobileNav: () => void;
}

export function Topbar({
  user,
  company,
  alerts,
  lowStockCount,
  onOpenMobileNav,
}: TopbarProps) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const crumbs = segments.map((segment, index) => {
    const href = `/${segments.slice(0, index + 1).join("/")}`;
    const isLast = index === segments.length - 1;
    const label =
      PATH_LABELS[href] ??
      (isLast ? "Detail" : segment.replace(/-/g, " "));
    return { href, label, isLast };
  });
  const title = crumbs.at(-1)?.label ?? "NIAGARA";

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b border-border/80 bg-background/85 px-3 backdrop-blur-xl sm:gap-3 sm:px-6">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onOpenMobileNav}
        aria-label="Buka navigasi"
        className="text-muted-foreground lg:hidden"
      >
        <Menu className="size-5" />
      </Button>

      <div className="min-w-0 flex-1">
        {crumbs.length > 1 ? (
          <div className="hidden items-center gap-1 text-[11px] text-muted-foreground sm:flex">
            {crumbs.map((crumb) => (
              <Fragment key={crumb.href}>
                {!crumb.isLast ? (
                  <>
                    <Link
                      href={crumb.href}
                      className="transition-colors hover:text-foreground"
                    >
                      {crumb.label}
                    </Link>
                    <ChevronRight className="size-3 opacity-60" />
                  </>
                ) : (
                  <span className="font-medium text-muted-foreground/85">
                    {crumb.label}
                  </span>
                )}
              </Fragment>
            ))}
          </div>
        ) : null}
        <h1 className="truncate text-[15px] font-semibold tracking-tight text-foreground">
          {title}
        </h1>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
        <SearchDialog role={user.role} />

        <NotificationsPopover
          alerts={alerts}
          lowStockCount={lowStockCount}
          canViewInventory={can(user.role, "inventory.view")}
        />

        <div className="mx-1 hidden h-6 w-px bg-border xl:block" />

        <div className="hidden items-center gap-2 rounded-lg border border-border bg-card/70 px-2.5 py-1.5 xl:flex">
          <Building2 className="size-3.5 text-primary" />
          <span className="max-w-[150px] truncate text-[12px] font-medium">
            {company.name}
          </span>
        </div>

        <UserMenu user={user} />
      </div>
    </header>
  );
}

function UserMenu({ user }: { user: ShellUser }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const canManageSettings = can(user.role, "settings.manage");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-full p-0.5 pr-1 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <Avatar className="size-8 border border-primary/15 bg-primary/10">
            <AvatarFallback className="bg-primary/10 text-[11px] font-semibold text-primary">
              {initials(user.fullName)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden min-w-0 text-left sm:block">
            <span className="block max-w-[120px] truncate text-[12px] font-medium leading-tight">
              {user.fullName}
            </span>
            <span className="block text-[10px] leading-tight text-muted-foreground">
              {ROLE_LABELS[user.role]}
            </span>
          </span>
          <ChevronDown className="hidden size-3.5 text-muted-foreground sm:block" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="space-y-0.5">
          <span className="block truncate text-[13px] font-semibold">
            {user.fullName}
          </span>
          <span className="block truncate text-[11px] font-normal text-muted-foreground">
            {user.email}
          </span>
          <span className="mt-1 inline-flex rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground">
            {ROLE_LABELS[user.role]}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => router.push("/profile")}
          className="gap-2 py-1.5"
        >
          <UserRound className="size-4" />
          Profil Saya
        </DropdownMenuItem>
        {canManageSettings ? (
          <DropdownMenuItem
            onClick={() => router.push("/settings")}
            className="gap-2 py-1.5"
          >
            <Settings className="size-4" />
            Pengaturan Perusahaan
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          disabled={isPending}
          onSelect={(event) => {
            event.preventDefault();
            startTransition(() => {
              void logoutAction();
            });
          }}
          className={cn("gap-2 py-1.5", isPending && "opacity-70")}
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <LogOut className="size-4" />
          )}
          Keluar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
