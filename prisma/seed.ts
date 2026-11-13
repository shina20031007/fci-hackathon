import { officialProjects } from "../data/official/projects";
import { fixtureProjects } from "../data/fixtures/projects";
import { seedProject } from "../src/lib/db/projects";
import { db } from "../src/lib/db/client";
async function main() {
  for (const project of [...fixtureProjects, ...officialProjects])
    await seedProject(project);
  console.info("Seed complete. Existing projects were preserved.");
}
main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
