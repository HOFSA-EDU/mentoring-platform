"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireMentor } from "@/modules/auth/application/authorization";
import { AuthorizationError } from "@/modules/auth/domain/authorization-policy";
import { MentoringOperationError } from "../domain/validation";
import { recordConversation } from "./conversations";
import { changeFollowUpStatus } from "./follow-ups";

export type MentoringActionState = { error?: string; message?: string };
function actionError(error: unknown): MentoringActionState {
  if (error instanceof AuthorizationError) return { error: "This mentoring record is no longer available to you." };
  if (error instanceof MentoringOperationError) return { error: error.message };
  return { error: "The mentoring record could not be saved. Please try again." };
}

export async function recordConversationAction(_state: MentoringActionState, formData: FormData): Promise<MentoringActionState> {
  const actor = await requireMentor();
  const studentId = formData.get("studentId");
  try {
    await recordConversation(actor.id, {
      studentId, submissionKey: formData.get("submissionKey"), occurredAt: formData.get("occurredAt"), topic: formData.get("topic"),
      privateNote: formData.get("privateNote"), sharedAgreement: formData.get("sharedAgreement"), observationIds: formData.getAll("observationIds"),
      followUpDate: formData.get("followUpDate"), followUpNote: formData.get("followUpNote"),
    });
  } catch (error) { return actionError(error); }
  revalidatePath("/mentor", "layout");
  revalidatePath("/student", "layout");
  redirect(`/mentor/students/${encodeURIComponent(String(studentId))}#mentoring`);
}

export async function updateFollowUpAction(_state: MentoringActionState, formData: FormData): Promise<MentoringActionState> {
  const actor = await requireMentor();
  const status = formData.get("status");
  try {
    await changeFollowUpStatus(actor.id, { studentId: formData.get("studentId"), followUpId: formData.get("followUpId"), status });
  } catch (error) { return actionError(error); }
  revalidatePath("/mentor", "layout");
  return { message: status === "COMPLETED" ? "Follow-up completed." : "Follow-up cancelled." };
}
