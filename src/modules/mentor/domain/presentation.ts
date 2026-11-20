import type { MentorConversationRequest } from "@/generated/prisma/client";
import { calculateStudyPeriod } from "@/modules/check-ins/domain/period";
import { currentWeekOrdinal, weekOrdinal } from "@/modules/journey/domain/calendar";
import { buildStudentReflections, type ReflectionArea, type ReflectionCheckIn } from "@/modules/journey/domain/reflections";
import { deriveObservationAttention, type AttentionObservation } from "@/modules/observations/domain/attention";
import { followUpWindow, orderFollowUps } from "@/modules/mentoring/domain/calendar";

export const attentionCategories = ["OVERDUE_FOLLOW_UP", "CONVERSATION_REQUESTED", "DUE_FOLLOW_UP", "OBSERVATION", "MAYBE_CONVERSATION", "IMPROVEMENT", "NO_CURRENT_SIGNAL"] as const;
export type AttentionCategory = typeof attentionCategories[number];
export const conversationLabels: Record<MentorConversationRequest, string> = {
  YES: "Would like to talk", MAYBE: "May benefit from a check-in", NO: "No conversation requested",
};
export const categoryLabels = {
  STABLE: "Stable", IMPROVING: "Reported as easier", MORE_DIFFICULT: "Reported as more difficult",
  MIXED: "Mixed answers", NOT_ENOUGH_DATA: "Not enough data",
};

// Present the existing structured result; do not compare raw answers here.
export function mentorReflection(area: ReflectionArea) {
  const topic = area.label.toLowerCase();
  switch (area.category) {
    case "STABLE": return `${area.label} was reported fairly consistently in recent comparable Check-ins.`;
    case "IMPROVING": return `The student reported less difficulty with ${topic} in recent comparable Check-ins.`;
    case "MORE_DIFFICULT": return `The student reported more difficulty with ${topic} in recent comparable Check-ins.`;
    case "MIXED": return "Recent comparable answers in this area are mixed; no single direction stands out.";
    case "NOT_ENOUGH_DATA": return "There are not enough comparable weekly answers in this area yet.";
  }
}

export type MentorStudentSource = {
  id: string; user: { name: string };
  semester: { id: string; name: string; startDate: Date; endDate: Date; active: boolean };
  checkIns: ReflectionCheckIn[];
  observations?: AttentionObservation[];
  followUps?: { id: string; dueAt: Date }[];
  conversations?: { occurredAt: Date; observations: { observation: { lastDetectedAt: Date } }[] }[];
};

export function summarizeMentorStudent(student: MentorStudentSource, now: Date) {
  const semester = student.semester;
  const weekly = student.checkIns.filter((entry) => entry.kind === "WEEKLY" &&
    entry.semesterId === semester.id && entry.submittedAt <= now)
    .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
  const latest = weekly[0];
  const period = semester.active ? calculateStudyPeriod(now, semester.startDate, semester.endDate) : null;
  const current = weekly.find((entry) => entry.periodKey === period?.periodKey);
  const latestWeek = latest ? weekOrdinal(latest.periodKey) : null;
  const thisWeek = currentWeekOrdinal(now);
  const recentSignal = period && latest && latestWeek !== null && thisWeek !== null &&
    latestWeek <= thisWeek && latestWeek >= thisWeek - 7 ? latest.mentorConversationRequest : null;
  const reflections = buildStudentReflections(student.checkIns, semester.id, now);
  const changes = [
    ...reflections.areas.filter((area) => area.category === "MORE_DIFFICULT"),
    ...reflections.areas.filter((area) => area.category === "IMPROVING"),
  ];
  const conversationHandled = latest?.mentorConversationRequest === "YES" && (student.conversations ?? []).some((conversation) =>
    conversation.occurredAt > latest.submittedAt && conversation.observations.some(({ observation }) => observation.lastDetectedAt >= latest.submittedAt));
  const observationAttention = deriveObservationAttention(student.observations ?? [], conversationHandled && recentSignal === "YES" ? null : recentSignal);
  const nextFollowUp = orderFollowUps(student.followUps ?? [])[0];
  const followUp = nextFollowUp ? { ...nextFollowUp, window: followUpWindow(nextFollowUp.dueAt, now) } : null;
  const attention: AttentionCategory = followUp?.window === "OVERDUE" ? "OVERDUE_FOLLOW_UP"
    : observationAttention.attention === "CONVERSATION_REQUESTED" ? "CONVERSATION_REQUESTED"
      : followUp && followUp.window !== "LATER" ? "DUE_FOLLOW_UP" : observationAttention.attention;
  const onboarded = student.checkIns.some((entry) => entry.kind === "ONBOARDING" && entry.submittedAt <= now);
  return {
    id: student.id, name: student.user.name, semesterName: semester.name, onboarded,
    currentPeriod: period?.periodKey ?? null,
    completion: !period ? "Outside the Check-in window" : current ? "Completed this week"
      : !onboarded ? "Onboarding not completed" : "Not yet submitted this week",
    latest: latest ? { id: latest.id, periodKey: latest.periodKey, submittedAt: latest.submittedAt,
      conversation: latest.mentorConversationRequest } : null,
    recentSignal, ...observationAttention, attention, followUp, conversationHandled, hasNegativeChange: changes.some((area) => area.category === "MORE_DIFFICULT"),
    recentChange: changes[0] ? { label: changes[0].label, text: mentorReflection(changes[0]) } : null,
  };
}
export type MentorStudentSummary = ReturnType<typeof summarizeMentorStudent>;

export function orderMentorStudents<T extends { attention: AttentionCategory; name: string; id: string }>(students: T[]): T[] {
  const alphabetical = [...students].sort((a, b) => a.name.localeCompare(b.name, "en") || a.id.localeCompare(b.id));
  return attentionCategories.flatMap((category) => alphabetical.filter((student) => student.attention === category));
}
