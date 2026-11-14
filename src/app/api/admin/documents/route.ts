import { NextResponse } from "next/server";
import { authorize, digest } from "@/features/admin/services/auth";
import {
  MAX_FILE_BYTES,
  pdfPages,
  structuredRecords,
} from "@/features/admin/services/files";
import { saveOfficialRecords } from "@/features/admin/services/official-data";
import { db } from "@/lib/db/client";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    const staff = await authorize(request);
    if (Number(request.headers.get("content-length")) > MAX_FILE_BYTES * 1.4)
      throw new Error("Upload exceeds the 3 MB limit.");
    const raw = await request.text();
    if (raw.length > MAX_FILE_BYTES * 1.4)
      throw new Error("Upload exceeds the 3 MB limit.");
    const body = JSON.parse(raw);
    if (
      typeof body.filename !== "string" ||
      typeof body.data !== "string" ||
      body.filename.length > 200
    )
      throw new Error("Invalid upload.");
    const data = Buffer.from(body.data, "base64");
    if (!data.length || data.length > MAX_FILE_BYTES)
      throw new Error("Upload must be between 1 byte and 3 MB.");
    const extension = body.filename.split(".").pop()?.toLowerCase();
    if (!["pdf", "csv", "xlsx", "json", "xml"].includes(extension))
      throw new Error("Unsupported file type.");
    const sourceUrl =
      typeof body.sourceUrl === "string" && body.sourceUrl
        ? body.sourceUrl
        : null;
    if (sourceUrl) {
      const url = new URL(sourceUrl);
      if (url.protocol !== "https:" || url.username || url.password)
        throw new Error("Use a public HTTPS source link.");
    }
    const hash = digest(data);
    const cached = await db.documentImport.findUnique({
      where: { digest: hash },
    });
    if (cached) return NextResponse.json({ id: cached.id, cached: true });
    const document = await db.documentImport.create({
      data: {
        digest: hash,
        filename: body.filename,
        fileData: data,
        pages: "[]",
        sourceUrl,
        uploadedBy: staff,
        mediaType:
          extension === "pdf" ? "application/pdf" : "application/octet-stream",
        status: "Extracting",
        startedAt: new Date(),
      },
    });
    try {
      if (extension === "pdf") {
        const pages = await pdfPages(data);
        await db.documentImport.update({
          where: { id: document.id },
          data: { pages: JSON.stringify(pages), status: "Extracted" },
        });
      } else {
        if (!["reports", "votes"].includes(body.dataset))
          throw new Error("Select the official dataset type.");
        const records = await structuredRecords(data, extension);
        const saved = await saveOfficialRecords(
          records,
          body.dataset,
          sourceUrl ?? "Uploaded file — provenance not verified",
        );
        await db.documentImport.update({
          where: { id: document.id },
          data: {
            pages: JSON.stringify([
              { page: 1, text: JSON.stringify(records.slice(0, 100), null, 2) },
            ]),
            status: "Structured",
            extraction: JSON.stringify({
              records: saved,
              dataset: body.dataset,
            }),
          },
        });
      }
      return NextResponse.json({ id: document.id });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Extraction failed.";
      await db.documentImport.update({
        where: { id: document.id },
        data: { status: "Extraction failed", error: message },
      });
      return NextResponse.json(
        { id: document.id, error: message },
        { status: 422 },
      );
    }
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload failed." },
      { status: 400 },
    );
  }
}
