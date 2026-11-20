# Phase 04 – Student Journey and Reflection Dashboard

Read before making changes:

- `AGENTS.md`
- all relevant files under `/docs`
- the completed Phase 00–03 implementation
- the current question catalogue
- `prompts/PHASE_04_STUDENT_JOURNEY.md`

Inspect the existing Student dashboard, onboarding, weekly Check-ins, Check-in history, semester model, development domains, and authorization architecture before editing.

## Goal

Transform the Student area from a Check-in interface into a useful personal reflection experience.

The student should begin to understand:

- where they are in the semester
- what they have been reporting over time
- what appears stable
- what may be changing
- what they may want to pay attention to

This phase is student-facing only.

Do NOT implement:

- Mentor Observations
- Mentor attention states
- Mentor dashboard analytics
- automatic intervention
- Quest assignment
- Mentor conversations
- AI-generated interpretation

Those belong to later phases.

---

# Core principle

The Student dashboard must help the student recognize patterns without pretending to diagnose them.

The platform should say:

> You reported more difficulty getting started during the last two Check-ins.

It must NOT say:

> You have a procrastination problem.

Use:

- reported behaviour
- recurrence
- comparison
- change over time

Avoid:

- labels
- psychological interpretation
- scores
- grades
- risk language

---

# Student dashboard

Improve:

`/student`

The dashboard should prioritize:

1. current weekly Check-in
2. active reflection / recent change
3. semester journey
4. recent Check-ins
5. development areas
6. mentor contact state where relevant

Do not overload the page.

The Student dashboard should feel:

- calm
- personal
- motivating
- clear
- professional
- appropriate for 17–21 year old students

It should not feel like:

- a teacher dashboard
- an analytics dashboard
- a school administration portal

---

# Semester Journey

Create a visible semester journey.

Use conceptual stages such as:

1. START
2. ORIENTATION
3. ROUTINE
4. INDEPENDENCE
5. REFLECTION

The stage should primarily depend on semester progress / study week.

Do not infer stage from student performance.

Example:

Weeks 1–2:

START

Weeks 3–5:

ORIENTATION

Weeks 6–10:

ROUTINE

Later weeks:

INDEPENDENCE

Final period:

REFLECTION

The exact mapping may adapt to semester length.

Use proportional semester progress where practical rather than hard-coding one exact semester length.

The Journey is a framing mechanism, not an achievement score.

---

# Journey UI

Show:

- current stage
- semester progress
- short explanation of the current stage

Example:

## ROUTINE

> You are now several weeks into the semester. This is a good moment to notice which habits are helping and which situations still require more effort.

Avoid:

- XP
- levels
- coins
- rankings

Use subtle progress visualization.

Use shadcn/ui and Lucide icons.

---

# Development areas

Represent the six existing development domains in student-friendly language.

Internal domain:

`ORGANISATION`

Display:

`Keeping track`

Internal:

`WORK_START`

Display:

`Getting started`

Internal:

`HELP_SEEKING`

Display:

`Asking for help`

Internal:

`LEARNING_UNDERSTANDING`

Display:

`Understanding`

Internal:

`PERCEIVED_WORKLOAD`

Display:

`Managing workload`

Internal:

`STUDY_CONFIDENCE`

Display:

`Taking on challenges`

Do not expose enum names to students.

---

# Personal reflection view

Create a reflection section that summarizes recent student-reported patterns.

This must use deterministic rules only.

Do not use AI.

Do not create Mentor Observations.

This is student-facing reflection only.

Possible categories:

- STABLE
- IMPROVING
- MORE_DIFFICULT
- NOT_ENOUGH_DATA

Do not call them scores.

---

# Minimum evidence

Do not make trend statements from one answer.

Suggested rules:

## NOT_ENOUGH_DATA

Fewer than 2 comparable weekly answers.

## STABLE

Two or more comparable recent answers without meaningful directional change.

## IMPROVING

Recent comparable answers move toward lower reported difficulty.

## MORE_DIFFICULT

Recent comparable answers move toward higher reported difficulty.

Keep the first version simple.

Do not create a sophisticated statistical model.

---

# Student-facing wording

Examples:

## Stable

> Your recent Check-ins suggest that keeping track of your tasks has been fairly consistent.

## Improving

> In your recent Check-ins, you reported that asking for help has become easier.

## More difficult

> In your recent Check-ins, you reported more difficulty getting started with tasks.

## Not enough data

> Keep completing your weekly Check-ins. After a few weeks, you will be able to see how this area develops.

Always frame these as reported patterns.

Never state them as personality traits.

---

# Neutral / N/A answers

The question catalogue contains answers that may be:

- neutral
- not applicable
- uncertain

Examples:

- `I did not need help this week.`
- `There was no situation like this.`
- `I am not sure.`

These answers must not be treated as difficulty.

Exclude them from directional trend comparison where appropriate.

Do not artificially convert them into positive or negative outcomes.

---

# Domain reflection aggregation

Each domain may contain multiple questions.

Do not create a numerical domain score.

Instead:

1. collect recent comparable responses
2. identify whether the direction is broadly stable, improving or becoming more difficult
3. generate a short factual reflection

If evidence conflicts:

return something like:

> Your recent answers in this area are mixed. Keep checking in to see whether a clearer pattern develops.

Do not average everything into a percentage.

---

# Recent change section

Create a small section such as:

## What changed recently?

Show at most 2 useful items.

Examples:

> Getting started felt easier this week than in your previous Check-in.

> You reported asking for help later than usual this week.

If nothing meaningful changed:

> No major change stands out from your recent Check-ins.

Do not invent a reflection merely to fill the interface.

---

# Weekly comparison

For comparable stable questions, allow a simple comparison between:

