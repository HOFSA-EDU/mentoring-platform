# Phase 06 – Observation Engine

Read before making changes:

- `AGENTS.md`
- all relevant files under `/docs`
- the completed Phase 00–05 implementation
- `prompts/PHASE_06_OBSERVATIONS.md`

Inspect:

- CheckIn and CheckInAnswer models
- internal direction metadata
- neutral / uncertain / not-applicable handling
- Phase 04 reflection service
- Phase 05 Mentor dashboard
- active MentorAssignment authorization
- current conversation-request representation

before editing.

## Goal

Implement a formal, deterministic Observation Engine.

The system should identify meaningful patterns in student-reported Check-ins and create explainable Observation records for Mentor use.

This phase converts repeated data patterns into persistent Mentor-facing observations.

Do NOT implement:

- Mentor conversation notes
- shared agreements
- FollowUps
- Quest assignment
- AI interpretation
- dropout prediction

Those belong to later phases.

---

# Core principle

Observations describe evidence.

They do not diagnose students.

Correct:

> The student reported difficulty getting started in three consecutive comparable Check-ins.

Incorrect:

> The student has a procrastination problem.

Correct:

> Asking for help was reported as more difficult across three comparable Check-ins.

Incorrect:

> The student lacks confidence.

---

# Observation model

Add an Observation model.

Suggested fields:

- id
- studentId
- semesterId
- domain
- type
- status
- title
- summary
- firstDetectedAt
- lastDetectedAt
- resolvedAt
- createdAt
- updatedAt

Suggested ObservationType enum:

- REPEATED_DIFFICULTY
- WORSENING_PATTERN
- IMPROVEMENT
- CONVERSATION_REQUEST

Suggested ObservationStatus enum:

- OPEN
- ACKNOWLEDGED
- RESOLVED

Do not use:

- HIGH_RISK
- CRITICAL
- FAILURE_RISK
- DROPOUT_RISK

---

# Observation evidence

Add an ObservationEvidence model.

Suggested fields:

- id
- observationId
- checkInId
- checkInAnswerId
- periodKey
- questionKey
- questionTextSnapshot
- optionLabelSnapshot
- createdAt

Observation evidence must make it possible to answer:

> Why does this Observation exist?

Do not create opaque Observations.

---

# Attention state

Introduce Mentor-facing attention state derived from open Observations and conversation requests.

Suggested states:

- NORMAL
- WATCH
- CONVERSATION

Rules:

## CONVERSATION

Use when:

- latest relevant conversation request is YES
- or there is an explicit open CONVERSATION_REQUEST Observation

## WATCH

Use when:

- at least one open repeated-difficulty or worsening Observation exists

## NORMAL

Use when:

- no current meaningful Observation exists

Do not store numeric priority.

Do not create traffic-light risk scoring.

---

# Observation rule 1 – Repeated difficulty

Create a `REPEATED_DIFFICULTY` Observation when:

- the same development domain contains comparable difficulty evidence
- across at least 3 consecutive relevant weekly Check-ins
- neutral / uncertain / not-applicable responses are excluded

The implementation must be conservative.

Example:

> Getting started has been reported as difficult in three consecutive Check-ins.

Do not trigger from one isolated answer.

---

# Observation rule 2 – Worsening pattern

Create a `WORSENING_PATTERN` Observation when:

- comparable responses across at least 3 relevant Check-ins
- show a consistent movement toward higher reported difficulty

Example:

Week 1:
low difficulty

Week 2:
moderate difficulty

Week 3:
higher difficulty

Observation:

> The student has reported increasing difficulty keeping track of tasks across the last three comparable Check-ins.

Do not trigger from noisy or mixed evidence.

---

# Observation rule 3 – Improvement

Create an `IMPROVEMENT` Observation when:

- a previously difficult or worsening area
- shows consistent improvement across recent comparable Check-ins

Improvement Observations are important.

The system should not only detect problems.

Example:

> The student has reported asking for help earlier across the last three comparable Check-ins.

Positive Observations should remain descriptive.

Do not turn them into achievement scores.

---

# Observation rule 4 – Conversation request

Create or update a `CONVERSATION_REQUEST` Observation when the student selects:

YES

for the Mentor conversation question.

For:

MAYBE

do not create the same Observation type unless the existing product design clearly requires it.

Preferred handling:

- YES → formal CONVERSATION_REQUEST Observation
- MAYBE → soft Mentor dashboard signal, not formal Observation
- NO → no Observation

