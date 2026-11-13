# CivicTrace — From Policy to People

A working local civic technology proof of concept for the **Future Cities Institute CIVIC Hack** challenge: making municipal decisions easier to understand.

CivicTrace connects individual decision items to source passages, document versions, amendments, conditions, geographic records, public concerns, responses, and participation windows. Its focus is **decision-to-impact traceability**, complementing municipal project listings and official engagement services.

**Independent prototype, not an official government website.** The homepage presents three source-backed real cases: Wilmot Official Plan, Waterloo 2027 Plan and Budget, and Maryhill Road. Three fictional Fairhaven fixtures remain separately selectable in discovery and available in Studio. Research was checked on November 12, 2026; approval gaps and unknown dates remain explicit.

## Run locally

This repository lives directly in `~/Desktop/黑客松`. There is no nested application root.

Requirements: Node.js **22.12 or newer** and npm. Development and verification used Node.js 26.8.1 and npm 11.19.0 on macOS. Browser tests use Chromium and Node's built-in SQLite module.

```sh
cd ~/Desktop/黑客松
npm ci
cp .env.example .env  # First installation only; preserve an existing .env.
npm run db:setup
npm run dev
```

Open **http://127.0.0.1:3000**. Both development and production scripts bind to loopback. If the port is occupied, use `npm run dev -- --port 3001`.

The database has already been initialized in this workspace. On this machine, `npm run dev` is sufficient.

```sh
code ~/Desktop/黑客松
```

VS Code extension recommendations and formatter settings are included. If `code` is unavailable, use VS Code's **File → Open Folder** command.

## Six connected modules

| Module                  | Working features                                                                                                                                   |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| My Area                 | Text search; municipality, category, stage, participation, and recent-update filters; ArcGIS Map Components; synchronized project selection        |
| Decision DNA            | Individual claims, exact source panels, chronological events, selectable versions, word additions/removals, conditions, amendments, uncertainty    |
| Public Voice Trace      | Topic, response, and decision filters; sourced response/amendment relationships; explicit missing-evidence states                                  |
| Impact Explorer         | Pan/zoom, selection, layer toggles, reset, point-in-polygon and 500 m distance calculations, source links, text alternatives                       |
| Action Navigator        | Independently calculated participation states; confirmed dates and time zones; historical windows; private local question drafts and text download |
| Municipal Review Studio | Create projects; edit all record types; associate evidence; save, preview, review, verify, and publish; review history and printable briefs        |

The overview and methodology pages explain the workflow. Public routes preserve the project ID:

```text
/projects/[projectId]
/projects/[projectId]/decisions
/projects/[projectId]/public-voice
/projects/[projectId]/impact
/projects/[projectId]/participation
```

Unknown or unpublished projects return a useful 404. Source panels use native dialogs with keyboard dismissal and focus restoration. Small screens have collapsible navigation and stacked content. Maps have textual alternatives. This is not a formal WCAG compliance claim.

## Staff walkthrough

1. Open **Municipal Studio** and select a project, or create a draft.
2. Review **Project**, **Sources & evidence**, and **Decisions**. Inspect exact passages and important conditions.
3. Edit the content, then **Save draft**. Changed source text invalidates its evidence and linked claim reviews on the server. Changed participation details invalidate their confirmation.
4. After saving the content, separately check the source-review boxes and set appropriate claim review states; save again. For fictional records this means internal consistency only, never official confirmation.
5. Review timelines, versions, public input, participation, and geography as applicable. Geographic import accepts GeoJSON Point, LineString, and Polygon geometries.
6. Open **Preview saved draft**. The public version remains unchanged.
7. Add a review note. Select **Submit for review → Verify demonstration review** (or **Verify review** for real data) **→ Publish approved revision**.
8. Open the resident page. The new published snapshot is now visible. Use **Print decision brief** on the project overview for a print-friendly summary with source passages.

Publishing is blocked when mandatory evidence or claim review checks fail. Editing resets project-level approval. Optimistic revision checks reject stale concurrent saves. The review stages are a local workflow, not independent-user approval: there are no authenticated reviewer identities.

New projects start unpublished. Add source documents, evidence, and at least one reviewed decision before publication. Real cases require HTTPS source links; staff must independently confirm their authority and accuracy. The application does not certify that a supplied URL is official.

## Stack and organization

Next.js 16 App Router, React 19, strict TypeScript, Tailwind CSS 4 plus a shared CSS design system, Lucide icons, Zod 4, Prisma 6.19, SQLite, ArcGIS Maps SDK for JavaScript 5.2 Map Components, Turf spatial calculations, and deterministic word comparison. npm's lockfile pins the installed dependency graph.

Next's supported webpack mode is used for development and production builds because Turbopack's PostCSS subprocess could not bind its internal port in the restricted development environment. No custom webpack loaders or additional backend services are needed. Development and production builds use Next.js's standard `.next` output, which Vercel expects; browser tests use `.next-test`. Stop the local development server before running a production build so both processes do not write to `.next` at once.

