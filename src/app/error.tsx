"use client";
import { Localized } from "@/lib/i18n/provider";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <Localized>
      {
        <div className="page">
          <h1>We couldn’t load this workspace.</h1>
          <p>
            Please try again. For a fresh installation, run the database setup
            command in the README.
          </p>
          <button className="button primary" onClick={reset}>
            Try again
          </button>
        </div>
      }
    </Localized>
  );
}
