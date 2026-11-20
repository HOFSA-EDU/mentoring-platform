# Phase 00 – Project Bootstrap

Read `AGENTS.md` and all currently available files under `/docs` before making changes.

This project starts from an empty folder.

## Goal

Create the complete technical foundation for the BTS Mentoring Platform.

Do NOT implement actual mentoring functionality yet.

The purpose of this phase is to create a clean, maintainable base that later phases can build on.

---

# Required stack

Use:

- Next.js
- React
- TypeScript strict mode
- Tailwind CSS
- PostgreSQL
- Prisma
- Zod
- Docker Compose
- Vitest
- Playwright
- shadcn/ui
- Lucide icons

Use current stable versions that are mutually compatible.

Use npm unless there is a strong technical reason not to.

---

# Architecture

Use a modular monolith.

Do not create microservices.

Create a maintainable folder structure that can later support modules such as:

- auth
- users
- students
- mentors
- checkins
- observations
- mentoring
- quests
- admin
- audit

Do not implement those business modules yet beyond the minimal identity foundation required in this phase.

---

# Project creation

Create the Next.js application directly in the current folder.

Configure:

- App Router
- TypeScript
- Tailwind
- ESLint
- sensible import aliases

Enable TypeScript strict mode.

---

# UI foundation

Initialize shadcn/ui.

Use shadcn/ui for reusable interface primitives.

Add or configure the basic components needed for the application shell, including where appropriate:

- Button
- Card
- Badge
- Tabs
- Table
- Dialog
- Sheet
- Dropdown Menu
- Tooltip
- Alert
- Skeleton
- Progress
- Input
- Textarea
- Select

Use Lucide icons.

Do not overuse cards.

Do not build a generic purple SaaS dashboard.

Design direction:

- modern educational SaaS
- professional
- calm
- restrained
- appropriate for students aged approximately 17–21
- appropriate for adult mentors
- mobile-friendly
- accessible

Avoid:

- childish gamification
- excessive gradients
- glassmorphism
- oversized cards
- decorative animations
- excessive dashboard clutter

---

# Database

Configure PostgreSQL through Docker Compose.

Create a Prisma configuration and initial schema.

Create only the initial identity and assignment models required for future phases.

## User

Suggested fields:

- id
- email
- name
- role
- createdAt
- updatedAt

Role enum:

- STUDENT
- MENTOR
- ADMIN

## StudentProfile

Suggested fields:

- id
- userId
- semester
- active
- createdAt
- updatedAt

## MentorProfile

Suggested fields:

- id
- userId
- active
- createdAt
- updatedAt

## MentorAssignment

Suggested fields:

- id
- studentId
- mentorId
- active
- assignedAt

## Semester

Suggested fields:

- id
- name
- startDate
- endDate
- active

Use appropriate relations, unique constraints and indexes.

Do not create:

- CheckIn
- Observation
- Quest
- MentorConversation

in this phase.

Those belong to later phases.

---

# Seed data

Create deterministic development seed data.

Include:

- 1 admin
- 2 mentors
- 8 students
- student profiles
- mentor profiles
- mentor assignments
- 1 active semester

Use clearly fake development identities.

Seed data must be safe to rerun.

---

# Environment configuration

Create:

- `.env.example`

Document required environment variables.

Do not commit secrets.

Provide sensible local development defaults where appropriate.

---

# Docker Compose

Create Docker Compose configuration for PostgreSQL.

The developer should be able to start the database with a simple command such as:

```bash
docker compose up -d
```

Use a named volume for local database persistence.

---

# Application shell

Create a basic role-oriented application shell.

Routes should include approximately:

- `/`
- `/student`
- `/mentor`
- `/admin`

These routes are placeholders only.

Do not implement real dashboards yet.

Create:

- responsive navigation
- page header
- simple sidebar or mobile navigation
- role-specific navigation structure
- professional empty states

The pages may explain that functionality will be implemented in later phases.

---

# Homepage

Create a minimal development homepage.

It may link to the three role shells for development purposes.

Do not spend significant time building a marketing website.

The core product is the authenticated application.

---

# Testing setup

Configure Vitest.

Create at least one simple unit test proving the test setup works.

Configure Playwright.

Create at least one basic smoke test proving the application can render.

Do not build comprehensive E2E workflows yet.

---

# Scripts

Ensure `package.json` provides clear scripts for at least:

- dev
- build
- lint
- typecheck
- test
- test:e2e
- database migration
- database seed

Names may vary slightly if required by the chosen tooling, but they must be clearly documented.

---

# README

Create a useful `README.md`.

Include:

- product name
- short project description
- prerequisites
- local setup
- environment setup
- Docker commands
- database migration
- database seed
- development start
- testing commands

Keep it concise and practical.

---

# Do not implement in Phase 00

Do NOT implement:

- authentication flows
- weekly check-ins
- onboarding questionnaire
- observations
- trend engine
- mentor conversations
- private notes
- shared agreements
- Quests
- milestones
- attendance
- grades
- AI functionality
- dropout prediction

These belong to later phases.

---

# Validation

Before considering Phase 00 complete:

1. Install dependencies.
2. Start or validate PostgreSQL configuration.
3. Generate Prisma client.
4. Validate Prisma schema.
5. Run migrations if possible in the environment.
6. Run seed if possible.
7. Run lint.
8. Run typecheck.
9. Run unit tests.
10. Run Playwright smoke tests if the environment supports them.
11. Run production build.
12. Fix failures caused by this implementation.

Do not report success if the production build fails.

If an external environment limitation prevents a specific validation step, clearly report the limitation and still complete all other available validation.

---

# Deliverables

At completion report:

## Files created

Summarize the main files and folders created.

## Architecture decisions

Explain important choices briefly.

## Database

Summarize the initial schema.

## Commands

Provide exact commands to:

- start PostgreSQL
- install dependencies
- migrate database
- seed database
- start development server
- run tests
- run production build

## Validation results

Report:

- lint
- typecheck
- unit tests
- Playwright
- production build

## Known limitations

List only actual remaining limitations.

Do not describe features intentionally excluded from Phase 00 as bugs.

---

# Final constraint

Implement the work.

Do not only provide instructions or a proposed file tree.

Do not implement functionality from later phases.