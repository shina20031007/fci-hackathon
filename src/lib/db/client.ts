import { PrismaClient } from "@prisma/client";
const globalDb = globalThis as unknown as { civicDb?: PrismaClient };
const databaseUrl =
  process.env.DATABASE_URL ??
  process.env.DATABASE_URL_POOLED ??
  process.env.POSTGRES_URL;
export const db =
  globalDb.civicDb ??
  new PrismaClient(
    databaseUrl ? { datasources: { db: { url: databaseUrl } } } : undefined,
  );
if (process.env.NODE_ENV !== "production") globalDb.civicDb = db;
