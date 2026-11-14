import { officialProjects } from "../data/official/projects";
import { fixtureProjects } from "../data/fixtures/projects";
import publishedRecords from "../data/published/projects.json";
import { seedProject } from "../src/lib/db/projects";
import { db } from "../src/lib/db/client";
import { projectSchema } from "../src/lib/validation/project";
import { z } from "zod";

const publishedSeed = z
  .array(
    z.object({
      projectId: z.string(),
      revision: z.number().int().positive(),
      publishedAt: z.iso.datetime({ offset: true }),
      agendaItem: z.string().optional(),
      snapshot: projectSchema,
    }),
  )
  .parse(publishedRecords);

async function main() {
  const seen = new Set<string>();
  for (const record of publishedSeed) {
    if (
      seen.has(record.projectId) ||
      record.projectId !== record.snapshot.id ||
      record.revision !== record.snapshot.revision ||
      record.snapshot.reviewStatus !== "Published"
    )
      throw new Error(`Invalid published seed record: ${record.projectId}`);
    seen.add(record.projectId);
  }
  const publicOnly = process.env.SEED_PUBLIC_ONLY === "true";
  if (!publicOnly)
    for (const project of fixtureProjects) await seedProject(project);
  for (const record of publishedSeed)
    await seedProject(record.snapshot, db, {
      publishedAt: new Date(record.publishedAt),
      agendaItem: record.agendaItem,
    });
  if (!publicOnly)
    for (const project of officialProjects) await seedProject(project);
  console.info("Seed complete. Existing projects were preserved.");
}
main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
