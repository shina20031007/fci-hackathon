import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  authorize,
  digest,
  sessionCookie,
} from "@/features/admin/services/auth";
import { db } from "@/lib/db/client";
export async function POST(request: Request) {
  try {
    await authorize(request);
    const token = (await cookies()).get(sessionCookie)?.value;
    if (token)
      await db.staffSession.deleteMany({ where: { tokenHash: digest(token) } });
    const response = NextResponse.json({ ok: true });
    response.cookies.delete(sessionCookie);
    return response;
  } catch {
    return NextResponse.json(
      { error: "Staff sign-in required." },
      { status: 403 },
    );
  }
}
