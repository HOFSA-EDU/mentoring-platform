import { describe, expect, it } from "vitest";

import { calculateJourney } from "./journey";

describe("semester journey", () => {
  const start = new Date("2026-09-01T00:00:00.000Z");
  const end = new Date("2027-01-31T23:59:59.999Z");

  it.each([
    ["2026-09-01", "START"],
    ["2026-09-17", "ORIENTATION"],
    ["2026-10-20", "ROUTINE"],
    ["2026-12-01", "INDEPENDENCE"],
    ["2027-01-20", "REFLECTION"],
  ])("uses calendar progress at %s for the %s stage", (date, stage) => {
    const journey = calculateJourney(new Date(`${date}T12:00:00.000Z`), start, end);
    expect(journey.stage).toBe(stage);
    expect(journey.status).toBe("ACTIVE");
    expect(journey.weekNumber).toBeGreaterThanOrEqual(1);
  });

  it("adapts to short and long semester lengths", () => {
    expect(calculateJourney(new Date("2026-09-16T12:00:00Z"), start, new Date("2026-10-01T00:00:00Z")))
      .toMatchObject({ stage: "INDEPENDENCE", progress: 50 });
    expect(calculateJourney(new Date("2026-12-01T12:00:00Z"), start, new Date("2027-03-02T00:00:00Z")))
      .toMatchObject({ stage: "INDEPENDENCE", progress: 50 });
  });

  it("clamps before and after the semester without implying completion by performance", () => {
    expect(calculateJourney(new Date("2026-08-20T12:00:00Z"), start, end))
      .toMatchObject({ stage: "START", progress: 0, status: "BEFORE", weekNumber: null });
    expect(calculateJourney(new Date("2027-02-10T12:00:00Z"), start, end))
      .toMatchObject({ stage: "REFLECTION", progress: 100, status: "AFTER", weekNumber: null });
  });

  it("includes the last stored UTC semester date", () => {
    expect(calculateJourney(new Date("2027-01-31T20:00:00Z"), start, end))
      .toMatchObject({ progress: 100, status: "ACTIVE" });
  });

  it("uses Luxembourg midnight and date-only semester boundaries", () => {
    expect(calculateJourney(new Date("2026-08-31T21:59:59Z"), start, end).status).toBe("BEFORE");
    expect(calculateJourney(new Date("2026-08-31T22:00:00Z"), start, end))
      .toMatchObject({ status: "ACTIVE", stage: "START", weekNumber: 1 });
    expect(calculateJourney(new Date("2027-01-31T23:00:00Z"), start, end).status).toBe("AFTER");
  });

  it("safely handles invalid or reversed date ranges", () => {
    expect(calculateJourney(new Date("invalid"), start, end).status).toBe("UNAVAILABLE");
    expect(calculateJourney(start, end, start).status).toBe("UNAVAILABLE");
    expect(calculateJourney(start, start, start).status).toBe("UNAVAILABLE");
    expect(calculateJourney(start, start, new Date("invalid")).progress).toBe(0);
  });

  it("uses unrounded progress to determine stage boundaries", () => {
    const hundredDays = new Date("2026-12-10T00:00:00Z");
    expect(calculateJourney(new Date("2026-09-10T12:00:00Z"), start, hundredDays).stage).toBe("START");
    expect(calculateJourney(new Date("2026-09-11T12:00:00Z"), start, hundredDays).stage).toBe("ORIENTATION");
    expect(calculateJourney(new Date("2026-09-26T12:00:00Z"), start, hundredDays).stage).toBe("ROUTINE");
    expect(calculateJourney(new Date("2026-10-21T12:00:00Z"), start, hundredDays).stage).toBe("INDEPENDENCE");
    expect(calculateJourney(new Date("2026-11-25T12:00:00Z"), start, hundredDays).stage).toBe("REFLECTION");
  });
});
