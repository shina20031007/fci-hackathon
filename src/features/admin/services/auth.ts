import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
export const sessionCookie = "cityora_staff";
export const digest = (value: string | Buffer) =>
  createHash("sha256").update(value).digest("hex");
export function authConfigured() {
  return (
    !!process.env.ADMIN_EMAIL && (process.env.ADMIN_PASSWORD?.length ?? 0) >= 16
  );
}
function credentialHash() {
  return digest(`${process.env.ADMIN_EMAIL}:${process.env.ADMIN_PASSWORD}`);
}
export async function currentStaff() {
  if (!authConfigured()) return null;
  const token = (await cookies()).get(sessionCookie)?.value;
  if (!token) return null;
  const session = await db.staffSession.findUnique({
    where: { tokenHash: digest(token) },
  });
  return session &&
    session.expiresAt > new Date() &&
    session.credentialHash === credentialHash()
    ? session.email
    : null;
}
export async function requireStaff() {
  const staff = await currentStaff();
  if (!staff) redirect("/admin/login");
  return staff;
}
export function originError(request: Request) {
  const url = new URL(request.url);
  const loopback = (host: string) =>
    ["localhost", "127.0.0.1", "[::1]"].includes(host);
  try {
    const host = new URL(
      `${url.protocol}//${request.headers.get("host") ?? url.host}`,
    );
    const local = loopback(url.hostname) && loopback(host.hostname);
    if (
      !local &&
      (process.env.ADMIN_REMOTE_ENABLED !== "true" ||
        url.protocol !== "https:" ||
        !process.env.ADMIN_ORIGIN)
    )
      return "Remote administration is disabled.";
    const expected = process.env.ADMIN_ORIGIN || host.origin;
    if (request.headers.get("origin") !== expected || host.origin !== expected)
      return "A same-origin request is required.";
    return null;
  } catch {
    return "A same-origin request is required.";
  }
}
export async function authorize(request: Request) {
  const error = originError(request);
  if (error) throw new Error(error);
  const staff = await currentStaff();
  if (!staff) throw new Error("Staff sign-in required.");
  return staff;
}
export async function signIn(email: string, password: string) {
  if (!authConfigured())
    throw new Error(
      "Configure ADMIN_EMAIL and ADMIN_PASSWORD (at least 16 characters) on the server.",
    );
  const id = "staff-login";
  await db.loginAttempt.upsert({ where: { id }, create: { id }, update: {} });
  await db.loginAttempt.updateMany({
    where: { id, windowStart: { lt: new Date(Date.now() - 15 * 60000) } },
    data: { attempts: 0, windowStart: new Date() },
  });
  const permitted = await db.loginAttempt.updateMany({
    where: { id, attempts: { lt: 10 } },
    data: { attempts: { increment: 1 } },
  });
  if (!permitted.count)
    throw new Error("Too many sign-in attempts. Try again in 15 minutes.");
  const candidate = digest(`${email.trim().toLowerCase()}:${password}`);
  const expected = digest(
    `${process.env.ADMIN_EMAIL!.trim().toLowerCase()}:${process.env.ADMIN_PASSWORD}`,
  );
  if (!timingSafeEqual(Buffer.from(candidate), Buffer.from(expected)))
    throw new Error("Invalid credentials.");
  const token = randomBytes(32).toString("hex");
  await db.staffSession.create({
    data: {
      tokenHash: digest(token),
      email: process.env.ADMIN_EMAIL!,
      credentialHash: credentialHash(),
      expiresAt: new Date(Date.now() + 8 * 3600000),
    },
  });
  await db.loginAttempt.update({ where: { id }, data: { attempts: 0 } });
  return token;
}
