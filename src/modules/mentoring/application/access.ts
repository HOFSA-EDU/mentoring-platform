import type { Prisma } from "@/generated/prisma/client";
import { AuthorizationError } from "@/modules/auth/domain/authorization-policy";
import { assignedStudentScope } from "@/modules/auth/infrastructure/prisma-student-access-policy-repository";

// Hold the live authorization rows until commit so a concurrent reassignment
// cannot interleave between authorization and a coupled mentoring write.
export async function lockMentoringAccess(tx: Prisma.TransactionClient, actorUserId: string, studentId: string) {
  const assignments = await tx.$queryRaw<{ id: string }[]>`
    SELECT a."id" FROM "MentorAssignment" a
    JOIN "StudentProfile" s ON s."id" = a."studentId"
    JOIN "User" su ON su."id" = s."userId"
    JOIN "MentorProfile" m ON m."id" = a."mentorId"
    JOIN "User" mu ON mu."id" = m."userId"
    WHERE s."id" = ${studentId} AND mu."id" = ${actorUserId}
      AND a."active" AND s."active" AND su."active" AND su."role" = 'STUDENT'
      AND m."active" AND mu."active" AND mu."role" = 'MENTOR'
    FOR SHARE OF a, s, su, m, mu`;
  if (!assignments.length) throw new AuthorizationError();
  const student = await tx.studentProfile.findFirst({
    where: { ...assignedStudentScope(actorUserId), id: studentId },
    select: { id: true, semesterId: true, assignments: {
      where: { active: true, mentor: { userId: actorUserId } }, select: { mentorId: true },
    } },
  });
  if (!student?.assignments[0]) throw new AuthorizationError();
  return { studentId: student.id, semesterId: student.semesterId, mentorId: student.assignments[0].mentorId };
}
