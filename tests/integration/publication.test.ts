import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { PrismaClient } from "@prisma/client";
import { mkdtempSync, rmSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { fixtureProjects } from "../../data/fixtures/projects";
import {
  seedProject,
  getDraft,
  saveProject,
  transitionProject,
  publishedProject,
  createProject,
} from "../../src/lib/db/projects";
const folder = mkdtempSync(join(tmpdir(), "civictrace-test-"));
const path = join(folder, "test.db");
const client = new PrismaClient({
  datasources: { db: { url: `file:${path}` } },
});
beforeAll(async () => {
  const sqlite = new DatabaseSync(path);
  for (const migration of readdirSync("prisma/migrations")
    .filter((name) => /^\d/.test(name))
    .sort()) {
    sqlite.exec(
      readFileSync(`prisma/migrations/${migration}/migration.sql`, "utf8"),
    );
  }
  sqlite.close();
  for (const p of fixtureProjects) await seedProject(p, client);
});
afterAll(async () => {
  await client.$disconnect();
  rmSync(folder, { recursive: true, force: true });
});
describe.sequential("persistent draft and publication workflow", () => {
  it("preserves drafts and old resident snapshots across client reconnects", async () => {
    const draft = (await getDraft("cedar-quarter", client))!;
    const old = await publishedProject(draft.id, client);
    draft.summary = "A revised explanation, saved privately for review.";
    const saved = await saveProject(draft, client);
    expect(saved.reviewStatus).toBe("Draft");
    expect((await publishedProject(draft.id, client))?.summary).toBe(
      old?.summary,
    );
    await client.$disconnect();
    const reconnect = new PrismaClient({
      datasources: { db: { url: `file:${path}` } },
    });
    try {
      expect((await getDraft(draft.id, reconnect))?.summary).toBe(
        draft.summary,
      );
    } finally {
      await reconnect.$disconnect();
    }
  });
  it("persists changes for an independent process", () => {
    const output = execFileSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        'import {PrismaClient} from "@prisma/client"; const db=new PrismaClient(); const p=await db.project.findUnique({where:{id:"cedar-quarter"}}); process.stdout.write(p.summary); await db.$disconnect();',
      ],
      {
        encoding: "utf8",
        env: { ...process.env, DATABASE_URL: `file:${path}` },
      },
    );
    expect(output).toBe("A revised explanation, saved privately for review.");
  });
  it("rejects stale edits and skipping review stages", async () => {
    const draft = (await getDraft("cedar-quarter", client))!;
    await expect(
      saveProject({ ...draft, revision: draft.revision - 1 }, client),
    ).rejects.toThrow("another session");
    await expect(
      transitionProject(
        draft.id,
        draft.revision,
        "publish",
        "Reviewed.",
        client,
      ),
    ).rejects.toThrow("Verified stage");
  });
  it("publishes only after review and verification, then synchronizes the public record", async () => {
    let draft = (await getDraft("cedar-quarter", client))!;
    draft = await transitionProject(
      draft.id,
      draft.revision,
      "review",
      "Reviewed summary, source, and conditions.",
      client,
    );
    draft = await transitionProject(
      draft.id,
      draft.revision,
      "verify",
      "Evidence checked against the fictional passages.",
      client,
    );
    draft = await transitionProject(
      draft.id,
      draft.revision,
      "publish",
      "Approved internally consistent demonstration.",
      client,
    );
    const published = await publishedProject(draft.id, client);
    expect(published?.summary).toBe(draft.summary);
    expect(published?.reviewStatus).toBe("Published");
    expect(
      await client.reviewRecord.count({ where: { projectId: draft.id } }),
    ).toBeGreaterThan(3);
  });
  it("blocks verification of a draft with an unreviewed claim", async () => {
    let draft = (await getDraft("willow-street", client))!;
    draft.decisions[0].reviewState = "Needs Verification";
    draft = await saveProject(draft, client);
    draft = await transitionProject(
      draft.id,
      draft.revision,
      "review",
      "Needs source review.",
      client,
    );
    await expect(
      transitionProject(
        draft.id,
        draft.revision,
        "verify",
        "Attempt to bypass.",
        client,
      ),
    ).rejects.toThrow("Review the claim");
  });
  it("creates new draft records without exposing them publicly", async () => {
    const base = fixtureProjects[0];
    const draft = {
      ...structuredClone(base),
      id: "new-draft",
      sources: [],
      evidence: [],
      decisions: [],
      events: [],
      versions: [],
      feedback: [],
      opportunities: [],
      scopes: [],
      summaryEvidenceId: "",
    };
    const created = await createProject(draft, client);
    expect(created.reviewStatus).toBe("Draft");
    expect(await publishedProject(created.id, client)).toBeNull();
    await expect(createProject(draft, client)).rejects.toThrow(
      "already exists",
    );
  });
  it("does not overwrite staff edits when seeding again", async () => {
    const before = await getDraft("cedar-quarter", client);
    await seedProject(fixtureProjects[0], client);
    expect(await getDraft("cedar-quarter", client)).toEqual(before);
  });
});
