# Phase 08 – Quest Assignment and Reflection

Read before making changes:

- `AGENTS.md`
- all relevant files under `/docs`
- the completed Phase 00–07 implementation
- `prompts/PHASE_08_QUESTS.md`

Inspect before editing:

- QuestTemplate model from Phase 02
- SharedAgreement model from Phase 07
- MentoringConversation model
- FollowUp model
- Observation model
- Student dashboard
- Mentor student detail
- assignment-based authorization

## Goal

Implement Quests as small behavioural experiments that connect mentoring conversations to concrete action.

A Quest should allow:

1. Mentor assigns a small action to an assigned Student
2. Student sees the Quest
3. Student tries it
4. Student reflects on the experience
5. Mentor can review the outcome

Quests are not homework.

They are practical experiments intended to help a Student test a strategy.

---

# Core principle

A Quest must be:

- small
- concrete
- achievable
- behaviour-based
- time-limited
- easy to reflect on

Good Quest:

> Choose one assignment and work on it for at least 15 minutes three days before the deadline.

Bad Quest:

> Improve your time management.

Bad Quest:

> Become more motivated.

Avoid vague personal-development language.

---

# Quest assignment model

Add a `QuestAssignment` model.

Suggested fields:

- id
- studentId
- mentorId
- semesterId
- questTemplateId nullable
- mentoringConversationId nullable
- sharedAgreementId nullable
- title
- description
- domain
- assignedAt
- dueAt
- status
- completedAt nullable
- cancelledAt nullable
- createdAt
- updatedAt

Suggested status enum:

- ACTIVE
- COMPLETED
- CANCELLED

Do not use:

- FAILED
- MISSED
- UNSUCCESSFUL

A Quest is an experiment, not a pass/fail task.

---

# Quest reflection model

Add `QuestReflection`.

Suggested fields:

- id
- questAssignmentId
- attempted
- helpful
- reflectionText nullable
- submittedAt
- createdAt

Suggested enums:

## QuestAttempt

- YES
- PARTLY
- NO

## QuestHelpfulness

- YES
- A_LITTLE
- NO
- NOT_SURE

Keep reflection lightweight.

---

# Assignment source

A Quest may come from:

1. a QuestTemplate
2. a customized Quest based on a template
3. a custom Mentor-created Quest

The Mentor should not be forced to use templates.

Templates should make common interventions faster.

---

# Mentor workflow

From:

`/mentor/students/[studentId]`

and preferably from a recorded mentoring conversation:

Allow:

`Assign Quest`

Mentor can:

- choose QuestTemplate
- customize title
- customize description
- set due date
- optionally link to MentoringConversation
- optionally link to SharedAgreement

Keep the form simple.

---

# Template behavior

When selecting a QuestTemplate:

pre-fill:

- title
- description
- domain
- default duration

Mentor may edit:

- title
- description
- due date

Do not modify the original template.

The assignment must store its own snapshot/copy of Quest wording.

Historical Quest wording must not change if Admin later edits a template.

---

# Seed templates

Preserve and use existing templates:

## Early Start

Domain:

WORK_START

Description:

> Begin one assignment at least three days before its deadline and work on it for at least 15 minutes.

## Ask Early

Domain:

HELP_SEEKING

Description:

> When you notice that you are stuck, ask for help within 24 hours.

## Weekly Map

Domain:

ORGANISATION

Description:

> Write down the three most important study tasks for the coming week.

## Break It Down

Domain:

WORK_START

Description:

> Choose one larger task and divide it into three smaller first steps.

## Clarify One Thing

Domain:

LEARNING_UNDERSTANDING

Description:

> Identify one topic that is unclear and actively clarify it with a teacher, mentor or classmate.

---

# Student Quest dashboard

Update `/student`.

Active Quest should appear high on the dashboard.

Priority order should remain sensible:

1. Weekly Check-in
2. Active Quest
3. recent reflection
4. Journey
5. shared Mentor agreement
6. history

Do not let Quests dominate the whole Student experience.

---

# Student Quest page

Create approximately:

`/student/quests`

and:

`/student/quests/[questId]`

Show:

- title
- description
- domain display name
- assigned date
- due date
- current status
- linked shared agreement if appropriate

Do not show:

- private Mentor notes
- internal Observation data
- Mentor-only FollowUps

---

# Student reflection

When the Student is ready, allow them to reflect.

Questions:

## Did you try it?

- Yes
- Partly
- No

## Did it help?

- Yes
- A little
- No
- Not sure

## What did you notice?

Optional free text.

Keep the form short.

---

# Reflection tone

Student must not feel punished for selecting:

`No`

or:

`Partly`

Use wording such as:

> This is not a test. The goal is to find out what works for you.

Do not use completion grades.

---

# Quest completion

A Quest becomes `COMPLETED` when a valid reflection is submitted.

Completion does not mean the strategy succeeded.

Examples:

Attempted = NO
Helpful = NOT_SURE

The Quest may still be completed because reflection occurred.

This distinction is important.

---

# Cancelled Quests

Mentor may cancel an ACTIVE Quest.

Use:

`CANCELLED`

Do not delete the record.

Student should clearly see that the Quest is no longer active.

---

# Overdue Quests

If due date has passed and the Quest remains ACTIVE:

display:

`Overdue`

This is a display state, not a failure status.

Do not automatically mark it failed.

Do not penalize the Student.

---

# Multiple active Quests

For MVP, limit complexity.

Preferred rule:

Allow at most 2 ACTIVE Quests per Student.

If attempting to assign more:

show a clear Mentor message such as:

> This Student already has two active Quests. Complete or cancel one before assigning another.

Enforce server-side.

Use a transaction where required.

---

# Quest and Shared Agreement

If a Quest is linked to a SharedAgreement:

Student may see both.

Example:

Shared agreement:

> Start one upcoming assignment earlier this week.

Quest:

> Early Start

This helps connect conversation to action.

Do not expose unrelated Mentor details.

---

# Mentor Quest view

Update Mentor Student detail with a `Quests` section/tab.

Show:

- ACTIVE
- COMPLETED
- CANCELLED

For each Quest:

- title
- domain
- assigned date
- due date
- status
- Student reflection when available

Do not display internal scoring.

---

# Mentor review

When reflection exists, show:

Attempted:

`Yes / Partly / No`

Helpful:

`Yes / A little / No / Not sure`

Student reflection:

free text if submitted

This should create a conversation starter.

Do not automatically generate psychological interpretation.

---

# Quest outcome

Do not automatically modify Observation status based only on Quest reflection.

Example:

Quest helped = YES

does not automatically resolve:

`WORSENING_PATTERN`

Observation lifecycle remains Mentor-controlled.

Future phases may connect these systems more deeply.

---

# Student history

Completed and cancelled Quests remain visible.

Suggested sections:

- Active
- Completed
- Cancelled

Student should be able to look back and see:

> What did I try, and what helped?

This is part of reflection.

---

# Light gamification

Quest completion can create a subtle milestone.

Examples:

- First Quest completed
- 3 Quests reflected on

Do not add:

- XP
- coins
- ranking
- competitive badges

Milestone means:

reflection completed

not:

Quest succeeded.

---

# Privacy

Student can access only their own Quests.

Mentor can access Quests only for actively assigned Students.

Admin should not automatically gain Mentor-level Quest reflection access unless required by existing Admin policy.

No Quest may leak:

- private Mentor notes
- private FollowUp notes
- unrelated Observations

---

# Authorization

Server-side checks required for every:

- Quest assignment
- Quest cancellation
- Student Quest fetch
- Student reflection submission
- Mentor review

Do not rely on hidden UI.

---

# Transactions

Use transactions for:

## Quest assignment

- validate active MentorAssignment
- validate active Quest count
- create QuestAssignment
- link optional conversation/agreement
- audit event

## Quest reflection

- validate Student ownership
- validate Quest ACTIVE
- create reflection
- set Quest COMPLETED
- audit event

Prevent duplicate reflection submission.

---

# Concurrency

Prevent:

