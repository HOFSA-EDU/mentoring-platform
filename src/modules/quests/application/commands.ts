import { prisma } from "@/lib/prisma";
import { recordAuditEvent } from "@/modules/audit/application/record-event";
import { AuthorizationError } from "@/modules/auth/domain/authorization-policy";
import { assignedStudentScope } from "@/modules/auth/infrastructure/prisma-student-access-policy-repository";
import { lockMentoringAccess } from "@/modules/mentoring/application/access";
import { assignmentInput, cancellationInput, reflectionInput, questDueDate, QuestOperationError } from "../domain/validation";
import { activeQuestLimitMessage } from "../domain/presentation";
import { lockStudentQuests, lockQuestOwner, ownedQuestStudentScope } from "./access";

export async function assignQuest(actorUserId: string, raw: unknown, now = new Date()) {
  const parsed = assignmentInput.safeParse(raw);
  if (!parsed.success) throw new QuestOperationError("Enter a short title (2–100 characters), a concrete experiment (10–1,000 characters), and a valid due date.");
  const input = parsed.data;
  return prisma.$transaction(async (tx) => {
    await lockStudentQuests(tx, input.studentId);
    const context = await lockMentoringAccess(tx, actorUserId, input.studentId);
    const existing = await tx.questAssignment.findUnique({ where: { mentorId_submissionKey: { mentorId: context.mentorId, submissionKey: input.submissionKey } }, select: { id: true, studentId: true } });
    if (existing) {
      if (existing.studentId !== context.studentId) throw new AuthorizationError();
      return { id: existing.id };
    }
    const active = await tx.questAssignment.findMany({ where: { studentId: context.studentId, status: "ACTIVE" }, select: { activeSlot: true } });
    const slot = [1, 2].find((value) => !active.some(({ activeSlot }) => activeSlot === value));
    if (!slot || active.length >= 2) throw new QuestOperationError(activeQuestLimitMessage);
    const template = input.questTemplateId ? await tx.questTemplate.findFirst({ where: { id: input.questTemplateId, active: true },
      select: { id: true, title: true, description: true, domain: true, defaultDurationDays: true, reflectionPrompt: true },
    }) : null;
    if (input.questTemplateId && !template) throw new QuestOperationError("This template is no longer available. Choose another template or a custom Quest.");
    const title = input.title ?? template?.title;
    const description = input.description ?? template?.description;
    const domain = template?.domain ?? input.domain;
    if (!title || !description || !domain) throw new QuestOperationError("A custom Quest needs a title, a concrete experiment and a development area.");
    let conversationId = input.mentoringConversationId;
    if (input.sharedAgreementId) {
      const agreement = await tx.sharedAgreement.findFirst({ where: { id: input.sharedAgreementId, conversation: { studentId: context.studentId, student: assignedStudentScope(actorUserId) } }, select: { conversationId: true } });
      if (!agreement || (conversationId && conversationId !== agreement.conversationId)) throw new AuthorizationError();
      conversationId = agreement.conversationId;
    }
    if (conversationId && !await tx.mentoringConversation.findFirst({ where: { id: conversationId, studentId: context.studentId, student: assignedStudentScope(actorUserId) }, select: { id: true } })) throw new AuthorizationError();
    const quest = await tx.questAssignment.create({ data: {
      ...context, submissionKey: input.submissionKey, questTemplateId: template?.id,
      mentoringConversationId: conversationId, sharedAgreementId: input.sharedAgreementId,
      title, description, domain, reflectionPromptSnapshot: template?.reflectionPrompt ?? "What did you notice?",
      assignedAt: now, dueAt: questDueDate(input.dueDate, template?.defaultDurationDays ?? 7, now), activeSlot: slot,
    }, select: { id: true } });
    await recordAuditEvent(tx, { actorUserId, action: "QUEST_ASSIGNED", entityType: "QUEST_ASSIGNMENT", entityId: quest.id });
    return quest;
  }, { isolationLevel: "ReadCommitted", timeout: 20_000 });
}

export async function reflectOnQuest(actorUserId: string, raw: unknown, now = new Date()) {
  const parsed = reflectionInput.safeParse(raw);
  if (!parsed.success) throw new QuestOperationError("Choose whether you tried it and whether it helped. Your optional reflection can contain up to 2,000 characters.");
  const input = parsed.data;
  return prisma.$transaction(async (tx) => {
    const student = await tx.studentProfile.findFirst({ where: ownedQuestStudentScope(actorUserId), select: { id: true } });
    if (!student) throw new AuthorizationError();
    await lockStudentQuests(tx, student.id);
    await lockQuestOwner(tx, actorUserId, student.id);
    const quest = await tx.questAssignment.findFirst({ where: { id: input.questId, studentId: student.id, student: ownedQuestStudentScope(actorUserId) }, select: { id: true, status: true } });
    if (!quest) throw new AuthorizationError();
    if (quest.status !== "ACTIVE") throw new QuestOperationError(quest.status === "COMPLETED" ? "Your reflection is already saved." : "This Quest has been cancelled and is no longer active.");
    const reflection = await tx.questReflection.create({ data: { questAssignmentId: quest.id, attempted: input.attempted, helpful: input.helpful, reflectionText: input.reflectionText, submittedAt: now }, select: { id: true } });
    await tx.questAssignment.update({ where: { id: quest.id }, data: { status: "COMPLETED", completedAt: now, activeSlot: null } });
    await recordAuditEvent(tx, { actorUserId, action: "QUEST_REFLECTION_SUBMITTED", entityType: "QUEST_REFLECTION", entityId: reflection.id, metadata: { questId: quest.id } });
    await recordAuditEvent(tx, { actorUserId, action: "QUEST_COMPLETED", entityType: "QUEST_ASSIGNMENT", entityId: quest.id });
    return { id: quest.id };
  }, { isolationLevel: "ReadCommitted", timeout: 20_000 });
}

export async function cancelQuest(actorUserId: string, raw: unknown, now = new Date()) {
  const parsed = cancellationInput.safeParse(raw);
  if (!parsed.success) throw new QuestOperationError("Choose a valid Quest to cancel.");
  const input = parsed.data;
  return prisma.$transaction(async (tx) => {
    await lockStudentQuests(tx, input.studentId);
    await lockMentoringAccess(tx, actorUserId, input.studentId);
    const quest = await tx.questAssignment.findFirst({ where: { id: input.questId, studentId: input.studentId, student: assignedStudentScope(actorUserId) }, select: { id: true, status: true } });
    if (!quest) throw new AuthorizationError();
    if (quest.status === "CANCELLED") return { changed: false };
    if (quest.status !== "ACTIVE") throw new QuestOperationError("A reflected-on Quest is already completed and cannot be cancelled.");
    await tx.questAssignment.update({ where: { id: quest.id }, data: { status: "CANCELLED", cancelledAt: now, activeSlot: null } });
    await recordAuditEvent(tx, { actorUserId, action: "QUEST_CANCELLED", entityType: "QUEST_ASSIGNMENT", entityId: quest.id });
    return { changed: true };
  }, { isolationLevel: "ReadCommitted", timeout: 20_000 });
}
