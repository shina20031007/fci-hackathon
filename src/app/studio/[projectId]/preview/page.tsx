import { RapidTOPage } from "@/features/rapidto/rapidto-page";
import { rapidtoId, corridors } from "@/features/rapidto/config";
import { rapidtoRecords } from "@/features/rapidto/load";
import { requireStaff } from "@/features/admin/services/auth";
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
  await requireStaff();
  if (!studioEnabled()) notFound();
  const { projectId } = await params;
  const project = await getDraft(projectId);
  if (!project) notFound();
  const corridor = corridors.find((c) => c.id === projectId);
  if (corridor || projectId === rapidtoId) {
    const { records } = await rapidtoRecords(true);
    return (
      <RapidTOPage
        project={project}
        available={records}
        corridor={corridor?.slug}
        preview
      />
    );
  }
  return (
    <Localized>
      {
        <ProjectFrame project={project} active="overview" preview>
          <ProjectOverview project={project} preview />
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
