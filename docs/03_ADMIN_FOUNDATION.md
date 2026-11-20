# Admin Foundation

## Authorization

Admin pages call the centralized `requireAdmin` helper at their server route
boundary. Every server action repeats that check before entering the Admin
application service, and each write transaction verifies that the actor is still
an active `ADMIN` account. Client visibility is never used as authorization.

There is no public registration. Student and Mentor creation sets the role on
the server, hashes the initial password with bcrypt, and creates the `User` and
matching profile in one transaction. Deactivation is preferred to deletion and
prevents authentication through the existing Auth.js credential flow.

## Domain model

### Mentor assignments

`MentorAssignment` rows are historical records. Reassignment deactivates the
current row, sets `deactivatedAt`, and creates a new active row in a serializable
transaction. It never changes the mentor on an existing historical row. A
partial unique database index permits at most one active assignment for each
student, while allowing any number of inactive history rows.

Deactivating a Student or Mentor also closes their current assignments in the
same transaction. Reactivation does not silently restore an old assignment.

### Semesters

Semesters retain their date ranges and history. Activating a semester deactivates
the previous active semester in the same serializable transaction. A partial
unique index enforces the single-active-semester invariant, and a check constraint
requires the start date to precede the end date.

### Questions and options

`Question` stores a stable key, concrete behaviour-based prompt,
`DevelopmentDomain`, `QuestionType`, stable/rotating flag, active flag, and sort
order. The allowed domains are:

- `ORGANISATION`
- `WORK_START`
- `HELP_SEEKING`
- `LEARNING_UNDERSTANDING`
- `PERCEIVED_WORKLOAD`
- `STUDY_CONFIDENCE`

`QuestionOption` stores a display label, machine value, internal direction value
from 0 through 3 (or NULL for an unscored answer), and sort order. Values and sort orders are unique within a
question. Direction values are configuration data for a later trend engine and
must not be displayed as scores to students or mentors.

Question edits replace the complete ordered option set atomically and affect
future forms only. Phase 03 Check-in answers retain the Question relation plus
the selected option identifier as historical identity, without a foreign key to
the replaceable option row. Question text, option label, and direction value are
copied into immutable answer snapshots at submission, so an Admin edit cannot
rewrite the wording or meaning shown in Student history.

### Quest templates

`QuestTemplate` defines a reusable behavioural experiment with a stable key,
title, description, domain, activation state, default duration, and reflection
prompt. It is configuration only. There is no relationship to a student and no
Quest assignment workflow in this phase.

### Audit events

`AuditEvent` records the active Admin actor, explicit `AuditAction`, entity type,
entity ID, optional JSON metadata, and timestamp inside the same transaction as
the mutation. Phase 02 records account creation and state changes, assignment
changes, semester changes, and Question/Quest template writes. Audit storage is
ready for later review, but there is no audit viewer in this phase.

## Admin routes

- `/admin` — operational overview
- `/admin/students`, `/admin/students/new`, `/admin/students/[studentId]/edit`
- `/admin/mentors`, `/admin/mentors/new`, `/admin/mentors/[mentorId]/edit`
- `/admin/assignments`
- `/admin/semesters`, `/admin/semesters/new`, `/admin/semesters/[semesterId]/edit`
- `/admin/questions`, `/admin/questions/new`, `/admin/questions/[questionId]/edit`
- `/admin/quest-templates`, `/admin/quest-templates/new`, `/admin/quest-templates/[templateId]/edit`

All form payloads are validated with Zod on the server. The UI uses shadcn/ui
tables, cards, fields, selects, badges, empty states, and confirmation dialogs,
with Lucide icons and responsive layouts.
