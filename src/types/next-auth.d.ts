import type { DefaultSession } from "next-auth";
import type { Role } from "@/lib/roles";

declare module "next-auth" {
  interface User {
    role: Role;
    companyId: string;
    companyName: string;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
      companyId: string;
      companyName: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: Role;
    companyId?: string;
    companyName?: string;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
    role?: Role;
    companyId?: string;
    companyName?: string;
  }
}
