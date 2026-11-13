"use client";
import { Localized } from "@/lib/i18n/provider";
import Link from "next/link";
export default function NotFound() {
  return (
    <Localized>
      {
        <div className="page">
          <p className="eyebrow">RECORD NOT AVAILABLE</p>
          <h1>This page isn’t in the published record.</h1>
          <p>The project may still be a draft, or the link may be incorrect.</p>
          <Link className="button primary" href="/explore">
            Explore published decisions
          </Link>
        </div>
      }
    </Localized>
  );
}
