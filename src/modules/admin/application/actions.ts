"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createMentorAccount,
  createStudentAccount,
  setMentorAccountActive,
  setStudentAccountActive,
  updateMentorAccount,
  updateStudentAccount,
} from "@/modules/admin/application/accounts";
import {
  assignMentor,
  deactivateMentorAssignment,
} from "@/modules/admin/application/assignments";
import {
  createQuestion,
  createQuestTemplate,
  setQuestionActive,
  setQuestTemplateActive,
  updateQuestion,
  updateQuestTemplate,
} from "@/modules/admin/application/content";
import {
  createSemester,
  updateSemester,
} from "@/modules/admin/application/semesters";
import {
  AdminOperationError,
  type AdminFieldErrors,
} from "@/modules/admin/domain/errors";
import { requireAdmin } from "@/modules/auth/application/authorization";

export type AdminActionState = {
  error?: string;
  fieldErrors?: AdminFieldErrors;
};

function actionError(error: unknown): AdminActionState {
  if (error instanceof AdminOperationError) {
    return { error: error.message, fieldErrors: error.fieldErrors };
  }

  throw error;
}

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function questionInput(formData: FormData) {
  const labels = formData.getAll("optionLabel");
  const values = formData.getAll("optionValue");
  const directions = formData.getAll("optionDirectionValue");
  const sortOrders = formData.getAll("optionSortOrder");

  return {
    key: text(formData, "key"),
    text: text(formData, "text"),
    domain: text(formData, "domain"),
    type: text(formData, "type"),
    context: text(formData, "context"),
    stable: text(formData, "stable"),
    active: text(formData, "active"),
    sortOrder: text(formData, "sortOrder"),
    options: labels.map((label, index) => ({
      label,
      value: values[index],
      directionValue: directions[index],
      sortOrder: sortOrders[index],
    })),
  };
}

export async function createStudentAction(
  _state: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const admin = await requireAdmin();

  try {
    await createStudentAccount(admin.id, {
      name: text(formData, "name"),
      email: text(formData, "email"),
      password: text(formData, "password"),
      semesterId: text(formData, "semesterId"),
    });
  } catch (error) {
    return actionError(error);
  }

  revalidatePath("/admin", "layout");
  redirect("/admin/students?created=true");
}

export async function updateStudentAction(
  studentProfileId: string,
  _state: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const admin = await requireAdmin();

  try {
    await updateStudentAccount(admin.id, studentProfileId, {
      name: text(formData, "name"),
      email: text(formData, "email"),
      semesterId: text(formData, "semesterId"),
    });
  } catch (error) {
    return actionError(error);
  }

  revalidatePath("/admin", "layout");
  redirect("/admin/students?updated=true");
}

export async function setStudentActiveAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  await setStudentAccountActive(admin.id, {
    userId: text(formData, "userId"),
    active: text(formData, "active") as "true" | "false",
  });
  revalidatePath("/admin", "layout");
}

export async function createMentorAction(
  _state: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const admin = await requireAdmin();

  try {
    await createMentorAccount(admin.id, {
      name: text(formData, "name"),
      email: text(formData, "email"),
      password: text(formData, "password"),
    });
  } catch (error) {
    return actionError(error);
  }

  revalidatePath("/admin", "layout");
  redirect("/admin/mentors?created=true");
}

export async function updateMentorAction(
  mentorProfileId: string,
  _state: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const admin = await requireAdmin();

  try {
    await updateMentorAccount(admin.id, mentorProfileId, {
      name: text(formData, "name"),
      email: text(formData, "email"),
    });
  } catch (error) {
    return actionError(error);
  }

  revalidatePath("/admin", "layout");
  redirect("/admin/mentors?updated=true");
}

export async function setMentorActiveAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  await setMentorAccountActive(admin.id, {
    userId: text(formData, "userId"),
    active: text(formData, "active") as "true" | "false",
  });
  revalidatePath("/admin", "layout");
}

