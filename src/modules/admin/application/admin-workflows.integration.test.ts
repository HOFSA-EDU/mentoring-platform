import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import {
  createMentorAccount,
  createStudentAccount,
} from "@/modules/admin/application/accounts";
import { assignMentor } from "@/modules/admin/application/assignments";
import {
  createQuestion,
  createQuestTemplate,
} from "@/modules/admin/application/content";
import { createSemester } from "@/modules/admin/application/semesters";
import { AdminOperationError } from "@/modules/admin/domain/errors";
import { verifyPassword } from "@/modules/auth/infrastructure/password";

const adminUserId = "user-admin-001";
const studentActorId = "user-student-001";
const mentorActorId = "user-mentor-001";
const password = "Integration!2026";
const testEmails = [
  "phase02-integration-student@example.test",
  "phase02-integration-mentor-1@example.test",
  "phase02-integration-mentor-2@example.test",
  "phase02-unauthorized-student@example.test",
  "phase02-unauthorized-mentor@example.test",
];

async function cleanupIntegrationData() {
  const users = await prisma.user.findMany({
    where: { email: { in: testEmails } },
    select: {
      id: true,
      studentProfile: { select: { id: true } },
      mentorProfile: { select: { id: true } },
    },
  });
  const studentProfileIds = users.flatMap((user) =>
    user.studentProfile ? [user.studentProfile.id] : [],
  );
  const mentorProfileIds = users.flatMap((user) =>
    user.mentorProfile ? [user.mentorProfile.id] : [],
  );
  const assignments = await prisma.mentorAssignment.findMany({
    where: {
      OR: [
        { studentId: { in: studentProfileIds } },
        { mentorId: { in: mentorProfileIds } },
      ],
    },
    select: { id: true },
  });
  const questions = await prisma.question.findMany({
    where: { key: { startsWith: "PHASE02_TEST_" } },
    select: { id: true },
  });
  const templates = await prisma.questTemplate.findMany({
    where: { key: { startsWith: "PHASE02_TEST_" } },
    select: { id: true },
  });
  const semesters = await prisma.semester.findMany({
    where: { name: { startsWith: "Phase 02 Integration" } },
    select: { id: true },
  });
  const entityIds = [
    ...users.map((user) => user.id),
    ...assignments.map((assignment) => assignment.id),
    ...questions.map((question) => question.id),
    ...templates.map((template) => template.id),
    ...semesters.map((semester) => semester.id),
  ];

  if (entityIds.length > 0) {
    await prisma.auditEvent.deleteMany({ where: { entityId: { in: entityIds } } });
  }
  await prisma.mentorAssignment.deleteMany({
    where: {
      OR: [
        { studentId: { in: studentProfileIds } },
        { mentorId: { in: mentorProfileIds } },
      ],
    },
  });
  await prisma.user.deleteMany({ where: { id: { in: users.map((user) => user.id) } } });
  await prisma.question.deleteMany({ where: { id: { in: questions.map((question) => question.id) } } });
  await prisma.questTemplate.deleteMany({ where: { id: { in: templates.map((template) => template.id) } } });

  await prisma.$transaction(async (transaction) => {
    await transaction.semester.updateMany({
      where: { active: true },
      data: { active: false },
    });
    await transaction.semester.deleteMany({
      where: { id: { in: semesters.map((semester) => semester.id) } },
    });
    await transaction.semester.update({
      where: { id: "semester-2026-autumn" },
      data: { active: true },
    });
  });
}

