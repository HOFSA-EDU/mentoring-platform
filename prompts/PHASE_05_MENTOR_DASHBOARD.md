# Phase 05 – Mentor Dashboard

Read before making changes:

- `AGENTS.md`
- all relevant files under `/docs`
- the completed Phase 00–04 implementation
- `prompts/PHASE_05_MENTOR_DASHBOARD.md`

Inspect:

- Auth.js authorization
- MentorAssignment policies
- Student Check-ins
- Student reflection logic
- conversation-request representation
- semester model
- existing Mentor shell

before editing.

## Goal

Build the first useful Mentor workspace.

A Mentor should be able to answer quickly:

> Which of my assigned students may need my attention this week, and what changed?

This phase is operational and read-focused.

Do NOT implement formal Observation records yet.

Do NOT implement Mentor conversation documentation, private notes, shared agreements, follow-ups, or Quest assignment yet.

Those belong to later phases.

---

# Core principle

The Mentor dashboard must surface evidence, not diagnoses.

Correct:

> The student reported more difficulty getting started in the last two comparable Check-ins.

Incorrect:

> The student has a motivation problem.

Correct:

> The student selected “Maybe” for a Mentor conversation this week.

Incorrect:

> The student is at risk.

---

# Mentor authorization

All Mentor routes must require:

`MENTOR`

Use the existing centralized Auth.js authorization helpers.

A Mentor may only access students with an active MentorAssignment.

Every student-specific query must verify assignment server-side.

Do not rely on route parameters or hidden navigation.

---

# Mentor routes

Create approximately:

- `/mentor`
- `/mentor/students`
- `/mentor/students/[studentId]`

The exact route structure may vary if the existing architecture suggests a cleaner approach.

---

# Mentor dashboard

The default Mentor dashboard should prioritize action.

Suggested sections:

## 1. Needs attention

Students with:

- explicit `Yes` conversation request
- `Maybe` conversation signal
- recent meaningful negative change
- missing recent Check-in where useful and already supported by existing data

Do not invent risk scores.

## 2. Follow-up later

For now this may remain empty or omitted because formal FollowUp belongs to Phase 07.

Do not create fake follow-up functionality.

## 3. All assigned students

Compact list of every active assigned student.

---

# Student attention categories

For this phase, use simple derived UI categories only.

Suggested categories:

- CONVERSATION_REQUESTED
- MAYBE_CONVERSATION
- RECENT_CHANGE
- NO_CURRENT_SIGNAL

These are NOT database Observation states.

Do not persist them as formal Observations.

They may be computed dynamically.

---

# Priority order

Suggested display priority:

1. explicit `Yes` Mentor conversation request
2. `Maybe` Mentor conversation signal
3. meaningful recent negative student reflection change
4. remaining students

Do not assign numeric priority scores.

Do not rank students publicly.

The ordering exists only to help the Mentor work through their own assigned students.

---

# Mentor dashboard student row/card

For each student show only useful information.

Suggested:

- student name
- latest Check-in period
- Check-in completion state
- conversation request status
- up to one recent change
- last Check-in date
- link to student detail

Avoid:

- giant cards
- excessive metrics
- numerical scores
- all six development areas directly in the main list

The Mentor should be able to scan the page quickly.

---

# Conversation request display

Support the existing three states:

- YES
- MAYBE
- NO

Student-facing wording may differ from Mentor-facing wording.

Mentor UI examples:

YES:

`Would like to talk`

MAYBE:

`May benefit from a check-in`

NO:

Do not show a badge unless useful.

Never reinterpret `Maybe` as a confirmed request.

---

# Recent change

Reuse the existing student reflection logic where technically appropriate.

Do not duplicate direction logic in a separate inconsistent implementation.

Mentor wording may be slightly more operational.

Example:

> Getting started was reported as more difficult in the latest comparable Check-in.

or:

> Asking for help was reported as easier recently.

Surface at most one or two useful changes.

Do not overwhelm the Mentor with every detected movement.

---

# Student list

Create:

`/mentor/students`

Include all currently assigned active students.

Provide:

- search by name
- optional filtering by conversation status
- optional filtering by recent change

Keep filtering simple.

Do not introduce cohort analytics.

---

# Mentor student detail

Create:

`/mentor/students/[studentId]`

The Mentor detail page should include:

## Overview

- student name
- current semester
- onboarding completion state
- latest Check-in
- conversation request state
- semester Journey stage

## Recent changes

Use descriptive reflection summaries.

## Development areas

Show the same six student-friendly areas:

- Keeping track
- Getting started
- Asking for help
- Understanding
- Managing workload
- Taking on challenges

For each area show qualitative recent state only where supported.

Examples:

- Stable
- Improving
- More difficult
- Mixed
- Not enough data

Do not show numeric scores.

## Check-in history

Allow the Mentor to inspect submitted weekly Check-ins.

Use immutable snapshot text.

## Starting point

Show relevant onboarding baseline answers or cautious baseline summary.

Do not turn onboarding into a personality profile.

---

# Check-in history access

Mentors may view historical Check-ins only for actively assigned students.

Use server-side authorization.

The Mentor should see:

- period
- submission date
- questions
- submitted answers
- conversation request state

Never show internal direction values.

---

# Assignment history

For MVP:

A Mentor should only see students currently assigned to them.

Do not automatically expose students from historical inactive assignments.

