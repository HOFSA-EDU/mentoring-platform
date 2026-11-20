# Quest assignment and reflection

Phase 08 connects a mentoring conversation to a small behavioural experiment:
Mentor assignment → Student action → Student reflection → Mentor review.
Quests are practical strategies to try, not homework, grades or assessments.
Auth.js, Student reflection rules, Observation evaluation and mentoring history
retain their existing responsibilities.

## Models, snapshots and constraints

`QuestAssignment` stores Student, original assigning Mentor, Student's semester
at assignment, optional template/conversation/agreement references, title,
description, development domain, assignment/due dates, status and lifecycle
timestamps. Title, description, domain and `reflectionPromptSnapshot` are copied
at assignment. Historical displays never join current template wording. Editing
or deactivating an Admin template therefore affects only later assignments.
Choosing a template pre-fills its title, description, domain and default duration;
the Mentor can customize title, description and date without changing the source.
A custom Quest needs no template. All five existing seeded templates remain.

`QuestReflection` has a unique assignment reference, `attempted`, `helpful`,
optional text, submission time and creation time. One Quest has at most one
reflection. The database and services preserve its original submitted values.

| Enum | Values |
| --- | --- |
| QuestStatus | ACTIVE, COMPLETED, CANCELLED |
| QuestAttempt | YES, PARTLY, NO |
| QuestHelpfulness | YES, A_LITTLE, NO, NOT_SURE |

Database constraints enforce:

- Unique `(mentorId, submissionKey)` for safe retries of an assignment form.
- Unique `(studentId, activeSlot)` with ACTIVE requiring slot 1 or 2. These are
  internal capacity slots, never scores or Student-facing data. Terminal records
  have a null slot, so history is unlimited while active capacity stays at two
  across all semesters and Mentors.
- Unique `QuestReflection.questAssignmentId` prevents duplicate reflection.
- Composite conversation/Student foreign key; an insert trigger checks that a
  linked agreement belongs to the same conversation and Student.
- Valid status/timestamp combinations, terminal time on/after assignment,
  assignment text limits and optional reflection text of at most 2,000 characters.
- An UPDATE trigger permits only ACTIVE → COMPLETED or ACTIVE → CANCELLED and
  rejects changes to identity, links, dates, wording and historical metadata.
  Submitted reflections reject all updates.
- A reflection insert locks its Quest and requires ACTIVE. Deferred constraint
  triggers verify at commit that COMPLETED has exactly its corresponding
  reflection and matching submission/completion time; ACTIVE and CANCELLED have
  none. Neither a standalone reflection nor a completion without reflection can
  commit.

Foreign keys restrict deletion of referenced history. Services and UI have no
hard-delete operations. The migration creates new Quest records and relations;
it does not rewrite Check-ins, answer snapshots, Observation evidence or
mentoring history.

## Transactions and authorization

Every Mentor route/action requires `requireMentor`; services independently check
the active MentorAssignment plus active Mentor and Student accounts/profiles.
Read selection repeats `assignedStudentScope`, rather than trusting a prior page
visit. Both the form's optional prelinked conversation and all submitted links
are verified server-side. A former Mentor immediately loses access after
reassignment. The new assigned Mentor can review/cancel historical Quests without
changing their recorded authorship. Admin does not inherit reflection access.

Assignment, cancellation and reflection serialize on a per-Student PostgreSQL
transaction advisory lock (`quests:<studentId>`). Assignment/cancellation also
reuse Phase 07's live assignment/account/profile row locks, preventing concurrent
revocation from interleaving with an authorized write. Student reflection locks
the active owning account/profile. Transactions run at READ COMMITTED so a
request waiting for the lock sees the previous request's committed result.

Assignment checks capacity, validates template and links, creates the snapshot
and records its audit in one transaction. Reusing the same Mentor/form submission
key returns the original Quest after checking current authorization; a different
Student cannot reuse that key. Multiple independent assignments cannot exceed
two, including under simultaneous requests. PostgreSQL enforces the limit as
well as the service.

Reflection validates ownership and ACTIVE status, inserts the reflection,
completes the Quest, releases its capacity slot and writes both audits in one
transaction. A duplicate is rejected without additional records. Cancellation
requires the currently assigned Mentor and ACTIVE status; it releases capacity
and preserves history. Retrying cancellation is harmless; a completed Quest
cannot be cancelled. Concurrent cancellation/reflection has one winner and no
partial result. Failure-injection tests cover rollback of coupled writes/audits.

Audit actions are `QUEST_ASSIGNED`, `QUEST_CANCELLED`,
`QUEST_REFLECTION_SUBMITTED` and `QUEST_COMPLETED`. Entity types identify
assignments and reflections. Metadata contains only the necessary Quest ID;
Student text, answers and Mentor wording are not copied into audits.

## Completion and Observation separation

A valid reflection completes the experiment regardless of attempted/helpful
answers. In particular, NO + NOT_SURE is a completed reflection. Completion
means the Student took time to reflect, not that a strategy succeeded. The UI
explicitly explains this and never labels a Quest failed, missed or unsuccessful.

