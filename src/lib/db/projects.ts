import { reviewFields, fieldHash } from "@/features/admin/services/review";
import { Prisma, type PrismaClient } from "@prisma/client";
import { db } from "./client";
import { projectSchema, type CivicProject } from "@/lib/validation/project";
import { publicationIssues } from "@/lib/evidence/policy";
import { invalidateChangedReviews } from "@/lib/evidence/invalidation";
const include = {
  municipality: true,
  sources: true,
  evidence: true,
  decisions: { include: { evidence: true } },
  events: true,
  versions: true,
  feedback: true,
  opportunities: true,
  scopes: true,
} satisfies Prisma.ProjectInclude;
export class WorkflowError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export async function getDraft(
  id: string,
  client: PrismaClient = db,
): Promise<CivicProject | null> {
  const row = await client.project.findUnique({ where: { id }, include });
  if (!row) return null;
  return projectSchema.parse({
    ...row,
    municipality: row.municipality.name,
    updatedAt: row.updatedAt.toISOString(),
    decisions: row.decisions.map((d) => ({
      ...d,
      evidenceIds: d.evidence.map((e) => e.id),
    })),
    scopes: row.scopes.map((s) => ({ ...s, geometry: JSON.parse(s.geometry) })),
  });
}
export async function publishedProjects(
  client: PrismaClient = db,
): Promise<CivicProject[]> {
  const rows = await client.publication.findMany({
    where: { project: { deletedAt: null, archivedAt: null } },
    orderBy: { publishedAt: "desc" },
  });
  return rows.map((r) => projectSchema.parse(JSON.parse(r.snapshot)));
}
export async function publishedProject(
  id: string,
  client: PrismaClient = db,
): Promise<CivicProject | null> {
  const row = await client.publication.findFirst({
    where: { projectId: id, project: { deletedAt: null, archivedAt: null } },
  });
  return row ? projectSchema.parse(JSON.parse(row.snapshot)) : null;
}
export async function studioProjects() {
  return db.project.findMany({
    select: {
      id: true,
      title: true,
      reviewStatus: true,
      revision: true,
      synthetic: true,
      updatedAt: true,
      publication: { select: { revision: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}
async function writeRecords(tx: Prisma.TransactionClient, p: CivicProject) {
  const municipality = await tx.municipality.upsert({
    where: { name: p.municipality },
    create: { id: crypto.randomUUID(), name: p.municipality },
    update: {},
  });
  const {
    sources,
    evidence,
    decisions,
    events,
    versions,
    feedback,
    opportunities,
    scopes,
    municipality: _municipality,
    updatedAt: _updatedAt,
    ...fields
  } = p;
  void _municipality;
  void _updatedAt;
  await tx.project.upsert({
    where: { id: p.id },
    create: { ...fields, municipalityId: municipality.id },
    update: { ...fields, municipalityId: municipality.id },
  });
  // Remove dependents first; the transaction preserves a complete, consistent draft.
  await tx.geographicScope.deleteMany({ where: { projectId: p.id } });
  await tx.participationWindow.deleteMany({ where: { projectId: p.id } });
  await tx.publicFeedbackTheme.deleteMany({ where: { projectId: p.id } });
  await tx.documentVersion.deleteMany({ where: { projectId: p.id } });
  await tx.decisionEvent.deleteMany({ where: { projectId: p.id } });
  await tx.decisionItem.deleteMany({ where: { projectId: p.id } });
  await tx.evidence.deleteMany({ where: { projectId: p.id } });
  await tx.sourceDocument.deleteMany({ where: { projectId: p.id } });
  for (const s of sources)
    await tx.sourceDocument.create({ data: { ...s, projectId: p.id } });
  for (const e of evidence)
    await tx.evidence.create({ data: { ...e, projectId: p.id } });
  for (const { evidenceIds, ...d } of decisions)
    await tx.decisionItem.create({
      data: {
        ...d,
        projectId: p.id,
        evidence: { connect: evidenceIds.map((id) => ({ id })) },
      },
    });
  for (const e of events)
    await tx.decisionEvent.create({
      data: {
        ...e,
        status: e.status ?? "Not verified",
        position: e.position ?? 0,
        projectId: p.id,
      },
    });
  for (const v of versions)
    await tx.documentVersion.create({ data: { ...v, projectId: p.id } });
  for (const f of feedback)
    await tx.publicFeedbackTheme.create({ data: { ...f, projectId: p.id } });
  for (const o of opportunities)
    await tx.participationWindow.create({ data: { ...o, projectId: p.id } });
  for (const s of scopes)
    await tx.geographicScope.create({
      data: { ...s, geometry: JSON.stringify(s.geometry), projectId: p.id },
    });
}
export async function createProject(
  input: CivicProject,
  client: PrismaClient = db,
) {
  const p = projectSchema.parse({
    ...input,
    revision: 1,
    reviewStatus: "Draft",
    verifiedAt: null,
  });
  if (await client.project.findUnique({ where: { id: p.id } }))
    throw new WorkflowError("A project with this ID already exists.", 409);
  await client.$transaction(async (tx) => {
    await writeRecords(tx, p);
    await tx.project.update({
      where: { id: p.id },
      data: { reviewRequired: true },
    });
    await tx.reviewRecord.create({
      data: {
        projectId: p.id,
        revision: 1,
        action: "Created",
        note: "Draft created; publication requires separate review.",
      },
    });
  });
  return (await getDraft(p.id, client))!;
}
export async function saveProject(
  input: CivicProject,
  client: PrismaClient = db,
  staff = "System",
) {
  const parsed = projectSchema.parse(input);
  const previous = await getDraft(parsed.id, client);
  if (!previous) throw new WorkflowError("Project not found.", 404);
  const p = invalidateChangedReviews(previous, parsed);
  await client.$transaction(
    async (tx) => {
      const current = await tx.project.findUnique({ where: { id: p.id } });
      if (!current) throw new WorkflowError("Project not found.", 404);
      if (current.deletedAt || current.archivedAt)
        throw new WorkflowError("Restore this project before editing.", 409);
      if (current.revision !== p.revision)
        throw new WorkflowError(
          "This draft changed in another session. Reload before saving.",
          409,
        );
      if (current.synthetic !== p.synthetic)
        throw new WorkflowError(
          "A project's fictional/real designation cannot be changed.",
        );
      await writeRecords(tx, {
        ...p,
        revision: p.revision + 1,
        reviewStatus: "Draft",
        verifiedAt: null,
      });
      if (!p.synthetic)
        await tx.project.update({
          where: { id: p.id },
          data: { reviewRequired: true },
        });
      await tx.reviewRecord.create({
        data: {
          projectId: p.id,
          revision: p.revision + 1,
          action: "Saved draft",
          snapshot: JSON.stringify(previous),
          note: `Saved by ${staff}. Project-level approval reset; published snapshot unchanged.`,
        },
      });
    },
    { timeout: 15000 },
  );
  return (await getDraft(p.id, client))!;
}
export async function transitionProject(
  id: string,
  revision: number,
  action: "review" | "verify" | "publish",
  note: string,
  client: PrismaClient = db,
) {
  const draft = await getDraft(id, client);
  if (!draft) throw new WorkflowError("Project not found.", 404);
  if (draft.revision !== revision)
    throw new WorkflowError(
      "This draft changed in another session. Reload before continuing.",
      409,
    );
  const next = {
    review: "Needs Review",
    verify: "Verified",
    publish: "Published",
  } as const;
  const expected = {
    review: "Draft",
    verify: "Needs Review",
    publish: "Verified",
  } as const;
  if (draft.reviewStatus !== expected[action])
    throw new WorkflowError(
      `This action requires the ${expected[action]} stage.`,
    );
  if (action !== "review") {
    if (
      await client.documentImport.count({
        where: {
          projectId: id,
          status: { in: ["Corrections pending", "Analyzed", "Analyzing"] },
        },
      })
    )
      throw new WorkflowError(
        "Apply pending document corrections and review the updated draft before approval.",
      );
    const record = await client.project.findUniqueOrThrow({
      where: { id },
      include: { checks: true },
    });
    if (
      record.reviewRequired &&
      reviewFields.some(
        (field) =>
          !record.checks.some(
            (check) =>
              check.field === field &&
              check.valueHash === fieldHash(draft, field),
          ),
      )
    )
      throw new WorkflowError(
        "Complete Review & Verify for every critical field before approval or publication.",
      );
    const issues = publicationIssues(draft);
    if (issues.length) throw new WorkflowError(issues.join(" "));
  }
  if (!note.trim())
    throw new WorkflowError(
      "Add a reviewer note before changing the publication stage.",
    );
  const now = new Date().toISOString();
  const snapshot = {
    ...draft,
    reviewStatus: next[action],
    verifiedAt: action === "review" ? null : now,
    revision: revision + 1,
    updatedAt: now,
  };
  await client.$transaction(async (tx) => {
    const result = await tx.project.updateMany({
      where: { id, revision, deletedAt: null, archivedAt: null },
      data: {
        reviewStatus: next[action],
        verifiedAt: snapshot.verifiedAt,
        revision: { increment: 1 },
      },
    });
    if (result.count !== 1)
      throw new WorkflowError(
        "This draft changed in another session. Reload before continuing.",
        409,
      );
    if (action === "publish") {
      const previousPublication = await tx.publication.findUnique({
        where: { projectId: id },
      });
      if (previousPublication)
        await tx.reviewRecord.create({
          data: {
            projectId: id,
            revision: previousPublication.revision,
            action: "Previous publication retained",
            note: "Publication history",
            snapshot: previousPublication.snapshot,
          },
        });
      await tx.publication.upsert({
        where: { projectId: id },
        create: {
          projectId: id,
          snapshot: JSON.stringify(snapshot),
          revision: snapshot.revision,
        },
        update: {
          snapshot: JSON.stringify(snapshot),
          revision: snapshot.revision,
          publishedAt: new Date(),
        },
      });
    }
    await tx.reviewRecord.create({
      data: {
        projectId: id,
        revision: snapshot.revision,
        action: next[action],
        snapshot: JSON.stringify(snapshot),
        note,
      },
    });
  });
  return (await getDraft(id, client))!;
}
export async function seedProject(p: CivicProject, client: PrismaClient = db) {
  p = projectSchema.parse(p);
  if (await client.project.findUnique({ where: { id: p.id } })) return;
  const issues = publicationIssues(p);
  if (issues.length) throw new WorkflowError(issues.join(" "));
  await client.$transaction(
    async (tx) => {
      await writeRecords(tx, p);
      await tx.publication.create({
        data: {
          projectId: p.id,
          snapshot: JSON.stringify(p),
          revision: p.revision,
        },
      });
      await tx.reviewRecord.create({
        data: {
          projectId: p.id,
          revision: p.revision,
          action: p.synthetic
            ? "Published demonstration"
            : "Imported source-backed research",
          note: p.synthetic
            ? "Reproducible fictional fixture; internal consistency review only."
            : "Official sources inspected; factual summaries and explicit unknowns recorded. Independent municipal review remains required.",
        },
      });
    },
    { timeout: 15000 },
  );
}
