"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireMentor, requireStudent } from "@/modules/auth/application/authorization";
import { AuthorizationError } from "@/modules/auth/domain/authorization-policy";
import { QuestOperationError } from "../domain/validation";
import { assignQuest, cancelQuest, reflectOnQuest } from "./commands";

export type QuestActionState = { error?: string; message?: string };
function questError(error: unknown): QuestActionState {
  if (error instanceof AuthorizationError) return { error: "This Quest is no longer available to you." };
  if (error instanceof QuestOperationError) return { error: error.message };
  return { error: "The Quest could not be saved. Please try again." };
}
function refreshQuests() {
  revalidatePath("/student", "layout");
  revalidatePath("/mentor", "layout");
}

export async function assignQuestAction(_state: QuestActionState, form: FormData): Promise<QuestActionState> {
  const actor = await requireMentor();
  const studentId = form.get("studentId");
  try {
    await assignQuest(actor.id, { studentId, submissionKey: form.get("submissionKey"), questTemplateId: form.get("questTemplateId"),
      mentoringConversationId: form.get("mentoringConversationId"), sharedAgreementId: form.get("sharedAgreementId"),
      title: form.get("title"), description: form.get("description"), domain: form.get("domain"), dueDate: form.get("dueDate"),
    });
  } catch (error) { return questError(error); }
  refreshQuests();
  redirect(`/mentor/students/${encodeURIComponent(String(studentId))}#quests`);
}

export async function reflectOnQuestAction(_state: QuestActionState, form: FormData): Promise<QuestActionState> {
  const actor = await requireStudent();
  const questId = form.get("questId");
  try {
    await reflectOnQuest(actor.id, { questId, attempted: form.get("attempted"), helpful: form.get("helpful"), reflectionText: form.get("reflectionText") });
  } catch (error) { return questError(error); }
  refreshQuests();
  redirect(`/student/quests/${encodeURIComponent(String(questId))}`);
}

export async function cancelQuestAction(_state: QuestActionState, form: FormData): Promise<QuestActionState> {
  const actor = await requireMentor();
  try { await cancelQuest(actor.id, { studentId: form.get("studentId"), questId: form.get("questId") }); }
  catch (error) { return questError(error); }
  refreshQuests();
  return { message: "Quest cancelled. Its history is preserved." };
}
