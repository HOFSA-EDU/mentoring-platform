import type { DevelopmentDomain } from "@/generated/prisma/client";

import { currentWeekOrdinal, weekOrdinal } from "./calendar";

export const domainLabels: Record<DevelopmentDomain, string> = {
  ORGANISATION: "Keeping track",
  WORK_START: "Getting started",
  HELP_SEEKING: "Asking for help",
  LEARNING_UNDERSTANDING: "Understanding",
  PERCEIVED_WORKLOAD: "Managing workload",
  STUDY_CONFIDENCE: "Taking on challenges",
};

export type ReflectionAnswer = {
  questionId: string;
  questionTextSnapshot: string;
  optionLabelSnapshot: string;
  directionValueSnapshot: number | null;
  domainSnapshot: DevelopmentDomain | null;
  stableSnapshot: boolean | null;
  questionSignatureSnapshot: string | null;
  sortOrder: number;
};

export type ReflectionCheckIn = {
  id: string;
  semesterId: string;
  kind: "ONBOARDING" | "WEEKLY";
  periodKey: string;
  submittedAt: Date;
  mentorConversationRequest: "YES" | "MAYBE" | "NO";
  answers: ReflectionAnswer[];
};

export type ReflectionCategory = "STABLE" | "IMPROVING" | "MORE_DIFFICULT" | "NOT_ENOUGH_DATA" | "MIXED";

export type ReflectionArea = {
  domain: DevelopmentDomain;
  label: string;
  category: ReflectionCategory;
  text: string;
};

export type WeeklyComparison = {
  domain: DevelopmentDomain;
  label: string;
  questionText: string;
  previousAnswer: string;
  currentAnswer: string;
  previousPeriod: string;
  currentPeriod: string;
  text: string;
};

export type StudentReflections = {
  areas: ReflectionArea[];
  recentChanges: Array<{ domain: DevelopmentDomain; label: string; text: string }>;
  comparisons: WeeklyComparison[];
};

type ComparableAnswer = ReflectionAnswer & {
  directionValueSnapshot: number;
  domainSnapshot: DevelopmentDomain;
  stableSnapshot: boolean;
  questionSignatureSnapshot: string;
};

type Response = { answer: ReflectionAnswer; checkIn: ReflectionCheckIn };
type Direction = "STABLE" | "IMPROVING" | "MORE_DIFFICULT";

export function hasComparableMetadata(answer: ReflectionAnswer): boolean {
  return answer.domainSnapshot !== null && answer.stableSnapshot !== null &&
    typeof answer.questionSignatureSnapshot === "string" && answer.questionSignatureSnapshot.length > 0;
}

export function isDirectional(answer: ReflectionAnswer): answer is ComparableAnswer {
  return hasComparableMetadata(answer) && answer.directionValueSnapshot !== null &&
    Number.isInteger(answer.directionValueSnapshot) &&
    answer.directionValueSnapshot >= 0 && answer.directionValueSnapshot <= 3;
}

export function sameVersion(left: ReflectionAnswer, right: ReflectionAnswer): boolean {
  return hasComparableMetadata(left) && hasComparableMetadata(right) &&
    left.questionId === right.questionId &&
    left.questionSignatureSnapshot === right.questionSignatureSnapshot &&
    left.domainSnapshot === right.domainSnapshot &&
    left.stableSnapshot === right.stableSnapshot &&
    left.questionTextSnapshot === right.questionTextSnapshot;
}

function direction(previous: ComparableAnswer, current: ComparableAnswer): Direction {
  if (current.directionValueSnapshot < previous.directionValueSnapshot) return "IMPROVING";
  if (current.directionValueSnapshot > previous.directionValueSnapshot) return "MORE_DIFFICULT";
  return "STABLE";
}

const domainPhrases: Record<DevelopmentDomain, string> = {
  ORGANISATION: "keeping track of your tasks",
  WORK_START: "getting started with tasks",
  HELP_SEEKING: "asking for help",
  LEARNING_UNDERSTANDING: "understanding what you are learning",
  PERCEIVED_WORKLOAD: "managing your workload",
  STUDY_CONFIDENCE: "taking on unfamiliar or difficult tasks",
};

function reflectionText(domain: DevelopmentDomain, category: ReflectionCategory): string {
  const phrase = domainPhrases[domain];
  switch (category) {
    case "STABLE":
      return `In your recent comparable Check-ins, what you reported about ${phrase} has been fairly consistent.`;
    case "IMPROVING":
      return `In your recent comparable Check-ins, you reported less difficulty with ${phrase}.`;
    case "MORE_DIFFICULT":
      return `In your recent comparable Check-ins, you reported more difficulty with ${phrase}.`;
    case "MIXED":
      return "Your recent answers in this area are mixed. Keep checking in to see whether a clearer pattern develops.";
    case "NOT_ENOUGH_DATA":
      return "There are not yet enough comparable weekly answers in this area. Your reflections will build over time.";
  }
}

