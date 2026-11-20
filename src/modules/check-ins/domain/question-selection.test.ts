import { describe, expect, it } from "vitest";

import type { WeeklyQuestionCandidate } from "./question-selection";
import { selectWeeklyQuestions } from "./question-selection";

const candidates: WeeklyQuestionCandidate[] = [
  { id: "stable-org", key: "A", domain: "ORGANISATION", stable: true, sortOrder: 10 },
  { id: "stable-start", key: "B", domain: "WORK_START", stable: true, sortOrder: 20 },
  { id: "stable-help", key: "C", domain: "HELP_SEEKING", stable: true, sortOrder: 30 },
  { id: "rotate-org", key: "D", domain: "ORGANISATION", stable: false, sortOrder: 40 },
  { id: "rotate-start", key: "E", domain: "WORK_START", stable: false, sortOrder: 50 },
  { id: "rotate-help", key: "F", domain: "HELP_SEEKING", stable: false, sortOrder: 60 },
];

describe("weekly question selection", () => {
  it("always includes the three stable questions", () => {
    expect(selectWeeklyQuestions(candidates, 8).stable.map((item) => item.id)).toEqual([
      "stable-org",
      "stable-start",
      "stable-help",
    ]);
  });

  it("is deterministic for the same study week", () => {
    expect(selectWeeklyQuestions(candidates, 4)).toEqual(
      selectWeeklyQuestions([...candidates].reverse(), 4),
    );
  });

  it("rotates by week and prefers a second domain", () => {
    const first = selectWeeklyQuestions(candidates, 0).rotating;
    const second = selectWeeklyQuestions(candidates, 1).rotating;

    expect(first.map((item) => item.id)).not.toEqual(second.map((item) => item.id));
    expect(first[0].domain).not.toBe(first[1].domain);
    expect(second[0].domain).not.toBe(second[1].domain);
  });
});
