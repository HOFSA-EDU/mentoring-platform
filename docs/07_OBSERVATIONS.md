# Formal Mentor Observations

Phase 07 extends this lifecycle with an explicit conversation link: recording a
conversation after the latest linked YES request can resolve that request only.
Difficulty and improvement Observations retain their status. See
[Mentoring](08_MENTORING.md) for the transaction, timing and dashboard rules.

Phase 06 adds deterministic, evidence-backed Mentor records. Student reflections
remain the separate Phase 04 experience: a recent descriptive comparison does
not itself become a formal Observation. Students and Admins do not receive an
Observation viewer or lifecycle actions.

## Models and constraints

`Observation` belongs to one Student and semester. It stores a nullable domain,
type, status, title, summary, first/last evidence-supported detection dates,
acknowledgement/resolution dates, creation/update dates, `ruleKey`, and
`episodeKey`. Types are `REPEATED_DIFFICULTY`, `WORSENING_PATTERN`, `IMPROVEMENT`
and `CONVERSATION_REQUEST`. Status is `OPEN`, `ACKNOWLEDGED` or `RESOLVED`.

`ObservationEvidence` links to the original Check-in and, for a question
pattern, its exact CheckInAnswer. It preserves the question ID, period,
submission date, question text and answer label. The question ID is the stable
identity; current mutable Question keys, text and options are not consulted.
Conversation evidence references the Check-in's saved YES enum instead of a
question answer. Its label is “Mentor conversation response”, not an invented
historical question prompt, and its answer is “Yes”.

Migration `20260917180000_observations` adds both models, the two enums and three
AuditAction values plus the OBSERVATION entity type. It does not alter historical
Check-ins or answers. Database guarantees include:

- unique Student/semester/rule/episode identity;
- one unresolved episode per Student/semester/rule via a partial unique index;
- unique source evidence within each Observation;
- foreign keys retaining the original Check-in/answer, and source-validation
  triggers checking Student, semester, period, timestamp and exact answer text;
- non-null domains for question patterns and a null domain for conversation;
- consistent detection/status dates and acknowledgement state;
- immutable evidence on UPDATE and immutable resolved Observation rows.

The application has no delete operation for Observations or their evidence.
Evidence can only be appended while its Observation remains unresolved. Test
fixtures explicitly delete their Observations before removing source Check-ins.

## Comparable evidence and deterministic rules

The pure rules live in `modules/observations/domain/engine.ts`. They reuse the
Phase 04 eligibility, version-comparability and directional-answer predicates;
the Student's two-answer reflection behavior is unchanged.

Each evaluation considers one semester, weekly Check-ins only, within the
current and preceding five ISO weeks in Europe/Luxembourg at the evaluation
instant. Future submissions, duplicate periods, onboarding and other semesters
are excluded. Each question is its own series. Comparison starts from its
latest answer and stops at a change of signature, question text, domain or
stable/rotating metadata. Restoring an older question version does not bridge
over an intervening version. Missing historical metadata is not reconstructed.

Take the latest three scored responses within that unchanged series, oldest
first. Consecutive means consecutive comparable responses to that question,
not three adjacent calendar weeks. Missing rotating questions are skipped.
NULL directions (neutral, uncertain or N/A) are also skipped: they provide no
difficulty or improvement evidence and do not reset an unchanged series. A
neutral answer on a changed question version still establishes a real version
boundary. Window expiry can remove old evidence; neutrality itself cannot.

Internal directions retain the catalogue meaning of 0 through 3, increasing
with reported difficulty. The engine uses them only on the server:

| Rule | Required evidence from one comparable question series |
| --- | --- |
| Repeated difficulty | All three latest scored responses are at least 2 |
| Worsening pattern | Three strictly increasing responses: first < second < third |
| Improvement | Three strictly decreasing responses, with the first at least 2 |
| Conversation request | Explicit YES on a weekly Check-in; no numeric answer required |

An improvement can therefore be supported by a previously difficult answer
without requiring that a formal negative Observation already existed. A single
better answer never resolves an earlier Observation.

### Domain conflict handling

No values are summed or averaged. A rule needs at least one supporting
three-response question series. Other eligible question series in that domain
are checked conservatively using up to their latest three scored responses:

- Repeated difficulty is suppressed if any such response is below 2.
- Worsening is suppressed if any such series contains a decrease.
- Improvement is suppressed if another series contains an increase, or still
  ends at a difficult answer without itself supporting consistent improvement.

Supporting series contribute their actual source evidence to one domain/rule
Observation. Opposing directions suppress strong claims rather than cancel out
in a mean. The summary explicitly describes recurring questions about an area,
not a student trait or psychological diagnosis.

### Concrete examples

- `3, 3, 3` → repeated difficulty.
- `3, NULL, 3, 3` → repeated difficulty using only the three scored answers.
- `0, [question absent], 1, 3` → worsening across the three relevant appearances.
- `3, 2, 1` → improvement from a difficult response.
- `0, 2, 1` → no worsening pattern.
- One question worsening and another improving in the same domain → no strong
  domain Observation.
- YES → formal conversation request; MAYBE → soft dashboard signal; NO → none.

## Idempotency, recovery and consistency

The weekly submission transaction commits the Check-in, immutable answers and
submission audit events first. An authorized internal post-processing function
then evaluates Observations. A processing failure never turns that committed
submission into a failed Student action. Logs use a generic failure message
without answers, account details or raw database errors.

Mentor dashboard/list/detail reads recover missing evaluations for actively
assigned Students. They replay each stored weekly submission chronologically,
using the six-week window at that submission. Thus a request or supported
pattern missed during an outage is not lost merely because a later answer
changes. Historical qualifying patterns can be discovered during the first
recovery after upgrade. If processing fails again, the Mentor sees an explicit
update-pending notice alongside any previously stored records.

Evaluation runs in a READ COMMITTED transaction under a PostgreSQL transaction
advisory lock per Student. Lifecycle changes acquire the same lock. Reads after
the lock see the preceding writer's commit, including a just-resolved episode.
The transaction atomically creates/extends the Observation, appends evidence and
writes its creation audit. Database uniqueness independently prevents duplicates.

The versioned rule identity is `v1:<type>:<domain-or-CONVERSATION>`. The first
episode is `initial`; a subsequent episode uses the previous resolved
Observation ID. Retrying unchanged data does not change rows, timestamps or
audit counts. New supporting evidence is appended without rewriting old
evidence; `lastDetectedAt` advances only to a new supporting submission date.
`firstDetectedAt` and `lastDetectedAt` are evidence dates. `createdAt` records
the actual processing time, which can be later during recovery.

Recovery is eventual and request-driven, without a background job queue. A
failed post-processing step is retried on the next authorized Mentor read or
the next successful weekly submission. No manual synchronization is required.

## Lifecycle and re-emergence

- **OPEN:** the rule first has sufficient evidence.
- **ACKNOWLEDGED:** an assigned Mentor has seen the record. It is still unresolved
  and retains the same attention treatment.
- **RESOLVED:** an assigned Mentor manually closes the record. Evidence and
  history remain readable; replay never changes or reopens it.

Acknowledge and resolve are authorized Server Actions with validated IDs and
target status. Duplicate actions are harmless and do not repeat audit events.
Resolved-to-acknowledged transitions are rejected. No rule automatically
resolves an Observation based on one better week, later NO, missing answers or
expired evidence windows.

For re-emergence, all new supporting evidence must have been submitted strictly
after the latest resolution of that same Student/semester/rule. Three new
comparable scored answers are required for a new pattern episode; one new YES
is sufficient for a new conversation-request episode. Resolved evidence is never
reused to satisfy those thresholds.

## Attention and Mentor UI

Attention is derived without a stored numeric priority or score:

- **CONVERSATION:** an unresolved formal conversation-request Observation, or a
  latest relevant YES response using the existing current/previous-week window.
- **WATCH:** an unresolved repeated-difficulty or worsening Observation.
- **NORMAL:** neither of the above. MAYBE stays soft; improvement alone does not
  escalate attention.

OPEN and ACKNOWLEDGED both count as unresolved. A later NO does not silently
close a formal request. Conversely, manually resolving a formal request does
not change the Student's saved YES: a still-recent YES can remain a conversation
signal until superseded or outside the existing two-week window.

