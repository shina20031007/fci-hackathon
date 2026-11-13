"use client";
import { Localized } from "@/lib/i18n/provider";

import { Plus, FileCheck2 } from "lucide-react";
import {
  documentTypes,
  evidenceStates,
  type Evidence,
} from "@/lib/validation/project";
import { Field, Select, recordId, type EditorProps } from "./editor-fields";
export function SourceEditor({ project: p, update }: EditorProps) {
  function changeEvidence(
    id: string,
    patch: Partial<Evidence>,
    review = false,
  ) {
    update({
      ...p,
      evidence: p.evidence.map((e) =>
        e.id === id
          ? { ...e, ...patch, ...(!review ? { verifiedAt: null } : {}) }
          : e,
      ),
      decisions: p.decisions.map((d) =>
        d.evidenceIds.includes(id)
          ? { ...d, reviewState: "Needs Verification" }
          : d,
      ),
    });
  }
  function changeSource(id: string, patch: Partial<CivicSource>) {
    const ids = p.evidence.filter((e) => e.sourceId === id).map((e) => e.id);
    update({
      ...p,
      sources: p.sources.map((s) => (s.id === id ? { ...s, ...patch } : s)),
      evidence: p.evidence.map((e) =>
        e.sourceId === id ? { ...e, verifiedAt: null } : e,
      ),
      decisions: p.decisions.map((d) =>
        d.evidenceIds.some((e) => ids.includes(e))
          ? { ...d, reviewState: "Needs Verification" }
          : d,
      ),
    });
  }
  type CivicSource = (typeof p.sources)[number];
  return (
    <Localized>
      {
        <>
          <div className="section-heading">
            <div>
              <h2>Source documents & exact passages</h2>
              <p className="muted">
                Editing a source invalidates the review of its evidence and
                linked claims.
              </p>
            </div>
            <button
              className="button secondary"
              onClick={() => {
                const sourceId = recordId(),
                  evidenceId = recordId();
                update({
                  ...p,
                  sources: [
                    ...p.sources,
                    {
                      id: sourceId,
                      title: "New source document",
                      type: "Staff report",
                      url: null,
                      date: null,
                      synthetic: p.synthetic,
                    },
                  ],
                  evidence: [
                    ...p.evidence,
                    {
                      id: evidenceId,
                      sourceId,
                      excerpt: "Enter the exact supporting passage.",
                      section: "Section reference required",
                      state: "Requires Verification",
                      verifiedAt: null,
                      notes: "",
                    },
                  ],
                });
              }}
            >
              <Plus size={16} />
              Add source
            </button>
          </div>
          {p.sources.map((s, index) => (
            <section className="panel editor-record" key={s.id}>
              <div className="row between">
                <h3>Source {index + 1}</h3>
                <span className="badge badge-amber">
                  {s.synthetic
                    ? "Fictional source"
                    : "Real source · review required"}
                </span>
              </div>
              <div className="form-grid">
                <Field
                  label="Document title"
                  value={s.title}
                  onChange={(v) => changeSource(s.id, { title: v })}
                />
                <Select
                  label="Document type"
                  value={s.type}
                  options={documentTypes}
                  onChange={(v) =>
                    changeSource(s.id, { type: v as CivicSource["type"] })
                  }
                />
                <Field
                  label="Official URL (HTTPS, or leave blank)"
                  value={s.url ?? ""}
                  onChange={(v) => changeSource(s.id, { url: v || null })}
                />
                <Field
                  label="Publication date"
                  type="date"
                  value={s.date}
                  onChange={(v) => changeSource(s.id, { date: v || null })}
                />
              </div>
              {p.evidence
                .filter((e) => e.sourceId === s.id)
                .map((e) => (
                  <div className="evidence-editor" key={e.id}>
                    <Field
                      label="Page or section"
                      value={e.section}
                      onChange={(v) => changeEvidence(e.id, { section: v })}
                    />
                    <Field
                      label="Exact supporting passage"
                      area
                      value={e.excerpt}
                      onChange={(v) => changeEvidence(e.id, { excerpt: v })}
                    />
                    <Select
                      label="Evidence state"
                      value={e.state}
                      options={
                        p.synthetic
                          ? ["Requires Verification", "Insufficient Evidence"]
                          : evidenceStates
                      }
                      onChange={(v) =>
                        changeEvidence(e.id, { state: v as Evidence["state"] })
                      }
                    />
                    <Field
                      label="Evidence reviewer notes"
                      area
                      value={e.notes}
                      onChange={(v) => changeEvidence(e.id, { notes: v })}
                    />
                    <label className="review-checkbox">
                      <input
                        type="checkbox"
                        checked={!!e.verifiedAt}
                        onChange={(event) =>
                          changeEvidence(
                            e.id,
                            {
                              verifiedAt: event.target.checked
                                ? new Date().toISOString()
                                : null,
                            },
                            true,
                          )
                        }
                      />
                      <FileCheck2 size={18} />
                      {p.synthetic
                        ? "I checked this fictional passage for internal consistency only."
                        : "I checked the source, exact passage, date, and evidence classification."}
                    </label>
                  </div>
                ))}
              <button
                className="text-button"
                onClick={() =>
                  update({
                    ...p,
                    evidence: [
                      ...p.evidence,
                      {
                        id: recordId(),
                        sourceId: s.id,
                        excerpt: "Enter another exact passage.",
                        section: "Section reference required",
                        state: "Requires Verification",
                        verifiedAt: null,
                        notes: "",
                      },
                    ],
                  })
                }
              >
                <Plus size={14} />
                Add another passage
              </button>
            </section>
          ))}
        </>
      }
    </Localized>
  );
}
