import type { DevelopmentDomain } from "@/generated/prisma/client";

export type WeeklyQuestionCandidate = {
  id: string;
  key: string;
  domain: DevelopmentDomain;
  stable: boolean;
  sortOrder: number;
};

function ordered(candidates: WeeklyQuestionCandidate[]) {
  return [...candidates].sort(
    (left, right) =>
      left.sortOrder - right.sortOrder || left.key.localeCompare(right.key),
  );
}

export function selectWeeklyQuestions(
  candidates: WeeklyQuestionCandidate[],
  studyWeekIndex: number,
): {
  stable: WeeklyQuestionCandidate[];
  rotating: WeeklyQuestionCandidate[];
  all: WeeklyQuestionCandidate[];
} {
  if (!Number.isInteger(studyWeekIndex) || studyWeekIndex < 0) {
    throw new RangeError("studyWeekIndex must be a non-negative integer.");
  }

  const stable = ordered(candidates.filter((candidate) => candidate.stable)).slice(0, 3);
  const pool = ordered(candidates.filter((candidate) => !candidate.stable));
  const rotating: WeeklyQuestionCandidate[] = [];

  if (pool.length > 0) {
    const firstIndex = studyWeekIndex % pool.length;
    const first = pool[firstIndex];
    rotating.push(first);

    for (let step = 1; step < pool.length; step += 1) {
      const candidate = pool[(firstIndex + step) % pool.length];

      if (candidate.domain !== first.domain) {
        rotating.push(candidate);
        break;
      }
    }

    if (rotating.length === 1 && pool.length > 1) {
      rotating.push(pool[(firstIndex + 1) % pool.length]);
    }
  }

  return { stable, rotating, all: [...stable, ...rotating] };
}
