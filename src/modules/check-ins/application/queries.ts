import { CheckInKind, QuestionContext } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireActiveStudentProfile } from "@/modules/check-ins/application/student-context";
import { CheckInOperationError } from "@/modules/check-ins/domain/errors";
import { buildBaselineFeedback } from "@/modules/check-ins/domain/feedback";
import { calculateStudyPeriod } from "@/modules/check-ins/domain/period";
import { selectWeeklyQuestions } from "@/modules/check-ins/domain/question-selection";

const safeQuestionSelection = {
  id: true,
  text: true,
  options: {
    select: { id: true, label: true },
    orderBy: { sortOrder: "asc" as const },
  },
};

export async function getOnboardingPageData(actorUserId: string) {
  const profile = await requireActiveStudentProfile(prisma, actorUserId, {
    requireActiveSemester: true,
  });
  const [existing, questions] = await Promise.all([
    prisma.checkIn.findFirst({
      where: { studentId: profile.id, kind: CheckInKind.ONBOARDING },
      select: { id: true },
    }),
    prisma.question.findMany({
      where: { context: QuestionContext.ONBOARDING, active: true },
      select: safeQuestionSelection,
      orderBy: [{ sortOrder: "asc" }, { key: "asc" }],
    }),
  ]);

  if (!existing && (questions.length < 8 || questions.length > 12)) {
    throw new CheckInOperationError(
      "Onboarding is temporarily unavailable because its question set is incomplete.",
    );
  }

  return { completedCheckInId: existing?.id ?? null, questions };
}

export async function getWeeklyCheckInPageData(
  actorUserId: string,
  instant = new Date(),
) {
  const profile = await requireActiveStudentProfile(prisma, actorUserId, {
    requireActiveSemester: true,
  });
  const period = calculateStudyPeriod(
    instant,
    profile.semester.startDate,
    profile.semester.endDate,
  );

  if (!period) {
    return {
      status: "OUTSIDE_SEMESTER" as const,
      semester: profile.semester,
      period: null,
      questions: [],
      completedCheckInId: null,
    };
  }

  const [onboarding, existing, weeklyQuestions] = await Promise.all([
    prisma.checkIn.findFirst({
      where: { studentId: profile.id, kind: CheckInKind.ONBOARDING },
      select: { id: true },
    }),
    prisma.checkIn.findUnique({
      where: {
        studentId_semesterId_periodKey: {
          studentId: profile.id,
          semesterId: profile.semesterId,
          periodKey: period.periodKey,
        },
      },
      select: { id: true },
    }),
    prisma.question.findMany({
      where: { context: QuestionContext.WEEKLY, active: true },
      select: {
        id: true,
        key: true,
        text: true,
        domain: true,
        stable: true,
        sortOrder: true,
        options: {
          select: { id: true, label: true },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { key: "asc" }],
    }),
  ]);

  if (!onboarding) {
    return {
      status: "ONBOARDING_REQUIRED" as const,
      semester: profile.semester,
      period,
      questions: [],
      completedCheckInId: null,
    };
  }

  if (existing) {
    return {
      status: "COMPLETED" as const,
      semester: profile.semester,
      period,
      questions: [],
      completedCheckInId: existing.id,
    };
  }

  const selection = selectWeeklyQuestions(
    weeklyQuestions,
    period.studyWeekIndex,
  );

  if (selection.stable.length !== 3 || selection.rotating.length < 1) {
    throw new CheckInOperationError(
      "This week's Check-in is temporarily unavailable because its question set is incomplete.",
    );
  }

  const questionById = new Map(
    weeklyQuestions.map((question) => [question.id, question]),
  );
  const questions = selection.all.map((selected) => {
    const question = questionById.get(selected.id);

    if (!question) {
      throw new CheckInOperationError("The weekly question set is unavailable.");
    }

    return {
      id: question.id,
      text: question.text,
      options: question.options,
    };
  });

  return {
    status: "AVAILABLE" as const,
    semester: profile.semester,
    period,
    questions,
    completedCheckInId: null,
  };
}

export async function getStudentDashboardData(
  actorUserId: string,
  instant = new Date(),
) {
  const profile = await requireActiveStudentProfile(prisma, actorUserId, {
    requireActiveSemester: false,
  });
  const period = profile.semester.active ? calculateStudyPeriod(
    instant,
    profile.semester.startDate,
    profile.semester.endDate,
  ) : null;
  const [onboarding, currentCheckIn, recentCheckIns] = await Promise.all([
    prisma.checkIn.findFirst({
      where: { studentId: profile.id, kind: CheckInKind.ONBOARDING },
      select: { id: true, submittedAt: true },
    }),
    period
      ? prisma.checkIn.findUnique({
          where: {
            studentId_semesterId_periodKey: {
              studentId: profile.id,
              semesterId: profile.semesterId,
              periodKey: period.periodKey,
            },
          },
          select: { id: true, submittedAt: true, periodKey: true },
        })
      : Promise.resolve(null),
    prisma.checkIn.findMany({
      where: { studentId: profile.id, kind: CheckInKind.WEEKLY },
      select: {
        id: true,
        periodKey: true,
        submittedAt: true,
        mentorConversationRequest: true,
      },
      orderBy: { submittedAt: "desc" },
      take: 3,
    }),
  ]);

  return {
    semester: profile.semester,
    period,
    onboarding,
    currentCheckIn,
    recentCheckIns,
  };
}

export async function listStudentCheckIns(actorUserId: string) {
  const profile = await requireActiveStudentProfile(prisma, actorUserId, {
    requireActiveSemester: false,
  });

  return prisma.checkIn.findMany({
    where: { studentId: profile.id },
    select: {
      id: true,
      kind: true,
      periodKey: true,
      submittedAt: true,
      mentorConversationRequest: true,
      semester: { select: { name: true } },
      answers: {
        select: {
          id: true,
          domainSnapshot: true,
          questionTextSnapshot: true,
          optionLabelSnapshot: true,
          sortOrder: true,
        },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { submittedAt: "desc" },
  });
}

export async function getStudentCheckIn(
  actorUserId: string,
  checkInId: string,
) {
  const profile = await requireActiveStudentProfile(prisma, actorUserId, {
    requireActiveSemester: false,
  });
  const checkIn = await prisma.checkIn.findFirst({
    where: { id: checkInId, studentId: profile.id },
    select: {
      id: true,
      kind: true,
      periodKey: true,
      submittedAt: true,
      mentorConversationRequest: true,
      answers: {
        select: {
          domainSnapshot: true,
          questionTextSnapshot: true,
          optionLabelSnapshot: true,
          directionValueSnapshot: true,
          sortOrder: true,
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!checkIn) {
    throw new CheckInOperationError("Check-in not found.");
  }

  return checkIn;
}

export async function getSubmissionConfirmation(
  actorUserId: string,
  checkInId: string,
) {
  const checkIn = await getStudentCheckIn(actorUserId, checkInId);

  return {
    ...checkIn,
    feedback:
      checkIn.kind === CheckInKind.ONBOARDING
        ? buildBaselineFeedback(checkIn.answers)
        : [],
  };
}
