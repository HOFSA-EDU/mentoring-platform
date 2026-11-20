import { describe, expect, it } from "vitest";
import { checkInSubmissionSchema } from "./schemas";
import { questionOptionSchema } from "@/modules/admin/domain/schemas";
import { buildBaselineFeedback } from "./feedback";

describe("explicit conversation signals and unscored answers", () => {
  it.each(["YES", "MAYBE", "NO"])("preserves %s without boolean coercion", (signal) => {
    expect(checkInSubmissionSchema.parse({
      answers: [{ questionId: "question", optionId: "option" }],
      mentorConversationRequest: signal,
    }).mentorConversationRequest).toBe(signal);
  });

  it.each([true, false, "true", "false", "", undefined, "UNKNOWN"])("rejects invalid signal %s", (signal) => {
    expect(checkInSubmissionSchema.safeParse({
      answers: [{ questionId: "question", optionId: "option" }],
      mentorConversationRequest: signal,
    }).success).toBe(false);
  });

  it.each([null, "", "  "])("keeps unscored admin input %s distinct from zero", (directionValue) => {
    expect(questionOptionSchema.parse({
      label: "I am not sure.", value: "unsure", directionValue, sortOrder: 4,
    }).directionValue).toBeNull();
    expect(questionOptionSchema.parse({
      label: "No.", value: "no", directionValue: "0", sortOrder: 1,
    }).directionValue).toBe(0);
  });

  it("does not rank neutral answers as difficulty in baseline feedback", () => {
    expect(buildBaselineFeedback([{
      questionTextSnapshot: "Was help needed?", optionLabelSnapshot: "I am not sure.",
      directionValueSnapshot: null, sortOrder: 1,
    }])).toEqual([]);
  });
});
