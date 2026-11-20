import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import {
  DevelopmentDomain,
  PrismaClient,
  QuestionContext,
  QuestionType,
  UserRole,
} from "../src/generated/prisma/client";
import { parseDatabaseEnvironment } from "../src/lib/env";

const { DATABASE_URL } = parseDatabaseEnvironment(process.env);
const adapter = new PrismaPg({ connectionString: DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const seededAt = new Date("2026-09-01T08:00:00.000Z");
// Development-only password: MentoringDev!2026
// The bcrypt hash is fixed so repeated seeds remain deterministic.
const developmentPasswordHash =
  "$2b$12$JPuDCu4sZk4yjnxvdMbPAOWYsuOvWE/gOMZNrDfui9xCWm8oqoZPe";

const users = [
  {
    id: "user-admin-001",
    email: "admin@example.test",
    name: "Alexis Admin",
    role: UserRole.ADMIN,
  },
  {
    id: "user-mentor-001",
    email: "mentor1@example.test",
    name: "Avery Mentor",
    role: UserRole.MENTOR,
  },
  {
    id: "user-mentor-002",
    email: "mentor2@example.test",
    name: "Morgan Mentor",
    role: UserRole.MENTOR,
  },
  {
    id: "user-student-001",
    email: "student1@example.test",
    name: "Alex Martin",
    role: UserRole.STUDENT,
  },
  {
    id: "user-student-002",
    email: "student2@example.test",
    name: "Camille Bernard",
    role: UserRole.STUDENT,
  },
  {
    id: "user-student-003",
    email: "student3@example.test",
    name: "Jamie Dubois",
    role: UserRole.STUDENT,
  },
  {
    id: "user-student-004",
    email: "student4@example.test",
    name: "Lina Moreau",
    role: UserRole.STUDENT,
  },
  {
    id: "user-student-005",
    email: "student5@example.test",
    name: "Noa Robert",
    role: UserRole.STUDENT,
  },
  {
    id: "user-student-006",
    email: "student6@example.test",
    name: "Sacha Petit",
    role: UserRole.STUDENT,
  },
  {
    id: "user-student-007",
    email: "student7@example.test",
    name: "Taylor Simon",
    role: UserRole.STUDENT,
  },
  {
    id: "user-student-008",
    email: "student8@example.test",
    name: "Yanis Laurent",
    role: UserRole.STUDENT,
  },
] as const;

const mentorProfiles = [
  {
    id: "mentor-profile-001",
    userId: "user-mentor-001",
  },
  {
    id: "mentor-profile-002",
    userId: "user-mentor-002",
  },
] as const;

const studentProfiles = Array.from({ length: 8 }, (_, index) => {
  const sequence = String(index + 1).padStart(3, "0");

  return {
    id: `student-profile-${sequence}`,
    userId: `user-student-${sequence}`,
  };
});

const questionLibrary = [
  {
    id: "question-weekly-organisation",
    key: "WEEKLY_ORGANISATION_NEXT_TASK",
    text: "How well did you keep track of your assignments and deadlines this week?",
    domain: DevelopmentDomain.ORGANISATION,
    type: QuestionType.SINGLE_CHOICE,
    stable: true,
    sortOrder: 10,
    options: [
      ["i-had-everything-under-control", "I had everything under control.", 0],
      ["i-kept-track-of-most-things", "I kept track of most things.", 1],
      ["i-lost-track-of-some-things", "I lost track of some things.", 2],
      ["i-lost-track-of-several-things", "I lost track of several things.", 3],
    ],
  },
  {
    id: "question-weekly-work-start",
    key: "WEEKLY_WORK_START_DELAY",
    text: "How often did you start an assignment later than you originally intended this week?",
    domain: DevelopmentDomain.WORK_START,
    type: QuestionType.SINGLE_CHOICE,
    stable: true,
    sortOrder: 20,
    options: [
      ["never", "Never.", 0],
      ["once", "Once.", 1],
      ["several-times", "Several times.", 2],
      ["for-almost-every-larger-assignment", "For almost every larger assignment.", 3],
    ],
  },
  {
    id: "question-weekly-help-seeking",
    key: "WEEKLY_HELP_SEEKING_SPEED",
    text: "When you did not understand something or got stuck this week, how quickly did you ask for help?",
    domain: DevelopmentDomain.HELP_SEEKING,
    type: QuestionType.SINGLE_CHOICE,
    stable: true,
    sortOrder: 30,
    options: [
      ["relatively-quickly", "Relatively quickly.", 0],
      ["after-some-time", "After some time.", 1],
      ["very-late", "Very late.", 2],
      ["i-did-not-ask-even-though-i-needed-help", "I did not ask even though I needed help.", 3],
      ["i-did-not-need-help-this-week", "I did not need help this week.", null],
    ],
  },
  {
    id: "question-organisation-deadlines",
    key: "ORGANISATION_CHECKED_DEADLINES",
    text: "How often did you forget that an assignment or deadline was coming up this week?",
    domain: DevelopmentDomain.ORGANISATION,
    type: QuestionType.SINGLE_CHOICE,
    stable: false,
    sortOrder: 110,
    options: [
      ["not-at-all", "Not at all.", 0],
      ["once", "Once.", 1],
      ["several-times", "Several times.", 2],
      ["very-often", "Very often.", 3],
    ],
  },
  {
    id: "question-organisation-priorities",
    key: "ORGANISATION_DECIDED_AFTER_STARTING",
    text: "How often did you clearly know what you should work on next this week?",
    domain: DevelopmentDomain.ORGANISATION,
    type: QuestionType.SINGLE_CHOICE,
    stable: false,
    sortOrder: 120,
    options: [
      ["almost-always", "Almost always.", 0],
      ["most-of-the-time", "Most of the time.", 1],
      ["sometimes", "Sometimes.", 2],
      ["rarely", "Rarely.", 3],
    ],
  },
  {
    id: "question-work-start-large-task",
    key: "WORK_START_TASK_FELT_LARGE",
    text: "How often did you postpone an assignment this week even though you actually had time to work on it?",
    domain: DevelopmentDomain.WORK_START,
    type: QuestionType.SINGLE_CHOICE,
    stable: false,
    sortOrder: 210,
    options: [
      ["not-at-all", "Not at all.", 0],
      ["once", "Once.", 1],
      ["several-times", "Several times.", 2],
      ["very-often", "Very often.", 3],
    ],
  },
  {
    id: "question-work-start-planned-time",
    key: "WORK_START_AT_PLANNED_TIME",
    text: "When a task felt large or unclear this week, how well were you able to identify a first step?",
    domain: DevelopmentDomain.WORK_START,
    type: QuestionType.SINGLE_CHOICE,
    stable: false,
    sortOrder: 220,
    options: [
      ["very-well", "Very well.", 0],
      ["usually-well", "Usually well.", 1],
      ["only-with-difficulty", "Only with difficulty.", 2],
      ["often-not-at-all", "Often not at all.", 3],
    ],
  },
  {
    id: "question-help-seeking-stuck",
    key: "HELP_SEEKING_STUCK_DURATION",
    text: "Was there a situation this week where you probably should have asked for help but did not?",
    domain: DevelopmentDomain.HELP_SEEKING,
    type: QuestionType.SINGLE_CHOICE,
    stable: false,
    sortOrder: 310,
    options: [
      ["no", "No.", 0],
      ["once", "Once.", 1],
      ["several-times", "Several times.", 2],
      ["i-am-not-sure", "I am not sure.", null],
    ],
  },
  {
    id: "question-help-seeking-contact",
    key: "HELP_SEEKING_CONTACTED_SOMEONE",
    text: "How easy was it for you this week to tell a teacher, mentor, or classmate that you did not understand something?",
    domain: DevelopmentDomain.HELP_SEEKING,
    type: QuestionType.SINGLE_CHOICE,
    stable: false,
    sortOrder: 320,
    options: [
      ["very-easy", "Very easy.", 0],
      ["rather-easy", "Rather easy.", 1],
      ["rather-difficult", "Rather difficult.", 2],
      ["very-difficult", "Very difficult.", 3],
    ],
  },
  {
    id: "question-understanding-notes",
    key: "UNDERSTANDING_NOTED_UNCLEAR_TOPICS",
    text: "How often did you have the feeling this week: \"I completed it, but I did not really understand it\"?",
    domain: DevelopmentDomain.LEARNING_UNDERSTANDING,
    type: QuestionType.SINGLE_CHOICE,
    stable: false,
    sortOrder: 410,
    options: [
      ["never", "Never.", 0],
      ["once", "Once.", 1],
      ["several-times", "Several times.", 2],
      ["very-often", "Very often.", 3],
    ],
  },
  {
    id: "question-understanding-explain",
    key: "UNDERSTANDING_EXPLAIN_MAIN_IDEA",
    text: "How often did you actively check whether you really understood a topic this week?",
    domain: DevelopmentDomain.LEARNING_UNDERSTANDING,
    type: QuestionType.SINGLE_CHOICE,
    stable: false,
    sortOrder: 420,
    options: [
      ["several-times", "Several times.", 0],
      ["once", "Once.", 1],
      ["not-at-all", "Not at all.", 2],
      ["i-did-not-know-how-to-check", "I did not know how to check.", 3],
    ],
  },
  {
    id: "question-workload-unfinished",
    key: "WORKLOAD_PLANNED_TASKS_UNFINISHED",
    text: "How often did you feel this week that too many things were happening at the same time?",
    domain: DevelopmentDomain.PERCEIVED_WORKLOAD,
    type: QuestionType.SINGLE_CHOICE,
    stable: false,
    sortOrder: 510,
    options: [
      ["never", "Never.", 0],
      ["once", "Once.", 1],
      ["several-times", "Several times.", 2],
      ["very-often", "Very often.", 3],
    ],
  },
  {
    id: "question-workload-breaks",
    key: "WORKLOAD_SKIPPED_BREAKS",
    text: "How well were you able to decide what was most important when you had several tasks this week?",
    domain: DevelopmentDomain.PERCEIVED_WORKLOAD,
    type: QuestionType.SINGLE_CHOICE,
    stable: false,
    sortOrder: 520,
    options: [
      ["very-well", "Very well.", 0],
      ["usually-well", "Usually well.", 1],
      ["only-partly", "Only partly.", 2],
      ["often-not-at-all", "Often not at all.", 3],
    ],
  },
  {
    id: "question-confidence-similar-task",
    key: "CONFIDENCE_TRIED_SIMILAR_TASK",
    text: "When you encountered a difficult assignment this week, what did you usually think?",
    domain: DevelopmentDomain.STUDY_CONFIDENCE,
    type: QuestionType.SINGLE_CHOICE,
    stable: false,
    sortOrder: 610,
    options: [
      ["i-will-find-a-way", "I will find a way.", 0],
      ["this-will-be-difficult-but-i-will-try", "This will be difficult, but I will try.", 1],
      ["i-quickly-became-unsure", "I quickly became unsure.", 2],
      ["i-quickly-thought-that-i-probably-could-not-do-it", "I quickly thought that I probably could not do it.", 3],
    ],
  },
  {
    id: "question-confidence-shared-answer",
    key: "CONFIDENCE_SHARED_UNCERTAIN_ANSWER",
    text: "How often did you start an assignment this week even though you were not sure you could solve it correctly?",
    domain: DevelopmentDomain.STUDY_CONFIDENCE,
    type: QuestionType.SINGLE_CHOICE,
    stable: false,
    sortOrder: 620,
    options: [
      ["several-times", "Several times.", 0],
      ["once", "Once.", 1],
      ["not-at-all", "Not at all.", 2],
      ["there-was-no-situation-like-this", "There was no situation like this.", null],
    ],
  },
] as const;

const onboardingQuestionLibrary = [
  {
    id: "question-onboarding-organisation-plan",
    key: "ONBOARDING_ORGANISATION_FIRST_STEP",
    text: "You receive an assignment that is due in one week. What usually happens first?",
    domain: DevelopmentDomain.ORGANISATION,
    type: QuestionType.SINGLE_CHOICE,
    context: QuestionContext.ONBOARDING,
    stable: false,
    sortOrder: 10,
    options: [
      ["i-decide-early-when-i-will-work-on-it", "I decide early when I will work on it.", 0],
      ["i-keep-it-in-mind-but-do-not-make-a-concrete-plan", "I keep it in mind but do not make a concrete plan.", 1],
      ["i-usually-start-when-the-deadline-gets-closer", "I usually start when the deadline gets closer.", 2],
      ["i-sometimes-lose-track-of-assignments-like-this", "I sometimes lose track of assignments like this.", 3],
    ],
  },
  {
    id: "question-onboarding-organisation-overview",
    key: "ONBOARDING_ORGANISATION_MULTIPLE_TASKS",
    text: "You have several assignments due in the same week. How do you usually handle them?",
    domain: DevelopmentDomain.ORGANISATION,
    type: QuestionType.SINGLE_CHOICE,
    context: QuestionContext.ONBOARDING,
    stable: false,
    sortOrder: 20,
    options: [
      ["i-prioritize-them-and-plan-my-time", "I prioritize them and plan my time.", 0],
      ["one-by-one-without-plan", "I work through them one by one without much of a plan.", 1],
      ["switch-by-urgency", "I switch between tasks depending on what feels most urgent.", 2],
      ["i-often-do-not-know-where-to-start", "I often do not know where to start.", 3],
    ],
  },
  {
    id: "question-onboarding-work-start-large",
    key: "ONBOARDING_WORK_START_LARGE_TASK",
    text: "You know you need to work on an important task, but it feels quite large. What usually happens?",
    domain: DevelopmentDomain.WORK_START,
    type: QuestionType.SINGLE_CHOICE,
    context: QuestionContext.ONBOARDING,
    stable: false,
    sortOrder: 30,
    options: [
      ["i-start-with-one-small-first-step", "I start with one small first step.", 0],
      ["i-think-about-it-for-a-while-and-start-later", "I think about it for a while and start later.", 1],
      ["i-postpone-it-until-there-is-more-time-pressure", "I postpone it until there is more time pressure.", 2],
      ["i-often-do-not-know-how-to-begin", "I often do not know how to begin.", 3],
    ],
  },
  {
    id: "question-onboarding-work-start-interruption",
    key: "ONBOARDING_WORK_START_AFTER_INTERRUPTION",
    text: "You still have several days before an assignment is due. How likely are you to start working on it already?",
    domain: DevelopmentDomain.WORK_START,
    type: QuestionType.SINGLE_CHOICE,
    context: QuestionContext.ONBOARDING,
    stable: false,
    sortOrder: 40,
    options: [
      ["very-likely", "Very likely.", 0],
      ["it-depends-on-the-assignment", "It depends on the assignment.", 1],
      ["i-usually-start-closer-to-the-deadline", "I usually start closer to the deadline.", 2],
      ["almost-never-without-external-pressure", "Almost never without external pressure.", 3],
    ],
  },
  {
    id: "question-onboarding-help-class",
    key: "ONBOARDING_HELP_SEEKING_CLASS",
    text: "You do not understand something important during class. What do you usually do?",
    domain: DevelopmentDomain.HELP_SEEKING,
    type: QuestionType.SINGLE_CHOICE,
    context: QuestionContext.ONBOARDING,
    stable: false,
    sortOrder: 50,
    options: [
      ["i-ask-immediately", "I ask immediately.", 0],
      ["i-ask-someone-later", "I ask someone later.", 1],
      ["i-try-to-solve-it-on-my-own-first", "I try to solve it on my own first.", 2],
      ["i-usually-leave-it-unresolved-for-now", "I usually leave it unresolved for now.", 3],
    ],
  },
  {
    id: "question-onboarding-help-assignment",
    key: "ONBOARDING_HELP_SEEKING_ASSIGNMENT",
    text: "You are working on an assignment and have been stuck for a while. What usually happens?",
    domain: DevelopmentDomain.HELP_SEEKING,
    type: QuestionType.SINGLE_CHOICE,
    context: QuestionContext.ONBOARDING,
    stable: false,
    sortOrder: 60,
    options: [
      ["i-ask-for-help-relatively-quickly", "I ask for help relatively quickly.", 0],
      ["i-keep-trying-on-my-own-for-a-while", "I keep trying on my own for a while.", 1],
      ["i-switch-to-something-else-first", "I switch to something else first.", 2],
      ["i-often-stay-stuck-for-a-long-time-without-asking-anyone", "I often stay stuck for a long time without asking anyone.", 3],
    ],
  },
  {
    id: "question-onboarding-understanding-check",
    key: "ONBOARDING_UNDERSTANDING_CHECK",
    text: "You have studied a topic. How do you usually check whether you really understood it?",
    domain: DevelopmentDomain.LEARNING_UNDERSTANDING,
    type: QuestionType.SINGLE_CHOICE,
    context: QuestionContext.ONBOARDING,
    stable: false,
    sortOrder: 70,
    options: [
      ["i-test-myself-or-try-to-explain-it-to-someone", "I test myself or try to explain it to someone.", 0],
      ["i-work-on-exercises-related-to-it", "I work on exercises related to it.", 1],
      ["i-read-through-my-notes-again", "I read through my notes again.", 2],
      ["i-usually-do-not-really-check", "I usually do not really check.", 3],
    ],
  },
  {
    id: "question-onboarding-understanding-mistake",
    key: "ONBOARDING_UNDERSTANDING_MISTAKE",
    text: "You receive a solution to an assignment, but you do not understand why it works. What do you usually do?",
    domain: DevelopmentDomain.LEARNING_UNDERSTANDING,
    type: QuestionType.SINGLE_CHOICE,
    context: QuestionContext.ONBOARDING,
    stable: false,
    sortOrder: 80,
    options: [
      ["i-try-to-understand-why-the-solution-works", "I try to understand why the solution works.", 0],
      ["i-ask-someone-to-explain-it", "I ask someone to explain it.", 0],
      ["i-mainly-remember-the-steps-used-in-the-solution", "I mainly remember the steps used in the solution.", 2],
      ["i-move-on-as-long-as-i-managed-to-complete-the-task", "I move on as long as I managed to complete the task.", 3],
    ],
  },
  {
    id: "question-onboarding-workload-deadlines",
    key: "ONBOARDING_WORKLOAD_DEADLINES",
    text: "Several deadlines fall into the same week. How do you usually react?",
    domain: DevelopmentDomain.PERCEIVED_WORKLOAD,
    type: QuestionType.SINGLE_CHOICE,
    context: QuestionContext.ONBOARDING,
    stable: false,
    sortOrder: 90,
    options: [
      ["i-organize-the-tasks-and-work-through-them-by-priority", "I organize the tasks and work through them by priority.", 0],
      ["pressure-but-keep-track", "I feel some pressure but usually keep track of everything.", 1],
      ["i-partially-lose-track-of-what-needs-to-be-done", "I partially lose track of what needs to be done.", 2],
      ["i-quickly-feel-blocked-and-do-not-know-where-to-start", "I quickly feel blocked and do not know where to start.", 3],
    ],
  },
  {
    id: "question-onboarding-confidence-new-task",
    key: "ONBOARDING_CONFIDENCE_NEW_TASK",
    text: "You receive a difficult assignment that you have never done before. What is your typical first reaction?",
    domain: DevelopmentDomain.STUDY_CONFIDENCE,
    type: QuestionType.SINGLE_CHOICE,
    context: QuestionContext.ONBOARDING,
    stable: false,
    sortOrder: 100,
    options: [
      ["i-assume-i-can-work-it-out-step-by-step", "I assume I can work it out step by step.", 0],
      ["i-feel-unsure-but-start-anyway", "I feel unsure but start anyway.", 1],
      ["i-wait-because-i-am-worried-about-doing-it-wrong", "I wait because I am worried about doing it wrong.", 2],
      ["i-quickly-think-that-i-probably-cannot-do-it", "I quickly think that I probably cannot do it.", 3],
    ],
  },
] as const;

const seededQuestionLibrary = [
  ...questionLibrary.map((question) => ({
    ...question,
    context: QuestionContext.WEEKLY,
  })),
  ...onboardingQuestionLibrary,
] as const;

const questTemplates = [
  {
    id: "quest-template-early-start",
    key: "EARLY_START",
    title: "Early Start",
    description: "Begin one assignment at least three days before its deadline and work on it for at least 15 minutes.",
    domain: DevelopmentDomain.WORK_START,
    defaultDurationDays: 7,
    reflectionPrompt: "What did you notice after starting earlier?",
  },
  {
    id: "quest-template-ask-early",
    key: "ASK_EARLY",
    title: "Ask Early",
    description: "When you notice that you are stuck, ask for help within 24 hours.",
    domain: DevelopmentDomain.HELP_SEEKING,
    defaultDurationDays: 7,
    reflectionPrompt: "What changed when you asked sooner?",
  },
  {
    id: "quest-template-weekly-map",
    key: "WEEKLY_MAP",
    title: "Weekly Map",
    description: "Write down the three most important study tasks for the coming week.",
    domain: DevelopmentDomain.ORGANISATION,
    defaultDurationDays: 7,
    reflectionPrompt: "Did the three-task map make your next step clearer?",
  },
  {
    id: "quest-template-break-it-down",
    key: "BREAK_IT_DOWN",
    title: "Break It Down",
    description: "Choose one larger task and divide it into three smaller first steps.",
    domain: DevelopmentDomain.WORK_START,
    defaultDurationDays: 7,
    reflectionPrompt: "Which smaller first step was easiest to begin?",
  },
  {
    id: "quest-template-clarify-one-thing",
    key: "CLARIFY_ONE_THING",
    title: "Clarify One Thing",
    description: "Identify one topic that is unclear and actively clarify it with a teacher, mentor or classmate.",
    domain: DevelopmentDomain.LEARNING_UNDERSTANDING,
    defaultDurationDays: 7,
    reflectionPrompt: "What became clearer after you asked?",
  },
] as const;

async function main() {
  await prisma.semester.updateMany({
    where: { active: true },
    data: { active: false },
  });

  const semester = await prisma.semester.upsert({
    where: { id: "semester-2026-autumn" },
    update: {
      name: "Autumn 2026 · Semester 1",
      startDate: new Date("2026-09-01T00:00:00.000Z"),
      endDate: new Date("2027-01-31T23:59:59.999Z"),
      active: true,
      createdAt: seededAt,
      updatedAt: seededAt,
    },
    create: {
      id: "semester-2026-autumn",
      name: "Autumn 2026 · Semester 1",
      startDate: new Date("2026-09-01T00:00:00.000Z"),
      endDate: new Date("2027-01-31T23:59:59.999Z"),
      active: true,
      createdAt: seededAt,
      updatedAt: seededAt,
    },
  });

  for (const user of users) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: {
        email: user.email,
        name: user.name,
        role: user.role,
        passwordHash: developmentPasswordHash,
        active: true,
        createdAt: seededAt,
        updatedAt: seededAt,
      },
      create: {
        ...user,
        passwordHash: developmentPasswordHash,
        active: true,
        createdAt: seededAt,
        updatedAt: seededAt,
      },
    });
  }

  for (const profile of mentorProfiles) {
    await prisma.mentorProfile.upsert({
      where: { id: profile.id },
      update: {
        userId: profile.userId,
        active: true,
        createdAt: seededAt,
        updatedAt: seededAt,
      },
      create: {
        ...profile,
        active: true,
        createdAt: seededAt,
        updatedAt: seededAt,
      },
    });
  }

  for (const profile of studentProfiles) {
    await prisma.studentProfile.upsert({
      where: { id: profile.id },
      update: {
        userId: profile.userId,
        semesterId: semester.id,
        active: true,
        createdAt: seededAt,
        updatedAt: seededAt,
      },
      create: {
        ...profile,
        semesterId: semester.id,
        active: true,
        createdAt: seededAt,
        updatedAt: seededAt,
      },
    });
  }

  await prisma.mentorAssignment.updateMany({
    where: {
      studentId: { in: studentProfiles.map((profile) => profile.id) },
      active: true,
    },
    data: { active: false, deactivatedAt: seededAt },
  });

  for (const [index, student] of studentProfiles.entries()) {
    const mentor = mentorProfiles[index < 4 ? 0 : 1];

    await prisma.mentorAssignment.upsert({
      where: { id: `mentor-assignment-${String(index + 1).padStart(3, "0")}` },
      update: {
        studentId: student.id,
        mentorId: mentor.id,
        active: true,
        assignedAt: seededAt,
        deactivatedAt: null,
      },
      create: {
        id: `mentor-assignment-${String(index + 1).padStart(3, "0")}`,
        studentId: student.id,
        mentorId: mentor.id,
        active: true,
        assignedAt: seededAt,
        deactivatedAt: null,
      },
    });
  }

  for (const questionDefinition of seededQuestionLibrary) {
    const { options, ...questionData } = questionDefinition;
    const question = await prisma.question.upsert({
      where: { id: questionData.id },
      update: {
        key: questionData.key,
        text: questionData.text,
        domain: questionData.domain,
        type: questionData.type,
        context: questionData.context,
        stable: questionData.stable,
        active: true,
        sortOrder: questionData.sortOrder,
        createdAt: seededAt,
        updatedAt: seededAt,
      },
      create: {
        ...questionData,
        active: true,
        createdAt: seededAt,
        updatedAt: seededAt,
      },
    });

    await prisma.$transaction(async (transaction) => {
      await transaction.questionOption.deleteMany({ where: { questionId: question.id } });
      await transaction.questionOption.createMany({
        data: options.map(([value, label, directionValue], index) => ({
          id: `${questionData.id}-option-${value}`,
          questionId: question.id,
          label,
          value,
          directionValue,
          sortOrder: index + 1,
        })),
      });
    });
  }

  for (const template of questTemplates) {
    await prisma.questTemplate.upsert({
      where: { id: template.id },
      update: {
        ...template,
        active: true,
        createdAt: seededAt,
        updatedAt: seededAt,
      },
      create: {
        ...template,
        active: true,
        createdAt: seededAt,
        updatedAt: seededAt,
      },
    });
  }

  console.info(
    `Seeded 1 admin, 2 mentors, 8 students, 8 assignments, 1 active semester, ${seededQuestionLibrary.length} questions (${onboardingQuestionLibrary.length} onboarding), and ${questTemplates.length} Quest templates.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
