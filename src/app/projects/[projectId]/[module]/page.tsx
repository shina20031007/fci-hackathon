import { rapidtoId, rapidtoPath, corridors } from "@/features/rapidto/config";
import { notFound, redirect } from "next/navigation";
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
  const corridor = corridors.find((c) => c.id === projectId);
  if (corridor)
    redirect(
      `${rapidtoPath}/corridors/${corridor.slug}#${module === "impact" ? "corridor-map" : module === "decisions" ? "timeline" : module === "public-voice" ? "public-voice" : "participation"}`,
    );
  if (projectId === rapidtoId && module === "impact")
    redirect(`${rapidtoPath}#corridor-map`);
  const project = await publishedProject(projectId);
  if (!project) notFound();
  return <ModuleView project={project} module={module} decision={decision} />;
}
