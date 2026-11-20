import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { AuthorizationError } from "@/modules/auth/domain/authorization-policy";
import { assignedStudentScope } from "@/modules/auth/infrastructure/prisma-student-access-policy-repository";
import { recordAuditEvent } from "@/modules/audit/application/record-event";
import { lockStudentObservations } from "./evaluation";

const lifecycleInput = z.object({ studentId: z.string().min(1), observationId: z.string().min(1), status: z.enum(["ACKNOWLEDGED", "RESOLVED"]) });
export class ObservationOperationError extends Error {}

export async function changeObservationStatus(actorUserId: string, rawInput: unknown, now = new Date()) {
  const parsed = lifecycleInput.safeParse(rawInput);
  if (!parsed.success) throw new ObservationOperationError("Select a valid Observation action.");
  const input = parsed.data;
  return prisma.$transaction(async (transaction) => {
    await lockStudentObservations(transaction, input.studentId);
    const where = { id: input.observationId, studentId: input.studentId, student: assignedStudentScope(actorUserId) };
    const observation = await transaction.observation.findFirst({ where, select: { id: true, status: true } });
    if (!observation) throw new AuthorizationError();
    if (observation.status === input.status) return { changed: false };
    if (observation.status === "RESOLVED") throw new ObservationOperationError("This Observation is already resolved. Its history is preserved.");
    const result = await transaction.observation.updateMany({
      where: { ...where, status: observation.status },
      data: input.status === "ACKNOWLEDGED" ? { status: input.status, acknowledgedAt: now } : { status: input.status, resolvedAt: now },
    });
    if (!result.count) throw new AuthorizationError();
    await recordAuditEvent(transaction, {
      actorUserId, action: input.status === "ACKNOWLEDGED" ? "OBSERVATION_ACKNOWLEDGED" : "OBSERVATION_RESOLVED",
      entityType: "OBSERVATION", entityId: observation.id,
    });
    return { changed: true };
  });
}