This preserves the distinction already implemented in Phase 05.

---

# Neutral and uncertain answers

The engine must explicitly ignore responses marked as:

- neutral
- not applicable
- uncertain

Examples:

- `I did not need help this week.`
- `There was no situation like this.`
- `I am not sure.`

These responses must not:

- create difficulty evidence
- improve a trend
- worsen a trend
- reset a streak incorrectly

They may simply be excluded from comparison.

Document the exact behaviour.

---

# Consecutive evidence

Define "consecutive" carefully.

Preferred interpretation:

consecutive comparable Check-ins

rather than:

every calendar week regardless of whether the question appeared.

This is especially important for rotating questions.

For stable questions, calendar-week continuity may naturally exist.

For rotating questions, do not treat the absence of a question as a negative signal.

---

# Domain aggregation

A domain may contain multiple questions.

Avoid naive averaging.

Preferred approach:

- derive evidence from comparable question series
- identify consistent direction
- aggregate only when evidence supports the same interpretation

If evidence inside a domain conflicts:

do not generate a strong Observation.

Prefer no Observation over a misleading one.

---

# Idempotency

Observation evaluation must be idempotent.

Running the engine multiple times with unchanged data must not create duplicate Observations.

Example:

The same repeated difficulty across weeks 4–6 should not create three separate identical Observations every time the dashboard loads.

Use a stable uniqueness strategy or explicit matching logic.

---

# Observation lifecycle

## OPEN

Created when a rule is first satisfied.

## ACKNOWLEDGED

Reserved for Mentor workflow.

The Mentor may mark an Observation acknowledged.

This means:

> I have seen this.

It does NOT mean the issue is resolved.

## RESOLVED

An Observation may become resolved when:

- the Mentor resolves it manually
- or a clearly documented deterministic rule shows the pattern no longer applies

For this phase, prefer conservative lifecycle management.

Manual resolution is acceptable.

Do not automatically resolve important Observations from one good week.

---

# Re-emergence

If a previously RESOLVED pattern returns later:

create or reopen according to the simplest auditable rule.

Preferred MVP behaviour:

create a new Observation if sufficient new evidence exists after resolution.

This preserves history.

---

# Evidence immutability

Observation evidence must reference immutable historical Check-in snapshots.

Do not use current Admin-edited question text to explain an old Observation.

Evidence should remain understandable even if Question or QuestionOption definitions change later.

---

# Observation generation

Implement a reusable domain/application service.

Suggested responsibilities:

1. load Student Check-in history
2. extract comparable evidence
3. exclude neutral/uncertain responses
4. evaluate deterministic rules
5. create/update Observations
6. attach evidence
7. avoid duplicates

Do not place Observation logic in React components.

---

# When the engine runs

For MVP, evaluate Observations:

- after successful weekly Check-in submission

and optionally:

- when Mentor dashboard data is refreshed, if needed as a recovery mechanism

Preferred architecture:

Check-in submitted
→ transaction completes
→ Observation evaluation executes safely

Do not make Check-in submission fail merely because Observation generation encounters a non-critical post-processing error unless atomicity is explicitly required.

Document the chosen consistency model.

---

# Mentor dashboard integration

Update the Phase 05 Mentor dashboard to use formal Observations.

Priority:

1. open conversation request
2. open worsening / repeated-difficulty Observation
3. soft MAYBE signal
4. positive improvement Observation where useful
5. remaining students

Keep Mentor dashboard compact.

Do not show every Observation in the overview.

---

# Mentor student detail

Add an Observations section.

Show:

- status
- type
- domain
- title
- summary
- first detected
- last detected
- evidence
- lifecycle state

Allow Mentor to inspect evidence.

Evidence example:

Week 38:
Question:
`How often did you start an assignment later than you originally intended this week?`

Answer:
`Several times.`

Week 39:
...

Never show internal numeric direction values.

---

# Mentor actions

In this phase, Mentor may:

- acknowledge Observation
- resolve Observation

Do NOT yet create:

- Mentor conversation record
- shared agreement
- FollowUp
- Quest

Those belong to Phase 07 and 08.

---

# Positive Observations

Improvement should be visible but visually less urgent than difficulty Observations.

Do not use the same attention treatment.

Positive Observations can appear in Student detail and optionally as a subtle dashboard note.

Do not allow positive Observations to hide open difficulty Observations.

---

# Student visibility

For MVP, formal Observations are Mentor-facing.

Do not expose Observation records directly to Students.

