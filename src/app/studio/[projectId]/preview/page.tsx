import { Localized } from "@/lib/i18n/provider";
import { notFound } from "next/navigation";
import { getDraft } from "@/lib/db/projects";
import { studioEnabled } from "@/lib/studio-security";
import { ProjectFrame } from "@/components/layout/project-frame";
import { ProjectOverview } from "@/features/decisions/project-overview";
import { DecisionDNA } from "@/features/decisions/decision-dna";
import { PublicVoice } from "@/features/public-voice/public-voice";
import { Participation } from "@/features/participation/participation";
import { ProjectMap } from "@/components/maps/project-map";
export const dynamic = "force-dynamic";
export default async function Preview({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  if (!studioEnabled()) notFound();
  const { projectId } = await params;
  const project = await getDraft(projectId);
  if (!project) notFound();
  return (
    <Localized>
      {
        <ProjectFrame project={project} active="overview" preview>
          <ProjectOverview project={project} />
          <div className="preview-section">
            <DecisionDNA project={project} />
          </div>
          <div className="preview-section">
            <PublicVoice project={project} />
          </div>
          <div className="preview-section">
            <h2>Geographic preview</h2>
            <ProjectMap projects={[project]} detailed />
          </div>
          <div className="preview-section">
            <Participation project={project} />
          </div>
        </ProjectFrame>
      }
    </Localized>
  );
}
