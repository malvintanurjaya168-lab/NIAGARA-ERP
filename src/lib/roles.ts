export const ROLES = [
  "OWNER",
  "MANAGER",
  "INVENTORY_STAFF",
  "CASHIER",
  "FINANCE",
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  OWNER: "Pemilik",
  MANAGER: "Manajer",
  INVENTORY_STAFF: "Staf Inventaris",
  CASHIER: "Kasir",
  FINANCE: "Keuangan",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  OWNER: "Akses penuh ke seluruh modul dan pengaturan perusahaan.",
  MANAGER: "Operasional, penjualan, dan laporan keuangan.",
  INVENTORY_STAFF: "Produk, stok masuk/keluar, dan riwayat pergerakan.",
  CASHIER: "Point of Sale dan riwayat transaksi pribadi.",
  FINANCE: "Dasbor, transaksi, dan laporan keuangan.",
};

export const PERMISSIONS = [
  "dashboard.view",
  "inventory.view",
  "inventory.manage",
  "inventory.movements",
  "pos.use",
  "sales.view",
  "sales.viewAll",
  "sales.void",
  "reports.view",
  "users.manage",
  "settings.manage",
  "costs.view",
  "accounts.view",
  "accounts.manage",
  "warehouses.view",
  "warehouses.manage",
  "transfers.view",
  "transfers.manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ALL_PERMISSIONS: Permission[] = [...PERMISSIONS];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  OWNER: ALL_PERMISSIONS,
  MANAGER: [
    "dashboard.view",
    "inventory.view",
    "inventory.manage",
    "inventory.movements",
    "pos.use",
    "sales.view",
    "sales.viewAll",
    "sales.void",
    "reports.view",
    "costs.view",
    "accounts.view",
    "warehouses.view",
    "warehouses.manage",
    "transfers.view",
    "transfers.manage",
  ],
  INVENTORY_STAFF: [
    "inventory.view",
    "inventory.manage",
    "inventory.movements",
    "costs.view",
    "warehouses.view",
    "transfers.view",
    "transfers.manage",
  ],
  CASHIER: ["pos.use", "sales.view"],
  FINANCE: [
    "dashboard.view",
    "sales.view",
    "sales.viewAll",
    "reports.view",
    "costs.view",
    "accounts.view",
    "transfers.view",
  ],
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export function can(role: Role | string | undefined, permission: Permission): boolean {
  if (!role || !isRole(role)) return false;
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function canAny(role: Role | string | undefined, permissions: Permission[]): boolean {
  return permissions.some((permission) => can(role, permission));
}

export function landingPathForRole(role: Role): string {
  if (can(role, "dashboard.view")) return "/dashboard";
  if (can(role, "inventory.view")) return "/inventory";
  if (can(role, "pos.use")) return "/pos";
  if (can(role, "sales.view")) return "/sales";
  return "/unauthorized";
}
