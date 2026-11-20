import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { getMentorStudentDetail, listMentorStudents } from "@/modules/mentor/application/queries";
import { getStudentJourney } from "@/modules/journey/application/queries";
import { getLuxembourgPeriodKey } from "@/modules/check-ins/domain/period";
import { evaluateAfterWeeklySubmission, evaluateStudentObservations } from "./evaluation";
import { changeObservationStatus } from "./lifecycle";
import { getMentorObservation } from "./queries";

const prefix = "phase06-integration";
const students = ["a", "b"].map((value) => `${prefix}-student-${value}`);
const mentors = ["a", "b"].map((value) => `${prefix}-mentor-${value}`);
const questionId = `${prefix}-question`;
const semesterId = `${prefix}-semester`;
const now = new Date("2026-09-18T12:00:00Z");
const actor = { userId: mentors[0], role: "MENTOR" as const };

async function cleanup() {
  const ids = (await prisma.observation.findMany({ where: { studentId: { in: students } }, select: { id: true } })).map(({ id }) => id);
  await prisma.auditEvent.deleteMany({ where: { OR: [{ actorUserId: { in: [...students, ...mentors] } }, { entityId: { in: ids } }] } });
  await prisma.observation.deleteMany({ where: { studentId: { in: students } } });
  await prisma.checkIn.deleteMany({ where: { studentId: { in: students } } });
  await prisma.mentorAssignment.deleteMany({ where: { studentId: { in: students } } });
  await prisma.user.deleteMany({ where: { id: { in: [...students, ...mentors] } } });
  await prisma.question.deleteMany({ where: { id: questionId } });
  await prisma.semester.deleteMany({ where: { id: semesterId } });
}
async function weekly(studentId: string, date: string, value: number | null, signal: "YES" | "MAYBE" | "NO" = "NO") {
  const submittedAt = new Date(`${date}T10:00:00Z`);
  return prisma.checkIn.create({ data: {
    id: `${studentId}-${date}`, studentId, semesterId, kind: "WEEKLY", periodKey: getLuxembourgPeriodKey(submittedAt), submittedAt,
    mentorConversationRequest: signal,
    answers: { create: { questionId, selectedOptionId: "historical-option", questionTextSnapshot: "Original getting-started question?",
      optionLabelSnapshot: value === null ? "I am not sure." : value >= 2 ? "Several times." : "Once.",
      directionValueSnapshot: value, domainSnapshot: "WORK_START", stableSnapshot: true, questionSignatureSnapshot: "a".repeat(64), sortOrder: 1 } },
  } });
}
async function repeated() {
  for (const date of ["2026-09-03", "2026-09-10", "2026-09-17"]) await weekly(students[0], date, 3);
  await evaluateStudentObservations(actor, students[0], now);
  return prisma.observation.findFirstOrThrow({ where: { studentId: students[0], type: "REPEATED_DIFFICULTY" }, include: { evidence: true } });
}