```text
src/
  app/                    Routes, API handlers, shared styles
  components/             Layout, UI, maps, and evidence dialogs
  features/               Resident modules and municipal editors
  lib/                    Database, validation, evidence, geography, utilities
prisma/
  schema.prisma           Normalized relational schema
  migrations/             Tracked SQL migration
  seed.ts                 Idempotent real-case and fixture loader
  dev.db                  Ignored local database
data/fixtures/           Three internally consistent fictional scenarios
scripts/                  Local migration helper
tests/
  unit/                   Policy, validation, geography, rendering, write guards
  integration/            Real SQLite transactions and independent-process persistence
  e2e/                    Resident/staff workflows, mobile checks, accessibility
docs/                    Architecture, data model, verification, pilot readiness
public/                   Local brand asset
.vscode/                  Editor settings and extension suggestions
```

## Database and configuration

```sh
npm run db:generate
npm run db:migrate
npm run db:seed
# Or run all three:
npm run db:setup
```

`DATABASE_URL=file:./dev.db` is resolved relative to `prisma/`. Migrations create the tables. The helper creates an empty SQLite file when necessary; it never resets an existing database. The seed inserts missing demonstration projects and preserves existing edits. Local database files and secrets are ignored by Git.

- `STUDIO_ENABLED=true` enables the local editor. Set it to `false` for read-only browsing.
- `NEXT_TELEMETRY_DISABLED=1` disables Next.js telemetry in the supplied environment template.
- No AI keys, paid map credentials, or third-party authentication are required.

Back up the SQLite file while the application is stopped before changing or migrating important local records. This prototype does not automate backup or recovery.

## Checks and tests

```sh
npm run lint
npm run typecheck
npm run format:check
npm run test
npx playwright install chromium  # Once per machine
npm run test:e2e
npm run build
npm run start
```

`npm run format` formats maintained source files. Browser tests start a separate loopback server on port 3100 and initialize disposable `.test-data/e2e.db`. They do not modify `prisma/dev.db`. Unit/integration tests create and clean their own temporary database. Playwright artifacts and both build directories are ignored.

The tests cover search and combined filters, project routing, procedural stage semantics, timeline ordering, version differences, evidence links, feedback filters, deadline validation, missing evidence, editing, review gates, stale updates, database persistence, mobile navigation, evidence focus, and automated accessibility checks. Automated checks are not resident usability research or a formal accessibility audit.

## Data, map, and AI boundaries

- **Fictional:** the three seeded land-use, transportation, and budget cases, their passages, and their geographic extents. Fictional evidence cannot be marked Officially Confirmed.
- **Derived:** database counts, text differences, date-based participation states, point-in-polygon, and distance calculations. Proximity never proves an impact.
- **Unavailable:** independently municipal-reviewed case completeness, licensed Maryhill project polygons, official before/after geometry, final 2027 budget approval, current verified public deadlines, participation counts, impact prediction, automatic ingestion and source monitoring.
- **AI:** no runtime AI service is implemented. Demonstration content is static. All interactions run through deterministic code and explicit human review.
- The map loads the official Esri 5.2 CDN at first use and OpenStreetMap road tiles. Regional address search queries licensed public ArcGIS address points; the query is sent to the service. Selected coordinates are not stored. Text records remain usable when external services or WebGL are unavailable.
- Concern drafts are stored only when requested in browser localStorage. They can be downloaded or cleared and are never automatically submitted.

Official case evidence is recorded in `data/official/research.json` and each project’s source library. Sources that could not be retrieved are explicitly marked Verification Required; they do not substantiate factual claims.

## Security and municipal pilot

This is local hackathon software. Do not publicly expose the unauthenticated Studio. Write endpoints require explicit enablement, a loopback host, JSON, and a matching browser Origin/Host. These are defense-in-depth prototype restrictions, **not authentication**. Draft reads are local and unauthenticated when Studio is enabled. No remote source documents are fetched by the server.

Before a municipal pilot: implement authentication and roles, authenticated/tamper-resistant audit logs, secure deployment, body-size/rate limits, backups and recovery, privacy review, verified document ingestion and update procedures, accessibility review, and evaluation with municipal staff and residents using two or three real agenda items. See [pilot readiness](docs/pilot-readiness.md).

## GitHub preparation

The existing Git repository and its history were preserved. No remote, commit, push, or deployment is created automatically. Review the code and ignored files before publishing:

```sh
git status --short
git diff --check
git add .
git commit -m "Build CivicTrace civic decision traceability prototype"
```

Then create a GitHub repository, add its URL with `git remote add origin YOUR_REPOSITORY_URL`, and push your chosen branch. Check `git remote -v` first if a remote might already exist. Do not commit `.env`, SQLite files, dependencies, generated output, or browser test artifacts. The code is MIT licensed; real municipal source materials retain their own licensing terms.

## Languages

