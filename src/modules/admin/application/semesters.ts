import { AuditAction, AuditEntityType } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  AdminOperationError,
  isPrismaErrorCode,
  parseAdminInput,
} from "@/modules/admin/domain/errors";
import { semesterSchema } from "@/modules/admin/domain/schemas";

import { assertAdminActor, recordAuditEvent } from "./audit";

function duplicateSemesterError() {
  return new AdminOperationError("A semester with this name already exists.", {
    name: ["A semester with this name already exists."],
  });
}

export async function createSemester(
  actorUserId: string,
  rawInput: unknown,
) {
  const input = parseAdminInput(semesterSchema, rawInput);

  try {
    return await prisma.$transaction(
      async (transaction) => {
        await assertAdminActor(transaction, actorUserId);

        if (input.active) {
          await transaction.semester.updateMany({
            where: { active: true },
            data: { active: false },
          });
        }

        const semester = await transaction.semester.create({
          data: input,
          select: { id: true },
        });
        await recordAuditEvent(transaction, {
          actorUserId,
          action: AuditAction.SEMESTER_CREATED,
          entityType: AuditEntityType.SEMESTER,
          entityId: semester.id,
          metadata: { active: input.active },
        });

        if (input.active) {
          await recordAuditEvent(transaction, {
            actorUserId,
            action: AuditAction.SEMESTER_ACTIVATED,
            entityType: AuditEntityType.SEMESTER,
            entityId: semester.id,
          });
        }

        return semester;
      },
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    if (isPrismaErrorCode(error, "P2002")) {
      throw duplicateSemesterError();
    }

    throw error;
  }
}

export async function updateSemester(
  actorUserId: string,
  semesterId: string,
  rawInput: unknown,
) {
  const input = parseAdminInput(semesterSchema, rawInput);

  try {
    return await prisma.$transaction(
      async (transaction) => {
        await assertAdminActor(transaction, actorUserId);
        const current = await transaction.semester.findUnique({
          where: { id: semesterId },
          select: { id: true, active: true },
        });

        if (!current) {
          throw new AdminOperationError("Semester not found.");
        }

        if (input.active) {
          await transaction.semester.updateMany({
            where: { active: true, id: { not: current.id } },
            data: { active: false },
          });
        }

        const semester = await transaction.semester.update({
          where: { id: current.id },
          data: input,
          select: { id: true },
        });
        await recordAuditEvent(transaction, {
          actorUserId,
          action: AuditAction.SEMESTER_UPDATED,
          entityType: AuditEntityType.SEMESTER,
          entityId: semester.id,
          metadata: { active: input.active },
        });

        if (current.active !== input.active) {
          await recordAuditEvent(transaction, {
            actorUserId,
            action: input.active
              ? AuditAction.SEMESTER_ACTIVATED
              : AuditAction.SEMESTER_DEACTIVATED,
            entityType: AuditEntityType.SEMESTER,
            entityId: semester.id,
          });
        }

        return semester;
      },
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    if (isPrismaErrorCode(error, "P2002")) {
      throw duplicateSemesterError();
    }

    throw error;
  }
}
