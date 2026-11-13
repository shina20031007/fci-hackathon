# Architecture

The Next.js App Router serves public pages from published snapshots and the local Studio from normalized draft records. Client components handle filters, comparisons, dialogs, mapping, and editing. Prisma owns server-side SQLite access; it is never imported into a browser component. Zod validates all mutations.

## Data flow

```mermaid
flowchart LR
  E[Local staff editor] --> V[Zod validation and local write guards]
  V --> D[Normalized SQLite draft]
  D --> R[Human review and evidence gates]
  R --> P[Published snapshot]
  P --> M[All resident modules]
  M --> S[Shared evidence panel]
```

A save replaces the project's related draft records in one transaction, keeping stable record IDs. Foreign keys and schema validation enforce relationships. A monotonically increasing revision rejects stale saves and transitions. Edits invalidate affected review states on the server. Staff save the content before separately verifying it.

Publication requires Draft → Needs Review → Verified → Published. The gate validates reviewed source links, claim states, and supported related records. It does not prove factual truth. A transaction updates the public snapshot and local review history together. A snapshot is frozen between publications; later draft edits cannot leak into resident reads. Historical published snapshots are not archived as a complete versioned audit store.

## Runtime decisions

- Prisma 6.19 with SQLite avoids a separate service and uses a conventional generated client. Migrations and fixtures are tracked; the database is not.
- Next.js's documented webpack mode avoids an environment-specific Turbopack subprocess port failure. The test server has an isolated build directory.
- Maps load ArcGIS Map Components on the client. Recorded geometry renders without tiles. OpenStreetMap raster tiles are opt-in and attributed. WebGL or tile failure has a text alternative.
- Turf calculates polygon containment and distance to lines/polygon rings in metres. The 500 m proximity threshold is an explicit prototype convention, not a municipal impact definition.
- `diffWords` computes changes. Reviewers supply classifications and documented reasons; the algorithm does not infer intent.
- Participation status derives from confirmed timestamps at render time, independently of procedural stages. It never borrows a meeting timestamp as a deadline.
- No runtime AI, remote ingestion, analytics, account system, or automatic submissions are included.

## Security boundary

The supplied scripts bind to 127.0.0.1. Studio enablement, loopback Host and same-origin checks reduce accidental mutation exposure but cannot replace authentication. Disabling Studio hides its pages and blocks writes. A production design needs authenticated reads/writes, authorization, abuse controls, secure deployment, and a proper audit/backup system.

Framework references: [Next.js installation](https://nextjs.org/docs/app/getting-started/installation), [Next.js CLI](https://nextjs.org/docs/app/api-reference/cli/next), and [Prisma SQLite](https://www.prisma.io/docs/orm/v6/overview/databases/sqlite). The installed Next.js documentation is also available under `node_modules/next/dist/docs/`.

Language is client presentation state, independent of routing and stored record values. Official quotations are protected from translation. The map runtime is loaded only in the browser from the Esri CDN; npm SDK imports in its adapter are type-only. Public address search uses a licensed Region FeatureLayer rather than an unauthenticated paid locator.
