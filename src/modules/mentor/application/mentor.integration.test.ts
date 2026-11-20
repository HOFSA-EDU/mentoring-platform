import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { getStudentJourney } from "@/modules/journey/application/queries";
import { getMentorCheckIn, getMentorStudentDetail, listMentorStudents } from "./queries";

const prefix = "phase05-integration";
const students = ["a", "b", "c"].map((id) => `${prefix}-student-${id}`);
const mentors = ["a", "b", "empty"].map((id) => `${prefix}-mentor-${id}`);
const semesterId = `${prefix}-semester`;
const questionId = `${prefix}-question`;
const now = new Date("2026-09-17T12:00:00Z");
const originalText = "How often did you delay getting started?";

async function cleanup() {
  await prisma.auditEvent.deleteMany({ where: { OR: [{ actorUserId: { in: students } }, { entityId: { in: (await prisma.observation.findMany({ where: { studentId: { in: students } }, select: { id: true } })).map(({ id }) => id) } }] } });
  await prisma.observation.deleteMany({ where: { studentId: { in: students } } });
  await prisma.mentorAssignment.deleteMany({ where: { studentId: { in: students } } });
  await prisma.checkIn.deleteMany({ where: { studentId: { in: students } } });
  await prisma.user.deleteMany({ where: { id: { in: [...students, ...mentors] } } });
  await prisma.question.deleteMany({ where: { id: questionId } });
  await prisma.semester.deleteMany({ where: { id: semesterId } });
}

