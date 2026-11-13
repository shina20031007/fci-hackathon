import {
  existsSync,
  mkdirSync,
  rmSync,
  readFileSync,
  readdirSync,
} from "node:fs";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { execFileSync } from "node:child_process";
function setup() {
  const folder = resolve(".test-data");
  mkdirSync(folder, { recursive: true });
  const file = resolve(folder, "e2e.db");
  if (existsSync(file)) rmSync(file);
  const sqlite = new DatabaseSync(file);
  for (const migration of readdirSync("prisma/migrations")
    .filter((name) => /^\d/.test(name))
    .sort()) {
    sqlite.exec(
      readFileSync(`prisma/migrations/${migration}/migration.sql`, "utf8"),
    );
  }
  sqlite.close();
  execFileSync(process.execPath, ["--import", "tsx", "prisma/seed.ts"], {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: `file:${file}` },
  });
}

setup();
