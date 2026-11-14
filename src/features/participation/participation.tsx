"use client";
import { Localized } from "@/lib/i18n/provider";

import { useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  ExternalLink,
  NotebookPen,
  Save,
  Download,
  Trash2,
} from "lucide-react";
import type { CivicProject } from "@/lib/validation/project";
import {
  participationStatus,
  projectParticipation,
} from "@/lib/evidence/policy";
import { LocalizedDate } from "@/lib/i18n/provider";
import { Badge, Empty, SectionTitle } from "@/components/ui/shared";
import { EvidenceButton } from "@/components/evidence/evidence-provider";
type Concern = {
  decision: string;
  concern: string;
  question: string;
  clarification: string;
};
export function Participation({
  project,
  writingMode = false,
}: {
  project: CivicProject;
  writingMode?: boolean;
}) {
  const empty: Concern = {
    decision: project.decisions[0]?.id ?? "",
    concern: "",
    question: "",
    clarification: "",
  };
  const [draft, setDraft] = useState<Concern>(empty),
    [message, setMessage] = useState("");
  const storageKey = `civictrace:concern:${project.id}`;
  function store() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(draft));
      setMessage("Draft saved on this device. Nothing was submitted.");
    } catch {
      setMessage(
        "Browser storage is unavailable. Use Download draft to keep your work.",
      );
    }
  }
  function load() {
    try {
      const text = localStorage.getItem(storageKey);
      if (!text) {
        setMessage("No saved draft for this project.");
        return;
      }
      const value = JSON.parse(text) as Partial<Concern>;
      if (
        ![
          value.decision,
          value.concern,
          value.question,
          value.clarification,
        ].every((v) => typeof v === "string")
      )
        throw Error();
      setDraft(value as Concern);
      setMessage("Saved draft loaded.");
    } catch {
      setMessage("The saved draft could not be loaded.");
    }
  }
  function download() {
    const text = `${project.title}\nDecision: ${project.decisions.find((d) => d.id === draft.decision)?.title ?? "Not selected"}\n\nMy concern\n${draft.concern}\n\nMy question\n${draft.question}\n\nWhat I would like clarified\n${draft.clarification}\n\nPersonal draft — not submitted.`;
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.id}-questions.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage("Draft downloaded. Nothing was submitted.");
  }
  const current = projectParticipation(project);
  return (
    <Localized>
      {
        <>
          <SectionTitle
            title={writingMode ? "Draft your message" : "How to participate"}
          />
          {!writingMode && (
            <div className="participation-banner">
              <CalendarDays size={27} />
              <div>
                <h3>
                  {project.synthetic
                    ? "No real submissions are available in this fictional case."
                    : current === "Open"
                      ? "A recorded participation window is open."
                      : "Check the recorded opportunities below."}
                </h3>
                <p>
                  {project.synthetic ? (
                    <>
                      The example timeline currently shows: {current}. It is a
                      demonstration, not an official invitation.
                    </>
                  ) : (
                    "Use the official instructions to confirm availability before participating."
                  )}
                </p>
              </div>
            </div>
          )}
          <div className="action-grid">
            <section>
              <h2>Participation record</h2>
              {project.opportunities.length ? (
                project.opportunities.map((o) => {
                  const status = participationStatus(o, project.synthetic);
                  return (
                    <article className="panel opportunity-card" key={o.id}>
                      <div className="row between">
                        <CalendarDays size={20} />
                        <Badge tone={status === "Open" ? "teal" : "amber"}>
                          {project.synthetic ? "Demo: " : ""}
                          {!project.synthetic &&
                          o.confirmed &&
                          o.verifiedAt &&
                          o.evidenceId &&
                          o.url &&
                          ((status === "Verification Required" && !o.opensAt) ||
                            status === "No Verified Opportunity")
                            ? "See official instructions"
                            : status}
                        </Badge>
                      </div>
                      <h3>{o.method}</h3>
                      {status === "Closed" && (
                        <p className="eyebrow">HISTORICAL CONSULTATION</p>
                      )}
                      <p>{o.description}</p>
                      <dl className="detail-list">
                        <div>
                          <dt>Opens</dt>
                          <dd>
                            {o.confirmed && !o.opensAt ? (
                              "Opening date not stated"
                            ) : o.confirmed ? (
                              <LocalizedDate
                                value={o.opensAt}
                                includeTime
                                timeZone={o.timeZone}
                              />
                            ) : (
                              "Not verified"
                            )}
                          </dd>
                        </div>
                        <div>
                          <dt>
                            {o.closedOn ? "Closed on (date only)" : "Deadline"}
                          </dt>
                          <dd>
                            {o.confirmed ? (
                              o.closedOn ? (
                                <LocalizedDate value={o.closedOn} />
                              ) : (
                                <LocalizedDate
                                  value={o.deadline}
                                  includeTime
                                  timeZone={o.timeZone}
                                />
                              )
                            ) : (
                              "Not verified"
                            )}
                          </dd>
                        </div>
                        <div>
                          <dt>Time zone</dt>
                          <dd>{o.timeZone}</dd>
                        </div>
                        <div>
                          <dt>Last review</dt>
                          <dd>{<LocalizedDate value={o.verifiedAt} />}</dd>
                        </div>
                      </dl>
                      <div className="tags">
                        {o.evidenceId && <EvidenceButton id={o.evidenceId} />}
                        <Link
                          className="text-link"
                          href={`/projects/${project.id}/decisions#${o.decisionId}`}
                        >
                          Related decision
                        </Link>
                      </div>
                      {!project.synthetic &&
                      o.confirmed &&
                      o.verifiedAt &&
                      o.evidenceId &&
                      o.url ? (
                        <a
                          className="button primary full"
                          href={o.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {status === "Closed"
                            ? "View historical instructions"
                            : "Open official instructions"}
                          <ExternalLink size={15} />
                        </a>
                      ) : (
                        <p className="unavailable">
                          {project.synthetic
                            ? "Official participation link unavailable for fictional data."
                            : "No verified official participation link is available."}
                        </p>
                      )}
                    </article>
                  );
                })
              ) : (
                <Empty title="No Verified Opportunity">
                  There is no verified participation window in the available
                  records.
                </Empty>
              )}
            </section>
            <section className="panel concern-organizer">
              <div className="row between">
                <NotebookPen size={23} />
              </div>
              <h2>
                {writingMode
                  ? "Write your questions"
                  : "Organize your questions."}
              </h2>
              <p className="muted">Draft only. Not submitted.</p>
              <label>
                Decision item
                <select
                  aria-label="Decision item"
                  value={draft.decision}
                  onChange={(e) =>
                    setDraft({ ...draft, decision: e.target.value })
                  }
                >
                  {project.decisions.map((d) => (
                    <option value={d.id} key={d.id}>
                      {d.title}
                    </option>
                  ))}
                </select>
              </label>
              {[
                {
                  key: "concern" as const,
                  label: "My concern",
                  placeholder: "What matters to you about this proposal?",
                },
                {
                  key: "question" as const,
                  label: "My question",
                  placeholder: "What would you like to ask?",
                },
                {
                  key: "clarification" as const,
                  label: "What I would like clarified",
                  placeholder:
                    "Which condition, date, or detail needs more explanation?",
                },
              ].map((f) => (
                <label key={f.key}>
                  {f.label}
                  <textarea
                    aria-label={f.label}
                    maxLength={5000}
                    rows={3}
                    value={draft[f.key]}
                    placeholder={f.placeholder}
                    onChange={(e) =>
                      setDraft({ ...draft, [f.key]: e.target.value })
                    }
                  />
                </label>
              ))}
              <div className="button-group">
                <button className="button primary" onClick={store}>
                  <Save size={15} />
                  Save on this device
                </button>
                <button className="button secondary" onClick={load}>
                  Load saved draft
                </button>
                <button className="button secondary" onClick={download}>
                  <Download size={15} />
                  Download
                </button>
                <button
                  className="text-button"
                  onClick={() => {
                    try {
                      localStorage.removeItem(storageKey);
                      setDraft(empty);
                      setMessage("Saved draft cleared from this device.");
                    } catch {
                      setMessage("Browser storage is unavailable.");
                    }
                  }}
                >
                  <Trash2 size={14} />
                  Clear draft
                </button>
              </div>
              <p className="form-status" role="status">
                {message}
              </p>
            </section>
          </div>
        </>
      }
    </Localized>
  );
}
