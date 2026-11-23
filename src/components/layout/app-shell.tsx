"use client";

import { useState, useSyncExternalStore } from "react";
import { X } from "lucide-react";
import { PageTransition } from "@/components/motion/page-transition";
import { Sidebar, SidebarContent } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import type {
  ShellAlert,
  ShellCompany,
  ShellUser,
} from "@/components/layout/types";

interface AppShellProps {
  user: ShellUser;
  company: ShellCompany;
  alerts: ShellAlert[];
  lowStockCount: number;
  children: React.ReactNode;
}

const STORAGE_KEY = "niagara.sidebar.collapsed";

function subscribeToSidebarPreference(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function getSidebarPreference() {
  return window.localStorage.getItem(STORAGE_KEY) === "1";
}

function getServerSidebarPreference() {
  return false;
}

export function AppShell({
  user,
  company,
  alerts,
  lowStockCount,
  children,
}: AppShellProps) {
  const storedCollapsed = useSyncExternalStore(
    subscribeToSidebarPreference,
    getSidebarPreference,
    getServerSidebarPreference,
  );
  const [collapsedOverride, setCollapsedOverride] = useState<boolean | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const collapsed = collapsedOverride ?? storedCollapsed;

  function toggleCollapsed() {
    const next = !collapsed;
    window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    setCollapsedOverride(next);
  }

  return (
    <div className="relative flex min-h-dvh">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(60%_40%_at_100%_0%,rgba(101,201,174,0.08),transparent_60%)]" />

      <Sidebar
        user={user}
        company={company}
        lowStockCount={lowStockCount}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapsed}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          user={user}
          company={company}
          alerts={alerts}
          lowStockCount={lowStockCount}
          onOpenMobileNav={() => setMobileOpen(true)}
        />

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-[1440px]">
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="w-[286px] max-w-[86vw] border-sidebar-border bg-sidebar p-0 text-sidebar-foreground"
        >
          <SheetTitle className="sr-only">Navigasi utama</SheetTitle>
          <SheetDescription className="sr-only">
            Menu aplikasi sesuai peran Anda.
          </SheetDescription>
          <SheetClose asChild>
            <button
              type="button"
              aria-label="Tutup navigasi"
              className="absolute right-3 top-3 z-30 grid size-8 place-items-center rounded-lg text-sidebar-foreground/60 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="size-4" />
            </button>
          </SheetClose>
          <SidebarContent
            user={user}
            company={company}
            lowStockCount={lowStockCount}
            collapsed={false}
            mobile
            onNavigate={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
