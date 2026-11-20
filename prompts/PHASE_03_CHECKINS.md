# Phase 03 – Student Onboarding and Weekly Check-ins

Read before making changes:

- `AGENTS.md`
- all relevant files under `/docs`
- the completed Phase 00–02 implementation
- `prompts/PHASE_03_CHECKINS.md`

Inspect the existing Prisma schema, authentication architecture, Question models, seeded questions, StudentProfile and Semester structures before editing.

## Goal

Implement the first actual student reflection workflow.

This phase introduces:

1. situational student onboarding
2. weekly Check-ins
3. immutable historical responses
4. mentor conversation request
5. student Check-in history
6. basic student feedback after submission

Do NOT implement:

- trend detection
- observations
- mentor conversations
- Quest assignment
- AI analysis

Those belong to later phases.

---

# Core principle

The platform must not ask students to diagnose themselves.

Questions must focus on:

- behaviour
- situations
- concrete experiences
- recent actions

Avoid abstract self-assessment.

BAD:

> How organized are you?

GOOD:

> How often did you start an assignment later than you originally intended this week?

---

# Student onboarding

Create a first-time onboarding workflow.

Suggested route:

`/student/onboarding`

Onboarding should appear only when the student has not completed it.

Use approximately 8–12 situational questions.

The purpose is to establish a baseline.

It is NOT a personality test.

---

# Onboarding question model

Reuse the existing Question/QuestionOption architecture where reasonable.

If necessary, extend Question with a context/category flag such as:

- ONBOARDING
- WEEKLY

Do not duplicate question structures unnecessarily.

A question may be:

- onboarding-only
- weekly-only
- both, if justified

Keep the model simple and maintainable.

---

# Onboarding questions

Create or seed realistic situational onboarding questions across the existing development domains.

Suggested examples:

## ORGANISATION

> You receive an assignment that is due in one week. What usually happens first?

Possible answers:

- I decide early when I will work on it.
- I keep it in mind but do not plan it.
- I usually begin when the deadline gets close.
- I sometimes forget about it until someone reminds me.

---

## WORK_START

> You know that you need to work on something important, but the task feels large. What usually happens?

Possible answers:

- I start with a small part.
- I think about it for a while before starting.
- I postpone it until there is time pressure.
- I often do not know how to begin.

---

## HELP_SEEKING

> You notice during class that you do not understand something important. What do you usually do?

Possible answers:

- Ask immediately.
- Ask someone later.
- Try to solve it alone first.
- Usually leave it unresolved for now.

---

## LEARNING_UNDERSTANDING

> You have studied a topic, but you are unsure whether you really understand it. What are you most likely to do?

Possible answers:

- Test myself or explain it to someone.
- Review the material again.
- Assume I probably understand enough.
- Move on because I do not know how to check.

---

## PERCEIVED_WORKLOAD

> Several deadlines fall into the same week. What usually happens?

Possible answers:

- I make a plan and prioritize.
- I manage most of it but feel pressure.
- I lose track of some tasks.
- I often do not know where to start.

---

## STUDY_CONFIDENCE

> You receive a difficult task that you have never done before. What is your first reaction?

Possible answers:

- I expect that I can figure it out step by step.
- I am unsure but start anyway.
- I delay because I am afraid of doing it wrong.
- I often assume I probably cannot do it.

---

# Onboarding completion

Create an immutable onboarding submission.

Record:

- student
- submission timestamp
- question
- selected option
- internal direction value

Do not calculate a psychological score.

Do not display:

- percentages
- overall scores
- rankings

After completion, show a cautious baseline reflection.

Example:

> Your answers suggest that you currently tend to try solving difficulties independently before asking for help.

Use language such as:

- currently
- you reported
- may indicate
- future Check-ins will show whether this pattern continues

Do not claim:

> You have poor help-seeking skills.

---

# Baseline feedback

Baseline feedback may identify at most 2–3 notable patterns.

Prefer factual descriptions.

Example:

> You reported that you often begin larger tasks only after some delay.

> You also reported that you usually try to solve unclear topics independently before asking someone.

This feedback is for the student.

Do not create mentor Observations yet.

Trend/Observation logic belongs to Phase 06.

---

# Weekly Check-in

Create route:

`/student/check-in`

The weekly Check-in should take approximately:

