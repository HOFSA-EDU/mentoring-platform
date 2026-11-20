# Student Onboarding and Check-ins

## Authorization boundary

Every Student route calls the centralized Auth.js `requireStudent` boundary.
Every Server Action repeats that check, and each submission service resolves an
active `STUDENT` User and active `StudentProfile` again inside its database
transaction. Student, semester, question, option, snapshot, and internal
direction values are never accepted from the browser as authoritative data.

Owned-history queries always include the authenticated Student profile ID.
Knowing another Check-in ID is therefore insufficient to read it. Mentor and
Admin accounts cannot call Student submission services as Students; no
impersonation feature exists.

## Onboarding workflow

`/student/onboarding` presents 10 seeded situational questions across the six
development domains. Prompts ask what normally happens in a concrete situation;
they do not ask the Student to assess a trait or diagnose themselves.

On submission, the service verifies the exact active onboarding question set
and that each selected option belongs to its Question. It creates a single
`ONBOARDING` Check-in and its answers atomically. A partial unique index enforces
one onboarding baseline per Student. The confirmation repeats at most two
factual answers using “you reported” language and does not calculate a score.

## Weekly workflow

`/student/check-in` is available after onboarding and only while the Student's
active semester dates include the current Luxembourg calendar date. Each form
contains:

- the first three active stable weekly Questions in configured order;
- two active rotating Questions where available; and
- a required Yes/Maybe/No mentor conversation response.

The form uses shadcn/ui field, progress, card, alert, button, and Toggle Group
primitives. Answer targets are keyboard accessible, mobile friendly, and do not
expose internal direction values.

A Yes conversation request is stored on the Check-in and emits a separate,
minimal audit event. It does not create a conversation or collect an
explanation.

## Deterministic question selection

Stable and rotating pools are ordered by `sortOrder`, then stable key. The
rotation starts at `studyWeekIndex % rotatingPool.length`. It selects that item
and then the next configured item from a different domain; if no different
domain exists, it uses the next item. The algorithm has no randomness, so the
same configured pool and study week always produce the same form.

## Study-week calculation

An instant is first converted to its calendar date in the explicit IANA zone
`Europe/Luxembourg`. The normal Check-in period is that date's ISO week key, for
example `2026-W38`. The semester study-week index is the whole number of Monday
boundaries since the Monday containing the semester start date. Stored semester
dates are treated as date-only UTC values.

This prevents a UTC server from moving a Luxembourg Student into the wrong week
around local midnight and keeps rotation independent of deployment location.

## Persistence and immutability

`CheckIn` stores the Student, semester, kind, explicit period key, submission
time, and explicit `mentorConversationRequest` enum. PostgreSQL uniquely constrains
`studentId + semesterId + periodKey`, so concurrent normal submissions for the
same study week cannot both commit. A second partial unique index limits each
Student to one onboarding baseline.

`CheckInAnswer` stores:

- the source Question ID;
- the selected option ID as historical identity;
- the authoritative Question text snapshot;
- the authoritative option label snapshot;
- the authoritative direction value snapshot; and
- display order.

Submitted records have no update or delete application service or route.
History and detail screens read only snapshots, so later Admin wording and
option changes affect future Check-ins without rewriting past reflections.

Submission uses a serializable Prisma transaction: it reauthorizes the actor,
checks period availability, loads the authoritative question/option set,
validates selections, creates the Check-in and nested answers, and writes audit
events. Any failure rolls back the complete operation. Unique conflicts are
translated into a Student-readable already-submitted error.

## History and feedback

`/student/check-ins` lists only the signed-in Student's onboarding and weekly
submissions in reverse chronological order. It shows historical question and
answer wording and whether a mentor conversation was requested, but never shows
direction values. The optional detail route applies the same ownership filter.

Phase 03 feedback is direct, factual restatement only. There is no cross-week
comparison, pattern detection, Observation generation, diagnosis, or scoring.

## English catalogue revision

The deterministic seed contains exactly 10 onboarding questions, three stable
weekly questions (Organisation, Work Start, Help Seeking), and 12 rotating
weekly questions (two per development domain). Weekly selection still uses the
existing deterministic rotation and shows three stable plus two rotating questions.
The exact wording and option order are recorded in
`src/modules/check-ins/application/fixtures/question-catalogue.json` and checked
against the seeded database. All 25 existing question keys and IDs are retained;
legacy keys are identifiers, not descriptions of the revised wording. No keys
were renamed. Historical wording must always come from answer snapshots.

`QuestionOption.directionValue` and `CheckInAnswer.directionValueSnapshot` are
now nullable. Numeric values remain 0 through 3, increasing with difficulty;
NULL explicitly means unscored (neutral, uncertain, or not applicable), never
zero or maximum difficulty. The three unscored labels are:

- `I did not need help this week.`
- `I am not sure.`
- `There was no situation like this.`

The label snapshot retains which kind of unscored answer was chosen. Any future
numeric analysis must exclude NULL, rather than coerce it to zero. Baseline
feedback excludes unscored answers from its ordering. Admins leave the direction
field blank to preserve/create an unscored option. Internal values remain hidden
from Students. For onboarding question 8, independently understanding a solution
and asking someone to explain it both receive 0; memorising steps receives 2,
and moving on without understanding receives 3. Other scored choices follow
increasing difficulty in their supplied order (0, 1, 2, 3).

The mentor question is `Would a short conversation with your mentor be helpful
for something right now?` and stores `MentorConversationRequest`:

- `YES`: explicit request; emits the existing conversation-request audit event.
- `MAYBE`: soft signal; saved and displayed separately, without that request event.
- `NO`: no request. Onboarding always stores NO.

Migration `20260917120000_question_catalogue` maps historical true to YES and
false to NO before dropping the old boolean. It preserves all historical answer
values, labels and question text, and retains database range and period checks.
Reseeding replaces each question's options atomically with deterministic IDs;
it never rewrites Check-in answers. Option machine values reflect the new labels.
The seed retains its existing development account/semester reset behaviour.

This revision adds no trends, Observations, or Mentor dashboard handling.

### Revision validation (2026-09-17)

- Migration applied to the local development database; all 10 existing answer
  snapshots compared equal before/after migration and both seed runs.
- Two consecutive seed runs produced identical question and option records.
- 71 unit/integration tests passed, including historical boolean migration,
  neutral snapshots, authoritative values, ownership and deterministic rotation.
- Eight Playwright tests passed, including full Yes, Maybe and No submissions.
- ESLint, TypeScript, Prisma validation and the production build passed.
- Dependency audit: zero vulnerabilities; Vitest 4.1.11 and Vite 7.3.6 unchanged.
- Workflow tests ran against a separate disposable database to preserve local
  reflections. The tests still require seeded PostgreSQL and the browser tests
  require dates inside the seeded semester.
