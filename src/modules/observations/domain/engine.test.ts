import { describe, expect, it } from "vitest";
import { answer, checkIn } from "@/modules/journey/domain/fixtures.test-support";
import { evaluateObservationRules, type ObservationCheckIn } from "./engine";
import { deriveObservationAttention } from "./attention";

function history(values: Array<number | null>): ObservationCheckIn[] {
  return values.map((value, index) => {
    const date = new Date(Date.UTC(2026, 8, 3 + index * 7));
    return { ...checkIn(date.toISOString().slice(0, 10)), answers: [{ ...answer(value), id: `answer-${index}` }] };
  });
}
function evaluate(entries: ObservationCheckIn[]) {
  return evaluateObservationRules(entries, "autumn", new Date(Math.max(...entries.map(({ submittedAt }) => submittedAt.getTime())) + 1));
}
function types(values: Array<number | null>) { return evaluate(history(values)).map(({ type }) => type); }

describe("formal Observation rules over comparable snapshot series", () => {
  it.each([[3], [3, 3]])("does not create a repeated Observation from %j", (...values) => {
    expect(types(values)).toEqual([]);
  });
  it("requires three difficult responses and retains the exact source evidence", () => {
    const result = evaluate(history([2, 3, 3]));
    expect(result.map(({ type }) => type)).toEqual(["REPEATED_DIFFICULTY"]);
    expect(result[0].evidence.map(({ checkInAnswerId }) => checkInAnswerId)).toEqual(["answer-0", "answer-1", "answer-2"]);
    expect(result[0].evidence[1].optionLabelSnapshot).toBe("Very often.");
    expect(JSON.stringify(result)).not.toMatch(/directionValue|riskScore|questionSignature/);
  });
  it.each(["I am not sure.", "There was no situation like this.", "I did not need help this week."])("excludes %s without resetting comparable difficulty", (label) => {
    const entries = history([3, null, 3, 3]);
    entries[1].answers[0].optionLabelSnapshot = label;
    const result = evaluate(entries);
    expect(result[0].type).toBe("REPEATED_DIFFICULTY");
    expect(result[0].evidence.map(({ checkInAnswerId }) => checkInAnswerId)).toEqual(["answer-0", "answer-2", "answer-3"]);
  });
  it.each([[0, 1, 3], [0, null, 1, 3]])("recognizes strictly worsening comparable responses %j", (...values) => {
    expect(types(values)).toEqual(["WORSENING_PATTERN"]);
  });
  it.each([[0, 2, 1], [1, 0, 2], [0, 1, 1], [0, null, null], [null, null, null]])("does not invent a pattern from %j", (...values) => {
    expect(types(values)).toEqual([]);
  });
  it("skips an absent rotating question without turning its absence into a signal", () => {
    const entries = history([0, null, 1, 3]);
    entries[1].answers = [];
    entries.forEach((entry) => entry.answers.forEach((value) => { value.stableSnapshot = false; }));
    expect(evaluate(entries).map(({ type }) => type)).toEqual(["WORSENING_PATTERN"]);
  });
  it.each([[3, 2, 1], [2, 1, 0], [3, null, 2, 0]])("recognizes consistent improvement from a difficult answer %j", (...values) => {
    expect(types(values)).toEqual(["IMPROVEMENT"]);
  });
  it("does not use one good answer as a new improvement pattern", () => {
    expect(types([3, 3, 0])).toEqual([]);
  });
  it("does not pool unrelated domains into three answers", () => {
    const entries = history([3, 3, 3]);
    const domains = ["WORK_START", "HELP_SEEKING", "ORGANISATION"] as const;
    entries.forEach((entry, i) => { entry.answers[0].domainSnapshot = domains[i]; entry.answers[0].questionId = `question-${i}`; });
    expect(evaluate(entries)).toEqual([]);
  });
  it.each(["signature", "text", "legacy", "domain"])("stops comparison at a changed %s", (field) => {
    const entries = history([3, 3, 3]);
    const latest = entries[2].answers[0];
    if (field === "signature") latest.questionSignatureSnapshot = "changed";
    if (field === "text") latest.questionTextSnapshot = "A different question";
    if (field === "legacy") latest.domainSnapshot = null;
    if (field === "domain") latest.domainSnapshot = "HELP_SEEKING";
    expect(evaluate(entries)).toEqual([]);
  });
  it("suppresses opposing question directions in one domain instead of averaging", () => {
    const entries = history([0, 1, 3]);
    entries.forEach((entry, i) => entry.answers.push({ ...answer([3, 2, 1][i]), questionId: "other", id: `other-${i}` }));
    expect(evaluate(entries)).toEqual([]);
  });
  it("suppresses repeated difficulty contradicted by a low-difficulty series", () => {
    const entries = history([3, 3, 3]);
    entries.forEach((entry, i) => entry.answers.push({ ...answer(0), questionId: "other", id: `other-${i}` }));
    expect(evaluate(entries)).toEqual([]);
  });
  it("does not describe the whole area as improving while another question remains difficult", () => {
    const entries = history([3, 2, 1]);
    entries.forEach((entry, i) => entry.answers.push({ ...answer(3), questionId: "other", id: `other-${i}` }));
    expect(evaluate(entries)).toEqual([]);
  });
  it("combines supporting question evidence without numerical aggregation", () => {
    const entries = history([3, 3, 3]);
    entries.forEach((entry, i) => entry.answers.push({ ...answer(2), questionId: "other", id: `other-${i}` }));
    const result = evaluate(entries);
    expect(result).toHaveLength(1);
    expect(result[0].evidence).toHaveLength(6);
  });
  it("excludes onboarding, other semesters, future submissions and stale windows", () => {
    const entries = history([3, 3, 3]);
    expect(evaluateObservationRules(entries, "other-semester", entries[2].submittedAt)).toEqual([]);
    expect(evaluateObservationRules(entries, "autumn", entries[1].submittedAt)).toEqual([]);
    expect(evaluateObservationRules(entries, "autumn", new Date("2026-12-01"))).toEqual([]);
    entries[0].kind = "ONBOARDING";
    expect(evaluate(entries)).toEqual([]);
  });
  it("cannot manufacture repeated evidence from duplicate periods", () => {
    const entries = history([3]);
    expect(evaluate([entries[0], { ...entries[0], id: "duplicate-a" }, { ...entries[0], id: "duplicate-b" }])).toEqual([]);
  });
  it.each(["YES", "MAYBE", "NO"] as const)("only YES creates a formal conversation Observation: %s", (signal) => {
    const entries = history([null]); entries[0].mentorConversationRequest = signal;
    const result = evaluate(entries);
    expect(result.map(({ type }) => type)).toEqual(signal === "YES" ? ["CONVERSATION_REQUEST"] : []);
    if (signal === "YES") expect(result[0].evidence[0]).toMatchObject({ checkInAnswerId: null, optionLabelSnapshot: "Yes" });
  });
  it("is deterministic regardless of input ordering", () => {
    const entries = history([3, null, 3, 3]);
    expect(evaluate(entries)).toEqual(evaluate([...entries].reverse()));
  });
});

