import { z } from "zod";
import { mentoringLocalTime, parseConversationTime, parseFollowUpDate } from "./calendar";

export class MentoringOperationError extends Error {}
const optionalText = (max: number) => z.string().trim().max(max).default("");
const conversationInput = z.object({
  studentId: z.string().min(1).max(200), submissionKey: z.uuid(),
  occurredAt: z.string(), topic: z.string().trim().min(1).max(160),
  privateNote: optionalText(4000), sharedAgreement: optionalText(2000),
  observationIds: z.array(z.string().min(1).max(200)).max(50).default([]),
  followUpDate: z.string().default(""), followUpNote: optionalText(2000),
});

export function parseConversationInput(raw: unknown, now: Date) {
  const parsed = conversationInput.safeParse(raw);
  if (!parsed.success) throw new MentoringOperationError("Enter a topic (up to 160 characters) and keep notes within the displayed limits.");
  const input = parsed.data;
  const occurredAt = parseConversationTime(input.occurredAt);
  if (!occurredAt || occurredAt > now || now.getTime() - occurredAt.getTime() > 180 * 86_400_000) {
    throw new MentoringOperationError("Choose a completed conversation within the last 180 days, using Luxembourg time.");
  }
  const dueAt = input.followUpDate ? parseFollowUpDate(input.followUpDate) : null;
  if (input.followUpDate && (!dueAt || input.followUpDate < mentoringLocalTime(occurredAt).slice(0, 10) || dueAt.getTime() > now.getTime() + 366 * 86_400_000)) {
    throw new MentoringOperationError("Choose a valid follow-up date on or after the conversation and within the next year.");
  }
  if (input.followUpNote && !dueAt) throw new MentoringOperationError("Choose a follow-up date for your internal reminder.");
  return { ...input, observationIds: [...new Set(input.observationIds)], occurredAt, dueAt };
}

export const followUpInput = z.object({ studentId: z.string().min(1).max(200), followUpId: z.string().min(1).max(200), status: z.enum(["COMPLETED", "CANCELLED"]) });
