import { NextResponse } from "next/server";
import { authorize } from "@/features/admin/services/auth";
import { refreshDocumentDashboard } from "@/features/admin/services/refresh-dashboard";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const staff = await authorize(request);
    const { revision } = await request.json();
    const project = await refreshDocumentDashboard(
      (await params).id,
      revision,
      staff,
    );
    return NextResponse.json({ project });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Dashboard update failed.",
      },
      { status: 400 },
    );
  }
}
