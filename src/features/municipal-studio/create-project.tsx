"use client";
import { Localized } from "@/lib/i18n/provider";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { categories, type CivicProject } from "@/lib/validation/project";
export function CreateProject() {
  const [open, setOpen] = useState(false),
    [title, setTitle] = useState(""),
    [municipality, setMunicipality] = useState(""),
    [category, setCategory] = useState<CivicProject["category"]>(
      "Land Use and Zoning",
    ),
    [synthetic, setSynthetic] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const router = useRouter();
  async function create(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const now = new Date().toISOString();
    const project: CivicProject = {
      id: crypto.randomUUID(),
      municipality,
      title,
      category,
      neighbourhood: "Geographic relevance unknown",
      summary: "Draft explanation — source review required.",
      rationale: "No verified rationale recorded yet.",
      authority: "Authority requires verification",
      status: "Unknown",
      synthetic,
      summaryEvidenceId: "",
      revision: 1,
      reviewStatus: "Draft",
      verifiedAt: null,
      updatedAt: now,
      sources: [],
      evidence: [],
      decisions: [],
      events: [],
      versions: [],
      feedback: [],
      opportunities: [],
      scopes: [],
    };
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(project),
      });
      const data = (await response.json()) as {
        project?: CivicProject;
        error?: string;
      };
      if (!response.ok || !data.project)
        throw Error(data.error ?? "Unable to create project.");
      router.push(`/studio/${data.project.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to create project.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Localized>
      {
        <div>
          <button
            className="button primary"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
          >
            <Plus size={17} />
            {open ? "Close new project form" : "Create project"}
          </button>
          {open && (
            <form className="panel create-project-form" onSubmit={create}>
              <h2>Create a review draft</h2>
              <label>
                Project title
                <input
                  required
                  maxLength={160}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </label>
              <label>
                Municipality
                <input
                  required
                  maxLength={100}
                  value={municipality}
                  onChange={(e) => setMunicipality(e.target.value)}
                />
              </label>
              <label>
                Category
                <select
                  value={category}
                  onChange={(e) =>
                    setCategory(e.target.value as CivicProject["category"])
                  }
                >
                  {categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={synthetic}
                  onChange={(e) => setSynthetic(e.target.checked)}
                />
                This is a fictional demonstration project
              </label>
              <p className="small muted">
                This designation cannot be changed after creation. Real records
                require official source links and human verification before
                publication.
              </p>
              <button className="button primary" disabled={busy}>
                {busy ? "Creating…" : "Create draft"}
              </button>
              {error && <p role="alert">{error}</p>}
            </form>
          )}
        </div>
      }
    </Localized>
  );
}
