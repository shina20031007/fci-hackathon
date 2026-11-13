"use client";
import { Localized } from "@/lib/i18n/provider";

import { useState } from "react";
import { diffWords } from "diff";
import {
  GitBranch,
  ArrowRight,
  Clock3,
  ShieldCheck,
  GitCompareArrows,
} from "lucide-react";
import Link from "next/link";
import { type CivicProject } from "@/lib/validation/project";
import { orderedEvents } from "@/lib/evidence/policy";
import { LocalizedDate } from "@/lib/i18n/provider";
import { Badge, Empty, SectionTitle } from "@/components/ui/shared";
import { EvidenceButton } from "@/components/evidence/evidence-provider";
export function DecisionDNA({ project }: { project: CivicProject }) {
  const events = orderedEvents(project);
  const [eventId, setEventId] = useState(events.at(-1)?.id ?? "");
  const event = events.find((e) => e.id === eventId);
  const versions = [...project.versions].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  const [previous, setPrevious] = useState(versions[0]?.id ?? ""),
    [updated, setUpdated] = useState(versions.at(-1)?.id ?? "");
  const before = versions.find((v) => v.id === previous),
    after = versions.find((v) => v.id === updated);
  return (
    <Localized>
      {
        <>
          <SectionTitle title="Decision DNA" />
          <div className="decision-summary">
            <GitBranch size={23} />
            <div>
              <p className="eyebrow">CURRENT PROCEDURAL STAGE</p>
              <h3>{project.status}</h3>
              <p>{project.authority}</p>
            </div>
            <EvidenceButton id={project.summaryEvidenceId}>
              Inspect project evidence
            </EvidenceButton>
          </div>
          <div className="decision-content">
            <section className="panel timeline-panel">
              <SectionTitle title="The decision trail" />
              <ol className="timeline">
                {events.map((e, index) => (
                  <li key={e.id} className={e.id === eventId ? "selected" : ""}>
                    <button
                      onClick={() => setEventId(e.id)}
                      aria-pressed={e.id === eventId}
                    >
                      <span className="timeline-dot">{index + 1}</span>
                      <span>
                        <small>{<LocalizedDate value={e.date} />}</small>
                        <strong>{e.title}</strong>
                        <span>{e.type}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
              {event ? (
                <div className="timeline-detail">
                  <Badge tone="blue">{event.type}</Badge>
                  <h3>{event.title}</h3>
                  <p>{event.description}</p>
                  <EvidenceButton id={event.evidenceId} />
                </div>
              ) : (
                <Empty title="No supported events">
                  A timeline will appear when source-linked events are recorded.
                </Empty>
              )}
            </section>
            <section className="decision-items">
              <SectionTitle title="Inside the decision" />
              {project.decisions.map((d, index) => (
                <article className="panel decision-item" key={d.id} id={d.id}>
                  <div className="row between">
                    <span className="item-number">
                      ITEM {String(index + 1).padStart(2, "0")}
                    </span>
                    <Badge tone="blue">{d.status}</Badge>
                  </div>
                  <h3>{d.title}</h3>
                  <p className="decision-explanation">{d.explanation}</p>
                  <div className="condition">
                    <ShieldCheck size={17} />
                    <div>
                      <strong>Conditions that still matter</strong>
                      <p>
                        {d.conditions ||
                          "No conditions recorded. Check source completeness."}
                      </p>
                    </div>
                  </div>
                  <dl className="stacked-details">
                    <div>
                      <dt>Documented amendment</dt>
                      <dd>{d.amendment || "No documented amendment."}</dd>
                    </div>
                    <div>
                      <dt>What remains uncertain</dt>
                      <dd>
                        {d.uncertainty ||
                          "No uncertainty note recorded; this is not proof of certainty."}
                      </dd>
                    </div>
                    <div>
                      <dt>Authority & date</dt>
                      <dd>
                        {d.authority} · {<LocalizedDate value={d.date} />}
                      </dd>
                    </div>
                  </dl>
                  <div className="tags">
                    {d.evidenceIds.length ? (
                      d.evidenceIds.map((id) => (
                        <EvidenceButton key={id} id={id} />
                      ))
                    ) : (
                      <Badge tone="amber">Insufficient Evidence</Badge>
                    )}
                  </div>
                  <div className="item-links">
                    <Link
                      href={`/projects/${project.id}/public-voice?decision=${d.id}`}
                    >
                      Related public input <ArrowRight size={13} />
                    </Link>
                    <Link href={`/projects/${project.id}/impact`}>
                      Geographic context <ArrowRight size={13} />
                    </Link>
                    <Link href={`/projects/${project.id}/participation`}>
                      Participation <ArrowRight size={13} />
                    </Link>
                  </div>
                </article>
              ))}
            </section>
          </div>
          <section
            className="panel version-panel"
            id="recorded-versions"
            tabIndex={-1}
          >
            <SectionTitle
              eyebrow="WHAT CHANGED"
              title="Compare the recorded versions"
            >
              <GitCompareArrows size={23} />
            </SectionTitle>
            {versions.length < 2 ? (
              <Empty title="Comparison unavailable">
                Two source-linked document versions are required.
              </Empty>
            ) : (
              <>
                <div className="comparison-selects">
                  <label>
                    Previous version
                    <select
                      aria-label="Previous version"
                      value={previous}
                      onChange={(e) => setPrevious(e.target.value)}
                    >
                      {versions.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.label} · {<LocalizedDate value={v.date} />}
                        </option>
                      ))}
                    </select>
                  </label>
                  <ArrowRight size={20} />
                  <label>
                    Updated version
                    <select
                      aria-label="Updated version"
                      value={updated}
                      onChange={(e) => setUpdated(e.target.value)}
                    >
                      {versions.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.label} · {<LocalizedDate value={v.date} />}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                {before &&
                  after &&
                  (previous === updated ? (
                    <div className="notice">
                      Select two different versions to compare their text.
                    </div>
                  ) : (
                    <>
                      <div className="comparison-grid">
                        <div>
                          <span className="eyebrow">PREVIOUS TEXT</span>
                          <p translate="no" lang="en">
                            {before.text}
                          </p>
                          <EvidenceButton id={before.evidenceId} />
                        </div>
                        <div>
                          <span className="eyebrow">UPDATED TEXT</span>
                          <p translate="no" lang="en">
                            {after.text}
                          </p>
                          <EvidenceButton id={after.evidenceId} />
                        </div>
                      </div>
                      <div className="word-diff" translate="no" lang="en">
                        <div className="row between">
                          <strong>Wording changes</strong>
                          <span className="small">
                            <span className="diff-added">Added</span>{" "}
                            <span className="diff-removed">Removed</span>
                          </span>
                        </div>
                        <p>
                          {diffWords(before.text, after.text).map((part, i) =>
                            part.added ? (
                              <ins key={i}>{part.value}</ins>
                            ) : part.removed ? (
                              <del key={i}>{part.value}</del>
                            ) : (
                              <span key={i}>{part.value}</span>
                            ),
                          )}
                        </p>
                      </div>
                      <div className="notice">
                        <Clock3 size={19} />
                        <div>
                          <strong>
                            {after.date > before.date
                              ? after.changeType
                              : "Reverse chronological comparison"}
                          </strong>
                          <p>
                            {after.date > before.date && after.reason
                              ? after.reason
                              : "No verified reason was found in the available records."}
                          </p>
                          <p className="small">
                            Text differences are computed. The change
                            classification and explanation are reviewed records.
                          </p>
                        </div>
                      </div>
                    </>
                  ))}
              </>
            )}
          </section>
        </>
      }
    </Localized>
  );
}