Students already have the Phase 04 reflection experience.

This separation is intentional:

Student:
reflection

Mentor:
formal Observation

---

# Admin visibility

Admins should not automatically receive unrestricted Observation access.

Do not create an Admin Observation dashboard in this phase.

Preserve least privilege.

---

# Audit

Record important lifecycle events:

- Observation created
- Observation acknowledged
- Observation resolved

Keep audit metadata minimal.

Do not duplicate full answer content in AuditEvent metadata.

---

# Seed data

Update deterministic development seed if useful to demonstrate:

- one student with repeated difficulty
- one student with worsening pattern
- one student with improvement
- one student with YES conversation request
- one student with no current signal

Do not distort normal production seed behaviour.

Test fixtures may be preferable to excessive seed complexity.

---

# Tests

Add comprehensive unit/integration tests.

## Repeated difficulty

- 1 difficult response → no Observation
- 2 difficult comparable responses → no Observation
- 3 consecutive difficult comparable responses → Observation
- neutral response excluded
- unrelated domain does not count

## Worsening pattern

- consistent worsening across 3 comparable answers → Observation
- mixed sequence → no Observation
- neutral answer ignored
- missing rotating question does not break comparison incorrectly

## Improvement

- consistent improvement → improvement Observation
- one good answer after repeated difficulty does not automatically resolve everything

## Conversation request

- YES → formal Observation
- MAYBE → no formal conversation-request Observation
- NO → none

## Idempotency

- running engine twice creates no duplicates
- unchanged evidence updates `lastDetectedAt` safely where intended
- resolved historical Observation does not mutate unexpectedly

## Lifecycle

- Mentor can acknowledge assigned Student Observation
- Mentor can resolve assigned Student Observation
- unassigned Mentor cannot change Observation
- Student cannot modify Observation
- Admin does not implicitly act as Mentor

## Evidence

- evidence points to correct Check-ins
- snapshot question/answer text preserved
- internal direction value not exposed to presenter

## Attention state

- conversation request → CONVERSATION
- repeated difficulty → WATCH
- no open Observation → NORMAL
- positive improvement alone does not escalate attention

---

# Playwright

Add Mentor Observation E2E workflow.

Suggested flow:

1. log in as seeded Mentor
2. open Mentor dashboard
3. see Student with Observation
4. open Student detail
5. open Observation
6. inspect evidence
7. acknowledge Observation
8. verify status
9. resolve Observation
10. verify status
11. attempt Observation access for unassigned Student
12. verify denied

Also verify:

- no numeric risk score appears
- positive improvement is not displayed as a warning

---

# Documentation

Create/update documentation for:

- Observation model
- evidence model
- deterministic rules
- neutral/N/A handling
- idempotency strategy
- lifecycle
- attention-state derivation
- Student reflection vs Mentor Observation separation

Document concrete examples.

---

# Do not implement in Phase 06

Do NOT implement:

- Mentor conversation records
- private Mentor notes
- shared agreements
- FollowUps
- Quest assignment
- Quest reflection
- notifications
- AI analysis
- dropout prediction
- attendance
- grades
- cohort risk analytics

---

# Validation

Before finishing:

1. Prisma format
2. Prisma validation
3. create/apply migration
4. deterministic seed
5. lint
6. strict typecheck
7. unit/integration tests
8. Playwright
9. production build
10. dependency audit
11. verify pinned tooling

Preserve exactly:

- Vitest `4.1.11`
- Vite `7.3.6`

Do not upgrade automatically.

---

# Completion report

Report:

## Observation engine

Explain implemented rules.

## Database

List:

- Observation model
- ObservationEvidence model
- enums
- constraints

## Idempotency

Explain how duplicates are prevented.

## Lifecycle

Explain:

- OPEN
- ACKNOWLEDGED
- RESOLVED

## Mentor integration

Explain how formal Observations changed Phase 05 dashboard behaviour.

## Tests

Report:

- lint
- typecheck
- unit/integration
- Playwright
- build
- audit

## Known limitations

Only actual Phase 06 limitations.

Do not list intentionally deferred later-phase functionality.

---

# Final constraints

Implement the work.

Do not only describe it.

All Observation logic must be deterministic and explainable.

Prefer missing an ambiguous pattern over creating a misleading Observation.

Never create psychological diagnoses, risk probabilities, performance scores or dropout predictions.

Preserve the existing Auth.js, Check-in, Student Reflection and Mentor authorization architecture.