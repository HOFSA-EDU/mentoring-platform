import type { DevelopmentDomain } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { developmentDomainSchema } from "@/modules/admin/domain/schemas";

export async function getAdminOverview() {
  const [
    activeStudents,
    activeMentors,
    activeAssignments,
    activeSemester,
    activeQuestions,
    activeQuestTemplates,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "STUDENT", active: true } }),
    prisma.user.count({ where: { role: "MENTOR", active: true } }),
    prisma.mentorAssignment.count({ where: { active: true } }),
    prisma.semester.findFirst({
      where: { active: true },
      select: { id: true, name: true, startDate: true, endDate: true },
    }),
    prisma.question.count({ where: { active: true } }),
    prisma.questTemplate.count({ where: { active: true } }),
  ]);

  return {
    activeStudents,
    activeMentors,
    activeAssignments,
    activeSemester,
    activeQuestions,
    activeQuestTemplates,
  };
}

export async function listStudents(search = "") {
  const query = search.trim().slice(0, 100);

  return prisma.studentProfile.findMany({
    where: query
      ? {
          user: {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
            ],
          },
        }
      : undefined,
    select: {
      id: true,
      active: true,
      user: { select: { id: true, name: true, email: true, active: true } },
      semester: { select: { id: true, name: true, active: true } },
      assignments: {
        where: { active: true },
        take: 1,
        select: {
          id: true,
          mentor: { select: { user: { select: { name: true } } } },
        },
      },
    },
    orderBy: { user: { name: "asc" } },
  });
}

export function getStudent(studentProfileId: string) {
  return prisma.studentProfile.findUnique({
    where: { id: studentProfileId },
    select: {
      id: true,
      semesterId: true,
      user: { select: { id: true, name: true, email: true, active: true } },
    },
  });
}

export async function listMentors(search = "") {
  const query = search.trim().slice(0, 100);

  return prisma.mentorProfile.findMany({
    where: query
      ? {
          user: {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
            ],
          },
        }
      : undefined,
    select: {
      id: true,
      user: { select: { id: true, name: true, email: true, active: true } },
      _count: { select: { assignments: { where: { active: true } } } },
    },
    orderBy: { user: { name: "asc" } },
  });
}

export function getMentor(mentorProfileId: string) {
  return prisma.mentorProfile.findUnique({
    where: { id: mentorProfileId },
    select: {
      id: true,
      user: { select: { id: true, name: true, email: true, active: true } },
    },
  });
}

export async function getAssignmentManagementData() {
  const [students, mentors, history] = await Promise.all([
    prisma.studentProfile.findMany({
      select: {
        id: true,
        user: { select: { name: true, active: true } },
        assignments: {
          where: { active: true },
          take: 1,
          select: {
            id: true,
            assignedAt: true,
            mentor: {
              select: {
                id: true,
                user: { select: { name: true, active: true } },
              },
            },
          },
        },
      },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.mentorProfile.findMany({
      where: { active: true, user: { active: true } },
      select: { id: true, user: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.mentorAssignment.findMany({
      where: { active: false },
      select: {
        id: true,
        assignedAt: true,
        deactivatedAt: true,
        student: { select: { user: { select: { name: true } } } },
        mentor: { select: { user: { select: { name: true } } } },
      },
      orderBy: { deactivatedAt: "desc" },
      take: 20,
    }),
  ]);

  return { students, mentors, history };
}

export function listSemesters() {
  return prisma.semester.findMany({
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
      active: true,
      _count: { select: { students: true } },
    },
    orderBy: [{ active: "desc" }, { startDate: "desc" }],
  });
}

export function getSemester(semesterId: string) {
  return prisma.semester.findUnique({
    where: { id: semesterId },
    select: { id: true, name: true, startDate: true, endDate: true, active: true },
  });
}

export type QuestionFilters = {
  domain?: string;
  context?: string;
  active?: string;
  stable?: string;
};

export function listQuestions(filters: QuestionFilters) {
  const parsedDomain = developmentDomainSchema.safeParse(filters.domain);
  const context = filters.context === "ONBOARDING" || filters.context === "WEEKLY"
    ? filters.context
    : undefined;
  const active = filters.active === "true" ? true : filters.active === "false" ? false : undefined;
  const stable = filters.stable === "true" ? true : filters.stable === "false" ? false : undefined;

  return prisma.question.findMany({
    where: {
      domain: parsedDomain.success ? parsedDomain.data : undefined,
      context,
      active,
      stable,
    },
    select: {
      id: true,
      key: true,
      text: true,
      domain: true,
      type: true,
      context: true,
      stable: true,
      active: true,
      sortOrder: true,
      _count: { select: { options: true } },
    },
    orderBy: [{ sortOrder: "asc" }, { key: "asc" }],
  });
}

export function getQuestion(questionId: string) {
  return prisma.question.findUnique({
    where: { id: questionId },
    select: {
      id: true,
      key: true,
      text: true,
      domain: true,
      type: true,
      context: true,
      stable: true,
      active: true,
      sortOrder: true,
      options: {
        select: {
          id: true,
          label: true,
          value: true,
          directionValue: true,
          sortOrder: true,
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
}

export function listQuestTemplates(domain?: string) {
  const parsedDomain = developmentDomainSchema.safeParse(domain);

  return prisma.questTemplate.findMany({
    where: {
      domain: parsedDomain.success
        ? (parsedDomain.data as DevelopmentDomain)
        : undefined,
    },
    select: {
      id: true,
      key: true,
      title: true,
      description: true,
      domain: true,
      active: true,
      defaultDurationDays: true,
      reflectionPrompt: true,
    },
    orderBy: [{ active: "desc" }, { title: "asc" }],
  });
}

export function getQuestTemplate(templateId: string) {
  return prisma.questTemplate.findUnique({
    where: { id: templateId },
    select: {
      id: true,
      key: true,
      title: true,
      description: true,
      domain: true,
      active: true,
      defaultDurationDays: true,
      reflectionPrompt: true,
    },
  });
}

export function listSemesterOptions() {
  return prisma.semester.findMany({
    select: { id: true, name: true, active: true },
    orderBy: [{ active: "desc" }, { startDate: "desc" }],
  });
}
