import "server-only";
import { requireStaff } from "@/features/admin/services/auth";
import { getDraft, publishedProject } from "@/lib/db/projects";
import { corridors } from "./config";
export async function rapidtoRecords(previewRequested: boolean) {
  if (previewRequested) await requireStaff();
  const preview = previewRequested;
  const load = preview ? getDraft : publishedProject;
  const records = (await Promise.all(corridors.map((c) => load(c.id)))).filter(
    (p) => p !== null,
  );
  return { preview, records };
}