The header language selector switches English, French and Simplified Chinese without navigating or remounting modules. English is the default; `civictrace:locale` in localStorage retains the selection. Storage failures still allow session switching. Dates use the selected locale, with IANA time zones retained.

`src/lib/i18n/fr.json`, `zh-CN.json`, and `additions.json` centrally manage translations using English message keys. The small React-context localization layer keeps database access in Server Components and localizable presentation in Client Components: each presentation root uses `Localized`; it translates React text and accessibility labels, not persisted fields, URLs, IDs, enum values or form state. Official excerpts, source titles, and version comparison text use `translate="no"`. All non-English screens show an unofficial-translation notice. New editorial prose must be added to the catalogues; unknown custom Studio content falls back to its original language. A professional legal/translation review has not been performed.

## GIS services, configuration and costs

The SDK runtime uses Esri's documented `$arcgis.import` / Map Components CDN pattern at `https://js.arcgis.com/5.2/`. npm packages are pinned to 5.2.3 for build-time types and styles; no browser SDK implementation is bundled into the Next.js server. This avoids the SDK's large dynamic chunk graph in webpack development. Internet access to Esri, OpenStreetMap and the regional ArcGIS endpoints is required for the interactive map.

- With a key: Esri streets, imagery and light-gray basemaps. Without a key, or when a basemap fails, roads fall back to OpenStreetMap with visible attribution.
- Address search without a key: Waterloo Region's licensed open-data address Feature Layer; coverage is regional only.
- Satellite imagery, light-gray style and Canada-wide Esri address search: set `NEXT_PUBLIC_ARCGIS_API_KEY="your-key"` in the Git-ignored `.env.local`, preserving other variables, then rebuild/restart. These options remain disabled when no key is configured; no credential is invented or borrowed.
- A public browser key is visible to users. Configure only the necessary basemap/geocoding privileges, restrict allowed referrers, set usage limits and billing alerts in your own Esri account, and rotate it if abused. Never place an organization administrator token or client secret in a `NEXT_PUBLIC_` variable. Review [Esri licensing](https://developers.arcgis.com/javascript/latest/licensing/) and your account's current pricing before enabling paid services. Only basemap and geocoding services are used; Routing and Data Enrichment are not enabled. Actual map/search requests count toward the Esri account usage.
- Canada search is restricted to `CA` and is the default when a key exists. A denied or unavailable Canada search switches to the existing Waterloo Region source; coordinate input remains available. Authorization failures (401/403/498/499), including invalid/expired credentials, missing privileges or referrer restrictions, produce sanitized error notices, never raw service URLs or tokens. Check key expiry, privileges and allowed localhost referrers in Esri if access is denied.
- For local integration tests with a key restricted to port 3000, stop the development server and run `PLAYWRIGHT_PORT=3000 npx playwright test -g "configured ArcGIS|ArcGIS denied" --trace off` after the normal isolated test setup. The default test port remains 3100. The missing-key test can be run with `NEXT_PUBLIC_ARCGIS_API_KEY="" npx playwright test -g "ArcGIS missing key" --trace off`; this overrides the test process only, not `.env.local`. Traces are disabled in the map integration suite because request URLs can contain credentials.
- Keys are scoped to `BasemapStyle.apiKey` and `LocatorSearchSource.apiKey`, not a global SDK key, so regional open-data requests do not receive the credential.
- Point, LineString and Polygon are supported for other municipalities through Studio. Coordinate navigation works globally. The initial view and public address dataset are Waterloo Region.

`data/gis/registry.json` records official dataset IDs, licence, selection criteria and limitations. Local GeoJSON retains exact official coordinates. The regional polygon is official administrative context. Wilmot coverage is the exact union of nine licensed Cities and Towns polygons: the township record alone excludes settlement polygons. This derived coverage includes Baden and New Hamburg and is not a legal survey. Maryhill's line joins six original road segments and is explicitly derived corridor context, not an official project polygon. The official map PDF is linked; its project polygon is not redistributed because licensing has not been established. The 500 m rule is a local proximity calculation, never an official affected area or impact prediction.

## Real evidence and database upgrade

`data/official/projects.json` uses the same normalized model and publication workflow as all six modules. `data/official/research.json` records source discovery, inaccessible reports, schedule conflicts and outstanding verification. The Wilmot staff report supports a documented aggregate feedback theme; missing public responses are not treated as rejection. Budget and Maryhill approval minutes remain unverified. Future scheduled meetings are not recorded as completed decisions.

Migration `202611130001_nullable_dates_and_closure` preserves existing rows, allows unknown source/decision dates, and adds an optional date-only `closedOn` for historical consultations. It does not reset the database. Run `npm run db:setup` when pulling this change; the seed inserts missing IDs only and preserves all existing edits/publications. Test setup applies all migrations to disposable databases.

For Maryhill, the published feedback period ended June 10, 2026; no artificial end-of-day time is stored. For Wilmot, requesting provincial-decision notification is distinguished from a time-bounded consultation. The budget's final date is TBC; a councillor-motion deadline must never be presented as a public deadline.
