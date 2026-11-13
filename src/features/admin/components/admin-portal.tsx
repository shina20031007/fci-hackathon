"use client";

import Link from "next/link";
import { ArrowLeft, ArrowUpRight, ShieldCheck } from "lucide-react";
import { Badge, SectionTitle } from "@/components/ui/shared";
import { Localized } from "@/lib/i18n/provider";

export function AdminPortal() {
  return (
    <Localized>
      <div className="page">
        <Link className="back-link" href="/">
          <ArrowLeft size={15} aria-hidden="true" />
          Return to Public Portal
        </Link>
        <div className="page-heading">
          <p className="eyebrow">ADMIN WORKSPACE</p>
          <h1>Admin Portal</h1>
          <p>A starting point for the existing municipal review workspace.</p>
          <Badge>Phase 1 · Read-only foundation</Badge>
        </div>
        <div className="notice">
          <ShieldCheck size={23} aria-hidden="true" />
          <div>
            <strong>
              Navigation only. No administrative data is shown here.
            </strong>
            <p>
              This page does not upload files, parse documents with AI, or
              publish content. It does not provide authentication or grant
              management permissions.
            </p>
          </div>
        </div>
        <SectionTitle
          title="Existing workspaces"
          description="Continue using the established cityora. workflows."
        />
        <div className="methodology-grid">
          <section className="panel">
            <h3>Municipal Studio</h3>
            <p>
              Project editing, evidence review, draft previews and publication
              remain in Municipal Studio. Admin Portal does not duplicate them.
            </p>
            <p className="small muted">
              Studio retains its existing local-only restrictions and must be
              enabled in the environment. This link does not change access.
            </p>
            <Link className="button secondary" href="/studio">
              Open Municipal Studio
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </section>
          <section className="panel">
            <h3>Public Portal</h3>
            <p>
              Browse published municipal cases, official evidence, maps and
              participation information in the resident portal.
            </p>
            <Link className="button secondary" href="/explore">
              Explore Decisions
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </section>
        </div>
      </div>
    </Localized>
  );
}
