import { NextResponse } from "next/server";
import {
  originError,
  signIn,
  sessionCookie,
} from "@/features/admin/services/auth";
export async function POST(request: Request) {
  const denied = originError(request);
  if (denied) return NextResponse.json({ error: denied }, { status: 403 });
  try {
    const body = await request.json();
    if (
      typeof body.email !== "string" ||
      typeof body.password !== "string" ||
      body.password.length > 1000
    )
      throw new Error("Invalid credentials.");
    const token = await signIn(body.email, body.password);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(sessionCookie, token, {
      httpOnly: true,
      sameSite: "strict",
      secure: new URL(request.url).protocol === "https:",
      path: "/",
      maxAge: 28800,
    });
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sign-in failed." },
      { status: 401 },
    );
  }
}
