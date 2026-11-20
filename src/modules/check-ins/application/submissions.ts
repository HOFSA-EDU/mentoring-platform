import { questionSignature, type SnapshotQuestion } from "./question-signature";
import { evaluateAfterWeeklySubmission } from "@/modules/observations/application/evaluation";
import {
  AuditAction,
  AuditEntityType,
  CheckInKind,
  type Prisma,
  QuestionContext,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { recordAuditEvent } from "@/modules/audit/application/record-event";
import { requireActiveStudentProfile } from "@/modules/check-ins/application/student-context";
import {
  CheckInOperationError,
  isPrismaErrorCode,
  parseCheckInInput,
} from "@/modules/check-ins/domain/errors";
import { buildBaselineFeedback } from "@/modules/check-ins/domain/feedback";
import { calculateStudyPeriod } from "@/modules/check-ins/domain/period";
import { selectWeeklyQuestions } from "@/modules/check-ins/domain/question-selection";
import {
  checkInSubmissionSchema,
} from "@/modules/check-ins/domain/schemas";

type AuthoritativeQuestion = Omit<SnapshotQuestion, "options"> & {
  id: string;
  options: Array<SnapshotQuestion["options"][number] & { id: string }>;
};

function assertExactQuestionSet(
  expectedIds: string[],
  submittedIds: string[],
): void {
  const submitted = new Set(submittedIds);

  if (
    submitted.size !== expectedIds.length ||
    expectedIds.some((questionId) => !submitted.has(questionId))
  ) {
    throw new CheckInOperationError(
      "The available questions changed. Refresh the page and answer the current set.",
      { answers: ["Refresh to load the current questions."] },
    );
  }
}

function authoritativeAnswers(
  questions: AuthoritativeQuestion[],
  submittedAnswers: Array<{ questionId: string; optionId: string }>,
) {
  const submittedByQuestion = new Map(
    submittedAnswers.map((answer) => [answer.questionId, answer.optionId]),
  );

  return questions.map((question, sortOrder) => {
    const selectedOptionId = submittedByQuestion.get(question.id);
    const option = question.options.find(
      (candidate) => candidate.id === selectedOptionId,
    );

    if (!option) {
      throw new CheckInOperationError(
        "One or more answers are no longer valid. Refresh and try again.",
        { answers: ["Select an available answer for every question."] },
      );
    }

    return {
      questionId: question.id,
      selectedOptionId: option.id,
      questionTextSnapshot: question.text,
      optionLabelSnapshot: option.label,
      directionValueSnapshot: option.directionValue,
      domainSnapshot: question.domain,
      stableSnapshot: question.stable,
      questionSignatureSnapshot: questionSignature(question),
      sortOrder: sortOrder + 1,
    };
  });
}

async function loadQuestions(
  transaction: Prisma.TransactionClient,
  context: QuestionContext,
) {
  return transaction.question.findMany({
    where: { context, active: true },
    select: {
      id: true,
      key: true,
      text: true,
      domain: true,
      type: true,
      context: true,
      stable: true,
      sortOrder: true,
      options: {
        select: { id: true, label: true, value: true, directionValue: true, sortOrder: true },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { key: "asc" }],
  });
}

function duplicateSubmissionError(kind: CheckInKind) {
  return new CheckInOperationError(
    kind === CheckInKind.ONBOARDING
      ? "Your onboarding baseline has already been submitted."
      : "Your Check-in for this study week has already been submitted.",
  );
}

export async function submitOnboarding(
  actorUserId: string,
  rawInput: unknown,
  submittedAt = new Date(),
) {
  const input = parseCheckInInput(checkInSubmissionSchema, rawInput);

  try {
    return await prisma.$transaction(
      async (transaction) => {
        const profile = await requireActiveStudentProfile(
          transaction,
          actorUserId,
          { requireActiveSemester: true },
        );
        const existing = await transaction.checkIn.findFirst({
          where: { studentId: profile.id, kind: CheckInKind.ONBOARDING },
          select: { id: true },
        });

        if (existing) {
          throw duplicateSubmissionError(CheckInKind.ONBOARDING);
        }

        const questions = await loadQuestions(
          transaction,
          QuestionContext.ONBOARDING,
        );

        if (questions.length < 8 || questions.length > 12) {
          throw new CheckInOperationError(
            "Onboarding is temporarily unavailable because its question set is incomplete.",
          );
        }

        assertExactQuestionSet(
          questions.map((question) => question.id),
          input.answers.map((answer) => answer.questionId),
        );
        const answers = authoritativeAnswers(questions, input.answers);
        const checkIn = await transaction.checkIn.create({
          data: {
            studentId: profile.id,
            semesterId: profile.semesterId,
            kind: CheckInKind.ONBOARDING,
            periodKey: "ONBOARDING",
            submittedAt,
            mentorConversationRequest: "NO",
            answers: { create: answers },
          },
          select: {
            id: true,
            answers: {
              select: {
                questionTextSnapshot: true,
                optionLabelSnapshot: true,
                directionValueSnapshot: true,
                sortOrder: true,
              },
            },
          },
        });

        await recordAuditEvent(transaction, {
          actorUserId,
          action: AuditAction.ONBOARDING_SUBMITTED,
          entityType: AuditEntityType.CHECK_IN,
          entityId: checkIn.id,
          metadata: { answerCount: answers.length },
        });

        return {
          checkInId: checkIn.id,
          feedback: buildBaselineFeedback(checkIn.answers),
        };
      },
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    if (error instanceof CheckInOperationError) {
      throw error;
    }

    if (isPrismaErrorCode(error, "P2002") || isPrismaErrorCode(error, "P2034")) {
      throw duplicateSubmissionError(CheckInKind.ONBOARDING);
    }

    throw error;
  }
}

export async function submitWeeklyCheckIn(
  actorUserId: string,
  rawInput: unknown,
  submittedAt = new Date(),
) {
  const input = parseCheckInInput(checkInSubmissionSchema, rawInput);

  try {
    const result = await prisma.$transaction(
      async (transaction) => {
        const profile = await requireActiveStudentProfile(
          transaction,
          actorUserId,
          { requireActiveSemester: true },
        );
        const onboarding = await transaction.checkIn.findFirst({
          where: { studentId: profile.id, kind: CheckInKind.ONBOARDING },
          select: { id: true },
        });

        if (!onboarding) {
          throw new CheckInOperationError(
            "Complete onboarding before your first weekly Check-in.",
          );
        }

        const period = calculateStudyPeriod(
          submittedAt,
          profile.semester.startDate,
          profile.semester.endDate,
        );

        if (!period) {
          throw new CheckInOperationError(
            "Weekly Check-ins are unavailable outside your active semester dates.",
          );
        }

        const existing = await transaction.checkIn.findUnique({
          where: {
            studentId_semesterId_periodKey: {
              studentId: profile.id,
              semesterId: profile.semesterId,
              periodKey: period.periodKey,
            },
          },
          select: { id: true },
        });

        if (existing) {
          throw duplicateSubmissionError(CheckInKind.WEEKLY);
        }

        const weeklyQuestions = await loadQuestions(
          transaction,
          QuestionContext.WEEKLY,
        );
        const selection = selectWeeklyQuestions(
          weeklyQuestions,
          period.studyWeekIndex,
        );

        if (selection.stable.length !== 3 || selection.rotating.length < 1) {
          throw new CheckInOperationError(
            "This week's Check-in is temporarily unavailable because its question set is incomplete.",
          );
        }

        assertExactQuestionSet(
          selection.all.map((question) => question.id),
          input.answers.map((answer) => answer.questionId),
        );
        const selectedIds = new Set(selection.all.map((question) => question.id));
        const selectedQuestions = selection.all.map((selected) => {
          const question = weeklyQuestions.find(
            (candidate) => candidate.id === selected.id,
          );

          if (!question || !selectedIds.has(question.id)) {
            throw new CheckInOperationError("The weekly question set is unavailable.");
          }

          return question;
        });
        const answers = authoritativeAnswers(selectedQuestions, input.answers);
        const checkIn = await transaction.checkIn.create({
          data: {
            studentId: profile.id,
            semesterId: profile.semesterId,
            kind: CheckInKind.WEEKLY,
            periodKey: period.periodKey,
            submittedAt,
            mentorConversationRequest: input.mentorConversationRequest,
            answers: { create: answers },
          },
          select: { id: true },
        });

        await recordAuditEvent(transaction, {
          actorUserId,
          action: AuditAction.WEEKLY_CHECK_IN_SUBMITTED,
          entityType: AuditEntityType.CHECK_IN,
          entityId: checkIn.id,
          metadata: {
            periodKey: period.periodKey,
            answerCount: answers.length,
          },
        });

        if (input.mentorConversationRequest === "YES") {
          await recordAuditEvent(transaction, {
            actorUserId,
            action: AuditAction.MENTOR_CONVERSATION_REQUESTED,
            entityType: AuditEntityType.CHECK_IN,
            entityId: checkIn.id,
            metadata: { periodKey: period.periodKey },
          });
        }

        return { checkInId: checkIn.id, periodKey: period.periodKey };
      },
      { isolationLevel: "Serializable" },
    );
    // The Check-in is already committed. Evaluation failure must not invite a
    // duplicate submission; authorized Mentor reads replay missed evaluations.
    await evaluateAfterWeeklySubmission(actorUserId, result.checkInId, submittedAt);
    return result;
  } catch (error) {
    if (error instanceof CheckInOperationError) {
      throw error;
    }

    if (isPrismaErrorCode(error, "P2002") || isPrismaErrorCode(error, "P2034")) {
      throw duplicateSubmissionError(CheckInKind.WEEKLY);
    }

    throw error;
  }
}
