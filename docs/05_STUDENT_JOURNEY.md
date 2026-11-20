# Student Journey and Reflection Dashboard

Phase 08 places active Quests immediately after the weekly action. Shared
agreements appear after recent reflections and Journey, before Check-in history.
Quest completion counts saved reflection, not success, and does not affect the
reflection logic or calendar stages below. See [Quests](09_QUESTS.md).

Phase 04 adds a personal Student reflection experience to `/student`. The page
prioritises the current weekly action, at most two recent changes, the semester
Journey, recent Check-ins, six development areas, and quiet acknowledgements of
continuity. A saved onboarding starting point and the latest conversation
response remain available below those sections. An inactive semester keeps
history readable without presenting an unavailable submission action.

## Semester Journey

Journey is based exclusively on elapsed calendar time between semester start
and end dates. The current date uses `Europe/Luxembourg`; stored semester dates
retain the existing UTC date-only convention. Unrounded proportions determine
stages, with a rounded percentage used only for the accessible calendar progress
indicator:

| Portion of semester elapsed | Stage |
| --- | --- |
| Below 10% | Start |
| 10% to below 25% | Orientation |
| 25% to below 50% | Routine |
| 50% to below 85% | Independence |
| 85% onward | Reflection |

This adapts to different semester lengths. Before/after dates clamp to 0/100%
and use explicit explanatory text; invalid ranges return an unavailable state.
Answers, completion counts, and reported difficulties never affect the stage.

## Comparable evidence and immutable metadata

New submissions additionally snapshot `domainSnapshot`, `stableSnapshot` and
`questionSignatureSnapshot` on each answer. The server computes a SHA-256
signature over the question text, domain, context, type, stable flag and the
complete ordered set of option labels, machine values and nullable directions.
Changing an unselected option can change the meaning of the scale, so it also
starts a new comparison series. Row IDs and timestamps are excluded; an
unchanged Admin save or deterministic reseed does not break comparability.

Migration `20260917140000_student_journey_snapshots` adds these nullable fields
without changing any existing answers. A database constraint requires either
all three metadata fields or none. Older answers retain their original question,
answer and direction snapshots. Their missing historical full scale/domain
cannot be reconstructed safely, so they remain visible but do not contribute
to directional comparisons; their detail category is `Earlier reflection`.

The new Student Journey query does not join current Question rows. It retrieves
only the authorised Student's snapshots. The detail and history screens also
display snapshot text and snapshot domain labels, so Admin edits cannot change
what a Student sees in a historical reflection.

## Deterministic reflection rules

Pure rules live under `src/modules/journey/domain`; queries live under
`src/modules/journey/application`. React components receive descriptive results,
not raw numeric direction values or hashes.

- Consider weekly submissions in the Student's current semester, within the
  current and preceding five ISO weeks. Exclude future submissions and duplicate
  periods. Onboarding is a starting point, never a weekly trend data point.
- Group by question ID. Starting from its latest response, only use the latest
  uninterrupted series of identical signatures, question text and domain.
  An edited question stops the series, including an older version restored later.
- Exclude NULL direction values: neutral, uncertain and not-applicable answers
  are neither improvement nor difficulty. Two earlier scored answers may still
  support a cautiously worded recent pattern within that six-week window; a
  neutral answer itself supplies no directional evidence.
- Compare the latest two scored, comparable answers per question. Fewer than
  two yields `NOT_ENOUGH_DATA`; equal values yield `STABLE`; a lower/higher
  reported difficulty yields `IMPROVING`/`MORE_DIFFICULT`.
- Combine question directions without summing or averaging. Opposing directions
  in one domain yield `MIXED`. Stable evidence plus one consistent direction can
  support that direction. No numeric domain score is created or persisted.
- Recent changes show at most two domains with a directional result, in the
  fixed domain display order. No change is invented to fill the section.
