import { prisma } from "@/lib/prisma";
import { AuthorizationError } from "@/modules/auth/domain/authorization-policy";

// A separate Student read boundary and allowlisted SQL projection. Never fetch a
// private conversation and then remove fields: private notes, topics, links and
// FollowUps do not enter this service or its returned DTO at all.
export async function getStudentAgreements(actorUserId: string, limit?: number) {
  const owned = { active: true, user: { id: actorUserId, active: true, role: "STUDENT" as const } };
  const student = await prisma.studentProfile.findFirst({ where: owned, select: { id: true } });
  if (!student) throw new AuthorizationError();
  const agreements = await prisma.sharedAgreement.findMany({
    where: { conversation: { studentId: student.id, student: owned } },
    select: { id: true, text: true, conversation: { select: { occurredAt: true } } },
    orderBy: [{ conversation: { occurredAt: "desc" } }, { id: "asc" }],
    ...(limit ? { take: limit } : {}),
  });
  return agreements.map(({ id, text, conversation }) => ({ id, text, occurredAt: conversation.occurredAt }));
}
