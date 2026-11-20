import { describe, expect, it } from "vitest";

import {
  calculateStudyPeriod,
  getLuxembourgPeriodKey,
  INSTITUTION_TIME_ZONE,
} from "./period";

describe("Luxembourg study periods", () => {
  const semesterStart = new Date("2026-09-01T00:00:00.000Z");
  const semesterEnd = new Date("2027-01-31T23:59:59.999Z");

  it("uses the explicit institutional timezone", () => {
    expect(INSTITUTION_TIME_ZONE).toBe("Europe/Luxembourg");
  });

  it("changes week at Luxembourg midnight rather than UTC midnight", () => {
    expect(getLuxembourgPeriodKey(new Date("2026-09-20T21:59:59.999Z"))).toBe(
      "2026-W38",
    );
    expect(getLuxembourgPeriodKey(new Date("2026-09-20T22:00:00.000Z"))).toBe(
      "2026-W39",
    );
  });

  it("handles ISO week years across the calendar-year boundary", () => {
    expect(getLuxembourgPeriodKey(new Date("2027-01-03T22:59:59.999Z"))).toBe(
      "2026-W53",
    );
    expect(getLuxembourgPeriodKey(new Date("2027-01-03T23:00:00.000Z"))).toBe(
      "2027-W01",
    );
  });

  it("calculates a zero-based semester week index from local calendar weeks", () => {
    expect(
      calculateStudyPeriod(
        new Date("2026-09-17T10:00:00.000Z"),
        semesterStart,
        semesterEnd,
      ),
    ).toMatchObject({
      periodKey: "2026-W38",
      studyWeekIndex: 2,
      studyWeekNumber: 3,
      localDate: "2026-09-17",
    });
  });

  it("returns null outside the semester date range", () => {
    expect(
      calculateStudyPeriod(
        new Date("2026-08-31T12:00:00.000Z"),
        semesterStart,
        semesterEnd,
      ),
    ).toBeNull();
  });
});
