"use client";
import { Localized } from "@/lib/i18n/provider";

import { Plus } from "lucide-react";
import type { Opportunity } from "@/lib/validation/project";
import {
  Field,
  Select,
  EvidenceSelect,
  recordId,
  type EditorProps,
} from "./editor-fields";
export function ParticipationEditor({ project: p, update }: EditorProps) {
  function patch(id: string, values: Partial<Opportunity>, review = false) {
    update({
      ...p,
      opportunities: p.opportunities.map((o) =>
        o.id === id
          ? {
              ...o,
              ...values,
              ...(!review ? { confirmed: false, verifiedAt: null } : {}),
            }
          : o,
      ),
    });
  }
  return (
    <Localized>
      {
        <>
          <div className="section-heading">
            <div>
              <h2>Participation verification</h2>
              <p className="muted">
                Use source-confirmed timestamps with a UTC offset. Never infer a
                deadline from a meeting.
              </p>
            </div>
            <button
              className="button secondary"
              disabled={!p.decisions.length}
              onClick={() =>
                update({
                  ...p,
                  opportunities: [
                    ...p.opportunities,
                    {
                      id: recordId(),
                      decisionId: p.decisions[0].id,
                      method: "Written comments",
                      description:
                        "Enter the official participation instructions.",
                      opensAt: null,
                      deadline: null,
                      meetingAt: null,
                      timeZone: "America/Toronto",
                      url: null,
                      verifiedAt: null,
                      evidenceId: null,
                      confirmed: false,
                    },
                  ],
                })
              }
            >
              <Plus size={16} />
              Add opportunity
            </button>
          </div>
          {p.opportunities.map((o) => (
            <section className="panel editor-record" key={o.id}>
              <Field
                label="Participation method"
                value={o.method}
                onChange={(v) => patch(o.id, { method: v })}
              />
              <Field
                label="Participation description"
                area
                value={o.description}
                onChange={(v) => patch(o.id, { description: v })}
              />
              <div className="form-grid">
                <Select
                  label="Related decision item"
                  value={o.decisionId}
                  options={p.decisions}
                  onChange={(v) => patch(o.id, { decisionId: v })}
                />
                <Field
                  label="Official participation URL"
                  value={o.url ?? ""}
                  onChange={(v) => patch(o.id, { url: v || null })}
                />
                <Field
                  label="Opening timestamp (e.g. 2026-11-01T09:00:00-05:00)"
                  value={o.opensAt ?? ""}
                  onChange={(v) => patch(o.id, { opensAt: v || null })}
                />
                <Field
                  label="Deadline timestamp (blank if unknown)"
                  value={o.deadline ?? ""}
                  onChange={(v) => patch(o.id, { deadline: v || null })}
                />
                <Field
                  label="Confirmed closing date (when no closing time is published)"
                  type="date"
                  value={o.closedOn ?? ""}
                  onChange={(v) => patch(o.id, { closedOn: v || null })}
                />
                <Field
                  label="Meeting timestamp (separate from deadline)"
                  value={o.meetingAt ?? ""}
                  onChange={(v) => patch(o.id, { meetingAt: v || null })}
                />
                <Field
                  label="IANA time zone"
                  value={o.timeZone}
                  onChange={(v) => patch(o.id, { timeZone: v })}
                />
              </div>
              <EvidenceSelect
                project={p}
                value={o.evidenceId ?? ""}
                onChange={(v) => patch(o.id, { evidenceId: v || null })}
              />
              <label className="review-checkbox">
                <input
                  type="checkbox"
                  checked={o.confirmed}
                  onChange={(e) =>
                    patch(
                      o.id,
                      {
                        confirmed: e.target.checked,
                        verifiedAt: e.target.checked
                          ? new Date().toISOString()
                          : null,
                      },
                      true,
                    )
                  }
                />
                {p.synthetic
                  ? "Dates checked against the fictional notice; not a live opportunity."
                  : "I verified the participation instructions and recorded dates against the official source."}
              </label>
              <p className="small muted">
                Open, upcoming, and closed states are calculated from confirmed
                dates. Unconfirmed records remain Verification Required.
              </p>
            </section>
          ))}
        </>
      }
    </Localized>
  );
}
