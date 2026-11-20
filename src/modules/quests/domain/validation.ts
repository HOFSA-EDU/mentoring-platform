import { z } from "zod";
import { DevelopmentDomain, QuestAttempt, QuestHelpfulness } from "@/generated/prisma/enums";
import { mentoringLocalTime, parseFollowUpDate } from "@/modules/mentoring/domain/calendar";
import { questDateAfterDays } from "./presentation";

export class QuestOperationError extends Error {}
const id = z.string().min(1).max(200);
const optionalId = z.string().max(200).optional().transform((value) => value || undefined);
export const assignmentInput = z.object({
  studentId: id, submissionKey: z.uuid(), questTemplateId: optionalId,
  mentoringConversationId: optionalId, sharedAgreementId: optionalId,
  title: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().min(10).max(1000).optional(),
  domain: z.enum(DevelopmentDomain).optional(), dueDate: z.string().optional(),
});
export const reflectionInput = z.object({
  questId: id, attempted: z.enum(QuestAttempt), helpful: z.enum(QuestHelpfulness),
  reflectionText: z.string().trim().max(2000).optional().transform((text) => text || null),
});
export const cancellationInput = z.object({ studentId: id, questId: id });

export function questDueDate(raw: string | undefined, defaultDays: number, now: Date) {
  const today = mentoringLocalTime(now).slice(0, 10);
  const text = raw ?? questDateAfterDays(today, defaultDays);
  const date = parseFollowUpDate(text);
  if (!date || text < today || text > questDateAfterDays(today, 365)) throw new QuestOperationError("Choose a due date from today through the next year.");
  return date;
}
