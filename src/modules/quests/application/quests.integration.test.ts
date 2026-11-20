import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import * as audit from "@/modules/audit/application/record-event";
import { updateQuestTemplate } from "@/modules/admin/application/content";
import { recordConversation } from "@/modules/mentoring/application/conversations";
import { assignQuest, cancelQuest, reflectOnQuest } from "./commands";
import { getQuestAssignmentForm, getStudentQuest, listMentorQuests, listStudentQuests } from "./queries";
import { activeQuestLimitMessage, questMilestones } from "../domain/presentation";

const prefix = "phase08-integration";
const students = ["a", "b"].map((key) => `${prefix}-student-${key}`);
const mentors = ["a", "b"].map((key) => `${prefix}-mentor-${key}`);
const semesterId = `${prefix}-semester`; const templateId = `${prefix}-template`;
const now = new Date("2026-09-18T12:00:00Z");
const template = { id: templateId, key: "PHASE08_TEST_TEMPLATE", title: "Early Start", description: "Begin one assignment three days before its deadline for at least 15 minutes.",
  domain: "WORK_START" as const, defaultDurationDays: 7, reflectionPrompt: "What did you notice after starting earlier?" };
function input(overrides = {}) { return { studentId: students[0], submissionKey: randomUUID(), questTemplateId: templateId, ...overrides }; }
async function assign(overrides = {}) { return assignQuest(mentors[0], input(overrides), now); }
async function reflect(questId: string, overrides = {}) { return reflectOnQuest(students[0], { questId, attempted: "NO", helpful: "NOT_SURE", ...overrides }, now); }
async function conversation(index = 0) {
  const created = await recordConversation(mentors[index], { studentId: students[index], submissionKey: randomUUID(), occurredAt: "2026-09-18T13:00", topic: "PRIVATE TOPIC",
    privateNote: "PRIVATE mentor note", sharedAgreement: "Start one assignment earlier this week.", followUpDate: "2026-09-25", followUpNote: "INTERNAL follow-up note" }, now);
  const agreement = await prisma.sharedAgreement.findUniqueOrThrow({ where: { conversationId: created.id } });
  return { id: created.id, agreementId: agreement.id };
}
async function cleanup() {
  await prisma.auditEvent.deleteMany({ where: { OR: [{ actorUserId: { in: [...students, ...mentors] } }, { entityId: templateId }] } });
  await prisma.questReflection.deleteMany({ where: { questAssignment: { studentId: { in: students } } } });
  await prisma.questAssignment.deleteMany({ where: { studentId: { in: students } } });
  await prisma.followUp.deleteMany({ where: { studentId: { in: students } } });
  await prisma.mentoringConversationObservation.deleteMany({ where: { studentId: { in: students } } });
  await prisma.sharedAgreement.deleteMany({ where: { conversation: { studentId: { in: students } } } });
  await prisma.mentoringConversation.deleteMany({ where: { studentId: { in: students } } });
  await prisma.observation.deleteMany({ where: { studentId: { in: students } } });
  await prisma.mentorAssignment.deleteMany({ where: { studentId: { in: students } } });
  await prisma.user.deleteMany({ where: { id: { in: [...students, ...mentors] } } });
  await prisma.questTemplate.deleteMany({ where: { id: templateId } });
  await prisma.semester.deleteMany({ where: { id: semesterId } });
}

