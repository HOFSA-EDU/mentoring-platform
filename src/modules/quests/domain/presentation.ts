import type { QuestAttempt, QuestHelpfulness, QuestStatus } from "@/generated/prisma/enums";
import { mentoringLocalTime, parseFollowUpDate } from "@/modules/mentoring/domain/calendar";

export const questStatusLabels: Record<QuestStatus, string> = { ACTIVE: "Active", COMPLETED: "Completed", CANCELLED: "Cancelled" };
export const attemptLabels: Record<QuestAttempt, string> = { YES: "Yes", PARTLY: "Partly", NO: "No" };
export const helpfulnessLabels: Record<QuestHelpfulness, string> = { YES: "Yes", A_LITTLE: "A little", NO: "No", NOT_SURE: "Not sure" };
export const activeQuestLimitMessage = "This Student already has two active Quests. Complete or cancel one before assigning another.";

export function questDateAfterDays(today: string, days: number) {
  const date = parseFollowUpDate(today);
  if (!date || !Number.isInteger(days) || days < 0 || days > 365) throw new RangeError("Invalid Quest date.");
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function isQuestOverdue(quest: { status: QuestStatus; dueAt: Date }, now: Date) {
  return quest.status === "ACTIVE" && quest.dueAt.toISOString().slice(0, 10) < mentoringLocalTime(now).slice(0, 10);
}

// The milestones acknowledge reflection, never an attempt/helpfulness outcome.
export function questMilestones(quests: { status: QuestStatus; reflection: unknown | null }[]) {
  const count = quests.filter((quest) => quest.status === "COMPLETED" && quest.reflection !== null).length;
  return [...(count >= 1 ? ["First Quest reflection completed"] : []), ...(count >= 3 ? ["3 Quests reflected on"] : [])];
}
