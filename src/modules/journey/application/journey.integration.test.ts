import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { getStudentJourney } from "./queries";
import { getStudentCheckIn, getStudentDashboardData } from "@/modules/check-ins/application/queries";

const prefix = "phase04-integration";
const now = new Date("2026-09-17T12:00:00Z");
const actors = [`${prefix}-a`, `${prefix}-b`];
const questionId = `${prefix}-question`;
const signature = "a".repeat(64);

async function cleanup() {
  await prisma.checkIn.deleteMany({ where: { studentId: { in: actors } } });
  await prisma.user.deleteMany({ where: { id: { in: actors } } });
  await prisma.question.deleteMany({ where: { id: questionId } });
  await prisma.semester.deleteMany({ where: { id: `${prefix}-semester` } });
}

describe.sequential("owned Student Journey and immutable evidence", () => {
  beforeAll(async () => {
    await cleanup();
    await prisma.semester.create({ data: {
      id: `${prefix}-semester`, name: `${prefix} semester`, active: false,
      startDate: new Date("2026-09-01T00:00:00Z"), endDate: new Date("2027-01-31T00:00:00Z"),
    } });
    await prisma.question.create({ data: {
      id: questionId, key: "PHASE04_TEST_SNAPSHOT", text: "The current wording is different.",
      domain: "ORGANISATION", stable: false, active: false, type: "SINGLE_CHOICE", sortOrder: 999,
    } });
    for (const actor of actors) {
      await prisma.user.create({ data: {
        id: actor, name: actor, email: `${actor}@example.test`, passwordHash: "unused", role: "STUDENT",
        studentProfile: { create: { id: actor, semesterId: `${prefix}-semester` } },
      } });
      for (const [index, value] of [3, 1].entries()) {
        await prisma.checkIn.create({ data: {
          id: `${actor}-${index}`, studentId: actor, semesterId: `${prefix}-semester`, kind: "WEEKLY",
          periodKey: `2026-W${37 + index}`, submittedAt: new Date(`2026-09-${10 + 7 * index}T10:00:00Z`),
          mentorConversationRequest: actor === actors[0] ? "MAYBE" : "YES",
          answers: { create: {
            questionId, selectedOptionId: `historic-${value}`, questionTextSnapshot: "How often did you delay getting started?",
            optionLabelSnapshot: actor === actors[0] ? (value === 3 ? "Several times." : "Once.") : "Student B private answer.",
            directionValueSnapshot: value, domainSnapshot: "WORK_START", stableSnapshot: true,
            questionSignatureSnapshot: signature, sortOrder: 1,
          } },
        } });
      }
    }
  });
  afterAll(async () => { await cleanup(); await prisma.$disconnect(); });

  it("returns only the actor's reflections and safe presentation data", async () => {
    const result = await getStudentJourney(actors[0], now);
    expect(result.reflections.areas.find((area) => area.domain === "WORK_START")?.category).toBe("IMPROVING");
    expect(result.reflections.comparisons[0]).toMatchObject({ previousAnswer: "Several times.", currentAnswer: "Once." });
    expect(result.mentorSignal?.state).toBe("MAYBE");
    expect(result.continuity.weeklyCount).toBe(2);
    expect(JSON.stringify(result)).not.toContain("Student B private answer");
    expect(JSON.stringify(result)).not.toMatch(/directionValue|questionSignatureSnapshot/);
    await expect(getStudentCheckIn(actors[0], `${actors[1]}-1`)).rejects.toThrow("Check-in not found");
  });

  it.each(["", "missing-user", "user-admin-001", "user-mentor-001"])("rejects unauthorized actor %s", async (actor) => {
    await expect(getStudentJourney(actor, now)).rejects.toThrow("active Student account");
  });

  it("keeps historic wording, domain and reflection after current question edits", async () => {
    const before = await getStudentJourney(actors[0], now);
    await prisma.question.update({ where: { id: questionId }, data: {
      text: "An edited question for future answers.", domain: "HELP_SEEKING", stable: false,
    } });
    const after = await getStudentJourney(actors[0], now);
    expect(after.reflections).toEqual(before.reflections);
    const detail = await getStudentCheckIn(actors[0], `${actors[0]}-1`);
    expect(detail.answers[0]).toMatchObject({
      questionTextSnapshot: "How often did you delay getting started?",
      optionLabelSnapshot: "Once.", domainSnapshot: "WORK_START",
    });
  });

  it("allows history in an inactive semester without offering a weekly period", async () => {
    expect((await getStudentDashboardData(actors[0], now)).period).toBeNull();
    expect((await getStudentJourney(actors[0], now)).reflections.areas).toHaveLength(6);
  });

  it("rechecks account deactivation", async () => {
    await prisma.user.update({ where: { id: actors[1] }, data: { active: false } });
    await expect(getStudentJourney(actors[1], now)).rejects.toThrow("active Student account");
  });
});
