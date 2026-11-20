import { prisma } from "@/lib/prisma";
import { AuthorizationError, assertMentorCanAccessStudent } from "@/modules/auth/domain/authorization-policy";
import { assignedStudentScope, prismaStudentAccessPolicyRepository } from "@/modules/auth/infrastructure/prisma-student-access-policy-repository";
import { ownedQuestStudentScope } from "./access";

// Shared allowlist. No private conversation, FollowUp, Observation, current
// template wording, active capacity slot or account-security data is selected.
export const questSelect = {
  id: true, title: true, description: true, domain: true, reflectionPromptSnapshot: true,
  assignedAt: true, dueAt: true, status: true, completedAt: true, cancelledAt: true,
  sharedAgreement: { select: { text: true } },
  reflection: { select: { attempted: true, helpful: true, reflectionText: true, submittedAt: true } },
} as const;

export async function listStudentQuests(actorUserId: string) {
  const student = await prisma.studentProfile.findFirst({ where: ownedQuestStudentScope(actorUserId), select: { id: true } });
  if (!student) throw new AuthorizationError();
  return prisma.questAssignment.findMany({ where: { studentId: student.id, student: ownedQuestStudentScope(actorUserId) }, select: questSelect, orderBy: [{ assignedAt: "desc" }, { id: "asc" }] });
}

export async function getStudentQuest(actorUserId: string, questId: string) {
  const quest = await prisma.questAssignment.findFirst({ where: { id: questId, student: ownedQuestStudentScope(actorUserId) }, select: questSelect });
  if (!quest) throw new AuthorizationError();
  return quest;
}

export async function listMentorQuests(actorUserId: string, studentId: string) {
  await assertMentorCanAccessStudent(actorUserId, studentId, prismaStudentAccessPolicyRepository);
  const student = await prisma.studentProfile.findFirst({ where: { ...assignedStudentScope(actorUserId), id: studentId },
    select: { quests: { where: { student: assignedStudentScope(actorUserId) }, select: questSelect, orderBy: [{ assignedAt: "desc" }, { id: "asc" }] } },
  });
  if (!student) throw new AuthorizationError();
  return student.quests;
}

export async function getQuestAssignmentForm(actorUserId: string, studentId: string, conversationId?: string) {
  await assertMentorCanAccessStudent(actorUserId, studentId, prismaStudentAccessPolicyRepository);
  const student = await prisma.studentProfile.findFirst({ where: { ...assignedStudentScope(actorUserId), id: studentId }, select: {
    id: true, user: { select: { name: true } }, quests: { where: { status: "ACTIVE" }, select: { id: true } },
    conversations: { select: { id: true, topic: true, occurredAt: true, sharedAgreement: { select: { id: true, text: true } } }, orderBy: [{ occurredAt: "desc" }, { id: "asc" }] },
  } });
  if (!student || (conversationId && !student.conversations.some(({ id }) => id === conversationId))) throw new AuthorizationError();
  const templates = await prisma.questTemplate.findMany({ where: { active: true }, select: { id: true, title: true, description: true, domain: true, defaultDurationDays: true }, orderBy: [{ title: "asc" }, { id: "asc" }] });
  return { studentId: student.id, name: student.user.name, activeCount: student.quests.length, conversations: student.conversations, templates };
}

export type QuestView = Awaited<ReturnType<typeof getStudentQuest>>;
