import { EvidenceProvider } from "@/components/evidence/evidence-provider";
import { Participation } from "@/features/participation/participation";
import { publishedProjects } from "@/lib/db/projects";
import { Localized } from "@/lib/i18n/provider";

export const dynamic = "force-dynamic";

export default async function YourVoicePage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const { project: requestedProject } = await searchParams;
  const projects = (await publishedProjects()).filter(
    (project) => !project.synthetic,
  );
  const project = projects.find((item) => item.id === requestedProject);

  return (
    <Localized>
      <div className="page your-voice-page">
        <div className="page-heading">
          <h1>Your Voice</h1>
          <p>
            Choose a project to draft your message. Drafts are not submitted.
          </p>
        </div>
        <form action="/your-voice" className="panel your-voice-selector">
          <label htmlFor="voice-project">Project</label>
          <select
            id="voice-project"
            name="project"
            defaultValue={project?.id ?? ""}
            required
          >
            <option value="" disabled>
              Choose a project
            </option>
            {projects.map((item) => (
              <option key={item.id} value={item.id} translate="no">
                {item.title}
              </option>
            ))}
          </select>
          <button className="button primary" type="submit">
            Open writing space
          </button>
        </form>
        {project && (
          <EvidenceProvider project={project}>
            <div className="your-voice-project">
              <h2 translate="no">{project.title}</h2>
              <p>{project.municipality}</p>
            </div>
            <Participation key={project.id} project={project} writingMode />
          </EvidenceProvider>
        )}
      </div>
    </Localized>
  );
}
