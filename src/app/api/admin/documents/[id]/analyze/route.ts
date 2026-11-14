import { NextResponse } from "next/server";
import { authorize } from "@/features/admin/services/auth";
import { analyzeDocument } from "@/features/admin/services/analysis";
export const runtime = "nodejs";
export const maxDuration = 120;
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const staff = await authorize(request);
    const body = await request.json();
    if (body.consent !== true)
      throw new Error(
        "Confirm the document can be sent to OpenAI and review unnecessary personal information first.",
      );
    const { id } = await params;
    const projectId = await analyzeDocument(id, staff);
    return NextResponse.json({ projectId });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Analysis failed." },
      { status: 400 },
    );
  }
}
