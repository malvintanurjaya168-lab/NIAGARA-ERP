import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  niagaraPrisma?: PrismaClient;
};

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL belum dikonfigurasi. Salin .env.example menjadi .env dan isi connection string Supabase Anda.",
    );
  }

  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

/**
 * Lazy accessor so that importing this module (for example during the Next.js
 * build) never attempts to open a database connection.
 */
export function getPrisma(): PrismaClient {
  if (!globalForPrisma.niagaraPrisma) {
    globalForPrisma.niagaraPrisma = createPrismaClient();
  }
  return globalForPrisma.niagaraPrisma;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property, receiver) {
    const client = getPrisma();
    const value = Reflect.get(client as object, property, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
