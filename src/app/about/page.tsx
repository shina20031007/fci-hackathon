"use client";
import { Localized } from "@/lib/i18n/provider";
import { BookOpen, ShieldCheck, GitBranch, Info } from "lucide-react";
import Link from "next/link";
export default function About() {
  return (
    <Localized>
      {
        <div className="page methodology-page">
          <div className="page-heading">
            <p className="eyebrow">ABOUT & METHODOLOGY</p>
            <h1>A clear explanation should leave a trail.</h1>
            <p>
              CivicTrace connects individual decisions to sources, changes,
              geography, public feedback, and participation.
            </p>
          </div>
          <div
            className="methodology-intro panel"
            id="how-it-works"
            tabIndex={-1}
          >
            <BookOpen size={32} />
            <div>
              <h2>From policy to people.</h2>
              <p>
                Built for the Future Cities Institute CIVIC Hack challenge:
                making municipal decisions easier to understand. CivicTrace adds
                decision-to-impact traceability to project discovery. It
                complements official municipal records and engagement platforms;
                it does not replace them.
              </p>
            </div>
          </div>
          <div
            className="methodology-grid"
            id="sources-and-limitations"
            tabIndex={-1}
          >
            <section className="panel">
              <ShieldCheck size={25} />
              <h2>What the evidence means</h2>
              <dl className="stacked-details">
                <div>
                  <dt>Officially Confirmed</dt>
                  <dd>
                    The cited official source supports the statement. Imported
                    research still requires independent review; this label does
                    not mean government endorsement.
                  </dd>
                </div>
                <div>
                  <dt>Derived from Documented Data</dt>
                  <dd>
                    A reproducible calculation or interpretation grounded in
                    recorded inputs. A spatial overlap does not establish an
                    impact.
                  </dd>
                </div>
                <div>
                  <dt>Requires Verification</dt>
                  <dd>
                    The interpretation or source has not been officially
                    verified. Fictional evidence stays in this category even
                    after internal demonstration review.
                  </dd>
                </div>
                <div>
                  <dt>Insufficient Evidence</dt>
                  <dd>
                    The available material cannot support a claim. Missing
                    feedback responses are never classified as rejection.
                  </dd>
                </div>
              </dl>
            </section>
            <section className="panel">
              <Info size={25} />
              <h2>What is in this prototype</h2>
              <p>
                Three real municipal cases are linked to official sources. Three
                fictional Fairhaven cases are kept separately for testing.
                CivicTrace is independent and is not a government website.
              </p>
              <p>
                Word differences, spatial relationships, project counts, and
                participation states are calculated from the stored records. A
                demonstration review checks internal consistency only.
              </p>
              <p>
                Official administrative boundaries and licensed road centreline
                data provide context. A derived corridor is not an official
                project boundary. Regional address search uses licensed address
                points. No property-level impact model is provided.
              </p>
              <p>
                No participation counts, numerical confidence scores, or claimed
                empirical validation are invented.
              </p>
            </section>
            <section className="panel">
              <GitBranch size={25} />
              <h2>How review works</h2>
              <ol className="prose-list">
                <li>
                  Record the official document, date, URL, exact passage, and
                  page or section.
                </li>
                <li>
                  Separate recommendation, decision, additional approval, and
                  effective status.
                </li>
                <li>
                  Preserve conditions, amendments, uncertainty, and
                  contradictory evidence.
                </li>
                <li>
                  Review each claim, linked source, and participation notice.
                  Unknown dates stay unknown.
                </li>
                <li>
                  Save a draft, submit for review, verify, and publish an
                  immutable resident snapshot.
                </li>
              </ol>
              <p>
                The local reviewer log records transitions. Authentication and
                independent reviewer approval are not implemented.
              </p>
            </section>
            <section className="panel">
              <h2>AI, privacy & accessibility</h2>
              <p>
                No AI service processes documents in this application. Real-case
                summaries are source-backed research with explicit gaps.
                Fictional examples remain labeled. Search, comparison, mapping,
                and publishing use deterministic code.
              </p>
              <p>
                Public browsing needs no account. No analytics are included.
                Address searches and map requests are sent to the selected
                provider. Selected map points are not stored. Question drafts
                are saved only when requested, on the current device, and can be
                cleared.
              </p>
              <p>
                Keyboard navigation, focus indicators, labeled forms, native
                evidence dialogs, responsive layouts, and text alternatives
                support accessibility. Formal WCAG 2.2 AA compliance has not
                been audited.
              </p>
            </section>
          </div>
          <section className="panel pilot-panel">
            <p className="eyebrow">BEFORE A MUNICIPAL PILOT</p>
            <h2>Move from demonstration to verified local records.</h2>
            <p>
              Select two or three real agenda items with staff. Collect source
              documents and geographic provenance, confirm exact quotations and
              dates, resolve contradictions, and test the explanations with
              residents and municipal reviewers.
            </p>
            <p>
              Add authentication, roles, secure hosting, backups, privacy
              review, source update procedures, and an independent accessibility
              audit. Publication checks cannot independently verify whether a
              URL is authoritative or a passage is true.
            </p>
            <Link className="button primary" href="/studio">
              Explore the review workflow
            </Link>
          </section>
        </div>
      }
    </Localized>
  );
}
