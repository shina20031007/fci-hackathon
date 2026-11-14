"use client";
import { HousingOverview } from "@/features/decisions/housing-overview";
import { publicationIssues } from "@/lib/evidence/policy";
import { CitationReview } from "./citation-review";
import { useState, useRef, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CivicProject } from "@/lib/validation/project";
import { projectSchema, categories } from "@/lib/validation/project";
import { DecisionTimeline } from "@/components/ui/decision-timeline";
import { EvidenceProvider } from "@/components/evidence/evidence-provider";
import { HistoryEditor } from "@/features/municipal-studio/record-editors";
import { CreateProject } from "@/features/municipal-studio/create-project";
import type { Extraction, PageText } from "../types/extraction";

type ProjectRow = {
  id: string;
  title: string;
  category: string;
  revision: number;
  reviewStatus: string;
  deletedAt: string | null;
  archivedAt: string | null;
  agendaItem: string | null;
};
type ImportRow = {
  id: string;
  filename: string;
  status: string;
  error: string | null;
  projectId: string | null;
  model: string | null;
  usage: string | null;
  costUsd: number | null;
  createdAt: string;
};
type OfficialRow = {
  id: string;
  dataset: string;
  agendaItem: string;
  sourceUrl: string;
  record: string;
  projectId: string | null;
  confirmedBy: string | null;
  fetchedAt: string;
};
type Props = {
  initialSection?: string;
  staff: string;
  configured: boolean;
  tab: string;
  projects: ProjectRow[];
  imports: ImportRow[];
  official: OfficialRow[];
  document: {
    id: string;
    filename: string;
    pages: string;
    extraction: string | null;
    rawResponse?: string | null;
    extractionHash?: string | null;
    status: string;
    error: string | null;
    sourceUrl: string | null;
    projectId: string | null;
    mediaType: string;
  } | null;
  project: CivicProject | null;
  imported: {
    id: string;
    filename: string;
    extraction: string | null;
    originalProject: string | null;
    sourceUrl: string | null;
  } | null;
  checks: {
    field: string;
    reviewer: string;
    reviewedAt: string;
    valid: boolean;
  }[];
};
const fields = [
  "evidence",
  "decisions",
  "title",
  "municipality",
  "category",
  "authority",
  "neighbourhood",
  "summary",
  "rationale",
  "status",
  "events",
  "sources",
  "opportunities",
  "scopes",
] as const;
export function AdminPortal(props: Props) {
  const router = useRouter();
  const [working, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [selectedFileName, setSelectedFileName] = useState(""),
    [consent, setConsent] = useState(false),
    [draft, setDraft] = useState(props.project),
    [section, setSection] = useState(props.initialSection ?? "Overview"),
    [fieldText, setFieldText] = useState<Record<string, string>>({}),
    [pending, setPending] = useState<{
      project: ProjectRow;
      action: string;
    } | null>(null),
    [confirmation, setConfirmation] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const [refreshing, startRefresh] = useTransition();
  const busy = working || refreshing;
  async function request(url: string, body: unknown) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Request failed.");
    return data;
  }
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try {
      await action();
      startRefresh(() => router.refresh());
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Operation failed.");
    } finally {
      setBusy(false);
    }
  }
  async function saveProject(value: CivicProject) {
    const parsed = projectSchema.parse(value);
    const response = await fetch(`/api/projects/${value.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save", project: parsed }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    setDraft(result.project);
    return result.project as CivicProject;
  }
  const selected = props.projects.find((p) => p.id === props.project?.id);
  const actions = (project: ProjectRow) => (
    <div className="admin-actions">
      <Link className="button secondary" href={`/admin?project=${project.id}`}>
        Edit
      </Link>
      {!project.deletedAt && !project.archivedAt && (
        <Link
          className="button secondary"
          href={`/admin?project=${project.id}&section=Review%20%26%20Verification`}
        >
          Review & publish
        </Link>
      )}
      {project.deletedAt || project.archivedAt ? (
        <button
          className="button secondary"
          disabled={busy}
          onClick={() =>
            run(async () => {
              await request("/api/admin/lifecycle", {
                id: project.id,
                revision: project.revision,
                action: "restore",
              });
            })
          }
        >
          Restore
        </button>
      ) : (
        <button
          className="button secondary"
          disabled={busy}
          onClick={() =>
            run(async () => {
              await request("/api/admin/lifecycle", {
                id: project.id,
                revision: project.revision,
                action: "archive",
              });
            })
          }
        >
          Archive
        </button>
      )}
      {!project.deletedAt && (
        <button
          className="button secondary"
          onClick={() => {
            setPending({ project, action: "delete" });
            setConfirmation("");
            dialog.current?.showModal();
          }}
        >
          Delete
        </button>
      )}
    </div>
  );
  const original = props.imported?.originalProject
    ? (JSON.parse(props.imported.originalProject) as CivicProject)
    : null;
  const extraction = props.imported?.extraction
    ? (JSON.parse(props.imported.extraction) as Extraction)
    : null;
  return (
    <div className="page admin-workspace" key={props.project?.revision}>
      <div className="row between">
        <h1>Admin Portal</h1>
        <button
          className="button secondary"
          onClick={() =>
            run(async () => {
              await request("/api/admin/logout", {});
              router.push("/admin/login");
            })
          }
        >
          Sign out
        </button>
      </div>
      <p>
        Signed in as {props.staff}. Staff access is configured by the site
        operator.
      </p>
      <div role="status" aria-live="polite">
        {busy ? "Processing…" : message}
      </div>
      {props.project && draft ? (
        <>
          <Link href="/admin">← Projects</Link>
          <h2>{draft.title}</h2>
          {selected && actions(selected)}
          {props.imported && (
            <Link href={`/admin?document=${props.imported.id}`}>
              Review PDF citations
            </Link>
          )}
          {selected && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                run(async () => {
                  await request("/api/admin/official", {
                    action: "agenda",
                    projectId: selected.id,
                    revision: selected.revision,
                    agendaItem: form.get("agendaItem"),
                  });
                });
              }}
            >
              <label>
                Official agenda item number
                <input
                  name="agendaItem"
                  defaultValue={selected.agendaItem ?? ""}
                  required
                />
              </label>
              <button className="button secondary" disabled={busy}>
                Save agenda number
              </button>
            </form>
          )}

          <div className="admin-actions">
            {[
              "Overview",
              "Timeline",
              "Sources & Evidence",
              "Review & Verification",
            ].map((name) => (
              <button
                className="button secondary"
                key={name}
                onClick={() => {
                  setSection(name);
                  router.replace(
                    `/admin?project=${draft.id}&section=${encodeURIComponent(name)}`,
                    { scroll: false },
                  );
                }}
                aria-pressed={section === name}
              >
                {name}
              </button>
            ))}
            <Link className="button secondary" href={`/studio/${draft.id}`}>
              Open Municipal Studio
            </Link>
            <Link
              className="button secondary"
              href={`/studio/${draft.id}/preview`}
            >
              Preview saved draft
            </Link>
          </div>
          <EvidenceProvider project={draft}>
            <div className="admin-project-content">
              {section === "Overview" && (
                <>
                  <p>{draft.summary}</p>
                  <p>
                    Stage: {draft.status} · Review: {draft.reviewStatus}
                  </p>
                  {props.imported?.extraction && (
                    <button
                      className="button secondary"
                      disabled={busy}
                      onClick={() =>
                        run(async () => {
                          const data = await request(
                            `/api/admin/documents/${props.imported!.id}/dashboard`,
                            { revision: draft.revision },
                          );
                          setDraft(data.project);
                          setMessage(
                            "Dashboard updated from saved analysis. Review the updated draft before publishing.",
                          );
                        })
                      }
                    >
                      Update dashboard from saved analysis
                    </button>
                  )}
                  <HousingOverview project={draft} preview />
                </>
              )}
              {section === "Timeline" && (
                <>
                  <DecisionTimeline project={draft} />
                  <HistoryEditor project={draft} update={setDraft} />
                  <button
                    className="button primary"
                    disabled={busy}
                    onClick={() =>
                      run(async () => {
                        await saveProject(draft);
                        setMessage(
                          "Saved. Changed content requires review again.",
                        );
                      })
                    }
                  >
                    Save timeline
                  </button>
                </>
              )}
              {section === "Sources & Evidence" && (
                <>
                  {draft.evidence.map((e) => (
                    <section className="panel" key={e.id}>
                      <h3>
                        {draft.sources.find((s) => s.id === e.sourceId)?.title}
                      </h3>
                      <p>{e.section}</p>
                      <blockquote translate="no">{e.excerpt}</blockquote>
                      <p>{e.state}</p>
                      {props.imported && (
                        <a
                          href={`/api/admin/documents/${props.imported.id}/file#page=${e.section.match(/\d+/)?.[0] ?? 1}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open original PDF at page
                        </a>
                      )}
                    </section>
                  ))}
                  <Link href={`/studio/${draft.id}`}>
                    Edit sources and evidence in Municipal Studio
                  </Link>
                </>
              )}
              {section === "Review & Verification" && (
                <>
                  <h2>Review & Verify</h2>
                  <section className="panel" aria-label="Publication checklist">
                    <h3>Publication checklist</h3>
                    <p>
                      Review evidence first, then decision claims, then the
                      remaining fields. Verify on evidence confirms that every
                      cited passage supports its claim; Verify on decisions
                      confirms the recorded interpretations.
                    </p>
                    <ul>
                      {publicationIssues(draft).map((issue) => (
                        <li key={issue}>{issue}</li>
                      ))}
                    </ul>
                    <p>
                      {props.checks.filter((c) => c.valid).length} /{" "}
                      {fields.length} fields reviewed. After review: Submit for
                      review → Approve for Publication → Publish.
                    </p>
                    {draft.reviewStatus === "Published" && (
                      <Link href={`/projects/${draft.id}`}>
                        Open published page
                      </Link>
                    )}
                  </section>
                  <p>
                    {props.checks.filter((c) => c.valid).length} of{" "}
                    {fields.length} critical fields verified. Editing source
                    material invalidates dependent reviews.
                  </p>
                  {extraction && (
                    <details>
                      <summary>Original AI extraction and uncertainty</summary>
                      <pre>{JSON.stringify(extraction, null, 2)}</pre>
                    </details>
                  )}
                  {fields.map((field) => {
                    const check = props.checks.find(
                      (c) => c.field === field && c.valid,
                    );
                    const value = draft[field];
                    return (
                      <section className="panel" key={field}>
                        <h3>{field}</h3>
                        <p>
                          {check
                            ? `Verified by ${check.reviewer} at ${check.reviewedAt}`
                            : "Not verified"}
                        </p>
                        <div className="review-columns">
                          <div>
                            <h4>AI Extracted Value / Imported Value</h4>
                            <pre>
                              {JSON.stringify(
                                original?.[field] ?? props.project?.[field],
                                null,
                                2,
                              )}
                            </pre>
                            <h4>Original Source</h4>
                            {props.imported && (
                              <a
                                href={`/api/admin/documents/${props.imported.id}/file`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {props.imported.filename}
                              </a>
                            )}
                            {draft.evidence
                              .filter(
                                (e) =>
                                  field === "sources" ||
                                  field === "evidence" ||
                                  [
                                    "decisions",
                                    "events",
                                    "opportunities",
                                    "scopes",
                                  ].includes(field) ||
                                  e.id.endsWith("-" + field) ||
                                  (field === "neighbourhood" &&
                                    (e.id.endsWith("-location") ||
                                      e.id.includes("-location-") ||
                                      e.id.endsWith("-policyScope"))) ||
                                  (field === "authority" &&
                                    e.id.endsWith("-department")) ||
                                  (field === "rationale" &&
                                    e.id.endsWith("-background")),
                              )
                              .map((e) => {
                                const source = draft.sources.find(
                                  (s) => s.id === e.sourceId,
                                );
                                const page = e.section.match(
                                  /(?:PDF\s+)?pages?\s+(\d+)/i,
                                )?.[1];
                                const originalUrl =
                                  source?.url &&
                                  source.url === props.imported?.sourceUrl
                                    ? `/api/admin/documents/${props.imported.id}/file`
                                    : source?.url;
                                const href =
                                  originalUrl &&
                                  page &&
                                  (originalUrl.endsWith("/file") ||
                                    /\.pdf(?:[?#]|$)/i.test(originalUrl))
                                    ? `${originalUrl.split("#")[0]}#page=${page}`
                                    : originalUrl;
                                return (
                                  <details key={e.id}>
                                    <summary>
                                      Source Passage / {e.section}
                                    </summary>
                                    <blockquote translate="no">
                                      {e.excerpt}
                                    </blockquote>
                                    {href && (
                                      <a
                                        href={href}
                                        target="_blank"
                                        rel="noreferrer"
                                      >
                                        Open original page · {source?.title}
                                      </a>
                                    )}
                                  </details>
                                );
                              })}
                          </div>
                          <div>
                            <label>
                              Editable Field
                              <textarea
                                aria-label={`Edit ${field}`}
                                value={
                                  fieldText[field] ??
                                  (typeof value === "string"
                                    ? value
                                    : JSON.stringify(value, null, 2))
                                }
                                onChange={(e) =>
                                  setFieldText({
                                    ...fieldText,
                                    [field]: e.target.value,
                                  })
                                }
                              />
                            </label>
                            <div className="admin-actions">
                              <button
                                className="button secondary"
                                disabled={busy}
                                onClick={() =>
                                  run(async () => {
                                    const next = {
                                      ...draft,
                                      [field]:
                                        typeof value === "string"
                                          ? (fieldText[field] ?? value)
                                          : JSON.parse(
                                              fieldText[field] ??
                                                JSON.stringify(value),
                                            ),
                                    };
                                    await saveProject(next);
                                    setFieldText({});
                                    setMessage(
                                      "Saved. Inspect the updated content before verification.",
                                    );
                                  })
                                }
                              >
                                Save edited field
                              </button>
                              <button
                                className="button primary"
                                disabled={
                                  busy || fieldText[field] !== undefined
                                }
                                onClick={() =>
                                  run(async () => {
                                    await request(
                                      `/api/admin/projects/${draft.id}/review`,
                                      {
                                        field,
                                        revision: draft.revision,
                                        verified: true,
                                      },
                                    );
                                  })
                                }
                              >
                                Verify
                              </button>
                              <button
                                className="button secondary"
                                disabled={busy}
                                onClick={() =>
                                  run(async () => {
                                    await request(
                                      `/api/admin/projects/${draft.id}/review`,
                                      {
                                        field,
                                        revision: draft.revision,
                                        verified: false,
                                      },
                                    );
                                  })
                                }
                              >
                                Mark as Unverified
                              </button>
                            </div>
                          </div>
                        </div>
                      </section>
                    );
                  })}
                  <p>
                    Verify evidence and decisions above after inspecting their
                    source passages. Verification confirms source support; it is
                    not government endorsement.
                  </p>
                  <div className="admin-actions">
                    {(["review", "verify", "publish"] as const).map(
                      (action, i) => (
                        <button
                          key={action}
                          className="button primary"
                          disabled={
                            busy ||
                            draft.reviewStatus !==
                              ["Draft", "Needs Review", "Verified"][i]
                          }
                          onClick={() =>
                            run(async () => {
                              const response = await fetch(
                                `/api/projects/${draft.id}`,
                                {
                                  method: "PUT",
                                  headers: {
                                    "Content-Type": "application/json",
                                  },
                                  body: JSON.stringify({
                                    action,
                                    revision: draft.revision,
                                    note: `${action} requested in authenticated Review & Verify.`,
                                  }),
                                },
                              );
                              const data = await response.json();
                              if (!response.ok) throw new Error(data.error);
                              setDraft(data.project);
                              setMessage("Review stage updated.");
                            })
                          }
                        >
                          {
                            [
                              "Submit for review",
                              "Approve for Publication",
                              "Publish",
                            ][i]
                          }
                        </button>
                      ),
                    )}
                  </div>
                </>
              )}
            </div>
          </EvidenceProvider>
        </>
      ) : props.document ? (
        <>
          <Link href="/admin?tab=imports">← Import Documents</Link>
          <h2>{props.document.filename}</h2>
          <p>Status: {props.document.status}</p>
          {props.document.error && <p role="alert">{props.document.error}</p>}
          <a
            href={`/api/admin/documents/${props.document.id}/file`}
            target="_blank"
            rel="noreferrer"
          >
            Open original file
          </a>
          {props.document.projectId ? (
            <p>
              <Link
                className="button primary"
                href={`/admin?project=${props.document.projectId}`}
              >
                Review & Verify
              </Link>
            </p>
          ) : null}
          {(!props.document.projectId || props.document.status === "Failed") &&
            props.document.mediaType === "application/pdf" && (
              <>
                <p>
                  {props.configured
                    ? "Analysis sends the extracted page text to OpenAI. Review the text below for unnecessary personal information first."
                    : "AI analysis not configured. Set OPENAI_API_KEY and OPENAI_MODEL on the server."}
                </p>
                <label>
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                  />{" "}
                  I am authorized to send this municipal document for analysis
                  and have checked its personal information.
                </label>
                <button
                  className="button primary"
                  disabled={
                    busy ||
                    !props.configured ||
                    !consent ||
                    !["Extracted", "Failed", "Analyzed"].includes(
                      props.document.status,
                    )
                  }
                  onClick={() =>
                    run(async () => {
                      const result = await request(
                        `/api/admin/documents/${props.document!.id}/analyze`,
                        { consent: true },
                      );
                      router.push(`/admin?project=${result.projectId}`);
                    })
                  }
                >
                  Analyze Document
                </button>
                <p>
                  Refresh to recover persisted progress. No automatic paid
                  retries.
                </p>
              </>
            )}
          {props.document.rawResponse &&
            props.document.extraction &&
            props.document.extractionHash && (
              <CitationReview
                id={props.document.id}
                raw={props.document.rawResponse}
                current={props.document.extraction}
                version={props.document.extractionHash}
                pages={JSON.parse(props.document.pages)}
                pending={props.document.status === "Corrections pending"}
              />
            )}
          {props.document.rawResponse && (
            <details>
              <summary>Saved raw AI response — requires verification</summary>
              <pre>{props.document.rawResponse}</pre>
            </details>
          )}
          {(JSON.parse(props.document.pages) as PageText[]).map((p) => (
            <details key={p.page}>
              <summary>Page {p.page}</summary>
              <pre>{p.text}</pre>
            </details>
          ))}
        </>
      ) : props.tab === "imports" ? (
        <>
          <h2>Import Municipal Document</h2>
          <form
            className="panel"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const file = form.get("file") as File;
              run(async () => {
                const data = await new Promise<string>((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onload = () =>
                    resolve(String(reader.result).split(",")[1]);
                  reader.onerror = reject;
                  reader.readAsDataURL(file);
                });
                const result = await request("/api/admin/documents", {
                  filename: file.name,
                  data,
                  sourceUrl: form.get("sourceUrl"),
                  dataset: form.get("dataset"),
                });
                router.push(`/admin?document=${result.id}`);
              });
            }}
          >
            <label className="admin-file-upload">
              Document (maximum 3 MB)
              <span className="admin-file-upload-control">
                <input
                  type="file"
                  name="file"
                  accept=".pdf,.csv,.xlsx,.json,.xml"
                  required
                  onChange={(event) =>
                    setSelectedFileName(
                      event.currentTarget.files?.[0]?.name ?? "",
                    )
                  }
                />
                <span className="admin-file-upload-button" aria-hidden="true">
                  Choose file
                </span>
                <span className="admin-file-upload-name" aria-hidden="true">
                  {selectedFileName || "No file selected"}
                </span>
              </span>
            </label>
            <label>
              Official source URL
              <input
                type="url"
                name="sourceUrl"
                placeholder="https://www.toronto.ca/…"
              />
            </label>
            <label>
              Structured dataset type
              <select name="dataset">
                <option value="reports">Report Request Log</option>
                <option value="votes">Council Voting Record</option>
              </select>
            </label>
            <button className="button primary" disabled={busy}>
              Upload & Extract
            </button>
            <p>
              Upload extracts text only. GPT runs only after you click Analyze
              Document.
            </p>
          </form>
          {props.imports.map((d) => (
            <section className="panel" key={d.id}>
              <Link href={`/admin?document=${d.id}`}>{d.filename}</Link>
              <p>
                {d.status} · {d.createdAt}
              </p>
              {d.usage && (
                <p>
                  Model: {d.model} · Tokens: {d.usage} · Estimated USD:{" "}
                  {d.costUsd === null
                    ? "Rates not configured"
                    : d.costUsd.toFixed(6)}
                </p>
              )}
              {d.error && <p>{d.error}</p>}
            </section>
          ))}
        </>
      ) : props.tab === "official" ? (
        <>
          <h2>Official Data</h2>
          <form action="/admin">
            <input type="hidden" name="tab" value="official" />
            <label>
              Filter imported records by agenda
              <input name="officialAgenda" placeholder="2024.EX11.8" />
            </label>
            <button className="button secondary">Show records</button>
          </form>
          <form
            className="panel"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              run(async () => {
                const result = await request("/api/admin/official", {
                  action: "create",
                  agendaItem: form.get("agendaItem"),
                  category: form.get("category"),
                });
                router.push(`/admin?project=${result.projectId}`);
              });
            }}
          >
            <h3>Create draft from imported records</h3>
            <label>
              Imported agenda item
              <input name="agendaItem" required placeholder="2024.EX11.8" />
            </label>
            <label>
              Suggested category
              <select name="category">
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <button className="button secondary" disabled={busy}>
              Create review draft
            </button>
          </form>

          <p>
            Report Request Log tracks report requests. Voting Record describes
            individual motions and votes. Neither implies construction
            completion or overall project approval.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              run(async () => {
                const result = await request("/api/admin/official", {
                  agendaItem: form.get("agendaItem"),
                });
                setMessage(
                  `Imported ${result.reports} report request records and ${result.votes} vote records. Exact matches are candidates until confirmed.`,
                );
              });
            }}
          >
            <label>
              Official agenda item number
              <input name="agendaItem" required placeholder="2024.EX11.8" />
            </label>
            <button className="button primary" disabled={busy}>
              Fetch official records
            </button>
          </form>
          {props.official.map((record) => (
            <details className="panel" key={record.id}>
              <summary>
                {record.agendaItem} · {record.dataset} ·{" "}
                {record.confirmedBy
                  ? "Link confirmed"
                  : "Matching requires review"}
              </summary>
              <a
                href={
                  record.sourceUrl.startsWith("https:")
                    ? record.sourceUrl
                    : undefined
                }
                target="_blank"
                rel="noreferrer"
              >
                Official data source
              </a>
              <pre>{record.record}</pre>
              {props.projects
                .filter((p) => p.agendaItem === record.agendaItem)
                .map((p) => (
                  <button
                    className="button secondary"
                    key={p.id}
                    disabled={busy || !!record.confirmedBy}
                    onClick={() =>
                      run(async () => {
                        await request("/api/admin/official", {
                          action: "link",
                          recordId: record.id,
                          projectId: p.id,
                        });
                      })
                    }
                  >
                    Confirm link: {p.title}
                  </button>
                ))}
            </details>
          ))}
        </>
      ) : (
        <>
          <h2>
            {props.tab === "trash"
              ? "Archived / Trash"
              : props.tab === "review"
                ? "Review Queue"
                : "Projects"}
          </h2>
          <CreateProject />
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {props.projects
                  .filter((p) =>
                    props.tab === "trash"
                      ? p.deletedAt || p.archivedAt
                      : !p.deletedAt &&
                        !p.archivedAt &&
                        (props.tab !== "review" ||
                          p.reviewStatus !== "Published"),
                  )
                  .map((p) => (
                    <tr key={p.id}>
                      <td>
                        <Link href={`/admin?project=${p.id}`}>{p.title}</Link>
                        <br />
                        {p.agendaItem}
                      </td>
                      <td>{p.category}</td>
                      <td>
                        {p.deletedAt
                          ? "Deleted"
                          : p.archivedAt
                            ? "Archived"
                            : p.reviewStatus}
                      </td>
                      <td>{actions(p)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <dialog
        ref={dialog}
        className="evidence-dialog"
        aria-labelledby="delete-title"
      >
        <div className="evidence-panel">
          <h2 id="delete-title">Delete project?</h2>
          <p>{pending?.project.title}</p>
          <p>
            This hides the project from the public portal and preserves its
            records in Trash.
          </p>
          <label>
            Type DELETE to confirm
            <input
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
            />
          </label>
          <div className="admin-actions">
            <button
              className="button secondary"
              onClick={() => dialog.current?.close()}
            >
              Cancel
            </button>
            <button
              className="button primary"
              disabled={busy || confirmation !== "DELETE"}
              onClick={() =>
                run(async () => {
                  if (!pending) return;
                  await request("/api/admin/lifecycle", {
                    id: pending.project.id,
                    revision: pending.project.revision,
                    action: "delete",
                    confirmation,
                  });
                  dialog.current?.close();
                  router.push("/admin?tab=trash");
                })
              }
            >
              Confirm deletion
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
