import { describe, expect, it } from "vitest";

import { buildBaselineFeedback } from "./feedback";

describe("baseline feedback", () => {
  it("uses factual reported language and returns at most two statements", () => {
    const feedback = buildBaselineFeedback([
      {
        questionTextSnapshot: "What happened when the task felt large?",
        optionLabelSnapshot: "I waited until there was time pressure",
        directionValueSnapshot: 3,
        sortOrder: 1,
      },
      {
        questionTextSnapshot: "What happened when something was unclear?",
        optionLabelSnapshot: "I tried to solve it alone first",
        directionValueSnapshot: 2,
        sortOrder: 2,
      },
      {
        questionTextSnapshot: "How did you choose the first task?",
        optionLabelSnapshot: "I reviewed my deadlines",
        directionValueSnapshot: 0,
        sortOrder: 3,
      },
    ]);

    expect(feedback).toHaveLength(2);
    expect(feedback.every((statement) => statement.includes("you reported"))).toBe(true);
    expect(feedback.join(" ")).not.toMatch(/lazy|anxiety|poor skills|motivation/i);
  });
});
