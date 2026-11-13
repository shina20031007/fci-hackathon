# Data model

`prisma/schema.prisma` and its SQL migration define the authoritative relational draft structure. Explicit Zod enums validate decision stages, claim reviews, project workflow states, evidence states, document types, categories, and response classifications at the boundary.

| Entity              | Purpose and relationship                                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Municipality        | Unique municipality name; one-to-many projects                                                                           |
| Project             | Core explanation, geography label, stage, fictional/real designation, review state, revision, summary evidence reference |
| SourceDocument      | Project-owned title, type, date, optional HTTPS URL, fictional flag                                                      |
| Evidence            | Exact source passage, section, epistemic state, review timestamp and notes; belongs to a source and project              |
| DecisionItem        | A claim/explanation, authority, stage, conditions, amendment, uncertainty, date, review state; many-to-many evidence     |
| DecisionEvent       | A dated, source-linked event tied to a decision item                                                                     |
| DocumentVersion     | Recorded wording, date, change classification, reason, source evidence                                                   |
| PublicFeedbackTheme | Aggregate concern, response, response class and documented amendment connection; decision/evidence references            |
| ParticipationWindow | Method, instructions, independent opening/deadline/meeting timestamps, IANA zone, source, URL and confirmation           |
| GeographicScope     | Source-linked typed GeoJSON geometry, layer kind, description and related decision                                       |
| ReviewRecord        | Append-only application transition history, revision, timestamp and note; no authenticated identity                      |
| Publication         | Current public snapshot, revision and publication timestamp, one per project                                             |

Public explanations are projected from the publication snapshot for consistency across modules. The normalized draft is not stored as one application-wide JSON object. JSON is used only for GeoJSON geometry and the intentional published read snapshot.

A single source can have multiple evidence passages. Decision items can cite multiple passages. Required event/version/geographic references are enforced by database foreign keys. Optional missing feedback responses and participation evidence remain explicitly unknown. Project-level summary references and cross-record ownership are validated by the shared Zod schema and publication policy.

IDs are stable strings; new UI records use UUIDs. Indexes support project lookup, categories/stages, event/version dates, feedback themes, and review chronology. Transactional updates preserve the prior publication if any write fails.

Review status is not evidence status: a fictional claim can pass internal review while its evidence remains Requires Verification. Its immutable fictional designation prevents it being relabeled as an official project.

The prototype stores one response and amendment text per feedback theme and one amendment summary per decision. It does not yet model complex many-to-many legal amendment lineage or archive every historical publication. Those are extensions for a pilot, not completed features.

SourceDocument.date and DecisionItem.date may be null when not established. ParticipationWindow.closedOn optionally stores a calendar date for a documented ended consultation without inventing an end-of-day timestamp. Closure is compared in the recorded IANA time zone. Existing publication snapshots without closedOn remain valid.
