import { notFound } from "next/navigation";
import { publishedProject } from "@/lib/db/projects";
import { ModuleView } from "@/features/decisions/module-view";
export const dynamic = "force-dynamic";
export default async function ModulePage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string; module: string }>;
  searchParams: Promise<{ decision?: string }>;
}) {
  const { projectId, module } = await params;
  const { decision } = await searchParams;
  if (
    !["decisions", "public-voice", "impact", "participation"].includes(module)
  )
    notFound();
  const project = await publishedProject(projectId);
  if (!project) notFound();
  return <ModuleView project={project} module={module} decision={decision} />;
}
