import { NextResponse } from "next/server";
import { authorize } from "@/features/admin/services/auth";
import {
  syncOfficial,
  createOfficialDraft,
  agendaNumber,
} from "@/features/admin/services/official-data";
import { db } from "@/lib/db/client";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    const staff = await authorize(request);
    const body = await request.json();
    if (body.action === "create")
      return NextResponse.json({
        projectId: await createOfficialDraft(
          body.agendaItem,
          body.category,
          staff,
        ),
      });
    if (body.action === "agenda") {
      if (agendaNumber(body.agendaItem) !== body.agendaItem)
        throw new Error("Use an exact official agenda item number.");
      await db.$transaction(async (tx) => {
        const result = await tx.project.updateMany({
          where: {
            id: body.projectId,
            revision: body.revision,
            deletedAt: null,
            archivedAt: null,
          },
          data: { agendaItem: body.agendaItem, revision: { increment: 1 } },
        });
        if (!result.count)
          throw new Error("Project changed. Reload before linking.");
        await tx.reviewRecord.create({
          data: {
            projectId: body.projectId,
            revision: body.revision + 1,
            action: "Agenda number edited",
            note: `${body.agendaItem} set by ${staff}; dataset links still require confirmation.`,
          },
        });
      });
      return NextResponse.json({ ok: true });
    }
    if (body.action === "link") {
      const project = await db.project.findUniqueOrThrow({
        where: { id: body.projectId },
      });
      const record = await db.officialRecord.findUniqueOrThrow({
        where: { id: body.recordId },
      });
      if (!project.agendaItem || record.agendaItem !== project.agendaItem)
        throw new Error(
          "Agenda numbers do not match. Confirm the project item number first.",
        );
      await db.officialRecord.update({
        where: { id: record.id },
        data: { projectId: project.id, confirmedBy: staff },
      });
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json(await syncOfficial(body.agendaItem));
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Official data import failed.",
      },
      { status: 400 },
    );
  }
}
