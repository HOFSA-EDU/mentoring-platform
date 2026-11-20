# Phase 01 – Authentication and Authorization

Read before making changes:

- `AGENTS.md`
- all relevant files under `/docs`
- `prompts/PHASE_01_AUTH.md`
- the existing Phase 00 implementation

Inspect the current database schema and architecture before editing.

## Goal

Implement secure authentication and server-side role-based authorization using Auth.js.

The platform has three roles:

- STUDENT
- MENTOR
- ADMIN

This phase establishes authentication and authorization only.

Do NOT implement Check-ins, Observations, Mentoring conversations or Quests yet.

---

# Authentication technology

Use:

- Auth.js
- Prisma
- PostgreSQL
- secure password hashing
- server-side session validation

Follow the current recommended Auth.js integration for Next.js App Router.

Prefer server-side `auth()` checks where possible.

Do not rely only on client-side session state for security.

---

# MVP authentication model

Use credentials authentication for the initial MVP.

Users log in using:

- email
- password

Accounts are provisioned by the system/admin.

Do NOT implement:

- public registration
- social login
- Google OAuth
- Microsoft OAuth
- passwordless email
- magic links

These may be added later.

---

# Password security

Never store plain-text passwords.

Use a modern secure password hashing algorithm/library appropriate for the current Node.js environment.

Use a strong one-way password hash.

Password verification must happen server-side.

Never expose password hashes through:

- API responses
- session objects
- client components
- logs

---

# Database changes

Extend the existing User model as required.

The User model should support authentication while retaining:

- id
- email
- name
- role
- createdAt
- updatedAt

Add authentication-related fields only when needed.

If Auth.js requires additional models for the chosen session strategy, implement them cleanly through Prisma.

Prefer the simplest secure architecture.

---

# Seed accounts

Update deterministic development seed data.

Create development users for:

## Admin

Email:

`admin@example.test`

Role:

ADMIN

## Mentor 1

Email:

`mentor1@example.test`

Role:

MENTOR

## Mentor 2

Email:

`mentor2@example.test`

Role:

MENTOR

## Students

Create the existing seeded students with deterministic development credentials.

Use clearly fake `.test` email addresses.

Use a single documented development password if useful for local testing.

The development password must never be treated as a production default.

Document seed credentials clearly in the README development section.

---

# Login page

Create:

`/login`

The login page should include:

- email field
- password field
- submit button
- validation messages
- invalid credential error state
- loading/pending state
- accessible labels

Use shadcn/ui.

Design should remain:

- professional
- minimal
- calm
- appropriate for an educational platform

Do not create a marketing-heavy login screen.

---

# Logout

Implement logout functionality.

A signed-in user must be able to log out from the application shell.

After logout, redirect to `/login`.

---

# Authenticated redirects

Unauthenticated users attempting to access protected application areas must be redirected to `/login`.

Protected areas include:

- `/student`
- `/mentor`
- `/admin`

Authenticated users accessing `/login` should be redirected to their appropriate dashboard.

---

# Role-based routing

After successful login:

STUDENT:

redirect to:

`/student`

MENTOR:

redirect to:

`/mentor`

ADMIN:

redirect to:

`/admin`

---

# Server-side authorization

Create centralized reusable authorization helpers.

Examples may include:

- `requireUser()`
- `requireRole()`
- `requireStudent()`
- `requireMentor()`
- `requireAdmin()`

Names may differ if the architecture suggests better naming.

Authorization logic must not be duplicated across pages.

All protected server actions, route handlers and sensitive data queries must use server-side authorization.

---

# Role isolation

Implement and test:

## Student

A STUDENT:

- can access `/student`
- cannot access `/mentor`
- cannot access `/admin`

## Mentor

A MENTOR:

- can access `/mentor`
- cannot access `/student` as a student user
- cannot access `/admin`

## Admin

An ADMIN:

- can access `/admin`

Admin access to other role interfaces should follow the smallest permission model necessary.

Do not automatically treat ADMIN as every other role unless there is a clear requirement.

---

# Mentor assignment authorization

Prepare a reusable authorization policy for mentor/student access.

A mentor may access student-specific data only when an active MentorAssignment exists between that mentor and student.

The actual student detail functionality belongs to later phases, but the authorization policy should be designed now so later modules can reuse it.

Example conceptual helper:

`assertMentorCanAccessStudent(mentorUserId, studentId)`

Do not implement fake client-side checks.

The database relationship must be verified server-side.

---

# Student ownership authorization

Prepare a reusable policy ensuring a student can only access their own student profile and future student-owned data.

Example concept:

`assertStudentOwnsResource(...)`

