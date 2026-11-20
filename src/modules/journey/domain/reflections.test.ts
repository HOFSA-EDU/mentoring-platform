import { describe, expect, it } from "vitest";

import { answer, checkIn, reflectionNow } from "./fixtures.test-support";
import { buildStudentReflections, domainLabels, type ReflectionAnswer, type ReflectionCheckIn } from "./reflections";

function reflect(checkIns: ReflectionCheckIn[]) {
  return buildStudentReflections(checkIns, "autumn", reflectionNow);
}

function workStart(checkIns: ReflectionCheckIn[]) {
  return reflect(checkIns).areas.find((area) => area.domain === "WORK_START")!;
}

describe("student reflection evidence", () => {
  it("uses all six student-friendly domain labels", () => {
    expect(Object.values(domainLabels)).toEqual([
      "Keeping track", "Getting started", "Asking for help", "Understanding", "Managing workload", "Taking on challenges",
    ]);
    expect(reflect([]).areas).toHaveLength(6);
  });

  it.each([
    { checkIns: [] },
    { checkIns: [checkIn("2026-10-01", [answer(2)])] },
  ])("needs at least two weekly answers", ({ checkIns }) => {
    expect(workStart(checkIns).category).toBe("NOT_ENOUGH_DATA");
    expect(reflect(checkIns).recentChanges).toEqual([]);
    expect(reflect(checkIns).comparisons).toEqual([]);
  });

  it.each([
    [1, 1, "STABLE"],
    [3, 1, "IMPROVING"],
    [0, 2, "MORE_DIFFICULT"],
  ])("compares reported directions %s then %s descriptively", (previous, current, expected) => {
    expect(workStart([
      checkIn("2026-09-24", [answer(previous as number)]),
      checkIn("2026-10-01", [answer(current as number)]),
    ]).category).toBe(expected);
  });

  it.each(["I did not need help this week.", "There was no situation like this.", "I am not sure."])(
    "does not turn the unscored answer '%s' into difficulty", (label) => {
      const checkIns = [checkIn("2026-09-24", [answer(2)]), checkIn("2026-10-01", [answer(null, { optionLabelSnapshot: label })])];
      expect(workStart(checkIns).category).toBe("NOT_ENOUGH_DATA");
      expect(reflect(checkIns).comparisons).toEqual([]);
      expect(reflect(checkIns).recentChanges).toEqual([]);
    },
  );

  it("can compare two directional answers while omitting an intervening neutral answer", () => {
    expect(workStart([
      checkIn("2026-09-17", [answer(2)]),
      checkIn("2026-09-24", [answer(null)]),
      checkIn("2026-10-01", [answer(1)]),
    ]).category).toBe("IMPROVING");
  });

  it("keeps conflicting question directions mixed instead of averaging", () => {
    const other = { questionId: "first-step", stableSnapshot: false, questionSignatureSnapshot: "other-schema" };
    const checkIns = [
      checkIn("2026-09-24", [answer(3), answer(0, other)]),
      checkIn("2026-10-01", [answer(0), answer(3, other)]),
    ];
    expect(workStart(checkIns).category).toBe("MIXED");
    expect(workStart(checkIns).text).toContain("mixed");
    expect(reflect(checkIns).recentChanges).toEqual([]);
  });

  it("uses the latest comparable pair for a question rather than an accumulated average", () => {
    expect(workStart([
      checkIn("2026-09-10", [answer(0)]),
      checkIn("2026-09-17", [answer(3)]),
      checkIn("2026-09-24", [answer(2)]),
      checkIn("2026-10-01", [answer(1)]),
    ]).category).toBe("IMPROVING");
  });

  it("does not compare different questions merely because their domains match", () => {
    expect(workStart([
      checkIn("2026-09-24", [answer(3)]),
      checkIn("2026-10-01", [answer(0, { questionId: "another-question" })]),
    ]).category).toBe("NOT_ENOUGH_DATA");
  });

  it.each<Partial<ReflectionAnswer>>([
    { questionSignatureSnapshot: "changed-unselected-option" },
    { questionSignatureSnapshot: "changed-direction-mapping" },
    { questionTextSnapshot: "A different question" },
    { domainSnapshot: "ORGANISATION" },
    { stableSnapshot: false },
  ])("does not bridge an edited question schema: %j", (overrides) => {
    const checkIns = [checkIn("2026-09-24", [answer(3)]), checkIn("2026-10-01", [answer(0, overrides)])];
    expect(reflect(checkIns).areas.every((area) => area.category === "NOT_ENOUGH_DATA")).toBe(true);
    expect(reflect(checkIns).comparisons).toEqual([]);
  });

  it("starts a new series if an old question version is restored", () => {
    expect(workStart([
      checkIn("2026-09-17", [answer(3)]),
      checkIn("2026-09-24", [answer(2, { questionSignatureSnapshot: "version-2" })]),
      checkIn("2026-10-01", [answer(0)]),
    ]).category).toBe("NOT_ENOUGH_DATA");
  });

  it("does not resurrect an old version's evidence when its newest answer is neutral", () => {
    expect(workStart([
      checkIn("2026-09-17", [answer(3)]),
      checkIn("2026-09-24", [answer(0)]),
      checkIn("2026-10-01", [answer(null, { questionSignatureSnapshot: "version-2" })]),
    ]).category).toBe("NOT_ENOUGH_DATA");
  });

  it.each<Partial<ReflectionAnswer>>([
    { domainSnapshot: null },
    { stableSnapshot: null },
    { questionSignatureSnapshot: null },
    { questionSignatureSnapshot: "" },
  ])("excludes legacy or incomplete metadata: %j", (overrides) => {
    expect(workStart([
      checkIn("2026-09-24", [answer(3, overrides)]),
      checkIn("2026-10-01", [answer(0, overrides)]),
    ]).category).toBe("NOT_ENOUGH_DATA");
  });

  it("excludes onboarding, other semesters, future dates and invalid periods", () => {
    const checkIns = [
      checkIn("2026-09-10", [answer(3)], { kind: "ONBOARDING", periodKey: "ONBOARDING" }),
      checkIn("2026-09-17", [answer(3)], { semesterId: "spring" }),
      checkIn("2026-09-24", [answer(3)], { periodKey: "2026-W99" }),
      checkIn("2026-10-01", [answer(0)]),
      checkIn("2026-10-08", [answer(3)]),
      checkIn("2026-09-03", [answer(3)], { periodKey: "2026-W41" }),
    ];
    expect(workStart(checkIns).category).toBe("NOT_ENOUGH_DATA");
  });

  it("excludes answers older than the current and previous five ISO weeks", () => {
    expect(workStart([
      checkIn("2026-08-20", [answer(3)]), // ISO week 34, outside the six-week window.
      checkIn("2026-10-01", [answer(0)]),
    ]).category).toBe("NOT_ENOUGH_DATA");
    expect(workStart([
      checkIn("2026-08-27", [answer(3)]), // ISO week 35, first included week.
      checkIn("2026-10-01", [answer(0)]),
    ]).category).toBe("IMPROVING");
  });

  it("does not leave stale recent-change statements when no Check-ins are recent", () => {
    const stale = reflect([checkIn("2026-07-09", [answer(3)]), checkIn("2026-07-16", [answer(0)])]);
    expect(stale.areas.every((area) => area.category === "NOT_ENOUGH_DATA")).toBe(true);
    expect(stale.recentChanges).toEqual([]);
  });

  it("does not count duplicate periods as independent weekly evidence", () => {
    expect(workStart([checkIn("2026-09-30", [answer(3)]), checkIn("2026-10-01", [answer(0)])]).category)
      .toBe("NOT_ENOUGH_DATA");
  });

  it("returns at most two meaningful recent changes without numeric directions or scores", () => {
    const domains = ["WORK_START", "ORGANISATION", "HELP_SEEKING"] as const;
    const makeAnswers = (value: number) => domains.map((domain) => answer(value, { questionId: domain, domainSnapshot: domain }));
    const result = reflect([checkIn("2026-09-24", makeAnswers(3)), checkIn("2026-10-01", makeAnswers(0))]);
    expect(result.recentChanges).toHaveLength(2);
    const allOutput = JSON.stringify(result);
    expect(allOutput).not.toMatch(/directionValue|score|rank|diagnos|risk|personality/i);
    expect(result.areas.every((area) => Object.values(area).every((value) => typeof value === "string"))).toBe(true);
  });
});

