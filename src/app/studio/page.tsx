import { requireStaff } from "@/features/admin/services/auth";
import { studioProjects } from "@/lib/db/projects";
import { studioEnabled } from "@/lib/studio-security";
import { StudioView } from "@/features/municipal-studio/studio-view";
export const dynamic = "force-dynamic";
export default async function Studio() {
  await requireStaff();
  const enabled = studioEnabled();
  const projects = enabled ? await studioProjects() : [];
  return (
    <StudioView
      enabled={enabled}
      projects={projects.map((p) => ({
        ...p,
        updatedAt: p.updatedAt.toISOString(),
      }))}
    />
  );
}
