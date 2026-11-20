import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import * as audit from "@/modules/audit/application/record-event";
import { evaluateStudentObservations } from "@/modules/observations/application/evaluation";
import { getLuxembourgPeriodKey } from "@/modules/check-ins/domain/period";
import { recordConversation } from "./conversations";
import { changeFollowUpStatus } from "./follow-ups";
import { getConversationFormData, getMentoringHistory, listOpenFollowUps } from "./queries";
import { getStudentAgreements } from "./student-agreements";

const prefix = "phase07-integration";
const students = ["a", "b"].map((key) => `${prefix}-student-${key}`);
const mentors = ["a", "b"].map((key) => `${prefix}-mentor-${key}`);
const semesterId = `${prefix}-semester`;
const now = new Date("2026-09-18T12:00:00Z");
const privateNote = "PRIVATE study support note";
const internalNote = "INTERNAL revisit first step";
const agreement = "Identify the first concrete step before Friday.";
function input(overrides = {}) {
  return { studentId: students[0], submissionKey: randomUUID(), occurredAt: "2026-09-18T13:00", topic: "First step",
    privateNote, sharedAgreement: agreement, followUpDate: "2026-09-23", followUpNote: internalNote, ...overrides };
}
async function cleanup() {
  await prisma.auditEvent.deleteMany({ where: { actorUserId: { in: [...students, ...mentors] } } });
  await prisma.followUp.deleteMany({ where: { studentId: { in: students } } });
  await prisma.mentoringConversationObservation.deleteMany({ where: { studentId: { in: students } } });
  await prisma.sharedAgreement.deleteMany({ where: { conversation: { studentId: { in: students } } } });
  await prisma.mentoringConversation.deleteMany({ where: { studentId: { in: students } } });
  await prisma.observation.deleteMany({ where: { studentId: { in: students } } });
  await prisma.checkIn.deleteMany({ where: { studentId: { in: students } } });
  await prisma.mentorAssignment.deleteMany({ where: { studentId: { in: students } } });
  await prisma.user.deleteMany({ where: { id: { in: [...students, ...mentors] } } });
  await prisma.semester.deleteMany({ where: { id: semesterId } });
}
async function request(studentId = students[0], signal: "YES" | "MAYBE" = "YES") {
  const submittedAt = new Date("2026-09-18T10:00:00Z");
  await prisma.checkIn.create({ data: { studentId, semesterId, kind: "WEEKLY", periodKey: getLuxembourgPeriodKey(submittedAt), submittedAt, mentorConversationRequest: signal } });
  await evaluateStudentObservations({ userId: studentId, role: "STUDENT" }, studentId, now);
  return prisma.observation.findFirst({ where: { studentId, type: "CONVERSATION_REQUEST" } });
}
async function difficulty() {
  return prisma.observation.create({ data: { studentId: students[0], semesterId, domain: "WORK_START", type: "REPEATED_DIFFICULTY", status: "ACKNOWLEDGED",
    acknowledgedAt: now, ruleKey: "test-difficulty", episodeKey: "initial", title: "Repeated difficulty", summary: "Historical evidence", firstDetectedAt: now, lastDetectedAt: now } });
}

