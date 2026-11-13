import { closeSync, existsSync, openSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
if (existsSync(resolve(root, ".env")))
  process.loadEnvFile(resolve(root, ".env"));
process.env.DATABASE_URL ??= "file:./dev.db";
if (!process.env.DATABASE_URL.startsWith("file:"))
  throw new Error("Local migration requires a SQLite file URL.");
const database = resolve(root, "prisma", process.env.DATABASE_URL.slice(5));
// Prisma 6's SQLite engine requires the empty file to exist on this runtime.
closeSync(openSync(database, "a"));
execFileSync(
  process.execPath,
  [resolve(root, "node_modules/prisma/build/index.js"), "migrate", "deploy"],
  { cwd: root, stdio: "inherit", env: process.env },
);