describe("qualitative attention from unresolved Observations", () => {
  const item = (type: "IMPROVEMENT" | "CONVERSATION_REQUEST" | "REPEATED_DIFFICULTY", status: "OPEN" | "ACKNOWLEDGED" | "RESOLVED" = "OPEN") =>
    ({ id: type, title: type, type, status, lastDetectedAt: new Date("2026-09-17") });
  it("keeps positive improvement and MAYBE soft", () => {
    expect(deriveObservationAttention([item("IMPROVEMENT")], null)).toMatchObject({ attentionState: "NORMAL", attention: "IMPROVEMENT" });
    expect(deriveObservationAttention([], "MAYBE")).toMatchObject({ attentionState: "NORMAL", attention: "MAYBE_CONVERSATION" });
    expect(deriveObservationAttention([], "NO").attentionState).toBe("NORMAL");
  });
  it("does not let acknowledgement or positive evidence hide unresolved difficulties", () => {
    expect(deriveObservationAttention([item("REPEATED_DIFFICULTY", "ACKNOWLEDGED"), item("IMPROVEMENT")], "MAYBE").attentionState).toBe("WATCH");
  });
  it("preserves an unresolved explicit request even after a later No", () => {
    expect(deriveObservationAttention([item("CONVERSATION_REQUEST")], "NO").attentionState).toBe("CONVERSATION");
    expect(deriveObservationAttention([], "YES").attentionState).toBe("CONVERSATION");
  });
  it("excludes resolved history from attention", () => {
    expect(deriveObservationAttention([item("REPEATED_DIFFICULTY", "RESOLVED")], null).attentionState).toBe("NORMAL");
  });
});
