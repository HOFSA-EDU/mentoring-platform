import { getLuxembourgPeriodKey } from "@/modules/check-ins/domain/period";

import type { ReflectionAnswer, ReflectionCheckIn } from "./reflections";

export const reflectionNow = new Date("2026-10-01T12:00:00.000Z");

export function answer(direction: number | null, overrides: Partial<ReflectionAnswer> = {}): ReflectionAnswer {
  return {
    questionId: "starting-tasks",
    questionTextSnapshot: "How often did you start later than intended?",
    optionLabelSnapshot: direction === null ? "I am not sure." : ["Never.", "Once.", "Several times.", "Very often."][direction],
    directionValueSnapshot: direction,
    domainSnapshot: "WORK_START",
    stableSnapshot: true,
    questionSignatureSnapshot: "full-question-schema-v1",
    sortOrder: 1,
    ...overrides,
  };
}

export function checkIn(
  date: string,
  answers: ReflectionAnswer[] = [],
  overrides: Partial<ReflectionCheckIn> = {},
): ReflectionCheckIn {
  const submittedAt = new Date(`${date}T09:00:00.000Z`);
  return {
    id: `check-in-${date}`,
    semesterId: "autumn",
    kind: "WEEKLY",
    periodKey: getLuxembourgPeriodKey(submittedAt),
    submittedAt,
    mentorConversationRequest: "NO",
    answers,
    ...overrides,
  };
}
