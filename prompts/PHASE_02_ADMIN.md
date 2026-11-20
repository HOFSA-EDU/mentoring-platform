# Phase 02 – Admin Foundation

Read before making changes:

- `AGENTS.md`
- all relevant files under `/docs`
- `prompts/PHASE_02_ADMIN.md`
- the completed Phase 00 and Phase 01 implementation

Inspect the existing Prisma schema, authentication architecture and admin shell before editing.

## Goal

Build the administrative foundation required for the mentoring platform.

The Admin must be able to manage the structural data that later phases depend on.

This phase includes:

- student management
- mentor management
- mentor assignments
- semester management
- check-in question management
- Quest template management

Do NOT implement actual weekly Check-ins, Observations, Mentoring conversations or Quest assignments yet.

---

# Authorization

All Admin functionality must require:

`ADMIN`

Use the centralized authorization helpers created in Phase 01.

Do not duplicate authentication logic.

Every Admin mutation must enforce authorization server-side.

UI hiding is not sufficient.

---

# Admin navigation

Extend the Admin application shell.

Add navigation for:

- Overview
- Students
- Mentors
- Assignments
- Semesters
- Questions
- Quest Templates

Use shadcn/ui and Lucide icons.

Keep the Admin interface operational and compact.

Avoid dashboard clutter.

---

# Admin overview

Create:

`/admin`

Show a simple operational overview.

Suggested metrics:

- active students
- active mentors
- active mentor assignments
- current active semester
- number of active check-in questions
- number of active Quest templates

Do not create charts unless they add real value.

The purpose is orientation, not analytics.

---

# Student management

Create:

`/admin/students`

Admin can:

- list students
- search students
- create student accounts
- edit name
- edit email
- set active/inactive
- assign semester where applicable
- view current mentor assignment

Do not allow public registration.

When creating a student:

- create User
- role must be STUDENT
- create StudentProfile
- securely hash initial password

Use server-side validation.

Validate:

- unique email
- valid email format
- required name
- password policy
- correct role

Do not expose password hashes.

---

# Mentor management

Create:

`/admin/mentors`

Admin can:

- list mentors
- search mentors
- create mentor accounts
- edit name
- edit email
- set active/inactive
- see assigned student count

When creating a mentor:

- create User
- role must be MENTOR
- create MentorProfile
- securely hash initial password

Validate all input server-side.

---

# Account activation

Use the existing `User.active` flag.

Inactive users:

- must not be able to authenticate
- should remain in historical data
- should not be deleted automatically

Prefer deactivation over deletion.

Do not implement hard deletion of users in this phase.

---

# Mentor assignments

Create:

`/admin/assignments`

Admin can:

- view students and their current mentor
- assign mentor
- change mentor
- deactivate an assignment
- create a new active assignment

Important:

A student should have at most one active mentor assignment at a time unless explicitly changed later.

When changing mentors:

1. deactivate the previous active assignment
2. create a new MentorAssignment
3. retain historical assignment records

Do not overwrite assignment history.

Use a transaction.

---

# Semester management

Create:

`/admin/semesters`

Admin can:

- list semesters
- create semester
- edit name
- edit start date
- edit end date
- activate/deactivate semester

Only one semester should normally be marked active.

Enforce this safely.

If activating a new semester:

- deactivate the previously active semester within a transaction

Do not delete historical semesters.

---

# Question domain model

Extend the Prisma schema with the structures required for Check-in questions.

Suggested entities:

## Question

Fields approximately:

- id
- key
- text
- domain
- type
- stable
- active
- sortOrder
- createdAt
- updatedAt

Question domain enum:

- ORGANISATION
- WORK_START
- HELP_SEEKING
- LEARNING_UNDERSTANDING
- PERCEIVED_WORKLOAD
- STUDY_CONFIDENCE

Question type enum may include:

- SINGLE_CHOICE
- SCALE
- BOOLEAN

Do not add free-text questions unless required.

---

# Question options

Create:

## QuestionOption

Suggested fields:

- id
- questionId
- label
- value
- directionValue
- sortOrder

`directionValue` is an internal value later used by the Trend Engine.

Example:

0 = no difficulty  
1 = mild difficulty  
2 = recurring difficulty  
3 = strong difficulty

Important:

These values are internal only.

Never display numeric difficulty scores to students or mentors.

---

# Stable and rotating questions

Questions need a flag:

`stable`

Stable questions are expected to appear regularly and will later support longitudinal trends.

Rotating questions will be selected from the active rotating question pool.

Admin must be able to:

- create
- edit
- activate/deactivate
- reorder
- mark question as stable/rotating

Do not implement weekly question scheduling yet.

That belongs to Phase 03.

---

# Question management UI

Create:

`/admin/questions`

Features:

- list questions
- filter by domain
- filter by active status
- filter by stable/rotating
- create question
- edit question
- manage answer options
- reorder options
- activate/deactivate question

Use dialogs or dedicated forms where appropriate.

Avoid overly complex drag-and-drop unless clearly justified.

Simple numeric `sortOrder` or buttons are acceptable for MVP.

---

# Seed question library

Create realistic development seed questions.

Include at least:

- 3 stable weekly questions
- 2 rotating questions per domain where practical

Stable questions should cover approximately:

- organisation
- work start
- help seeking

Example stable question:

> How often did you start an assignment later than you originally intended this week?

Example:

> When you did not understand something this week, how quickly did you ask for help?

Use clear behaviour-based language.

Avoid:

> How motivated are you?

Avoid psychological labels.

---

# Quest template model

Add:

## QuestTemplate

Suggested fields:

- id
- key
- title
- description
- domain
- active
- defaultDurationDays
- reflectionPrompt
- createdAt
- updatedAt

Quest templates are reusable behavioural experiments.

Do not assign Quests to students yet.

That belongs to Phase 08.

---

# Quest template management

Create:

`/admin/quest-templates`

Admin can:

- list templates
- filter by domain
- create template
- edit template
- activate/deactivate template

Seed at least:

## Early Start

Domain:

WORK_START

Description:

Begin one assignment at least three days before its deadline and work on it for at least 15 minutes.

## Ask Early

Domain:

HELP_SEEKING

Description:

When you notice that you are stuck, ask for help within 24 hours.

## Weekly Map

Domain:

ORGANISATION

Description:

Write down the three most important study tasks for the coming week.

## Break It Down

Domain:

WORK_START

Description:

Choose one larger task and divide it into three smaller first steps.

## Clarify One Thing

Domain:

LEARNING_UNDERSTANDING

Description:

Identify one topic that is unclear and actively clarify it with a teacher, mentor or peer.

---

# Validation

Use Zod for all Admin forms and mutations.

Provide:

- field validation
- useful error messages
- duplicate email errors
- invalid date errors
- invalid domain/type errors

Do not trust client-provided role values.

The server determines allowed roles.

---

# Transactions

Use Prisma transactions for operations that must remain consistent.

Examples:

- create User + StudentProfile
- create User + MentorProfile
- change MentorAssignment
- activate Semester

Avoid partial state.

---

# Audit events

Implement a minimal AuditEvent model if not already present.

Suggested fields:

- id
- actorUserId
- action
- entityType
- entityId
- metadata JSON
- createdAt

Record important Admin actions such as:

- student created
- mentor created
- account activated/deactivated
- mentor assigned
- mentor reassigned
- semester activated
- question created/updated
- Quest template created/updated

Do not build a full audit viewer yet unless trivial.

The architecture should support future review.

---

# UI requirements

Use shadcn/ui.

Prefer:

- Table
- Dialog
- Sheet
- Form
- Input
- Select
- Badge
- Button
- DropdownMenu
- AlertDialog where destructive or state-changing actions require confirmation

Use Lucide icons.

Admin interface should optimize for:

- speed
- clarity
- information density
- accessibility

Avoid unnecessary visual decoration.

---

# Empty states

Create proper empty states for:

- no students
- no mentors
- no assignments
- no semesters
- no questions
- no Quest templates

Empty states should provide a relevant action where appropriate.

---

# Tests

Add unit/integration tests covering at minimum:

## Authorization

- Student cannot access Admin actions
- Mentor cannot access Admin actions
- Admin can access Admin actions

## Student creation

- creates User and StudentProfile
- password is hashed
- duplicate email fails
- invalid data fails

## Mentor creation

- creates User and MentorProfile
- password is hashed

## Mentor assignment

- assignment can be created
- reassignment deactivates previous assignment
- only one active assignment remains

## Semester activation

- activating semester deactivates previous active semester

## Questions

- question can be created
- options are stored correctly
- invalid domain/type rejected

## Quest templates

- template can be created
- invalid domain rejected

---

# Playwright

Add practical Admin E2E coverage.

At minimum:

1. log in as Admin
2. open Students
3. create a test student
4. open Mentors
5. create a mentor
6. assign mentor to student
7. create or edit a Question
8. create or edit a Quest template

Use isolated or deterministic test data.

Avoid tests depending on random production-like state.

---

# Documentation

Update:

- README
- Prisma/domain documentation
- technical architecture documentation

Document:

- Admin routes
- Question model
- Quest template model
- audit event model
- mentor assignment history behaviour

---

# Do not implement in Phase 02

Do NOT implement:

- student onboarding questionnaire
- weekly Check-in submission
- Check-in history
- Trend Engine
- Observations
- mentor conversations
- private mentor notes
- shared agreements
- Quest assignment
- Quest reflection
- notifications
- attendance
- grades
- AI analysis

---

# Validation

Before finishing:

1. run Prisma format
2. validate Prisma schema
3. create/apply migration
4. run deterministic seed
5. verify seed can rerun
6. run lint
7. run typecheck
8. run unit/integration tests
9. run Playwright Admin tests where supported
10. run production build
11. run dependency audit
12. fix failures introduced by this phase

Preserve:

- Vitest `4.1.11`
- Vite `7.3.6`

Do not upgrade them without explicit compatibility validation.

---

# Completion report

When finished report:

## Admin functionality

Summarize implemented areas.

## Database changes

List models/enums/migrations.

## Routes

List Admin routes.

## Seed data

Summarize seeded Questions and Quest templates.

## Tests

Report:

- lint
- typecheck
- unit/integration
- Playwright
- build
- audit

## Known limitations

Only list actual remaining limitations.

Do not list intentionally deferred later-phase functionality as a defect.

---

# Final constraints

Implement the work.

Do not only describe it.

Do not introduce features from later phases.

Preserve the existing authentication and authorization architecture.