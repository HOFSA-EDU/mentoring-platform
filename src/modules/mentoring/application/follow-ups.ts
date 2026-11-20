import { prisma } from "@/lib/prisma";
import { recordAuditEvent } from "@/modules/audit/application/record-event";
import { AuthorizationError } from "@/modules/auth/domain/authorization-policy";
import { assignedStudentScope } from "@/modules/auth/infrastructure/prisma-student-access-policy-repository";
import { lockStudentObservations } from "@/modules/observations/application/evaluation";
import { followUpInput, MentoringOperationError } from "../domain/validation";
import { lockMentoringAccess } from "./access";

export async function changeFollowUpStatus(actorUserId: string, rawInput: unknown, now = new Date()) {
  const parsed = followUpInput.safeParse(rawInput);
  if (!parsed.success) throw new MentoringOperationError("Select a valid follow-up action.");
  const input = parsed.data;
  return prisma.$transaction(async (tx) => {
    await lockStudentObservations(tx, input.studentId);
    await lockMentoringAccess(tx, actorUserId, input.studentId);
    const where = { id: input.followUpId, studentId: input.studentId, student: assignedStudentScope(actorUserId) };
    const followUp = await tx.followUp.findFirst({ where, select: { id: true, status: true } });
    if (!followUp) throw new AuthorizationError();
    if (followUp.status === input.status) return { changed: false };
    if (followUp.status !== "OPEN") throw new MentoringOperationError("This follow-up is already closed. Its history is preserved.");
    const result = await tx.followUp.updateMany({ where: { ...where, status: "OPEN" }, data: {
      status: input.status, ...(input.status === "COMPLETED" ? { completedAt: now } : { cancelledAt: now }),
    } });
    if (result.count !== 1) throw new AuthorizationError();
    await recordAuditEvent(tx, { actorUserId, action: input.status === "COMPLETED" ? "FOLLOW_UP_COMPLETED" : "FOLLOW_UP_CANCELLED", entityType: "FOLLOW_UP", entityId: followUp.id });
    return { changed: true };
  });
}
