import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { AuthorizationError, assertMentorCanAccessStudent } from "@/modules/auth/domain/authorization-policy";
import { assignedStudentScope, prismaStudentAccessPolicyRepository } from "@/modules/auth/infrastructure/prisma-student-access-policy-repository";

export const observationSummarySelect = {
  id: true, semesterId: true, type: true, domain: true, status: true, title: true, summary: true,
  firstDetectedAt: true, lastDetectedAt: true, acknowledgedAt: true, resolvedAt: true,
} satisfies Prisma.ObservationSelect;

export async function getMentorObservation(actorUserId: string, studentId: string, observationId: string) {
  await assertMentorCanAccessStudent(actorUserId, studentId, prismaStudentAccessPolicyRepository);
  const observation = await prisma.observation.findFirst({
    where: { id: observationId, studentId, student: assignedStudentScope(actorUserId) },
    select: { ...observationSummarySelect,
      student: { select: { user: { select: { name: true } } } }, semester: { select: { name: true } },
      evidence: { where: { observation: { student: assignedStudentScope(actorUserId) } },
        select: { id: true, checkInId: true, periodKey: true, submittedAt: true, questionTextSnapshot: true, optionLabelSnapshot: true },
        orderBy: [{ submittedAt: "asc" }, { sourceKey: "asc" }],
      },
    },
  });
  if (!observation) throw new AuthorizationError();
  return observation;
}
