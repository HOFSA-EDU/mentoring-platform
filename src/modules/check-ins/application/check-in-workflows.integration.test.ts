import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import { updateQuestion } from "@/modules/admin/application/content";
import {
  getStudentCheckIn,
  getWeeklyCheckInPageData,
} from "@/modules/check-ins/application/queries";
import {
  submitOnboarding,
  submitWeeklyCheckIn,
} from "@/modules/check-ins/application/submissions";
import { CheckInOperationError } from "@/modules/check-ins/domain/errors";

const adminUserId = "user-admin-001";
const mentorUserId = "user-mentor-001";
const studentAUserId = "user-student-006";
const studentBUserId = "user-student-007";
const studentAProfileId = "student-profile-006";
const studentBProfileId = "student-profile-007";
const week38 = new Date("2026-09-17T10:00:00.000Z");
const week39 = new Date("2026-09-24T10:00:00.000Z");
const suiteStartedAt = new Date();

type QuestionBackup = {
  id: string;
  key: string;
  text: string;
  domain: "ORGANISATION" | "WORK_START" | "HELP_SEEKING" | "LEARNING_UNDERSTANDING" | "PERCEIVED_WORKLOAD" | "STUDY_CONFIDENCE";
  type: "SINGLE_CHOICE" | "SCALE" | "BOOLEAN";
  context: "ONBOARDING" | "WEEKLY";
  stable: boolean;
  active: boolean;
  sortOrder: number;
  options: Array<{
    id: string;
    label: string;
    value: string;
    directionValue: number | null;
    sortOrder: number;
  }>;
};

let questionBackup: QuestionBackup | null = null;
let editedQuestionId = "";
let studentAWeeklyId = "";
let studentBWeeklyId = "";

function answersFor(
  questions: Array<{ id: string; options: Array<{ id: string }> }>,
) {
  return questions.map((question) => ({
    questionId: question.id,
    optionId: question.options[0].id,
  }));
}

