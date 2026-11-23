import {
  BarChart3,
  LayoutDashboard,
  Package,
  ReceiptText,
  ScanLine,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Permission } from "@/lib/roles";

export interface NavItem {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  permission: Permission;
  matchPrefixes: string[];
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    label: "Ikhtisar",
    items: [
      {
        href: "/dashboard",
        label: "Dasbor",
        description: "Ringkasan performa bisnis",
        icon: LayoutDashboard,
        permission: "dashboard.view",
        matchPrefixes: ["/dashboard"],
      },
    ],
  },
  {
    label: "Operasional",
    items: [
      {
        href: "/inventory",
        label: "Inventaris",
        description: "Produk dan ketersediaan stok",
        icon: Package,
        permission: "inventory.view",
        matchPrefixes: ["/inventory"],
      },
      {
        href: "/pos",
        label: "Point of Sale",
        description: "Proses transaksi penjualan",
        icon: ScanLine,
        permission: "pos.use",
        matchPrefixes: ["/pos"],
      },
      {
        href: "/sales",
        label: "Penjualan",
        description: "Riwayat dan detail transaksi",
        icon: ReceiptText,
        permission: "sales.view",
        matchPrefixes: ["/sales"],
      },
    ],
  },
  {
    label: "Analitik & Admin",
    items: [
      {
        href: "/reports/financial",
        label: "Laporan Keuangan",
        description: "Pendapatan, HPP, dan laba kotor",
        icon: BarChart3,
        permission: "reports.view",
        matchPrefixes: ["/reports"],
      },
      {
        href: "/users",
        label: "Pengguna",
        description: "Akun dan peran tim",
        icon: Users,
        permission: "users.manage",
        matchPrefixes: ["/users"],
      },
      {
        href: "/settings",
        label: "Pengaturan",
        description: "Profil dan preferensi perusahaan",
        icon: Settings,
        permission: "settings.manage",
        matchPrefixes: ["/settings"],
      },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((section) => section.items);

export const PATH_LABELS: Record<string, string> = {
  "/dashboard": "Dasbor",
  "/inventory": "Inventaris",
  "/inventory/movements": "Riwayat Pergerakan Stok",
  "/pos": "Point of Sale",
  "/sales": "Transaksi Penjualan",
  "/reports": "Laporan",
  "/reports/financial": "Laporan Keuangan",
  "/users": "Pengguna",
  "/settings": "Pengaturan",
  "/profile": "Profil Saya",
  "/unauthorized": "Akses Ditolak",
};

export function isNavItemActive(pathname: string, item: NavItem): boolean {
  return item.matchPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
