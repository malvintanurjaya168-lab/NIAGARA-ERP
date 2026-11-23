"use client";

import Link from "next/link";
import { ArrowUpRight, Bell, CheckCircle2, PackageX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { ShellAlert } from "@/components/layout/types";
import { formatQuantity } from "@/lib/format";

interface NotificationsPopoverProps {
  alerts: ShellAlert[];
  lowStockCount: number;
  canViewInventory: boolean;
}

export function NotificationsPopover({
  alerts,
  lowStockCount,
  canViewInventory,
}: NotificationsPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Notifikasi stok"
          className="relative text-muted-foreground hover:text-foreground"
        >
          <Bell className="size-[18px]" />
          {lowStockCount > 0 ? (
            <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-amber-500 px-1 text-[9px] font-bold leading-4 text-white">
              {lowStockCount > 9 ? "9+" : lowStockCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[340px] p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="text-[13px] font-semibold">Notifikasi stok</p>
            <p className="text-[11px] text-muted-foreground">
              Produk yang perlu segera ditindaklanjuti
            </p>
          </div>
          {lowStockCount > 0 ? (
            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
              {lowStockCount} produk
            </span>
          ) : null}
        </div>

        <div className="max-h-[320px] overflow-y-auto p-2">
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-9 text-center">
              <span className="grid size-10 place-items-center rounded-full bg-emerald-500/10 text-emerald-600">
                <CheckCircle2 className="size-5" />
              </span>
              <p className="text-[13px] font-medium">Semua stok aman</p>
              <p className="text-[11px] text-muted-foreground">
                Tidak ada produk di bawah batas minimum.
              </p>
            </div>
          ) : (
            <ul className="space-y-1">
              {alerts.map((alert) => {
                const outOfStock = alert.stock <= 0;
                return (
                  <li key={alert.id}>
                    <Link
                      href={`/inventory/${alert.id}`}
                      className="flex items-start gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-accent"
                    >
                      <span
                        className={
                          outOfStock
                            ? "mt-0.5 grid size-7 shrink-0 place-items-center rounded-md bg-rose-500/10 text-rose-600"
                            : "mt-0.5 grid size-7 shrink-0 place-items-center rounded-md bg-amber-500/10 text-amber-700"
                        }
                      >
                        <PackageX className="size-3.5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] font-medium">
                          {alert.name}
                        </span>
                        <span className="block text-[11px] text-muted-foreground">
                          {outOfStock ? "Stok habis" : "Stok menipis"} ·{" "}
                          {formatQuantity(alert.stock, alert.unit)} dari min.{" "}
                          {formatQuantity(alert.minimum, alert.unit)}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {canViewInventory ? (
          <div className="border-t border-border p-2">
            <Link
              href="/inventory?status=attention"
              className="flex items-center justify-between rounded-lg px-2.5 py-2 text-[12px] font-medium text-primary transition-colors hover:bg-accent"
            >
              Lihat semua inventaris
              <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
