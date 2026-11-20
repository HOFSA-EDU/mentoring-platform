import { describe, expect, it } from "vitest";

import { calculateContinuity } from "./continuity";
import { checkIn, reflectionNow } from "./fixtures.test-support";

describe("personal check-in continuity", () => {
  it("counts consecutive completed ISO weeks through the current week", () => {
    expect(calculateContinuity([
      checkIn("2026-09-10"), checkIn("2026-09-17"), checkIn("2026-09-24"), checkIn("2026-10-01"),
    ], "autumn", reflectionNow)).toEqual({
      weeklyCount: 4,
      streak: 4,
      milestones: ["First weekly Check-in completed", "4 weekly Check-ins completed"],
    });
  });

  it("keeps a streak available while the current week is unfinished", () => {
    expect(calculateContinuity([checkIn("2026-09-17"), checkIn("2026-09-24")], "autumn", reflectionNow).streak).toBe(2);
  });

  it("handles missing weeks without losing total completions or adding pressure language", () => {
    const continuity = calculateContinuity([checkIn("2026-09-10"), checkIn("2026-09-24"), checkIn("2026-10-01")], "autumn", reflectionNow);
    expect(continuity).toMatchObject({ weeklyCount: 3, streak: 2 });
    expect(JSON.stringify(continuity)).not.toMatch(/lost|broken|rank|leaderboard|score|failed|behind/i);
    expect(calculateContinuity([checkIn("2026-09-17")], "autumn", reflectionNow).streak).toBe(0);
  });

  it("crosses ISO year boundaries, including week 53", () => {
    expect(calculateContinuity([
      checkIn("2026-12-24"), checkIn("2026-12-31"), checkIn("2027-01-07"),
    ], "autumn", new Date("2027-01-07T12:00:00Z"))).toMatchObject({ weeklyCount: 3, streak: 3 });
  });

  it("uses Luxembourg's current week near midnight", () => {
    const checkIns = [checkIn("2026-09-17")];
    expect(calculateContinuity(checkIns, "autumn", new Date("2026-09-27T21:59:59Z")).streak).toBe(1);
    expect(calculateContinuity(checkIns, "autumn", new Date("2026-09-27T22:00:00Z")).streak).toBe(0);
  });

  it("ignores future, malformed and duplicate weeks and other semesters", () => {
    expect(calculateContinuity([
      checkIn("2026-09-24", [], { semesterId: "spring" }),
      checkIn("2026-09-17", [], { periodKey: "2025-W53" }), // Not a real ISO week.
      checkIn("2026-09-10", [], { periodKey: "invalid" }),
      checkIn("2026-09-30"), checkIn("2026-10-01"), checkIn("2026-10-08"),
    ], "autumn", reflectionNow)).toMatchObject({ weeklyCount: 1, streak: 1 });
  });

  it("acknowledges onboarding and an explicit conversation request only", () => {
    expect(calculateContinuity([
      checkIn("2026-09-01", [], { kind: "ONBOARDING", periodKey: "ONBOARDING" }),
      checkIn("2026-10-01", [], { mentorConversationRequest: "YES" }),
    ], "autumn", reflectionNow).milestones).toEqual([
      "Completed onboarding", "First weekly Check-in completed", "First mentor conversation request",
    ]);
    expect(calculateContinuity([
      checkIn("2026-10-01", [], { mentorConversationRequest: "MAYBE" }),
    ], "autumn", reflectionNow).milestones).not.toContain("First mentor conversation request");
  });

  it("has a safe personal empty state", () => {
    expect(calculateContinuity([], "autumn", reflectionNow)).toEqual({ weeklyCount: 0, streak: 0, milestones: [] });
    expect(calculateContinuity([], "autumn", new Date("invalid"))).toEqual({ weeklyCount: 0, streak: 0, milestones: [] });
  });

  it("retains lifetime onboarding after semester reassignment while weekly continuity stays semester-scoped", () => {
    expect(calculateContinuity([
      checkIn("2026-03-01", [], { kind: "ONBOARDING", periodKey: "ONBOARDING", semesterId: "spring" }),
      checkIn("2026-09-24", [], { semesterId: "spring", mentorConversationRequest: "YES" }),
      checkIn("2026-10-01"),
    ], "autumn", reflectionNow)).toEqual({
      weeklyCount: 1,
      streak: 1,
      milestones: ["Completed onboarding", "First weekly Check-in completed"],
    });
  });
});
