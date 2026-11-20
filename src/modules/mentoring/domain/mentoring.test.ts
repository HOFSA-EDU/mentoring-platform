import { describe, expect, it } from "vitest";
import { followUpWindow, mentoringLocalTime, orderFollowUps, parseConversationTime, parseFollowUpDate } from "./calendar";
import { parseConversationInput } from "./validation";
import { orderMentorStudents, summarizeMentorStudent } from "@/modules/mentor/domain/presentation";
import { checkIn } from "@/modules/journey/domain/fixtures.test-support";

const now = new Date("2026-09-18T12:00:00Z");
const input = { studentId: "student", submissionKey: "2f515c53-f18b-4d91-963a-6718e77a035e", occurredAt: "2026-09-18T13:00", topic: "First step" };
describe("mentoring time and validation", () => {
  it.each([
    ["2026-03-29T01:30", "2026-03-29T00:30:00.000Z"],
    ["2026-03-29T03:30", "2026-03-29T01:30:00.000Z"],
    ["2026-10-25T02:30", "2026-10-25T00:30:00.000Z"],
  ])("parses explicit Luxembourg time %s", (local, utc) => { expect(parseConversationTime(local)?.toISOString()).toBe(utc); });
  it.each(["2026-03-29T02:30", "2026-02-30T12:00", "invalid", "2026-09-18T12:00Z"])("rejects nonexistent/invalid local time %s", (value) => { expect(parseConversationTime(value)).toBeNull(); });
  it("keeps reminder dates independent of DST and UTC midnight", () => {
    const midnight = new Date("2026-09-17T22:30:00Z");
    expect(mentoringLocalTime(midnight)).toBe("2026-09-18T00:30");
    expect(followUpWindow(new Date("2026-09-18"), midnight)).toBe("TODAY");
    expect(parseFollowUpDate("2026-02-30")).toBeNull();
  });
  it.each([["2026-09-17", "OVERDUE"], ["2026-09-18", "TODAY"], ["2026-09-25", "SOON"], ["2026-09-26", "LATER"]] as const)("labels %s as %s", (date, state) => { expect(followUpWindow(new Date(date), now)).toBe(state); });
  it.each([{ topic: "  " }, { topic: "x".repeat(161) }, { privateNote: "x".repeat(4001) }, { sharedAgreement: "x".repeat(2001) },
    { occurredAt: "2026-09-19T10:00" }, { occurredAt: "2025-09-18T12:00" }, { followUpDate: "2026-09-17" },
    { followUpDate: "2029-09-18" }, { followUpDate: "2026-02-30" }, { followUpNote: "Remember", followUpDate: "" }])("rejects invalid conversation input %j", (override) => { expect(() => parseConversationInput({ ...input, ...override }, now)).toThrow(); });
  it("allows a recent retrospective conversation and overdue reminder, and deduplicates links", () => {
    expect(parseConversationInput({ ...input, occurredAt: "2026-09-15T12:00", followUpDate: "2026-09-16", observationIds: ["a", "a"] }, now)).toMatchObject({ observationIds: ["a"], dueAt: new Date("2026-09-16") });
  });
});

describe("operational dashboard ordering", () => {
  it("orders overdue, requests, upcoming, difficulty, Maybe and remaining without scores", () => {
    const categories = ["NO_CURRENT_SIGNAL", "MAYBE_CONVERSATION", "OBSERVATION", "DUE_FOLLOW_UP", "CONVERSATION_REQUESTED", "OVERDUE_FOLLOW_UP"] as const;
    expect(orderMentorStudents(categories.map((attention, index) => ({ id: String(index), name: "Student", attention }))).map(({ attention }) => attention)).toEqual([...categories].reverse());
    expect(orderFollowUps([{ id: "b", dueAt: now }, { id: "a", dueAt: now }]).map(({ id }) => id)).toEqual(["a", "b"]);
  });
  it("retains difficulty alongside an overdue follow-up and stops elevating a fulfilled YES", () => {
    const latest = checkIn("2026-09-17", [], { mentorConversationRequest: "YES" });
    const source = { id: "student", user: { name: "Student" }, checkIns: [latest],
      semester: { id: "autumn", name: "Autumn", active: true, startDate: new Date("2026-09-01"), endDate: new Date("2027-01-31") },
      observations: [{ id: "difficulty", title: "Repeated difficulty", status: "OPEN" as const, type: "REPEATED_DIFFICULTY" as const, lastDetectedAt: latest.submittedAt }],
      conversations: [{ occurredAt: now, observations: [{ observation: { lastDetectedAt: latest.submittedAt } }] }],
      followUps: [{ id: "follow", dueAt: new Date("2026-09-17") }],
    };
    expect(summarizeMentorStudent(source, now)).toMatchObject({ attention: "OVERDUE_FOLLOW_UP", attentionState: "WATCH", conversationHandled: true, recentSignal: "YES", observation: { id: "difficulty" } });
    expect(summarizeMentorStudent({ ...source, followUps: [] }, now).attention).toBe("OBSERVATION");
    expect(summarizeMentorStudent({ ...source, conversations: [], followUps: [{ id: "follow", dueAt: now }] }, now).attention).toBe("CONVERSATION_REQUESTED");
  });
});
