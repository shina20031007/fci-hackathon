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

describe.sequential(
  "authenticated admin review and lifecycle persistence",
  () => {
    it("requires field review, invalidates edits, retains publication history and supports delete/restore/archive", async () => {
      const { changeLifecycle } =
        await import("../../src/features/admin/services/lifecycle");
      const { reviewFields, fieldHash } =
        await import("../../src/features/admin/services/review");
      const original = structuredClone(fixtureProjects[0]);
      const ids = new Set([
        original.id,
        ...[
          original.sources,
          original.evidence,
          original.decisions,
          original.events,
          original.versions,
          original.feedback,
          original.opportunities,
          original.scopes,
        ]
          .flat()
          .map((r) => r.id),
      ]);
      const input = JSON.parse(JSON.stringify(original), (_key, value) =>
        typeof value === "string" && ids.has(value)
          ? "admin-test-" + value
          : value,
      );
      let draft = await createProject(input, client);
      draft = await transitionProject(
        draft.id,
        draft.revision,
        "review",
        "Test review",
        client,
      );
      await expect(
        transitionProject(
          draft.id,
          draft.revision,
          "verify",
          "Cannot bypass",
          client,
        ),
      ).rejects.toThrow("every critical field");
      async function verifyFields() {
        for (const field of reviewFields)
          await client.fieldReview.upsert({
            where: { projectId_field: { projectId: draft.id, field } },
            create: {
              projectId: draft.id,
              field,
              valueHash: fieldHash(draft, field),
              reviewer: "test@example.invalid",
            },
            update: { valueHash: fieldHash(draft, field) },
          });
      }
      await verifyFields();
      draft = await transitionProject(
        draft.id,
        draft.revision,
        "verify",
        "Verified fixture",
        client,
      );
      draft = await transitionProject(
        draft.id,
        draft.revision,
        "publish",
        "Publish fixture",
        client,
      );
      const old = (await publishedProject(draft.id, client))!;
      draft = await saveProject(
        { ...draft, summary: draft.summary + " Edited test summary." },
        client,
      );
      draft = await transitionProject(
        draft.id,
        draft.revision,
        "review",
        "Re-review",
        client,
      );
      await expect(
        transitionProject(
          draft.id,
          draft.revision,
          "verify",
          "Stale field checks",
          client,
        ),
      ).rejects.toThrow("every critical field");
      expect((await publishedProject(draft.id, client))!.summary).toBe(
        old.summary,
      );
      await verifyFields();
      draft = await transitionProject(
        draft.id,
        draft.revision,
        "verify",
        "Reverified fixture",
        client,
      );
      draft = await transitionProject(
        draft.id,
        draft.revision,
        "publish",
        "Republish fixture",
        client,
      );
      const history = await client.reviewRecord.findFirst({
        where: { projectId: draft.id, action: "Previous publication retained" },
      });
      expect(JSON.parse(history!.snapshot!).summary).toBe(old.summary);
      await changeLifecycle(
        draft.id,
        draft.revision,
        "delete",
        "test@example.invalid",
        client,
      );
      expect(await publishedProject(draft.id, client)).toBeNull();
      expect(
        await client.publication.count({ where: { projectId: draft.id } }),
      ).toBe(1);
      await expect(
        changeLifecycle(
          draft.id,
          draft.revision,
          "restore",
          "test@example.invalid",
          client,
        ),
      ).rejects.toThrow("changed");
      await changeLifecycle(
        draft.id,
        draft.revision + 1,
        "restore",
        "test@example.invalid",
        client,
      );
      expect(await publishedProject(draft.id, client)).not.toBeNull();
      await changeLifecycle(
        draft.id,
        draft.revision + 2,
        "archive",
        "test@example.invalid",
        client,
      );
      expect(await publishedProject(draft.id, client)).toBeNull();
      const archived = await client.project.findUniqueOrThrow({
        where: { id: draft.id },
      });
      expect(archived.deletedAt).toBeNull();
      expect(archived.archivedAt).not.toBeNull();
      expect(await publishedProject("cedar-quarter", client)).not.toBeNull();
    });
  },
);
