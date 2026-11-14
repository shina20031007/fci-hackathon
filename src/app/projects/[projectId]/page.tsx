import { rapidtoId, corridors, rapidtoPath } from "@/features/rapidto/config";
import { RapidTOPage } from "@/features/rapidto/rapidto-page";
import { rapidtoRecords } from "@/features/rapidto/load";
import { Localized } from "@/lib/i18n/provider";
import { notFound, redirect } from "next/navigation";
import { getDraft, publishedProject } from "@/lib/db/projects";
import { ProjectFrame } from "@/components/layout/project-frame";
import { ProjectOverview } from "@/features/decisions/project-overview";
export const dynamic = "force-dynamic";
export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const { projectId } = await params;
  const corridor = corridors.find((c) => c.id === projectId);
  if (corridor) redirect(`${rapidtoPath}/corridors/${corridor.slug}`);
  const project = await publishedProject(projectId);
  if (!project) notFound();
  if (projectId === rapidtoId) {
    const { preview, records } = await rapidtoRecords(
      (await searchParams).preview === "1",
    );
    return (
      <RapidTOPage
        project={preview ? ((await getDraft(projectId)) ?? project) : project}
        available={records}
        preview={preview}
      />
    );
  }
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
