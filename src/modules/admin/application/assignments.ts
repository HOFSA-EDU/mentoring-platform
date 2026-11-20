import { AuditAction, AuditEntityType } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  AdminOperationError,
  isPrismaErrorCode,
  parseAdminInput,
} from "@/modules/admin/domain/errors";
import {
  assignmentSchema,
  assignmentStateSchema,
} from "@/modules/admin/domain/schemas";

import { assertAdminActor, recordAuditEvent } from "./audit";

export async function assignMentor(
  actorUserId: string,
  rawInput: unknown,
) {
  const input = parseAdminInput(assignmentSchema, rawInput);

  try {
    return await prisma.$transaction(
      async (transaction) => {
        await assertAdminActor(transaction, actorUserId);

        const [student, mentor, currentAssignment] = await Promise.all([
          transaction.studentProfile.findFirst({
            where: {
              id: input.studentProfileId,
              active: true,
              user: { active: true, role: "STUDENT" },
            },
            select: { id: true },
          }),
          transaction.mentorProfile.findFirst({
            where: {
              id: input.mentorProfileId,
              active: true,
              user: { active: true, role: "MENTOR" },
            },
            select: { id: true },
          }),
          transaction.mentorAssignment.findFirst({
            where: { studentId: input.studentProfileId, active: true },
            select: { id: true, mentorId: true },
          }),
        ]);

        if (!student) {
          throw new AdminOperationError("Select an active student.", {
            studentProfileId: ["Select an active student."],
          });
        }

        if (!mentor) {
          throw new AdminOperationError("Select an active mentor.", {
            mentorProfileId: ["Select an active mentor."],
          });
        }

        if (currentAssignment?.mentorId === mentor.id) {
          return { assignmentId: currentAssignment.id, changed: false };
        }

        const changedAt = new Date();
        if (currentAssignment) {
          await transaction.mentorAssignment.update({
            where: { id: currentAssignment.id },
            data: { active: false, deactivatedAt: changedAt },
          });
        }

        const assignment = await transaction.mentorAssignment.create({
          data: {
            studentId: student.id,
            mentorId: mentor.id,
            active: true,
            assignedAt: changedAt,
          },
          select: { id: true },
        });

        await recordAuditEvent(transaction, {
          actorUserId,
          action: currentAssignment
            ? AuditAction.MENTOR_REASSIGNED
            : AuditAction.MENTOR_ASSIGNED,
          entityType: AuditEntityType.MENTOR_ASSIGNMENT,
          entityId: assignment.id,
          metadata: {
            studentProfileId: student.id,
            mentorProfileId: mentor.id,
            previousAssignmentId: currentAssignment?.id ?? null,
          },
        });

        return { assignmentId: assignment.id, changed: true };
      },
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    if (isPrismaErrorCode(error, "P2002") || isPrismaErrorCode(error, "P2034")) {
      throw new AdminOperationError(
        "The assignment changed while you were editing. Refresh and try again.",
      );
    }

    throw error;
  }
}

export async function deactivateMentorAssignment(
  actorUserId: string,
  rawInput: unknown,
) {
  const input = parseAdminInput(assignmentStateSchema, rawInput);

  return prisma.$transaction(async (transaction) => {
    await assertAdminActor(transaction, actorUserId);
    const assignment = await transaction.mentorAssignment.findFirst({
      where: { id: input.assignmentId, active: true },
      select: { id: true, studentId: true, mentorId: true },
    });

    if (!assignment) {
      throw new AdminOperationError("Active assignment not found.");
    }

    await transaction.mentorAssignment.update({
      where: { id: assignment.id },
      data: { active: false, deactivatedAt: new Date() },
    });
    await recordAuditEvent(transaction, {
      actorUserId,
      action: AuditAction.MENTOR_ASSIGNMENT_DEACTIVATED,
      entityType: AuditEntityType.MENTOR_ASSIGNMENT,
      entityId: assignment.id,
      metadata: {
        studentProfileId: assignment.studentId,
        mentorProfileId: assignment.mentorId,
      },
    });

    return { assignmentId: assignment.id };
  });
}