The exact implementation should remain simple and reusable.

---

# Session contents

The authenticated session should contain only information required by the application.

Include where appropriate:

- user ID
- name
- email
- role

Do not include:

- password hash
- unnecessary profile data
- private mentoring data

Use proper TypeScript typing for session extensions.

Avoid unsafe casts.

---

# Application shell

Update the application shell to reflect the authenticated user.

Display:

- user name
- role where appropriate
- logout action

Navigation must be role-aware.

STUDENT navigation should not expose Mentor/Admin links.

MENTOR navigation should not expose Student/Admin functionality.

ADMIN navigation should show only relevant administrative navigation.

UI visibility is not security.

All routes must still enforce server-side authorization.

---

# Homepage

Update `/` so that:

Unauthenticated user:

→ redirect to `/login`

Authenticated STUDENT:

→ `/student`

Authenticated MENTOR:

→ `/mentor`

Authenticated ADMIN:

→ `/admin`

Avoid unnecessary landing pages in the MVP.

---

# Error handling

Handle at minimum:

- wrong email
- wrong password
- inactive user if supported
- missing session
- insufficient role
- malformed input

Do not reveal whether a specific email address exists.

For invalid credentials prefer a generic message such as:

> Invalid email or password.

---

# Rate limiting

Do not introduce a large infrastructure dependency solely for rate limiting during this phase.

However:

- structure the authentication code so rate limiting can be added later
- document this as a production hardening item if not implemented

Do not build Redis infrastructure unless clearly necessary.

---

# CSRF and security

Use Auth.js security mechanisms correctly.

Do not implement custom authentication cookies manually unless strictly required.

Use secure cookie/session configuration appropriate to the environment.

Production secrets must come from environment variables.

Add required variables to:

`.env.example`

Never commit real secrets.

---

# Environment

Document Auth.js environment requirements.

Generate or document the need for a secure authentication secret.

Local development setup must remain simple.

---

# Tests

Add tests covering critical authorization behavior.

At minimum verify:

## Authentication

- valid credentials authenticate
- invalid credentials fail
- password hashes are not exposed

## Route protection

- unauthenticated user cannot access Student route
- unauthenticated user cannot access Mentor route
- unauthenticated user cannot access Admin route

## Student

- STUDENT can access Student area
- STUDENT cannot access Mentor area
- STUDENT cannot access Admin area

## Mentor

- MENTOR can access Mentor area
- MENTOR cannot access Admin area

## Admin

- ADMIN can access Admin area

## Mentor assignment

Test the authorization policy:

- assigned mentor → allowed
- unassigned mentor → denied

Do not rely only on E2E tests.

Critical authorization logic should have unit or integration tests.

---

# Playwright

Add or update E2E coverage for:

1. open login page
2. log in as Student
3. Student lands on `/student`
4. logout
5. log in as Mentor
6. Mentor lands on `/mentor`
7. logout
8. log in as Admin
9. Admin lands on `/admin`

Also verify at least one forbidden role route.

---

# Documentation

Update README with:

- authentication setup
- required environment variables
- development login accounts
- development password
- how to reset/reseed the database

Update architecture documentation if authentication introduces architectural decisions.

---

# Do not implement in Phase 01

Do NOT implement:

- self-registration
- password recovery
- email verification
- OAuth
- Microsoft Entra ID
- onboarding questionnaire
- weekly Check-ins
- trends
- observations
- mentoring notes
- Quests
- notifications
- attendance
- grades

---

# Validation

Before finishing:

1. validate Prisma schema
2. run migrations
3. run deterministic seed
4. run lint
5. run typecheck
6. run unit/integration tests
7. run Playwright authentication tests if environment supports them
8. run production build
9. inspect dependency audit
10. fix failures introduced by this phase

Do not upgrade the intentionally pinned Vitest/Vite versions without explicit compatibility validation.

Vitest must remain:

`4.1.11`

Vite must remain:

`7.3.6`

unless explicitly instructed otherwise.

---

# Completion report

When finished report:

## Authentication architecture

Briefly explain:

- Auth.js configuration
- session strategy
- password hashing
- authorization structure

## Database changes

List migrations and model changes.

## Routes

List protected routes and redirect behavior.

## Tests

Report results for:

- lint
- typecheck
- unit/integration
- Playwright
- production build
- dependency audit

## Seed credentials

List development-only login accounts.

## Known limitations

Only list real remaining limitations.

Do not describe intentionally deferred Phase 02+ functionality as a defect.

---

# Final constraints

Implement the work.

Do not only describe it.

Security decisions must be enforced server-side.

Do not implement features from later phases.