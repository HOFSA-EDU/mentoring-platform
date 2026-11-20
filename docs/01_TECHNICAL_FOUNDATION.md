# Technical Foundation

## Architecture

The application is a modular monolith built with the Next.js App Router. It is
deployed as one application and uses one PostgreSQL database.

Business code belongs under `src/modules/<module>`. The current implementation
contains `identity`, `auth`, `admin`, `audit`, `check-ins`, `journey`, `mentor`, `observations`, `mentoring`, and `quests` modules. Modules
follow a domain/application/UI split: Zod schemas and explicit errors form the domain
boundary, transactional Prisma services and read models form the application
boundary, and route-composed shadcn/ui forms and tables form the UI boundary.
Quest assignment follows the same modular boundary within this application.

Route files under `src/app` compose module and shared UI code. They should not
contain business rules. Shared shadcn/ui primitives live under
`src/components/ui`; the role-oriented application shell lives under
`src/components/layout`.

Database access is centralized through `src/lib/prisma.ts`. Environment input is
validated with Zod. Authentication uses Auth.js credentials with bcrypt password
hashes, while authorization is enforced in server-side data-access functions and
again at protected route entries.

## Phase 03 data boundary

The schema contains:

- users and the `STUDENT`, `MENTOR`, and `ADMIN` roles
- password hashes and active account state
- student and mentor profiles
- historical mentor-to-student assignments with at most one active assignment
  per student
- historical semesters with at most one active semester
- behaviour-based questions and ordered answer options
- reusable Quest templates (not student Quest assignments)
- one-time Student onboarding and weekly Check-ins
- immutable Check-in answers with question, option, and direction snapshots
- immutable Admin audit events

No observation, mentor conversation, private note, agreement, student Quest
assignment, or Quest reflection data is modeled in this phase.

## UI boundary

`/student`, `/mentor`, and `/admin` are responsive authenticated workspaces. The
Admin shell exposes operational management routes. The Student shell exposes
onboarding, weekly Check-ins, and owned history; Mentor future-workflow items
remain disabled. The shared shell displays the signed-in user and provides
logout; exact role checks prevent cross-role access.

## Consistency boundary

Coupled writes run in Prisma transactions. User/profile creation, account state
changes, assignment replacement, semester activation, question/option writes,
Quest template writes, and their audit events either commit together or roll
back together. Assignment replacement and semester activation use serializable
transactions; PostgreSQL partial unique indexes independently enforce one active
assignment per student and one active semester. Check-in submissions also use
serializable transactions, with database uniqueness enforcing one weekly
submission per Student, semester, and explicit period.

Phase 04 adds a read-only Student Journey module with pure calendar, continuity
and descriptive reflection rules. See `docs/05_STUDENT_JOURNEY.md` for snapshot
comparability, ownership, neutral handling and mobile presentation details.

Phase 05 adds assignment-scoped Mentor lists and student details. It reuses the
Phase 04 reflection domain service and immutable snapshot projection; only the
Mentor presenter and read models are new. The schema is unchanged. See
`docs/06_MENTOR_DASHBOARD.md` for authorization, temporary attention categories,
conversation freshness and privacy boundaries.

Phase 06 adds formal Observations and immutable source evidence, with a pure
rule engine and transactional idempotent persistence. Check-ins commit before
post-processing; authorized Mentor reads can recover missed evaluations.
Assignment-scoped lifecycle actions acknowledge or resolve observations. See
`docs/07_OBSERVATIONS.md` for exact rules, concurrency and privacy boundaries.

Phase 07 adds a transactional mentoring module with immutable conversations,
Observation links, a separate SharedAgreement table and retained FollowUps.
Student agreement reads use a dedicated owner-scoped allowlist; private notes
and internal reminder metadata remain behind active MentorAssignment checks.
See `docs/08_MENTORING.md` for request resolution, historical Mentor access,
calendar windows and coupled-write guarantees.

Phase 08 adds immutable Quest assignments and Student reflections, with an
enforced two-active-Quest limit, transaction-safe completion/cancellation and
owner/active-assignment authorization. Student displays select only snapshot
wording, shared agreement text and reflection values. See `docs/09_QUESTS.md`.
