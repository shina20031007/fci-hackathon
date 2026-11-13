"use client";
import { Localized } from "@/lib/i18n/provider";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Save, Eye, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import {
  type CivicProject,
  categories,
  decisionStatuses,
  projectSchema,
} from "@/lib/validation/project";
import { publicationIssues } from "@/lib/evidence/policy";
import { Badge } from "@/components/ui/shared";
import { Field, Select, EvidenceSelect } from "./editor-fields";
import { SourceEditor } from "./source-editor";
import { DecisionEditor } from "./decision-editor";
import { ParticipationEditor } from "./participation-editor";
import {
  HistoryEditor,
  FeedbackEditor,
  GeographyEditor,
} from "./record-editors";
type Review = {
  id: string;
  action: string;
  revision: number;
  note: string;
  createdAt: string;
};
export function StudioEditor({
  initial,
  reviews,
}: {
  initial: CivicProject;
  reviews: Review[];
}) {
  const [project, setProject] = useState(initial),
    [tab, setTab] = useState("Project"),
    [dirty, setDirty] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [isError, setIsError] = useState(false),
    [note, setNote] = useState("");
  const router = useRouter();
  function update(p: CivicProject) {
    setProject(p);
    setDirty(true);
    setMessage("");
  }
  async function perform(action: "save" | "review" | "verify" | "publish") {
    setMessage("");
    setIsError(false);
    if (action === "save") {
      const parsed = projectSchema.safeParse(project);
      if (!parsed.success) {
        setIsError(true);
        setMessage(
          parsed.error.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join(" "),
        );
        return;
      }
    }
    setBusy(true);
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          action === "save"
            ? { action, project }
            : { action, revision: project.revision, note },
        ),
      });
      const result = (await response.json()) as {
        project?: CivicProject;
        error?: string;
      };
      if (!response.ok || !result.project)
        throw new Error(result.error ?? "Unable to update project.");
      setProject(result.project);
      setDirty(false);
      setMessage(
        action === "publish"
          ? "Published successfully. The resident portal now shows this revision."
          : action === "save"
            ? "Draft saved to the database. Changed records need a separate verification save. Published information is unchanged."
            : `Review stage updated: ${result.project.reviewStatus}.`,
      );
      router.refresh();
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.",
      );
    } finally {
      setBusy(false);
    }
  }
  const issues = publicationIssues(project),
    props = { project, update };
  const tabs = [
    "Project",
    "Sources & evidence",
    "Decisions",
    "History & versions",
    "Public input",
    "Participation",
    "Geography",
    "Review log",
  ];
  return (
    <Localized>
      {
        <>
          <div className="studio-toolbar">
            <div className="tags">
              <Badge
                tone={project.reviewStatus === "Published" ? "teal" : "blue"}
              >
                {project.reviewStatus}
              </Badge>
              <span className="small muted">
                Draft revision {project.revision}
                {dirty ? " · Unsaved changes" : " · Saved"}
              </span>
            </div>
            <div className="button-group">
              {!dirty ? (
                <Link
                  className="button secondary"
                  href={`/studio/${project.id}/preview`}
                >
                  <Eye size={16} />
                  Preview saved draft
                </Link>
              ) : (
                <span className="small muted">Save to preview</span>
              )}
              <button
                className="button primary"
                onClick={() => perform("save")}
                disabled={busy || !dirty}
              >
                <Save size={16} />
                {busy ? "Working…" : "Save draft"}
              </button>
            </div>
          </div>
          <div className="studio-layout">
            <div className="studio-main">
              <div
                className="editor-tabs"
                role="tablist"
                aria-label="Draft records"
              >
                {tabs.map((t) => (
                  <button
                    role="tab"
                    aria-selected={tab === t}
                    id={`tab-${t.replaceAll(" ", "-")}`}
                    aria-controls="editor-panel"
                    key={t}
                    onClick={() => setTab(t)}
                    className={tab === t ? "active" : ""}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div
                id="editor-panel"
                role="tabpanel"
                aria-labelledby={`tab-${tab.replaceAll(" ", "-")}`}
              >
                {tab === "Project" ? (
                  <section className="panel editor-record">
                    <h2>Project explanation</h2>
                    <p className="muted">
                      The public portal keeps its last published version until
                      you publish a reviewed revision.
                    </p>
                    <Field
                      label="Project title"
                      value={project.title}
                      onChange={(v) => update({ ...project, title: v })}
                    />
                    <div className="form-grid">
                      <Field
                        label="Municipality"
                        value={project.municipality}
                        onChange={(v) =>
                          update({ ...project, municipality: v })
                        }
                      />
                      <Field
                        label="Neighbourhood or scope"
                        value={project.neighbourhood}
                        onChange={(v) =>
                          update({ ...project, neighbourhood: v })
                        }
                      />
                      <Select
                        label="Project category"
                        value={project.category}
                        options={categories}
                        onChange={(v) =>
                          update({
                            ...project,
                            category: v as CivicProject["category"],
                          })
                        }
                      />
                      <Select
                        label="Current procedural stage"
                        value={project.status}
                        options={decisionStatuses}
                        onChange={(v) =>
                          update({
                            ...project,
                            status: v as CivicProject["status"],
                          })
                        }
                      />
                    </div>
                    <Field
                      label="Proposal summary"
                      area
                      value={project.summary}
                      onChange={(v) => update({ ...project, summary: v })}
                    />
                    <Field
                      label="Stated rationale"
                      area
                      value={project.rationale}
                      onChange={(v) => update({ ...project, rationale: v })}
                    />
                    <Field
                      label="Responsible authority"
                      value={project.authority}
                      onChange={(v) => update({ ...project, authority: v })}
                    />
                    <EvidenceSelect
                      label="Evidence for summary and rationale"
                      project={project}
                      value={project.summaryEvidenceId}
                      onChange={(v) =>
                        update({ ...project, summaryEvidenceId: v })
                      }
                    />
                  </section>
                ) : tab === "Sources & evidence" ? (
                  <SourceEditor {...props} />
                ) : tab === "Decisions" ? (
                  <DecisionEditor {...props} />
                ) : tab === "Participation" ? (
                  <ParticipationEditor {...props} />
                ) : tab === "History & versions" ? (
                  <HistoryEditor {...props} />
                ) : tab === "Public input" ? (
                  <FeedbackEditor {...props} />
                ) : tab === "Geography" ? (
                  <GeographyEditor {...props} />
                ) : (
                  <section className="panel editor-record">
                    <h2>Local review history</h2>
                    <p className="muted">
                      A prototype change record; authenticated reviewer identity
                      and tamper-resistant audit logging are not implemented.
                    </p>
                    <ol className="review-log">
                      {reviews.map((r) => (
                        <li key={r.id}>
                          <strong>
                            {r.action} · revision {r.revision}
                          </strong>
                          <p>{r.note}</p>
                          <time dateTime={r.createdAt}>
                            {new Date(r.createdAt).toLocaleString("en-CA", {
                              timeZone: "America/Toronto",
                            })}{" "}
                            · America/Toronto
                          </time>
                        </li>
                      ))}
                    </ol>
                  </section>
                )}
              </div>
            </div>
            <aside className="review-sidebar">
              <section className="panel">
                <p className="eyebrow">PUBLICATION CHECKPOINT</p>
                <h3>Review before it reaches residents.</h3>
                <ol className="stage-list">
                  {["Draft", "Needs Review", "Verified", "Published"].map(
                    (s) => (
                      <li
                        key={s}
                        className={project.reviewStatus === s ? "current" : ""}
                      >
                        {s}
                      </li>
                    ),
                  )}
                </ol>
                <div className="review-issues">
                  {issues.length ? (
                    <>
                      <strong>
                        <AlertCircle size={16} /> {issues.length} evidence{" "}
                        {issues.length === 1 ? "check" : "checks"} to resolve
                      </strong>
                      <ul>
                        {issues.map((i) => (
                          <li key={i}>{i}</li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <p>
                      <CheckCircle2 size={17} /> Required evidence checks are
                      satisfied.
                    </p>
                  )}
                </div>
                <label>
                  Review note
                  <textarea
                    aria-label="Review note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="What did you check? Note conditions and unresolved limitations."
                    rows={4}
                  />
                </label>
                <button
                  className="button secondary full"
                  disabled={
                    busy ||
                    dirty ||
                    project.reviewStatus !== "Draft" ||
                    !note.trim()
                  }
                  onClick={() => perform("review")}
                >
                  Submit for review <ArrowRight size={15} />
                </button>
                <button
                  className="button secondary full"
                  disabled={
                    busy ||
                    dirty ||
                    project.reviewStatus !== "Needs Review" ||
                    issues.length > 0 ||
                    !note.trim()
                  }
                  onClick={() => perform("verify")}
                >
                  {project.synthetic
                    ? "Verify demonstration review"
                    : "Verify review"}
                </button>
                <button
                  className="button primary full"
                  disabled={
                    busy ||
                    dirty ||
                    project.reviewStatus !== "Verified" ||
                    issues.length > 0 ||
                    !note.trim()
                  }
                  onClick={() => perform("publish")}
                >
                  Publish approved revision
                </button>
                <Link className="text-link" href={`/projects/${project.id}`}>
                  Open resident page <ArrowRight size={15} />
                </Link>
                <p className="small muted">
                  {project.synthetic
                    ? "Publishing does not turn fictional evidence into official facts."
                    : "Human review remains necessary. These checks validate links and review states, not the truth of a source."}
                </p>
              </section>
            </aside>
          </div>
          {message && (
            <div
              className={`save-message ${isError ? "error" : "success"}`}
              role={isError ? "alert" : "status"}
            >
              {message}
            </div>
          )}
        </>
      }
    </Localized>
  );
}
