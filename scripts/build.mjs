import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { preparePostgresqlSchema } from "./postgresql-schema.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const prisma = fileURLToPath(
  new URL("../node_modules/prisma/build/index.js", import.meta.url),
);
const run = (args, env = process.env) =>
  execFileSync(process.execPath, args, { cwd: root, stdio: "inherit", env });

if (process.env.VERCEL === "1") {
  process.env.DATABASE_URL ??=
    process.env.DATABASE_URL_POOLED ?? process.env.POSTGRES_URL;
  if (
    !/^(postgres(?:ql)?:\/\/|prisma\+postgres:\/\/)/.test(
      process.env.DATABASE_URL ?? "",
    )
  )
    throw new Error(
      "Configure a persistent PostgreSQL DATABASE_URL for this Vercel environment.",
    );
  const schema = preparePostgresqlSchema();
  run([prisma, "generate", "--schema", schema]);
  run([prisma, "migrate", "deploy", "--schema", schema], {
    ...process.env,
    DATABASE_URL: process.env.POSTGRES_URL ?? process.env.DATABASE_URL,
  });
  // Only reviewed public snapshots belong in a new cloud database.
  run(["--import", "tsx", "prisma/seed.ts"], {
    ...process.env,
    SEED_PUBLIC_ONLY: "true",
  });
} else {
  run([prisma, "generate"]);
}
run([
  fileURLToPath(new URL("../node_modules/next/dist/bin/next", import.meta.url)),
  "build",
  "--webpack",
]);
