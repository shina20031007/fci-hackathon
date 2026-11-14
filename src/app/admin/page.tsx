import { requireStaff, digest } from "@/features/admin/services/auth";
import { aiConfigured } from "@/features/admin/services/analysis";
import { AdminPortal } from "@/features/admin/components/admin-portal";
import { db } from "@/lib/db/client";
import { getDraft } from "@/lib/db/projects";
import { reviewFields, fieldHash } from "@/features/admin/services/review";
async function markInterruptedImports() {
  await db.documentImport.updateMany({
    where: {
      status: { in: ["Analyzing", "Extracting"] },
      startedAt: { lt: new Date(Date.now() - 180000) },
    },
    data: {
      status: "Interrupted",
      error:
        "Processing was interrupted. No automatic AI retry was made. Check request usage before retrying.",
    },
  });
}
export const dynamic = "force-dynamic";
export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    document?: string;
    project?: string;
    section?: string;
    officialAgenda?: string;
  }>;
}) {
  const staff = await requireStaff();
  const params = await searchParams;
  await markInterruptedImports();
  const [projects, imports, official, project] = await Promise.all([
    db.project.findMany({
      select: {
        id: true,
        title: true,
        category: true,
        revision: true,
        reviewStatus: true,
        deletedAt: true,
        archivedAt: true,
        agendaItem: true,
      },
      orderBy: { updatedAt: "desc" },
    }),
    db.documentImport.findMany({
      select: {
        id: true,
        filename: true,
        status: true,
        error: true,
        projectId: true,
        model: true,
        usage: true,
        costUsd: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.officialRecord.findMany({
      where: params.officialAgenda
        ? { agendaItem: params.officialAgenda }
        : undefined,
      orderBy: { fetchedAt: "desc" },
      take: 500,
    }),
    params.project ? getDraft(params.project) : null,
  ]);
  const document = params.document
    ? await db.documentImport.findUnique({
        where: { id: params.document },
        select: {
          id: true,
          filename: true,
          pages: true,
          extraction: true,
          rawResponse: true,
          status: true,
          error: true,
          sourceUrl: true,
          projectId: true,
          mediaType: true,
        },
      })
    : null;
  const checks = project
    ? await db.fieldReview.findMany({ where: { projectId: project.id } })
    : [];
  const imported = project
    ? await db.documentImport.findFirst({
        where: { projectId: project.id },
        select: {
          id: true,
          filename: true,
          extraction: true,
          originalProject: true,
          sourceUrl: true,
        },
      })
    : null;
  return (
    <AdminPortal
      key={`${params.project ?? params.document ?? params.tab ?? "projects"}:${project?.revision ?? ""}`}
      initialSection={params.section}
      staff={staff}
      configured={aiConfigured()}
      tab={params.tab ?? "projects"}
      projects={projects.map((p) => ({
        ...p,
        deletedAt: p.deletedAt?.toISOString() ?? null,
        archivedAt: p.archivedAt?.toISOString() ?? null,
      }))}
      imports={imports.map((p) => ({
        ...p,
        createdAt: p.createdAt.toISOString(),
      }))}
      official={official.map((r) => ({
        ...r,
        fetchedAt: r.fetchedAt.toISOString(),
      }))}
      document={
        document
          ? {
              ...document,
              extractionHash: document.extraction
                ? digest(document.extraction)
                : null,
            }
          : null
      }
      project={project}
      imported={imported}
      checks={checks.map((c) => ({
        field: c.field,
        reviewer: c.reviewer,
        reviewedAt: c.reviewedAt.toISOString(),
        valid:
          !!project &&
          reviewFields.includes(c.field as (typeof reviewFields)[number]) &&
          c.valueHash ===
            fieldHash(project, c.field as (typeof reviewFields)[number]),
      }))}
    />
  );
}
