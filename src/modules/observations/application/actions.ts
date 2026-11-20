"use server";

import { revalidatePath } from "next/cache";
import { requireMentor } from "@/modules/auth/application/authorization";
import { AuthorizationError } from "@/modules/auth/domain/authorization-policy";
import { changeObservationStatus, ObservationOperationError } from "./lifecycle";

export type ObservationActionState = { error?: string; message?: string };

export async function updateObservationAction(_state: ObservationActionState, formData: FormData): Promise<ObservationActionState> {
  const actor = await requireMentor();
  const studentId = formData.get("studentId");
  const observationId = formData.get("observationId");
  const status = formData.get("status");
  try {
    await changeObservationStatus(actor.id, { studentId, observationId, status });
  } catch (error) {
    if (error instanceof AuthorizationError) return { error: "This Observation is no longer available to you." };
    if (error instanceof ObservationOperationError) return { error: error.message };
    return { error: "The Observation could not be updated. Please try again." };
  }
  revalidatePath("/mentor", "layout");
  return { message: status === "ACKNOWLEDGED" ? "Observation acknowledged." : "Observation resolved." };
}
