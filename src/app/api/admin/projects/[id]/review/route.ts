import { NextResponse } from "next/server";
import { authorize } from "@/features/admin/services/auth";
import { reviewFields, fieldHash } from "@/features/admin/services/review";
import { getDraft } from "@/lib/db/projects";
import { db } from "@/lib/db/client";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const staff = await authorize(request);
    const { id } = await params;
    const body = await request.json();
    const field = reviewFields.find((f) => f === body.field);
    if (!field) throw new Error("Unknown review field.");
    const project = await getDraft(id);
    if (!project || project.revision !== body.revision)
      throw new Error("Draft changed. Reload before reviewing.");
    await db.$transaction(async (tx) => {
      const row = await tx.project.findUniqueOrThrow({ where: { id } });
      if (row.revision !== project.revision || row.deletedAt || row.archivedAt)
        throw new Error("Project changed or is inactive.");
      if (body.verified === true && field === "evidence") {
        if (
          project.evidence.some(
            (e) =>
              !project.sources.some(
                (s) =>
                  s.id === e.sourceId &&
                  (project.synthetic ? s.synthetic : !s.synthetic && !!s.url),
              ),
          )
        )
          throw new Error(
            "Add an official source URL for each evidence item before verifying.",
          );
        const verifiedAt = new Date().toISOString();
        const state = project.synthetic
          ? "Requires Verification"
          : "Officially Confirmed";
        await tx.evidence.updateMany({
          where: { projectId: id },
          data: { state, verifiedAt },
        });
        project.evidence = project.evidence.map((e) => ({
          ...e,
          state,
          verifiedAt,
        }));
      }
      if (body.verified === true && field === "decisions") {
        await tx.decisionItem.updateMany({
          where: { projectId: id },
          data: { reviewState: "Verified" },
        });
        project.decisions = project.decisions.map((d) => ({
          ...d,
          reviewState: "Verified",
        }));
      }
      if (body.verified === true)
        await tx.fieldReview.upsert({
          where: { projectId_field: { projectId: id, field } },
          create: {
            projectId: id,
            field,
            valueHash: fieldHash(project, field),
            reviewer: staff,
          },
          update: {
            valueHash: fieldHash(project, field),
            reviewer: staff,
            reviewedAt: new Date(),
          },
        });
      else await tx.fieldReview.deleteMany({ where: { projectId: id, field } });
      await tx.project.update({
        where: { id },
        data: {
          reviewStatus: "Draft",
          verifiedAt: null,
          revision: { increment: 1 },
        },
      });
      await tx.reviewRecord.create({
        data: {
          projectId: id,
          revision: project.revision + 1,
          action: body.verified ? "Field verified" : "Field unverified",
          note: `${field} reviewed by ${staff}`,
          snapshot: JSON.stringify(project),
        },
      });
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Review failed." },
      { status: 400 },
    );
  }
}
