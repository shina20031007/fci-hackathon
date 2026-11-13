import { publishedProjects } from "@/lib/db/projects";
import { HomeView } from "@/features/discovery/home-view";
export const dynamic = "force-dynamic";
export default async function Overview() {
  return (
    <HomeView
      projects={(await publishedProjects()).filter(
        (project) => !project.synthetic,
      )}
    />
  );
}
