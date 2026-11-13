"use client";
import { Localized } from "@/lib/i18n/provider";
export default function Loading() {
  return (
    <Localized>
      {
        <div className="page" role="status">
          <div className="loading-line" />
          <h1>Loading the decision trail…</h1>
          <p>Retrieving the shared project records.</p>
        </div>
      }
    </Localized>
  );
}
