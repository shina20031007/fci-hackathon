import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import publishedRecords from "../../data/published/projects.json";
import { publishedProject } from "../../src/lib/db/projects";

const folder = mkdtempSync(join(tmpdir(), "cityora-published-seed-"));
const path = join(folder, "test.db");
const client = new PrismaClient({
  datasources: { db: { url: `file:${path}` } },
});

function runSeed() {
  execFileSync(process.execPath, ["--import", "tsx", "prisma/seed.ts"], {
    env: { ...process.env, DATABASE_URL: `file:${path}` },
    stdio: "pipe",
  });
}

afterAll(async () => {
  await client.$disconnect();
  rmSync(folder, { recursive: true, force: true });
});

describe("portable published project seed", () => {
  it("restores complete public snapshots on a fresh database and preserves edits on rerun", async () => {
    const sqlite = new DatabaseSync(path);
    for (const migration of readdirSync("prisma/migrations")
      .filter((name) => /^\d/.test(name))
      .sort())
      sqlite.exec(
        readFileSync(`prisma/migrations/${migration}/migration.sql`, "utf8"),
      );
    sqlite.close();

    runSeed();
    for (const record of publishedRecords) {
      const publication = await client.publication.findUniqueOrThrow({
        where: { projectId: record.projectId },
      });
      expect(JSON.parse(publication.snapshot)).toEqual(record.snapshot);
      expect(publication.revision).toBe(record.revision);
      expect(publication.publishedAt.toISOString()).toBe(record.publishedAt);
      expect(await publishedProject(record.projectId, client)).not.toBeNull();
    }
    expect(
      (
        await client.project.findUniqueOrThrow({
          where: { id: "toronto-2024-ex11-8" },
        })
      ).agendaItem,
    ).toBe("2024.EX11.8");
    const overview = await publishedProject("toronto-2024-ex11-8", client);
    expect(overview?.decisions.length).toBeGreaterThan(0);
    expect(overview?.events.length).toBeGreaterThan(0);
    for (const id of [
      "rapidto-bathurst",
      "rapidto-dufferin",
      "rapidto-eglinton-east",
      "rapidto-jane",
    ]) {
      const corridor = await publishedProject(id, client);
      expect(corridor?.scopes.length).toBeGreaterThan(0);
      expect(corridor?.events.length).toBeGreaterThan(0);
    }

    const projectCount = await client.project.count();
    const publicationCount = await client.publication.count();
    const editedSummary = "A teammate's manually edited local draft.";
    await client.project.update({
      where: { id: "cedar-quarter" },
      data: { summary: editedSummary },
    });
    runSeed();
    expect(await client.project.count()).toBe(projectCount);
    expect(await client.publication.count()).toBe(publicationCount);
    expect(
      (
        await client.project.findUniqueOrThrow({
          where: { id: "cedar-quarter" },
        })
      ).summary,
    ).toBe(editedSummary);
  }, 60_000);
});
