import { db } from "@/lib/db/client";
export async function changeLifecycle(
  id: string,
  revision: number,
  action: "archive" | "delete" | "restore",
  staff: string,
  client = db,
) {
  return client.$transaction(async (tx) => {
    const project = await tx.project.findUniqueOrThrow({ where: { id } });
    if (project.revision !== revision)
      throw new Error("Project changed. Reload before continuing.");
    const publication = await tx.publication.findUnique({
      where: { projectId: id },
    });
    const data =
      action === "delete"
        ? { deletedAt: new Date() }
        : action === "archive"
          ? { archivedAt: new Date() }
          : {
              deletedAt: null,
              archivedAt: project.deletedAt ? project.archivedAt : null,
            };
    await tx.project.update({
      where: { id },
      data: { ...data, revision: { increment: 1 } },
    });
    await tx.reviewRecord.create({
      data: {
        projectId: id,
        revision: revision + 1,
        action,
        note: `${action} by ${staff}; published snapshot retained.`,
        snapshot: publication?.snapshot ?? null,
      },
    });
  });
}
