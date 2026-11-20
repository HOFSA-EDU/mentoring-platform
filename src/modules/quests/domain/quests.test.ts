import { describe, expect, it } from "vitest";
import { isQuestOverdue, questDateAfterDays, questMilestones } from "./presentation";
import { assignmentInput, questDueDate, reflectionInput } from "./validation";

describe("Quest reflection semantics and dates", () => {
  it.each(["YES", "PARTLY", "NO"])("accepts %s as a reflection, with no success condition", (attempted) => {
    expect(reflectionInput.parse({ questId: "quest", attempted, helpful: "NOT_SURE" })).toMatchObject({ attempted, helpful: "NOT_SURE", reflectionText: null });
  });
  it.each(["YES", "A_LITTLE", "NO", "NOT_SURE"])("accepts helpfulness %s independently of the attempt", (helpful) => {
    expect(reflectionInput.safeParse({ questId: "quest", attempted: "NO", helpful, reflectionText: "  " }).success).toBe(true);
  });
  it.each([{ attempted: "FAILED", helpful: "YES" }, { attempted: "YES", helpful: "" }, { attempted: "PARTLY", helpful: "A_LITTLE", reflectionText: "x".repeat(2001) }])("rejects invalid reflection %j", (values) => {
    expect(reflectionInput.safeParse({ questId: "quest", ...values }).success).toBe(false);
  });
  it("bases quiet milestones on saved reflections rather than attempted/helpful answers", () => {
    const completed = { status: "COMPLETED" as const, reflection: { attempted: "NO", helpful: "NOT_SURE" } };
    expect(questMilestones([{ status: "CANCELLED", reflection: null }, { status: "ACTIVE", reflection: null }])).toEqual([]);
    expect(questMilestones([{ status: "COMPLETED", reflection: null }])).toEqual([]);
    expect(questMilestones([completed])).toEqual(["First Quest reflection completed"]);
    expect(questMilestones([completed, completed, completed])).toEqual(["First Quest reflection completed", "3 Quests reflected on"]);
  });
  it("uses Luxembourg date boundaries and never labels completed/cancelled experiments overdue", () => {
    const now = new Date("2026-09-17T22:30:00Z");
    expect(isQuestOverdue({ status: "ACTIVE", dueAt: new Date("2026-09-17") }, now)).toBe(true);
    expect(isQuestOverdue({ status: "ACTIVE", dueAt: new Date("2026-09-18") }, now)).toBe(false);
    for (const status of ["COMPLETED", "CANCELLED"] as const) expect(isQuestOverdue({ status, dueAt: new Date("2026-09-17") }, now)).toBe(false);
    expect(questDateAfterDays("2026-03-28", 2)).toBe("2026-03-30");
    expect(questDateAfterDays("2026-12-30", 7)).toBe("2027-01-06");
    expect(questDueDate(undefined, 7, now)).toEqual(new Date("2026-09-25"));
  });
  it.each(["invalid", "2026-02-30", "2026-09-17", "2028-01-01"])("rejects invalid/out-of-window due date %s", (date) => {
    expect(() => questDueDate(date, 7, new Date("2026-09-18T12:00Z"))).toThrow();
  });
  it.each([{ title: " " }, { title: "x".repeat(101) }, { description: "Too short" }, { description: "x".repeat(1001) }, { domain: "RISK" }])("rejects invalid assignment %j", (values) => {
    expect(assignmentInput.safeParse({ studentId: "student", submissionKey: "2f515c53-f18b-4d91-963a-6718e77a035e", ...values }).success).toBe(false);
  });
});
