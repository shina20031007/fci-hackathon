"use client";
import { Localized } from "@/lib/i18n/provider";

import { createContext, useContext, useRef, useState } from "react";
import { ExternalLink, FileText, X, Quote, ShieldCheck } from "lucide-react";
import type { CivicProject } from "@/lib/validation/project";
import { LocalizedDate } from "@/lib/i18n/provider";
import { Badge } from "@/components/ui/shared";
const EvidenceContext = createContext<(ids: string[]) => void>(() => {});
export function evidenceSourceUrl(url: string, section: string) {
  const source = new URL(url);
  const page = section.match(/^Page\s+([1-9]\d*)\b/i)?.[1];
  if (source.pathname.toLowerCase().endsWith(".pdf") && page)
    source.hash = `page=${page}`;
  return source.href;
}
export function EvidenceButton({
  id,
  children = "View evidence",
}: {
  id: string | string[];
  children?: React.ReactNode;
}) {
  const show = useContext(EvidenceContext);
  return (
    <Localized>
      {
        <button
          className="evidence-button"
          onClick={() => show(Array.isArray(id) ? id : [id])}
        >
          <FileText size={14} />
          {children}
        </button>
      }
    </Localized>
  );
}
export function EvidenceProvider({
  project,
  children,
}: {
  project: CivicProject;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [choices, setChoices] = useState<string[]>([]);
  const evidence = project.evidence.find((e) => e.id === selected);
  const source = project.sources.find((s) => s.id === evidence?.sourceId);
  function show(ids: string[]) {
    const uniqueIds = [...new Set(ids.filter(Boolean))];
    setChoices(uniqueIds);
    setSelected(uniqueIds[0] ?? null);
    ref.current?.showModal();
  }
  return (
    <Localized>
      {
        <EvidenceContext.Provider value={show}>
          {children}
          <dialog
            className="evidence-dialog"
            ref={ref}
            aria-labelledby="evidence-title"
            onClick={(e) => {
              if (e.target === e.currentTarget) ref.current?.close();
            }}
          >
            <div className="evidence-panel">
              <div className="row between">
                <span className="eyebrow">THE SOURCE TRAIL</span>
                <button
                  className="icon-button"
                  onClick={() => ref.current?.close()}
                  aria-label="Close evidence"
                >
                  <X size={20} />
                </button>
              </div>
              <h2 id="evidence-title">Supporting evidence</h2>
              {choices.length > 1 && (
                <div
                  className="evidence-choices"
                  role="group"
                  aria-label="Choose evidence"
                >
                  {choices.map((id, index) => {
                    const item = project.evidence.find((e) => e.id === id);
                    const document = project.sources.find(
                      (s) => s.id === item?.sourceId,
                    );
                    return (
                      <button
                        key={id}
                        type="button"
                        aria-pressed={selected === id}
                        onClick={() => setSelected(id)}
                      >
                        <span aria-hidden="true">{index + 1}</span>
                        <span translate="no">
                          <strong>
                            {document?.title ?? "Supporting evidence"}
                          </strong>
                          <small>{item?.section ?? id}</small>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
              {evidence && source ? (
                <>
                  <Badge tone={source.synthetic ? "amber" : "teal"}>
                    {source.synthetic
                      ? "Fictional source · demonstration only"
                      : evidence.state}
                  </Badge>
                  <h3 className="source-title" translate="no" lang="en">
                    {source.title}
                  </h3>
                  <dl className="detail-list">
                    <div>
                      <dt>Document type</dt>
                      <dd>{source.type}</dd>
                    </div>
                    <div>
                      <dt>Source date</dt>
                      <dd>{<LocalizedDate value={source.date} />}</dd>
                    </div>
                    <div>
                      <dt>Location</dt>
                      <dd translate="no" lang="en">
                        {evidence.section}
                      </dd>
                    </div>
                    <div>
                      <dt>Evidence ID</dt>
                      <dd className="mono">{evidence.id}</dd>
                    </div>
                  </dl>
                  <div className="source-quote" translate="no" lang="en">
                    <Quote size={23} />
                    <p>{evidence.excerpt}</p>
                  </div>
                  <div className="notice">
                    <ShieldCheck size={18} />
                    <div>
                      <strong>
                        {source.synthetic
                          ? "Internal consistency review only"
                          : evidence.state}
                      </strong>
                      <p>{evidence.notes || "No reviewer notes recorded."}</p>
                      <p>
                        Review timestamp:{" "}
                        {<LocalizedDate value={evidence.verifiedAt} />}
                      </p>
                    </div>
                  </div>
                  {source.url && !source.synthetic ? (
                    <a
                      className="button primary full"
                      href={evidenceSourceUrl(source.url, evidence.section)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open official source <ExternalLink size={16} />
                    </a>
                  ) : (
                    <p className="small muted">
                      No official URL exists for this fictional source.
                    </p>
                  )}
                </>
              ) : (
                <div className="empty">
                  <h3>Insufficient evidence</h3>
                  <p>
                    No supporting source passage is available for this claim.
                  </p>
                </div>
              )}
            </div>
          </dialog>
        </EvidenceContext.Provider>
      }
    </Localized>
  );
}
