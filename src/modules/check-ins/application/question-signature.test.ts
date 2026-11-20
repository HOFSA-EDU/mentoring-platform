import { describe, expect, it } from "vitest";
import { questionSignature, type SnapshotQuestion } from "./question-signature";

const question: SnapshotQuestion = {
  text: "How often did you start later than intended?", domain: "WORK_START",
  context: "WEEKLY", type: "SINGLE_CHOICE", stable: true,
  options: [
    { label: "Never.", value: "never", directionValue: 0, sortOrder: 1 },
    { label: "Several times.", value: "several", directionValue: 2, sortOrder: 2 },
    { label: "Not applicable.", value: "na", directionValue: null, sortOrder: 3 },
  ],
};

describe("historical question comparability", () => {
  it("is deterministic regardless of query row order", () => {
    expect(questionSignature(question)).toMatch(/^[0-9a-f]{64}$/);
    expect(questionSignature(question)).toBe(questionSignature({ ...question, options: [...question.options].reverse() }));
  });
  it("separates changed wording, domain, stable flag and complete option scale", () => {
    const original = questionSignature(question);
    expect(questionSignature({ ...question, text: "A different question?" })).not.toBe(original);
    expect(questionSignature({ ...question, domain: "ORGANISATION" })).not.toBe(original);
    expect(questionSignature({ ...question, stable: false })).not.toBe(original);
    for (const change of [{ label: "Often." }, { directionValue: 3 }, { directionValue: null }]) {
      expect(questionSignature({ ...question, options: question.options.map((option, index) => index === 1 ? { ...option, ...change } : option) })).not.toBe(original);
    }
  });
});
