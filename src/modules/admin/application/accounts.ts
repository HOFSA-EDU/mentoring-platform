import {
  AuditAction,
  AuditEntityType,
  UserRole,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  accountStateSchema,
  createMentorSchema,
  createStudentSchema,
  updateMentorSchema,
  updateStudentSchema,
} from "@/modules/admin/domain/schemas";
import {
  AdminOperationError,
  isPrismaErrorCode,
  parseAdminInput,
} from "@/modules/admin/domain/errors";
import { hashPassword } from "@/modules/auth/infrastructure/password";

import { assertAdminActor, recordAuditEvent } from "./audit";

function duplicateEmailError(): AdminOperationError {
  return new AdminOperationError("An account with this email already exists.", {
    email: ["An account with this email already exists."],
  });
}

export async function createStudentAccount(
  actorUserId: string,
  rawInput: unknown,
) {
  const input = parseAdminInput(createStudentSchema, rawInput);
  const passwordHash = await hashPassword(input.password);

  try {
    return await prisma.$transaction(async (transaction) => {
      await assertAdminActor(transaction, actorUserId);

      const semester = await transaction.semester.findUnique({
        where: { id: input.semesterId },
        select: { id: true },
      });

      if (!semester) {
        throw new AdminOperationError("The selected semester no longer exists.", {
          semesterId: ["Select an existing semester."],
        });
      }

      const user = await transaction.user.create({
        data: {
          name: input.name,
          email: input.email,
          passwordHash,
          role: UserRole.STUDENT,
          active: true,
        },
        select: { id: true },
      });

      const profile = await transaction.studentProfile.create({
        data: {
          userId: user.id,
          semesterId: semester.id,
          active: true,
        },
        select: { id: true },
      });

      await recordAuditEvent(transaction, {
        actorUserId,
        action: AuditAction.STUDENT_CREATED,
        entityType: AuditEntityType.USER,
        entityId: user.id,
        metadata: { studentProfileId: profile.id, semesterId: semester.id },
      });

      return { userId: user.id, studentProfileId: profile.id };
    });
  } catch (error) {
    if (isPrismaErrorCode(error, "P2002")) {
      throw duplicateEmailError();
    }

    throw error;
  }
}

export async function updateStudentAccount(
  actorUserId: string,
  studentProfileId: string,
  rawInput: unknown,
) {
  const input = parseAdminInput(updateStudentSchema, rawInput);

  try {
    return await prisma.$transaction(async (transaction) => {
      await assertAdminActor(transaction, actorUserId);

      const profile = await transaction.studentProfile.findUnique({
        where: { id: studentProfileId },
        select: { id: true, userId: true },
      });

      if (!profile) {
        throw new AdminOperationError("Student not found.");
      }

      const semester = await transaction.semester.findUnique({
        where: { id: input.semesterId },
        select: { id: true },
      });

      if (!semester) {
        throw new AdminOperationError("The selected semester no longer exists.", {
          semesterId: ["Select an existing semester."],
        });
      }

      await transaction.user.update({
        where: { id: profile.userId, role: UserRole.STUDENT },
        data: { name: input.name, email: input.email },
      });
      await transaction.studentProfile.update({
        where: { id: profile.id },
        data: { semesterId: semester.id },
      });
      await recordAuditEvent(transaction, {
        actorUserId,
        action: AuditAction.ACCOUNT_UPDATED,
        entityType: AuditEntityType.USER,
        entityId: profile.userId,
        metadata: { studentProfileId: profile.id, semesterId: semester.id },
      });

      return { userId: profile.userId, studentProfileId: profile.id };
    });
  } catch (error) {
    if (isPrismaErrorCode(error, "P2002")) {
      throw duplicateEmailError();
    }

    throw error;
  }
}