- The optional weekly comparison uses only the latest two submitted weekly
  Check-ins in the window, with stable questions and comparable non-NULL answers
  in both. It shows the actual two period labels and snapshot answers. It does
  not skip a neutral answer or claim that non-consecutive submissions are
  consecutive calendar weeks.

All wording describes what the Student reported. Empty/one-answer states explain
that comparisons will develop over time. Mixed answers receive an explicit
mixed-evidence message. No personality, diagnostic, performance or risk labels
are produced. No AI interpretation or Observation rows are involved.

## Development labels

| Internal domain | Student label |
| --- | --- |
| ORGANISATION | Keeping track |
| WORK_START | Getting started |
| HELP_SEEKING | Asking for help |
| LEARNING_UNDERSTANDING | Understanding |
| PERCEIVED_WORKLOAD | Managing workload |
| STUDY_CONFIDENCE | Taking on challenges |

## Continuity and milestones

The weekly completion count and consecutive-week count are personal and scoped
to the current semester. A streak starts from the current week if submitted, or
the previous week while the current one is still open, then walks backwards
through real ISO weeks. Missing weeks and year boundaries are handled safely.
The UI only mentions a consecutive run longer than one week and never displays
a failure or penalty for a gap.

Small text acknowledgements cover completed onboarding, the first weekly
Check-in, four weekly Check-ins and the first explicit mentor conversation
request. `MAYBE` is never counted as an explicit request. Onboarding remains a
lifetime acknowledgement even after semester reassignment. There are no
rankings, comparisons with others, currencies or badge collections.

The mentor response shown is explicitly the saved answer from the latest
Check-in, not a claim that a mentor has seen, scheduled or completed anything.
YES, MAYBE and NO retain their distinct labels.

## History, mobile use and accessibility

History remains newest-first with date, period, completion, answer count and
conversation response. Answers open on a separate detail page rather than
expanding every record in the history list. Dashboard comparisons use a native
keyboard-accessible disclosure. Navigation links and primary actions have large
tap targets; stacked mobile layouts avoid wide tables. Semantic headings,
labelled regions and progress, and text labels alongside icons preserve meaning
without relying on colour.

## Authorization

Every Student route retains Auth.js `requireStudent`. The read service rechecks
the active Student account/profile and scopes every database read to that
resolved owner; it accepts no target Student ID from the browser. Detail IDs are
checked against the same owner, and inactive/unauthenticated/wrong-role actors
cannot retrieve another Student's reflections. The service creates no persistent
reflection records or Mentor workflow data.

## Actual limitations

Pre-Phase-04 answers without comparison metadata cannot safely form trends or
show a historically certain domain. They remain readable in full. The six-week
window and requirement for repeated unchanged questions mean sparsely rotating
domains may legitimately show insufficient evidence. This first version uses
the latest comparable pair per question rather than statistical modelling.

## Validation performed (2026-09-17)

- Prisma schema validation and migration deployment passed.
- Deterministic seed completed; all 10 pre-existing answer snapshots remained
  unchanged after migration and seed. No historical metadata was fabricated.
- ESLint and strict TypeScript checks passed.
- All 134 unit/integration tests passed across 18 files.
- All 12 Chromium Playwright tests passed, including three conversation signals,
  ownership, Admin edits preserving history, empty/one-answer states and Journey.
- Mobile dashboard widths 320, 375 and 390px passed no-overflow and primary-action
  checks; keyboard navigation and labelled progress were exercised. Desktop,
  mobile and detail screenshots were captured; dashboard screenshots were also
  visually inspected.
- Production build passed. Dependency audit found zero vulnerabilities.
- Installed/pinned Vitest 4.1.11 and Vite 7.3.6 remain unchanged.
- Automated workflows used a separate disposable PostgreSQL database. Test
  fixtures bind UTC ISO timestamp strings to avoid local Windows timezone drift
  with PostgreSQL timestamp-without-time-zone columns.