describe.sequential("private mentoring workflow and authorization", () => {
  beforeEach(async () => {
    vi.restoreAllMocks(); await cleanup();
    await prisma.semester.create({ data: { id: semesterId, name: prefix, startDate: new Date("2026-08-01"), endDate: new Date("2027-01-31") } });
    for (const id of mentors) await prisma.user.create({ data: { id, email: `${id}@example.test`, name: id, role: "MENTOR", passwordHash: "unused", mentorProfile: { create: { id } } } });
    for (const [index, id] of students.entries()) await prisma.user.create({ data: { id, email: `${id}@example.test`, name: id, role: "STUDENT", passwordHash: "unused",
      studentProfile: { create: { id, semesterId, assignments: { create: { mentorId: mentors[index] } } } } } });
  });
  afterAll(async () => { vi.restoreAllMocks(); await cleanup(); await prisma.$disconnect(); });

  it("stores notes and agreements separately, creates links/reminder/audits, and returns only safe Student DTOs", async () => {
    const observation = await request();
    const created = await recordConversation(mentors[0], input({ observationIds: [observation!.id] }), now);
    const stored = await prisma.mentoringConversation.findUniqueOrThrow({ where: { id: created.id }, include: { sharedAgreement: true, followUps: true, observations: true } });
    expect(stored.privateNote).toBe(privateNote);
    expect(stored.sharedAgreement?.text).toBe(agreement);
    expect(stored.followUps[0]).toMatchObject({ status: "OPEN", note: internalNote });
    expect(stored.observations[0].observationId).toBe(observation!.id);
    const safe = await getStudentAgreements(students[0]);
    expect(safe).toEqual([{ id: stored.sharedAgreement!.id, text: agreement, occurredAt: stored.occurredAt }]);
    expect(JSON.stringify(safe)).not.toMatch(/PRIVATE|INTERNAL|privateNote|followUp|observation|mentorId|topic/);
    expect(await getStudentAgreements(students[1])).toEqual([]);
    expect((await getMentoringHistory(mentors[0], students[0]))[0].privateNote).toBe(privateNote);
    const audits = await prisma.auditEvent.findMany({ where: { actorUserId: mentors[0] } });
    expect(audits.map(({ action }) => action)).toEqual(expect.arrayContaining(["MENTORING_CONVERSATION_CREATED", "SHARED_AGREEMENT_CREATED", "FOLLOW_UP_CREATED", "OBSERVATION_RESOLVED"]));
    expect(JSON.stringify(audits)).not.toContain(privateNote); expect(JSON.stringify(audits)).not.toContain(internalNote); expect(JSON.stringify(audits)).not.toContain(agreement);
  });
  it("resolves only a linked request after it occurred and preserves difficulty and immutable evidence", async () => {
    const observation = await request(); const problem = await difficulty();
    const evidence = await prisma.observationEvidence.findMany({ where: { observationId: observation!.id } });
    await recordConversation(mentors[0], input({ observationIds: [observation!.id, problem.id] }), now);
    expect((await prisma.observation.findUniqueOrThrow({ where: { id: observation!.id } })).status).toBe("RESOLVED");
    expect((await prisma.observation.findUniqueOrThrow({ where: { id: problem.id } })).status).toBe("ACKNOWLEDGED");
    await evaluateStudentObservations({ userId: mentors[0], role: "MENTOR" }, students[0], now);
    expect(await prisma.observation.count({ where: { studentId: students[0], type: "CONVERSATION_REQUEST" } })).toBe(1);
    expect(await prisma.observationEvidence.findMany({ where: { observationId: observation!.id } })).toEqual(evidence);
  });
  it("leaves an unlinked request open and does not fulfil it with a retrospective conversation before the latest YES", async () => {
    const observation = await request();
    await recordConversation(mentors[0], input(), now);
    await recordConversation(mentors[0], input({ occurredAt: "2026-09-18T11:00", observationIds: [observation!.id] }), now);
    expect((await prisma.observation.findUniqueOrThrow({ where: { id: observation!.id } })).status).toBe("OPEN");
  });
  it("allows a conversation without agreement/reminder and leaves MAYBE a soft signal", async () => {
    expect(await request(students[0], "MAYBE")).toBeNull();
    await recordConversation(mentors[0], input({ sharedAgreement: "", followUpDate: "", followUpNote: "" }), now);
    expect(await getStudentAgreements(students[0])).toEqual([]);
    expect(await listOpenFollowUps(mentors[0], now)).toEqual([]);
    expect(await prisma.observation.count({ where: { studentId: students[0] } })).toBe(0);
  });
  it("does not lose a newer YES whose Observation evaluation is still pending", async () => {
    const observation = await request();
    const later = new Date("2026-09-25T12:00:00Z");
    const submittedAt = new Date("2026-09-25T10:00:00Z");
    await prisma.checkIn.create({ data: { studentId: students[0], semesterId, kind: "WEEKLY", periodKey: getLuxembourgPeriodKey(submittedAt), submittedAt, mentorConversationRequest: "YES" } });
    await recordConversation(mentors[0], input({ occurredAt: "2026-09-24T13:00", followUpDate: "2026-09-26", observationIds: [observation!.id] }), later);
    await evaluateStudentObservations({ userId: mentors[0], role: "MENTOR" }, students[0], later);
    const saved = await prisma.observation.findUniqueOrThrow({ where: { id: observation!.id }, include: { evidence: true } });
    expect(saved.status).toBe("OPEN"); expect(saved.lastDetectedAt).toEqual(submittedAt); expect(saved.evidence).toHaveLength(2);
  });
  it.each(["", "missing", students[0], "user-admin-001", mentors[1]])("denies private services for actor %s", async (actor) => {
    await recordConversation(mentors[0], input(), now);
    const followUp = (await listOpenFollowUps(mentors[0], now))[0];
    await expect(recordConversation(actor, input(), now)).rejects.toThrow();
    await expect(getMentoringHistory(actor, students[0])).rejects.toThrow();
    await expect(getConversationFormData(actor, students[0])).rejects.toThrow();
    await expect(changeFollowUpStatus(actor, { studentId: students[0], followUpId: followUp.id, status: "COMPLETED" }, now)).rejects.toThrow();
    if (actor === mentors[1]) expect(await listOpenFollowUps(actor, now)).toEqual([]);
    else await expect(listOpenFollowUps(actor, now)).rejects.toThrow();
    expect(await prisma.mentoringConversation.count({ where: { studentId: students[0] } })).toBe(1);
  });
  it("rejects other Student observations in prelinks/writes and cross-Student DB links", async () => {
    const observation = await request(students[1]);
    await expect(getConversationFormData(mentors[0], students[0], observation!.id)).rejects.toThrow();
    await expect(recordConversation(mentors[0], input({ observationIds: [observation!.id] }), now)).rejects.toThrow();
    const conversation = await recordConversation(mentors[0], input(), now);
    await expect(prisma.mentoringConversationObservation.create({ data: { conversationId: conversation.id, studentId: students[0], observationId: observation!.id } })).rejects.toThrow();
  });
  it("revokes historical Mentor access and grants the new active Mentor access including old reminders", async () => {
    await recordConversation(mentors[0], input(), now);
    const followUp = (await listOpenFollowUps(mentors[0], now))[0];
    await prisma.mentorAssignment.updateMany({ where: { studentId: students[0], active: true }, data: { active: false, deactivatedAt: now } });
    await prisma.mentorAssignment.create({ data: { studentId: students[0], mentorId: mentors[1] } });
    await expect(getMentoringHistory(mentors[0], students[0])).rejects.toThrow();
    await expect(recordConversation(mentors[0], input(), now)).rejects.toThrow();
    await expect(changeFollowUpStatus(mentors[0], { studentId: students[0], followUpId: followUp.id, status: "COMPLETED" }, now)).rejects.toThrow();
    expect((await getMentoringHistory(mentors[1], students[0]))[0].privateNote).toBe(privateNote);
    await changeFollowUpStatus(mentors[1], { studentId: students[0], followUpId: followUp.id, status: "COMPLETED" }, now);
    expect(await listOpenFollowUps(mentors[0], now)).toEqual([]);
    expect(await getStudentAgreements(students[0])).toHaveLength(1);
  });
  it.each(["COMPLETED", "CANCELLED"] as const)("retains %s follow-ups and audits an idempotent transition", async (status) => {
    await recordConversation(mentors[0], input(), now);
    const followUp = (await listOpenFollowUps(mentors[0], now))[0];
    const change = { studentId: students[0], followUpId: followUp.id, status };
    await Promise.all([changeFollowUpStatus(mentors[0], change, now), changeFollowUpStatus(mentors[0], change, now)]);
    const stored = await prisma.followUp.findUniqueOrThrow({ where: { id: followUp.id } });
    expect(stored.status).toBe(status); expect(stored.note).toBe(internalNote);
    expect(stored[status === "COMPLETED" ? "completedAt" : "cancelledAt"]).toEqual(now);
    expect(await prisma.auditEvent.count({ where: { entityId: followUp.id, action: status === "COMPLETED" ? "FOLLOW_UP_COMPLETED" : "FOLLOW_UP_CANCELLED" } })).toBe(1);
    expect(await listOpenFollowUps(mentors[0], now)).toEqual([]);
    await expect(changeFollowUpStatus(mentors[0], { ...change, status: status === "COMPLETED" ? "CANCELLED" : "COMPLETED" }, now)).rejects.toThrow("already closed");
    expect((await getMentoringHistory(mentors[0], students[0]))[0].followUps).toHaveLength(1);
  });
  it("rolls back every coupled write and request resolution if the final audit fails", async () => {
    const observation = await request();
    const realAudit = audit.recordAuditEvent;
    vi.spyOn(audit, "recordAuditEvent").mockImplementation((tx, event) => {
      if (event.action === "OBSERVATION_RESOLVED") throw new Error("simulated final write failure");
      return realAudit(tx, event);
    });
    await expect(recordConversation(mentors[0], input({ observationIds: [observation!.id] }), now)).rejects.toThrow("simulated");
    expect(await prisma.mentoringConversation.count({ where: { studentId: students[0] } })).toBe(0);
    expect(await prisma.sharedAgreement.count()).toBe(0);
    expect(await prisma.followUp.count({ where: { studentId: students[0] } })).toBe(0);
    expect(await prisma.auditEvent.count({ where: { actorUserId: mentors[0] } })).toBe(0);
    expect((await prisma.observation.findUniqueOrThrow({ where: { id: observation!.id } })).status).toBe("OPEN");
  });
  it("deduplicates concurrent submission retries without rewriting history", async () => {
    const submission = input();
    const results = await Promise.all(Array.from({ length: 3 }, () => recordConversation(mentors[0], submission, now)));
    expect(new Set(results.map(({ id }) => id)).size).toBe(1);
    expect(await prisma.auditEvent.count({ where: { actorUserId: mentors[0] } })).toBe(3);
    await expect(prisma.mentoringConversation.update({ where: { id: results[0].id }, data: { privateNote: "rewrite" } })).rejects.toThrow();
    const shared = (await getStudentAgreements(students[0]))[0];
    await expect(prisma.sharedAgreement.update({ where: { id: shared.id }, data: { text: "rewrite" } })).rejects.toThrow();
  });
  it("rolls back follow-up completion when its audit fails and rejects mismatched IDs", async () => {
    await recordConversation(mentors[0], input(), now);
    const followUp = (await listOpenFollowUps(mentors[0], now))[0];
    await expect(changeFollowUpStatus(mentors[1], { studentId: students[1], followUpId: followUp.id, status: "COMPLETED" }, now)).rejects.toThrow();
    vi.spyOn(audit, "recordAuditEvent").mockImplementation(() => { throw new Error("audit unavailable"); });
    await expect(changeFollowUpStatus(mentors[0], { studentId: students[0], followUpId: followUp.id, status: "COMPLETED" }, now)).rejects.toThrow("audit unavailable");
    expect((await prisma.followUp.findUniqueOrThrow({ where: { id: followUp.id } })).status).toBe("OPEN");
  });
  it("does not allow Mentor/Admin/deactivated accounts to read Student agreements", async () => {
    await recordConversation(mentors[0], input(), now);
    for (const actor of [mentors[0], "user-admin-001", ""]) await expect(getStudentAgreements(actor)).rejects.toThrow();
    await prisma.user.update({ where: { id: students[0] }, data: { active: false } });
    await expect(getStudentAgreements(students[0])).rejects.toThrow();
    await expect(getMentoringHistory(mentors[0], students[0])).rejects.toThrow();
  });
});