describe.sequential("deterministic Observation persistence, recovery and authorized lifecycle", () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    await cleanup();
    await prisma.semester.create({ data: { id: semesterId, name: prefix, startDate: new Date("2026-08-01"), endDate: new Date("2027-01-31") } });
    await prisma.question.create({ data: { id: questionId, key: "PHASE06_TEST_QUESTION", text: "Current question differs", domain: "ORGANISATION", type: "SINGLE_CHOICE", active: false, sortOrder: 999 } });
    for (const id of mentors) await prisma.user.create({ data: { id, email: `${id}@example.test`, name: id, role: "MENTOR", passwordHash: "unused", mentorProfile: { create: { id } } } });
    for (const [index, id] of students.entries()) await prisma.user.create({ data: {
      id, email: `${id}@example.test`, name: id, role: "STUDENT", passwordHash: "unused",
      studentProfile: { create: { id, semesterId, assignments: { create: { mentorId: mentors[index] } } } },
    } });
  });
  afterAll(async () => { vi.restoreAllMocks(); await cleanup(); await prisma.$disconnect(); });

  it("is idempotent even with concurrent recovery and leaves detection dates unchanged on a retry", async () => {
    const observation = await repeated();
    await Promise.all(Array.from({ length: 4 }, () => evaluateStudentObservations(actor, students[0], now)));
    const stored = await prisma.observation.findMany({ where: { studentId: students[0] }, include: { evidence: true } });
    expect(stored).toEqual([observation]);
    expect(await prisma.auditEvent.count({ where: { entityId: observation.id, action: "OBSERVATION_CREATED" } })).toBe(1);
    await weekly(students[0], "2026-09-24", 3);
    await evaluateStudentObservations(actor, students[0], new Date("2026-09-25"));
    const extended = await prisma.observation.findUniqueOrThrow({ where: { id: observation.id }, include: { evidence: true } });
    expect(extended.firstDetectedAt).toEqual(observation.firstDetectedAt);
    expect(extended.lastDetectedAt).toEqual(new Date("2026-09-24T10:00:00Z"));
    expect(extended.evidence).toHaveLength(4);
    expect(extended.evidence.filter(({ id }) => observation.evidence.some((old) => old.id === id))).toEqual(observation.evidence);
  });

  it("records separate Yes evidence while Maybe and No remain soft/non-signals", async () => {
    for (const [index, signal] of ["MAYBE", "NO", "YES"] .entries()) {
      await weekly(students[0], ["2026-09-03", "2026-09-10", "2026-09-17"][index], null, signal as "MAYBE" | "NO" | "YES");
      await evaluateStudentObservations(actor, students[0], now);
      expect(await prisma.observation.count({ where: { studentId: students[0] } })).toBe(signal === "YES" ? 1 : 0);
    }
    const observation = await prisma.observation.findFirstOrThrow({ where: { studentId: students[0] } });
    const detail = await getMentorObservation(mentors[0], students[0], observation.id);
    expect(detail.evidence).toHaveLength(1);
    expect(detail.evidence[0]).toMatchObject({ periodKey: "2026-W38", optionLabelSnapshot: "Yes" });
    expect((await getMentorStudentDetail(mentors[0], students[0], now)).attentionState).toBe("CONVERSATION");
  });

  it("keeps improvement visible without auto-resolving difficulty from one good week", async () => {
    const observation = await repeated();
    await weekly(students[0], "2026-09-24", 2);
    await evaluateStudentObservations(actor, students[0], new Date("2026-09-25"));
    expect((await prisma.observation.findUniqueOrThrow({ where: { id: observation.id } })).status).toBe("OPEN");
    expect(await prisma.observation.count({ where: { type: "IMPROVEMENT", studentId: students[0] } })).toBe(0);
    await weekly(students[0], "2026-10-01", 1);
    const detail = await getMentorStudentDetail(mentors[0], students[0], new Date("2026-10-02"));
    expect(detail.observations.map(({ type }) => type)).toContain("IMPROVEMENT");
    expect(detail.attentionState).toBe("WATCH");
    expect(detail.observation?.type).toBe("REPEATED_DIFFICULTY");
    expect(JSON.stringify(await getStudentJourney(students[0], new Date("2026-10-02")))).not.toMatch(/Observations|REPEATED_DIFFICULTY|ACKNOWLEDGED/);
  });

  it("acknowledges and resolves exactly once with minimal audit data", async () => {
    const observation = await repeated();
    const input = { studentId: students[0], observationId: observation.id, status: "ACKNOWLEDGED" };
    expect(await changeObservationStatus(mentors[0], input, now)).toEqual({ changed: true });
    expect(await changeObservationStatus(mentors[0], input, now)).toEqual({ changed: false });
    expect((await getMentorStudentDetail(mentors[0], students[0], now)).attentionState).toBe("WATCH");
    await changeObservationStatus(mentors[0], { ...input, status: "RESOLVED" }, now);
    await changeObservationStatus(mentors[0], { ...input, status: "RESOLVED" }, now);
    await expect(changeObservationStatus(mentors[0], input, now)).rejects.toThrow("already resolved");
    expect((await getMentorStudentDetail(mentors[0], students[0], now)).attentionState).toBe("NORMAL");
    const events = await prisma.auditEvent.findMany({ where: { entityId: observation.id }, orderBy: { createdAt: "asc" } });
    expect(events.map(({ action }) => action)).toEqual(["OBSERVATION_CREATED", "OBSERVATION_ACKNOWLEDGED", "OBSERVATION_RESOLVED"]);
    expect(JSON.stringify(events.map(({ metadata }) => metadata))).not.toMatch(/Original|Several|directionValue/);
  });

  it("creates a new episode only after three fresh post-resolution responses", async () => {
    const original = await repeated();
    await changeObservationStatus(mentors[0], { studentId: students[0], observationId: original.id, status: "RESOLVED" }, now);
    const closed = await prisma.observation.findUniqueOrThrow({ where: { id: original.id }, include: { evidence: true } });
    for (const [index, date] of ["2026-09-24", "2026-10-01", "2026-10-08"].entries()) {
      await weekly(students[0], date, 3);
      await evaluateStudentObservations(actor, students[0], new Date(`${date}T12:00:00Z`));
      expect(await prisma.observation.count({ where: { studentId: students[0] } })).toBe(index === 2 ? 2 : 1);
    }
    expect(await prisma.observation.findUniqueOrThrow({ where: { id: original.id }, include: { evidence: true } })).toEqual(closed);
    const next = await prisma.observation.findFirstOrThrow({ where: { studentId: students[0], status: "OPEN" }, include: { evidence: true } });
    expect(next.episodeKey).toBe(original.id);
    expect(next.evidence.every(({ submittedAt }) => submittedAt > now)).toBe(true);
  });

  it.each(["", "missing", students[0], "user-admin-001", mentors[1]])("rejects reads and lifecycle writes from unauthorized actor %s", async (userId) => {
    const observation = await repeated();
    await expect(getMentorObservation(userId, students[0], observation.id)).rejects.toThrow();
    await expect(changeObservationStatus(userId, { studentId: students[0], observationId: observation.id, status: "RESOLVED" })).rejects.toThrow();
    await expect(evaluateStudentObservations({ userId, role: "MENTOR" }, students[0], now)).rejects.toThrow();
    expect((await prisma.observation.findUniqueOrThrow({ where: { id: observation.id } })).status).toBe("OPEN");
  });

  it("rejects mismatched IDs and rechecks assignment deactivation", async () => {
    const observation = await repeated();
    await expect(getMentorObservation(mentors[1], students[1], observation.id)).rejects.toThrow();
    await prisma.mentorAssignment.updateMany({ where: { studentId: students[0] }, data: { active: false, deactivatedAt: now } });
    await expect(getMentorObservation(mentors[0], students[0], observation.id)).rejects.toThrow();
    await expect(changeObservationStatus(mentors[0], { studentId: students[0], observationId: observation.id, status: "ACKNOWLEDGED" })).rejects.toThrow();
    expect(await listMentorStudents(mentors[0], now)).toEqual([]);
    await prisma.mentorAssignment.create({ data: { studentId: students[0], mentorId: mentors[1] } });
    expect((await getMentorObservation(mentors[1], students[0], observation.id)).id).toBe(observation.id);
  });

  it("keeps immutable source evidence after Admin edits and excludes numeric metadata from presentation", async () => {
    const observation = await repeated();
    await prisma.question.update({ where: { id: questionId }, data: { text: "Edited wording", domain: "HELP_SEEKING" } });
    const detail = await getMentorObservation(mentors[0], students[0], observation.id);
    expect(detail.evidence.every(({ questionTextSnapshot }) => questionTextSnapshot === "Original getting-started question?")).toBe(true);
    expect(JSON.stringify(detail)).not.toMatch(/directionValue|questionSignature|passwordHash|ruleKey|episodeKey/);
    await expect(prisma.observationEvidence.update({ where: { id: observation.evidence[0].id }, data: { optionLabelSnapshot: "Rewritten" } })).rejects.toThrow();
    await expect(prisma.checkIn.delete({ where: { id: observation.evidence[0].checkInId } })).rejects.toThrow();
  });

  it("enforces unique episodes and rejects evidence pointing to another student's Check-in", async () => {
    const observation = await repeated();
    const other = await weekly(students[1], "2026-09-17", 3);
    await expect(prisma.observationEvidence.create({ data: { observationId: observation.id, sourceKey: `conversation:${other.id}`,
      checkInId: other.id, periodKey: other.periodKey, submittedAt: other.submittedAt, questionTextSnapshot: "Mentor conversation response", optionLabelSnapshot: "Yes" } })).rejects.toThrow();
    await expect(prisma.observation.create({ data: {
      studentId: students[0], semesterId, ruleKey: observation.ruleKey, episodeKey: "other", type: observation.type,
      domain: observation.domain, title: observation.title, summary: observation.summary, firstDetectedAt: now, lastDetectedAt: now,
    } })).rejects.toThrow();
  });

  it("keeps a committed submission readable when post-processing fails, then recovers on Mentor read", async () => {
    const submitted = await weekly(students[0], "2026-09-17", null, "YES");
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const transaction = vi.spyOn(prisma, "$transaction").mockRejectedValueOnce(new Error("simulated evaluator outage"));
    await expect(evaluateAfterWeeklySubmission(students[0], submitted.id, now)).resolves.toBeUndefined();
    transaction.mockRestore();
    expect(await prisma.checkIn.findUnique({ where: { id: submitted.id } })).not.toBeNull();
    expect(await prisma.observation.count({ where: { studentId: students[0] } })).toBe(0);
    expect(log).toHaveBeenCalledWith("Observation evaluation deferred; stored Check-ins remain available.");
    const recovered = await getMentorStudentDetail(mentors[0], students[0], now);
    expect(recovered.observationRefreshFailed).toBe(false);
    expect(recovered.observations.map(({ type }) => type)).toEqual(["CONVERSATION_REQUEST"]);
  });
});
