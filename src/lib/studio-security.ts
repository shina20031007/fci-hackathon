export function studioEnabled() {
  return process.env.STUDIO_ENABLED === "true";
}
import { currentStaff, originError } from "@/features/admin/services/auth";
export async function checkStudioRequest(request: Request) {
  if (!(await currentStaff())) return "Staff sign-in required.";
  if (!studioEnabled())
    return "Municipal Studio is disabled. Enable STUDIO_ENABLED for local review.";
  const denied = originError(request);
  if (denied) return denied;
  if (!request.headers.get("content-type")?.includes("application/json"))
    return "Use an application/json request.";
  return null;
}