export async function assignMentorAction(
  _state: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const admin = await requireAdmin();

  try {
    await assignMentor(admin.id, {
      studentProfileId: text(formData, "studentProfileId"),
      mentorProfileId: text(formData, "mentorProfileId"),
    });
  } catch (error) {
    return actionError(error);
  }

  revalidatePath("/admin", "layout");
  return {};
}

export async function deactivateAssignmentAction(
  formData: FormData,
): Promise<void> {
  const admin = await requireAdmin();
  await deactivateMentorAssignment(admin.id, {
    assignmentId: text(formData, "assignmentId"),
  });
  revalidatePath("/admin", "layout");
}

export async function createSemesterAction(
  _state: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const admin = await requireAdmin();

  try {
    await createSemester(admin.id, {
      name: text(formData, "name"),
      startDate: text(formData, "startDate"),
      endDate: text(formData, "endDate"),
      active: text(formData, "active"),
    });
  } catch (error) {
    return actionError(error);
  }

  revalidatePath("/admin", "layout");
  redirect("/admin/semesters?created=true");
}

export async function updateSemesterAction(
  semesterId: string,
  _state: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const admin = await requireAdmin();

  try {
    await updateSemester(admin.id, semesterId, {
      name: text(formData, "name"),
      startDate: text(formData, "startDate"),
      endDate: text(formData, "endDate"),
      active: text(formData, "active"),
    });
  } catch (error) {
    return actionError(error);
  }

  revalidatePath("/admin", "layout");
  redirect("/admin/semesters?updated=true");
}

export async function createQuestionAction(
  _state: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const admin = await requireAdmin();

  try {
    await createQuestion(admin.id, questionInput(formData));
  } catch (error) {
    return actionError(error);
  }

  revalidatePath("/admin", "layout");
  redirect("/admin/questions?created=true");
}

export async function updateQuestionAction(
  questionId: string,
  _state: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const admin = await requireAdmin();

  try {
    await updateQuestion(admin.id, questionId, questionInput(formData));
  } catch (error) {
    return actionError(error);
  }

  revalidatePath("/admin", "layout");
  redirect("/admin/questions?updated=true");
}

export async function setQuestionActiveAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  await setQuestionActive(admin.id, {
    id: text(formData, "id"),
    active: text(formData, "active") as "true" | "false",
  });
  revalidatePath("/admin", "layout");
}

export async function createQuestTemplateAction(
  _state: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const admin = await requireAdmin();

  try {
    await createQuestTemplate(admin.id, {
      key: text(formData, "key"),
      title: text(formData, "title"),
      description: text(formData, "description"),
      domain: text(formData, "domain"),
      active: text(formData, "active"),
      defaultDurationDays: text(formData, "defaultDurationDays"),
      reflectionPrompt: text(formData, "reflectionPrompt"),
    });
  } catch (error) {
    return actionError(error);
  }

  revalidatePath("/admin", "layout");
  redirect("/admin/quest-templates?created=true");
}

export async function updateQuestTemplateAction(
  templateId: string,
  _state: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const admin = await requireAdmin();

  try {
    await updateQuestTemplate(admin.id, templateId, {
      key: text(formData, "key"),
      title: text(formData, "title"),
      description: text(formData, "description"),
      domain: text(formData, "domain"),
      active: text(formData, "active"),
      defaultDurationDays: text(formData, "defaultDurationDays"),
      reflectionPrompt: text(formData, "reflectionPrompt"),
    });
  } catch (error) {
    return actionError(error);
  }

  revalidatePath("/admin", "layout");
  redirect("/admin/quest-templates?updated=true");
}

export async function setQuestTemplateActiveAction(
  formData: FormData,
): Promise<void> {
  const admin = await requireAdmin();
  await setQuestTemplateActive(admin.id, {
    id: text(formData, "id"),
    active: text(formData, "active") as "true" | "false",
  });
  revalidatePath("/admin", "layout");
}
