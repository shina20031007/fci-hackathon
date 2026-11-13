import { notFound } from "next/navigation";
import { getDraft } from "@/lib/db/projects";
import { db } from "@/lib/db/client";
import { studioEnabled } from "@/lib/studio-security";
import { EditorView } from "@/features/municipal-studio/editor-view";
export const dynamic = "force-dynamic";
export default async function Editor({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  if (!studioEnabled()) notFound();
  const { projectId } = await params;
  const project = await getDraft(projectId);
  if (!project) notFound();
  const reviews = await db.reviewRecord.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return (
    <EditorView
      project={project}
      reviews={reviews.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
      }))}
    />
  );
}