describe.sequential("Quest assignment, reflection, immutable history and privacy", () => {
  beforeEach(async () => {
    vi.restoreAllMocks(); await cleanup();
    await prisma.semester.create({ data: { id: semesterId, name: prefix, startDate: new Date("2026-08-01"), endDate: new Date("2027-01-31") } });
    await prisma.questTemplate.create({ data: template });
    for (const id of mentors) await prisma.user.create({ data: { id, email: `${id}@example.test`, name: id, role: "MENTOR", passwordHash: "unused", mentorProfile: { create: { id } } } });
    for (const [index, id] of students.entries()) await prisma.user.create({ data: { id, email: `${id}@example.test`, name: id, role: "STUDENT", passwordHash: "unused",
      studentProfile: { create: { id, semesterId, assignments: { create: { mentorId: mentors[index] } } } } } });
  });
  afterAll(async () => { vi.restoreAllMocks(); await cleanup(); await prisma.$disconnect(); });

  it("copies template wording/domain/prompt and preserves it after an Admin edit and deactivation", async () => {
    const quest = await assign(); const before = await getStudentQuest(students[0], quest.id);
    expect(before).toMatchObject({ title: template.title, description: template.description, domain: template.domain,
      reflectionPromptSnapshot: template.reflectionPrompt, dueAt: new Date("2026-09-25"), status: "ACTIVE" });
    await updateQuestTemplate("user-admin-001", templateId, { ...template, title: "Changed template", description: "This is different template wording for later experiments.",
      domain: "HELP_SEEKING", active: "false", defaultDurationDays: 14, reflectionPrompt: "A changed reflection prompt?" });
    expect(await getStudentQuest(students[0], quest.id)).toEqual(before);
    expect((await listMentorQuests(mentors[0], students[0]))[0]).toEqual(before);
    await expect(assign()).rejects.toThrow("no longer available");
  });
  it("supports custom and customized Quests without changing their source template", async () => {
    const custom = await assign({ questTemplateId: undefined, title: "One first step", description: "Write down one small first step before starting a task.", domain: "ORGANISATION", dueDate: "2026-09-20" });
    const customized = await assign({ title: "Try an early start", description: "Start a particular assignment for 15 minutes on Tuesday.", domain: "STUDY_CONFIDENCE" });
    expect(await getStudentQuest(students[0], custom.id)).toMatchObject({ domain: "ORGANISATION", reflectionPromptSnapshot: "What did you notice?" });
    expect(await getStudentQuest(students[0], customized.id)).toMatchObject({ title: "Try an early start", domain: "WORK_START" });
    expect(await prisma.questTemplate.findUniqueOrThrow({ where: { id: templateId } })).toMatchObject(template);
  });
  it("enforces two active Quests across concurrent assignments and semesters, releasing a slot after cancellation", async () => {
    const results = await Promise.allSettled(Array.from({ length: 5 }, () => assign()));
    expect(results.filter(({ status }) => status === "fulfilled")).toHaveLength(2);
    expect(results.filter(({ status }) => status === "rejected")).toHaveLength(3);
    for (const result of results) if (result.status === "rejected") expect(result.reason.message).toBe(activeQuestLimitMessage);
    await prisma.studentProfile.update({ where: { id: students[0] }, data: { semesterId: "semester-2026-autumn" } });
    await expect(assign()).rejects.toThrow(activeQuestLimitMessage);
    const original = (await listStudentQuests(students[0]))[0];
    await cancelQuest(mentors[0], { studentId: students[0], questId: original.id }, now);
    await assign();
    expect((await listStudentQuests(students[0])).map(({ status }) => status).sort()).toEqual(["ACTIVE", "ACTIVE", "CANCELLED"]);
  });
  it("enforces bounded unique capacity slots directly in PostgreSQL", async () => {
    const quest = await assign(); const row = await prisma.questAssignment.findUniqueOrThrow({ where: { id: quest.id } });
    for (const activeSlot of [null, 0, 3, 1]) await expect(prisma.questAssignment.create({ data: { ...row, id: randomUUID(), submissionKey: randomUUID(), activeSlot } })).rejects.toThrow();
    expect(await prisma.questAssignment.count({ where: { studentId: students[0] } })).toBe(1);
  });
  it("deduplicates concurrent assignment retries and creates one minimal audit", async () => {
    const value = input(); const results = await Promise.all(Array.from({ length: 3 }, () => assignQuest(mentors[0], value, now)));
    expect(new Set(results.map(({ id }) => id)).size).toBe(1);
    expect(await prisma.auditEvent.count({ where: { entityId: results[0].id, action: "QUEST_ASSIGNED" } })).toBe(1);
  });
  it.each(["", "missing", students[0], "user-admin-001", mentors[1]])("denies assignment, cancellation, form and review to unauthorized actor %s", async (actor) => {
    const quest = await assign();
    await expect(assignQuest(actor, input(), now)).rejects.toThrow();
    await expect(cancelQuest(actor, { studentId: students[0], questId: quest.id }, now)).rejects.toThrow();
    await expect(listMentorQuests(actor, students[0])).rejects.toThrow();
    await expect(getQuestAssignmentForm(actor, students[0])).rejects.toThrow();
    expect((await getStudentQuest(students[0], quest.id)).status).toBe("ACTIVE");
  });
  it.each(["YES", "PARTLY", "NO"])("completes after attempt %s, including overdue experiments and optional text", async (attempted) => {
    const quest = await assign();
    await reflectOnQuest(students[0], { questId: quest.id, attempted, helpful: "NOT_SURE" }, new Date("2026-10-01T12:00Z"));
    expect(await getStudentQuest(students[0], quest.id)).toMatchObject({ status: "COMPLETED", completedAt: new Date("2026-10-01T12:00Z"), reflection: { attempted, helpful: "NOT_SURE", reflectionText: null } });
    expect(questMilestones(await listStudentQuests(students[0]))).toEqual(["First Quest reflection completed"]);
    await expect(cancelQuest(mentors[0], { studentId: students[0], questId: quest.id }, now)).rejects.toThrow("already completed");
  });
  it("prevents double reflection and reopens capacity only once", async () => {
    const quest = await assign(); await assign();
    const results = await Promise.allSettled([reflect(quest.id), reflect(quest.id)]);
    expect(results.filter(({ status }) => status === "fulfilled")).toHaveLength(1);
    expect(await prisma.questReflection.count({ where: { questAssignmentId: quest.id } })).toBe(1);
    expect(await prisma.auditEvent.count({ where: { entityId: quest.id, action: "QUEST_COMPLETED" } })).toBe(1);
    await assign(); await expect(assign()).rejects.toThrow(activeQuestLimitMessage);
  });
  it.each([students[1], mentors[0], "user-admin-001", ""])("denies Student detail and reflection to actor %s", async (actor) => {
    const quest = await assign();
    await expect(getStudentQuest(actor, quest.id)).rejects.toThrow();
    await expect(reflectOnQuest(actor, { questId: quest.id, attempted: "YES", helpful: "YES" }, now)).rejects.toThrow();
    if (actor === students[1]) expect(await listStudentQuests(actor)).toEqual([]);
    else await expect(listStudentQuests(actor)).rejects.toThrow();
  });
  it("validates and isolates optional conversation/agreement links without private data", async () => {
    const own = await conversation(); const other = await conversation(1);
    const quest = await assign({ sharedAgreementId: own.agreementId });
    expect((await prisma.questAssignment.findUniqueOrThrow({ where: { id: quest.id } })).mentoringConversationId).toBe(own.id);
    const studentView = await getStudentQuest(students[0], quest.id);
    expect(studentView.sharedAgreement?.text).toBe("Start one assignment earlier this week.");
    for (const view of [studentView, await listStudentQuests(students[0]), await listMentorQuests(mentors[0], students[0])]) {
      expect(JSON.stringify(view)).not.toMatch(/PRIVATE|INTERNAL|privateNote|followUp|observation|mentoringConversationId|mentorId|activeSlot|passwordHash|submissionKey/);
    }
    await expect(assign({ mentoringConversationId: other.id })).rejects.toThrow();
    await expect(assign({ sharedAgreementId: other.agreementId })).rejects.toThrow();
    await expect(assign({ mentoringConversationId: other.id, sharedAgreementId: own.agreementId })).rejects.toThrow();
    await expect(getQuestAssignmentForm(mentors[0], students[0], other.id)).rejects.toThrow();
    const row = await prisma.questAssignment.findUniqueOrThrow({ where: { id: quest.id } });
    await expect(prisma.questAssignment.create({ data: { ...row, id: randomUUID(), submissionKey: randomUUID(), activeSlot: 2, sharedAgreementId: other.agreementId } })).rejects.toThrow();
  });
  it("retains cancelled history and rejects reflection on a cancelled Quest", async () => {
    const quest = await assign(); const change = { studentId: students[0], questId: quest.id };
    await cancelQuest(mentors[0], change, now); await cancelQuest(mentors[0], change, now);
    expect(await getStudentQuest(students[0], quest.id)).toMatchObject({ status: "CANCELLED", cancelledAt: now, reflection: null });
    await expect(reflect(quest.id)).rejects.toThrow("cancelled");
    expect(await prisma.auditEvent.count({ where: { entityId: quest.id, action: "QUEST_CANCELLED" } })).toBe(1);
  });
  it("serializes cancellation against reflection without a partially completed Quest", async () => {
    const quest = await assign();
    const results = await Promise.allSettled([reflect(quest.id), cancelQuest(mentors[0], { studentId: students[0], questId: quest.id }, now)]);
    expect(results.filter(({ status }) => status === "fulfilled")).toHaveLength(1);
    const stored = await getStudentQuest(students[0], quest.id);
    expect(stored.reflection !== null).toBe(stored.status === "COMPLETED");
  });
  it("removes old Mentor access after reassignment while retaining Student and new Mentor access", async () => {
    const quest = await assign();
    await prisma.mentorAssignment.updateMany({ where: { studentId: students[0], active: true }, data: { active: false, deactivatedAt: now } });
    await prisma.mentorAssignment.create({ data: { studentId: students[0], mentorId: mentors[1] } });
    await expect(listMentorQuests(mentors[0], students[0])).rejects.toThrow();
    await expect(cancelQuest(mentors[0], { studentId: students[0], questId: quest.id }, now)).rejects.toThrow();
    await expect(assign()).rejects.toThrow();
    await reflect(quest.id, { reflectionText: "A useful observation." });
    expect((await listMentorQuests(mentors[1], students[0]))[0].reflection?.reflectionText).toBe("A useful observation.");
  });
  it("never changes linked Observation status or existing mentoring history on completion", async () => {
    const linked = await conversation();
    const observation = await prisma.observation.create({ data: { studentId: students[0], semesterId, domain: "WORK_START", type: "WORSENING_PATTERN", ruleKey: "phase08-pattern", episodeKey: "initial", title: "Getting started", summary: "Historical evidence", firstDetectedAt: now, lastDetectedAt: now } });
    await prisma.mentoringConversationObservation.create({ data: { conversationId: linked.id, observationId: observation.id, studentId: students[0] } });
    const before = await prisma.mentoringConversation.findUniqueOrThrow({ where: { id: linked.id }, include: { sharedAgreement: true, followUps: true } });
    const quest = await assign({ mentoringConversationId: linked.id, sharedAgreementId: linked.agreementId });
    await reflect(quest.id, { attempted: "YES", helpful: "YES", reflectionText: "PRIVATE STUDENT REFLECTION" });
    expect(await prisma.observation.findUniqueOrThrow({ where: { id: observation.id } })).toEqual(observation);
    expect(await prisma.mentoringConversation.findUniqueOrThrow({ where: { id: linked.id }, include: { sharedAgreement: true, followUps: true } })).toEqual(before);
    expect(JSON.stringify(await prisma.auditEvent.findMany({ where: { actorUserId: students[0] } }))).not.toContain("PRIVATE STUDENT REFLECTION");
  });
  it("rolls back assignment and reflection if their final audit fails", async () => {
    vi.spyOn(audit, "recordAuditEvent").mockImplementationOnce(() => { throw new Error("audit unavailable"); });
    await expect(assign()).rejects.toThrow("audit unavailable");
    expect(await listStudentQuests(students[0])).toEqual([]); vi.restoreAllMocks();
    const quest = await assign(); const realAudit = audit.recordAuditEvent;
    vi.spyOn(audit, "recordAuditEvent").mockImplementation((tx, event) => { if (event.action === "QUEST_COMPLETED") throw new Error("final audit unavailable"); return realAudit(tx, event); });
    await expect(reflect(quest.id)).rejects.toThrow("final audit unavailable");
    expect(await getStudentQuest(students[0], quest.id)).toMatchObject({ status: "ACTIVE", reflection: null });
    expect(await prisma.auditEvent.count({ where: { actorUserId: students[0] } })).toBe(0);
  });
  it("protects immutable snapshots/reflections and disallows completion without a reflection", async () => {
    const quest = await assign();
    await expect(prisma.questAssignment.update({ where: { id: quest.id }, data: { title: "Rewritten" } })).rejects.toThrow();
    await expect(prisma.questAssignment.update({ where: { id: quest.id }, data: { status: "COMPLETED", completedAt: now, activeSlot: null } })).rejects.toThrow();
    await expect(prisma.questReflection.create({ data: { questAssignmentId: quest.id, attempted: "YES", helpful: "YES", submittedAt: now } })).rejects.toThrow();
    await reflect(quest.id); const reflection = await prisma.questReflection.findUniqueOrThrow({ where: { questAssignmentId: quest.id } });
    await expect(prisma.questReflection.update({ where: { id: reflection.id }, data: { attempted: "YES" } })).rejects.toThrow();
  });
  it("rechecks deactivation for owner reads/writes and Mentor review", async () => {
    const quest = await assign(); await prisma.user.update({ where: { id: students[0] }, data: { active: false } });
    await expect(getStudentQuest(students[0], quest.id)).rejects.toThrow(); await expect(reflect(quest.id)).rejects.toThrow();
    await expect(listMentorQuests(mentors[0], students[0])).rejects.toThrow(); await expect(assign()).rejects.toThrow();
  });
});
