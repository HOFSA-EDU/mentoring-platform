import { currentWeekOrdinal, weekOrdinal } from "./calendar";
import type { ReflectionCheckIn } from "./reflections";

export type Continuity = {
  weeklyCount: number;
  streak: number;
  milestones: string[];
};

export function calculateContinuity(checkIns: ReflectionCheckIn[], semesterId: string, now: Date): Continuity {
  const currentWeek = currentWeekOrdinal(now);
  if (currentWeek === null) return { weeklyCount: 0, streak: 0, milestones: [] };

  const personal = checkIns.filter((checkIn) => checkIn.submittedAt.getTime() <= now.getTime());
  const weekly = personal.filter((checkIn) => {
    const week = weekOrdinal(checkIn.periodKey);
    return checkIn.semesterId === semesterId && checkIn.kind === "WEEKLY" && week !== null && week <= currentWeek;
  });
  const weeks = new Set(weekly.map((checkIn) => weekOrdinal(checkIn.periodKey)!));
  // An unfinished current week does not break continuity while it can still be completed.
  let cursor = weeks.has(currentWeek) ? currentWeek : currentWeek - 7;
  let streak = 0;
  while (weeks.has(cursor)) {
    streak += 1;
    cursor -= 7;
  }

  const milestones: string[] = [];
  // Onboarding is a lifetime baseline; semester reassignment does not undo it.
  if (personal.some((checkIn) => checkIn.kind === "ONBOARDING")) milestones.push("Completed onboarding");
  if (weeks.size >= 1) milestones.push("First weekly Check-in completed");
  if (weeks.size >= 4) milestones.push("4 weekly Check-ins completed");
  if (weekly.some((checkIn) => checkIn.mentorConversationRequest === "YES")) {
    milestones.push("First mentor conversation request");
  }

  return { weeklyCount: weeks.size, streak, milestones };
}
