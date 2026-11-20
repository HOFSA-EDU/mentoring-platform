# BTS Mentoring Platform

A reflection-led mentoring platform for first-semester BTS students. The current
Phase 08 scope provides credential authentication, server-side role isolation,
the Admin foundation, situational Student onboarding, weekly Check-ins, Yes/Maybe/No mentor
conversation signals, immutable Student history, and a personal Student Journey
with descriptive reflections, calendar stages and quiet continuity milestones.
Mentors now have an assignment-scoped dashboard, searchable student list and
student detail with shared reflections and immutable Check-in history.
Formal Mentor Observations now preserve explainable evidence, support
acknowledgement/resolution, and generate idempotently after weekly submissions.
Mentors can record conversations linked to Observations, keep private notes,
share separate agreements with Students, and manage internal follow-ups.
Shared agreements appear on the Student dashboard and `/student/mentoring`;
private notes and reminder details remain assignment-scoped Mentor data.
Mentors can assign up to two active Quests: small behavioural experiments with
preserved wording. Students complete them by reflecting, including when they
answer No or Partly. Mentors can review the experience without grades or scores.

## Prerequisites

- Docker Engine with Docker Compose v2, or Docker Desktop using Linux containers
- For local development outside Docker: Node.js 24 LTS and npm 11 or newer

## Docker deployment (complete application)

The production Compose stack runs Next.js, PostgreSQL, and database migrations.
The multi-stage Dockerfile builds a small, non-root Next.js standalone image;
Prisma and administrator tooling use a separate image.

```powershell
Copy-Item .env.docker.example .env.docker
```

Fill in the database password, an independent authentication secret, and the
public URL in `.env.docker`, then start the stack:

```powershell
docker compose --env-file .env.docker up -d --build --wait
```

Set the three `BOOTSTRAP_ADMIN_*` values in `.env.docker` and explicitly create
the first administrator:

```powershell
docker compose --env-file .env.docker run --rm bootstrap
```

Remove the bootstrap values afterwards. Demo data is never loaded automatically.
The app is available on `http://localhost:3000` by default and binds to the host's
loopback interface. Production data uses its own persistent volume.
See the [German deployment guide](docs/DOCKER_DEPLOYMENT.md) for secret generation,
all variables, initial configuration, HTTPS, updates, backups, and restore steps.

## Local setup

