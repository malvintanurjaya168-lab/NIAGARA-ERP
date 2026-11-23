import type { Role } from "@/lib/roles";

export interface ShellUser {
  id: string;
  fullName: string;
  email: string;
  role: Role;
}

export interface ShellCompany {
  name: string;
  businessType: string | null;
}

export interface ShellAlert {
  id: string;
  name: string;
  sku: string;
  unit: string;
  stock: number;
  minimum: number;
}
