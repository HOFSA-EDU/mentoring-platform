# Mentoring conversations, shared agreements and follow-ups

Phase 08 adds an optional Assign Quest action to each recorded conversation.
Quests can reference its shared agreement without exposing the conversation's
private topic, note or FollowUps to Students. Completion does not change linked
Observations or mentoring history. See [Quests](09_QUESTS.md).

Phase 07 connects an Observation or ordinary Mentor interaction to a recorded
conversation, a private educational note, an optional shared agreement and an
optional internal follow-up. Auth.js and the existing reflection and Observation
engines remain the authentication and evidence foundations.

## Models and persistence

`MentoringConversation` records the Student, recording Mentor, Student's semester
at recording time, occurrence time, concise topic, optional `privateNote`,
submission key and creation/update timestamps. A UUID submission key is unique
per recording Mentor: retrying the same form cannot duplicate the conversation,
agreement, reminder or audits. A new form represents a new conversation.

`SharedAgreement` is a separate table with one unique conversation reference and
its own text and timestamps. Private note text is never stored in this table.
An empty agreement creates no row. The topic is Mentor-only because free-text
topics may also contain private context.

`MentoringConversationObservation` is a many-to-many join. Its composite foreign
keys include Student identity on both sides, so PostgreSQL rejects cross-Student
links. A conversation may link historical Observations from earlier semesters
for the same Student without copying their evidence or rewriting their semester.

`FollowUp` stores its conversation, Student, original recording Mentor, date-only
`dueAt`, optional internal `note`, `OPEN` / `COMPLETED` / `CANCELLED` status and
completion/cancellation/creation/update timestamps. The composite conversation
foreign key ensures all three identities match. Check constraints enforce valid
status/date combinations and text limits. A follow-up is an internal reminder,
not an appointment.

Conversations, agreements and links reject UPDATE at the database level in this
MVP. Follow-ups allow only OPEN-to-COMPLETED/CANCELLED transitions; closed rows
cannot be rewritten. Services and UI have no hard-delete operations. Foreign
keys restrict deletion of referenced mentoring history. Historical Check-ins,
answer snapshots and Observation evidence remain untouched by this migration.

## Authorization and historical access

Every Mentor route and Server Action calls `requireMentor`. Services verify the
active Mentor account/profile, active Student account/profile and active
MentorAssignment. Read queries include `assignedStudentScope` in the actual data
selection, as well as the existing central policy check for Student detail.
Missing, unassigned and mismatched Student/record IDs are not exposed.

Writes acquire the existing per-Student Observation advisory lock, then lock the
live assignment and account/profile rows with `FOR SHARE` for the transaction.
This serializes Observation lifecycle writes and prevents reassignment or
deactivation from interleaving between authorization and a mentoring write.
Recording the conversation, agreement, links, reminder, request resolution and
all audits is one transaction. Follow-up transitions and audits are transactional
as well. Retrying a terminal transition does not duplicate its audit.

The current authorized Mentor may read previous conversations and complete or
cancel reminders recorded by an earlier Mentor. Original authorship remains
unchanged. A former Mentor loses access immediately after reassignment: inactive
historical assignments grant no access. Admin does not inherit Mentor privacy
permissions. Students cannot call mentoring creation or follow-up services.

## Student privacy boundary

`student-agreements.ts` is a dedicated Student-facing read service. It resolves
the active owner from the session user ID and repeats ownership in the agreement
query. Its allowlisted projection selects only agreement ID, agreement text and
conversation occurrence time. The returned DTO contains exactly these fields.
It never fetches private notes and then tries to strip them afterwards.

The Student dashboard shows the latest three agreements; `/student/mentoring`
shows agreement history newest first. Neither surface receives conversation
topics, private notes, Observation records or any follow-up metadata (including
dates, notes and status). Students see agreements after Mentor reassignment too.
Empty state: “No shared agreements yet.” Agreements are calm next steps, not
warnings or assessments.

The recording form visually separates “Mentor only”, “Shared with the Student”
and “Internal follow-up”. The private field explicitly explains its access
boundary and asks for concise, study-relevant notes without unnecessary sensitive
personal information. Text is rendered as text, never as raw HTML.

## Observation and conversation-request behavior

Student detail and Observation detail link to
`/mentor/students/[studentId]/mentoring/new`. Observation entry preselects the
authorized Student and that Observation. A form can link several Observations.

Recording does **not** acknowledge or resolve difficulty/improvement Observations.
They retain their existing status, and manual lifecycle actions remain available.
Talking about a difficulty does not establish that it is resolved.

The sole automatic resolution is a linked, unresolved `CONVERSATION_REQUEST`:
the conversation must have occurred strictly after the request's latest
evidence-supported detection time. The service also checks committed weekly YES
responses that may still await engine processing. A retrospective conversation
cannot close a newer request. An unlinked request remains open. MAYBE remains a
soft signal and cannot be resolved as a formal request.