Dashboard ordering is conversation, formal difficulty, soft MAYBE, improvement,
then remaining Students, with name/ID ties. A row shows at most one formal
Observation title, falling back to the existing descriptive reflection. A
two-answer reflection no longer elevates the formal WATCH state. Improvement
appears calmly in the assigned list/detail and never hides unresolved difficulty.
The existing conversation filters remain explicitly about recent saved answers.

Student detail includes an Observations list with status/type and a link to
`/mentor/students/[studentId]/observations/[observationId]`. That page shows the
domain, summary, dates, lifecycle controls and exact evidence with links back to
authorized historical Check-ins. It uses shadcn/ui and Lucide, text labels rather
than color-only meaning, keyboard actions and responsive stacked evidence.

## Authorization and audit

Every Mentor route and Server Action retains centralized Auth.js `requireMentor`.
Observation reads use the existing active-assignment policy and include the
full live assignment/account/profile predicate in their Prisma read. Evidence
reads repeat that scope. IDs must match both the Student and Observation.
Lifecycle writes check the same scope inside their transaction and again in the
conditional update. A revoked historical assignment grants no access, even if
the browser still has an old action form open. Admin roles are not hierarchical.

Internal evaluation allows either the active Student's own Check-in processing
or an actively assigned Mentor's recovery. It returns no formal Observation data
to the Student. Presentation selects never expose direction values, signatures,
password/account-security fields, rule keys or episode keys. No shared sensitive
data cache is introduced.

Creation, acknowledgement and resolution emit `OBSERVATION_CREATED`,
`OBSERVATION_ACKNOWLEDGED` and `OBSERVATION_RESOLVED` respectively. Automatic
creation records the Student whose submission caused the evidence, with minimal
`origin: CHECK_IN_ENGINE` and rule-version metadata. Mentor actions record the
actual Mentor. Answer contents are never duplicated in audit metadata.

## Seed and validation

The normal development seed remains unchanged. Dedicated deterministic fixtures
cover repeated difficulty, worsening, improvement, YES, MAYBE, no signal and
unassigned Students. Existing cleanup helpers account for retained evidence.
Validation uses a separate disposable PostgreSQL database so workflow tests do
not overwrite local reflections.

Run Prisma format, validation and migration deployment, the deterministic seed,
lint, strict typecheck, unit/integration tests, Playwright, production build,
dependency audit and installed-version verification. Vitest 4.1.11 and Vite
7.3.6 remain exactly pinned.

## Actual limitations

- The conservative six-week/three-response requirement can leave sparsely
  rotating domains without enough evidence. Pre-Phase-04 missing metadata cannot
  safely support patterns.
- Recovery replays history on authorized reads and has no background retry
  worker or checkpoint. It suits the pilot; large histories need incremental
  processing and pagination.
- Unresolved Observations persist until a Mentor resolves them, even after
  newer answers improve. Both the evidence dates and positive Observations help
  the Mentor distinguish historical concerns from current responses.

## Validation results (2026-09-17)

- Prisma format and schema validation passed. All eight migrations deployed to
  the fresh `mentoring_phase06_validation` database; its deterministic seed ran
  twice successfully.
- The new migration also applied to the local development database. A SHA-256
  comparison of all stored Check-in and answer rows before/after confirmed that
  all 17 existing records were unchanged.
- ESLint and strict TypeScript checks passed.
- All 210 unit/integration tests passed across 22 files, including concurrent
  evaluation, episode uniqueness, post-resolution evidence, immutable source
  constraints, minimal audits, unauthorized actions and recovery after failure.
- All 21 Chromium Playwright tests passed in the final complete run without
  retries. Coverage includes the existing Phase 00–05 flows and the new
  Observation lifecycle, forged action IDs, revoked assignments, least-privilege
  routes, positive presentation and keyboard actions.
- Mentor and evidence screens passed horizontal-overflow checks at 320, 375 and
  390px. Desktop dashboard and mobile evidence screenshots were visually reviewed.
- Production build passed; the Observation route is rendered dynamically.
- Dependency audit found zero vulnerabilities. Installed and pinned versions
  remain Vitest 4.1.11 and Vite 7.3.6.
