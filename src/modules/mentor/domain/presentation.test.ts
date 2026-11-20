import { describe, expect, it } from "vitest";
import { answer, checkIn, reflectionNow } from "@/modules/journey/domain/fixtures.test-support";
import { buildStudentReflections, type ReflectionCheckIn } from "@/modules/journey/domain/reflections";
import { mentorReflection, orderMentorStudents, summarizeMentorStudent } from "./presentation";

function summarize(checkIns: ReflectionCheckIn[], overrides = {}) {
  return summarizeMentorStudent({
    id: "student", user: { name: "Student" },
    semester: { id: "autumn", name: "Autumn", active: true,
      startDate: new Date("2026-09-01T00:00:00Z"), endDate: new Date("2027-01-31T00:00:00Z") },
    checkIns, ...overrides,
  }, reflectionNow);
}

describe("Mentor presentation of shared reflection evidence", () => {
  it.each([
    ["YES", "CONVERSATION_REQUESTED"], ["MAYBE", "MAYBE_CONVERSATION"], ["NO", "NO_CURRENT_SIGNAL"],
  ] as const)("keeps %s conversation state distinct", (signal, attention) => {
    const result = summarize([checkIn("2026-10-01", [], { mentorConversationRequest: signal })]);
    expect(result.recentSignal).toBe(signal);
    expect(result.attention).toBe(attention);
    expect(result.completion).toBe("Completed this week");
    expect(result).not.toHaveProperty("score");
  });

  it("orders YES, formal difficulty, MAYBE, then everyone else with stable alphabetical ties", () => {
    const students = [
      { id: "z", name: "Zoe", attention: "NO_CURRENT_SIGNAL" as const },
      { id: "c", name: "Chris", attention: "OBSERVATION" as const },
      { id: "m", name: "May", attention: "MAYBE_CONVERSATION" as const },
      { id: "y", name: "Yasmin", attention: "CONVERSATION_REQUESTED" as const },
      { id: "a", name: "Amy", attention: "NO_CURRENT_SIGNAL" as const },
    ];
    expect(orderMentorStudents(students).map(({ id }) => id)).toEqual(["y", "c", "m", "a", "z"]);
    expect(students[0].id).toBe("z");
  });

  it("only elevates current or previous ISO-week conversation responses", () => {
    expect(summarize([checkIn("2026-09-24", [], { mentorConversationRequest: "YES" })]).recentSignal).toBe("YES");
    const older = summarize([checkIn("2026-09-17", [], { mentorConversationRequest: "YES" })]);
    expect(older.latest?.conversation).toBe("YES");
    expect(older.recentSignal).toBeNull();
    expect(older.attention).toBe("NO_CURRENT_SIGNAL");
    const newestNo = summarize([
      checkIn("2026-09-24", [], { mentorConversationRequest: "YES" }), checkIn("2026-10-01"),
    ]);
    expect(newestNo.recentSignal).toBe("NO");
    expect(newestNo.attention).toBe("NO_CURRENT_SIGNAL");
  });

  it("uses exactly the shared qualitative result for recent changes", () => {
    const history = [checkIn("2026-09-24", [answer(1)]), checkIn("2026-10-01", [answer(3)])];
    const shared = buildStudentReflections(history, "autumn", reflectionNow);
    const area = shared.areas.find(({ domain }) => domain === "WORK_START")!;
    expect(area.category).toBe("MORE_DIFFICULT");
    expect(summarize(history)).toMatchObject({ attention: "NO_CURRENT_SIGNAL", recentChange: { text: mentorReflection(area) } });
  });

  it.each(["I am not sure.", "Not applicable.", "Neither easy nor difficult."])("does not elevate neutral evidence: %s", (label) => {
    const history = [checkIn("2026-09-24", [answer(1)]), checkIn("2026-10-01", [answer(null, { optionLabelSnapshot: label })])];
    expect(summarize(history)).toMatchObject({ attention: "NO_CURRENT_SIGNAL", recentChange: null });
  });

  it("preserves mixed directions without inventing a negative signal", () => {
    const history = [
      checkIn("2026-09-24", [answer(1), answer(3, { questionId: "second" })]),
      checkIn("2026-10-01", [answer(3), answer(1, { questionId: "second" })]),
    ];
    const area = buildStudentReflections(history, "autumn", reflectionNow).areas.find(({ domain }) => domain === "WORK_START")!;
    expect(area.category).toBe("MIXED");
    expect(mentorReflection(area)).toContain("mixed");
    expect(summarize(history).attention).toBe("NO_CURRENT_SIGNAL");
  });

  it("does not use onboarding, other semesters, future or legacy metadata as trend evidence", () => {
    const history = [
      checkIn("2026-09-10", [answer(1)], { kind: "ONBOARDING", periodKey: "ONBOARDING" }),
      checkIn("2026-09-17", [answer(1)], { semesterId: "previous" }),
      checkIn("2026-09-24", [answer(1, { domainSnapshot: null, stableSnapshot: null, questionSignatureSnapshot: null })]),
      checkIn("2026-10-01", [answer(3)]),
      checkIn("2026-10-08", [answer(3)], { mentorConversationRequest: "YES" }),
    ];
    expect(summarize(history)).toMatchObject({ onboarded: true, attention: "NO_CURRENT_SIGNAL", recentChange: null });
  });

  it("handles no data and does not present an inactive semester signal as current", () => {
    expect(summarize([])).toMatchObject({ onboarded: false, latest: null, recentChange: null, completion: "Onboarding not completed" });
    const result = summarize([checkIn("2026-10-01", [], { mentorConversationRequest: "YES" })], {
      semester: { id: "autumn", name: "Autumn", active: false,
        startDate: new Date("2026-09-01"), endDate: new Date("2027-01-31") },
    });
    expect(result).toMatchObject({ attention: "NO_CURRENT_SIGNAL", completion: "Outside the Check-in window" });
  });
});