```powershell
npm install
Copy-Item .env.example .env
npx auth secret
docker compose -f docker-compose.dev.yml up -d
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

If PowerShell blocks `npm.ps1`, use `npm.cmd` and `npx.cmd` for these commands.
Stop the development server with `Ctrl+C` in its terminal.

Set the generated value as `AUTH_SECRET` in `.env`; use a distinct secret in
every deployed environment. Open [http://localhost:3000](http://localhost:3000)
and sign in. There is no public registration flow.

The deterministic development seed uses one password for all accounts:
`MentoringDev!2026`.

- Admin: `admin@example.test`
- Mentors: `mentor1@example.test`, `mentor2@example.test`
- Students: `student1@example.test` through `student8@example.test`

The seed also creates eight current mentor assignments, the active Autumn 2026
semester, 10 situational onboarding questions, 15 weekly behaviour-based
questions (three stable and 12 rotating), and five Quest templates. These
accounts and records are development-only. Running `npm run db:seed` again
safely restores the same deterministic dataset.

## Student reflection workflow

- `/student/onboarding` — one-time, 10-question situational baseline
- `/student/check-in` — three stable and two deterministically rotated questions
- `/student/check-ins` — the signed-in Student's immutable reflection history

Weekly periods are ISO week keys calculated explicitly in
`Europe/Luxembourg`. A unique database constraint prevents a Student from
submitting more than one normal Check-in for the same semester and week.

## Mentor workspace

- `/mentor` — current conversation signals and recent changes, followed by all assigned students
- `/mentor/students` — name search and Yes/Maybe/No and recent-change filters
- `/mentor/students/[studentId]` — semester overview, shared reflections, history and onboarding

Every Mentor read and lifecycle action checks the active assignment on the
server. YES can create a formal conversation-request Observation; MAYBE remains
soft. Three comparable responses can support repeated difficulty, worsening or
improvement, with exact historical evidence and no numeric risk scores.
See [Observations](docs/07_OBSERVATIONS.md) for rules, lifecycle and recovery.

## Admin workspace

Every Admin page and mutation reuses the centralized Auth.js authorization
boundary and requires an active `ADMIN` account on the server.

- `/admin` — operational counts and the current semester
- `/admin/students` — student search, creation, editing, and activation
- `/admin/mentors` — mentor search, creation, editing, and activation
- `/admin/assignments` — current assignment changes and recent history
- `/admin/semesters` — semester creation, editing, and activation
- `/admin/questions` — question filters, ordered options, and activation
- `/admin/quest-templates` — reusable behavioural experiment templates

Account roles are assigned by the server. Student and mentor deactivation closes
their current mentor assignments but retains all account and assignment history.

## Quest workflow

- Mentor Student detail → **Assign Quest**, optionally from a recorded conversation
- Choose and customize a template, or write a custom small experiment
- Student dashboard → **Active Quests** → **Open Quest** → **Save reflection**
- `/student/quests` retains active, completed and cancelled experiments
- Mentor Student detail → **Quests** shows the Student's answers and optional text

Submitting a reflection completes the Quest regardless of Yes / Partly / No.
Private Mentor notes and internal follow-ups never appear in Student Quest data.
Quest completion never changes Observation status. See [Quests](docs/09_QUESTS.md)
for snapshots, concurrency, privacy, constraints and validation.

## Database

PostgreSQL runs locally in Docker and stores data in the named `postgres-data`
volume.

```powershell
docker compose -f docker-compose.dev.yml up -d
docker compose -f docker-compose.dev.yml ps
docker compose -f docker-compose.dev.yml logs postgres
docker compose -f docker-compose.dev.yml down
```

Create a development migration with `npm run db:migrate -- --name
describe_change`; apply committed migrations in deployment environments with
`npm run db:deploy`.

## Quality checks

```powershell
npm run db:validate
npm run lint
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e
npm run build
npm audit
```

Vitest `4.1.11` and Vite `7.3.6` are intentionally pinned in `package.json`.

## Project structure

- `src/app` — Next.js App Router pages, Auth.js handler, and role layouts
- `src/components/ui` — shadcn/ui primitives
- `src/components/layout` — shared responsive authenticated shell
- `src/modules/auth` — credentials, authorization, policies, and login UI
- `src/modules/admin` — Admin validation, transactional services, queries, and UI
- `src/modules/check-ins` — period calculation, question selection, transactional submissions, read models, and Student UI
- `src/modules/journey` — shared descriptive reflection rules, calendar stages and Student Journey
- `src/modules/mentor` — assignment-scoped Mentor reads, presentation and compact lists
- `src/modules/observations` — deterministic evidence rules, idempotent persistence and Mentor lifecycle
- `src/modules/mentoring` — transactional conversations, separate shared agreements and private follow-ups
- `src/modules/quests` — immutable experiment assignments, Student reflections and Mentor review
- `src/modules/identity` — role types and role-shell content
- `src/lib` — environment and Prisma infrastructure
- `prisma` — schema, migrations, and deterministic seed
- `tests/e2e` — Playwright authentication and isolation tests

See `docs/01_TECHNICAL_FOUNDATION.md`,
`docs/02_AUTHENTICATION_AND_AUTHORIZATION.md`,
`docs/03_ADMIN_FOUNDATION.md`, `docs/04_STUDENT_CHECKINS.md`,
`docs/05_STUDENT_JOURNEY.md`, `docs/06_MENTOR_DASHBOARD.md`,
`docs/07_OBSERVATIONS.md`, `docs/08_MENTORING.md`, and `docs/09_QUESTS.md` for the
architecture and security boundaries.