- double reflection submission
- exceeding active Quest limit through simultaneous assignments
- Mentor assigning Quest to unassigned Student

Use database constraints and/or serializable transaction patterns as appropriate.

---

# Audit

Record:

- Quest assigned
- Quest cancelled
- Quest reflection submitted
- Quest completed

Do not copy Student reflection text into audit metadata.

Keep audit metadata minimal.

---

# Empty states

Student:

> No active Quests right now.

Mentor:

> No Quests assigned yet.

History:

> No completed Quests yet.

Do not imply a problem.

---

# UI

Use shadcn/ui and Lucide icons.

Student Quest UI should feel:

- lightweight
- clear
- practical
- encouraging without being childish

Mentor Quest UI should be:

- fast
- operational
- compact

Avoid:

- game fantasy styling
- large celebratory animations
- excessive badge design

---

# Mobile

Student Quest workflow must work particularly well on mobile.

Test:

- 320 px
- 375 px
- 390 px

Quest reflection should be easy to complete with one hand.

---

# Accessibility

Maintain:

- proper form labels
- keyboard support
- screen-reader semantics
- visible focus
- sufficient contrast
- non-color-only status indicators

---

# Tests

Add unit/integration tests.

## Assignment

- assigned Mentor can assign Quest
- unassigned Mentor denied
- Student cannot assign Quest
- template data copied to assignment
- later template edit does not alter assignment
- custom Quest works
- active Quest limit enforced

## Reflection

- Student owner can submit reflection
- other Student denied
- Mentor cannot submit Student reflection
- duplicate reflection rejected
- Quest becomes COMPLETED
- `NO` attempt still allows completion
- reflection text optional

## Cancellation

- assigned Mentor can cancel ACTIVE Quest
- completed Quest cannot be cancelled incorrectly
- cancelled record retained

## Privacy

- Student query excludes private Mentor data
- Mentor query includes only permitted Quest data
- reassigned Mentor loses access

## Observation separation

- Quest completion does not automatically resolve Observation

## Milestones

- First Quest milestone based on reflection completion
- no competitive data produced

---

# Playwright

Add E2E workflow.

Suggested:

1. log in as Mentor
2. open assigned Student
3. assign Quest from template
4. customize description
5. verify Quest active
6. log out
7. log in as Student
8. see active Quest on dashboard
9. open Quest
10. submit:
   - Partly
   - A little
   - reflection text
11. verify Quest completed
12. verify it appears in history
13. log out
14. log in as Mentor
15. open Student
16. review Quest reflection
17. verify no private data leakage

Also verify:

- active Quest limit
- unassigned Mentor denial
- mobile Student Quest workflow

---

# Documentation

Create/update documentation covering:

- QuestAssignment
- QuestReflection
- statuses
- template snapshot behavior
- active Quest limit
- completion semantics
- privacy
- Student reflection flow
- Mentor review

---

# Do not implement in Phase 08

Do NOT implement:

- automatic Quest recommendation
- AI-generated Quests
- notifications
- email reminders
- push notifications
- calendar integration
- Quest scoring
- competitive XP
- leaderboard
- automated Observation resolution
- grades
- attendance
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

## Quest workflow

Explain:

Mentor assignment
→ Student action
→ Student reflection
→ Mentor review

## Database

List:

- QuestAssignment
- QuestReflection
- enums
- constraints

## Templates

Explain snapshot behavior.

## Completion semantics

Explain why Quest completion means reflection occurred, not success.

## Privacy

Explain Mentor/Student access boundaries.

## Gamification

List any implemented milestones.

## Tests

Report:

- lint
- typecheck
- unit/integration
- Playwright
- build
- audit

## Known limitations

Only actual Phase 08 limitations.

Do not list intentionally deferred future functionality.

---

# Final constraints

Implement the work.

Do not only describe it.

Quests are experiments, not graded tasks.

A Student must never be punished in the UI for selecting NO or PARTLY.

Quest completion must not automatically resolve unrelated Observations.

Preserve the existing Auth.js, Check-in, Reflection, Observation, Mentoring, FollowUp and MentorAssignment architecture.