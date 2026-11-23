"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { Logo, LogoMark } from "@/components/brand/logo";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { NAV_SECTIONS, isNavItemActive } from "@/components/layout/nav-config";
import type { ShellCompany, ShellUser } from "@/components/layout/types";
import { can, ROLE_LABELS } from "@/lib/roles";
import { cn } from "@/lib/utils";

interface SidebarContentProps {
  user: ShellUser;
  company: ShellCompany;
  lowStockCount: number;
  collapsed: boolean;
  onNavigate?: () => void;
  onToggleCollapse?: () => void;
  mobile?: boolean;
}

export function SidebarContent({
  user,
  company,
  lowStockCount,
  collapsed,
  onNavigate,
  onToggleCollapse,
  mobile = false,
}: SidebarContentProps) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const isCollapsed = collapsed && !mobile;

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-sidebar text-sidebar-foreground">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-brand/20 via-brand/5 to-transparent" />

      <div
        className={cn(
          "relative z-10 flex h-16 shrink-0 items-center border-b border-sidebar-border/70",
          isCollapsed ? "justify-center px-3" : "px-4",
        )}
      >
        {isCollapsed ? (
          <LogoMark size={36} />
        ) : (
          <Logo size={36} tone="inverse" subtitle="ERP SUITE" />
        )}
      </div>

      <nav className="relative z-10 flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-6">
          {NAV_SECTIONS.map((section) => {
            const items = section.items.filter((item) =>
              can(user.role, item.permission),
            );
            if (items.length === 0) return null;

            return (
              <div key={section.label}>
                <p
                  className={cn(
                    "mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-sidebar-foreground/35",
                    isCollapsed && "sr-only",
                  )}
                >
                  {section.label}
                </p>
                <ul className="space-y-1">
                  {items.map((item) => {
                    const active = isNavItemActive(pathname, item);
                    const Icon = item.icon;
                    const showBadge = item.href === "/inventory" && lowStockCount > 0;

                    const link = (
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sidebar-ring/60",
                          active
                            ? "text-white"
                            : "text-sidebar-foreground/65 hover:bg-white/[0.055] hover:text-white",
                          isCollapsed && "justify-center px-0",
                        )}
                      >
                        {active ? (
                          <motion.span
                            layoutId={mobile ? "mobile-nav-active" : "sidebar-active"}
                            className="absolute inset-0 rounded-xl bg-sidebar-accent ring-1 ring-white/5"
                            transition={
                              reduceMotion
                                ? { duration: 0 }
                                : { type: "spring", stiffness: 480, damping: 42 }
                            }
                          />
                        ) : null}
                        {active ? (
                          <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand-mint" />
                        ) : null}
                        <Icon
                          className={cn(
                            "relative z-10 size-[18px] shrink-0 transition-colors",
                            active
                              ? "text-brand-mint"
                              : "text-sidebar-foreground/45 group-hover:text-sidebar-foreground/80",
                          )}
                        />
                        {!isCollapsed ? (
                          <>
                            <span className="relative z-10 flex-1 truncate">
                              {item.label}
                            </span>
                            {showBadge ? (
                              <span className="relative z-10 inline-flex min-w-5 items-center justify-center rounded-full bg-brand-mint/15 px-1.5 py-0.5 text-[10px] font-semibold text-brand-mint">
                                {lowStockCount > 99 ? "99+" : lowStockCount}
                              </span>
                            ) : null}
                          </>
                        ) : showBadge ? (
                          <span className="absolute right-2 top-2 z-10 size-1.5 rounded-full bg-brand-mint" />
                        ) : null}
                      </Link>
                    );

                    return (
                      <li key={item.href}>
                        {isCollapsed ? (
                          <Tooltip>
                            <TooltipTrigger asChild>{link}</TooltipTrigger>
                            <TooltipContent side="right" sideOffset={10}>
                              {item.label}
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          link
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </nav>

      <div className="relative z-10 border-t border-sidebar-border/70 p-3">
        {!isCollapsed ? (
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.04] p-3">
            <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.16em] text-sidebar-foreground/40">
              <Building2 className="size-3.5" />
              Perusahaan
            </div>
            <p className="mt-1.5 truncate text-[13px] font-semibold text-white/90">
              {company.name}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-sidebar-foreground/45">
              {company.businessType || "Operasional bisnis"}
            </p>
            <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-md bg-brand-mint/10 px-1.5 py-0.5 text-[10px] font-medium text-brand-mint">
              <ShieldCheck className="size-3" />
              {ROLE_LABELS[user.role]}
            </div>
          </div>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="grid place-items-center rounded-xl border border-white/[0.07] bg-white/[0.04] py-2.5">
                <Building2 className="size-4 text-sidebar-foreground/55" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={10}>
              {company.name}
            </TooltipContent>
          </Tooltip>
        )}

        {onToggleCollapse && !mobile ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? "Perluas sidebar" : "Ringkas sidebar"}
            className={cn(
              "mt-2 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[11px] font-medium text-sidebar-foreground/45 transition-colors hover:bg-white/[0.055] hover:text-white",
              isCollapsed && "justify-center px-0",
            )}
          >
            {isCollapsed ? (
              <ChevronRight className="size-4" />
            ) : (
              <>
                <ChevronLeft className="size-4" />
                <span>Ringkas menu</span>
              </>
            )}
          </button>
        ) : null}
      </div>
    </div>
  );
}

interface SidebarProps {
  user: ShellUser;
  company: ShellCompany;
  lowStockCount: number;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({
  user,
  company,
  lowStockCount,
  collapsed,
  onToggleCollapse,
}: SidebarProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 76 : 264 }}
      transition={
        reduceMotion ? { duration: 0 } : { duration: 0.26, ease: [0.22, 1, 0.36, 1] }
      }
      className="sticky top-0 z-40 hidden h-dvh shrink-0 border-r border-sidebar-border bg-sidebar lg:block"
    >
      <SidebarContent
        user={user}
        company={company}
        lowStockCount={lowStockCount}
        collapsed={collapsed}
        onToggleCollapse={onToggleCollapse}
      />
    </motion.aside>
  );
}