30–90 seconds.

Structure:

- 3 stable questions
- 1–2 rotating questions
- mentor conversation request

Use the active Question pool configured in Phase 02.

---

# Stable questions

The three seeded stable questions should cover:

- organisation
- work start
- help seeking

They should appear in every normal weekly Check-in.

---

# Rotating questions

Select 1–2 active rotating questions.

Prefer deterministic rotation.

Do not use purely random selection each time.

The same student should receive a predictable weekly selection.

Possible implementation:

- calculate semester week index
- rotate through active questions by sort order/domain

The algorithm must be deterministic and testable.

Try to provide domain variety.

Do not create complex personalization yet.

---

# Check-in period

A student may submit one normal weekly Check-in per study week.

Define a deterministic Check-in period.

Prefer a week identifier such as:

`2026-W38`

or an equivalent internal model.

Store the period explicitly.

Do not rely only on submission date for uniqueness.

---

# Time zone

The institution operates in Luxembourg/central European time.

Weekly period calculation must not silently depend on server UTC in a way that shifts a student's week around midnight.

Use an explicit application timezone or clearly documented period calculation.

Prefer:

`Europe/Luxembourg`

Document the decision.

---

# Check-in data model

Add appropriate models.

Suggested:

## CheckIn

Fields approximately:

- id
- studentId
- semesterId
- periodKey
- submittedAt
- wantsMentorConversation

Optional:

- createdAt

Unique constraint:

student + semester + periodKey

A student must not create multiple normal Check-ins for the same period.

---

## CheckInAnswer

Fields approximately:

- id
- checkInId
- questionId
- questionTextSnapshot
- selectedOptionId
- optionLabelSnapshot
- directionValueSnapshot

Important:

Historical answers must remain understandable even if Admin later edits a Question or QuestionOption.

Therefore snapshot relevant display data at submission time.

Do not rely exclusively on the current Question text.

---

# Immutability

Submitted Check-ins are immutable.

Students must not edit old Check-ins.

Admins must not silently rewrite historical answers when changing questions.

Question edits affect future Check-ins only.

Historical snapshots remain unchanged.

---

# Check-in form

Use shadcn/ui.

Design requirements:

- mobile first
- one clear task
- minimal cognitive load
- large enough answer targets
- visible progress

Possible experience:

`Question 2 of 5`

Do not show all database metadata.

Do not show numeric `directionValue`.

---

# Conversation request

Always include:

> Is there something you would like to discuss with your mentor?

Options:

- Yes
- No

A Yes response sets:

`wantsMentorConversation = true`

Do not require the student to explain why.

Optionally allow a short message only if this does not significantly increase scope.

If implemented, it must be clearly optional.

Do not build chat.

---

# Check-in availability

Student dashboard should show one of:

## Check-in available

> Your weekly Check-in is ready.

CTA:

`Start Check-in`

## Completed

> Check-in completed this week.

Show:

- completion date
- link to history

Do not allow another normal Check-in for the same period.

---

# Student dashboard

Update `/student`.

Priority order:

1. current Check-in state
2. onboarding status if incomplete
3. current semester stage placeholder
4. recent Check-in history
5. future Quest area placeholder only if already part of shell

Do not implement fake trend cards.

Do not display simulated observations.

---

# Check-in history

Create route:

`/student/check-ins`

Show previous Check-ins chronologically.

For each Check-in:

- period
- submission date
- selected answers
- whether mentor conversation was requested

Do not display internal direction values.

Students may only access their own Check-ins.

---

# Check-in detail

Optional route:

`/student/check-ins/[checkInId]`

If implemented:

- show submitted questions and answers
- use snapshot text
- enforce student ownership server-side

---

# Mentor access

Do not build the Mentor dashboard yet.

However, structure the data/application services so Phase 05 can later retrieve Check-ins for assigned students.

Do not create broad Mentor access routes prematurely.

---

# Seed data

Update deterministic seed data to support Phase 03.

Ensure:

- onboarding questions exist
- stable weekly questions exist
- rotating questions exist
- all answer options contain valid internal direction values

Do not seed fake completed Check-ins unless useful for development.

If sample Check-ins are seeded, clearly distinguish them from production seed behaviour.

---

# Student feedback after Check-in

After submission, show a simple confirmation.

Example:

