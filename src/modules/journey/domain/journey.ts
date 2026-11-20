import { calculateStudyPeriod } from "@/modules/check-ins/domain/period";

import { localDateOrdinal, storedDateOrdinal } from "./calendar";

export type JourneyStage = "START" | "ORIENTATION" | "ROUTINE" | "INDEPENDENCE" | "REFLECTION";

export type Journey = {
  stage: JourneyStage;
  label: string;
  description: string;
  /** Percentage of calendar time elapsed, never a measure of performance. */
  progress: number;
  status: "BEFORE" | "ACTIVE" | "AFTER" | "UNAVAILABLE";
  weekNumber: number | null;
};

const stageDescriptions: Record<JourneyStage, { label: string; description: string }> = {
  START: {
    label: "Start",
    description: "The semester is beginning. Take some time to notice what studying here is like for you.",
  },
  ORIENTATION: {
    label: "Orientation",
    description: "You are getting to know the semester. Notice how you find your way through tasks and where a little support could help.",
  },
  ROUTINE: {
    label: "Routine",
    description: "You are several weeks into the semester. Notice which habits are helping and which situations still require more effort.",
  },
  INDEPENDENCE: {
    label: "Independence",
    description: "The semester is moving on. This is a moment to reflect on the approaches you want to keep trying and when asking for help is useful.",
  },
  REFLECTION: {
    label: "Reflection",
    description: "The semester is nearing its end. Look back at what you reported and consider what you would like to carry forward.",
  },
};

export function calculateJourney(now: Date, start: Date, end: Date): Journey {
  if (![now, start, end].every((date) => Number.isFinite(date.getTime()))) {
    return unavailableJourney();
  }

  const startDay = storedDateOrdinal(start);
  const endDay = storedDateOrdinal(end);
  if (endDay <= startDay) return unavailableJourney();

  const today = localDateOrdinal(now);
  const proportion = Math.max(0, Math.min(1, (today - startDay) / (endDay - startDay)));
  const stage: JourneyStage = proportion < 0.1 ? "START"
    : proportion < 0.25 ? "ORIENTATION"
    : proportion < 0.5 ? "ROUTINE"
    : proportion < 0.85 ? "INDEPENDENCE"
    : "REFLECTION";
  const status = today < startDay ? "BEFORE" : today > endDay ? "AFTER" : "ACTIVE";

  return {
    stage,
    ...stageDescriptions[stage],
    description: status === "BEFORE"
      ? "Your semester has not started yet. Your journey will follow the semester calendar."
      : status === "AFTER"
        ? "The semester has ended. You can look back at your Check-ins and the experiences you recorded."
        : stageDescriptions[stage].description,
    progress: Math.round(proportion * 100),
    status,
    weekNumber: status === "ACTIVE" ? calculateStudyPeriod(now, start, end)?.studyWeekNumber ?? null : null,
  };
}

function unavailableJourney(): Journey {
  return {
    stage: "START",
    label: "Semester journey",
    description: "Your semester journey will appear when valid semester dates are available.",
    progress: 0,
    status: "UNAVAILABLE",
    weekNumber: null,
  };
}