Historical Mentor access can be defined later if required.

---

# Empty states

Handle:

## Mentor has no assigned students

Show a calm empty state.

## Student has no weekly Check-ins

Explain that no weekly reflection data exists yet.

## Not enough comparable data

Say so explicitly.

Do not fabricate a trend.

---

# Dashboard freshness

The Mentor dashboard should derive state from current stored data.

Do not require manual synchronization.

Do not cache sensitive Mentor/student data in a way that risks stale authorization.

Use the existing Next.js architecture appropriately.

---

# Student privacy

The Mentor may see Check-in responses because mentoring requires them.

However:

- do not expose Admin-only information unnecessarily
- do not expose password/account security data
- do not expose internal numeric difficulty values
- do not expose audit metadata unless required

Show only information relevant to mentoring.

---

# Reuse existing reflection service

Where possible:

Reuse the Phase 04 reflection/domain comparison service.

Do not build a second trend implementation for Mentors.

If Mentor-specific formatting is required:

- reuse the same structured reflection result
- format wording separately

Architecture preference:

raw answers  
→ shared reflection/domain service  
→ structured result  
→ Student presenter / Mentor presenter

---

# Mentor dashboard summary

At the top, optionally show compact counts:

- assigned students
- conversation requests
- maybe conversation
- recent changes

Do not create a performance KPI dashboard.

Keep counts operational.

---

# UI

Use shadcn/ui and Lucide icons.

Mentor UI should feel:

- operational
- calm
- professional
- information-focused
- fast to scan

Prefer:

- compact table/list on desktop
- readable stacked rows/cards on mobile
- subtle badges
- clear hierarchy

Avoid:

- decorative gamification
- large charts
- colorful risk heatmaps
- traffic-light scoring
- giant analytics dashboards

---

# Mobile

Mentors may use laptops more often than students, but mobile must still work.

Test:

- 320 px
- 375 px
- 390 px

No important information should require horizontal scrolling.

---

# Accessibility

Maintain:

- semantic headings
- keyboard navigation
- accessible tables/lists
- visible focus
- sufficient contrast
- no color-only meaning

---

# Tests

Add unit/integration tests covering:

## Authorization

- Mentor can access assigned Student
- Mentor cannot access unassigned Student
- Student cannot access Mentor routes
- Admin does not automatically receive Mentor access unless explicitly allowed
- unauthenticated access rejected

## Dashboard ordering

- YES conversation request appears before MAYBE
- MAYBE appears before ordinary recent change
- students with no signal remain accessible
- no numeric score is required

## Conversation state

- YES handled correctly
- MAYBE handled separately
- NO not elevated

## Reflection reuse

- Mentor recent change uses the same underlying reflection result as Student view
- neutral/N/A responses do not create false negative signals
- mixed data is represented as mixed

## Check-in access

- assigned Mentor can read history
- unassigned Mentor cannot read history
- snapshot text is used

---

# Playwright

Add Mentor E2E coverage.

Suggested flow:

1. log in as seeded Mentor
2. open Mentor dashboard
3. verify only assigned students appear
4. verify conversation request signal
5. open assigned student
6. verify recent changes
7. inspect Check-in history
8. verify historical question/answer snapshots
9. attempt direct URL access to an unassigned student
10. verify access denied
11. verify mobile Mentor layout

Use deterministic test data.

---

# Documentation

Create/update documentation for:

- Mentor dashboard
- Mentor student access
- attention derivation
- conversation request handling
- reuse of student reflection logic
- privacy boundaries
- difference between Phase 05 derived signals and future Phase 06 Observations

---

# Important separation from Phase 06

Phase 05 derives temporary display signals.

Phase 06 will create formal Observation records with:

- evidence
- lifecycle
- deduplication
- attention state

Do not persist Phase 05 signals as Observations.

Do not add Observation database models yet unless they already exist from another reason.

---

# Do not implement in Phase 05

Do NOT implement:

- formal Observations
- Observation lifecycle
- private Mentor notes
- Mentor conversation records
- shared agreements
- FollowUps
- Quest assignment
- Quest reflection
- notifications
- AI analysis
- attendance
- grades
- dropout prediction

---

# Validation

Before finishing:

1. validate Prisma if changed
2. apply migration only if required
3. run deterministic seed
4. run lint
5. run strict typecheck
6. run unit/integration tests
7. run Playwright
8. run production build
9. run dependency audit
10. verify pinned tooling

Preserve exactly:

- Vitest `4.1.11`
- Vite `7.3.6`

Do not upgrade automatically.

---

# Completion report

Report:

## Mentor dashboard

Describe:

- ordering
- signals
- summary information

## Student detail

Describe:

- overview
- recent changes
- development areas
- Check-in history
- onboarding baseline

## Authorization

Explain how assignment-based access is enforced.

## Reflection reuse

Explain how Mentor and Student views share the same underlying comparison logic.

## Tests

Report:

- lint
- typecheck
- unit/integration
- Playwright
- production build
- audit

## Known limitations

Only actual Phase 05 limitations.

Do not list intentionally deferred Phase 06+ functionality as defects.

---

# Final constraints

Implement the work.

Do not only describe it.

Do not create formal Observations yet.

Do not create numeric risk or performance scores.

Preserve the existing Auth.js, Admin, Check-in and Student Reflection architecture.