> Check-in complete.

Optionally provide one neutral reflection derived directly from this week's answers.

Example:

> You reported that starting tasks was harder this week than keeping track of them.

Do not compare against previous weeks yet.

Do not generate Observations.

Do not diagnose.

Keep this feedback simple.

---

# Accessibility

Ensure:

- keyboard usable answer controls
- proper labels
- visible focus
- good contrast
- screen-reader accessible form structure
- errors associated with relevant fields

---

# Validation

Use Zod.

Server must validate:

- student identity
- active student account
- active StudentProfile
- active semester
- allowed questions
- valid QuestionOption belonging to Question
- no duplicate questions
- one Check-in per period
- conversation request boolean

Never trust client-provided:

- student ID
- semester ID
- direction values
- question text snapshots
- option text snapshots

Resolve authoritative values server-side.

---

# Transaction

Check-in submission must be atomic.

Within one transaction:

1. verify period availability
2. create CheckIn
3. create CheckInAnswers
4. snapshot authoritative Question/Option data

No partial Check-ins.

---

# Concurrency

The database must prevent duplicate Check-ins even if the student submits twice rapidly.

Use a unique database constraint.

Do not rely only on UI disabling.

Handle unique-constraint conflicts gracefully.

---

# Audit

Record:

- onboarding submitted
- weekly Check-in submitted
- mentor conversation requested where appropriate

Do not log actual sensitive answer text redundantly in AuditEvent metadata.

Audit metadata should remain minimal.

---

# Tests

Add unit/integration tests covering:

## Onboarding

- Student can submit valid onboarding
- Student cannot submit onboarding for another student
- Invalid option rejected
- repeated onboarding rejected or handled according to documented rule
- baseline feedback uses factual language

## Weekly Check-in

- three stable questions included
- rotation is deterministic
- student can submit valid Check-in
- duplicate week rejected
- answers are snapshotted
- question edits do not change historical snapshot
- invalid option rejected
- option from another question rejected
- conversation request stored

## Authorization

- Student A cannot access Student B Check-ins
- Mentor cannot use Student submission action
- Admin cannot submit as Student without explicit impersonation functionality
- unauthenticated request rejected

## Period calculation

Test boundaries around:

- week changes
- year changes
- timezone handling

---

# Playwright

Implement practical student E2E coverage.

At minimum:

1. log in as seeded student
2. complete onboarding if needed
3. open Student dashboard
4. start weekly Check-in
5. answer all questions
6. request Mentor conversation
7. submit
8. see confirmation
9. dashboard shows completed state
10. open Check-in history
11. verify submitted answers

Also verify second submission for same week is unavailable/rejected.

---

# Documentation

Create or update documentation describing:

- onboarding workflow
- weekly Check-in workflow
- CheckIn model
- CheckInAnswer snapshots
- period calculation
- immutable history
- question rotation strategy

Update README if local development steps change.

---

# Do not implement in Phase 03

Do NOT implement:

- trend analysis
- Observation generation
- Mentor attention states
- Mentor Check-in dashboard
- Mentor conversations
- private mentor notes
- shared agreements
- Quest assignment
- Quest reflection
- notifications
- AI analysis
- attendance
- grades

---

# Validation

Before finishing:

1. format Prisma schema
2. validate schema
3. create/apply migration
4. run deterministic seed twice
5. run lint
6. run strict typecheck
7. run unit/integration tests
8. run Playwright tests
9. run production build
10. run dependency audit
11. verify pinned tooling

Preserve exactly unless explicitly changed:

- Vitest `4.1.11`
- Vite `7.3.6`

Do not upgrade these automatically.

---

# Completion report

Report:

## Student workflows

Summarize:

- onboarding
- weekly Check-in
- history
- conversation request

## Question selection

Explain:

- stable question selection
- rotating question algorithm

## Database changes

List:

- models
- fields
- constraints
- migration

## Immutability

Explain how historical question and option snapshots are preserved.

## Tests

Report:

- lint
- typecheck
- unit/integration
- Playwright
- production build
- audit

## Known limitations

Only report actual Phase 03 limitations.

Do not list features intentionally belonging to future phases.

---

# Final constraints

Implement the work.

Do not only describe it.

Preserve the existing Auth.js and Admin architecture.

Do not implement features from later phases.