export async function setStudentAccountActive(
  actorUserId: string,
  rawInput: unknown,
) {
  const input = parseAdminInput(accountStateSchema, rawInput);

  return prisma.$transaction(async (transaction) => {
    await assertAdminActor(transaction, actorUserId);

    const user = await transaction.user.findFirst({
      where: { id: input.userId, role: UserRole.STUDENT },
      select: { id: true, studentProfile: { select: { id: true } } },
    });

    if (!user?.studentProfile) {
      throw new AdminOperationError("Student not found.");
    }

    await transaction.user.update({
      where: { id: user.id },
      data: { active: input.active },
    });
    await transaction.studentProfile.update({
      where: { id: user.studentProfile.id },
      data: { active: input.active },
    });

    if (!input.active) {
      await transaction.mentorAssignment.updateMany({
        where: { studentId: user.studentProfile.id, active: true },
        data: { active: false, deactivatedAt: new Date() },
      });
    }

    await recordAuditEvent(transaction, {
      actorUserId,
      action: input.active
        ? AuditAction.ACCOUNT_ACTIVATED
        : AuditAction.ACCOUNT_DEACTIVATED,
      entityType: AuditEntityType.USER,
      entityId: user.id,
      metadata: { role: UserRole.STUDENT },
    });

    return { userId: user.id };
  });
}

export async function createMentorAccount(
  actorUserId: string,
  rawInput: unknown,
) {
  const input = parseAdminInput(createMentorSchema, rawInput);
  const passwordHash = await hashPassword(input.password);

  try {
    return await prisma.$transaction(async (transaction) => {
      await assertAdminActor(transaction, actorUserId);

      const user = await transaction.user.create({
        data: {
          name: input.name,
          email: input.email,
          passwordHash,
          role: UserRole.MENTOR,
          active: true,
        },
        select: { id: true },
      });
      const profile = await transaction.mentorProfile.create({
        data: { userId: user.id, active: true },
        select: { id: true },
      });

      await recordAuditEvent(transaction, {
        actorUserId,
        action: AuditAction.MENTOR_CREATED,
        entityType: AuditEntityType.USER,
        entityId: user.id,
        metadata: { mentorProfileId: profile.id },
      });

      return { userId: user.id, mentorProfileId: profile.id };
    });
  } catch (error) {
    if (isPrismaErrorCode(error, "P2002")) {
      throw duplicateEmailError();
    }

    throw error;
  }
}

export async function updateMentorAccount(
  actorUserId: string,
  mentorProfileId: string,
  rawInput: unknown,
) {
  const input = parseAdminInput(updateMentorSchema, rawInput);

  try {
    return await prisma.$transaction(async (transaction) => {
      await assertAdminActor(transaction, actorUserId);
      const profile = await transaction.mentorProfile.findUnique({
        where: { id: mentorProfileId },
        select: { id: true, userId: true },
      });

      if (!profile) {
        throw new AdminOperationError("Mentor not found.");
      }

      await transaction.user.update({
        where: { id: profile.userId, role: UserRole.MENTOR },
        data: { name: input.name, email: input.email },
      });
      await recordAuditEvent(transaction, {
        actorUserId,
        action: AuditAction.ACCOUNT_UPDATED,
        entityType: AuditEntityType.USER,
        entityId: profile.userId,
        metadata: { mentorProfileId: profile.id },
      });

      return { userId: profile.userId, mentorProfileId: profile.id };
    });
  } catch (error) {
    if (isPrismaErrorCode(error, "P2002")) {
      throw duplicateEmailError();
    }

    throw error;
  }
}

export async function setMentorAccountActive(
  actorUserId: string,
  rawInput: unknown,
) {
  const input = parseAdminInput(accountStateSchema, rawInput);

  return prisma.$transaction(async (transaction) => {
    await assertAdminActor(transaction, actorUserId);
    const user = await transaction.user.findFirst({
      where: { id: input.userId, role: UserRole.MENTOR },
      select: { id: true, mentorProfile: { select: { id: true } } },
    });

    if (!user?.mentorProfile) {
      throw new AdminOperationError("Mentor not found.");
    }

    await transaction.user.update({
      where: { id: user.id },
      data: { active: input.active },
    });
    await transaction.mentorProfile.update({
      where: { id: user.mentorProfile.id },
      data: { active: input.active },
    });

    if (!input.active) {
      await transaction.mentorAssignment.updateMany({
        where: { mentorId: user.mentorProfile.id, active: true },
        data: { active: false, deactivatedAt: new Date() },
      });
    }

    await recordAuditEvent(transaction, {
      actorUserId,
      action: input.active
        ? AuditAction.ACCOUNT_ACTIVATED
        : AuditAction.ACCOUNT_DEACTIVATED,
      entityType: AuditEntityType.USER,
      entityId: user.id,
      metadata: { role: UserRole.MENTOR },
    });

    return { userId: user.id };
  });
}
