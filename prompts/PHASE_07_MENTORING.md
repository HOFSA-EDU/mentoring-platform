# Phase 07 – Mentoring Conversations and Follow-up

Read before making changes:

- `AGENTS.md`
- all relevant files under `/docs`
- the completed Phase 00–06 implementation
- `prompts/PHASE_07_MENTORING.md`

Inspect before editing:

- Auth.js authorization
- active MentorAssignment authorization
- Observation lifecycle
- Observation evidence
- Mentor student detail
- Student reflection architecture
- conversation request states
- AuditEvent architecture

## Goal

Implement the human mentoring workflow that follows from an Observation or Mentor interaction.

The system must allow a Mentor to:

1. start or record a mentoring conversation
2. connect it to relevant Observations
3. write a private Mentor note
4. create a shared agreement visible to the Student
5. define an optional follow-up
6. review previous mentoring interactions

This phase closes the first full mentoring loop.

Do NOT implement Quest assignment yet.

Quest assignment belongs to Phase 08.

---

# Core principle

The platform supports mentoring.

It does not replace the Mentor.

A conversation record should capture:

- what was discussed
- what the Mentor needs to remember
- what Student and Mentor agreed to
- what should be revisited later

Do not turn mentoring conversations into psychological case files.

Collect only information necessary for educational mentoring.

---

# Mentoring conversation model

Add a `MentoringConversation` model.

Suggested fields:

- id
- studentId
- mentorId
- semesterId
- occurredAt
- topic
- privateNote
- sharedAgreement
- createdAt
- updatedAt

Optional:

- sourceConversationRequestState
- createdByUserId

Keep the model simple.

---

# Observation links

A MentoringConversation may relate to one or more Observations.

Prefer a join model such as:

`MentoringConversationObservation`

Suggested fields:

- conversationId
- observationId

This preserves history and supports multiple relevant observations.

Do not copy full Observation data into the conversation.

---

# Private Mentor note

`privateNote` is visible only to the Mentor who currently has legitimate access according to the defined policy.

Student must NEVER see private Mentor notes.

Examples of appropriate content:

> Student explained that larger assignments feel unclear at the beginning. We discussed breaking the first step down.

Avoid encouraging unnecessary sensitive detail.

The UI should clearly label this field:

`Private mentor note`

and explain:

> Only mentors with authorized access can see this note.

---

# Shared agreement

`sharedAgreement` is visible to both Mentor and Student.

This is the most important output of a mentoring conversation.

Example:

> Before next Friday, identify one upcoming assignment and decide on the first concrete step within 24 hours.

Shared agreements should be:

- concrete
- concise
- action-oriented where appropriate
- understandable to the Student

Do not require every conversation to have a shared agreement, but strongly support it in the UI.

---

# Privacy separation

Private note and shared agreement must be technically and visually separated.

Never reuse one field for both.

Do not accidentally return `privateNote` through Student-facing queries.

Create dedicated Student-facing DTOs/presenters if necessary.

Add explicit tests proving private notes cannot leak to Students.

---

# Mentor conversation workflow

From:

`/mentor/students/[studentId]`

add an action such as:

`Record conversation`

The form should support:

- conversation date/time
- topic
- linked Observations
- private Mentor note
- shared agreement
- optional follow-up date

Keep the workflow focused.

Do not create a complex CRM-like form.

---

# Topic

Provide either:

- simple free text
or
- a small optional category + free text

Preferred MVP:

simple concise free text.

Example:

`Getting started with larger assignments`

Do not create an excessive taxonomy.

---

# Conversation date

Default to now.

Allow Mentor to record a recently completed conversation retrospectively.

Validate that dates are reasonable.

Do not allow absurd future dates unless explicitly used for scheduling.

The conversation record represents an interaction that occurred, not a future appointment.

---

# Follow-up model

Add a `FollowUp` model.

Suggested fields:

- id
- studentId
- mentorId
- conversationId
- dueAt
- status
- note
- completedAt
- createdAt
- updatedAt

Suggested enum:

- OPEN
- COMPLETED
- CANCELLED

A FollowUp is an internal Mentor reminder.

Example:

> Check whether the agreed early-start strategy helped.

FollowUps are not calendar events.

Do not implement Google/Microsoft calendar integration.

---

# Follow-up authorization

Only authorized Mentors may:

- create
- view
- complete
- cancel

