import { beforeAll, afterAll, describe, it, expect, vi } from "vitest";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { PrismaClient } from "@prisma/client";
import { fieldNames } from "../../src/features/admin/types/extraction";
const mocked = vi.hoisted(() => ({
  create: vi.fn(),
  client: null as unknown as PrismaClient,
}));
vi.mock("openai", () => ({
  default: class MockOpenAI {
    static APIError = class extends Error {};
    responses = { create: mocked.create };
  },
}));
vi.mock("../../src/lib/db/client", () => ({
  get db() {
    return mocked.client;
  },
}));
vi.mock("../../src/features/admin/services/auth", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("../../src/features/admin/services/auth")
  >()),
  authorize: async () => "staff@example.invalid",
}));
const folder = mkdtempSync(join(tmpdir(), "cityora-ai-test-"));
const file = join(folder, "test.db");
beforeAll(() => {
  const sqlite = new DatabaseSync(file);
  for (const migration of readdirSync("prisma/migrations")
    .filter((n) => /^\d/.test(n))
    .sort())
    sqlite.exec(
      readFileSync(`prisma/migrations/${migration}/migration.sql`, "utf8"),
    );
  sqlite.close();
  mocked.client = new PrismaClient({
    datasources: { db: { url: `file:${file}` } },
  });
  vi.stubEnv("OPENAI_API_KEY", "mock-key-never-sent");
  vi.stubEnv("OPENAI_MODEL", "test-model");
});
afterAll(async () => {
  await mocked.client.$disconnect();
  rmSync(folder, { recursive: true, force: true });
  vi.unstubAllEnvs();
});
describe("persisted AI analysis with a mocked provider (no real requests)", () => {
  it("retains raw output and usage, withholds unsupported facts, creates only a draft, and reuses the cache", async () => {
    const fields = fieldNames.map((name) => ({
      name,
      value: null as string | null,
      page: null as number | null,
      quote: null as string | null,
    }));
    fields[0] = {
      name: "title",
      value: "Official test report",
      page: 1,
      quote: "Official test report",
    };
    fields[1] = {
      name: "municipality",
      value: "Invented city",
      page: 1,
      quote: "This quote is absent",
    };
    mocked.create.mockResolvedValue({
      status: "completed",
      output_text: JSON.stringify({ fields, events: [], warnings: [] }),
      model: "test-model",
      _request_id: "test-request",
      usage: { input_tokens: 100, output_tokens: 50, total_tokens: 150 },
    });
    const doc = await mocked.client.documentImport.create({
      data: {
        filename: "test.pdf",
        pages: JSON.stringify([
          {
            page: 1,
            text: "Official test report. Council has not made a decision.",
          },
        ]),
        uploadedBy: "staff@example.invalid",
        status: "Extracted",
        mediaType: "application/pdf",
        sourceUrl: "https://www.toronto.ca/test.pdf",
      },
    });
    const { analyzeDocument } =
      await import("../../src/features/admin/services/analysis");
    await expect(
      analyzeDocument(doc.id, "other@example.invalid"),
    ).rejects.toThrow("explicitly uploaded");
    expect(mocked.create).not.toHaveBeenCalled();
    const id = await analyzeDocument(doc.id, "staff@example.invalid");
    const saved = await mocked.client.documentImport.findUniqueOrThrow({
      where: { id: doc.id },
    });
    expect(saved.rawResponse).toContain("Invented city");
    expect(saved.requestId).toBe("test-request");
    expect(JSON.parse(saved.extraction!).fields[1].value).toBeNull();
    expect(JSON.parse(saved.usage!).total_tokens).toBe(150);
    expect(
      (await mocked.client.project.findUniqueOrThrow({ where: { id } }))
        .reviewStatus,
    ).toBe("Draft");
    expect(await mocked.client.publication.count()).toBe(0);
    expect(await analyzeDocument(doc.id, "staff@example.invalid")).toBe(id);
    expect(mocked.create).toHaveBeenCalledTimes(1);
    const { POST } =
      await import("../../src/app/api/admin/documents/[id]/review/route");
    const { digest } = await import("../../src/features/admin/services/auth");
    const { getDraft, transitionProject } =
      await import("../../src/lib/db/projects");
    const review = (body: Record<string, unknown>) =>
      POST(
        new Request("http://localhost/api/admin/documents/review", {
          method: "POST",
          body: JSON.stringify(body),
          headers: { "content-type": "application/json" },
        }),
        { params: Promise.resolve({ id: doc.id }) },
      );
    const expectedHash = digest(saved.extraction!);
    expect(
      (
        await review({
          action: "correct",
          field: "title",
          value: "Reviewed report",
          page: 1,
          quote: "Invented unsupported passage",
          expectedHash,
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await review({
          action: "correct",
          field: "title",
          value: "Reviewed report",
          page: 1,
          quote: "Official test report",
          expectedHash,
        })
      ).status,
    ).toBe(200);
    const pending = await mocked.client.documentImport.findUniqueOrThrow({
      where: { id: doc.id },
    });
    expect(pending.status).toBe("Corrections pending");
    await expect(
      analyzeDocument(doc.id, "staff@example.invalid"),
    ).rejects.toThrow("pending citation corrections");
    expect(pending.rawResponse).toBe(saved.rawResponse);
    expect(
      (await review({ action: "unverified", field: "title", expectedHash }))
        .status,
    ).toBe(400);
    const draft = (await getDraft(id))!;
    const submitted = await transitionProject(
      id,
      draft.revision,
      "review",
      "Pending correction gate test",
    );
    await expect(
      transitionProject(
        id,
        submitted.revision,
        "verify",
        "Must not bypass pending corrections",
      ),
    ).rejects.toThrow("pending document corrections");
    expect(
      (
        await review({
          action: "apply",
          expectedHash: digest(pending.extraction!),
        })
      ).status,
    ).toBe(200);
    expect((await getDraft(id))!.title).toBe("Reviewed report");
    expect(
      (
        await mocked.client.documentImport.findUniqueOrThrow({
          where: { id: doc.id },
        })
      ).originalProject,
    ).toBe(saved.originalProject);
    expect((await getDraft(id))!.reviewStatus).toBe("Draft");
    expect(mocked.create).toHaveBeenCalledTimes(1);
    await mocked.client.project.update({
      where: { id },
      data: { archivedAt: new Date() },
    });
    await expect(
      analyzeDocument(doc.id, "staff@example.invalid"),
    ).rejects.toThrow("Restore this project");
    expect(mocked.create).toHaveBeenCalledTimes(1);
    await mocked.client.project.update({
      where: { id },
      data: { archivedAt: null, agendaItem: "2024.EX11.8" },
    });
    await mocked.client.documentImport.update({
      where: { id: doc.id },
      data: { status: "Failed" },
    });
    expect(await analyzeDocument(doc.id, "staff@example.invalid")).toBe(id);
    expect(mocked.create).toHaveBeenCalledTimes(1);
    expect(
      (await mocked.client.project.findUniqueOrThrow({ where: { id } }))
        .agendaItem,
    ).toBe("2024.EX11.8");
    expect(await mocked.client.publication.count()).toBe(0);
  });
});