describe("weekly answer comparisons", () => {
  it("shows immutable wording and answer labels for the latest two weekly submissions", () => {
    const result = reflect([
      checkIn("2026-10-01", [answer(1)]),
      checkIn("2026-09-17", [answer(3)]),
      checkIn("2026-09-24", [answer(2)]),
    ]);
    expect(result.comparisons).toEqual([{
      domain: "WORK_START",
      label: "Getting started",
      questionText: "How often did you start later than intended?",
      previousAnswer: "Several times.",
      currentAnswer: "Once.",
      previousPeriod: "2026-W39",
      currentPeriod: "2026-W40",
      text: "You reported less difficulty with getting started with tasks in your latest Check-in than in the previous one.",
    }]);
  });

  it("never skips the previous Check-in to fill a missing comparison", () => {
    const result = reflect([
      checkIn("2026-09-17", [answer(3)]),
      checkIn("2026-09-24", [answer(null)]),
      checkIn("2026-10-01", [answer(0)]),
    ]);
    expect(result.comparisons).toEqual([]);
  });

  it("does not show rotating questions as fixed weekly comparisons", () => {
    const result = reflect([
      checkIn("2026-09-24", [answer(3, { stableSnapshot: false })]),
      checkIn("2026-10-01", [answer(0, { stableSnapshot: false })]),
    ]);
    expect(result.comparisons).toEqual([]);
    expect(result.areas.find((area) => area.domain === "WORK_START")?.category).toBe("IMPROVING");
  });

  it("does not call older or nonconsecutive submissions this week or last week", () => {
    const result = reflect([checkIn("2026-09-03", [answer(3)]), checkIn("2026-09-24", [answer(0)])]);
    expect(result.comparisons[0].text).not.toMatch(/this week|last week/);
    expect(result.comparisons[0].previousPeriod).toBe("2026-W36");
    expect(result.comparisons[0].currentPeriod).toBe("2026-W39");
  });
});