/** Current semester, current and previous five ISO weeks; future submissions are excluded. */
export function recentWeeklyCheckIns(checkIns: ReflectionCheckIn[], semesterId: string, now: Date) {
  const currentWeek = currentWeekOrdinal(now);
  if (currentWeek === null) return [];

  const recent = checkIns.filter((checkIn) => {
    const week = weekOrdinal(checkIn.periodKey);
    return checkIn.semesterId === semesterId && checkIn.kind === "WEEKLY" &&
      checkIn.submittedAt.getTime() <= now.getTime() && week !== null &&
      week <= currentWeek && week >= currentWeek - 5 * 7;
  }).sort((left, right) => right.submittedAt.getTime() - left.submittedAt.getTime() || left.id.localeCompare(right.id));

  // Persistence enforces this uniqueness too; duplicate input cannot create evidence.
  const seen = new Set<string>();
  return recent.filter((checkIn) => {
    if (seen.has(checkIn.periodKey)) return false;
    seen.add(checkIn.periodKey);
    return true;
  });
}

function latestQuestionPair(responses: Response[]): [ComparableAnswer, ComparableAnswer] | null {
  const latest = responses[0]?.answer;
  if (!latest || !hasComparableMetadata(latest)) return null;

  const directional: ComparableAnswer[] = [];
  for (const { answer } of responses) {
    // An edited question starts a new series, including when an older version is restored.
    if (!sameVersion(latest, answer)) break;
    if (isDirectional(answer)) directional.push(answer);
    if (directional.length === 2) return [directional[1], directional[0]];
  }
  return null;
}

function aggregateDirections(directions: Direction[]): ReflectionCategory {
  if (!directions.length) return "NOT_ENOUGH_DATA";
  const improving = directions.includes("IMPROVING");
  const moreDifficult = directions.includes("MORE_DIFFICULT");
  if (improving && moreDifficult) return "MIXED";
  if (improving) return "IMPROVING";
  if (moreDifficult) return "MORE_DIFFICULT";
  return "STABLE";
}

function weeklyComparisons(weekly: ReflectionCheckIn[]): WeeklyComparison[] {
  const [current, previous] = weekly;
  if (!current || !previous) return [];

  const previousAnswers = new Map(previous.answers.map((answer) => [answer.questionId, answer]));
  return [...current.answers].sort((left, right) => left.sortOrder - right.sortOrder).flatMap((answer) => {
    const previousAnswer = previousAnswers.get(answer.questionId);
    if (!previousAnswer || !answer.stableSnapshot || !previousAnswer.stableSnapshot ||
      !isDirectional(answer) || !isDirectional(previousAnswer) || !sameVersion(answer, previousAnswer)) {
      return [];
    }

    const change = direction(previousAnswer, answer);
    const phrase = domainPhrases[answer.domainSnapshot];
    const text = change === "STABLE"
      ? `You reported a similar experience with ${phrase} in these two Check-ins.`
      : `You reported ${change === "IMPROVING" ? "less" : "more"} difficulty with ${phrase} in your latest Check-in than in the previous one.`;

    return [{
      domain: answer.domainSnapshot,
      label: domainLabels[answer.domainSnapshot],
      questionText: answer.questionTextSnapshot,
      previousAnswer: previousAnswer.optionLabelSnapshot,
      currentAnswer: answer.optionLabelSnapshot,
      previousPeriod: previous.periodKey,
      currentPeriod: current.periodKey,
      text,
    }];
  });
}

/** Internal answer directions determine descriptive categories; no domain score is created. */
export function buildStudentReflections(
  checkIns: ReflectionCheckIn[],
  semesterId: string,
  now: Date,
): StudentReflections {
  const weekly = recentWeeklyCheckIns(checkIns, semesterId, now);
  const byQuestion = new Map<string, Response[]>();
  for (const checkIn of weekly) {
    for (const answer of checkIn.answers) {
      const responses = byQuestion.get(answer.questionId) ?? [];
      responses.push({ answer, checkIn });
      byQuestion.set(answer.questionId, responses);
    }
  }

  const evidence = new Map<DevelopmentDomain, Direction[]>();
  for (const responses of byQuestion.values()) {
    const pair = latestQuestionPair(responses);
    if (!pair) continue;
    const [previous, current] = pair;
    const directions = evidence.get(current.domainSnapshot) ?? [];
    directions.push(direction(previous, current));
    evidence.set(current.domainSnapshot, directions);
  }

  const areas = (Object.keys(domainLabels) as DevelopmentDomain[]).map((domain) => {
    const category = aggregateDirections(evidence.get(domain) ?? []);
    return { domain, label: domainLabels[domain], category, text: reflectionText(domain, category) };
  });

  return {
    areas,
    recentChanges: areas.filter((area) => area.category === "IMPROVING" || area.category === "MORE_DIFFICULT")
      .slice(0, 2).map(({ domain, label, text }) => ({ domain, label, text })),
    comparisons: weeklyComparisons(weekly),
  };
}
