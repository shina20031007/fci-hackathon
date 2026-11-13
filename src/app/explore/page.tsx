import { publishedProjects } from "@/lib/db/projects";
import { ExploreView } from "@/features/discovery/explore-view";
export const dynamic = "force-dynamic";
export default async function Explore({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; next?: string }>;
}) {
  return (
    <ExploreView
      projects={await publishedProjects()}
      params={await searchParams}
    />
  );
}
