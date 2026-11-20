import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { StudentAccessPolicyRepository } from "@/modules/auth/domain/authorization-policy";

export const prismaStudentAccessPolicyRepository: StudentAccessPolicyRepository = {
  async hasActiveMentorAssignment(mentorUserId, studentProfileId) {
    const assignment = await prisma.studentProfile.findFirst({
      where: { ...assignedStudentScope(mentorUserId), id: studentProfileId },
      select: { id: true },
    });

    return assignment !== null;
  },
  async studentOwnsProfile(studentUserId, studentProfileId) {
    const profile = await prisma.studentProfile.findFirst({
      where: {
        id: studentProfileId,
        active: true,
        user: { id: studentUserId, active: true, role: "STUDENT" },
      },
      select: { id: true },
    });

    return profile !== null;
  },
};

// One shared live scope for policy checks and every Mentor data read.
export function assignedStudentScope(mentorUserId: string): Prisma.StudentProfileWhereInput {
  return {
    active: true,
    user: { active: true, role: "STUDENT" },
    assignments: { some: {
      active: true,
      mentor: { active: true, user: { id: mentorUserId, active: true, role: "MENTOR" } },
    } },
  };
}
