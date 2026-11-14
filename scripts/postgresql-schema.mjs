import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Keep one model definition while maintaining separate provider migrations.
export function preparePostgresqlSchema() {
  const source = readFileSync(
    new URL("../prisma/schema.prisma", import.meta.url),
    "utf8",
  );
  if (!source.includes('provider = "sqlite"'))
    throw new Error("Expected the canonical local SQLite schema.");
  const target = new URL("../prisma/postgresql/schema.prisma", import.meta.url);
  writeFileSync(
    target,
    source.replace('provider = "sqlite"', 'provider = "postgresql"'),
  );
  return fileURLToPath(target);
}
