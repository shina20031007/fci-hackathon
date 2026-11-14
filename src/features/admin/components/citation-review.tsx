"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  extractionSchema,
  matchCitation,
  type PageText,
} from "../types/extraction";
function parseSavedExtraction(text: string) {
  try {
    return extractionSchema.safeParse(JSON.parse(text));
  } catch {
    return extractionSchema.safeParse(null);
  }
}
export function CitationReview({
  id,
  raw,
  current,
  pages,
  version,
  pending,
}: {
  id: string;
  raw: string;
  current: string;
  pages: PageText[];
  version: string;
  pending: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const original = parseSavedExtraction(raw);
  const reviewed = parseSavedExtraction(current);
  if (!original.success || !reviewed.success)
    return (
      <p>
        Saved analysis requires manual project editing. The original text
        remains available below.
      </p>
    );
  const rows = [
    ...original.data.fields.map((field) => ({
      key: field.name,
      label: field.name,
      value: field.value,
      page: field.page,
      quote: field.quote,
      field: field.name,
      event: undefined as number | undefined,
    })),
    ...original.data.events.map((event, index) => ({
      key: "event-" + index,
      label: "Timeline: " + event.title,
      value: event.description,
      page: event.page,
      quote: event.quote,
      field: undefined,
      event: index,
    })),
  ];
  async function submit(body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/documents/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, expectedHash: version }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Review failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section>
      <h2>Review source citations</h2>
      <p>
        Matching checks the quotation, not the truth of its interpretation.
        Verify the statement against the full original page. Unmatched
        suggestions remain unpublished until corrected and reviewed.
      </p>
      <p role="status">{busy ? "Saving…" : error}</p>
      {rows.map((row) => {
        const match = matchCitation(row.quote, row.page, pages);
        const saved = row.field
          ? reviewed.data.fields.find((f) => f.name === row.field)
          : reviewed.data.events.find(
              (e) =>
                e.title === original.data.events[row.event!].title &&
                e.date === original.data.events[row.event!].date,
            );
        const value =
          saved && "value" in saved
            ? saved.value
            : saved && "description" in saved
              ? saved.description
              : null;
        return (
          <details className="panel" key={row.key}>
            <summary>
              {row.label} — {match.kind} —{" "}
              {value === null ? "Not verified / withheld" : "Draft suggestion"}
            </summary>
            <p>AI Extracted Value: {row.value ?? "Not supplied"}</p>
            <p>
              Reported PDF page: {row.page ?? "Not supplied"}
              {match.page !== null && match.page !== row.page
                ? `; located on PDF page ${match.page}`
                : ""}
            </p>
            <blockquote translate="no">
              {row.quote ?? "No quoted passage"}
            </blockquote>
            <form
              key={version}
              onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                submit({
                  action: "correct",
                  field: row.field,
                  event: row.event,
                  value: data.get("value"),
                  quote: data.get("quote"),
                  page: Number(data.get("page")),
                });
              }}
            >
              <label>
                Corrected value
                <textarea
                  name="value"
                  defaultValue={value ?? row.value ?? ""}
                  required
                />
              </label>
              <label>
                Physical PDF page
                <input
                  type="number"
                  name="page"
                  min="1"
                  max={pages.length}
                  defaultValue={saved?.page ?? row.page ?? 1}
                  required
                />
              </label>
              <label>
                Exact source passage
                <textarea
                  name="quote"
                  defaultValue={saved?.quote ?? row.quote ?? ""}
                  required
                />
              </label>
              <button className="button secondary" disabled={busy}>
                Save citation correction
              </button>
              <button
                type="button"
                className="button secondary"
                disabled={busy}
                onClick={() =>
                  submit({
                    action: "unverified",
                    field: row.field,
                    event: row.event,
                  })
                }
              >
                Mark citation unverified
              </button>
            </form>
            <a
              href={`/api/admin/documents/${id}/file#page=${saved?.page ?? match.page ?? row.page ?? 1}`}
              target="_blank"
              rel="noreferrer"
            >
              Open original PDF page
            </a>
            <details>
              <summary>Extracted page text</summary>
              <pre translate="no">
                {pages.find(
                  (p) => p.page === (saved?.page ?? match.page ?? row.page),
                )?.text ?? "Choose a valid PDF page; all pages appear below."}
              </pre>
            </details>
          </details>
        );
      })}
      <button
        className="button primary"
        disabled={busy || !pending}
        onClick={() => submit({ action: "apply" })}
      >
        Apply corrected extraction to draft
      </button>
      <p>
        Applying corrections updates the AI-derived draft fields and resets
        approval. Existing official sources and publication history are
        retained. No AI request is made.
      </p>
    </section>
  );
}
