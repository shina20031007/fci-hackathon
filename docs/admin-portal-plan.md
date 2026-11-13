# Admin Portal plan

## Phase 1: read-only foundation (implemented)

`/admin` is a public, static navigation page, not an authenticated administration
system. It displays no administrative records, credentials, draft content or
fabricated statistics. Its links lead to existing routes. There are no uploads,
AI requests, publication actions, new API routes, Server Actions or database calls.

### Existing Municipal Studio

- `/studio`: project list and project creation, gated by `studioEnabled()`.
- `/studio/[projectId]`: existing draft editor and review history.
- `/studio/[projectId]/preview`: saved draft preview.
- `src/features/municipal-studio/`: existing editors for project descriptions,
  sources, decisions, versions, feedback, participation and geography.
- `src/lib/db/projects.ts`: shared draft, publication and review operations.
- `src/lib/validation/project.ts`: shared `CivicProject` validation model.
- Prisma models already include `Project`, `SourceDocument`, `Evidence`,
  `DecisionItem`, `DocumentVersion`, `PublicFeedbackTheme`, `ParticipationWindow`,
  `GeographicScope`, `ReviewRecord` and `Publication`.
- Existing POST `/api/projects` and PUT `/api/projects/[projectId]` check
  `STUDIO_ENABLED`, loopback host, same origin and JSON requests. These prototype
  checks are not authentication or role-based authorization. Phase 1 does not
  change, bypass or expose additional write operations.

Admin Portal is an entry page for this workspace. Studio remains the sole existing
editor/review/publication UI. Visiting `/admin` never enables Studio or authorizes a
write. Do not expose the existing unauthenticated Studio publicly.

### Files and layout

- `src/app/admin/page.tsx`: App Router entry and page metadata.
- `src/features/admin/components/admin-portal.tsx`: localizable presentation.
- Existing root layout, `Shell`, `Badge`, `SectionTitle`, CSS and language provider
  are reused. The sidebar identifies `/admin`; the page includes a top-level return
  link to Public Portal.
- English, French and Simplified Chinese messages use the existing centralized
  `src/lib/i18n/additions.json` catalogue.
- No independent admin layout, database migration, service, type module or empty
  directory is needed. Create `services/` or `types/` only when a later feature
  actually needs them. Do not introduce a separate frontend or project root.

## Phase 2: authenticated access and document storage (planned)

Before any real administrative data or new write operation is exposed:

1. Define municipal tenancy, roles and reviewer responsibilities. Add server-side
   authentication and authorization to every applicable route, read and mutation,
   including existing Studio operations. A hidden link is not access control.
2. Design private document storage and metadata using the existing Prisma model as
   the starting point. `SourceDocument.url` is currently a citation, not a stored
   upload. Define ownership, immutable versions, original filenames, checksums,
   retention, deletion, licensing and audit requirements before migrations.
3. Choose a storage provider and access model; keep credentials server-side. Use
   scoped, expiring access and avoid storing sensitive uploads in `public/`.
4. Implement validated PDF intake only after storage and authorization are ready:
   file size/type checks, malware scanning, quotas, failure handling and audit
   records. Preserve the original official document and provenance.
5. Verify cross-tenant denial, unauthorized reads/writes, storage failures and
   retention behavior. No provider account, billing or deployment is authorized by
   this plan.

## Phase 3: assisted extraction and human review (planned)

1. Define extraction jobs, retries, cancellation and processing status in the admin
   feature area only when implemented. Select any AI provider after privacy, data
   residency and cost review.
2. Keep original files, extracted text and generated suggestions distinct. Attach
   page references and exact supporting passages; flag uncertain dates, decisions,
   feedback and geometry. Never invent missing evidence.
3. Treat extracted document text as untrusted input. AI outputs are proposals, not
   authorization to execute instructions, change facts or publish records.
4. Present suggestions through the existing Studio review workflow and shared
   validation model. Preserve original language; label unofficial translations and
   require review before using them for policy explanations.
5. Test extraction accuracy, provenance, failure recovery, accessibility and
   reviewer acceptance on approved sample documents. No automatic publication.

## Phase 4: controlled publication and operational readiness (planned)

1. Reuse existing draft snapshots, optimistic revisions, evidence gates and
   publication transitions. Do not build a second publication engine in Admin.
2. Enforce authorized approval, auditability, preview, rollback/version history and
   separation of responsibilities across the existing workflow.
3. Add operational monitoring, backups, restore tests, rate limits and source-review
   schedules as supported features, with clear ownership and failure handling.
4. Validate resident routes, GIS provenance, three-language navigation, keyboard
   access and responsive layouts. Conduct human accessibility and policy review.
5. Deploy only after a separate explicit authorization and completion of security,
   privacy, licensing and operational checks. Phase 1 makes no readiness claim.

## Phase 1 verification

Check `/admin` routing, sidebar active state, both existing workspace links, the
Public Portal return link, all three language selections and mobile layout. Run
TypeScript, ESLint and the production build. Inspect the new route's imports to
confirm that no database service, mutation, upload handler or Server Action is
introduced. Existing resident and Studio paths must remain unchanged.
