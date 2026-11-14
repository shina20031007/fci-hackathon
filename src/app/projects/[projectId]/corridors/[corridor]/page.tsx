import Link from "next/link";
import { notFound } from "next/navigation";
import { publishedProject } from "@/lib/db/projects";
import { Localized } from "@/lib/i18n/provider";
import { rapidtoId, corridors, rapidtoPath } from "@/features/rapidto/config";
import { rapidtoRecords } from "@/features/rapidto/load";
import { RapidTOPage } from "@/features/rapidto/rapidto-page";
export const dynamic = "force-dynamic";
export default async function CorridorPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string; corridor: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const { projectId, corridor } = await params;
  const c = corridors.find((c) => c.slug === corridor);
  if (projectId !== rapidtoId || !c || !(await publishedProject(rapidtoId)))
    notFound();
  const { preview, records } = await rapidtoRecords(
    (await searchParams).preview === "1",
  );
  const project = records.find((p) => p.id === c.id);
  if (!project)
    return (
      <Localized>
        <div className="page">
          <Link href={rapidtoPath}>RapidTO Overview</Link>
          <h1 translate="no">{c.name}</h1>
          <p>
            Corridor details are awaiting staff verification and publication.
          </p>
          <Link href={`/admin/login`}>Staff Portal</Link>
        </div>
      </Localized>
    );
  return (
    <RapidTOPage
      project={project}
      available={records}
      corridor={corridor}
      preview={preview}
    />
  );
}
