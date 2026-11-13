"use client";
import { Localized } from "@/lib/i18n/provider";

import { Plus } from "lucide-react";
import {
  decisionStatuses,
  reviewStates,
  type Decision,
} from "@/lib/validation/project";
import { Field, Select, recordId, type EditorProps } from "./editor-fields";
export function DecisionEditor({ project: p, update }: EditorProps) {
  function patch(id: string, values: Partial<Decision>, review = false) {
    update({
      ...p,
      decisions: p.decisions.map((d) =>
        d.id === id
          ? {
              ...d,
              ...values,
              ...(!review
                ? { reviewState: "Needs Verification" as const }
                : {}),
            }
          : d,
      ),
    });
  }
  return (
    <Localized>
      {
        <>
          <div className="section-heading">
            <div>
              <h2>Decision items & claims</h2>
              <p className="muted">
                Preserve conditions and uncertainty. Review each claim against
                its selected passages.
              </p>
            </div>
            <button
              className="button secondary"
              onClick={() =>
                update({
                  ...p,
                  decisions: [
                    ...p.decisions,
                    {
                      id: recordId(),
                      title: "New decision item",
                      explanation: "Enter a source-backed explanation.",
                      status: "Unknown",
                      authority: p.authority,
                      conditions: "",
                      amendment: "",
                      uncertainty: "Not yet reviewed.",
                      date: null,
                      reviewState: "Draft",
                      notes: "",
                      evidenceIds: [],
                    },
                  ],
                })
              }
            >
              <Plus size={16} />
              Add decision item
            </button>
          </div>
          {p.decisions.map((d, index) => (
            <section className="panel editor-record" key={d.id}>
              <h3>Decision item {index + 1}</h3>
              <Field
                label="Decision title"
                value={d.title}
                onChange={(v) => patch(d.id, { title: v })}
              />
              <Field
                label="Plain-language explanation"
                area
                value={d.explanation}
                onChange={(v) => patch(d.id, { explanation: v })}
              />
              <div className="form-grid">
                <Select
                  label="Procedural decision status"
                  value={d.status}
                  options={decisionStatuses}
                  onChange={(v) =>
                    patch(d.id, { status: v as Decision["status"] })
                  }
                />
                <Field
                  label="Responsible authority"
                  value={d.authority}
                  onChange={(v) => patch(d.id, { authority: v })}
                />
                <Field
                  label="Decision record date"
                  type="date"
                  value={d.date}
                  onChange={(v) => patch(d.id, { date: v || null })}
                />
              </div>
              <Field
                label="Important conditions"
                area
                value={d.conditions}
                onChange={(v) => patch(d.id, { conditions: v })}
              />
              <Field
                label="Documented amendments"
                area
                value={d.amendment}
                onChange={(v) => patch(d.id, { amendment: v })}
              />
              <Field
                label="Uncertainty"
                area
                value={d.uncertainty}
                onChange={(v) => patch(d.id, { uncertainty: v })}
              />
              <fieldset>
                <legend>Associate supporting evidence</legend>
                {p.evidence.length ? (
                  p.evidence.map((e) => (
                    <label className="checkbox-label" key={e.id}>
                      <input
                        type="checkbox"
                        checked={d.evidenceIds.includes(e.id)}
                        onChange={(event) =>
                          patch(d.id, {
                            evidenceIds: event.target.checked
                              ? [...d.evidenceIds, e.id]
                              : d.evidenceIds.filter((id) => id !== e.id),
                          })
                        }
                      />
                      {p.sources.find((s) => s.id === e.sourceId)?.title} ·{" "}
                      {e.section}
                    </label>
                  ))
                ) : (
                  <p>Add a source and passage first.</p>
                )}
              </fieldset>
              <div className="form-grid">
                <Select
                  label="Claim review state"
                  value={d.reviewState}
                  options={reviewStates}
                  onChange={(v) =>
                    patch(
                      d.id,
                      { reviewState: v as Decision["reviewState"] },
                      true,
                    )
                  }
                />
                <Field
                  label="Claim reviewer notes"
                  value={d.notes}
                  onChange={(v) => patch(d.id, { notes: v })}
                />
              </div>
              <p className="small muted">
                {p.synthetic
                  ? "Verified means internally reviewed demonstration content. It never means official confirmation."
                  : "Mark contradictory or incomplete claims Needs Verification. A project cannot be published until conflicts are resolved."}
              </p>
            </section>
          ))}
        </>
      }
    </Localized>
  );
}
