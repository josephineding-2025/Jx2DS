import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Use direct (non-pooled) URL for migrations to avoid pgbouncer issues
    url: process.env["DATABASE_URL"] ?? process.env["DIRECT_URL"]!,
  },
});
