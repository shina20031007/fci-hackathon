import { NextResponse } from "next/server";
import { authorize, digest } from "@/features/admin/services/auth";
import { db } from "@/lib/db/client";
import {
  extractionSchema,
  fieldNames,
  checkQuotes,
  type PageText,
} from "@/features/admin/types/extraction";
import { applyDocumentExtraction } from "@/features/admin/services/analysis";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const staff = await authorize(request);
    const { id } = await params;
    const body = await request.json();
    const document = await db.documentImport.findUniqueOrThrow({
      where: { id },
    });
    if (!document.extraction || !document.projectId)
      throw new Error("Analyze this document before reviewing citations.");
    const activeProject = await db.project.findUniqueOrThrow({
      where: { id: document.projectId },
    });
    if (activeProject.archivedAt || activeProject.deletedAt)
      throw new Error("Restore this project before reviewing citations.");
    if (digest(document.extraction) !== body.expectedHash)
      throw new Error("Extraction changed. Reload before editing.");
    if (body.action === "apply") {
      if (document.status !== "Corrections pending")
        throw new Error("There are no pending citation corrections.");
      const applied = await db.documentImport.updateMany({
        where: {
          id,
          status: "Corrections pending",
          extraction: document.extraction,
        },
        data: { status: "Analyzed" },
      });
      if (!applied.count)
        throw new Error("Extraction changed. Reload before applying.");
      return NextResponse.json({
        projectId: await applyDocumentExtraction(id, staff),
      });
    }
    const extraction = extractionSchema.parse(JSON.parse(document.extraction));
    const original = extractionSchema.parse(
      JSON.parse(document.rawResponse ?? document.extraction),
    );
    const pages = JSON.parse(document.pages) as PageText[];
    const value = typeof body.value === "string" ? body.value.trim() : "";
    const quote = typeof body.quote === "string" ? body.quote.trim() : "";
    const page = Number(body.page);
    if (
      body.action !== "unverified" &&
      (body.action !== "correct" ||
        !value ||
        value.length > 12000 ||
        quote.length > 12000 ||
        !Number.isInteger(page))
    )
      throw new Error(
        "Provide a value, a PDF page and an original source passage.",
      );
    const field = fieldNames.find((f) => f === body.field);
    if (field) {
      const row = extraction.fields.find((f) => f.name === field)!;
      Object.assign(
        row,
        body.action === "unverified"
          ? { value: null, quote: null, page: null }
          : { value, quote, page },
      );
    } else {
      const event = original.events[Number(body.event)];
      if (!event) throw new Error("Unknown citation.");
      extraction.events = extraction.events.filter(
        (e) => !(e.title === event.title && e.date === event.date),
      );
      if (body.action !== "unverified")
        extraction.events.push({
          ...event,
          description: value,
          quote,
          page,
          status: "Not verified",
        });
    }
    checkQuotes(extraction, pages);
    await db.$transaction(async (tx) => {
      const active = await tx.project.findUniqueOrThrow({
        where: { id: document.projectId! },
      });
      if (active.archivedAt || active.deletedAt)
        throw new Error("Restore this project before reviewing citations.");
      const updated = await tx.documentImport.updateMany({
        where: { id, extraction: document.extraction },
        data: {
          extraction: JSON.stringify(extraction),
          status: "Corrections pending",
        },
      });
      if (!updated.count)
        throw new Error("Extraction changed. Reload before editing.");
      const project = await tx.project.update({
        where: { id: document.projectId! },
        data: {
          reviewStatus: "Draft",
          verifiedAt: null,
          revision: { increment: 1 },
        },
      });
      await tx.fieldReview.deleteMany({ where: { projectId: project.id } });
      await tx.reviewRecord.create({
        data: {
          projectId: project.id,
          revision: project.revision,
          action: "Citation reviewed",
          note: `${body.action}: ${field ?? "event " + body.event}; ${staff}. Source matching does not replace factual verification.`,
          snapshot: document.extraction,
        },
      });
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Citation review failed." },
      { status: 400 },
    );
  }
}