- current Check-in
- previous Check-in

Example:

Getting started:

Previous week:
`Several times`

This week:
`Once`

Student-facing summary:

> You reported fewer delayed starts this week.

Do not show internal direction values.

---

# Check-in history improvement

Improve:

`/student/check-ins`

The history should remain chronological but become easier to understand.

Each entry may show:

- period
- date
- completion state
- mentor conversation request state
- short summary

Avoid showing all questions expanded by default if it becomes visually heavy.

Use an expandable/detail pattern.

---

# Check-in detail

Improve:

`/student/check-ins/[checkInId]`

Show:

- question
- submitted answer
- category/domain display name
- submission date
- conversation request

Use historical snapshots.

Never substitute current Question text for historical Question text.

---

# Onboarding baseline

Surface the existing onboarding reflection in a useful but subtle way.

Possible section:

## Your starting point

Example:

> At the beginning of the semester, you reported that you usually try to solve difficulties independently before asking for help.

Then, if enough weekly data exists, optionally compare:

> More recently, you have reported asking for help earlier.

Only make this comparison when the data actually supports it.

Do not generate personality labels.

---

# Check-in streak

A personal Check-in streak may be shown.

Example:

`4 weekly Check-ins completed`

This is allowed as light gamification.

Rules:

- do not compare students
- do not create public ranking
- do not punish the student visually for breaking a streak
- do not make streaks the primary success metric

The purpose is continuity, not pressure.

---

# Milestones

Introduce very subtle personal milestones.

Possible milestones:

- First Check-in completed
- 4 weekly Check-ins completed
- First mentor conversation request
- Completed onboarding

Do not implement badge collections.

Do not create currencies or XP.

Milestones should appear as small acknowledgements only.

---

# Empty states

Handle gracefully:

## Before onboarding

Direct the student to onboarding.

## After onboarding but before first weekly Check-in

Explain that weekly reflections will build over time.

## One weekly Check-in

Explain that more data is needed for comparison.

## No meaningful trend

Do not fabricate one.

---

# Mobile UX

Student use is expected to be heavily mobile.

Ensure:

- important actions appear high on the page
- cards do not become excessively tall
- horizontal scrolling is avoided
- tap targets are large enough
- progress displays remain readable
- domain labels remain understandable on smaller screens

Test common mobile viewport sizes.

---

# Accessibility

Maintain:

- keyboard navigation
- semantic headings
- accessible progress indicators
- screen-reader labels
- sufficient contrast
- no meaning communicated by color alone

---

# Architecture

Create a reusable student reflection service.

Suggested responsibility:

- retrieve historical answers
- group comparable answers
- handle neutral/N/A responses
- determine simple reflection direction
- generate structured reflection result

Keep wording/template generation separate from raw data queries where reasonable.

Do not put trend calculation logic directly in React components.

---

# Important separation from Phase 06

Phase 04 student reflections and Phase 06 system Observations are not the same thing.

Phase 04:

- for the student
- low-stakes
- reflective
- descriptive

Phase 06:

- for mentor workflow
- explicit evidence
- observation lifecycle
- attention state

Do not create Observation database rows in Phase 04.

---

# Tests

Add tests covering:

## Semester Journey

- correct stage near semester start
- correct stage around middle
- correct stage near end
- handles different semester lengths
- handles dates outside semester safely

## Student reflections

- fewer than 2 responses → NOT_ENOUGH_DATA
- unchanged responses → STABLE
- lower difficulty → IMPROVING
- higher difficulty → MORE_DIFFICULT
- neutral/N/A excluded
- uncertain answers do not create false trend
- mixed evidence handled safely

## Authorization

- Student can only view own reflection
- Student A cannot retrieve Student B reflection
- unauthenticated access rejected

## Historical integrity

- Check-in detail uses snapshot text
- Admin edits do not alter historical display

## Streak

- correct consecutive Check-in count
- missing week does not crash calculation
- no competitive information is produced

---

# Playwright

Add Student Journey E2E coverage.

Suggested workflow:

1. log in as seeded student
2. open Student dashboard
3. verify current semester Journey
4. verify recent Check-in section
5. verify development area reflection
6. open Check-in history
7. open historical Check-in detail
8. verify snapshot question/answer content
9. verify responsive Student dashboard at mobile viewport

Use deterministic seeded data or test-created Check-ins.

---

# Documentation

Create or update documentation describing:

- semester Journey
- student reflection logic
- domain display labels
- neutral/N/A handling
- milestone logic
- Check-in streak
- separation between student reflection and future Mentor Observations

---

# Do not implement in Phase 04

Do NOT implement:

- Mentor dashboard
- Mentor Observations
- attention states
- Mentor conversations
- private Mentor notes
- shared agreements
- Quest assignment
- Quest reflection
- notifications
- AI analysis
- attendance
- grades
- competitive gamification

---

# Validation

Before finishing:

1. validate Prisma if changed
2. apply migrations only if required
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

Do not upgrade these automatically.

---

# Completion report

Report:

## Student dashboard

Describe the new dashboard structure.

## Semester Journey

Explain how stages are calculated.

## Reflection logic

Explain:

- comparable responses
- neutral/N/A handling
- trend direction
- mixed evidence

## Gamification

List implemented:

- streaks
- milestones
- Journey

## Tests

Report:

- lint
- typecheck
- unit/integration
- Playwright
- production build
- audit

## Known limitations

Only actual Phase 04 limitations.

Do not list features intentionally belonging to later phases.

---

# Final constraints

Implement the work.

Do not only describe it.

Do not create Mentor Observations.

Do not create psychological or performance scores.

Preserve the existing Auth.js, Admin and Check-in architecture.

Keep student-facing language concrete, cautious and non-judgmental.