Resolution records its processing time, links its audit to the conversation and
preserves the Observation and immutable evidence. Phase 06 episode rules still
require new evidence after resolution for a later request episode. Replaying
unchanged data does not reopen an old episode.

The Student's original YES is never changed. When a linked conversation fulfils
that request, Mentor rows label it “Request addressed in a conversation” and the
saved YES alone no longer elevates attention. Other open requests/difficulties
still do. A manually resolved request without a fulfilling linked conversation
retains the Phase 06 recent-response behavior. Saved-response filters continue
to show the actual YES/MAYBE/NO answers.

## Dates and follow-up ordering

Conversation dates default to now and are explicitly entered in
`Europe/Luxembourg`, independent of browser or server timezone. Dates must be
completed interactions within the last 180 days; future dates are rejected.
Nonexistent daylight-saving times are rejected. In the repeated autumn hour,
the earlier occurrence is used consistently.

Follow-up dates use PostgreSQL DATE and UTC date-only storage, compared with
today's Luxembourg calendar date. They must be on/after the conversation date
and no more than 366 days into the future. A retrospective record may have an
already overdue reminder. An internal reminder note requires a date.

| State | Calendar rule |
| --- | --- |
| Overdue | Before today |
| Due today | Today |
| Due soon | Tomorrow through seven days from today, inclusive |
| Later | More than seven days from today |

The Mentor Needs attention list orders Students by overdue reminder, unresolved
conversation need, reminder due today/soon, difficulty Observation, then MAYBE.
All assigned Students remain visible, with improvement and remaining Students
after those categories. Within a category, name then ID determine order. Each
row can show both its earliest open reminder and a formal Observation; reminders
do not hide difficulty evidence. There are no numeric priority or risk scores.

The dashboard also provides Due follow-ups with completion/cancellation actions.
`/mentor/follow-ups` includes Later reminders, grouped by calendar state, ordered
by due date then ID. Completed/cancelled reminders leave the open queue and
remain in the Student's Mentor-only conversation history. The UI encourages
recording substantive conversations separately.

## Audit and validation

Audit actions: `MENTORING_CONVERSATION_CREATED`, `SHARED_AGREEMENT_CREATED`,
`FOLLOW_UP_CREATED`, `FOLLOW_UP_COMPLETED`, `FOLLOW_UP_CANCELLED`, and the existing
`OBSERVATION_RESOLVED` special case. New entity types identify conversations,
agreements and reminders. Metadata contains IDs only; notes, topics and agreement
text are never copied into audit events. No editing action exists in this MVP.

Run all validation against a separate seeded PostgreSQL database. Unit and E2E
suites must run sequentially because earlier Admin tests temporarily change the
active semester. Phase 07 adds privacy/DTO tests, failure-injection rollback
tests, concurrent retry tests, cross-Student constraint checks, active-assignment
revocation and historical-access tests, request timing and MAYBE cases,
follow-up retention/lifecycle tests and explicit Luxembourg/DST window tests.
Browser tests cover the full Mentor–Student–Mentor loop, HTML privacy, direct
role access, forged/revoked forms, keyboard actions and mobile widths.

## Actual limitations

- Conversations and agreements cannot yet be edited. The form explicitly asks
  the Mentor to review before saving. A separate later conversation can clarify
  the earlier agreement without changing its recorded text.
- Histories and open reminders have no pagination, appropriate for the pilot.
- One optional follow-up can be created with each conversation. The UI does not
  reschedule a saved reminder; cancellation preserves its history.
- Retrospective conversations are associated with the Student's semester at
  recording time, and entry is limited to the preceding 180 days.

## Validation results (2026-09-17)

- Prisma format and validation passed. All nine migrations deployed to the
  isolated `mentoring_phase07_validation` database; the seed ran twice.
- The Phase 07 migration also applied to the local development database.
  SHA-256 comparisons confirmed its two Check-ins and 15 answer rows were
  unchanged; the existing Observation/evidence tables were also compared.
- ESLint and strict TypeScript passed.
- All 253 unit/integration tests passed across 24 files, including late-audit
  rollback, pending evaluation of a newer YES, and concurrent idempotent writes.
- All 25 Chromium Playwright tests passed without retries. After final review,
  the four new mentoring scenarios passed again without retries. Tests checked
  private content exclusion from returned Student HTML, direct role boundaries,
  revoked/forged forms, retained completion/cancellation, keyboard use and no
  horizontal overflow at 320, 375 and 390px. Desktop dashboard and mobile form
  and agreement screenshots were visually reviewed.
- Production build passed; the new mentoring routes render dynamically.
- Dependency audit found zero vulnerabilities. Vitest 4.1.11 and Vite 7.3.6
  remain exactly pinned and installed. No dependencies were upgraded.