Quest services do not evaluate, acknowledge or resolve Observations. Even a
helpful Quest linked through a conversation leaves its Observations unchanged.
This is separate from Phase 07's existing conversation-request resolution rule.
Quest answers never feed Student domain trends, semester progress or risk scores.

## Privacy and read models

Student access resolves ownership from the authenticated user and includes it
in every database query. Lists/details include only the Student's own Quests.
Mentor review requires an active assignment; original authorship is not access.

An allowlisted projection shared by Quest display queries contains snapshot
wording, dates/status, linked shared agreement text and reflection values. It
never selects private conversation topics/notes, internal FollowUp data,
Observations, current template wording, security fields or capacity slots.
The assignment form has a separate Mentor-only projection for authorized
conversation choices. It is never passed to Student pages. Shared agreement
text remains safe to reference because Phase 07 makes those records immutable.
All free text renders as text, never raw HTML.

## User flows, dates and milestones

Mentor Student detail includes a compact Quests section grouped by Active,
Completed and Cancelled. Assign Quest is available there and on each recorded
conversation. The form supports template/custom wording, a due date and optional
conversation/agreement links. It clearly identifies Student-visible wording.
At capacity, it explains that one of the two active Quests must be completed or
cancelled. Server checks enforce this even for forged or stale forms.

On `/student`, weekly Check-in remains first, followed by active Quests, recent
reflection, Journey, shared agreement and Check-in history. `/student/quests`
keeps active/completed/cancelled history. `/student/quests/[questId]` shows the
snapshot, dates, status, optional shared agreement and a short reflection:

1. Did you try it? Yes / Partly / No
2. Did it help? Yes / A little / No / Not sure
3. What did you notice? Optional text

The form explains that the currently assigned Mentor can read the answers and
that saving preserves them as submitted. Mentor review shows these answers and
text directly, without psychological interpretation or internal scoring.

Due dates are PostgreSQL DATE values interpreted against the Luxembourg calendar,
independent of browser/server timezone. Assignment allows today through the next
365 calendar days; a template supplies its default duration, a custom Quest
defaults to seven days. ACTIVE before today displays Overdue with calm wording
and still accepts reflection. Overdue never changes stored status or creates a
penalty. Completed/cancelled Quests never show an overdue label.

History shows quiet milestones: “First Quest reflection completed” and, from
three completed reflections, “3 Quests reflected on”. They count reflection,
including NO, without XP, ranking or competitive data.

The UI uses existing shadcn/ui components and Lucide icons. Choices have labels,
keyboard support, focus indication and at least 48px touch height; actions use
at least 44px. Status uses text rather than color alone. Empty states do not
imply a problem. Mobile coverage includes 320, 375 and 390px.

## Validation

Run unit/integration and Playwright suites sequentially against a separate
seeded PostgreSQL database: earlier Admin tests temporarily change the active
semester. The Phase 08 suites cover snapshots after Admin editing, custom
experiments, simultaneous assignment/retry/reflection/cancellation, database
constraints, transactional rollback, direct and forged access, reassignment,
DTO and returned-HTML privacy, Observation separation, empty states, date
boundaries, all answer choices and milestones. Browser tests exercise the
Mentor → Student → Mentor loop plus mobile layout and keyboard reflection.

## Validation results (2026-09-17)

- Prisma format, validation and generation passed. All ten migrations applied
  to a fresh `mentoring_phase08_validation` database and the deterministic seed
  ran twice successfully.
- The Quest migration also applied to the local development database. SHA-256
  snapshots of all existing Check-in, answer, Observation/evidence, conversation,
  agreement, conversation/Observation link and FollowUp rows were unchanged
  (including the existing two Check-ins and 15 answers). Prisma reports no schema
  difference between the applied database and the schema.
- ESLint and strict TypeScript passed.
- All 300 unit/integration tests passed across 26 files, including 47 new Quest
  tests for authorization, concurrency, snapshots, rollback and semantics.
- All 25 existing Chromium E2E tests passed in the full suite. The five new Quest
  scenarios passed in their final run without retries, including the complete
  Mentor/Student loop, template edits, two-active limit, retained cancellation,
  direct/forged/revoked access, returned-HTML privacy, empty states and keyboard
  submission. Student dashboard, history and detail have no horizontal overflow
  at 320, 375 and 390px. Reflection screenshots at all three widths and the
  desktop Mentor review screenshot were visually inspected.
- Production build passed with dynamic Quest routes.
- Dependency audit found zero vulnerabilities. Vitest 4.1.11 and Vite 7.3.6
  remain exactly pinned and installed. No dependencies were upgraded.

## Actual limitations

- Assigned wording, links and due dates cannot be edited. Review before assigning;
  cancel an active experiment and create a replacement if it needs to change.
- Submitted reflections cannot be edited. Review before saving; their original
  values remain part of the history.
- Quest histories and conversation choices are not paginated in this pilot.
- Due dates use the platform's Luxembourg timezone and a maximum 365-day window.
