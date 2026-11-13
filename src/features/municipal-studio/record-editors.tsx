"use client";
import { Localized } from "@/lib/i18n/provider";

import { useState } from "react";
import { Plus } from "lucide-react";
import {
  responseTypes,
  geometrySchema,
  type CivicProject,
} from "@/lib/validation/project";
import {
  Field,
  Select,
  EvidenceSelect,
  recordId,
  type EditorProps,
} from "./editor-fields";
export function HistoryEditor({ project: p, update }: EditorProps) {
  return (
    <Localized>
      {
        <>
          <div className="section-heading">
            <h2>Supported timeline events</h2>
            <button
              className="button secondary"
              disabled={!p.decisions.length || !p.evidence.length}
              onClick={() =>
                update({
                  ...p,
                  events: [
                    ...p.events,
                    {
                      id: recordId(),
                      decisionId: p.decisions[0].id,
                      title: "New recorded event",
                      date: new Date().toISOString().slice(0, 10),
                      type: "Staff report",
                      description: "Describe only what the source establishes.",
                      evidenceId: p.evidence[0].id,
                    },
                  ],
                })
              }
            >
              <Plus size={15} />
              Add event
            </button>
          </div>
          {p.events.map((e) => (
            <section className="panel editor-record" key={e.id}>
              <div className="form-grid">
                <Field
                  label="Event title"
                  value={e.title}
                  onChange={(v) =>
                    update({
                      ...p,
                      events: p.events.map((x) =>
                        x.id === e.id ? { ...x, title: v } : x,
                      ),
                    })
                  }
                />
                <Field
                  label="Event date"
                  type="date"
                  value={e.date}
                  onChange={(v) =>
                    update({
                      ...p,
                      events: p.events.map((x) =>
                        x.id === e.id ? { ...x, date: v } : x,
                      ),
                    })
                  }
                />
                <Select
                  label="Event type"
                  value={e.type}
                  options={[
                    "Initial proposal",
                    "Public notice",
                    "Consultation",
                    "Staff report",
                    "Committee meeting",
                    "Council decision",
                    "Amendment",
                    "Additional approval",
                    "Effective date",
                  ]}
                  onChange={(v) =>
                    update({
                      ...p,
                      events: p.events.map((x) =>
                        x.id === e.id ? { ...x, type: v } : x,
                      ),
                    })
                  }
                />
                <Select
                  label="Related decision"
                  value={e.decisionId}
                  options={p.decisions}
                  onChange={(v) =>
                    update({
                      ...p,
                      events: p.events.map((x) =>
                        x.id === e.id ? { ...x, decisionId: v } : x,
                      ),
                    })
                  }
                />
              </div>
              <Field
                label="Event description"
                area
                value={e.description}
                onChange={(v) =>
                  update({
                    ...p,
                    events: p.events.map((x) =>
                      x.id === e.id ? { ...x, description: v } : x,
                    ),
                  })
                }
              />
              <EvidenceSelect
                project={p}
                value={e.evidenceId}
                onChange={(v) =>
                  update({
                    ...p,
                    events: p.events.map((x) =>
                      x.id === e.id ? { ...x, evidenceId: v } : x,
                    ),
                  })
                }
              />
            </section>
          ))}
          <div className="section-heading">
            <h2>Document versions</h2>
            <button
              className="button secondary"
              disabled={!p.evidence.length}
              onClick={() =>
                update({
                  ...p,
                  versions: [
                    ...p.versions,
                    {
                      id: recordId(),
                      label: "New recorded version",
                      date: new Date().toISOString().slice(0, 10),
                      text: "Enter recorded wording.",
                      changeType: "Textual edit",
                      reason: "",
                      evidenceId: p.evidence[0].id,
                    },
                  ],
                })
              }
            >
              <Plus size={15} />
              Add version
            </button>
          </div>
          {p.versions.map((v) => (
            <section className="panel editor-record" key={v.id}>
              <div className="form-grid">
                <Field
                  label="Version label"
                  value={v.label}
                  onChange={(value) =>
                    update({
                      ...p,
                      versions: p.versions.map((x) =>
                        x.id === v.id ? { ...x, label: value } : x,
                      ),
                    })
                  }
                />
                <Field
                  label="Version date"
                  type="date"
                  value={v.date}
                  onChange={(value) =>
                    update({
                      ...p,
                      versions: p.versions.map((x) =>
                        x.id === v.id ? { ...x, date: value } : x,
                      ),
                    })
                  }
                />
              </div>
              <Field
                label="Recorded text"
                area
                value={v.text}
                onChange={(value) =>
                  update({
                    ...p,
                    versions: p.versions.map((x) =>
                      x.id === v.id ? { ...x, text: value } : x,
                    ),
                  })
                }
              />
              <Select
                label="Change classification"
                value={v.changeType}
                options={[
                  "Initial proposal",
                  "Textual edit",
                  "Substantive policy change",
                ]}
                onChange={(value) =>
                  update({
                    ...p,
                    versions: p.versions.map((x) =>
                      x.id === v.id
                        ? { ...x, changeType: value as typeof v.changeType }
                        : x,
                    ),
                  })
                }
              />
              <Field
                label="Documented reason (blank if unavailable)"
                area
                value={v.reason}
                onChange={(value) =>
                  update({
                    ...p,
                    versions: p.versions.map((x) =>
                      x.id === v.id ? { ...x, reason: value } : x,
                    ),
                  })
                }
              />
              <EvidenceSelect
                project={p}
                value={v.evidenceId}
                onChange={(value) =>
                  update({
                    ...p,
                    versions: p.versions.map((x) =>
                      x.id === v.id ? { ...x, evidenceId: value } : x,
                    ),
                  })
                }
              />
            </section>
          ))}
        </>
      }
    </Localized>
  );
}
export function FeedbackEditor({ project: p, update }: EditorProps) {
  function patch(
    id: string,
    values: Partial<CivicProject["feedback"][number]>,
  ) {
    update({
      ...p,
      feedback: p.feedback.map((f) => (f.id === id ? { ...f, ...values } : f)),
    });
  }
  return (
    <Localized>
      {
        <>
          <div className="section-heading">
            <h2>Public concerns & recorded responses</h2>
            <button
              className="button secondary"
              disabled={!p.decisions.length}
              onClick={() =>
                update({
                  ...p,
                  feedback: [
                    ...p.feedback,
                    {
                      id: recordId(),
                      decisionId: p.decisions[0].id,
                      topic: "Accessibility",
                      summary:
                        "Enter an aggregate concern without personal information.",
                      response: "",
                      classification: "No Verified Response Found",
                      amendment: "",
                      date: new Date().toISOString().slice(0, 10),
                      evidenceId: null,
                    },
                  ],
                })
              }
            >
              <Plus size={15} />
              Add theme
            </button>
          </div>
          {p.feedback.map((f) => (
            <section className="panel editor-record" key={f.id}>
              <div className="form-grid">
                <Field
                  label="Feedback topic"
                  value={f.topic}
                  onChange={(v) => patch(f.id, { topic: v })}
                />
                <Field
                  label="Feedback record date"
                  type="date"
                  value={f.date}
                  onChange={(v) => patch(f.id, { date: v })}
                />
              </div>
              <Field
                label="Neutral concern summary"
                area
                value={f.summary}
                onChange={(v) => patch(f.id, { summary: v })}
              />
              <Field
                label="Recorded response (blank if missing)"
                area
                value={f.response}
                onChange={(v) => patch(f.id, { response: v })}
              />
              <Select
                label="Response classification"
                value={f.classification}
                options={responseTypes}
                onChange={(v) =>
                  patch(f.id, { classification: v as typeof f.classification })
                }
              />
              <Field
                label="Documented amendment connection"
                area
                value={f.amendment}
                onChange={(v) => patch(f.id, { amendment: v })}
              />
              <Select
                label="Related decision"
                value={f.decisionId}
                options={p.decisions}
                onChange={(v) => patch(f.id, { decisionId: v })}
              />
              <EvidenceSelect
                project={p}
                value={f.evidenceId ?? ""}
                onChange={(v) => patch(f.id, { evidenceId: v || null })}
              />
            </section>
          ))}
        </>
      }
    </Localized>
  );
}
function GeometryField({
  value,
  onChange,
}: {
  value: CivicProject["scopes"][number]["geometry"];
  onChange: (geometry: CivicProject["scopes"][number]["geometry"]) => void;
}) {
  const [text, setText] = useState(JSON.stringify(value, null, 2)),
    [error, setError] = useState("");
  return (
    <Localized>
      {
        <div>
          <Field
            label="GeoJSON geometry (Point, LineString, or Polygon)"
            area
            value={text}
            onChange={setText}
          />
          <button
            className="button secondary"
            onClick={() => {
              try {
                const parsed = geometrySchema.safeParse(JSON.parse(text));
                if (!parsed.success) {
                  setError(parsed.error.issues.map((i) => i.message).join(" "));
                  return;
                }
                onChange(parsed.data);
                setError(
                  "Valid geometry applied. Save the draft to persist it.",
                );
              } catch {
                setError("Enter valid GeoJSON geometry JSON.");
              }
            }}
          >
            Validate and apply geometry
          </button>
          <p className="small" role="status">
            {error}
          </p>
        </div>
      }
    </Localized>
  );
}
export function GeographyEditor({ project: p, update }: EditorProps) {
  return (
    <Localized>
      {
        <>
          <div className="section-heading">
            <div>
              <h2>Source-linked geographic records</h2>
              <p className="muted">
                Import only source-supported geometry. Demonstration extents
                must remain clearly fictional.
              </p>
            </div>
            <button
              className="button secondary"
              disabled={!p.decisions.length || !p.evidence.length}
              onClick={() =>
                update({
                  ...p,
                  scopes: [
                    ...p.scopes,
                    {
                      id: recordId(),
                      decisionId: p.decisions[0].id,
                      label: "New geographic record",
                      kind: "Project boundary",
                      geometry: { type: "Point", coordinates: [0, 0] },
                      description:
                        "Replace this draft point with source-supported geometry before review.",
                      evidenceId: p.evidence[0].id,
                    },
                  ],
                })
              }
            >
              <Plus size={15} />
              Add scope
            </button>
          </div>
          {p.scopes.map((s) => (
            <section className="panel editor-record" key={s.id}>
              <Field
                label="Geographic label"
                value={s.label}
                onChange={(v) =>
                  update({
                    ...p,
                    scopes: p.scopes.map((x) =>
                      x.id === s.id ? { ...x, label: v } : x,
                    ),
                  })
                }
              />
              <Select
                label="Layer kind"
                value={s.kind}
                options={[
                  "Project boundary",
                  "Transportation feature",
                  "Municipality boundary",
                  "Planning area",
                  "Study area",
                  "Neighbourhood boundary",
                  "Land-use feature",
                ]}
                onChange={(v) =>
                  update({
                    ...p,
                    scopes: p.scopes.map((x) =>
                      x.id === s.id ? { ...x, kind: v as typeof s.kind } : x,
                    ),
                  })
                }
              />
              <Field
                label="Geographic description and limitations"
                area
                value={s.description}
                onChange={(v) =>
                  update({
                    ...p,
                    scopes: p.scopes.map((x) =>
                      x.id === s.id ? { ...x, description: v } : x,
                    ),
                  })
                }
              />
              <Select
                label="Related decision"
                value={s.decisionId}
                options={p.decisions}
                onChange={(v) =>
                  update({
                    ...p,
                    scopes: p.scopes.map((x) =>
                      x.id === s.id ? { ...x, decisionId: v } : x,
                    ),
                  })
                }
              />
              <EvidenceSelect
                project={p}
                value={s.evidenceId}
                onChange={(v) =>
                  update({
                    ...p,
                    scopes: p.scopes.map((x) =>
                      x.id === s.id ? { ...x, evidenceId: v } : x,
                    ),
                  })
                }
              />
              <GeometryField
                value={s.geometry}
                onChange={(geometry) =>
                  update({
                    ...p,
                    scopes: p.scopes.map((x) =>
                      x.id === s.id ? { ...x, geometry } : x,
                    ),
                  })
                }
              />
            </section>
          ))}
        </>
      }
    </Localized>
  );
}