describe.sequential("Mentor assignment-scoped reads and immutable history", () => {
  beforeAll(async () => {
    await cleanup();
    await prisma.semester.create({ data: { id: semesterId, name: prefix, active: false,
      startDate: new Date("2026-09-01"), endDate: new Date("2027-01-31") } });
    await prisma.question.create({ data: { id: questionId, key: "PHASE05_SNAPSHOT_TEST", text: "Current wording",
      domain: "ORGANISATION", type: "SINGLE_CHOICE", stable: false, active: false, sortOrder: 999 } });
    for (const id of mentors) {
      await prisma.user.create({ data: { id, name: id, email: `${id}@example.test`, passwordHash: "unused", role: "MENTOR",
        mentorProfile: { create: { id } } } });
    }
    for (const [index, id] of students.entries()) {
      await prisma.user.create({ data: { id, name: id, email: `${id}@example.test`, passwordHash: "unused", role: "STUDENT",
        studentProfile: { create: { id, semesterId, assignments: { create: { mentorId: mentors[index === 2 ? 1 : 0] } } } } } });
      for (const [week, value] of [1, 3].entries()) {
        await prisma.checkIn.create({ data: {
          id: `${id}-${week}`, studentId: id, semesterId, kind: "WEEKLY", periodKey: `2026-W${37 + week}`,
          submittedAt: new Date(`2026-09-${10 + week * 7}T10:00:00Z`), mentorConversationRequest: index === 0 ? "YES" : "MAYBE",
          answers: { create: { questionId, selectedOptionId: `historical-${value}`, questionTextSnapshot: originalText,
            optionLabelSnapshot: value === 1 ? "Once." : "Several times.", directionValueSnapshot: value,
            domainSnapshot: "WORK_START", stableSnapshot: true, questionSignatureSnapshot: "a".repeat(64), sortOrder: 1 } },
        } });
      }
    }
  });
  afterAll(async () => { await cleanup(); await prisma.$disconnect(); });

  it("lists only active assigned students and leaves no raw/security data in presentation", async () => {
    const result = await listMentorStudents(mentors[0], now);
    expect(result.map(({ id }) => id)).toEqual(students.slice(0, 2));
    expect(JSON.stringify(result)).not.toMatch(/passwordHash|directionValue|questionSignature|auditEvents/);
    expect(await listMentorStudents(mentors[2], now)).toEqual([]);
  });

  it("shares Student reflection categories and permits assigned historical answers", async () => {
    const detail = await getMentorStudentDetail(mentors[0], students[0], now);
    const student = await getStudentJourney(students[0], now);
    expect(detail.areas.map(({ category }) => category)).toEqual(student.reflections.areas.map(({ category }) => category));
    expect(detail.changes[0]).toMatchObject({ domain: "WORK_START", category: "MORE_DIFFICULT" });
    expect(detail.history).toHaveLength(2);
    const history = await getMentorCheckIn(mentors[0], students[0], `${students[0]}-1`);
    expect(history.answers[0]).toMatchObject({ questionTextSnapshot: originalText, optionLabelSnapshot: "Several times.", domainSnapshot: "WORK_START" });
    expect(JSON.stringify({ detail, history })).not.toMatch(/passwordHash|directionValue|questionSignature|auditEvents/);
  });

  it.each(["", "missing-user", "user-admin-001", students[0]])("rejects unauthorized actor %s in all services", async (actor) => {
    await expect(listMentorStudents(actor, now)).rejects.toThrow();
    await expect(getMentorStudentDetail(actor, students[0], now)).rejects.toThrow();
    await expect(getMentorCheckIn(actor, students[0], `${students[0]}-1`)).rejects.toThrow();
  });

  it("rejects unassigned students and mismatched history IDs, including another assigned student", async () => {
    await expect(getMentorStudentDetail(mentors[0], students[2], now)).rejects.toThrow();
    await expect(getMentorCheckIn(mentors[0], students[2], `${students[2]}-1`)).rejects.toThrow();
    await expect(getMentorCheckIn(mentors[0], students[0], `${students[1]}-1`)).rejects.toThrow();
    await expect(getMentorStudentDetail(mentors[0], "missing", now)).rejects.toThrow();
  });

  it("preserves snapshots and reflections after question edits", async () => {
    const before = await getMentorStudentDetail(mentors[0], students[0], now);
    await prisma.question.update({ where: { id: questionId }, data: { text: "Edited after submission", domain: "HELP_SEEKING" } });
    expect((await getMentorStudentDetail(mentors[0], students[0], now)).areas).toEqual(before.areas);
    expect((await getMentorCheckIn(mentors[0], students[0], `${students[0]}-1`)).answers[0].questionTextSnapshot).toBe(originalText);
  });

  it.each(["student-account", "student-profile", "mentor-account", "mentor-profile"])("rechecks deactivation: %s", async (kind) => {
    const id = kind.startsWith("student") ? students[0] : mentors[0];
    const setActive = (active: boolean) => kind.endsWith("account")
      ? prisma.user.update({ where: { id }, data: { active } })
      : kind === "student-profile" ? prisma.studentProfile.update({ where: { id }, data: { active } })
        : prisma.mentorProfile.update({ where: { id }, data: { active } });
    await setActive(false);
    try {
      await expect(getMentorStudentDetail(mentors[0], students[0], now)).rejects.toThrow();
      await expect(getMentorCheckIn(mentors[0], students[0], `${students[0]}-1`)).rejects.toThrow();
      if (kind.startsWith("mentor")) await expect(listMentorStudents(mentors[0], now)).rejects.toThrow();
      else expect((await listMentorStudents(mentors[0], now)).map(({ id }) => id)).not.toContain(students[0]);
    } finally { await setActive(true); }
  });

  it("takes effect immediately on reassignment and never restores access through historical assignments", async () => {
    await prisma.mentorAssignment.updateMany({ where: { studentId: students[0], active: true }, data: { active: false, deactivatedAt: now } });
    await prisma.mentorAssignment.create({ data: { studentId: students[0], mentorId: mentors[1] } });
    expect((await listMentorStudents(mentors[0], now)).map(({ id }) => id)).not.toContain(students[0]);
    await expect(getMentorStudentDetail(mentors[0], students[0], now)).rejects.toThrow();
    await expect(getMentorCheckIn(mentors[0], students[0], `${students[0]}-1`)).rejects.toThrow();
    expect((await getMentorCheckIn(mentors[1], students[0], `${students[0]}-1`)).id).toBe(`${students[0]}-1`);
  });
});
