# Mentor Dashboard

Phase 08 adds Quest assignment from Student detail or mentoring history, plus
active/completed/cancelled experiments and Student reflection review. All reads
and writes retain the active-assignment boundary. See [Quests](09_QUESTS.md).

Phase 07 adds mentoring history, separate shared agreements and internal
follow-ups. Current attention ordering and request handling are documented in
[Mentoring](08_MENTORING.md); the assignment and snapshot boundaries remain.

This document describes the Phase 05 foundation. Phase 06 now adds formal
Observations, changes attention ordering and supplies lifecycle actions. See
[Formal Mentor Observations](07_OBSERVATIONS.md) for the current behavior; the
snapshot, reflection and assignment boundaries below remain in force.

Phase 05 adds a read-only operational workspace for currently assigned students.
`/mentor` shows compact counts, Needs attention, and all active assigned students.
`/mentor/students` supports a name search and simple conversation/change filters.
Desktop rows stack on narrow screens. The UI uses existing shadcn/ui primitives,
Lucide icons, semantic lists/regions, visible focus and 44px primary actions.

## Attention and conversation responses

The dashboard derives these temporary categories on each server read, in order:

1. `CONVERSATION_REQUESTED`: the latest recent weekly response is YES.
2. `MAYBE_CONVERSATION`: the latest recent weekly response is MAYBE.
3. `RECENT_CHANGE`: shared reflection evidence includes MORE_DIFFICULT.
4. `NO_CURRENT_SIGNAL`: every remaining assigned student remains accessible.

Within each category, names and then IDs provide deterministic ordering. No
numeric priority, domain, risk or performance score is computed or stored.
Counts describe assignments and saved conversation responses only.

Conversation attention and filters use the latest weekly Check-in in the current
semester when its ISO period is this or the previous week in Europe/Luxembourg.
The semester must be active and within its Check-in window. An older YES remains
visible with its period and an Earlier response label but is no longer a current
attention signal. A later NO supersedes an earlier YES for this display. MAYBE
is shown separately as “May benefit from a check-in”; it is never an explicit
request. NO is “No conversation requested” in detail/history and does not elevate
attention by itself. A student reporting NO may still have a descriptive recent
change. The interface makes clear that saved responses do not record whether a
conversation has happened.

## Student detail and immutable history

`/mentor/students/[studentId]` shows the current semester, onboarding state,
latest current-semester weekly response and submission date, calendar Journey
stage, at most two recent changes, and the same six development areas as the
Student view. Areas display Stable, Reported as easier, Reported as more
difficult, Mixed answers or Not enough data. Wording describes reported
experiences, not diagnoses or personal traits. The Journey stage is exclusively
calendar based; it never represents student performance.

Weekly history includes all semesters with date, period and conversation state.
`/mentor/students/[studentId]/check-ins/[checkInId]` displays the saved semester,
question text, answer label and domain snapshot. The Starting point section
shows two onboarding answers and links to all saved onboarding responses.
Neither screen joins the current Question wording or options. Admin question
edits do not rewrite history. Legacy answers without domain snapshots show
Earlier reflection and remain readable; missing metadata is not fabricated.

No assignments and no matching filters have calm empty states. Students without
weekly submissions show an explicit empty history and insufficient evidence.
Onboarding alone never generates a weekly trend.

## One shared reflection implementation

Both read services select the same immutable answer projection from
`journey/application/snapshot-selection.ts` and call the Phase 04
`buildStudentReflections` function. The Mentor presenter only formats its
structured categories; it does not compare raw values or create another trend
algorithm. Integration tests compare the categories returned by both services.

The existing current-and-previous-five-ISO-weeks window, current-semester scope,
question version comparability, latest scored pairs and mixed-evidence handling
remain unchanged. Neutral, uncertain and N/A values contribute no directional
evidence. Older scored pairs may still support a recent pattern within that
window. Missing historical metadata produces insufficient evidence. See
[Student Journey](05_STUDENT_JOURNEY.md) for the complete rules.

