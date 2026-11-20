import { AuditAction, AuditEntityType } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  AdminOperationError,
  isPrismaErrorCode,
  parseAdminInput,
} from "@/modules/admin/domain/errors";
import {
  entityStateSchema,
  questionSchema,
  questTemplateSchema,
} from "@/modules/admin/domain/schemas";

import { assertAdminActor, recordAuditEvent } from "./audit";

function duplicateKeyError(entity: "question" | "Quest template") {
  return new AdminOperationError(`A ${entity} with this key already exists.`, {
    key: [`A ${entity} with this key already exists.`],
  });
}

export async function createQuestion(
  actorUserId: string,
  rawInput: unknown,
) {
  const input = parseAdminInput(questionSchema, rawInput);

  try {
    return await prisma.$transaction(async (transaction) => {
      await assertAdminActor(transaction, actorUserId);
      const { options, ...questionData } = input;
      const question = await transaction.question.create({
        data: questionData,
        select: { id: true },
      });
      await transaction.questionOption.createMany({
        data: options.map((option) => ({ ...option, questionId: question.id })),
      });
      await recordAuditEvent(transaction, {
        actorUserId,
        action: AuditAction.QUESTION_CREATED,
        entityType: AuditEntityType.QUESTION,
        entityId: question.id,
        metadata: { optionCount: options.length },
      });

      return question;
    });
  } catch (error) {
    if (isPrismaErrorCode(error, "P2002")) {
      throw duplicateKeyError("question");
    }

    throw error;
  }
}

export async function updateQuestion(
  actorUserId: string,
  questionId: string,
  rawInput: unknown,
) {
  const input = parseAdminInput(questionSchema, rawInput);

  try {
    return await prisma.$transaction(async (transaction) => {
      await assertAdminActor(transaction, actorUserId);
      const existing = await transaction.question.findUnique({
        where: { id: questionId },
        select: { id: true },
      });

      if (!existing) {
        throw new AdminOperationError("Question not found.");
      }

      const { options, ...questionData } = input;
      await transaction.question.update({
        where: { id: existing.id },
        data: questionData,
      });
      await transaction.questionOption.deleteMany({
        where: { questionId: existing.id },
      });
      await transaction.questionOption.createMany({
        data: options.map((option) => ({ ...option, questionId: existing.id })),
      });
      await recordAuditEvent(transaction, {
        actorUserId,
        action: AuditAction.QUESTION_UPDATED,
        entityType: AuditEntityType.QUESTION,
        entityId: existing.id,
        metadata: { optionCount: options.length },
      });

      return existing;
    });
  } catch (error) {
    if (isPrismaErrorCode(error, "P2002")) {
      throw duplicateKeyError("question");
    }

    throw error;
  }
}

export async function setQuestionActive(
  actorUserId: string,
  rawInput: unknown,
) {
  const input = parseAdminInput(entityStateSchema, rawInput);

  return prisma.$transaction(async (transaction) => {
    await assertAdminActor(transaction, actorUserId);
    const question = await transaction.question.update({
      where: { id: input.id },
      data: { active: input.active },
      select: { id: true },
    });
    await recordAuditEvent(transaction, {
      actorUserId,
      action: AuditAction.QUESTION_UPDATED,
      entityType: AuditEntityType.QUESTION,
      entityId: question.id,
      metadata: { active: input.active },
    });
    return question;
  });
}

export async function createQuestTemplate(
  actorUserId: string,
  rawInput: unknown,
) {
  const input = parseAdminInput(questTemplateSchema, rawInput);

  try {
    return await prisma.$transaction(async (transaction) => {
      await assertAdminActor(transaction, actorUserId);
      const template = await transaction.questTemplate.create({
        data: input,
        select: { id: true },
      });
      await recordAuditEvent(transaction, {
        actorUserId,
        action: AuditAction.QUEST_TEMPLATE_CREATED,
        entityType: AuditEntityType.QUEST_TEMPLATE,
        entityId: template.id,
      });
      return template;
    });
  } catch (error) {
    if (isPrismaErrorCode(error, "P2002")) {
      throw duplicateKeyError("Quest template");
    }

    throw error;
  }
}

export async function updateQuestTemplate(
  actorUserId: string,
  templateId: string,
  rawInput: unknown,
) {
  const input = parseAdminInput(questTemplateSchema, rawInput);

  try {
    return await prisma.$transaction(async (transaction) => {
      await assertAdminActor(transaction, actorUserId);
      const template = await transaction.questTemplate.update({
        where: { id: templateId },
        data: input,
        select: { id: true },
      });
      await recordAuditEvent(transaction, {
        actorUserId,
        action: AuditAction.QUEST_TEMPLATE_UPDATED,
        entityType: AuditEntityType.QUEST_TEMPLATE,
        entityId: template.id,
      });
      return template;
    });
  } catch (error) {
    if (isPrismaErrorCode(error, "P2002")) {
      throw duplicateKeyError("Quest template");
    }

    throw error;
  }
}

export async function setQuestTemplateActive(
  actorUserId: string,
  rawInput: unknown,
) {
  const input = parseAdminInput(entityStateSchema, rawInput);

  return prisma.$transaction(async (transaction) => {
    await assertAdminActor(transaction, actorUserId);
    const template = await transaction.questTemplate.update({
      where: { id: input.id },
      data: { active: input.active },
      select: { id: true },
    });
    await recordAuditEvent(transaction, {
      actorUserId,
      action: AuditAction.QUEST_TEMPLATE_UPDATED,
      entityType: AuditEntityType.QUEST_TEMPLATE,
      entityId: template.id,
      metadata: { active: input.active },
    });
    return template;
  });
}