async function onboardingQuestions() {
  return prisma.question.findMany({
    where: { context: "ONBOARDING", active: true },
    select: {
      id: true,
      options: {
        select: { id: true },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { key: "asc" }],
  });
}

async function restoreEditedQuestion() {
  if (!questionBackup) {
    return;
  }

  const backup = questionBackup;
  await prisma.$transaction(async (transaction) => {
    await transaction.questionOption.deleteMany({
      where: { questionId: backup.id },
    });
    await transaction.question.update({
      where: { id: backup.id },
      data: {
        key: backup.key,
        text: backup.text,
        domain: backup.domain,
        type: backup.type,
        context: backup.context,
        stable: backup.stable,
        active: backup.active,
        sortOrder: backup.sortOrder,
      },
    });
    await transaction.questionOption.createMany({
      data: backup.options.map((option) => ({
        ...option,
        questionId: backup.id,
      })),
    });
  });
  questionBackup = null;
}

async function cleanupCheckInData() {
  await restoreEditedQuestion();
  const checkIns = await prisma.checkIn.findMany({
    where: { studentId: { in: [studentAProfileId, studentBProfileId] } },
    select: { id: true },
  });
  const checkInIds = checkIns.map((checkIn) => checkIn.id);

  await prisma.auditEvent.deleteMany({
    where: {
      OR: [
        { actorUserId: { in: [studentAUserId, studentBUserId] } },
        { entityId: { in: checkInIds } },
        {
          action: "QUESTION_UPDATED",
          createdAt: { gte: suiteStartedAt },
          entityId: editedQuestionId || undefined,
        },
      ],
    },
  });
  await prisma.observation.deleteMany({ where: { studentId: { in: [studentAProfileId, studentBProfileId] } } });
  await prisma.checkIn.deleteMany({ where: { id: { in: checkInIds } } });
}

describe.sequential("Phase 03 Student reflection workflows", () => {
  beforeAll(cleanupCheckInData);
  afterAll(async () => {
    await cleanupCheckInData();
    await prisma.$disconnect();
  });

  it("submits onboarding for the authenticated Student and ignores a client student ID", async () => {
    const questions = await onboardingQuestions();
    const result = await submitOnboarding(studentAUserId, {
      studentId: studentBProfileId,
      answers: answersFor(questions),
      mentorConversationRequest: "YES",
    }, week38);
    const submission = await prisma.checkIn.findUniqueOrThrow({
      where: { id: result.checkInId },
      include: { answers: true },
    });

    expect(submission.studentId).toBe(studentAProfileId);
    expect(submission.kind).toBe("ONBOARDING");
    expect(submission.periodKey).toBe("ONBOARDING");
    expect(submission.mentorConversationRequest).toBe("NO");
    expect(submission.answers).toHaveLength(10);
    expect(result.feedback).toHaveLength(2);
    expect(result.feedback.every((statement) => statement.includes("you reported"))).toBe(true);
  });

  it("rejects an invalid onboarding option and repeated onboarding", async () => {
    const questions = await onboardingQuestions();
    const invalidAnswers = answersFor(questions);
    invalidAnswers[0] = { questionId: questions[0].id, optionId: "missing-option" };

    await expect(
      submitOnboarding(studentBUserId, {
        answers: invalidAnswers,
        mentorConversationRequest: "NO",
      }, week38),
    ).rejects.toBeInstanceOf(CheckInOperationError);

    await expect(
      submitOnboarding(studentAUserId, {
        answers: answersFor(questions),
        mentorConversationRequest: "NO",
      }, week38),
    ).rejects.toThrow("already been submitted");
  });

  it("submits the second Student onboarding baseline", async () => {
    const questions = await onboardingQuestions();

    await expect(
      submitOnboarding(studentBUserId, {
        answers: answersFor(questions),
        mentorConversationRequest: "NO",
      }, week38),
    ).resolves.toMatchObject({ checkInId: expect.any(String) });
  });

  it("selects three stable questions and a deterministic rotating pair", async () => {
    const first = await getWeeklyCheckInPageData(studentAUserId, week38);
    const repeated = await getWeeklyCheckInPageData(studentAUserId, week38);

    expect(first.status).toBe("AVAILABLE");
    expect(repeated.status).toBe("AVAILABLE");

    if (first.status !== "AVAILABLE" || repeated.status !== "AVAILABLE") {
      throw new Error("Expected the weekly Check-in to be available.");
    }

    expect(first.questions.slice(0, 3).map((question) => question.id)).toEqual([
      "question-weekly-organisation",
      "question-weekly-work-start",
      "question-weekly-help-seeking",
    ]);
    expect(first.questions.map((question) => question.id)).toEqual(
      repeated.questions.map((question) => question.id),
    );
    expect(first.questions).toHaveLength(5);
  });

  it("rejects a missing option and an option belonging to another question", async () => {
    const page = await getWeeklyCheckInPageData(studentBUserId, week39);

    if (page.status !== "AVAILABLE") {
      throw new Error("Expected the weekly Check-in to be available.");
    }

    const invalid = answersFor(page.questions);
    invalid[0] = { questionId: page.questions[0].id, optionId: "missing-option" };
    await expect(
      submitWeeklyCheckIn(studentBUserId, {
        answers: invalid,
        mentorConversationRequest: "NO",
      }, week39),
    ).rejects.toThrow("no longer valid");

    const wrongQuestion = answersFor(page.questions);
    wrongQuestion[0] = {
      questionId: page.questions[0].id,
      optionId: page.questions[1].options[0].id,
    };
    await expect(
      submitWeeklyCheckIn(studentBUserId, {
        answers: wrongQuestion,
        mentorConversationRequest: "NO",
      }, week39),
    ).rejects.toThrow("no longer valid");
  });

  it("stores authoritative weekly snapshots and a mentor conversation request", async () => {
    const page = await getWeeklyCheckInPageData(studentAUserId, week38);

    if (page.status !== "AVAILABLE") {
      throw new Error("Expected the weekly Check-in to be available.");
    }

    const answers = answersFor(page.questions).map((answer) => ({
      ...answer,
      questionTextSnapshot: "Client-supplied question text",
      optionLabelSnapshot: "Client-supplied option text",
      directionValueSnapshot: 3,
      domainSnapshot: "STUDY_CONFIDENCE",
      stableSnapshot: false,
      questionSignatureSnapshot: "forged-client-signature",
    }));
    const result = await submitWeeklyCheckIn(studentAUserId, {
      answers,
      mentorConversationRequest: "YES",
    }, week38);
    studentAWeeklyId = result.checkInId;
    const stored = await prisma.checkIn.findUniqueOrThrow({
      where: { id: result.checkInId },
      include: { answers: { orderBy: { sortOrder: "asc" } } },
    });

    expect(stored.mentorConversationRequest).toBe("YES");
    expect(stored.answers).toHaveLength(5);
    expect(stored.answers[0].domainSnapshot).toBe("ORGANISATION");
    expect(stored.answers[0].stableSnapshot).toBe(true);
    expect(stored.answers[0].questionSignatureSnapshot).toMatch(/^[0-9a-f]{64}$/);
    expect(stored.answers[0].questionTextSnapshot).not.toBe("Client-supplied question text");
    expect(stored.answers[0].optionLabelSnapshot).not.toBe("Client-supplied option text");
    await expect(
      prisma.auditEvent.count({
        where: {
          entityId: stored.id,
          action: "MENTOR_CONVERSATION_REQUESTED",
        },
      }),
    ).resolves.toBe(1);
  });

  it("rejects a second weekly submission for the same Student, semester, and period", async () => {
    const stored = await prisma.checkIn.findUniqueOrThrow({
      where: { id: studentAWeeklyId },
      include: { answers: true },
    });

    await expect(
      submitWeeklyCheckIn(studentAUserId, {
        answers: stored.answers.map((answer) => ({
          questionId: answer.questionId,
          optionId: answer.selectedOptionId,
        })),
        mentorConversationRequest: "NO",
      }, week38),
    ).rejects.toThrow("already been submitted");
  });

  it("preserves historical snapshots after an Admin edits the question and options", async () => {
    const before = await getStudentCheckIn(studentAUserId, studentAWeeklyId);
    const firstAnswer = await prisma.checkInAnswer.findFirstOrThrow({
      where: { checkInId: studentAWeeklyId },
      orderBy: { sortOrder: "asc" },
    });
    const original = await prisma.question.findUniqueOrThrow({
      where: { id: firstAnswer.questionId },
      include: { options: { orderBy: { sortOrder: "asc" } } },
    });
    questionBackup = original;
    editedQuestionId = original.id;

    await updateQuestion(adminUserId, original.id, {
      key: original.key,
      text: `${original.text} Updated for future Check-ins.`,
      domain: original.domain,
      type: original.type,
      context: original.context,
      stable: String(original.stable),
      active: String(original.active),
      sortOrder: original.sortOrder,
      options: original.options.map((option) => ({
        label: `${option.label} updated`,
        value: option.value,
        directionValue: option.directionValue,
        sortOrder: option.sortOrder,
      })),
    });

    const after = await getStudentCheckIn(studentAUserId, studentAWeeklyId);
    expect(after.answers[0].questionTextSnapshot).toBe(before.answers[0].questionTextSnapshot);
    expect(after.answers[0].optionLabelSnapshot).toBe(before.answers[0].optionLabelSnapshot);

    await restoreEditedQuestion();
  });

  it("stores a second Student Check-in and enforces ownership", async () => {
    const page = await getWeeklyCheckInPageData(studentBUserId, week39);

    if (page.status !== "AVAILABLE") {
      throw new Error("Expected the weekly Check-in to be available.");
    }

    const result = await submitWeeklyCheckIn(studentBUserId, {
      answers: answersFor(page.questions),
      mentorConversationRequest: "NO",
    }, week39);
    studentBWeeklyId = result.checkInId;

    await expect(getStudentCheckIn(studentAUserId, studentBWeeklyId)).rejects.toThrow(
      "Check-in not found",
    );
    await expect(getStudentCheckIn(studentBUserId, studentBWeeklyId)).resolves.toMatchObject({
      id: studentBWeeklyId,
    });
  });

  it("rejects Mentor, Admin, and unauthenticated submission actors", async () => {
    const page = await getWeeklyCheckInPageData(studentBUserId, week38);

    if (page.status !== "AVAILABLE") {
      throw new Error("Expected the weekly Check-in to be available.");
    }

    const input = {
      answers: answersFor(page.questions),
      mentorConversationRequest: "NO",
    };

    await expect(submitWeeklyCheckIn(mentorUserId, input, week38)).rejects.toThrow(
      "active Student account",
    );
    await expect(submitWeeklyCheckIn(adminUserId, input, week38)).rejects.toThrow(
      "active Student account",
    );
    await expect(submitWeeklyCheckIn("", input, week38)).rejects.toThrow(
      "active Student account",
    );
  });
  it.each(["MAYBE", "NO"] as const)("stores %s separately without an explicit request audit", async (signal) => {
    const date = new Date(signal === "MAYBE" ? "2026-10-15T10:00:00Z" : "2026-10-22T10:00:00Z");
    const page = await getWeeklyCheckInPageData(studentAUserId, date);
    if (page.status !== "AVAILABLE") throw new Error("Expected available weekly form");
    const answers = answersFor(page.questions);
    const help = page.questions.find((question) => question.id === "question-weekly-help-seeking")!;
    const neutral = help.options.find((option) => option.label === "I did not need help this week.")!;
    answers.find((answer) => answer.questionId === help.id)!.optionId = neutral.id;
    const result = await submitWeeklyCheckIn(studentAUserId, {
      answers, mentorConversationRequest: signal,
    }, date);
    const stored = await prisma.checkIn.findUniqueOrThrow({
      where: { id: result.checkInId }, include: { answers: true },
    });
    expect(stored.mentorConversationRequest).toBe(signal);
    expect(stored.answers.find((answer) => answer.questionId === help.id)).toMatchObject({
      optionLabelSnapshot: "I did not need help this week.", directionValueSnapshot: null,
    });
    expect(await prisma.auditEvent.count({ where: {
      entityId: stored.id, action: "MENTOR_CONVERSATION_REQUESTED",
    } })).toBe(0);
    // Admin edits cannot reinterpret a historical neutral answer as numeric difficulty.
    const option = await prisma.questionOption.findUniqueOrThrow({ where: { id: neutral.id } });
    try {
      await prisma.questionOption.update({ where: { id: neutral.id }, data: { directionValue: 3 } });
      const history = await getStudentCheckIn(studentAUserId, stored.id);
      expect(history.answers.find((answer) => answer.questionTextSnapshot === help.text)?.directionValueSnapshot).toBeNull();
    } finally {
      await prisma.questionOption.update({ where: { id: neutral.id }, data: { directionValue: option.directionValue } });
    }
  });

});