Mentor presentation puts MORE_DIFFICULT areas before IMPROVING areas, retaining
domain order within each category. A row shows at most one change and detail at
most two. This ordering uses the shared categories, not a second scoring system.

## Authorization and privacy

Every route calls the centralized Auth.js `requireMentor` helper. Students and
Admins retain their own workspaces and do not inherit Mentor access. Anonymous
requests go to login. User IDs supplied to read services come from the verified
session, never a query parameter.

The central `assignedStudentScope` predicate requires:

- an active Student profile and active STUDENT account;
- an active MentorAssignment to the requesting Mentor;
- an active Mentor profile and active MENTOR account.

Student-specific services call the existing `assertMentorCanAccessStudent`
policy and repeat the full assignment predicate in the actual Prisma data read.
Nested Check-in reads include the same scope. History checks both student ID and
Check-in ID, preventing a mismatched URL from exposing another student's record.
Unassigned and missing details return the same 404. Inactive historical
assignments confer no access. Revocation/reassignment takes effect on the next
server read, including within an existing authenticated browser session.

List queries independently verify the active Mentor and select only students
matching that same predicate. There is no persistent/shared data cache or manual
synchronization. Server results expose only mentoring presentation data; password
hashes, account security fields, audit events, direction values and question
signature hashes are absent. Internal directions remain server-side inputs to
the shared reflection function.

## Separation from future Observations

Phase 05 is read-only: there is no schema change, migration or new persisted
signal. Derived attention categories have no lifecycle, evidence record or
deduplication state. Future Phase 06 Observations can introduce those concepts
explicitly. No notes, conversation records, agreements, follow-ups or Quest
assignment controls are introduced here.

## Actual limitations

- Assignment lists and history currently load without pagination, appropriate
  for the seeded pilot rather than large cohorts.
- Pre-Phase-04 answers remain readable but cannot support trends without their
  original comparison metadata. Sparsely repeated questions can legitimately
  produce Not enough data.
- Current conversation attention uses the explicit two-week display window; it
  is not a queue of unresolved requests. Historical responses remain inspectable.

## Validation

Use a separate disposable PostgreSQL database with all committed migrations and
the deterministic seed. The integration and browser suites exercise writes and
must not target valuable development or production data. Run them sequentially
because existing Admin tests temporarily change the active semester.

```powershell
npm.cmd run db:validate
npm.cmd run db:deploy
npm.cmd run db:seed
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run test:e2e
npm.cmd run build
npm.cmd audit
npm.cmd ls vitest vite
```

The schema and pinned tooling remain unchanged: Vitest 4.1.11 and Vite 7.3.6.
Mentor tests cover assignment boundaries, role rejection, account/profile
deactivation, reassignment, history ID mismatch, shared categories, mixed and
neutral responses, chronological conversation freshness, immutable snapshot
wording, list filtering, empty states, keyboard access and 320/375/390px layouts.

### Results (2026-09-17)

- Prisma validation passed. No Phase 05 migration was needed; the seven existing
  migrations deployed successfully to `mentoring_phase05_validation`.
- Deterministic seed succeeded twice in that dedicated test database. Existing
  development Check-ins were not used or changed by the validation suites.
- ESLint and strict TypeScript checks passed.
- All 159 unit/integration tests passed across 20 files.
- All 17 Chromium Playwright tests passed in the final complete run with zero
  retries, including the five new Mentor scenarios and expanded route guards.
- Mentor dashboard, list, student detail and history passed no-horizontal-
  overflow checks at 320, 375 and 390px. Desktop/list/detail screenshots were
  visually inspected; keyboard filters and student navigation passed.
- Production build passed; all Mentor routes are rendered dynamically.
- Dependency audit reported zero vulnerabilities. Installed Vitest 4.1.11 and
  Vite 7.3.6 match their unchanged exact pins.
