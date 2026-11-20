import type { DevelopmentDomain, ObservationType } from "@/generated/prisma/client";
import {
  domainLabels, hasComparableMetadata, isDirectional, recentWeeklyCheckIns, sameVersion,
  type ReflectionAnswer, type ReflectionCheckIn,
} from "@/modules/journey/domain/reflections";

export type ObservationCheckIn = Omit<ReflectionCheckIn, "answers"> & {
  answers: Array<ReflectionAnswer & { id: string }>;
};
export type CandidateEvidence = {
  sourceKey: string; checkInId: string; checkInAnswerId: string | null; questionId: string | null;
  periodKey: string; submittedAt: Date; questionTextSnapshot: string; optionLabelSnapshot: string;
};
export type ObservationCandidate = {
  ruleKey: string; type: ObservationType; domain: DevelopmentDomain | null;
  title: string; summary: string; detectedAt: Date; evidence: CandidateEvidence[];
};
type Response = { answer: ObservationCheckIn["answers"][number]; checkIn: ObservationCheckIn };
type ScoredResponse = Response & { answer: Response["answer"] & { directionValueSnapshot: number; domainSnapshot: DevelopmentDomain } };

export function observationRuleKey(type: ObservationType, domain: DevelopmentDomain | null) {
  return `v1:${type}:${domain ?? "CONVERSATION"}`;
}

function snapshot({ answer, checkIn }: Response): CandidateEvidence {
  return {
    sourceKey: `answer:${answer.id}`, checkInId: checkIn.id, checkInAnswerId: answer.id,
    questionId: answer.questionId, periodKey: checkIn.periodKey, submittedAt: checkIn.submittedAt,
    questionTextSnapshot: answer.questionTextSnapshot, optionLabelSnapshot: answer.optionLabelSnapshot,
  };
}

const descriptions = {
  REPEATED_DIFFICULTY: "reported difficulty in three consecutive comparable responses to a recurring question",
  WORSENING_PATTERN: "reported increasing difficulty across three consecutive comparable responses to a recurring question",
  IMPROVEMENT: "reported decreasing difficulty, starting from a difficult response, across three consecutive comparable responses to a recurring question",
};
const titles = { REPEATED_DIFFICULTY: "Repeated reported difficulty", WORSENING_PATTERN: "Increasing reported difficulty", IMPROVEMENT: "Consistent reported improvement" };

/** Pure, conservative rules over immutable evidence; never creates a domain average. */
export function evaluateObservationRules(history: ObservationCheckIn[], semesterId: string, now: Date): ObservationCandidate[] {
  const eligible = new Set(recentWeeklyCheckIns(history, semesterId, now).map(({ id }) => id));
  const weekly = history.filter(({ id }) => eligible.has(id))
    .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime() || a.id.localeCompare(b.id));
  const byQuestion = new Map<string, Response[]>();
  for (const checkIn of weekly) for (const answer of checkIn.answers) {
    const responses = byQuestion.get(answer.questionId) ?? [];
    responses.push({ answer, checkIn });
    byQuestion.set(answer.questionId, responses);
  }
  const seriesByDomain = new Map<DevelopmentDomain, ScoredResponse[][]>();
  for (const responses of byQuestion.values()) {
    const latest = responses[0].answer;
    if (!hasComparableMetadata(latest)) continue;
    const scored: ScoredResponse[] = [];
    for (const response of responses) {
      if (!sameVersion(latest, response.answer)) break;
      // A neutral answer neither supplies evidence nor resets an unchanged series.
      if (isDirectional(response.answer)) scored.push(response as ScoredResponse);
      if (scored.length === 3) break;
    }
    if (!scored.length) continue;
    const domain = scored[0].answer.domainSnapshot;
    const series = seriesByDomain.get(domain) ?? [];
    series.push(scored.reverse());
    seriesByDomain.set(domain, series);
  }
  const candidates: ObservationCandidate[] = [];
  for (const domain of Object.keys(domainLabels) as DevelopmentDomain[]) {
    const series = seriesByDomain.get(domain) ?? [];
    const values = (items: ScoredResponse[]) => items.map(({ answer }) => answer.directionValueSnapshot);
    const increases = (v: number[]) => v.some((value, i) => i > 0 && value > v[i - 1]);
    const decreases = (v: number[]) => v.some((value, i) => i > 0 && value < v[i - 1]);
    const improves = (v: number[]) => v.length === 3 && v[0] >= 2 && v[0] > v[1] && v[1] > v[2];
    for (const type of ["REPEATED_DIFFICULTY", "WORSENING_PATTERN", "IMPROVEMENT"] as const) {
      const supports = (v: number[]) => v.length === 3 && (type === "REPEATED_DIFFICULTY" ? v.every((value) => value >= 2)
        : type === "WORSENING_PATTERN" ? v[0] < v[1] && v[1] < v[2] : improves(v));
      const conflicts = series.some((items) => {
        const v = values(items);
        if (type === "REPEATED_DIFFICULTY") return v.some((value) => value < 2);
        if (type === "WORSENING_PATTERN") return decreases(v);
        return increases(v) || (v[v.length - 1] >= 2 && !improves(v));
      });
      if (conflicts) continue;
      const evidence = series.filter((items) => supports(values(items))).flatMap((items) => items.map(snapshot))
        .sort((a, b) => a.submittedAt.getTime() - b.submittedAt.getTime() || a.sourceKey.localeCompare(b.sourceKey));
      if (!evidence.length) continue;
      candidates.push({
        ruleKey: observationRuleKey(type, domain), type, domain,
        title: `${domainLabels[domain]}: ${titles[type]}`,
        summary: `The student ${descriptions[type]} about ${domainLabels[domain].toLowerCase()}. Neutral answers and weeks without that question do not count as evidence.`,
        detectedAt: evidence[evidence.length - 1].submittedAt, evidence,
      });
    }
  }
  const latest = weekly[0];
  if (latest?.mentorConversationRequest === "YES") {
    candidates.push({
      ruleKey: observationRuleKey("CONVERSATION_REQUEST", null), type: "CONVERSATION_REQUEST", domain: null,
      title: "Student requested a mentor conversation",
      summary: "The student selected Yes for a mentor conversation in a weekly Check-in. This records the request, not whether a conversation has happened.",
      detectedAt: latest.submittedAt,
      evidence: [{ sourceKey: `conversation:${latest.id}`, checkInId: latest.id, checkInAnswerId: null, questionId: null,
        periodKey: latest.periodKey, submittedAt: latest.submittedAt, questionTextSnapshot: "Mentor conversation response", optionLabelSnapshot: "Yes" }],
    });
  }
  return candidates;
}
