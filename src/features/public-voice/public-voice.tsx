"use client";
import { Localized } from "@/lib/i18n/provider";

import { useState } from "react";
import Link from "next/link";
import { MessagesSquare, CornerDownRight, ArrowRight } from "lucide-react";
import { type CivicProject, responseTypes } from "@/lib/validation/project";
import { filterFeedback } from "@/lib/evidence/policy";
import { LocalizedDate } from "@/lib/i18n/provider";
import { Badge, Empty, SectionTitle } from "@/components/ui/shared";
import { EvidenceButton } from "@/components/evidence/evidence-provider";
export function PublicVoice({
  project,
  initialDecision = "",
}: {
  project: CivicProject;
  initialDecision?: string;
}) {
  const [topic, setTopic] = useState(""),
    [response, setResponse] = useState(""),
    [decision, setDecision] = useState(initialDecision);
  const feedback = filterFeedback(project, topic, response, decision);
  return (
    <Localized>
      {
        <>
          <SectionTitle
            eyebrow="03 / PUBLIC VOICE TRACE"
            title="What people raised. What the record says."
            description="Follow documented concerns, responses, and amendments without assuming a causal link."
          />
          <div className="voice-intro panel">
            <MessagesSquare size={28} />
            <div>
              <h3>Public input, with its evidence attached.</h3>
              <p>
                {project.feedback.length} recorded themes in this{" "}
                {project.synthetic ? "fictional" : "published"} case.
                Participation counts are unavailable; themes do not represent
                numbers of people.
              </p>
            </div>
            <Link
              className="text-link"
              href={`/projects/${project.id}/decisions`}
            >
              See the timeline <ArrowRight size={16} />
            </Link>
          </div>
          <div className="filters">
            <label>
              Topic
              <select
                aria-label="Topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              >
                <option value="">All topics</option>
                {[...new Set(project.feedback.map((f) => f.topic))].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label>
              Response type
              <select
                aria-label="Response type"
                value={response}
                onChange={(e) => setResponse(e.target.value)}
              >
                <option value="">All response types</option>
                {responseTypes.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </label>
            <label>
              Decision item
              <select
                aria-label="Decision item"
                value={decision}
                onChange={(e) => setDecision(e.target.value)}
              >
                <option value="">All decision items</option>
                {project.decisions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="small muted" aria-live="polite">
            {feedback.length} matching themes · aggregate summaries only
          </p>
          <div className="feedback-list">
            {feedback.length ? (
              feedback.map((f) => (
                <article className="panel feedback-card" key={f.id}>
                  <div className="row between">
                    <span className="category">{f.topic}</span>
                    <Badge
                      tone={
                        f.classification === "No Verified Response Found"
                          ? "amber"
                          : "teal"
                      }
                    >
                      {f.classification}
                    </Badge>
                  </div>
                  <h3>Public concern</h3>
                  <p>{f.summary}</p>
                  <div className="response-block">
                    <CornerDownRight size={20} />
                    <div>
                      <span className="eyebrow">
                        {project.synthetic
                          ? "FICTIONAL RECORDED RESPONSE"
                          : "RECORDED OFFICIAL RESPONSE"}
                      </span>
                      <p>
                        {f.response ||
                          "No verified response was found in the available records. Missing evidence is not an official rejection."}
                      </p>
                    </div>
                  </div>
                  {f.amendment && (
                    <div className="amendment-block">
                      <strong>Documented connection → amendment</strong>
                      <p>{f.amendment}</p>
                    </div>
                  )}
                  <div className="card-footer">
                    <span>{<LocalizedDate value={f.date} />}</span>
                    <div className="row">
                      {f.evidenceId && <EvidenceButton id={f.evidenceId} />}
                      <Link
                        className="text-link"
                        href={`/projects/${project.id}/decisions#${f.decisionId}`}
                      >
                        Related decision <ArrowRight size={14} />
                      </Link>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <Empty
                title={
                  project.feedback.length
                    ? "No feedback matches these filters"
                    : "Public feedback has not been verified"
                }
              >
                {project.feedback.length
                  ? "Choose another topic or response type."
                  : "No source-linked public feedback has been imported. Absence of a record does not mean no feedback was received."}
              </Empty>
            )}
          </div>
        </>
      }
    </Localized>
  );
}