FollowUps for their assigned Students.

Do not expose private FollowUp notes to Students.

---

# Shared Student action

If a FollowUp is associated with a shared agreement:

Student may see the shared agreement.

Student should NOT see:

- internal Mentor follow-up note
- private due-date rationale
- private Mentor notes

Keep the access boundary explicit.

---

# Student view

Update the Student dashboard or create a small section:

## Agreements with your Mentor

Show recent shared agreements.

Suggested information:

- agreement text
- conversation date

Optionally:

- follow-up date if explicitly intended for Student visibility

Prefer not to expose Mentor-internal follow-up metadata by default.

---

# Student mentoring history

Create if appropriate:

`/student/mentoring`

Show only Student-safe data:

- conversation date
- topic if suitable
- shared agreement

Do NOT show:

- privateNote
- Mentor-only FollowUp note
- internal Observation records unless already part of Student reflection

Keep Student formal Observation separation intact.

---

# Mentor student detail integration

Update:

`/mentor/students/[studentId]`

Add sections/tabs approximately:

- Overview
- Observations
- Check-ins
- Mentoring
- later: Quests

Mentoring section should show:

- conversations
- topic
- date
- shared agreement
- private note
- linked Observations
- follow-up status

Newest first.

---

# Observation workflow integration

A Mentor can begin a conversation from an Observation.

Example:

Observation detail:

`Record conversation`

When opened:

- Student preselected
- Observation prelinked

After conversation recording:

do NOT automatically resolve the Observation unless explicitly requested.

Talking about something does not necessarily mean it is resolved.

Optionally allow:

- acknowledge linked Observation

but keep resolution a deliberate Mentor action.

---

# Conversation request integration

If the Student has a current YES conversation request:

When a MentoringConversation is recorded after that request:

the system may mark the associated conversation-request Observation as ACKNOWLEDGED or RESOLVED according to a clear rule.

Preferred MVP:

- recording a conversation linked to a conversation-request Observation resolves that request Observation

Reason:

the requested conversation has occurred.

Do not automatically resolve unrelated difficulty Observations.

Document this special-case behaviour.

---

# Follow-up dashboard

Update Mentor dashboard with:

## Due follow-ups

Show FollowUps that are:

- OPEN
- due soon
- overdue

Suggested priority:

1. overdue FollowUps
2. conversation requests
3. due-soon FollowUps
4. difficulty Observations
5. MAYBE signals
6. remaining Students

Do not use numeric priority scores.

Keep ordering deterministic.

---

# Follow-up time windows

Use explicit human-readable states:

- Overdue
- Due today
- Due soon
- Later

Suggested MVP definition:

Due soon:

within the next 7 days

Do not create elaborate reminder scheduling.

---

# Complete follow-up

Mentor may mark FollowUp:

`COMPLETED`

Optionally record a short completion note.

Do not require a new MentoringConversation for every FollowUp completion.

However, if a substantive conversation occurred, encourage recording it separately.

---

# Cancel follow-up

Allow Mentor to cancel an irrelevant FollowUp.

Require no destructive deletion.

Preserve historical record with:

`CANCELLED`

---

# Editing conversations

Be conservative.

Preferred MVP:

Allow editing shortly after creation or allow correction with updated timestamps.

Do not silently rewrite historical mentoring records without traceability.

If editing is implemented:

- audit it
- preserve updatedAt

Do not implement hard deletion.

---

# Audit events

Record:

- mentoring conversation created
- mentoring conversation updated where supported
- shared agreement created/updated
- FollowUp created
- FollowUp completed
- FollowUp cancelled

Do not duplicate private note content into audit metadata.

Audit metadata should contain identifiers and minimal operational context.

---

# Data minimization

Do not create fields for:

- medical diagnosis
- mental health diagnosis
- family situation
- disciplinary profiling
- personality labels

Mentors can technically enter free text, but UI language should encourage concise educationally relevant notes.

Add helper text such as:

> Keep notes relevant to study support and avoid unnecessary sensitive personal information.

---

# Authorization

Critical tests:

Mentor A:

- can create conversation for assigned Student
- cannot create conversation for unassigned Student
- can view own authorized conversations

Student:

- can see shared agreement
- cannot see private note
- cannot see Mentor-only FollowUp note
- cannot create Mentor conversations

Admin:

- does not automatically receive private Mentor note access unless explicitly allowed by existing policy

