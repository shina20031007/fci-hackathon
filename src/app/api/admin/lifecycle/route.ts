import { NextResponse } from "next/server";
import { authorize } from "@/features/admin/services/auth";
import { changeLifecycle } from "@/features/admin/services/lifecycle";
export async function POST(request: Request) {
  try {
    const staff = await authorize(request);
    const body = await request.json();
    if (
      !["archive", "delete", "restore"].includes(body.action) ||
      typeof body.id !== "string" ||
      !Number.isInteger(body.revision)
    )
      throw new Error("Invalid lifecycle action.");
    if (body.action === "delete" && body.confirmation !== "DELETE")
      throw new Error("Type DELETE to confirm.");
    await changeLifecycle(body.id, body.revision, body.action, staff);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Operation failed." },
      { status: 400 },
    );
  }
}
