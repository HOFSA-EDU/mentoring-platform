import { prisma } from "@/lib/prisma";
import { AuthorizationError, assertMentorCanAccessStudent } from "@/modules/auth/domain/authorization-policy";
import { assignedStudentScope, prismaStudentAccessPolicyRepository } from "@/modules/auth/infrastructure/prisma-student-access-policy-repository";
import { followUpWindow, orderFollowUps } from "../domain/calendar";

export const followUpSelect = {
  id: true, studentId: true, dueAt: true, status: true, note: true, completedAt: true, cancelledAt: true,
} as const;

export async function getMentoringHistory(actorUserId: string, studentId: string) {
  await assertMentorCanAccessStudent(actorUserId, studentId, prismaStudentAccessPolicyRepository);
  const student = await prisma.studentProfile.findFirst({
    where: { ...assignedStudentScope(actorUserId), id: studentId },
    select: { conversations: {
      where: { student: assignedStudentScope(actorUserId) },
      orderBy: [{ occurredAt: "desc" }, { id: "asc" }],
      select: {
        id: true, occurredAt: true, topic: true, privateNote: true, createdAt: true,
        mentor: { select: { user: { select: { name: true } } } },
        sharedAgreement: { select: { text: true } },
        observations: { select: { observation: { select: { id: true, title: true, status: true } } } },
        followUps: { select: followUpSelect, orderBy: [{ dueAt: "asc" }, { id: "asc" }] },
      },
    } },
  });
  if (!student) throw new AuthorizationError();
  return student.conversations;
}

export async function getConversationFormData(actorUserId: string, studentId: string, observationId?: string) {
  await assertMentorCanAccessStudent(actorUserId, studentId, prismaStudentAccessPolicyRepository);
  const student = await prisma.studentProfile.findFirst({
    where: { ...assignedStudentScope(actorUserId), id: studentId },
    select: { id: true, user: { select: { name: true } }, observations: {
      where: { student: assignedStudentScope(actorUserId) },
      select: { id: true, title: true, status: true, type: true }, orderBy: [{ lastDetectedAt: "desc" }, { id: "asc" }],
    } },
  });
  if (!student || (observationId && !student.observations.some(({ id }) => id === observationId))) throw new AuthorizationError();
  return { studentId: student.id, name: student.user.name, observations: student.observations };
}

export async function listOpenFollowUps(actorUserId: string, now = new Date()) {
  const mentor = await prisma.mentorProfile.findFirst({ where: { active: true, user: { id: actorUserId, active: true, role: "MENTOR" } }, select: { id: true } });
  if (!mentor) throw new AuthorizationError();
  const followUps = await prisma.followUp.findMany({
    where: { status: "OPEN", student: assignedStudentScope(actorUserId) },
    select: { ...followUpSelect, student: { select: { user: { select: { name: true } } } }, conversation: { select: { topic: true } } },
  });
  return orderFollowUps(followUps).map(({ student, conversation, ...followUp }) => ({
    ...followUp, studentName: student.user.name, topic: conversation.topic, window: followUpWindow(followUp.dueAt, now),
  }));
}
