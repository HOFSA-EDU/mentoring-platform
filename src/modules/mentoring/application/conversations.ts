import { prisma } from "@/lib/prisma";
import { recordAuditEvent } from "@/modules/audit/application/record-event";
import { AuthorizationError } from "@/modules/auth/domain/authorization-policy";
import { assignedStudentScope } from "@/modules/auth/infrastructure/prisma-student-access-policy-repository";
import { lockStudentObservations } from "@/modules/observations/application/evaluation";
import { parseConversationInput } from "../domain/validation";
import { lockMentoringAccess } from "./access";

export async function recordConversation(actorUserId: string, rawInput: unknown, now = new Date()) {
  const input = parseConversationInput(rawInput, now);
  return prisma.$transaction(async (tx) => {
    await lockStudentObservations(tx, input.studentId);
    const context = await lockMentoringAccess(tx, actorUserId, input.studentId);
    const previous = await tx.mentoringConversation.findUnique({
      where: { mentorId_submissionKey: { mentorId: context.mentorId, submissionKey: input.submissionKey } }, select: { id: true, studentId: true },
    });
    if (previous) {
      if (previous.studentId !== input.studentId) throw new AuthorizationError();
      return { id: previous.id };
    }
    const observations = await tx.observation.findMany({
      where: { id: { in: input.observationIds }, studentId: input.studentId, student: assignedStudentScope(actorUserId) },
      select: { id: true, semesterId: true, type: true, status: true, lastDetectedAt: true },
    });
    if (observations.length !== input.observationIds.length) throw new AuthorizationError();
    const conversation = await tx.mentoringConversation.create({ data: {
      ...context, submissionKey: input.submissionKey, occurredAt: input.occurredAt, topic: input.topic,
      privateNote: input.privateNote || null,
    }, select: { id: true } });
    await recordAuditEvent(tx, { actorUserId, action: "MENTORING_CONVERSATION_CREATED", entityType: "MENTORING_CONVERSATION", entityId: conversation.id });
    if (input.sharedAgreement) {
      const agreement = await tx.sharedAgreement.create({ data: { conversationId: conversation.id, text: input.sharedAgreement }, select: { id: true } });
      await recordAuditEvent(tx, { actorUserId, action: "SHARED_AGREEMENT_CREATED", entityType: "SHARED_AGREEMENT", entityId: agreement.id, metadata: { conversationId: conversation.id } });
    }
    await tx.mentoringConversationObservation.createMany({ data: observations.map(({ id }) => ({
      conversationId: conversation.id, observationId: id, studentId: context.studentId,
    })) });
    if (input.dueAt) {
      const followUp = await tx.followUp.create({ data: {
        conversationId: conversation.id, studentId: context.studentId, mentorId: context.mentorId,
        dueAt: input.dueAt, note: input.followUpNote || null,
      }, select: { id: true } });
      await recordAuditEvent(tx, { actorUserId, action: "FOLLOW_UP_CREATED", entityType: "FOLLOW_UP", entityId: followUp.id, metadata: { conversationId: conversation.id } });
    }
    for (const observation of observations) {
      // A retrospective conversation before the latest YES cannot fulfil that
      // request. Difficulty and improvement records always keep their status.
      if (observation.type !== "CONVERSATION_REQUEST" || observation.status === "RESOLVED" || input.occurredAt <= observation.lastDetectedAt) continue;
      // A newer committed YES may still be awaiting Observation evaluation.
      // Do not hide it by resolving an older, temporarily stale episode.
      const newerRequest = await tx.checkIn.findFirst({ where: {
        studentId: input.studentId, semesterId: observation.semesterId, kind: "WEEKLY",
        mentorConversationRequest: "YES", submittedAt: { gte: input.occurredAt },
        student: assignedStudentScope(actorUserId),
      }, select: { id: true } });
      if (newerRequest) continue;
      await tx.observation.update({ where: { id: observation.id }, data: { status: "RESOLVED", resolvedAt: now } });
      await recordAuditEvent(tx, { actorUserId, action: "OBSERVATION_RESOLVED", entityType: "OBSERVATION", entityId: observation.id, metadata: { conversationId: conversation.id } });
    }
    return conversation;
  }, { isolationLevel: "ReadCommitted", timeout: 20_000 });
}
