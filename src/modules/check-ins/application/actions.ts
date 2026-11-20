"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  submitOnboarding,
  submitWeeklyCheckIn,
} from "@/modules/check-ins/application/submissions";
import {
  CheckInOperationError,
  type CheckInFieldErrors,
} from "@/modules/check-ins/domain/errors";
import { requireStudent } from "@/modules/auth/application/authorization";

export type ReflectionActionState = {
  error?: string;
  fieldErrors?: CheckInFieldErrors;
};

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function submissionInput(formData: FormData) {
  const questionIds = formData.getAll("questionId");
  const optionIds = formData.getAll("optionId");

  return {
    answers: questionIds.map((questionId, index) => ({
      questionId,
      optionId: optionIds[index],
    })),
    mentorConversationRequest: text(formData, "mentorConversationRequest"),
  };
}

function actionError(error: unknown): ReflectionActionState {
  if (error instanceof CheckInOperationError) {
    return { error: error.message, fieldErrors: error.fieldErrors };
  }

  throw error;
}

export async function submitOnboardingAction(
  _state: ReflectionActionState,
  formData: FormData,
): Promise<ReflectionActionState> {
  const student = await requireStudent();
  let result: Awaited<ReturnType<typeof submitOnboarding>>;

  try {
    result = await submitOnboarding(student.id, {
      ...submissionInput(formData),
      mentorConversationRequest: "NO",
    });
  } catch (error) {
    return actionError(error);
  }

  revalidatePath("/student", "layout");
  redirect(`/student/onboarding/complete?submission=${result.checkInId}`);
}

export async function submitWeeklyCheckInAction(
  _state: ReflectionActionState,
  formData: FormData,
): Promise<ReflectionActionState> {
  const student = await requireStudent();
  let result: Awaited<ReturnType<typeof submitWeeklyCheckIn>>;

  try {
    result = await submitWeeklyCheckIn(student.id, submissionInput(formData));
  } catch (error) {
    return actionError(error);
  }

  revalidatePath("/student", "layout");
  redirect(`/student/check-in/complete?submission=${result.checkInId}`);
}
