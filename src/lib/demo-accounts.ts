import type { Role } from "@/lib/roles";

export interface DemoAccount {
  role: Role;
  email: string;
  password: string;
  label: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    role: "OWNER",
    email: "owner@niagara.demo",
    password: "Owner#2026",
    label: "Pemilik",
  },
  {
    role: "MANAGER",
    email: "manager@niagara.demo",
    password: "Manager#2026",
    label: "Manajer",
  },
  {
    role: "INVENTORY_STAFF",
    email: "inventory@niagara.demo",
    password: "Inventory#2026",
    label: "Staf Inventaris",
  },
  {
    role: "CASHIER",
    email: "cashier@niagara.demo",
    password: "Cashier#2026",
    label: "Kasir",
  },
  {
    role: "FINANCE",
    email: "finance@niagara.demo",
    password: "Finance#2026",
    label: "Keuangan",
  },
];