Unauthenticated:

- no access

---

# Historical Mentor access

Preserve the existing Phase 05 policy:

inactive historical MentorAssignments do not automatically grant current access.

Do not weaken authorization to make old conversations easier to retrieve.

If current policy means previous Mentor loses access after reassignment, keep it consistent and document it.

---

# Transactions

Use transactions where an operation includes coupled writes.

Example:

Create conversation
+ link Observations
+ create FollowUp
+ optional conversation-request Observation resolution
+ AuditEvents

Avoid partial state.

---

# UI

Use shadcn/ui and Lucide icons.

Suggested components:

- Dialog or Sheet for concise conversation recording
- Textarea
- Input
- Calendar/date controls using existing safe components
- Badge
- Tabs
- Alert
- Checkbox for Observation linking

Do not over-design.

Mentor workflows should be fast.

---

# Student UI

Shared agreements should not look like warnings.

Use calm presentation.

Example:

## Agreed with your Mentor

> Start one upcoming assignment by completing the first step before Friday.

Conversation:
`17 Sep 2026`

Do not expose system complexity.

---

# Empty states

Mentor:

> No mentoring conversations recorded yet.

Student:

> No shared agreements yet.

FollowUp:

> No open follow-ups.

Do not imply a problem where none exists.

---

# Tests

Add unit/integration tests covering:

## Conversation creation

- assigned Mentor can create
- unassigned Mentor denied
- Student denied
- topic validation
- private and shared fields stored separately
- linked Observations stored

## Privacy

- Student DTO excludes privateNote
- Student DTO excludes internal FollowUp note
- Student cannot retrieve private endpoint directly
- reassigned/unassigned Mentor denied

## Conversation request

- linked YES conversation-request Observation resolves when conversation recorded
- unrelated Observations remain OPEN/ACKNOWLEDGED as appropriate
- MAYBE signal is not falsely resolved as formal Observation

## FollowUps

- FollowUp created atomically
- OPEN → COMPLETED works
- OPEN → CANCELLED works
- completed/cancelled record retained
- unassigned Mentor denied

## Dashboard ordering

- overdue FollowUp prioritized
- conversation request prioritized appropriately
- due-soon FollowUp appears
- difficulty Observation remains visible

## Audit

- conversation creation audited
- FollowUp completion audited
- private note content not copied into audit metadata

---

# Playwright

Add practical E2E workflow.

Suggested:

1. log in as Mentor
2. open assigned Student
3. open an Observation
4. record Mentoring conversation
5. enter private note
6. enter shared agreement
7. create FollowUp
8. verify conversation appears in Mentor history
9. verify FollowUp appears on dashboard
10. log out
11. log in as Student
12. verify shared agreement visible
13. verify private note not visible
14. verify internal FollowUp note not visible
15. log back in as Mentor
16. complete FollowUp
17. verify status update

Also test direct access attempts for unassigned Mentor.

---

# Documentation

Create/update documentation covering:

- MentoringConversation model
- private note vs shared agreement
- FollowUp model
- privacy boundaries
- Observation linkage
- conversation-request Observation resolution
- dashboard ordering
- historical access policy

---

# Do not implement in Phase 07

Do NOT implement:

- Quest assignment
- Quest reflection
- automated Quest recommendation
- notifications
- email reminders
- calendar integration
- AI summaries
- AI mentoring
- attendance
- grades
- dropout prediction

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

## Mentoring workflow

Explain:

Observation
→ Conversation
→ Private Note / Shared Agreement
→ FollowUp

## Database

List:

- MentoringConversation
- conversation/Observation relation
- FollowUp
- enums
- constraints

## Privacy

Explain how Student-facing data excludes Mentor-private content.

## Observation integration

Explain how conversation requests and difficulty Observations behave after a conversation.

## Mentor dashboard

Explain FollowUp ordering.

## Tests

Report:

- lint
- typecheck
- unit/integration
- Playwright
- production build
- audit

## Known limitations

Only actual Phase 07 limitations.

Do not list intentionally deferred Phase 08+ functionality as a defect.

---

# Final constraints

Implement the work.

Do not only describe it.

Private Mentor notes must never leak into Student-facing queries or UI.

Recording a conversation must not automatically imply that unrelated difficulty Observations are resolved.

Preserve the existing Auth.js, Check-in, Reflection, Observation and assignment-based authorization architecture.