import { Localized } from "@/lib/i18n/provider";
import { notFound } from "next/navigation";
import { publishedProject } from "@/lib/db/projects";
import { ProjectFrame } from "@/components/layout/project-frame";
import { ProjectOverview } from "@/features/decisions/project-overview";
export const dynamic = "force-dynamic";
export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const project = await publishedProject(projectId);
  if (!project) notFound();
  return (
    <Localized>
      {
        <ProjectFrame project={project} active="overview">
          <ProjectOverview project={project} />
        </ProjectFrame>
      }
    </Localized>
  );
}
