import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Prisma CLI configuration.
 *
 * The CLI uses DIRECT_URL (session pooler / direct connection) so migrations
 * can run. The application runtime uses DATABASE_URL through the pg driver
 * adapter (see src/lib/prisma.ts).
 *
 * The URLs are intentionally optional here so that offline commands such as
 * `prisma validate` and `prisma generate` work before a Supabase project has
 * been provisioned. Commands that need a database will fail with a clear
 * connection error until `.env` is configured.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
});