describe.sequential("Phase 02 Admin workflows", () => {
  let studentProfileId: string;
  let firstMentorProfileId: string;
  let secondMentorProfileId: string;

  beforeAll(cleanupIntegrationData);
  afterAll(async () => {
    await cleanupIntegrationData();
    await prisma.$disconnect();
  });

  it("rejects Student and Mentor actors while allowing an Admin actor", async () => {
    const semesterId = "semester-2026-autumn";

    await expect(
      createStudentAccount(studentActorId, {
        name: "Unauthorized Student Actor",
        email: testEmails[3],
        password,
        semesterId,
      }),
    ).rejects.toThrow("Administrator access is required.");

    await expect(
      createMentorAccount(mentorActorId, {
        name: "Unauthorized Mentor Actor",
        email: testEmails[4],
        password,
      }),
    ).rejects.toThrow("Administrator access is required.");

    const created = await createStudentAccount(adminUserId, {
      name: "Integration Student",
      email: testEmails[0],
      password,
      semesterId,
    });
    studentProfileId = created.studentProfileId;
    expect(created.userId).toBeTruthy();
  });

  it("creates User and StudentProfile atomically with a password hash", async () => {
    const student = await prisma.user.findUniqueOrThrow({
      where: { email: testEmails[0] },
      include: { studentProfile: true },
    });

    expect(student.role).toBe("STUDENT");
    expect(student.studentProfile?.id).toBe(studentProfileId);
    expect(student.passwordHash).not.toBe(password);
    await expect(verifyPassword(password, student.passwordHash)).resolves.toBe(true);
  });

  it("rejects duplicate student email and invalid data", async () => {
    await expect(
      createStudentAccount(adminUserId, {
        name: "Duplicate Student",
        email: testEmails[0],
        password,
        semesterId: "semester-2026-autumn",
      }),
    ).rejects.toMatchObject({
      fieldErrors: { email: ["An account with this email already exists."] },
    });

    await expect(
      createStudentAccount(adminUserId, {
        name: "",
        email: "invalid",
        password: "short",
        semesterId: "",
      }),
    ).rejects.toBeInstanceOf(AdminOperationError);
  });

  it("creates mentor User and MentorProfile with a password hash", async () => {
    const first = await createMentorAccount(adminUserId, {
      name: "Integration Mentor One",
      email: testEmails[1],
      password,
    });
    const second = await createMentorAccount(adminUserId, {
      name: "Integration Mentor Two",
      email: testEmails[2],
      password,
    });
    firstMentorProfileId = first.mentorProfileId;
    secondMentorProfileId = second.mentorProfileId;

    const mentor = await prisma.user.findUniqueOrThrow({
      where: { email: testEmails[1] },
      include: { mentorProfile: true },
    });
    expect(mentor.role).toBe("MENTOR");
    expect(mentor.mentorProfile?.id).toBe(firstMentorProfileId);
    await expect(verifyPassword(password, mentor.passwordHash)).resolves.toBe(true);
  });

  it("creates and reassigns a mentor while retaining one active assignment", async () => {
    const first = await assignMentor(adminUserId, {
      studentProfileId,
      mentorProfileId: firstMentorProfileId,
    });
    const second = await assignMentor(adminUserId, {
      studentProfileId,
      mentorProfileId: secondMentorProfileId,
    });
    const assignments = await prisma.mentorAssignment.findMany({
      where: { studentId: studentProfileId },
      orderBy: { assignedAt: "asc" },
    });

    expect(first.changed).toBe(true);
    expect(second.changed).toBe(true);
    expect(assignments).toHaveLength(2);
    expect(assignments.filter((assignment) => assignment.active)).toHaveLength(1);
    expect(assignments.find((assignment) => assignment.id === first.assignmentId)).toMatchObject({
      active: false,
    });
    expect(assignments.find((assignment) => assignment.id === first.assignmentId)?.deactivatedAt).toBeInstanceOf(Date);
    expect(assignments.find((assignment) => assignment.id === second.assignmentId)?.active).toBe(true);
  });

  it("activating a semester deactivates the previous active semester", async () => {
    const first = await createSemester(adminUserId, {
      name: "Phase 02 Integration A",
      startDate: "2027-02-01",
      endDate: "2027-06-30",
      active: "true",
    });
    const second = await createSemester(adminUserId, {
      name: "Phase 02 Integration B",
      startDate: "2027-09-01",
      endDate: "2028-01-31",
      active: "true",
    });
    const activeSemesters = await prisma.semester.findMany({
      where: { active: true },
      select: { id: true },
    });

    expect(activeSemesters).toEqual([{ id: second.id }]);
    await expect(
      prisma.semester.findUniqueOrThrow({ where: { id: first.id } }),
    ).resolves.toMatchObject({ active: false });
  });

  it("creates a question with ordered options and rejects invalid enums", async () => {
    await expect(
      createQuestion(adminUserId, {
        key: "PHASE02_TEST_INVALID_QUESTION",
        text: "Did you identify a clear first study task this week?",
        domain: "INVALID_DOMAIN",
        type: "SCALE",
        stable: "false",
        active: "true",
        sortOrder: 900,
        options: [
          { label: "Yes", value: "yes", directionValue: 0, sortOrder: 1 },
          { label: "No", value: "no", directionValue: 3, sortOrder: 2 },
        ],
      }),
    ).rejects.toBeInstanceOf(AdminOperationError);

    const created = await createQuestion(adminUserId, {
      key: "PHASE02_TEST_QUESTION",
      text: "Did you identify a clear first study task this week?",
      domain: "ORGANISATION",
      type: "BOOLEAN",
      stable: "false",
      active: "true",
      sortOrder: 900,
      options: [
        { label: "Yes", value: "yes", directionValue: 0, sortOrder: 1 },
        { label: "No", value: "no", directionValue: 3, sortOrder: 2 },
      ],
    });
    const question = await prisma.question.findUniqueOrThrow({
      where: { id: created.id },
      include: { options: { orderBy: { sortOrder: "asc" } } },
    });

    expect(question.options).toHaveLength(2);
    expect(question.options.map((option) => option.value)).toEqual(["yes", "no"]);
  });

  it("creates a Quest template and rejects an invalid domain", async () => {
    await expect(
      createQuestTemplate(adminUserId, {
        key: "PHASE02_TEST_INVALID_TEMPLATE",
        title: "Invalid template",
        description: "Take one clear and observable study action during the week.",
        domain: "INVALID_DOMAIN",
        active: "true",
        defaultDurationDays: 7,
        reflectionPrompt: "What did you notice after trying the action?",
      }),
    ).rejects.toBeInstanceOf(AdminOperationError);

    const created = await createQuestTemplate(adminUserId, {
      key: "PHASE02_TEST_TEMPLATE",
      title: "Plan Tomorrow",
      description: "Before finishing today, write down the first study task for tomorrow.",
      domain: "ORGANISATION",
      active: "true",
      defaultDurationDays: 7,
      reflectionPrompt: "Did knowing the first task make it easier to begin?",
    });

    await expect(
      prisma.questTemplate.findUniqueOrThrow({ where: { id: created.id } }),
    ).resolves.toMatchObject({ key: "PHASE02_TEST_TEMPLATE" });
  });
});
